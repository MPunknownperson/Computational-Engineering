"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icons";
import {
  browserSupportsCloudSpeech,
  createRecognition,
  installLocalSpeech,
  localSpeechAvailability,
  releaseStream,
  requestMicrophone,
  speechRecognitionAvailability,
  supportsOnDeviceSpeech,
  vibrate,
  type MicrophoneStatus,
  type RecognitionInstance,
} from "@/lib/browser-tokens";
import { canRunLocalModel, createLocalModelEngine, type LocalModelEngine, type ModelAssetProgress } from "@/lib/voice/local-model";
import { clearLearnedCommands, learnFromRoute, learnedCommandCount, routeHypotheses, type WeightedHypothesis } from "@/lib/command-engine";
import { LANGUAGE_PACKS, packOrder, recognitionLocale, t, type PackId, type UiKey } from "@/lib/i18n";
import { withSystemVocabulary } from "@/lib/i18n/system-lexicon";
import { detectPlatformProfile } from "@/lib/platform";
import {
  decideVoiceProcessing,
  isMobile,
  regionFromLocale,
  regionRule,
  type RegionRule,
  type UnavailableReason,
  type VoiceDecision,
} from "@/lib/voice/policy";
import { VoiceRuntime } from "@/lib/voice/pipeline";
import { clearVoiceSession, loadVoiceSession, saveVoiceSession } from "@/lib/voice/session";

type Phase = "checking" | "ready" | "unavailable" | "preparing" | "requesting" | "listening" | "opening";

const OPEN_DELAY_MS = 900;

const UNAVAILABLE_KEY: Record<UnavailableReason, UiKey> = {
  "no-api": "unavailable.noApi",
  region: "unavailable.region",
  "no-local": "unavailable.noLocal",
  "no-cloud": "unavailable.noCloud",
};

const MIC_KEY: Record<MicrophoneStatus, UiKey> = {
  denied: "mic.denied",
  "no-device": "mic.noDevice",
  "in-use": "mic.inUse",
  insecure: "mic.insecure",
  unsupported: "mic.unsupported",
};

function speechErrorKey(code: string | undefined, mode: "local" | "cloud" | "local-model"): UiKey {
  switch (code) {
    case "no-speech": return "speech.noSpeech";
    case "network": return "speech.network";
    case "audio-capture": return "speech.audio";
    case "not-allowed": return "mic.denied";
    case "language-not-supported": return "speech.language";
    case "service-not-allowed": return mode === "local" ? "speech.language" : "speech.service";
    default: return "speech.generic";
  }
}

interface PolicyResponse {
  country: string | null;
  overrides: Record<string, RegionRule>;
}

/**
 * Voice entry. The visitor speaks, the language packs understand the sentence,
 * and the matching tool opens with its values already filled in.
 *
 * The processing path is assigned in the background from region, device and
 * browser: browser on-device, the browser's cloud service, or a small model
 * running on the page. There is nothing for the visitor to configure.
 */
export function SpeakCalc({ packId = "en" }: { packId?: PackId }) {
  const router = useRouter();
  const pack = LANGUAGE_PACKS[packId] ?? LANGUAGE_PACKS.en;
  const [phase, setPhase] = useState<Phase>("checking");
  const [decision, setDecision] = useState<VoiceDecision | null>(null);
  const [heard, setHeard] = useState("");
  const [matchedLabel, setMatchedLabel] = useState<string | null>(null);
  const [navigateTo, setNavigateTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [learned, setLearned] = useState(0);
  const [modelProgress, setModelProgress] = useState<ModelAssetProgress | null>(null);

  const runtime = useMemo(() => new VoiceRuntime(packOrder(pack)), [pack]);
  const runtimeRef = useRef(runtime);
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const modelRef = useRef<LocalModelEngine | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const openTimer = useRef<number | null>(null);
  const phaseRef = useRef<Phase>("checking");
  const langRef = useRef<string>(pack.speechLocales[0]);

  const setPhaseBoth = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  /* -------- background capability and policy check (silent) -------- */
  useEffect(() => {
    let active = true;
    (async () => {
      const lang = recognitionLocale(pack, typeof navigator !== "undefined" ? navigator.languages : []);
      langRef.current = lang;
      runtimeRef.current = new VoiceRuntime([withSystemVocabulary(pack, lang), ...packOrder(pack).filter((candidate) => candidate.id !== pack.id)]);
      const speechApi = speechRecognitionAvailability() !== "unavailable";
      const profile = detectPlatformProfile();
      const geo = await fetch("/api/voice/policy", { cache: "no-store" })
        .then((response) => (response.ok ? (response.json() as Promise<PolicyResponse>) : null))
        .catch(() => null);
      const region = geo?.country ?? regionFromLocale(navigator.language);
      const rule = regionRule(region, geo?.overrides ?? {});

      // Probe on-device support only when the policy could actually use it.
      // Some Chromium builds crash on that probe, so it must not be speculative.
      const needsLocal =
        rule === "local-only" ||
        (rule !== "cloud-only" && (isMobile(profile.os, profile.device) || !speechApi));
      const wantsCloud = rule === "any" && !isMobile(profile.os, profile.device) && speechApi;

      const [local, browserCloud] = await Promise.all([
        speechApi && needsLocal && supportsOnDeviceSpeech()
          ? localSpeechAvailability(lang)
          : Promise.resolve("unavailable" as const),
        speechApi && (wantsCloud || rule === "cloud-only")
          ? browserSupportsCloudSpeech(lang)
          : Promise.resolve(false),
      ]);

      const next = decideVoiceProcessing({
        speechApi,
        os: profile.os,
        device: profile.device,
        browser: profile.browser,
        browserCloud,
        local,
        region,
        overrides: geo?.overrides ?? {},
        canRunLocalModel: canRunLocalModel(),
      });
      if (!active) return;
      const previous = loadVoiceSession();
      if (previous) runtimeRef.current.restore(previous);
      setDecision(next);
      setLearned(learnedCommandCount());
      setPhaseBoth(next.available ? "ready" : "unavailable");
    })();
    return () => {
      active = false;
    };
  }, [pack, setPhaseBoth]);

  /* -------- lifecycle -------- */
  const teardown = useCallback(() => {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try { recognition.abort?.(); } catch { /* already stopped */ }
      try { recognition.stop(); } catch { /* already stopped */ }
    }
    modelRef.current?.cancel();
    modelRef.current?.dispose();
    modelRef.current = null;
    releaseStream(streamRef.current);
    streamRef.current = null;
    if (openTimer.current !== null) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  }, []);

  useEffect(() => teardown, [teardown]);

  const fail = useCallback(
    (key: UiKey, vars?: Record<string, string>) => {
      teardown();
      setError(t(pack, key, vars));
      setPhaseBoth("ready");
    },
    [pack, setPhaseBoth, teardown],
  );

  /** Shared by the browser engine and the on-page model. */
  const handleTranscript = useCallback(
    (hypotheses: Array<string | WeightedHypothesis>) => {
      const route = routeHypotheses(hypotheses, runtimeRef.current);
      setHeard(route.heard);
      if (!route.action || !route.program) {
        setError(t(pack, "voice.noMatch", { example: pack.examples[0] }));
        setPhaseBoth("ready");
        return;
      }
      saveVoiceSession(route.program);
      setNavigateTo(route.action.href);
      setError(null);
      setMatchedLabel(route.action.label);
      setLearned(learnFromRoute(route));
      vibrate([40, 30, 40]);
      setPhaseBoth("opening");
      const href = route.action.href;
      openTimer.current = window.setTimeout(() => {
        openTimer.current = null;
        router.push(href);
      }, OPEN_DELAY_MS);
    },
    [pack, router, setPhaseBoth],
  );

  const listen = useCallback(
    (mode: "local" | "cloud") => {
      const launch = (locale: string, retry: boolean) => {
        const recognition = createRecognition(locale, { preferOnDevice: mode === "local" });
        if (!recognition) {
          fail("speech.generic");
          return;
        }
        // Final results only, so navigation never fires mid-sentence.
        recognition.interimResults = false;

        recognition.onresult = (event) => {
          if (recognitionRef.current !== recognition) return;
          const result = event.results[event.results.length - 1];
          if (!result) return;
          const hypotheses = Array.from({ length: result.length }, (_, index) => result[index]?.transcript ?? "");
          handleTranscript(hypotheses);
        };
        recognition.onerror = (event) => {
          if (recognitionRef.current !== recognition || event.error === "aborted") return;
          if (mode === "cloud" && !retry && locale.toLowerCase() !== "en-us" && event.error === "language-not-supported") {
            // The browser may not support the system locale even though its
            // default cloud speech service works. Try a known locale once;
            // keep the same pack set for semantic understanding.
            recognition.onend = null;
            recognition.onerror = null;
            recognitionRef.current = null;
            launch("en-US", true);
            return;
          }
          fail(speechErrorKey(event.error, mode));
        };
        recognition.onend = () => {
          if (recognitionRef.current !== recognition) return;
          releaseStream(streamRef.current);
          streamRef.current = null;
          if (phaseRef.current === "listening") setPhaseBoth("ready");
        };

        recognitionRef.current = recognition;
        try {
          recognition.start();
          setPhaseBoth("listening");
        } catch {
          fail("speech.busy");
        }
      };
      launch(langRef.current, false);
    },
    [fail, handleTranscript, setPhaseBoth],
  );

  const start = useCallback(async () => {
    if (!decision?.available) return;
    setError(null);
    setHeard("");
    setMatchedLabel(null);
    setNavigateTo(null);
    setModelProgress(null);

    if (decision.mode === "local-model") {
      // On-demand WASM/WebGPU model; press Stop to finish a short utterance.
      setPhaseBoth("preparing");
      try {
        // Retain the worker/model for this page session so later short voice
        // commands skip model initialisation. Browser-cached weights persist.
        if (!modelRef.current) {
          modelRef.current = createLocalModelEngine({
            language: langRef.current,
            onStatus: (status) => {
              if (status === "recording") setPhaseBoth("listening");
              else if (status === "loading" || status === "decoding") setPhaseBoth("preparing");
              else if (status === "requesting") setPhaseBoth("requesting");
            },
            onProgress: (progress) => setModelProgress(progress),
            onText: (transcript) => handleTranscript([{ text: transcript, confidence: 0.5 }]),
          });
        }
        if (!modelRef.current) {
          fail("unavailable.noModel");
          return;
        }
        await modelRef.current.start();
        if (phaseRef.current === "listening" || phaseRef.current === "preparing" || phaseRef.current === "requesting") setPhaseBoth("ready");
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "";
        const reason = message.split(":")[1] as MicrophoneStatus;
        fail(message.startsWith("microphone:") ? (MIC_KEY[reason] ?? "mic.unsupported") : message === "no-speech" ? "speech.noSpeech" : "unavailable.noModel");
      }
      return;
    }

    if (decision.mode === "local" && decision.prepareLocal) {
      setPhaseBoth("preparing");
      const installed = await installLocalSpeech(langRef.current);
      if (phaseRef.current !== "preparing") return; // cancelled
      if (!installed) {
        fail("speech.language");
        return;
      }
      setDecision({ ...decision, prepareLocal: false });
    }

    setPhaseBoth("requesting");
    const access = await requestMicrophone();
    if (phaseRef.current !== "requesting") {
      releaseStream(access.stream);
      return; // cancelled while the permission prompt was open
    }
    if (access.status !== "granted") {
      fail(MIC_KEY[access.status]);
      return;
    }
    streamRef.current = access.stream;
    listen(decision.mode);
  }, [decision, fail, handleTranscript, listen, setPhaseBoth]);

  const stop = useCallback(() => {
    if (decision?.available && decision.mode === "local-model" && phaseRef.current === "listening" && modelRef.current) {
      modelRef.current.stop(); // finish utterance, release microphone, decode
      setPhaseBoth("preparing");
      return;
    }
    teardown();
    setPhaseBoth(decision?.available ? "ready" : "unavailable");
  }, [decision, setPhaseBoth, teardown]);

  /* -------- render -------- */
  const busy = phase === "preparing" || phase === "requesting" || phase === "listening" || phase === "opening";
  const status = useMemo(() => {
    if (error) return null;
    switch (phase) {
      case "unavailable":
        return decision && !decision.available ? t(pack, UNAVAILABLE_KEY[decision.reason]) : t(pack, "unavailable.noApi");
      case "preparing": return t(pack, "voice.preparing");
      case "requesting": return t(pack, "voice.waitingMic");
      case "listening": return t(pack, "voice.listening", { example: pack.examples[0] });
      case "opening": return matchedLabel ? t(pack, "voice.opening", { label: matchedLabel }) : null;
      default: return null;
    }
  }, [decision, error, matchedLabel, pack, phase]);

  const disclosureKey: UiKey | null = !decision?.available
    ? null
    : decision.mode === "local"
      ? "voice.disclosureLocal"
      : decision.mode === "cloud"
        ? "voice.disclosureCloud"
        : "voice.disclosureOnDeviceModel";

  return (
    <section className="sketch" aria-labelledby="voice-heading" lang={pack.id}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl border-2 border-[color:var(--line)] bg-[color:var(--accent-3)] shadow-[2px_2px_0_0_var(--line)]">
          <Icon name="sparkle" size={18} />
        </span>
        <h2 id="voice-heading" className="text-base font-extrabold">{t(pack, "voice.heading")}</h2>
        <div className="ml-auto">
          {busy ? (
            <button type="button" className="btn btn-primary" onClick={stop}>
              {phase === "listening" ? t(pack, "voice.stop") : t(pack, "voice.cancel")}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void start()}
              aria-describedby="voice-status"
              disabled={phase !== "ready"}
            >
              <Icon name="mic" size={15} />
              {phase === "unavailable" ? t(pack, "voice.unavailableButton") : t(pack, "voice.speak")}
            </button>
          )}
        </div>
      </div>

      <p id="voice-status" role="status" aria-live="polite" className="mt-3 min-h-10 text-sm">
        {status && (
          <span className={phase === "unavailable" ? "text-slate-600" : "inline-flex items-center gap-2 font-semibold text-[color:var(--accent)]"}>
            {phase !== "unavailable" && <span className="confirm-dot" aria-hidden />}
            {status}
          </span>
        )}
        {heard && phase !== "listening" && (
          <span className="block text-slate-700">{t(pack, "voice.heard", { text: heard })}</span>
        )}
        {!status && !heard && !error && phase === "ready" && (
          <span className="text-slate-500">
            {t(pack, "voice.tryOne")}{" "}
            {pack.examples.map((example, index) => (
              <span key={example}>{index > 0 ? ", " : ""}&ldquo;{example}&rdquo;</span>
            ))}
          </span>
        )}
        {error && <span role="alert" className="block font-semibold text-rose-600">{error}</span>}
      </p>

      {decision?.available && decision.mode === "local-model" && phase === "preparing" && (
        <div className="mt-2 rounded-xl border border-[color:var(--line)] bg-[#fffdf5] px-3.5 py-3 text-xs leading-relaxed text-slate-600" role="status" aria-live="polite">
          <p className="font-semibold text-slate-800">
            {t(pack, "voice.modelProvider", { publisher: "Xenova", host: "Hugging Face Hub", license: "Apache-2.0" })}
          </p>
          <p className="mt-1.5">
            {modelProgress
              ? t(pack, "voice.modelFileProgress", {
                  file: modelProgress.file,
                  percent: modelProgress.percent === null ? "…" : modelProgress.percent,
                  completed: modelProgress.completed,
                  assets: Math.max(modelProgress.assetCount, modelProgress.completed),
                })
              : t(pack, "voice.preparing")}
          </p>
          {modelProgress?.percent !== null && modelProgress?.percent !== undefined && (
            <progress className="mt-2 h-1.5 w-full overflow-hidden rounded-full accent-[color:var(--accent)]" max={100} value={modelProgress.percent} aria-label={`Downloading ${modelProgress.file}`} />
          )}
          <p className="mt-1.5">Model files are downloaded individually and cached by this browser. Microphone audio stays on this device; it is not uploaded to the model host.</p>
        </div>
      )}

      {matchedLabel && (
        <div className="mt-3 rounded-2xl border-2 border-[color:var(--line)] bg-[#fffdf5] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 text-sm font-extrabold">{matchedLabel}</div>
            {navigateTo && (
              <Link href={navigateTo} className="btn btn-primary ml-auto !min-h-11">
                {t(pack, "voice.open", { label: matchedLabel })} <Icon name="arrow-right" size={15} />
              </Link>
            )}
          </div>
        </div>
      )}

      {disclosureKey && (
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          {t(pack, disclosureKey)}{" "}
          <Link href="/privacy#voice" className="font-bold underline underline-offset-4">{t(pack, "voice.privacyLink")}</Link>
          {learned > 0 && (
            <>
              {" · "}
              {t(pack, "voice.learned", { count: learned })}{" "}
              <button
                type="button"
                className="font-bold underline underline-offset-2"
                onClick={() => {
                  clearLearnedCommands();
                  clearVoiceSession();
                  runtimeRef.current.forget();
                  setLearned(0);
                }}
              >
                {t(pack, "voice.forget")}
              </button>
            </>
          )}
        </p>
      )}
    </section>
  );
}

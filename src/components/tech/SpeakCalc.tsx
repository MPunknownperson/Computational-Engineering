"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icons";
import {
  installLocalSpeech, localSpeechAvailability,
  speechRecognitionAvailability, supportsOnDeviceSpeech, vibrate,
} from "@/lib/browser-tokens";
import { createNativeSession, type NativeSession } from "@/lib/voice/native-session";
import { SHERPA_ONNX_ENGINE_ID, canUseSherpaOnnx, createSherpaSession, prepareSherpaOnnx, sherpaOnnxReady } from "@/lib/voice/sherpa-onnx";
import { useMicrophoneEligibility, within, type MicrophoneProblem } from "@/lib/voice/use-microphone";
import { clearLearnedCommands, learnFromRoute, learnedCommandCount, routeHypotheses, type CommandRoute, type WeightedHypothesis } from "@/lib/command-engine";
import { guessDestination, recordVoiceOutcome } from "@/lib/ml/intent";
import { clearMlData } from "@/lib/ml/runtime";
import { LANGUAGE_PACKS, packOrder, recognitionLocale, t, type PackId, type UiKey } from "@/lib/i18n";
import { withSystemVocabulary } from "@/lib/i18n/system-lexicon";
import { detectPlatformProfile } from "@/lib/platform";
import { decideVoiceProcessing, regionRule, type RegionRule, type UnavailableReason, type VoiceDecision } from "@/lib/voice/policy";
import { VoiceRuntime } from "@/lib/voice/pipeline";
import { clearVoiceSession, loadVoiceSession, saveVoiceSession } from "@/lib/voice/session";

type Phase = "checking" | "ready" | "unavailable" | "preparing" | "requesting" | "starting" | "listening" | "processing" | "opening";
const ACTIVE_PHASES: Phase[] = ["preparing", "requesting", "starting", "listening", "processing", "opening"];
const UNAVAILABLE_KEY: Record<UnavailableReason, UiKey> = {
  "no-api": "unavailable.noApi", browser: "unavailable.noApi", location: "unavailable.location", region: "unavailable.region", "no-local": "unavailable.noLocal", "no-cloud": "unavailable.noCloud",
};
const MIC_KEY: Record<MicrophoneProblem, UiKey> = {
  denied: "mic.denied", "no-device": "mic.noDevice", "in-use": "mic.inUse",
  insecure: "mic.insecure", unsupported: "mic.unsupported", policy: "mic.policy",
};
function speechErrorKey(code: string): UiKey {
  switch (code) {
    case "no-speech": return "speech.noSpeech";
    case "network": return "speech.network";
    case "audio-capture": return "speech.audio";
    case "not-allowed": return "mic.denied";
    case "no-device": return "mic.noDevice";
    case "language-not-supported": return "speech.language";
    case "service-not-allowed": return "speech.service";
    case "startup-timeout": return "speech.startTimeout";
    case "ended-before-start": return "speech.startFailed";
    case "aborted": return "speech.interrupted";
    case "unsupported": return "unavailable.noApi";
    case "busy": return "speech.busy";
    case "model-error": return "speech.generic";
    case "speech-needs-preparation": return "speech.startFailed";
    default: return "speech.generic";
  }
}
interface PolicyResponse { country: string | null; overrides: Record<string, RegionRule> }
interface AgentReply {
  reply: string | null;
  href: string | null;
  label: string | null;
  comprehension: { reply: string } | null;
}

function newSessionId(): string {
  try { return crypto.randomUUID(); } catch { return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; }
}

export function SpeakCalc({ packId = "en" }: { packId?: PackId }) {
  const router = useRouter();
  const pack = LANGUAGE_PACKS[packId] ?? LANGUAGE_PACKS.en;
  const [phase, setPhase] = useState<Phase>("checking");
  const [decision, setDecision] = useState<VoiceDecision | null>(null);
  const [heard, setHeard] = useState("");
  const [matchedLabel, setMatchedLabel] = useState<string | null>(null);
  const [navigateTo, setNavigateTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [runtimeBlock, setRuntimeBlock] = useState<UiKey | null>(null);
  const [checkVersion, setCheckVersion] = useState(0);
  const [learned, setLearned] = useState(0);
  const [guessed, setGuessed] = useState(false);
  const { problem: micProblem, recheck: recheckMicrophone, reportProblem } = useMicrophoneEligibility();

  const runtimeRef = useRef(new VoiceRuntime(packOrder(pack)));
  const sessionRef = useRef<NativeSession | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<Phase>("checking");
  const generation = useRef(0);
  const cloudAvailable = useRef(false);
  const langRef = useRef(pack.speechLocales[0]);
  // Per-page-load session key for the server-side LangChain/LlamaIndex context.
  const sessionIdRef = useRef<string | null>(null);
  if (sessionIdRef.current == null) { sessionIdRef.current = newSessionId(); }

  const setPhaseBoth = useCallback((next: Phase) => { phaseRef.current = next; setPhase(next); }, []);
  const teardown = useCallback(() => {
    ++generation.current;
    sessionRef.current?.cancel();
    sessionRef.current = null;
    if (openTimer.current !== null) clearTimeout(openTimer.current);
    openTimer.current = null;
  }, []);
  useEffect(() => teardown, [teardown]);

  // Eligibility checks never activate a microphone and cannot hold up a tap.
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void (async () => {
      const browserLang = recognitionLocale(pack, navigator.languages?.length ? navigator.languages : navigator.language);
      langRef.current = browserLang;
      runtimeRef.current = new VoiceRuntime([withSystemVocabulary(pack, browserLang), ...packOrder(pack).filter((candidate) => candidate.id !== pack.id)]);
      const speechApi = speechRecognitionAvailability() !== "unavailable";
      const wasm = canUseSherpaOnnx(browserLang);
      const profile = detectPlatformProfile();
      // Resolve policy before enabling any cloud capture. A slow geo request
      // must never briefly bypass a local-only regional policy.
      const geo = await within<PolicyResponse | null>(
        fetch("/api/voice/policy", { cache: "no-store", signal: controller.signal })
          .then((response) => response.ok ? response.json() as Promise<PolicyResponse> : null), 5_000, null,
      );
      controller.abort();
      const region = geo?.country ?? null;
      const rule = regionRule(region, geo?.overrides ?? {});
      const local = speechApi && rule !== "none" && rule !== "cloud-only" && supportsOnDeviceSpeech()
        ? await within(localSpeechAvailability(browserLang), 2_500, "unknown" as const)
        : "unavailable" as const;
      const browserCloud = speechApi;
      if (!active) return;
      cloudAvailable.current = browserCloud || speechApi;
      // Prefer the browser speech service unless an on-device pack is already
      // installed. Never withhold voice on a phone or tablet for that reason.
      const next = decideVoiceProcessing({
        speechApi, os: profile.os, device: profile.device, browser: profile.browser, browserCloud: browserCloud || speechApi,
        local: rule === "any" && local !== "available" ? "unavailable" : local,
        region, overrides: geo?.overrides ?? {}, wasm,
      });
      const previous = loadVoiceSession();
      if (previous) runtimeRef.current.restore(previous);
      setLearned(learnedCommandCount());
      setDecision(next);
    })().catch(() => {
      if (active) {
        const profile = detectPlatformProfile();
        const speechApi = speechRecognitionAvailability() !== "unavailable";
        setDecision(decideVoiceProcessing({ speechApi, os: profile.os, device: profile.device, browser: profile.browser, browserCloud: speechApi, local: "unavailable", region: null, wasm: canUseSherpaOnnx(langRef.current) }));
      }
    });
    return () => { active = false; controller.abort(); };
  }, [pack, checkVersion]);

  useEffect(() => {
    if (!decision) return;
    if (ACTIVE_PHASES.includes(phaseRef.current)) return;
    if (micProblem || runtimeBlock || !decision.available) {
      setPhaseBoth("unavailable");
    } else if (phaseRef.current === "checking" || phaseRef.current === "unavailable") {
      setError(null);
      setPhaseBoth("ready");
    }
  }, [decision, micProblem, runtimeBlock, setPhaseBoth]);

  const fail = useCallback((key: UiKey, block = false) => {
    teardown();
    setError(t(pack, key));
    if (block) setRuntimeBlock(key);
    setPhaseBoth(block ? "unavailable" : "ready");
  }, [pack, setPhaseBoth, teardown]);

  useEffect(() => {
    const interrupt = () => {
      if (ACTIVE_PHASES.includes(phaseRef.current)) fail("speech.interrupted");
    };
    const visibility = () => { if (document.visibilityState === "hidden") interrupt(); };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", interrupt);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", interrupt);
    };
  }, [fail]);

  const commitRoute = useCallback((route: CommandRoute) => {
    if (!route.action || !route.program) return;
    saveVoiceSession(route.program);
    setNavigateTo(route.action.href);
    setError(null);
    setMatchedLabel(route.action.label);
    setLearned(learnFromRoute(route));
    vibrate([40, 30, 40]);
    setPhaseBoth("opening");
    const href = route.action.href;
    openTimer.current = setTimeout(() => { openTimer.current = null; router.push(href); }, 400);
  }, [router, setPhaseBoth]);

  // Server-side context: the LangChain chain records the turn in LlamaIndex
  // memory, dispatches backend tools and (when configured) asks FastGPT to
  // comprehend it. Text only — never audio.
  const consultAgent = useCallback(async (text: string): Promise<AgentReply | null> => {
    try {
      const response = await fetch("/api/nlu/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          text,
          sessionId: sessionIdRef.current,
          engine: decision?.available && decision.mode === "wasm" ? SHERPA_ONNX_ENGINE_ID : "web-speech",
          locale: langRef.current,
        }),
      });
      if (!response.ok) return null;
      const data = (await response.json()) as { agent?: AgentReply };
      return data.agent ?? null;
    } catch {
      return null;
    }
  }, [decision]);

  const handleTranscript = useCallback((hypotheses: Array<string | WeightedHypothesis>) => {
    const route = routeHypotheses(hypotheses, runtimeRef.current);
    setHeard(route.heard);
    if (route.action && route.program) {
      void consultAgent(route.heard); // keep server context aligned; no await
      commitRoute(route);
      return;
    }
    const attempt = generation.current;
    setPhaseBoth("processing");
    void (async () => {
      // The backend orchestrator may resolve what the local router could not
      // (typed tool dispatch, retrieved site pages, FastGPT comprehension).
      const agent = await within(consultAgent(route.heard), 8_000, null);
      if (generation.current !== attempt) return;
      if (agent?.href && agent.label) {
        setMatchedLabel(agent.label);
        setNavigateTo(agent.href);
        setGuessed(true);
        setError(null);
        setNotice(agent.comprehension?.reply ?? agent.reply ?? t(pack, "voice.guess"));
        setPhaseBoth("ready");
        return;
      }
      if (agent?.comprehension?.reply) setNotice(agent.comprehension.reply);
      // Last resort before giving up: the TensorFlow.js intent model reads the
      // same words and proposes the closest tool. It only suggests; the visitor
      // decides whether to open it.
      const guess = await within(guessDestination(hypotheses.map((item) => typeof item === "string" ? item : item.text)), 8_000, null);
      if (generation.current !== attempt) return;
      if (guess) {
        setMatchedLabel(guess.label);
        setNavigateTo(guess.path);
        setGuessed(true);
        setError(null);
        setNotice(t(pack, "voice.guess"));
        setPhaseBoth("ready");
        return;
      }
      setError(t(pack, "voice.noMatch", { example: pack.examples[0] }));
      setPhaseBoth("ready");
    })();
  }, [commitRoute, consultAgent, pack, setPhaseBoth]);

  // Intentionally synchronous: native start() must run in the original tap.
  const start = useCallback(() => {
    if (phaseRef.current !== "ready" || !decision?.available || micProblem || runtimeBlock) return;
    teardown();
    const attempt = generation.current;
    const current = () => generation.current === attempt;
    setError(null); setNotice(null); setHeard(""); setMatchedLabel(null); setNavigateTo(null); setGuessed(false);
    try { window.speechSynthesis?.cancel(); } catch { /* Speech output is optional, never required for input. */ }

    if (decision.mode === "wasm") {
      if (!sherpaOnnxReady()) {
        setPhaseBoth("preparing");
        setNotice("Downloading the on-device speech model (sherpa-onnx)…");
        void prepareSherpaOnnx((progress) => {
          if (!current()) return;
          setNotice(progress.stage === "download" && progress.percent !== null
            ? `Downloading the on-device speech model (sherpa-onnx)… ${progress.percent}%`
            : progress.stage === "init" ? "Initialising the on-device recogniser…" : "Loading the sherpa-onnx WebAssembly runtime…");
        }).then(() => {
          if (!current()) return;
          setDecision({ ...decision, prepareLocal: false });
          setNotice(t(pack, "voice.localReady"));
          setPhaseBoth("ready"); // A new tap, not an async automatic start.
        }).catch(() => {
          if (!current()) return;
          setNotice(null);
          fail("speech.generic");
        });
        return;
      }
      const session = createSherpaSession({
        language: langRef.current,
        onPhase: (next) => { if (current()) setPhaseBoth(next); },
        onInterim: (text) => { if (current()) setHeard(text); },
        onResult: (hypotheses) => {
          if (!current()) return;
          sessionRef.current = null;
          handleTranscript(hypotheses);
        },
        onError: (code) => {
          if (!current()) return;
          if (code === "not-allowed") reportProblem("denied");
          if (code === "no-device") reportProblem("no-device");
          if (code === "audio-capture") void recheckMicrophone();
          fail(speechErrorKey(code), code === "unsupported");
        },
      });
      sessionRef.current = session;
      session.start();
      return;
    }

    if (decision.mode === "local" && decision.prepareLocal) {
      setPhaseBoth("preparing");
      void within(installLocalSpeech(langRef.current), 60_000, false).then((installed) => {
        if (!current()) return;
        if (!installed) { fail("unavailable.noLocal", true); return; }
        setDecision({ ...decision, prepareLocal: false });
        setNotice(t(pack, "voice.localReady"));
        setPhaseBoth("ready"); // A new tap, not an async automatic start.
      });
      return;
    }

    const session = createNativeSession({
      language: langRef.current,
      local: decision.mode === "local",
      onPhase: (next) => { if (current()) setPhaseBoth(next); },
      onInterim: (text) => { if (current()) setHeard(text); },
      onResult: (hypotheses) => {
        if (!current()) return;
        sessionRef.current = null;
        handleTranscript(hypotheses);
      },
      onError: (code) => {
        if (!current()) return;
        const serviceError = code === "language-not-supported" || code === "service-not-allowed";
        if (decision.mode === "local" && serviceError && decision.rule === "any" && cloudAvailable.current) {
          // Never restart from onerror or silently switch audio processors.
          setDecision({ ...decision, mode: "cloud", prepareLocal: false });
          setNotice(t(pack, "speech.browserRetry"));
          fail(speechErrorKey(code));
          return;
        }
        if (code === "not-allowed") reportProblem("denied");
        if (code === "no-device") reportProblem("no-device");
        if (code === "audio-capture") void recheckMicrophone();
        fail(speechErrorKey(code), serviceError || code === "unsupported");
      },
    });
    sessionRef.current = session;
    session.start();
  }, [decision, fail, handleTranscript, micProblem, pack, recheckMicrophone, reportProblem, runtimeBlock, setPhaseBoth, teardown]);

  const stop = useCallback(() => {
    if (phaseRef.current === "listening" && sessionRef.current) { sessionRef.current.stop(); return; }
    teardown();
    setHeard("");
    setPhaseBoth(decision?.available && !micProblem && !runtimeBlock ? "ready" : "unavailable");
  }, [decision, micProblem, runtimeBlock, setPhaseBoth, teardown]);

  const recheck = () => {
    teardown();
    setError(null); setNotice(null); setRuntimeBlock(null); setDecision(null);
    setPhaseBoth("checking");
    void recheckMicrophone();
    setCheckVersion((value) => value + 1);
  };

  const busy = ACTIVE_PHASES.includes(phase);
  const unavailableKey = runtimeBlock ?? (micProblem ? MIC_KEY[micProblem] : decision && !decision.available ? UNAVAILABLE_KEY[decision.reason] : "unavailable.noApi");
  const status = error ? null
    : phase === "checking" ? t(pack, "voice.checking")
    : phase === "unavailable" ? t(pack, unavailableKey)
    : phase === "preparing" ? t(pack, "voice.preparing")
    : phase === "requesting" ? t(pack, "voice.waitingMic")
    : phase === "starting" ? t(pack, "voice.starting")
    : phase === "processing" ? t(pack, "voice.processing")
    : phase === "listening" ? t(pack, "voice.listening", { example: pack.examples[0] })
    : phase === "opening" && matchedLabel ? t(pack, "voice.opening", { label: matchedLabel }) : null;
  const disclosureKey: UiKey | null = !decision?.available ? null
    : decision.mode === "local" || decision.mode === "wasm" ? "voice.disclosureLocal"
    : "voice.disclosureCloud";
  const engineId = decision?.available && decision.mode === "wasm" ? SHERPA_ONNX_ENGINE_ID : "web-speech";

  return (
    <section className="sketch" aria-labelledby="voice-heading" lang={pack.id} data-voice-phase={phase} data-speech-engine={engineId}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl border-2 border-[color:var(--line)] bg-[color:var(--accent-3)] shadow-[2px_2px_0_0_var(--line)]">
          <Icon name="mic" size={18} />
        </span>
        <h2 id="voice-heading" className="text-base font-extrabold">{t(pack, "voice.heading")}</h2>
        <div className="ml-auto">
          {busy ? (
            <button type="button" className="btn btn-primary" onClick={stop} aria-describedby="voice-status">
              {phase === "listening" ? t(pack, "voice.stop") : t(pack, "voice.cancel")}
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={start} aria-describedby="voice-status"
              disabled={phase !== "ready" || !!micProblem || !!runtimeBlock}>
              <Icon name="mic" size={15} />
              {phase === "unavailable" ? t(pack, "voice.unavailableButton") : t(pack, "voice.speak")}
            </button>
          )}
        </div>
      </div>
      <div id="voice-status" role="status" aria-live="polite" aria-atomic="true" className="mt-3 min-h-10 text-sm">
        {status && (
          <p className={phase === "unavailable" || phase === "checking" ? "text-slate-600" : "inline-flex items-center gap-2 font-semibold text-[color:var(--accent)]"}>
            {phase === "listening" && <span className="confirm-dot" aria-hidden />}{status}
          </p>
        )}
        {heard && <p className="mt-1 text-slate-700">{t(pack, "voice.heard", { text: heard })}</p>}
        {!status && !heard && !error && phase === "ready" && (
          <p className="text-slate-500">{t(pack, "voice.tryOne")}{" "}
            {pack.examples.map((example, index) => <span key={example}>{index > 0 ? ", " : ""}&ldquo;{example}&rdquo;</span>)}
          </p>
        )}
        {error && <p role="alert" className="font-semibold text-rose-600">{error}</p>}
        {notice && <p className="mt-2 text-slate-600">{notice}</p>}
      </div>

      {(phase === "unavailable" || error) && !busy && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" className="btn !min-h-11 !text-xs" onClick={recheck}>
            <Icon name="refresh" size={14} />{t(pack, "voice.recheck")}
          </button>
        </div>
      )}

      {matchedLabel && (
        <div className="mt-3 rounded-2xl border-2 border-[color:var(--line)] bg-[color:var(--paper)] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 text-sm font-extrabold">{matchedLabel}</div>
            {navigateTo && <Link href={navigateTo} onClick={() => { if (guessed) { recordVoiceOutcome(heard, navigateTo); setLearned((count) => count + 1); } }} className="btn btn-primary ml-auto !min-h-11">{t(pack, "voice.open", { label: matchedLabel })}<Icon name="arrow-right" size={15} /></Link>}
          </div>
        </div>
      )}
      <p className="mt-3 text-xs leading-relaxed text-slate-600">{t(pack, "voice.languageNote")}</p>
      {disclosureKey && (
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          {t(pack, disclosureKey)}{" "}<Link href="/privacy#voice" className="font-bold underline underline-offset-4">{t(pack, "voice.privacyLink")}</Link>
          {learned > 0 && <>{" · "}{t(pack, "voice.learned", { count: learned })}{" "}
            <button type="button" className="font-bold underline underline-offset-2" onClick={() => {
              clearLearnedCommands(); clearVoiceSession(); runtimeRef.current.forget(); void clearMlData(); setLearned(0);
            }}>{t(pack, "voice.forget")}</button>
          </>}
        </p>
      )}
      <details className="mt-4 border-t border-[color:var(--line)]/15 pt-3 text-xs leading-relaxed text-slate-600">
        <summary className="cursor-pointer font-bold">{t(pack, "voice.help")}</summary>
        <p className="mt-2">{t(pack, "voice.helpBrowser")}</p>
        <p className="mt-2">{t(pack, "voice.helpPrivacy")}</p>
      </details>
    </section>
  );
}

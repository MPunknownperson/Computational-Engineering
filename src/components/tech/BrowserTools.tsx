"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/Icons";
import { resolveIntent, VOICE_EXAMPLES, type IntentMatch } from "@/lib/intent";
import {
  createRecognition,
  type RecognitionInstance,
  speechRecognitionAvailability,
  hasWakeLock,
  hasShare,
  vibrate,
  type WakeLockSentinelLike,
} from "@/lib/browser-tokens";

/* --------------------------------------------------------------------- */
/* Voice entry — Web Speech API (Chrome, Edge, Safari).                    */
/* The site's intent-matching logic turns a spoken phrase into the right   */
/* prefilled tool instead of a search results list.                        */
/* --------------------------------------------------------------------- */

/** No external store to subscribe to — this is a one-shot feature check. */
function emptySubscribe() { return () => undefined; }

export function SpeakCalc() {
  const [state, setState] = useState<"idle" | "listening" | "matching">("idle");
  const [transcript, setTranscript] = useState("");
  const [match, setMatch] = useState<IntentMatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const availability = useSyncExternalStore(emptySubscribe, speechRecognitionAvailability, () => "unavailable" as const);
  const supported = availability !== "unavailable";

  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop(); } catch { /* already stopped */ }
    };
  }, []);

  const start = useCallback(() => {
    setError(null);
    setMatch(null);
    setTranscript("");
    if (!supported) {
      setError("Voice input is not available in this browser. Chrome, Edge and Safari support it; the buttons below work everywhere.");
      return;
    }
    const recognition = createRecognition();
    if (!recognition) {
      setError("Voice input could not be started. Try a different browser, or use the buttons below.");
      return;
    }
    recognition.onresult = (event) => {
      const text = Array.from(event.results).map((r) => r[0]?.transcript ?? "").join(" ").trim();
      setTranscript(text);
      if (text) {
        const intent = resolveIntent(text);
        setMatch(intent);
        if (intent) {
          vibrate([60, 30, 60]);
          setState("matching");
        }
      }
    };
    recognition.onerror = (event) => {
      setState("idle");
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone access was blocked. You can allow it in the browser address bar, or use the buttons below.");
      } else {
        setError("Voice input could not hear you. Try again, or use the buttons below.");
      }
    };
    recognition.onend = () => setState("idle");
    recognitionRef.current = recognition;
    recognition.start();
    setState("listening");
  }, [supported]);

  const stop = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch { /* already stopped */ }
    setState("idle");
  }, []);

  return (
    <section className="sketch" aria-labelledby="voice-heading">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl border-2 border-[color:var(--line)] bg-[color:var(--accent-3)] shadow-[2px_2px_0_0_var(--line)]">
          <Icon name="sparkle" size={18} />
        </span>
        <div>
          <h2 id="voice-heading" className="text-base font-extrabold">Speak what you want to calculate</h2>
          <p className="text-xs text-slate-500">
            Available in Chrome, Edge and Safari.
          </p>
        </div>
        <div className="ml-auto">
          {state === "listening" ? (
            <button type="button" className="btn btn-primary" onClick={stop}>
              Stop listening
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={start}
              aria-describedby="voice-status"
              disabled={!supported}
            >
              <span aria-hidden="true">🎙</span>
              {supported ? "Speak a calculation" : "Voice input unavailable"}
            </button>
          )}
        </div>
      </div>

      {/* Always-visible privacy note: users should know before they activate. */}
      <p className="mt-3 rounded-xl border-2 border-dashed border-[color:var(--line)] bg-[#fffdf5] px-3.5 py-2.5 text-xs leading-relaxed text-slate-600">
        <strong>How voice processing works.</strong>{" "}
        The browser&apos;s built-in speech-recognition service listens to your microphone and
        turns your words into text. In Chrome and Edge the audio is processed by the browser
        vendor&apos;s cloud speech service; Safari uses Apple&apos;s service. Where the browser
        supports a local on-device mode, this site requests it, but whether the audio
        is processed locally or in the cloud depends on your browser and device.
        {availability === "cloud" && <> In this browser the audio is likely processed by the browser vendor&apos;s cloud service, not on your device.</>}{" "}
        Nothing is stored by this site and nothing is sent to anyone other than the
        browser&apos;s recognition service. The resulting text is matched against
        a short list of calculation intents on this page and, if it matches, the
        relevant tool opens — no text is sent to a server. You can always decline
        microphone permission; the buttons below work without voice input.
        See the <Link href="/privacy#voice" className="font-bold underline underline-offset-4">Privacy Notice</Link>{" "}
        for the full picture.
      </p>

      <p id="voice-status" role="status" aria-live="polite" className="mt-3 min-h-10 text-sm">
        {state === "listening" && (
          <span className="inline-flex items-center gap-2 font-semibold text-[color:var(--accent)]">
            <span className="confirm-dot" aria-hidden /> Listening… try &ldquo;{VOICE_EXAMPLES[0]}&rdquo;
          </span>
        )}
        {transcript && state !== "listening" && (
          <span className="text-slate-700">Heard: &ldquo;{transcript}&rdquo;</span>
        )}
        {!transcript && state === "idle" && !error && (
          <span className="text-slate-500">
            Try one of: {VOICE_EXAMPLES.map((e, i) => (
              <span key={e}>{i > 0 ? ", " : ""}&ldquo;{e}&rdquo;</span>
            ))}
          </span>
        )}
        {error && <span role="alert" className="font-semibold text-rose-600">{error}</span>}
      </p>

      {match && (
        <div className="mt-3 rounded-2xl border-2 border-[color:var(--line)] bg-[#fffdf5] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0">
              <div className="text-sm font-extrabold">{match.label}</div>
              <div className="text-xs text-slate-500">
                {match.description} · {match.confidence} match
              </div>
            </div>
            <Link href={match.href} className="btn btn-primary ml-auto !min-h-11">
              Open {match.label} <Icon name="arrow-right" size={15} />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}


/* --------------------------------------------------------------------- */
/* Screen Wake Lock — keeps the display awake while you calculate.        */
/* --------------------------------------------------------------------- */

export function WakeLockToggle() {
  const supported = useSyncExternalStore(emptySubscribe, hasWakeLock, () => false);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const sentinel = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    return () => { void sentinel.current?.release(); };
  }, []);

  useEffect(() => {
    if (!supported || !active) return;
    const onVisibility = async () => {
      if (document.visibilityState !== "visible" || !active) return;
      try {
        sentinel.current = await (navigator as unknown as { wakeLock: { request(type: string): Promise<WakeLockSentinelLike> } }).wakeLock.request("screen");
        setMessage("Display stays on while this page is open.");
      } catch {
        setMessage("The screen wake lock could not be acquired — the device may be low on power.");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [active, supported]);

  async function toggle() {
    setMessage(null);
    if (!supported) {
      setMessage("Your browser does not offer screen wake lock. Chrome, Edge, Firefox 126+ and Safari 16.4+ do.");
      return;
    }
    if (active) {
      await sentinel.current?.release();
      sentinel.current = null;
      setActive(false);
      setMessage("Display can sleep again.");
      return;
    }
    try {
      sentinel.current = await (navigator as unknown as { wakeLock: { request(type: string): Promise<WakeLockSentinelLike> } }).wakeLock.request("screen");
      setActive(true);
      setMessage("Display stays on while this page is open.");
      vibrate(30);
    } catch {
      setMessage("The screen wake lock was refused — the device may be in a low-power mode.");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className={`btn !min-h-11 ${active ? "btn-primary" : ""}`}
        onClick={toggle}
        aria-pressed={active}
        aria-describedby="wake-status"
        disabled={!supported}
      >
        <span aria-hidden="true">🔆</span>
        {active ? "Display awake" : "Keep screen awake"}
      </button>
      <p id="wake-status" role="status" aria-live="polite" className="min-h-5 text-xs text-slate-600">
        {message ?? (supported ? "Useful while working from paper or a recipe." : "Not offered by this browser.")}
      </p>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* Share / copy — Web Share API with a Clipboard API fallback.            */
/* --------------------------------------------------------------------- */

export function ShareCopy({ title, text, href }: { title: string; text: string; href: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const supported = useSyncExternalStore(emptySubscribe, hasShare, () => false);

  const copy = useCallback(async (value: string, done: string) => {
    try {
      await navigator.clipboard.writeText(value);
      vibrate([20, 10, 20]);
      setStatus(done);
    } catch {
      setStatus("Copy is unavailable in this browser.");
    }
    setTimeout(() => setStatus(null), 2200);
  }, []);

  const share = useCallback(async () => {
    const url = typeof window === "undefined" ? href : new URL(href, location.href).href;
    if (supported) {
      try {
        await navigator.share({ title, text, url });
        vibrate(30);
        setStatus("Shared.");
        return;
      } catch {
        /* user cancelled or share failed; fall through to copy */
      }
    }
    await copy(url, "Link copied.");
  }, [copy, href, supported, text, title]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="btn !min-h-11" onClick={share}>
        <Icon name="arrow-right" size={15} /> {supported ? "Share" : "Share link"}
      </button>
      <button type="button" className="btn !min-h-11" onClick={() => copy(text, "Result copied.")}>
        <Icon name="copy" size={15} /> Copy result
      </button>
      <p role="status" aria-live="polite" className="min-h-5 text-xs text-slate-600">{status}</p>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* PWA install prompt — captures the browser's native install offer.      */
/* --------------------------------------------------------------------- */

export function PwaInstall() {
  const [prompt, setPrompt] = useState<{ prompt(): Promise<{ outcome: string }> } | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPrompt(e as unknown as { prompt(): Promise<{ outcome: string }> });
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (installed || !prompt) return null;

  return (
    <button
      type="button"
      className="btn btn-ghost !min-h-11 text-sm"
      onClick={async () => {
        const result = await prompt.prompt();
        if (result.outcome === "accepted") {
          vibrate([40, 20, 40]);
          setInstalled(true);
          setPrompt(null);
        }
      }}
    >
      <span aria-hidden="true">⬇</span>
      Add to home screen
    </button>
  );
}
"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/Icons";
import { hasWakeLock, hasShare, vibrate, type WakeLockSentinelLike } from "@/lib/browser-tokens";

/** Voice entry lives in its own module; re-exported for existing imports. */
export { SpeakCalc } from "@/components/tech/SpeakCalc";

/** No external store to subscribe to — these are one-shot feature checks. */
function emptySubscribe() { return () => undefined; }

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
        <Icon name="sun" size={15} />
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
      <Icon name="download" size={15} />
      Add to home screen
    </button>
  );
}
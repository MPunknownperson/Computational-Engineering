"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useNative } from "./NativeProvider";

/**
 * This PWA is intentionally **online-only**.
 *
 * Rather than shipping a stale cached shell, the app verifies it can actually
 * reach the origin and otherwise shows a native-style "reconnect" screen. The
 * browser `navigator.onLine` flag is only a hint, so it is confirmed with a
 * real request to `/api/app/session`.
 */
export function ConnectionGate({ children }: { children: ReactNode }) {
  const { online } = useNative();
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const probe = useCallback(async () => {
    setChecking(true);
    try {
      const response = await fetch("/api/app/session", { cache: "no-store" });
      setReachable(response.ok);
    } catch {
      setReachable(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void probe();
  }, [probe]);

  // Re-probe as soon as the OS reports the radio is back.
  useEffect(() => {
    if (online) void probe();
    else setReachable(false);
  }, [online, probe]);

  // Keep a light heartbeat so a silent drop is noticed quickly.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void probe();
    }, 30000);
    return () => clearInterval(timer);
  }, [probe]);

  if (reachable === null) {
    return (
      <div className="native-boot" role="status" aria-live="polite">
        <span className="native-boot__spinner" aria-hidden />
        <p>Connecting…</p>
      </div>
    );
  }

  if (!reachable) {
    return (
      <div className="native-offline" role="alert">
        <div className="native-offline__icon" aria-hidden>
          ⚡
        </div>
        <h1>You&rsquo;re offline</h1>
        <p>
          Quilloryn is a connected application. Every calculation, rate and analysis is computed on the server, so an
          internet connection is required — there is no stale offline copy to fall back to.
        </p>
        <button type="button" className="native-offline__retry" onClick={() => void probe()} disabled={checking}>
          {checking ? "Checking…" : "Try again"}
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

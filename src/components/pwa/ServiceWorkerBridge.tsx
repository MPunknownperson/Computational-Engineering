"use client";

import { useEffect, useState } from "react";

/**
 * Registers the Serwist/Workbox-generated service worker with a scope that
 * covers the dedicated /app PWA path and surfaces update prompts natively.
 */
export function ServiceWorkerBridge() {
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    let cancelled = false;
    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller && !cancelled) {
              setUpdated(true);
            }
          });
        });
      } catch {
        /* registration is best-effort: the shell still works online */
      }
    };
    void register();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!updated) return null;
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      style={{
        position: "fixed",
        left: "1rem",
        right: "1rem",
        bottom: "calc(env(safe-area-inset-bottom) + 5rem)",
        zIndex: 50,
      }}
      className="pwa-btn"
      data-variant="accent"
    >
      A new version is ready — tap to update
    </button>
  );
}

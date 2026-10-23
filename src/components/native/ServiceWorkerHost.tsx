"use client";

import { useEffect, useState } from "react";

/**
 * Registers the online-only service worker.
 *
 * The worker never caches responses; it exists so the app is installable,
 * can use navigation preload, participates in `launch_handler` focus-existing
 * behaviour and can be updated atomically. When a new build lands we show a
 * native-looking update bar instead of silently swapping code underneath the
 * user.
 */
export function ServiceWorkerHost() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    let cancelled = false;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaiting(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller && !cancelled) {
              setWaiting(installing);
            }
          });
        });

        // An online-only app should check for new code whenever it regains focus.
        const onVisible = () => {
          if (document.visibilityState === "visible") void registration.update();
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => document.removeEventListener("visibilitychange", onVisible);
      } catch {
        /* best effort — the shell works fine without a worker */
      }
      return undefined;
    };

    void register();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!waiting) return null;

  return (
    <button
      type="button"
      className="native-update-bar"
      onClick={() => {
        waiting.postMessage({ type: "SKIP_WAITING" });
        window.location.reload();
      }}
    >
      A new version is ready — tap to update
    </button>
  );
}

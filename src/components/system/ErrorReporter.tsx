"use client";
import { useEffect } from "react";
import { applyClientActions, reportClientError } from "@/components/crypto/use-crypto";

/**
 * Global browser-side incident capture. Uncaught exceptions, unhandled promise
 * rejections and failed dynamic chunk loads are classified, sent to the
 * remediation engine and the returned client actions (clear corrupt storage,
 * cache-busting reload, transport switch…) are applied automatically.
 */
export function ErrorReporter() {
  useEffect(() => {
    const handle = (message: string, stack?: string, category?: string, context?: Record<string, unknown>) => {
      void reportClientError({ message, stack, category, userAction: lastInteraction, context }).then((plan) => {
        if (plan) applyClientActions(plan.clientActions, { notify: (m) => console.info("[remediation]", m) });
      });
    };
    let lastInteraction = "page-load";
    const track = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const label = target?.getAttribute?.("aria-label") || target?.textContent?.trim().slice(0, 40) || target?.tagName;
      lastInteraction = `${event.type}:${label ?? "unknown"}`;
    };
    const onError = (event: ErrorEvent) => {
      const msg = event.message || "Script error";
      const isChunk = /loading chunk|ChunkLoadError|dynamically imported module|Importing a module script failed/i.test(`${msg} ${event.error?.stack ?? ""}`);
      handle(msg, event.error?.stack, isChunk ? "chunk_load" : undefined, { filename: event.filename, line: event.lineno });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "Unhandled promise rejection";
      if (/AbortError|The user aborted a request|NetworkError when attempting to fetch resource/i.test(msg)) return;
      handle(msg, reason instanceof Error ? reason.stack : undefined, /quota|storage/i.test(msg) ? "storage_corrupt" : undefined);
    };
    const onOffline = () => console.info("[remediation] browser offline — live feed will resume automatically.");
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("offline", onOffline);
    document.addEventListener("click", track, true);
    document.addEventListener("submit", track, true);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("click", track, true);
      document.removeEventListener("submit", track, true);
    };
  }, []);
  return null;
}

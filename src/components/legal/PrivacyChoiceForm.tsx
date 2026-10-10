"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import type { PrivacyChoiceStatus } from "@/lib/privacy/constants";

function subscribeToBrowserGpc() { return () => undefined; }
function browserGpcSnapshot() {
  return typeof navigator !== "undefined" && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

export function PrivacyChoiceForm({ initial, initialError = null }: { initial: PrivacyChoiceStatus; initialError?: string | null }) {
  const [status, setStatus] = useState(initial);
  const browserReportedGpc = useSyncExternalStore(subscribeToBrowserGpc, browserGpcSnapshot, () => false);
  const activeGpc = status.globalPrivacyControl || browserReportedGpc;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const controller = useRef<AbortController | null>(null);

  const save = useCallback(async (source: "manual" | "gpc") => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/privacy/choices", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "opt-out", source }), signal: request.signal,
      });
      const data = await response.json() as PrivacyChoiceStatus & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Your choice was not saved. Please try again.");
      setStatus(data);
    } catch (cause) {
      if (!request.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to save your preference.");
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  }, []);

  useEffect(() => {
    const browserGpc = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
    if ((browserGpc || initial.globalPrivacyControl) && !initial.stored) void save("gpc");
    return () => controller.current?.abort();
  }, [initial.globalPrivacyControl, initial.stored, save]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save(activeGpc ? "gpc" : "manual");
  }

  return (
    <section className="mt-7 rounded-2xl border-2 border-[color:var(--line)] bg-white p-5 sm:p-6" aria-labelledby="privacy-choice-title">
      <h2 id="privacy-choice-title" className="text-xl font-bold">Your browser preference</h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">
        You can record an opt-out without an account, email address, or identity verification.
        This preference covers sale and sharing for cross-context behavioral advertising.
      </p>
      <div role="status" aria-live="polite" className="mt-4 rounded-xl border border-[#b9d5ce] bg-[#eff8f5] p-4 text-sm text-[#164d41]">
        <p className="font-bold">{status.optedOut ? "Sale and sharing opt-out is active." : "No browser preference has been recorded yet."}</p>
        <p className="mt-1">{activeGpc
          ? "Global Privacy Control is detected and honored. You do not need to confirm it."
          : status.optedOut ? "Your restrictive preference is remembered for this browser."
          : "Radix Loom still does not sell or share personal information, whether or not you save a choice."}</p>
      </div>
      <form action="/api/privacy/choices" method="post" onSubmit={submit} className="mt-5">
        <input type="hidden" name="action" value="opt-out" />
        <button type="submit" className="btn btn-primary" disabled={busy || (status.stored && status.optedOut)}>
          {busy ? "Saving your choice…" : status.stored && status.optedOut ? "Opt-out saved for this browser" : "Opt out of sale and sharing"}
        </button>
      </form>
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-rose-800">{error}</p>}
      <p className="mt-4 text-xs leading-relaxed text-slate-600">
        Essential cookies remember this choice for up to one year. Clearing site cookies or using another browser may require saving it again.
        An enabled GPC signal applies each time it is received. This does not delete saved formulas or submit an access request.
      </p>
      <noscript><p className="mt-3 text-sm">The form also works without JavaScript. Your browser’s Sec-GPC signal is recognized by the server.</p></noscript>
    </section>
  );
}

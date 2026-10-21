"use client";
import { useEffect, useRef, useState } from "react";
import { applyClientActions, reportClientError } from "@/components/crypto/use-crypto";

type Step = { label: string; state: "pending" | "done" | "failed" };

/**
 * Shared UI for error.tsx / global-error.tsx: reports the failure (with the
 * React digest and the visitor's last action), asks the remediation engine for
 * a plan, applies the browser-side actions and retries the render. Manual
 * controls remain available if automatic repair cannot recover.
 */
export function SelfHealingBoundary({ error, reset, scope }: { error: Error & { digest?: string }; reset: () => void; scope: "route" | "global" }) {
  const [steps, setSteps] = useState<Step[]>([{ label: "Collecting diagnostic data", state: "pending" }, { label: "Generating remediation plan", state: "pending" }, { label: "Deploying fix", state: "pending" }, { label: "Retrying", state: "pending" }]);
  const [summary, setSummary] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const mark = (i: number, state: Step["state"]) => setSteps((s) => s.map((step, j) => (j === i ? { ...step, state } : step)));
    let attempts = 0;
    try { attempts = Number(sessionStorage.getItem("radix-crypto:boundary-attempts") ?? 0); sessionStorage.setItem("radix-crypto:boundary-attempts", String(attempts + 1)); } catch { /* ignore */ }
    (async () => {
      mark(0, "done");
      const plan = await reportClientError({ message: error.message || "Render failure", stack: error.stack, category: /ChunkLoadError|Loading chunk/i.test(`${error.message} ${error.stack ?? ""}`) ? "chunk_load" : /hydrat/i.test(error.message) ? "hydration" : "render", userAction: `error-boundary:${scope}`, context: { digest: error.digest, attempts } });
      mark(1, plan ? "done" : "failed");
      setSummary(plan?.summary ?? "The server could not be reached for a plan; applying a local retry.");
      if (attempts >= 3) { mark(2, "failed"); mark(3, "failed"); setExhausted(true); return; }
      const actions = plan?.clientActions?.length ? plan.clientActions : [{ type: "reset-boundary" }];
      mark(2, "done");
      applyClientActions(actions, { resetBoundary: () => { mark(3, "done"); setTimeout(reset, 300); }, retry: () => { mark(3, "done"); reset(); } });
      if (!actions.some((a) => a.type === "reset-boundary" || a.type === "retry" || a.type === "reload")) { mark(3, "done"); setTimeout(reset, 800); }
    })();
  }, [error, reset, scope]);

  useEffect(() => () => { try { if (!exhausted) sessionStorage.removeItem("radix-crypto:boundary-attempts"); } catch { /* ignore */ } }, [exhausted]);

  return (
    <div className="mx-auto max-w-2xl px-5 py-16" role="alert" aria-live="assertive">
      <span className="chip">Automatic repair</span>
      <h1 className="h-title mt-4 text-3xl">Something went wrong — fixing it</h1>
      <p className="mt-3 text-slate-600">The page hit an error. Diagnostic data (the failure, the page and your last action — never form contents) was collected and the remediation system is applying a fix.</p>
      <ol className="mt-5 space-y-2">
        {steps.map((s) => <li key={s.label} className="flex items-center gap-2 text-sm"><span aria-hidden className={`grid h-5 w-5 place-items-center rounded-full border-2 border-[color:var(--line)] text-[.65rem] font-black ${s.state === "done" ? "bg-teal-200" : s.state === "failed" ? "bg-rose-200" : "bg-[color:var(--paper-2)]"}`}>{s.state === "done" ? "✓" : s.state === "failed" ? "✗" : "…"}</span>{s.label}</li>)}
      </ol>
      {summary && <p className="mt-4 rounded-xl border-2 border-[color:var(--line)] bg-[#fffdf5] p-3 text-sm"><strong>Plan:</strong> {summary}</p>}
      {exhausted && <p className="mt-3 text-sm font-semibold text-rose-700">Automatic repair was attempted three times. Please use the controls below.</p>}
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={() => { try { sessionStorage.removeItem("radix-crypto:boundary-attempts"); } catch { /* ignore */ } reset(); }}>Try again</button>
        <button type="button" className="btn btn-ghost" onClick={() => { try { sessionStorage.clear(); } catch { /* ignore */ } location.replace(`${location.pathname}?_r=${Date.now().toString(36)}`); }}>Reload with clean cache</button>
        <a className="btn btn-ghost" href="/">Go to the home page</a>
      </div>
      {error.digest && <p className="mono mt-4 text-xs text-slate-500">Reference: {error.digest}</p>}
    </div>
  );
}

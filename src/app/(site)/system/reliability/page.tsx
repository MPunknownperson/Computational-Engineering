"use client";
import { useCallback, useEffect, useState } from "react";
import { Reveal, Skeleton } from "@/components/Motion";
import { Icon } from "@/components/Icons";
import { apiFetch, fmtAge, type ApiError } from "@/components/crypto/use-crypto";

type Overview = {
  ok: boolean; uptimeMs: number;
  summary: { open: number; remediated: number; occurrences: number; fixesVerified: number; fixesApplied: number; fixesFailed: number };
  incidents: Array<{ id: string; fingerprint: string; origin: string; category: string; severity: string; message: string; route: string | null; userAction: string | null; occurrences: number; status: string; firstSeenAt: string; lastSeenAt: string }>;
  actions: Array<{ id: string; fingerprint: string; playbook: string; outcome: string; detail: string | null; durationMs: number; createdAt: string; plan: { summary?: string; verified?: boolean | null } }>;
  breakers: Array<{ name: string; state: string; failures: number; totalCalls: number; totalFailures: number; reopensInMs: number }>;
  caches: Array<{ name: string; entries: number; hits: number; misses: number; staleServed: number; coalesced: number; refreshErrors: number; evictions: number }>;
  patches: Array<{ key: string; value: unknown; reason: string | null; expiresAt: string | null; default: unknown }>;
  runtime: { pollMs: number; provider: string; cacheTtlMs: number; transport: string };
  playbooks: string[];
  engine: { feed: { source: string; fetchedAt: number; live: boolean } | null; scheduler: { running: boolean; ticks: number; lastTickAt: number | null; lastError: string | null } };
};
type SelfTest = { ok: boolean; checks: Array<{ name: string; ok: boolean; detail: string; repaired?: boolean }>; durationMs: number };

const DRILLS = ["upstream_timeout", "rate_limited", "malformed_payload", "schema_missing", "database_unavailable", "render", "chunk_load", "storage_corrupt", "hydration"];

export default function ReliabilityPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<SelfTest | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [drill, setDrill] = useState(DRILLS[0]);

  const load = useCallback(async () => {
    try { setData(await apiFetch<Overview>("/api/system/reliability", { userAction: "reliability-overview" })); setError(null); }
    catch (e) { setError((e as ApiError).message); }
  }, []);
  useEffect(() => { void load(); const t = setInterval(load, 20_000); return () => clearInterval(t); }, [load]);

  const act = async (body: Record<string, string>, label: string) => {
    setBusy(label);
    try {
      const result = await apiFetch<SelfTest | Record<string, unknown>>("/api/system/reliability", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), userAction: label });
      if (body.action === "self-test") setTest(result as SelfTest);
      await load();
    } catch (e) { setError((e as ApiError).message); }
    finally { setBusy(null); }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-12">
      <Reveal>
        <span className="chip"><Icon name="shield" size={13} strokeWidth={2.3} /> Operations · Reliability</span>
        <h1 className="h-title mt-4 text-4xl sm:text-5xl">Reliability <span className="h-underline">console</span></h1>
        <p className="mt-3 max-w-3xl text-slate-600">Every captured failure — on the server or in a visitor's browser — is fingerprinted, matched to a playbook, and the generated fix is deployed and verified automatically. This console shows the incident ledger, deployed fixes, live runtime patches, circuit breakers and caches, and lets an operator run the self-test or a fault drill.</p>
      </Reveal>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button type="button" className="btn" disabled={busy !== null} onClick={() => void act({ action: "self-test" }, "self-test")}><Icon name="bolt" size={15} /> {busy === "self-test" ? "Running…" : "Run self-test & repair"}</button>
        <label className="flex items-center gap-2 text-sm font-semibold">Fault drill
          <select className="input !py-1.5" value={drill} onChange={(e) => setDrill(e.target.value)} aria-label="Fault category to simulate">{DRILLS.map((d) => <option key={d} value={d}>{d}</option>)}</select>
        </label>
        <button type="button" className="btn btn-ghost" disabled={busy !== null} onClick={() => void act({ action: "simulate", category: drill }, "simulate")}><Icon name="flask" size={15} /> Inject & remediate</button>
        <button type="button" className="btn btn-ghost" onClick={() => void load()}><Icon name="refresh" size={15} /> Refresh</button>
        {data && <span className="ml-auto text-xs text-slate-500">Server uptime {fmtAge(data.uptimeMs).replace(" ago", "")} · {data.playbooks.length} playbooks</span>}
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl border-2 border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}

      {test && (
        <section className="sketch mt-5" aria-labelledby="selftest-title">
          <h2 id="selftest-title" className="text-lg font-extrabold">Self-test {test.ok ? "passed" : "found issues"} <span className="text-sm font-semibold text-slate-500">({test.durationMs} ms)</span></h2>
          <ul className="mt-2 space-y-1 text-sm">{test.checks.map((c, i) => <li key={i} className="flex gap-2"><span aria-hidden className={c.ok ? "text-teal-700" : "text-rose-600"}>{c.ok ? "✓" : "✗"}</span><span><strong>{c.name}</strong> — {c.detail}{c.repaired ? " (repaired)" : ""}</span></li>)}</ul>
        </section>
      )}

      {!data ? <div className="mt-6 space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div> : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Open incidents" value={String(data.summary.open)} tone={data.summary.open ? "down" : "up"} />
            <Stat label="Remediated / monitoring" value={String(data.summary.remediated)} tone="up" />
            <Stat label="Total occurrences" value={String(data.summary.occurrences)} />
            <Stat label="Fixes deployed" value={String(data.summary.fixesApplied)} />
            <Stat label="Fixes verified" value={String(data.summary.fixesVerified)} tone="up" />
            <Stat label="Fixes failed" value={String(data.summary.fixesFailed)} tone={data.summary.fixesFailed ? "down" : undefined} />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <section className="sketch" aria-labelledby="runtime-title">
              <h2 id="runtime-title" className="text-lg font-extrabold">Live runtime & patches</h2>
              <dl className="mt-2 space-y-1 text-sm">
                <Row k="Market provider" v={data.runtime.provider} /><Row k="Scheduler interval" v={`${data.runtime.pollMs / 1000} s`} /><Row k="Cache TTL" v={`${data.runtime.cacheTtlMs / 1000} s`} /><Row k="Client transport" v={data.runtime.transport} />
                <Row k="Feed" v={data.engine.feed ? `${data.engine.feed.source} · ${fmtAge(Date.now() - data.engine.feed.fetchedAt)}` : "warming"} /><Row k="Scheduler" v={`${data.engine.scheduler.running ? "running" : "stopped"} · ${data.engine.scheduler.ticks} ticks`} />
              </dl>
              <h3 className="mt-4 text-sm font-extrabold uppercase tracking-[.14em] text-slate-500">Deployed patches</h3>
              {data.patches.length === 0 ? <p className="mt-1 text-sm text-slate-500">None active — defaults in force.</p> : (
                <ul className="mt-1 space-y-1 text-sm">{data.patches.map((p) => <li key={p.key} className="rounded-lg border border-[color:var(--line)]/40 px-2.5 py-1.5"><span className="mono font-bold">{p.key}</span> = <span className="mono">{JSON.stringify(p.value)}</span> <span className="text-slate-500">(default {JSON.stringify(p.default)})</span><br /><span className="text-xs text-slate-600">{p.reason} · {p.expiresAt ? `expires ${new Date(p.expiresAt).toLocaleTimeString()}` : "permanent"}</span></li>)}</ul>
              )}
            </section>
            <section className="sketch" aria-labelledby="breakers-title">
              <h2 id="breakers-title" className="text-lg font-extrabold">Circuit breakers</h2>
              {data.breakers.length === 0 ? <p className="mt-1 text-sm text-slate-500">No upstream calls yet.</p> : <dl className="mt-2 space-y-1 text-sm">{data.breakers.map((b) => <Row key={b.name} k={b.name} v={`${b.state}${b.state === "open" ? ` · reopens in ${Math.ceil(b.reopensInMs / 1000)}s` : ""} · ${b.totalFailures}/${b.totalCalls} failed`} />)}</dl>}
              <h2 className="mt-4 text-lg font-extrabold">High-speed caches</h2>
              <dl className="mt-2 space-y-1 text-sm">{data.caches.map((c) => <Row key={c.name} k={c.name} v={`${c.entries} entries · ${c.hits} hits / ${c.misses} misses · ${c.staleServed} stale · ${c.coalesced} coalesced · ${c.refreshErrors} refresh errors`} />)}</dl>
            </section>
            <section className="sketch" aria-labelledby="playbooks-title">
              <h2 id="playbooks-title" className="text-lg font-extrabold">Remediation playbooks</h2>
              <ul className="mt-2 space-y-1 text-sm">{data.playbooks.map((p) => <li key={p} className="mono rounded-lg border border-[color:var(--line)]/40 px-2.5 py-1">{p}</li>)}</ul>
              <p className="mt-3 text-xs text-slate-500">A playbook is selected by error category. Server actions (runtime patches, cache resets, breaker control, schema self-heal, pool reconnect, cache warm-up) are applied at most once per fingerprint per minute; browser actions are returned to the reporting client.</p>
            </section>
          </div>

          <section className="sketch mt-5 overflow-hidden !p-0" aria-labelledby="incidents-title">
            <h2 id="incidents-title" className="border-b-2 border-[color:var(--line)] bg-[#fffdf5] px-4 py-3 text-lg font-extrabold">Incident ledger</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-slate-500"><tr><th className="p-3">Last seen</th><th className="p-3">Origin</th><th className="p-3">Category</th><th className="p-3">Message</th><th className="p-3">Route / action</th><th className="p-3 text-right">Count</th><th className="p-3">Status</th></tr></thead>
                <tbody>
                  {data.incidents.map((i) => (
                    <tr key={i.id} className="border-t border-[color:var(--line)]/30 align-top">
                      <td className="mono p-3 whitespace-nowrap text-xs">{new Date(i.lastSeenAt).toLocaleString()}</td>
                      <td className="p-3">{i.origin}</td>
                      <td className="p-3"><span className={`chip !py-0 text-[.65rem] ${i.severity === "critical" ? "!bg-rose-200" : i.severity === "error" ? "!bg-amber-200" : ""}`}>{i.category}</span></td>
                      <td className="p-3 max-w-md break-words">{i.message}</td>
                      <td className="p-3 text-xs text-slate-600">{i.route ?? "—"}{i.userAction ? <><br />{i.userAction}</> : null}</td>
                      <td className="mono p-3 text-right">{i.occurrences}</td>
                      <td className="p-3"><span className={`font-semibold ${i.status === "remediated" ? "text-teal-700" : i.status === "open" ? "text-rose-600" : ""}`}>{i.status}</span></td>
                    </tr>
                  ))}
                  {data.incidents.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-500">No incidents recorded. Run a fault drill to exercise the pipeline.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="sketch mt-5 overflow-hidden !p-0" aria-labelledby="fixes-title">
            <h2 id="fixes-title" className="border-b-2 border-[color:var(--line)] bg-[#fffdf5] px-4 py-3 text-lg font-extrabold">Generated & deployed fixes</h2>
            <ul className="divide-y divide-[color:var(--line)]/30">
              {data.actions.map((a) => (
                <li key={a.id} className="grid gap-1 px-4 py-3 text-sm md:grid-cols-[11rem_1fr_7rem]">
                  <span className="mono text-xs text-slate-500">{new Date(a.createdAt).toLocaleString()}<br />{a.durationMs} ms</span>
                  <span><span className="mono font-bold">{a.playbook}</span><br /><span className="text-slate-700">{a.plan?.summary}</span>{a.detail && a.detail !== a.plan?.summary && <pre className="mono mt-1 whitespace-pre-wrap text-xs text-slate-600">{a.detail}</pre>}</span>
                  <span className={`font-extrabold md:text-right ${a.outcome === "verified" ? "text-teal-700" : a.outcome === "failed" ? "text-rose-600" : "text-slate-700"}`}>{a.outcome}</span>
                </li>
              ))}
              {data.actions.length === 0 && <li className="p-6 text-center text-slate-500">No fixes deployed yet.</li>}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return <div className="sketch-sm"><div className="text-[.62rem] font-extrabold uppercase tracking-[.16em] text-slate-500">{label}</div><div className={`mono mt-1 text-2xl font-extrabold ${tone === "up" ? "text-teal-700" : tone === "down" ? "text-rose-600" : ""}`}>{value}</div></div>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex items-baseline justify-between gap-2"><dt className="text-slate-600">{k}</dt><dd className="mono text-right font-semibold">{v}</dd></div>;
}

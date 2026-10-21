"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { Skeleton } from "@/components/Motion";
import type { CorrelationReport } from "@/lib/crypto/service";
import { Heatmap } from "./charts";
import { apiFetch, fmtAge, sourceLabel, type ApiError, type FeedMeta } from "./use-crypto";

type Engine = {
  now: number;
  feed: { source: string; fetchedAt: number; ageMs: number; state: string; live: boolean; assets: number; attempts: Array<{ provider: string; ok: boolean; ms: number; error?: string }> } | null;
  scheduler: { running: boolean; ticks: number; lastTickAt: number | null; lastDurationMs: number; lastError: string | null; lastSource: string | null; alertsTriggered: number; intervalMs: number };
  runtime: { primaryProvider: string; cacheTtlMs: number; timeoutMs: number; historyTtlMs: number; clientPollMs: number; transport: string; streamPushMs: number };
  breakers: Array<{ name: string; state: string; failures: number; totalCalls: number; totalFailures: number; reopensInMs: number; lastError: string | null }>;
  caches: Array<{ name: string; entries: number; hits: number; misses: number; staleServed: number; coalesced: number; refreshErrors: number }>;
  persistence: { snapshots: number; oldestSnapshot: string | null; historySeries: number };
};

export function SystemPanel({ vs, meta }: { vs: string; meta: FeedMeta }) {
  const [corr, setCorr] = useState<CorrelationReport | null>(null);
  const [corrError, setCorrError] = useState<string | null>(null);
  const [days, setDays] = useState(90);
  const [engine, setEngine] = useState<Engine | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCorr(null); setCorrError(null);
    apiFetch<CorrelationReport>(`/api/crypto/correlation?vs=${vs}&days=${days}`, { userAction: "correlation" }).then((r) => { if (!cancelled) setCorr(r); }).catch((e: ApiError) => { if (!cancelled) setCorrError(e.message); });
    return () => { cancelled = true; };
  }, [vs, days]);

  useEffect(() => {
    let cancelled = false;
    const load = () => apiFetch<Engine>("/api/crypto/engine", { userAction: "engine-status" }).then((e) => { if (!cancelled) setEngine(e); }).catch(() => undefined);
    void load();
    const t = setInterval(load, 15_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return (
    <div className="space-y-5">
      <section className="sketch" aria-labelledby="corr-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="corr-title" className="flex items-center gap-2 text-xl font-extrabold"><Icon name="grid" size={18} /> Correlation matrix</h2>
          <div className="flex gap-1.5" role="group" aria-label="Window">{[30, 90, 180].map((d) => <button key={d} type="button" className={`chip !py-1 ${days === d ? "!bg-[color:var(--accent-3)]" : ""}`} aria-pressed={days === d} onClick={() => setDays(d)}>{d}d</button>)}</div>
        </div>
        <p className="mt-1 text-sm text-slate-600">Pearson correlation of daily log returns on shared UTC days. Values near +1 move together; near 0 are independent; negative values move opposite.</p>
        {corrError && <p role="alert" className="mt-3 text-sm font-semibold text-rose-700">{corrError}</p>}
        {!corr && !corrError && <Skeleton className="mt-4 h-72 w-full" />}
        {corr && (
          <div className="mt-4 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
            <Heatmap labels={corr.symbols} matrix={corr.matrix} />
            <div>
              <h3 className="font-extrabold">Beta vs Bitcoin</h3>
              <p className="text-xs text-slate-500">Sensitivity of each asset's daily return to Bitcoin's. β 1.5 means it moved about 1.5× as much.</p>
              <ul className="mt-2 space-y-1 text-sm">
                {corr.ids.map((id, i) => <li key={id} className="flex items-center justify-between border-b border-dashed border-[color:var(--line)]/30 py-1"><span className="font-semibold">{corr.symbols[i]}</span><span className="mono">{(corr.betaVsBtc[id] ?? 0).toFixed(2)}</span></li>)}
              </ul>
              <p className="mt-2 text-xs text-slate-500">{corr.observations} shared daily observations · sources: {[...new Set(Object.values(corr.sources))].map(sourceLabel).join(", ")}</p>
            </div>
          </div>
        )}
      </section>

      <section className="sketch" aria-labelledby="engine-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="engine-title" className="flex items-center gap-2 text-xl font-extrabold"><Icon name="gauge" size={18} /> Engine status</h2>
          <Link href="/system/reliability" className="btn btn-ghost !py-1 text-sm"><Icon name="shield" size={14} /> Reliability console</Link>
        </div>
        {!engine ? <Skeleton className="mt-4 h-40 w-full" /> : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Block title="Live feed">
              <Row k="Source" v={engine.feed ? sourceLabel(engine.feed.source) : "warming"} />
              <Row k="Server data age" v={engine.feed ? fmtAge(engine.now - engine.feed.fetchedAt) : "—"} />
              <Row k="Cache state" v={engine.feed?.state ?? "—"} />
              <Row k="Browser transport" v={`${meta.transport}${meta.seq ? ` · seq ${meta.seq}` : ""}`} />
              <Row k="Browser last event" v={meta.lastEventAt ? fmtAge(Date.now() - meta.lastEventAt) : "—"} />
              <Row k="Stream errors / reconnects" v={`${meta.errors} / ${meta.reconnects}`} />
            </Block>
            <Block title="Automated scheduler">
              <Row k="Running" v={engine.scheduler.running ? "yes" : "no"} />
              <Row k="Interval" v={`${(engine.scheduler.intervalMs / 1000).toFixed(0)} s`} />
              <Row k="Ticks" v={String(engine.scheduler.ticks)} />
              <Row k="Last tick" v={engine.scheduler.lastTickAt ? `${fmtAge(engine.now - engine.scheduler.lastTickAt)} (${engine.scheduler.lastDurationMs} ms)` : "pending"} />
              <Row k="Last source" v={engine.scheduler.lastSource ?? "—"} />
              <Row k="Alerts triggered" v={String(engine.scheduler.alertsTriggered)} />
              {engine.scheduler.lastError && <Row k="Last error" v={engine.scheduler.lastError} />}
            </Block>
            <Block title="Runtime configuration">
              <Row k="Primary provider" v={engine.runtime.primaryProvider} />
              <Row k="Cache TTL" v={`${engine.runtime.cacheTtlMs / 1000} s`} />
              <Row k="Upstream timeout" v={`${engine.runtime.timeoutMs} ms`} />
              <Row k="History TTL" v={`${engine.runtime.historyTtlMs / 60000} min`} />
              <Row k="Stream push" v={`${engine.runtime.streamPushMs / 1000} s`} />
              <Row k="Persisted snapshots" v={`${engine.persistence.snapshots.toLocaleString()} rows`} />
              <Row k="History series cached" v={String(engine.persistence.historySeries)} />
            </Block>
            <Block title="Circuit breakers & caches">
              {engine.breakers.length === 0 && <p className="text-sm text-slate-500">No upstream calls yet.</p>}
              {engine.breakers.map((b) => <Row key={b.name} k={b.name} v={`${b.state}${b.state === "open" ? ` (${Math.ceil(b.reopensInMs / 1000)}s)` : ""} · ${b.totalFailures}/${b.totalCalls} failed`} />)}
              {engine.caches.map((c) => <Row key={c.name} k={c.name.replace("crypto:", "cache ")} v={`${c.entries} entries · ${c.hits} hits · ${c.staleServed} stale · ${c.coalesced} coalesced`} />)}
              {engine.feed?.attempts && engine.feed.attempts.length > 0 && <p className="mt-1 text-xs text-slate-500">Last provider chain: {engine.feed.attempts.map((a) => `${a.provider} ${a.ok ? "✓" : "✗"} ${a.ms}ms`).join(" → ")}</p>}
            </Block>
          </div>
        )}
      </section>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-xl border-2 border-[color:var(--line)] bg-[color:var(--paper)] p-3"><h3 className="text-[.62rem] font-extrabold uppercase tracking-[.16em] text-slate-500">{title}</h3><dl className="mt-2 space-y-1">{children}</dl></div>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex items-baseline justify-between gap-2 text-sm"><dt className="text-slate-600">{k}</dt><dd className="mono truncate text-right font-semibold" title={v}>{v}</dd></div>;
}

"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { Skeleton } from "@/components/Motion";
import type { CorrelationReport } from "@/lib/crypto/service";
import { Heatmap } from "./charts";
import { apiFetch, sourceLabel, type ApiError } from "./use-crypto";

export function SystemPanel({ vs }: { vs: string }) {
  const [corr, setCorr] = useState<CorrelationReport | null>(null);
  const [corrError, setCorrError] = useState<string | null>(null);
  const [days, setDays] = useState(90);

  useEffect(() => {
    let cancelled = false;
    setCorr(null); setCorrError(null);
    apiFetch<CorrelationReport>(`/api/crypto/correlation?vs=${vs}&days=${days}`, { userAction: "correlation" }).then((r) => { if (!cancelled) setCorr(r); }).catch((e: ApiError) => { if (!cancelled) setCorrError(e.message); });
    return () => { cancelled = true; };
  }, [vs, days]);

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

    </div>
  );
}


"use client";
import { useEffect, useState } from "react";
import { Segmented, Skeleton } from "@/components/Motion";
import { Icon } from "@/components/Icons";
import { CRYPTO_IDS } from "@/lib/catalog";
import type { AnalysisReport } from "@/lib/crypto/service";
import { FanChart, IndicatorChart, PriceChart } from "./charts";
import { apiFetch, fmtPct, fmtPrice, sourceLabel, type ApiError } from "./use-crypto";

const RANGES = [{ value: "30", label: "30d" }, { value: "90", label: "90d" }, { value: "180", label: "180d" }, { value: "365", label: "1y" }] as const;

export function AnalysisPanel({ assetId, vs, onSelect, names }: { assetId: string; vs: string; onSelect: (id: string) => void; names: Record<string, string> }) {
  const [days, setDays] = useState<(typeof RANGES)[number]["value"]>("90");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [overlays, setOverlays] = useState({ sma: true, ema: false, bb: true, levels: true });

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    apiFetch<AnalysisReport>(`/api/crypto/analysis?id=${assetId}&vs=${vs}&days=${days}`, { userAction: "analyse-asset" })
      .then((r) => { if (!cancelled) { setReport(r); setLoading(false); } })
      .catch((e: ApiError) => { if (!cancelled) { setError(e.remediation ? `${e.message} — ${e.remediation.summary}` : e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [assetId, vs, days]);

  const fmt = (v: number) => fmtPrice(v, vs);
  const s = report?.stats;
  return (
    <section aria-labelledby="analysis-title" className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold" htmlFor="analysis-asset">Asset</label>
        <select id="analysis-asset" className="input max-w-[14rem]" value={assetId} onChange={(e) => onSelect(e.target.value)}>
          {CRYPTO_IDS.map((id) => <option key={id} value={id}>{names[id] ?? id}</option>)}
        </select>
        <Segmented options={[...RANGES]} value={days} onChange={setDays} size="sm" ariaLabel="History range" />
        <div className="ml-auto flex flex-wrap gap-1.5" role="group" aria-label="Chart overlays">
          {([["sma", "SMA 20/50"], ["ema", "EMA 12/26"], ["bb", "Bollinger"], ["levels", "S/R levels"]] as const).map(([k, label]) => (
            <button key={k} type="button" className={`chip !py-1 ${overlays[k] ? "!bg-[color:var(--accent-3)]" : ""}`} aria-pressed={overlays[k]} onClick={() => setOverlays((o) => ({ ...o, [k]: !o[k] }))}>{label}</button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl border-2 border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}

      {loading || !report || !s ? (
        <div className="space-y-3"><Skeleton className="h-72 w-full" /><Skeleton className="h-24 w-full" /></div>
      ) : (
        <>
          <div className="sketch">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="analysis-title" className="text-2xl font-extrabold tracking-tight">{report.name} <span className="text-base font-bold uppercase text-slate-500">{report.symbol}</span></h2>
                <p className="mono text-3xl font-extrabold">{fmt(s.last)} <span className={`text-base ${s.periodReturnPct >= 0 ? "text-teal-700" : "text-rose-600"}`}>{fmtPct(s.periodReturnPct)} over {days}d</span></p>
              </div>
              <SignalBadge signal={report.signal} />
            </div>
            <div className="mt-4">
              <PriceChart
                points={report.series.points}
                format={fmt}
                overlays={[...(overlays.sma ? [{ label: "SMA 20", values: report.series.sma20, color: "#315dc1" }, { label: "SMA 50", values: report.series.sma50, color: "#ad381f" }] : []), ...(overlays.ema ? [{ label: "EMA 12", values: report.series.ema12, color: "#6f4bd8", dash: "4 3" }, { label: "EMA 26", values: report.series.ema26, color: "#c25e3a", dash: "4 3" }] : [])]}
                band={overlays.bb ? { upper: report.series.bbUpper, lower: report.series.bbLower, color: "#315dc1" } : undefined}
                levels={overlays.levels ? [...report.levels.resistance.map((v, i) => ({ value: v, label: `R${i + 1}`, color: "#c2417c" })), ...report.levels.support.map((v, i) => ({ value: v, label: `S${i + 1}`, color: "#0e8a72" }))] : []}
              />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <IndicatorChart label="RSI 14" values={report.series.rsi} bounds={[0, 100]} lines={[{ value: 70, color: "#c2417c" }, { value: 30, color: "#0e8a72" }]} />
              <IndicatorChart label="MACD 12/26/9" values={report.series.macd} signal={report.series.macdSignal} histogram={report.series.macdHist} />
            </div>
            <p className="mt-2 text-xs text-slate-500">Series: {report.series.points.length} observations · {sourceLabel(report.source)} · computed in {report.computeMs} ms · cached 60 s.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Return & trend" icon="trend">
              <Row k="Period return" v={fmtPct(s.periodReturnPct)} tone={s.periodReturnPct} />
              <Row k="Range" v={`${fmt(s.low)} – ${fmt(s.high)}`} />
              <Row k="Mean ± σ (price)" v={`${fmt(s.meanPrice)} ± ${fmt(s.stdPrice)}`} />
              <Row k="Regression slope" v={`${fmtPct(s.regression.slopePct, 3)} / period`} tone={s.regression.slopePct} />
              <Row k="R² of fit" v={s.regression.r2.toFixed(3)} />
              <Row k="Trend projection (+7d)" v={fmt(s.regression.projected7)} />
              <Row k="RSI 14" v={s.rsi14 === null ? "—" : s.rsi14.toFixed(1)} />
              <Row k="z-score (20)" v={`${s.zScore20 >= 0 ? "+" : ""}${s.zScore20.toFixed(2)}σ`} />
            </Card>
            <Card title="Risk" icon="shield">
              <Row k="Annualised volatility" v={`${s.volAnnualPct.toFixed(1)}%`} />
              <Row k="Daily volatility" v={`${s.volDailyPct.toFixed(2)}%`} />
              <Row k="Sharpe (rf 0)" v={s.sharpe.toFixed(2)} tone={s.sharpe} />
              <Row k="Sortino" v={s.sortino.toFixed(2)} tone={s.sortino} />
              <Row k="Max drawdown" v={`−${s.maxDrawdownPct.toFixed(1)}% ${s.drawdownRecovered ? "(recovered)" : "(open)"}`} tone={-1} />
              <Row k="VaR 95% (hist / param)" v={`${s.var95Pct.toFixed(2)}% / ${s.parametricVar95Pct.toFixed(2)}%`} />
              <Row k="CVaR 95% · VaR 99%" v={`${s.cvar95Pct.toFixed(2)}% · ${s.var99Pct.toFixed(2)}%`} />
              <Row k="Skew · excess kurtosis" v={`${s.skew.toFixed(2)} · ${s.kurtosis.toFixed(2)}`} />
              <Row k="Bollinger width" v={s.bbWidthPct === null ? "—" : `${s.bbWidthPct.toFixed(1)}%`} />
            </Card>
            <Card title="Levels" icon="layers">
              {report.levels.resistance.map((v, i) => <Row key={`r${i}`} k={`Resistance R${i + 1}`} v={fmt(v)} tone={-1} />)}
              <Row k="Pivot" v={fmt(report.levels.pivot)} />
              {report.levels.support.map((v, i) => <Row key={`s${i}`} k={`Support S${i + 1}`} v={fmt(v)} tone={1} />)}
              {report.levels.support.length === 0 && report.levels.resistance.length === 0 && <p className="text-sm text-slate-500">No confirmed swing levels in this window.</p>}
              {report.quote && <>
                <Row k="24h high / low" v={`${fmt(report.quote.high24h ?? s.last)} / ${fmt(report.quote.low24h ?? s.last)}`} />
                <Row k="All-time high" v={report.quote.ath ? `${fmt(report.quote.ath)} (${fmtPct(report.quote.athChangePct)})` : "—"} />
              </>}
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="sketch">
              <h3 className="text-lg font-extrabold">Monte Carlo projection <span className="text-sm font-semibold text-slate-500">GBM · {report.monteCarlo.paths.toLocaleString()} paths · {report.monteCarlo.horizonDays} days · seed {report.monteCarlo.seed}</span></h3>
              <FanChart steps={report.monteCarlo.steps} s0={s.last} format={fmt} />
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <Mini k="Median (P50)" v={fmt(report.monteCarlo.terminal.p50)} />
                <Mini k="P5 – P95" v={`${fmt(report.monteCarlo.terminal.p5)} – ${fmt(report.monteCarlo.terminal.p95)}`} />
                <Mini k="P(end above today)" v={`${(report.monteCarlo.probabilityAbove * 100).toFixed(0)}%`} />
                <Mini k="P(≥20% drawdown)" v={`${(report.monteCarlo.probabilityDrawdown20 * 100).toFixed(0)}%`} />
              </div>
              <p className="mt-2 text-xs text-slate-500">Drift and volatility are estimated from the displayed history. A projection is a distribution of simulated paths, not a forecast.</p>
            </div>
            <div className="sketch">
              <h3 className="text-lg font-extrabold">Composite signal breakdown</h3>
              <ul className="mt-3 space-y-2.5">
                {report.signal.components.map((c) => (
                  <li key={c.name} className="text-sm">
                    <div className="flex items-center justify-between gap-2"><span className="font-semibold">{c.name}</span><span className="mono text-xs text-slate-500">w {c.weight.toFixed(2)} · {(c.score * 100).toFixed(0)}</span></div>
                    <div className="relative mt-1 h-2 overflow-hidden rounded-full border border-[color:var(--line)] bg-[color:var(--paper-2)]">
                      <span className="absolute left-1/2 top-0 h-full w-px bg-[color:var(--line)]" />
                      <span className={`absolute top-0 h-full ${c.score >= 0 ? "bg-teal-600" : "bg-rose-500"}`} style={c.score >= 0 ? { left: "50%", width: `${c.score * 50}%` } : { right: "50%", width: `${-c.score * 50}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{c.reason}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-500">Confidence {(report.signal.confidence * 100).toFixed(0)}% — lowered under high volatility or a weak regression fit. {report.precision.method}</p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function SignalBadge({ signal }: { signal: AnalysisReport["signal"] }) {
  const tone = signal.score >= 15 ? "bg-teal-100 text-teal-800 border-teal-700" : signal.score <= -15 ? "bg-rose-100 text-rose-800 border-rose-700" : "bg-[color:var(--paper-2)] text-slate-700 border-[color:var(--line)]";
  return (
    <div className={`rounded-xl border-2 px-4 py-2 ${tone}`} role="status" aria-label={`Composite signal ${signal.label}`}>
      <div className="text-[.62rem] font-extrabold uppercase tracking-[.16em]">Composite signal</div>
      <div className="text-xl font-extrabold capitalize">{signal.label} <span className="mono text-sm">({signal.score > 0 ? "+" : ""}{signal.score})</span></div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: "trend" | "shield" | "layers"; children: React.ReactNode }) {
  return <div className="sketch"><h3 className="flex items-center gap-2 text-lg font-extrabold"><Icon name={icon} size={18} /> {title}</h3><dl className="mt-3 space-y-1.5">{children}</dl></div>;
}
function Row({ k, v, tone }: { k: string; v: string; tone?: number }) {
  return <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-[color:var(--line)]/30 pb-1 text-sm last:border-0"><dt className="text-slate-600">{k}</dt><dd className={`mono text-right font-semibold ${tone === undefined ? "" : tone >= 0 ? "text-teal-700" : "text-rose-600"}`}>{v}</dd></div>;
}
function Mini({ k, v }: { k: string; v: string }) {
  return <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--paper)] px-2.5 py-1.5"><div className="text-[.6rem] font-extrabold uppercase tracking-[.14em] text-slate-500">{k}</div><div className="mono font-bold">{v}</div></div>;
}

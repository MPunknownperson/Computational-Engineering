"use client";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Reveal, Segmented, Skeleton, PanelSwap, AnimatedNumber } from "@/components/Motion";
import { ConfirmBar, ConfirmForm, LockedResult, useConfirmGate } from "@/components/Confirm";
import { COUNTRIES } from "@/lib/catalog";

type Point = { year: string; value: number };
type EconomyData = {
  country: string;
  indicator: string;
  latest: { year: string; value: number } | null;
  series: Point[];
};

const INDICATORS = [
  { value: "inflation", label: "Inflation" },
  { value: "gdp_per_capita", label: "GDP per person" },
  { value: "unemployment", label: "Unemployment" },
  { value: "population", label: "Population" },
];

export default function EconomyPage() {
  const search = useSearchParams();
  const requestedCountry = search.get("country")?.toUpperCase();
  const requestedIndicator = search.get("indicator");
  const initialCountry = requestedCountry && COUNTRIES.some((item) => item.value === requestedCountry) ? requestedCountry : "USA";
  const initialIndicator = requestedIndicator && INDICATORS.some((item) => item.value === requestedIndicator) ? requestedIndicator : "inflation";
  return <EconomyWorkspace key={search.toString()} initialCountry={initialCountry} initialIndicator={initialIndicator} />;
}

function EconomyWorkspace({ initialCountry, initialIndicator }: { initialCountry: string; initialIndicator: string }) {
  const [country, setCountry] = useState(initialCountry);
  const [indicator, setIndicator] = useState(initialIndicator);
  const [data, setData] = useState<EconomyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asOf, setAsOf] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch(`/api/economy?country=${encodeURIComponent(country)}&indicator=${encodeURIComponent(indicator)}`);
      if (!response.ok) throw new Error("unavailable");
      const payload = await response.json();
      setData(payload);
      setAsOf(new Date());
    } catch {
      setError("This economic information is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, [country, indicator]);

  useEffect(() => { refresh(); }, [refresh]);

  const ready = !loading && !error && data !== null;
  const gate = useConfirmGate(`${country}|${indicator}`, ready);
  const state = error ? "invalid" : loading ? "invalid" : gate.revealed ? "revealed" : "awaiting";
  const countryName = COUNTRIES.find((item) => item.value === country)?.label ?? country;
  const indicatorName = INDICATORS.find((item) => item.value === indicator)?.label ?? indicator;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-12">
      <Reveal>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="h-title text-4xl sm:text-5xl">Inflation, <span className="h-underline">GDP</span> &amp; population</h1>
          <span className="chip">Public reference information</span>
        </div>
        <p className="mt-3 max-w-2xl text-slate-600">
          Choose an economy and a measure, then press <strong>Show</strong>. The figures are retrieved while you choose;
          they appear only when you confirm. Many are published periodically, may refer to earlier years and can be revised.
        </p>
      </Reveal>

      <Reveal delay={60}>
        <div className="sketch mt-8">
          <ConfirmForm onSubmit={gate.confirm} label="Economic indicator selection">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="economy-country" className="mb-2 block text-sm font-semibold text-slate-700">Economy</label>
                <select id="economy-country" className="select" value={country} onChange={(e) => { setCountry(e.target.value); gate.reset(); }}>
                  {COUNTRIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
              <div>
                <span id="economy-measure-label" className="mb-2 block text-sm font-semibold text-slate-700">Measure</span>
                <div aria-labelledby="economy-measure-label">
                  <Segmented ariaLabel="Economic measure" options={INDICATORS} value={indicator} onChange={(next) => { setIndicator(next); gate.reset(); }} size="sm" />
                </div>
                <div className="mt-2.5 text-xs text-slate-500">
                  {asOf && <span>Retrieved {asOf.toLocaleTimeString()}</span>}
                </div>
              </div>
            </div>

            <ConfirmBar
              id="economy-confirm"
              action="Show"
              state={state}
              onConfirm={gate.confirm}
              onReset={gate.reset}
              readyText={loading ? "Retrieving the figures — the button becomes available shortly." : "Figures ready — press Show."}
              errorText={error ?? "Waiting for figures."}
              shownText={`${countryName} · ${indicatorName} shown.`}
            />
          </ConfirmForm>

          {gate.revealed && (
            <PanelSwap trigger={`${country}-${indicator}`} className="mt-7">
              <div className="grid gap-5 md:grid-cols-3">
                <div className="h-full result-panel is-revealed" role="status" aria-live="polite">
                  <div className="text-[.62rem] font-bold uppercase tracking-[.16em] text-slate-500">Most recent available value</div>
                  <div className="mono mt-1.5 text-3xl font-extrabold">
                    {data?.latest ? <AnimatedNumber value={data.latest.value} format={(n) => fmt(n, indicator)} duration={700} /> : "—"}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {data?.latest ? `${countryName} · reported year ${data.latest.year}` : "No figure available"}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <h2 className="mb-2 text-sm font-semibold text-slate-700">Historical values</h2>
                  <BarChart points={data?.series ?? []} />
                </div>
              </div>

              <details className="mt-4 rounded-xl border-2 border-[color:var(--line)] bg-white">
                <summary className="cursor-pointer px-4 py-3 text-sm font-extrabold">Values as a table</summary>
                <div className="max-h-72 overflow-auto border-t-2 border-[color:var(--line)]">
                  <table className="w-full text-sm">
                    <caption className="sr-only">{`${indicatorName} for ${countryName}, by year`}</caption>
                    <thead className="sticky top-0 bg-[#fffdf5]">
                      <tr>
                        <th scope="col" className="px-4 py-2 text-left font-bold">Year</th>
                        <th scope="col" className="px-4 py-2 text-right font-bold">{indicatorName}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.series ?? []).map((point) => (
                        <tr key={point.year} className="border-t border-[color:var(--line)]">
                          <th scope="row" className="px-4 py-2 text-left font-semibold">{point.year}</th>
                          <td className="mono px-4 py-2 text-right">{fmt(point.value, indicator)}</td>
                        </tr>
                      ))}
                      {(data?.series ?? []).length === 0 && (
                        <tr><td colSpan={2} className="px-4 py-6 text-center text-slate-500">No values available for this selection.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </details>
            </PanelSwap>
          )}

          {!gate.revealed && !loading && (
            <div className="result-panel is-locked mt-7 flex min-h-[7rem] items-center justify-center gap-3 text-sm text-slate-500">
              <LockedResult label="Figures hidden until you press Show." />
              <span>Figures for {countryName} · {indicatorName} appear after you press Show.</span>
            </div>
          )}
          {loading && <Skeleton className="mt-7 h-44 w-full" />}
        </div>
      </Reveal>
    </div>
  );
}

function fmt(value: number, indicator: string) {
  if (indicator === "population") return Math.round(value).toLocaleString();
  if (indicator === "gdp_per_capita") return `$${Math.round(value).toLocaleString()}`;
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${indicator === "inflation" || indicator === "unemployment" ? "%" : ""}`;
}

function BarChart({ points }: { points: Point[] }) {
  if (!points.length) return <p className="text-sm text-slate-500">No values are available for this selection.</p>;
  const w = 640, h = 190, pad = 26;
  const values = points.map((point) => point.value);
  const min = Math.min(0, ...values), max = Math.max(...values);
  const slot = (w - pad * 2) / points.length, barWidth = slot * 0.6;
  const zeroY = h - pad - ((0 - min) / (max - min || 1)) * (h - pad * 2);
  const summary = `Values from ${points[0].year} to ${points[points.length - 1].year}.`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full" role="img" aria-label={`Historical indicator bar chart. ${summary}`}>
      <defs><linearGradient id="indicatorBars" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff6b4a" /><stop offset="100%" stopColor="#5b8cff" /></linearGradient></defs>
      <line x1={pad} x2={w - pad} y1={zeroY} y2={zeroY} stroke="var(--line-strong)" strokeWidth="1.5" />
      {points.map((point, i) => {
        const x = pad + i * slot + (slot - barWidth) / 2;
        const valueY = h - pad - ((point.value - min) / (max - min || 1)) * (h - pad * 2);
        const top = Math.min(zeroY, valueY), height = Math.max(2, Math.abs(valueY - zeroY));
        return <g key={point.year}>
          <rect x={x} y={top} width={barWidth} height={height} rx="4" fill="url(#indicatorBars)" />
          <text x={x + barWidth / 2} y={h - 8} textAnchor="middle" fontSize="10" fill="#64748b">{point.year.slice(2)}</text>
        </g>;
      })}
    </svg>
  );
}

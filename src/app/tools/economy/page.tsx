"use client";
import { useCallback, useEffect, useState } from "react";

type SeriesPoint = { year: string; value: number };
type Payload = {
  country: string;
  indicator: string;
  indicatorCode: string;
  latest: { year: string; value: number } | null;
  series: SeriesPoint[];
};

const INDICATORS = [
  { key: "inflation", label: "Inflation (CPI, %)" },
  { key: "gdp_per_capita", label: "GDP per capita (USD)" },
  { key: "unemployment", label: "Unemployment (%)" },
  { key: "population", label: "Population" },
];

const PRESETS = [
  ["USA", "United States"], ["GBR", "United Kingdom"], ["DEU", "Germany"],
  ["FRA", "France"], ["JPN", "Japan"], ["CHN", "China"], ["IND", "India"],
  ["BRA", "Brazil"], ["ZAF", "South Africa"], ["AUS", "Australia"],
];

export default function EconomyPage() {
  const [country, setCountry] = useState("USA");
  const [indicator, setIndicator] = useState("inflation");
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [asOf, setAsOf] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setErr(null);
    try {
      const r = await fetch(`/api/economy?country=${encodeURIComponent(country)}&indicator=${encodeURIComponent(indicator)}`);
      if (!r.ok) throw new Error("upstream");
      const j = await r.json();
      setData(j); setAsOf(new Date());
    } catch (e: any) {
      setErr(e?.message || "fetch failed");
    }
  }, [country, indicator]);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex items-center gap-3">
        <h1 className="h-title text-4xl"><span className="h-underline">Economy</span> indicators</h1>
        <span className="chip"><span className="live-dot" /> World Bank</span>
      </div>
      <p className="mt-2 text-slate-600">
        Inflation, GDP per capita, unemployment and population from the World
        Bank Open Data API. Pick any country — live data is fetched on demand.
      </p>

      <div className="mt-6 sketch bg-white p-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Country</label>
            <select className="select" value={country} onChange={(e) => setCountry(e.target.value)}>
              {PRESETS.map(([code, name]) => <option key={code} value={code}>{name} ({code})</option>)}
            </select>
            <div className="flex flex-wrap gap-1 mt-2">
              {PRESETS.slice(0, 6).map(([c, n]) => (
                <button key={c} className="btn btn-ghost text-xs" onClick={() => setCountry(c)}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Indicator</label>
            <select className="select" value={indicator} onChange={(e) => setIndicator(e.target.value)}>
              {INDICATORS.map(i => <option key={i.key} value={i.key}>{i.label}</option>)}
            </select>
            <div className="text-xs text-slate-500 mt-2">
              {asOf && <>Fetched {asOf.toLocaleTimeString()} · </>}
              {err && <span className="text-[color:var(--accent)]">{err}</span>}
            </div>
          </div>
        </div>

        <div className="mt-5 grid md:grid-cols-3 gap-4">
          <div className="sketch-sm bg-[color:var(--paper-2)] p-4 md:col-span-1">
            <div className="text-xs uppercase tracking-wide font-semibold text-slate-500">Latest value</div>
            <div className="mono text-3xl font-bold mt-1">
              {data?.latest ? fmt(data.latest.value, indicator) : "—"}
            </div>
            <div className="text-sm text-slate-600 mt-1">
              {data?.latest ? `Year ${data.latest.year}` : "No data"}
            </div>
          </div>
          <div className="md:col-span-2">
            <h3 className="font-semibold mb-2">Trend (last ~10 years)</h3>
            <BarChart points={data?.series ?? []} indicator={indicator} />
          </div>
        </div>

        <button className="btn mt-5" onClick={refresh}>Refresh</button>
      </div>
    </div>
  );
}

function fmt(n: number, ind: string) {
  if (ind === "population") return Math.round(n).toLocaleString();
  if (ind === "gdp_per_capita") return `$${Math.round(n).toLocaleString()}`;
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}${ind === "inflation" || ind === "unemployment" ? "%" : ""}`;
}

function BarChart({ points, indicator }: { points: SeriesPoint[]; indicator: string }) {
  if (points.length === 0) return <div className="text-sm text-slate-500">No data.</div>;
  const w = 600, h = 180, pad = 24;
  const values = points.map(p => p.value);
  const min = Math.min(0, ...values);
  const max = Math.max(...values);
  const bw = (w - pad * 2) / points.length * 0.7;
  const gap = (w - pad * 2) / points.length * 0.3;
  const y0 = h - pad - ((0 - min) / (max - min || 1)) * (h - pad * 2);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-44">
      <line x1={pad} x2={w - pad} y1={y0} y2={y0} stroke="#0b1020" strokeOpacity="0.3" />
      {points.map((p, i) => {
        const x = pad + i * ((w - pad * 2) / points.length) + gap / 2;
        const yy = h - pad - ((p.value - min) / (max - min || 1)) * (h - pad * 2);
        const barY = Math.min(y0, yy);
        const barH = Math.abs(yy - y0);
        return (
          <g key={p.year}>
            <rect x={x} y={barY} width={bw} height={barH} fill="#5b8cff" stroke="#0b1020" strokeWidth="1.5" rx="3" />
            <text x={x + bw / 2} y={h - 6} textAnchor="middle" fontSize="10" fill="#334155">{p.year.slice(2)}</text>
          </g>
        );
      })}
      <text x={pad - 4} y={12} fontSize="10" fill="#334155">{indicator}</text>
    </svg>
  );
}

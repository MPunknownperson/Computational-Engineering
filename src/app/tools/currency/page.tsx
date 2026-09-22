"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

type Latest = { amount: number; base: string; date: string; rates: Record<string, number> };
type Series = { base: string; series: Record<string, Record<string, number>> };

const POPULAR = ["EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "CNY", "INR", "BRL", "KRW"];

export default function CurrencyPage() {
  const [base, setBase] = useState("USD");
  const [target, setTarget] = useState("EUR");
  const [amount, setAmount] = useState("100");
  const [latest, setLatest] = useState<Latest | null>(null);
  const [series, setSeries] = useState<Series | null>(null);
  const [asOf, setAsOf] = useState<Date | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setErr(null);
    try {
      const [lRes, sRes] = await Promise.all([
        fetch(`/api/fx?base=${encodeURIComponent(base)}`),
        fetch(`/api/fx?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(target)}&series=1`),
      ]);
      if (!lRes.ok || !sRes.ok) throw new Error("upstream");
      const l = await lRes.json();
      const s = await sRes.json();
      setLatest(l); setSeries(s); setAsOf(new Date());
    } catch (e: any) {
      setErr(e?.message || "fetch failed");
    }
  }, [base, target]);

  useEffect(() => { refresh(); }, [refresh]);
  // Auto-refresh every 60s
  useEffect(() => {
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
  }, [refresh]);

  const rate = latest?.rates?.[target];
  const amt = Number(amount);
  const converted = rate && Number.isFinite(amt) ? amt * rate : null;

  const chartPoints = useMemo(() => {
    if (!series) return [];
    return Object.entries(series.series).map(([date, r]) => ({
      date, value: r[target] ?? null,
    }));
  }, [series, target]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex items-center gap-3">
        <h1 className="h-title text-4xl"><span className="h-underline">Live</span> FX</h1>
        <span className="chip"><span className="live-dot" /> ECB reference rates</span>
      </div>
      <p className="mt-2 text-slate-600">
        Real-time exchange rates from the European Central Bank via Frankfurter.
        Updates every 60 seconds.
      </p>

      <div className="mt-6 grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 sketch bg-white p-5">
          <div className="grid md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold mb-1">Amount</label>
              <input className="input mono text-xl" value={amount}
                onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">From</label>
              <select className="select" value={base} onChange={(e) => setBase(e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">To</label>
              <select className="select" value={target} onChange={(e) => setTarget(e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-5 p-4 sketch-sm bg-[color:var(--paper-2)]">
            <div className="text-xs uppercase tracking-wide font-semibold text-slate-500">Converted</div>
            <div className="mono text-3xl font-bold mt-1">
              {converted !== null ? `${converted.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${target}` : "—"}
            </div>
            <div className="text-sm text-slate-600 mt-1">
              1 {base} = {rate ? rate.toFixed(4) : "—"} {target}
              {asOf && <span> · refreshed {asOf.toLocaleTimeString()}</span>}
              {err && <span className="text-[color:var(--accent)] ml-2">· {err}</span>}
            </div>
          </div>

          <button className="btn mt-4" onClick={refresh}>Refresh now</button>

          <div className="mt-6">
            <h3 className="font-semibold mb-2">30-day trend · {base} → {target}</h3>
            <Sparkline points={chartPoints.map(p => p.value).filter((v): v is number => v !== null)} />
          </div>
        </div>

        <div className="sketch bg-white p-5">
          <h3 className="font-bold mb-3">Popular rates from {base}</h3>
          {latest ? (
            <ul className="divide-y divide-black/5">
              {POPULAR.filter(c => c !== base).map(c => (
                <li key={c} className="py-2 flex items-center justify-between">
                  <button className="text-left hover:text-[color:var(--accent)]" onClick={() => setTarget(c)}>
                    <span className="font-semibold">{c}</span>
                  </button>
                  <span className="mono">{(latest.rates[c] ?? 0).toFixed(4)}</span>
                </li>
              ))}
            </ul>
          ) : <div className="text-sm text-slate-500">Loading…</div>}
        </div>
      </div>
    </div>
  );
}

const CURRENCIES = ["USD","EUR","GBP","JPY","CHF","CAD","AUD","NZD","CNY","INR","BRL","MXN","KRW","SGD","HKD","SEK","NOK","DKK","ZAR","TRY"];

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return <div className="text-sm text-slate-500">Not enough data.</div>;
  const w = 600, h = 140, pad = 10;
  const min = Math.min(...points), max = Math.max(...points);
  const dx = (w - pad * 2) / (points.length - 1);
  const scaleY = (v: number) => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
  const path = points.map((v, i) => `${i === 0 ? "M" : "L"}${pad + i * dx},${scaleY(v)}`).join(" ");
  const area = `${path} L${pad + (points.length - 1) * dx},${h - pad} L${pad},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40">
      <defs>
        <linearGradient id="fxgrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#5b8cff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#5b8cff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#fxgrad)" />
      <path d={path} fill="none" stroke="#0b1020" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

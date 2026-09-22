"use client";
import { useCallback, useEffect, useState } from "react";

type Coin = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number | null;
  market_cap: number;
  total_volume: number;
};

export default function CryptoPage() {
  const [items, setItems] = useState<Coin[]>([]);
  const [asOf, setAsOf] = useState<Date | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const refresh = useCallback(async () => {
    setErr(null);
    try {
      const r = await fetch("/api/crypto");
      if (!r.ok) throw new Error("upstream");
      const j = await r.json();
      setItems(j.items || []);
      setAsOf(new Date());
    } catch (e: any) {
      setErr(e?.message || "fetch failed");
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, [refresh]);

  const filtered = items.filter((c) =>
    !query ? true :
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.symbol.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex items-center gap-3">
        <h1 className="h-title text-4xl"><span className="h-underline">Crypto</span> prices</h1>
        <span className="chip"><span className="live-dot" /> CoinGecko</span>
      </div>
      <p className="mt-2 text-slate-600">
        Top coins by market cap with spot price and 24-hour change. Refreshes every 30 seconds.
      </p>

      <div className="mt-5 flex items-center gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search coin…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn" onClick={refresh}>Refresh</button>
        {asOf && <span className="text-sm text-slate-500">Updated {asOf.toLocaleTimeString()}</span>}
        {err && <span className="text-sm text-[color:var(--accent)]">{err}</span>}
      </div>

      <div className="mt-5 sketch bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--paper-2)] border-b-2 border-[color:var(--line)]">
              <tr>
                <th className="text-left p-3 font-semibold">#</th>
                <th className="text-left p-3 font-semibold">Coin</th>
                <th className="text-right p-3 font-semibold">Price (USD)</th>
                <th className="text-right p-3 font-semibold">24h %</th>
                <th className="text-right p-3 font-semibold">Market cap</th>
                <th className="text-right p-3 font-semibold">Volume (24h)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const ch = c.price_change_percentage_24h;
                const up = (ch ?? 0) >= 0;
                return (
                  <tr key={c.id} className="border-b border-black/5 hover:bg-black/[0.02]">
                    <td className="p-3 text-slate-500">{i + 1}</td>
                    <td className="p-3 flex items-center gap-2">
                      <img src={c.image} alt="" width={24} height={24} className="rounded-full" />
                      <span className="font-semibold">{c.name}</span>
                      <span className="text-slate-500 uppercase text-xs">{c.symbol}</span>
                    </td>
                    <td className="p-3 text-right mono">{fmt(c.current_price)}</td>
                    <td className={`p-3 text-right mono font-semibold ${up ? "text-emerald-600" : "text-rose-600"}`}>
                      {ch !== null ? `${up ? "+" : ""}${ch.toFixed(2)}%` : "—"}
                    </td>
                    <td className="p-3 text-right mono">{big(c.market_cap)}</td>
                    <td className="p-3 text-right mono">{big(c.total_volume)}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-slate-500">No coins match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">Not financial advice. Data provided by CoinGecko.</p>
    </div>
  );
}

function fmt(n: number) {
  if (n >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  return n.toLocaleString(undefined, { maximumSignificantDigits: 4 });
}
function big(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

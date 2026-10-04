"use client";
import { useCallback, useEffect, useState } from "react";
import { AnimatedNumber, Reveal, Skeleton } from "@/components/Motion";
import { Icon } from "@/components/Icons";

type Asset = {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number | null;
  market_cap: number;
  total_volume: number;
};

export default function CryptoPage() {
  const [items, setItems] = useState<Asset[]>([]);
  const [asOf, setAsOf] = useState<Date | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/crypto");
      if (!response.ok) throw new Error("unavailable");
      const payload = await response.json();
      setItems(payload.items || []);
      setAsOf(new Date());
      setErr(null);
    } catch {
      setErr("Digital-asset information is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const timer = setInterval(refresh, 30_000);
    return () => clearInterval(timer);
  }, [refresh]);

  // Filtering is applied only when the visitor confirms it, so the table does
  // not change on every keystroke.
  const filtered = items.filter((asset) => {
    const search = applied.trim().toLowerCase();
    return !search || asset.name.toLowerCase().includes(search) || asset.symbol.toLowerCase().includes(search);
  });
  const pendingFilter = query.trim() !== applied.trim();

  function applyFilter() {
    setApplied(query.trim());
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <Reveal>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="h-title text-4xl sm:text-5xl">Bitcoin &amp; <span className="h-underline">crypto prices</span></h1>
          <span className="chip">Market reference information</span>
        </div>
        <p className="mt-3 max-w-2xl text-slate-600">
          Price, daily movement and market summaries for selected digital assets. Values can change
          quickly, differ between venues and may not represent a price available to you.
        </p>
      </Reveal>

      <Reveal delay={60}>
        <form
          className="mt-7 flex flex-wrap items-center gap-3"
          aria-label="Filter digital assets"
          onSubmit={(event) => { event.preventDefault(); applyFilter(); }}
        >
          <label className="sr-only" htmlFor="asset-search">Filter digital assets by name or symbol</label>
          <input
            id="asset-search"
            className="input max-w-xs"
            placeholder="Filter by name or symbol"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-describedby="asset-filter-status"
          />
          <button type="submit" className="btn" disabled={!pendingFilter && !applied}>
            <Icon name="search" size={16} />
            Filter
          </button>
          {applied && (
            <button type="button" className="btn btn-ghost" onClick={() => { setQuery(""); setApplied(""); }}>
              Clear filter
            </button>
          )}
          <p id="asset-filter-status" role="status" className="confirm-status is-muted">
            {pendingFilter
              ? "Filter not applied yet — press Filter."
              : applied
                ? `Showing ${filtered.length} of ${items.length} assets matching “${applied}”.`
                : `Showing all ${items.length} assets.`}
          </p>
          {asOf && <span className="text-xs text-slate-500">Displayed {asOf.toLocaleTimeString()}</span>}
          {err && <span role="status" className="text-xs font-semibold text-rose-600">{err}</span>}
        </form>
      </Reveal>

      <Reveal delay={90}>
        <div className="sketch mt-4 overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b-2 border-[color:var(--line)] bg-[#fffdf5] text-left">
                <tr>
                  <th scope="col" className="p-3.5 font-semibold text-slate-600">#</th>
                  <th scope="col" className="p-3.5 font-semibold text-slate-600">Asset</th>
                  <th scope="col" className="p-3.5 text-right font-semibold text-slate-600">Price (USD)</th>
                  <th scope="col" className="p-3.5 text-right font-semibold text-slate-600">Daily change</th>
                  <th scope="col" className="hidden p-3.5 text-right font-semibold text-slate-600 sm:table-cell">Market size</th>
                  <th scope="col" className="hidden p-3.5 text-right font-semibold text-slate-600 md:table-cell">Trading activity</th>
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => <tr key={i} className="border-b border-[color:var(--line)]"><td colSpan={6} className="p-3"><Skeleton className="h-6 w-full" /></td></tr>)
                  : filtered.map((asset, i) => {
                      const change = asset.price_change_percentage_24h;
                      const positive = (change ?? 0) >= 0;
                      return (
                        <tr key={asset.id} className="row-hover border-b border-[color:var(--line)] last:border-0">
                          <td className="p-3.5 text-slate-500">{i + 1}</td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full border-2 border-[color:var(--line)] bg-[color:var(--accent-3)] text-[.55rem] font-extrabold">{asset.symbol.slice(0, 3).toUpperCase()}</span>
                              <span className="font-semibold">{asset.name}</span>
                              <span className="text-xs uppercase text-slate-500">{asset.symbol}</span>
                            </div>
                          </td>
                          <td className="mono p-3.5 text-right font-semibold"><AnimatedNumber value={asset.current_price} format={fmt} duration={700} /></td>
                          <td className={`mono p-3.5 text-right font-bold ${positive ? "text-teal-700" : "text-rose-600"}`}>
                            {change !== null ? `${positive ? "+" : ""}${change.toFixed(2)}%` : "—"}
                          </td>
                          <td className="mono hidden p-3.5 text-right text-slate-600 sm:table-cell">{big(asset.market_cap)}</td>
                          <td className="mono hidden p-3.5 text-right text-slate-600 md:table-cell">{big(asset.total_volume)}</td>
                        </tr>
                      );
                    })}
                {!loading && filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-500">No matching assets.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>

      <p className="mt-4 text-xs text-slate-500">General information only. Figures may be delayed or revised; they are not financial advice.</p>
    </div>
  );
}

function fmt(value: number) {
  if (value >= 1) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
  return `$${value.toLocaleString(undefined, { maximumSignificantDigits: 4 })}`;
}
function big(value: number) {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${value.toLocaleString()}`;
}

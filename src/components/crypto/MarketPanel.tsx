"use client";
import { useMemo, useState } from "react";
import { AnimatedNumber, Skeleton } from "@/components/Motion";
import { Icon } from "@/components/Icons";
import { CRYPTO_CATEGORY, type CryptoCategory } from "@/lib/catalog";
import { Sparkline } from "./charts";
import { fmtAge, fmtBig, fmtPct, fmtPrice, sourceLabel, type FeedMeta, type MarketAsset } from "./use-crypto";

type SortKey = "rank" | "price" | "change24h" | "change7d" | "marketCap" | "volume24h";

export function MarketPanel({ items, meta, loading, error, notice, vs, onSelect, selected, onRefresh }: { items: MarketAsset[]; meta: FeedMeta; loading: boolean; error: string | null; notice: string | null; vs: string; onSelect: (id: string) => void; selected: string; onRefresh: () => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CryptoCategory | "All">("All");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "rank", dir: 1 });
  const categories = useMemo(() => ["All", ...new Set(Object.values(CRYPTO_CATEGORY))] as Array<CryptoCategory | "All">, []);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((a) => (!q || a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q)) && (category === "All" || CRYPTO_CATEGORY[a.id as keyof typeof CRYPTO_CATEGORY] === category))
      .sort((a, b) => { const av = a[sort.key] ?? (sort.key === "rank" ? 999 : -Infinity), bv = b[sort.key] ?? (sort.key === "rank" ? 999 : -Infinity); return (Number(av) - Number(bv)) * sort.dir; });
  }, [items, query, category, sort]);

  const totals = useMemo(() => {
    const cap = items.reduce((n, a) => n + (a.marketCap ?? 0), 0), vol = items.reduce((n, a) => n + (a.volume24h ?? 0), 0);
    const btc = items.find((a) => a.id === "bitcoin");
    const gainers = items.filter((a) => (a.change24h ?? 0) > 0).length;
    const weighted = cap ? items.reduce((n, a) => n + (a.change24h ?? 0) * (a.marketCap ?? 0), 0) / cap : 0;
    return { cap, vol, dominance: btc && cap ? ((btc.marketCap ?? 0) / cap) * 100 : null, gainers, weighted };
  }, [items]);

  const toggle = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "rank" ? 1 : -1 }));
  const Th = ({ k, children, className = "" }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th scope="col" className={`p-3 font-semibold text-slate-600 ${className}`} aria-sort={sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => toggle(k)} className="inline-flex items-center gap-1 hover:text-[color:var(--ink)]">{children}{sort.key === k && <span aria-hidden>{sort.dir === 1 ? "▲" : "▼"}</span>}</button>
    </th>
  );

  return (
    <section aria-labelledby="market-title">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Tracked market size" value={fmtBig(totals.cap, vs)} hint={`${items.length} assets`} />
        <Stat label="24h trading activity" value={fmtBig(totals.vol, vs)} hint="sum of reported volume" />
        <Stat label="Bitcoin dominance" value={totals.dominance === null ? "—" : `${totals.dominance.toFixed(1)}%`} hint="share of tracked cap" />
        <Stat label="Cap-weighted 24h" value={fmtPct(totals.weighted)} hint={`${totals.gainers} of ${items.length} up`} tone={totals.weighted >= 0 ? "up" : "down"} />
        <Stat label="Feed" value={meta.transport === "sse" ? "Live stream" : meta.transport === "polling" ? "Polling" : "Connecting"} hint={`${sourceLabel(meta.source)} · ${meta.fetchedAt ? fmtAge(Date.now() - meta.fetchedAt) : "…"}`} tone={meta.live ? "up" : "neutral"} />
      </div>

      <form className="mt-5 flex flex-wrap items-center gap-2" onSubmit={(e) => e.preventDefault()} aria-label="Filter digital assets">
        <label className="sr-only" htmlFor="asset-search">Filter by name or symbol</label>
        <input id="asset-search" className="input max-w-[14rem]" placeholder="Filter by name or symbol" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Category">
          {categories.map((c) => <button key={c} type="button" onClick={() => setCategory(c)} className={`chip !py-1 ${category === c ? "!bg-[color:var(--accent-3)]" : ""}`} aria-pressed={category === c}>{c}</button>)}
        </div>
        <button type="button" className="btn btn-ghost ml-auto" onClick={onRefresh}><Icon name="refresh" size={15} /> Refresh now</button>
      </form>

      {(error || notice) && (
        <div role="status" className="mt-3 rounded-xl border-2 border-[color:var(--line)] bg-[#fff6e5] px-4 py-3 text-sm">
          {error && <p className="font-semibold text-rose-700">{error}</p>}
          {notice && <p className="text-slate-700"><strong>Auto-remediation:</strong> {notice}</p>}
          {!meta.live && items.length > 0 && <p className="text-slate-700">Showing {sourceLabel(meta.source).toLowerCase()} while the live providers recover. Figures may be outdated.</p>}
        </div>
      )}

      <div className="sketch mt-4 overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Digital asset market table</caption>
            <thead className="border-b-2 border-[color:var(--line)] bg-[#fffdf5] text-left">
              <tr>
                <Th k="rank">#</Th>
                <th scope="col" className="p-3 font-semibold text-slate-600">Asset</th>
                <Th k="price" className="text-right">Price</Th>
                <Th k="change24h" className="text-right">24h</Th>
                <Th k="change7d" className="hidden text-right sm:table-cell">7d</Th>
                <th scope="col" className="hidden p-3 font-semibold text-slate-600 md:table-cell">7-day trend</th>
                <Th k="marketCap" className="hidden text-right lg:table-cell">Market size</Th>
                <Th k="volume24h" className="hidden text-right lg:table-cell">24h volume</Th>
                <th scope="col" className="p-3"><span className="sr-only">Analyse</span></th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0
                ? Array.from({ length: 8 }).map((_, i) => <tr key={i} className="border-b border-[color:var(--line)]"><td colSpan={9} className="p-3"><Skeleton className="h-7 w-full" /></td></tr>)
                : rows.map((a) => {
                    const up = (a.change24h ?? 0) >= 0;
                    const active = selected === a.id;
                    return (
                      <tr key={a.id} className={`row-hover border-b border-[color:var(--line)] last:border-0 ${active ? "bg-[color:var(--nav-hover)]" : ""}`}>
                        <td className="p-3 text-slate-500">{a.rank ?? "—"}</td>
                        <td className="p-3">
                          <button type="button" onClick={() => onSelect(a.id)} className="flex items-center gap-2.5 text-left">
                            <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full border-2 border-[color:var(--line)] bg-[color:var(--accent-3)] text-[.55rem] font-extrabold">{a.symbol.slice(0, 4).toUpperCase()}</span>
                            <span><span className="block font-semibold leading-tight">{a.name}</span><span className="text-xs uppercase text-slate-500">{a.symbol} · {CRYPTO_CATEGORY[a.id as keyof typeof CRYPTO_CATEGORY] ?? "Asset"}</span></span>
                          </button>
                        </td>
                        <td className="mono p-3 text-right font-semibold"><AnimatedNumber value={a.price} format={(v) => fmtPrice(v, vs)} duration={600} /></td>
                        <td className={`mono p-3 text-right font-bold ${up ? "text-teal-700" : "text-rose-600"}`}>{fmtPct(a.change24h)}</td>
                        <td className={`mono hidden p-3 text-right font-semibold sm:table-cell ${(a.change7d ?? 0) >= 0 ? "text-teal-700" : "text-rose-600"}`}>{fmtPct(a.change7d)}</td>
                        <td className="hidden p-3 md:table-cell"><Sparkline values={a.sparkline7d} positive={(a.change7d ?? a.change24h ?? 0) >= 0} /></td>
                        <td className="mono hidden p-3 text-right text-slate-600 lg:table-cell">{fmtBig(a.marketCap, vs)}</td>
                        <td className="mono hidden p-3 text-right text-slate-600 lg:table-cell">{fmtBig(a.volume24h, vs)}</td>
                        <td className="p-3 text-right"><button type="button" className="btn btn-ghost !px-2.5 !py-1 text-xs" onClick={() => onSelect(a.id)} aria-label={`Analyse ${a.name}`}><Icon name="chart" size={14} /> Analyse</button></td>
                      </tr>
                    );
                  })}
              {!loading && rows.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-slate-500">No matching assets.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Source: {sourceLabel(meta.source)}. Updated automatically every few seconds via {meta.transport === "sse" ? "a server event stream" : "polling"}; the server refreshes upstream data on its own schedule and fails over between providers. Figures may be delayed or revised and are not financial advice.
      </p>
    </section>
  );
}

function Stat({ label, value, hint, tone = "neutral" }: { label: string; value: string; hint?: string; tone?: "up" | "down" | "neutral" }) {
  return (
    <div className="sketch-sm">
      <div className="text-[.62rem] font-extrabold uppercase tracking-[.16em] text-slate-500">{label}</div>
      <div className={`mono mt-1 text-lg font-extrabold ${tone === "up" ? "text-teal-700" : tone === "down" ? "text-rose-600" : ""}`}>{value}</div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

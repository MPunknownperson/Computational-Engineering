"use client";
import { useEffect, useMemo, useState } from "react";
import { Reveal, Segmented } from "@/components/Motion";
import { Icon } from "@/components/Icons";
import { ASSET_META } from "@/lib/crypto/providers";
import { MarketPanel } from "@/components/crypto/MarketPanel";
import { AnalysisPanel } from "@/components/crypto/AnalysisPanel";
import { ToolsPanel } from "@/components/crypto/ToolsPanel";
import { SystemPanel } from "@/components/crypto/SystemPanel";
import { fmtAge, sourceLabel, useMarketFeed, VS_OPTIONS } from "@/components/crypto/use-crypto";

type Tab = "market" | "analysis" | "tools" | "system";
const TABS: Array<{ value: Tab; label: string }> = [{ value: "market", label: "Market" }, { value: "analysis", label: "Analysis" }, { value: "tools", label: "Tools" }, { value: "system", label: "Correlation & engine" }];

/**
 * Bitcoin & crypto prices — a computational tool rather than a price list:
 * live market table (server event stream with polling fallback), on-server
 * analytical engine (indicators, risk metrics, regression, Monte Carlo),
 * exact-arithmetic converter and recurring-purchase simulator, anonymous
 * portfolio tracker and server-evaluated alerts, correlation matrix and a
 * transparent engine-status panel.
 */
export default function CryptoPage() {
  const [vs, setVs] = useState("usd");
  const [tab, setTab] = useState<Tab>("market");
  const [selected, setSelected] = useState("bitcoin");
  const feed = useMarketFeed(vs);
  const names = useMemo(() => Object.fromEntries(Object.entries(ASSET_META).map(([id, m]) => [id, feed.items.find((a) => a.id === id)?.name ?? m.name])), [feed.items]);

  // Restore/persist light UI state (never market data) so a reload lands where the visitor was.
  useEffect(() => {
    try {
      const hash = location.hash.replace("#", "") as Tab;
      if (TABS.some((t) => t.value === hash)) setTab(hash);
      const saved = sessionStorage.getItem("radix-crypto:ui");
      if (saved) { const s = JSON.parse(saved) as { vs?: string; selected?: string }; if (s.vs && VS_OPTIONS.some((o) => o.value === s.vs)) setVs(s.vs); if (s.selected && s.selected in ASSET_META) setSelected(s.selected); }
    } catch { /* corrupt state is simply ignored and overwritten */ }
  }, []);
  useEffect(() => { try { sessionStorage.setItem("radix-crypto:ui", JSON.stringify({ vs, selected })); } catch { /* ignore */ } }, [vs, selected]);
  useEffect(() => { if (typeof history !== "undefined") history.replaceState(null, "", `#${tab}`); }, [tab]);

  const [, force] = useState(0);
  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 5_000); return () => clearInterval(t); }, []);

  return (
    <div className="mx-auto max-w-7xl px-5 py-12">
      <Reveal>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="h-title text-4xl sm:text-5xl">Bitcoin &amp; <span className="h-underline">crypto prices</span></h1>
          <span className={`chip ${feed.meta.live ? "chip-live" : ""}`} aria-live="polite">
            <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${feed.meta.live ? "bg-teal-600" : "bg-amber-500"}`} />
            {feed.meta.live ? "Live" : feed.loading ? "Connecting" : "Degraded"} · {feed.meta.fetchedAt ? fmtAge(Date.now() - feed.meta.fetchedAt) : "…"}
          </span>
        </div>
        <p className="mt-3 max-w-3xl text-slate-600">
          A computational market tool: automatically updated quotes, an on-server analytical engine (moving averages, RSI, MACD, Bollinger bands, volatility, drawdown, Value-at-Risk, regression and seeded Monte Carlo), exact-arithmetic conversion and recurring-purchase simulation, an anonymous portfolio tracker, server-evaluated alerts and a correlation matrix. Every figure states its source and age.
        </p>
      </Reveal>

      <Reveal delay={60}>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Segmented options={TABS} value={tab} onChange={setTab} ariaLabel="Crypto tool sections" />
          <label className="ml-auto flex items-center gap-2 text-sm font-semibold">
            <Icon name="coin" size={16} /> Quote in
            <select className="input !py-1.5" value={vs} onChange={(e) => setVs(e.target.value)} aria-label="Quote currency">
              {VS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        </div>
      </Reveal>

      <div className="mt-6">
        {tab === "market" && <MarketPanel items={feed.items} meta={feed.meta} loading={feed.loading} error={feed.error} notice={feed.notice} vs={vs} selected={selected} onSelect={(id) => { setSelected(id); setTab("analysis"); }} onRefresh={() => void feed.refresh()} />}
        {tab === "analysis" && <AnalysisPanel assetId={selected} vs={vs} onSelect={setSelected} names={names} />}
        {tab === "tools" && <ToolsPanel vs={vs} items={feed.items} names={names} selected={selected} />}
        {tab === "system" && <SystemPanel vs={vs} meta={feed.meta} />}
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Data: {sourceLabel(feed.meta.source)} with automatic failover to a secondary provider, persisted snapshots and a clearly labelled reference seed. General information only; figures may be delayed or revised and are not financial advice.
      </p>
    </div>
  );
}

"use client";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { CRYPTO_IDS } from "@/lib/catalog";
import type { CryptoAlert, CryptoPosition } from "@/lib/store/types";
import { apiFetch, fmtPct, fmtPrice, vsSymbol, type ApiError, type MarketAsset } from "./use-crypto";

type Props = { vs: string; items: MarketAsset[]; names: Record<string, string>; selected: string };

export function ToolsPanel(props: Props) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Converter {...props} />
      <Dca {...props} />
      <Portfolio {...props} />
      <Alerts {...props} />
    </div>
  );
}

function useAsync<T>() {
  const [state, setState] = useState<{ data: T | null; error: string | null; busy: boolean }>({ data: null, error: null, busy: false });
  const run = useCallback(async (task: () => Promise<T>) => {
    setState((s) => ({ ...s, busy: true, error: null }));
    try { const data = await task(); setState({ data, error: null, busy: false }); return data; }
    catch (e) { const err = e as ApiError; setState((s) => ({ ...s, busy: false, error: err.remediation ? `${err.message} · Auto-remediation: ${err.remediation.summary}` : err.message })); return null; }
  }, []);
  return { ...state, run, setData: (data: T | null) => setState((s) => ({ ...s, data })) };
}

/* ------------------------------- Converter ---------------------------- */

type ConvertResult = { result: string; rate: string; inverse: string; quoteValue: string; fromSymbol: string; toSymbol: string; fromPrice: string; toPrice: string; precision: string; quotedAt: number };

function Converter({ vs, names, selected }: Props) {
  const [from, setFrom] = useState(selected);
  const [to, setTo] = useState("fiat");
  const [amount, setAmount] = useState("1");
  const { data, error, busy, run } = useAsync<ConvertResult>();
  useEffect(() => setFrom(selected), [selected]);
  useEffect(() => {
    if (!/^\d*\.?\d+$/.test(amount) || Number(amount) <= 0) return;
    const t = setTimeout(() => void run(() => apiFetch<ConvertResult>(`/api/crypto/compute?op=convert&from=${from}&to=${to}&amount=${amount}&vs=${vs}`, { userAction: "convert" })), 250);
    return () => clearTimeout(t);
  }, [from, to, amount, vs, run]);
  const options = [{ value: "fiat", label: vs.toUpperCase() }, ...CRYPTO_IDS.map((id) => ({ value: id, label: names[id] ?? id }))];
  return (
    <section className="sketch" aria-labelledby="converter-title">
      <h2 id="converter-title" className="flex items-center gap-2 text-xl font-extrabold"><Icon name="swap" size={18} /> Exact converter</h2>
      <p className="mt-1 text-sm text-slate-600">Decimal arithmetic at 40 significant digits on the latest quotes — no binary floating-point rounding.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <label className="block text-sm font-semibold">Amount<input className="input mt-1 w-full" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} aria-describedby="convert-result" /></label>
        <div className="hidden items-end pb-2 sm:flex"><button type="button" className="btn btn-ghost !px-2.5" aria-label="Swap direction" onClick={() => { setFrom(to); setTo(from); }}><Icon name="swap" size={16} /></button></div>
        <label className="block text-sm font-semibold">From<select className="input mt-1 w-full" value={from} onChange={(e) => setFrom(e.target.value)}>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
        <label className="block text-sm font-semibold sm:col-start-3">To<select className="input mt-1 w-full" value={to} onChange={(e) => setTo(e.target.value)}>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
      </div>
      <div id="convert-result" role="status" aria-live="polite" className="mt-4 rounded-xl border-2 border-[color:var(--line)] bg-[#fffdf5] p-4">
        {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : data ? (
          <>
            <p className="mono break-all text-2xl font-extrabold">{trimDecimal(data.result, 12)} <span className="text-base">{data.toSymbol}</span></p>
            <p className="mono mt-1 text-xs text-slate-600">1 {data.fromSymbol} = {trimDecimal(data.rate, 10)} {data.toSymbol} · 1 {data.toSymbol} = {trimDecimal(data.inverse, 10)} {data.fromSymbol}</p>
            <p className="mt-1 text-xs text-slate-500">Quote value {vsSymbol(vs)}{trimDecimal(data.quoteValue, 2)} · {busy ? "updating…" : `quoted ${new Date(data.quotedAt).toLocaleTimeString()}`} · {data.precision}</p>
          </>
        ) : <p className="text-sm text-slate-500">Enter an amount to convert.</p>}
      </div>
    </section>
  );
}

/* ---------------------------------- DCA ------------------------------- */

type DcaResult = { periods: number; invested: string; units: string; averageCost: string; currentValue: string; pnl: string; pnlPct: string; lumpSumValue: string; lumpSumPnlPct: string; bestEntry: string; worstEntry: string; symbol: string; source: string; schedule: Array<{ at: number; price: string; cumulativeInvested: string; value: string }> };

function Dca({ vs, names, selected }: Props) {
  const [id, setId] = useState(selected);
  const [amount, setAmount] = useState("100");
  const [every, setEvery] = useState("7");
  const [days, setDays] = useState("365");
  const { data, error, busy, run } = useAsync<DcaResult>();
  useEffect(() => setId(selected), [selected]);
  const simulate = () => void run(() => apiFetch<DcaResult>(`/api/crypto/compute?op=dca&id=${id}&amount=${amount || "0"}&every=${every}&days=${days}&vs=${vs}`, { userAction: "dca-simulate" }));
  useEffect(() => { simulate(); }, [id, vs]); // eslint-disable-line react-hooks/exhaustive-deps
  const sym = vsSymbol(vs);
  return (
    <section className="sketch" aria-labelledby="dca-title">
      <h2 id="dca-title" className="flex items-center gap-2 text-xl font-extrabold"><Icon name="clock" size={18} /> Recurring-purchase simulator</h2>
      <p className="mt-1 text-sm text-slate-600">Back-tests a fixed-amount schedule against the stored history with exact arithmetic, and compares it to a single lump sum.</p>
      <form className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); simulate(); }}>
        <label className="col-span-2 block text-sm font-semibold">Asset<select className="input mt-1 w-full" value={id} onChange={(e) => setId(e.target.value)}>{CRYPTO_IDS.map((a) => <option key={a} value={a}>{names[a] ?? a}</option>)}</select></label>
        <label className="block text-sm font-semibold">Amount ({vs.toUpperCase()})<input className="input mt-1 w-full" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} /></label>
        <label className="block text-sm font-semibold">Every (days)<input className="input mt-1 w-full" inputMode="numeric" value={every} onChange={(e) => setEvery(e.target.value.replace(/\D/g, "").slice(0, 2))} /></label>
        <label className="block text-sm font-semibold">Window<select className="input mt-1 w-full" value={days} onChange={(e) => setDays(e.target.value)}><option value="90">90 days</option><option value="180">180 days</option><option value="365">1 year</option></select></label>
        <div className="flex items-end"><button type="submit" className="btn w-full" disabled={busy}><Icon name="bolt" size={15} /> {busy ? "Computing…" : "Simulate"}</button></div>
      </form>
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-rose-700">{error}</p>}
      {data && (
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3" role="status">
          <Mini k="Purchases" v={`${data.periods}`} />
          <Mini k="Invested" v={`${sym}${trimDecimal(data.invested, 2)}`} />
          <Mini k="Units held" v={`${trimDecimal(data.units, 8)} ${data.symbol}`} />
          <Mini k="Average cost" v={`${sym}${trimDecimal(data.averageCost, 4)}`} />
          <Mini k="Value today" v={`${sym}${trimDecimal(data.currentValue, 2)}`} />
          <Mini k="Result" v={`${sym}${trimDecimal(data.pnl, 2)} (${fmtPct(Number(data.pnlPct))})`} tone={Number(data.pnl)} />
          <Mini k="Lump sum instead" v={`${sym}${trimDecimal(data.lumpSumValue, 2)} (${fmtPct(Number(data.lumpSumPnlPct))})`} tone={Number(data.lumpSumPnlPct)} />
          <Mini k="Best / worst entry" v={`${sym}${trimDecimal(data.bestEntry, 2)} / ${sym}${trimDecimal(data.worstEntry, 2)}`} />
          <Mini k="History source" v={data.source} />
        </div>
      )}
    </section>
  );
}

/* ------------------------------- Portfolio ---------------------------- */

type PortfolioResponse = { items: Array<CryptoPosition & { price: number | null; change24h: number | null; marketValue: string; cost: string; pnl: string; pnlPct: string; weight: string }>; total: string; totalCost: string; pnl: string; pnlPct: string };

function Portfolio({ vs, names, items }: Props) {
  const [form, setForm] = useState({ assetId: "bitcoin", quantity: "", costBasis: "", note: "" });
  const { data, error, busy, run } = useAsync<PortfolioResponse>();
  const load = useCallback(() => run(() => apiFetch<PortfolioResponse>(`/api/crypto/portfolio?vs=${vs}`, { userAction: "load-portfolio" })), [run, vs]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (data) void load(); }, [items]); // eslint-disable-line react-hooks/exhaustive-deps
  const sym = vsSymbol(vs);
  const spot = items.find((a) => a.id === form.assetId)?.price;
  return (
    <section className="sketch" aria-labelledby="portfolio-title">
      <h2 id="portfolio-title" className="flex items-center gap-2 text-xl font-extrabold"><Icon name="wallet" size={18} /> Portfolio tracker</h2>
      <p className="mt-1 text-sm text-slate-600">Positions are stored under a random browser workspace reference, valued live with exact arithmetic. No account, no identity.</p>
      <form className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5" onSubmit={async (e) => { e.preventDefault(); const ok = await run(async () => { await apiFetch(`/api/crypto/portfolio`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, vs }), userAction: "add-position" }); return apiFetch<PortfolioResponse>(`/api/crypto/portfolio?vs=${vs}`); }); if (ok) setForm((f) => ({ ...f, quantity: "", costBasis: "", note: "" })); }}>
        <label className="col-span-2 block text-sm font-semibold">Asset<select className="input mt-1 w-full" value={form.assetId} onChange={(e) => setForm((f) => ({ ...f, assetId: e.target.value }))}>{CRYPTO_IDS.map((a) => <option key={a} value={a}>{names[a] ?? a}</option>)}</select></label>
        <label className="block text-sm font-semibold">Quantity<input className="input mt-1 w-full" inputMode="decimal" required value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value.replace(/[^\d.]/g, "") }))} /></label>
        <label className="block text-sm font-semibold">Cost / unit<input className="input mt-1 w-full" inputMode="decimal" required placeholder={spot ? spot.toFixed(2) : ""} value={form.costBasis} onChange={(e) => setForm((f) => ({ ...f, costBasis: e.target.value.replace(/[^\d.]/g, "") }))} /></label>
        <div className="flex items-end"><button type="submit" className="btn w-full" disabled={busy}><Icon name="plus" size={15} /> Add</button></div>
      </form>
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-rose-700">{error}</p>}
      {data && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <Mini k="Market value" v={`${sym}${trimDecimal(data.total, 2)}`} />
            <Mini k="Cost" v={`${sym}${trimDecimal(data.totalCost, 2)}`} />
            <Mini k="Unrealised P&L" v={`${sym}${trimDecimal(data.pnl, 2)} (${fmtPct(Number(data.pnlPct))})`} tone={Number(data.pnl)} />
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500"><tr><th className="py-1.5">Asset</th><th className="py-1.5 text-right">Qty</th><th className="py-1.5 text-right">Price</th><th className="py-1.5 text-right">Value</th><th className="py-1.5 text-right">P&L</th><th className="py-1.5 text-right">Weight</th><th /></tr></thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id} className="border-t border-[color:var(--line)]/30">
                    <td className="py-1.5 font-semibold uppercase">{p.symbol}</td>
                    <td className="mono py-1.5 text-right">{trimDecimal(p.quantity, 8)}</td>
                    <td className="mono py-1.5 text-right">{fmtPrice(p.price, vs)}</td>
                    <td className="mono py-1.5 text-right">{sym}{trimDecimal(p.marketValue, 2)}</td>
                    <td className={`mono py-1.5 text-right font-semibold ${Number(p.pnl) >= 0 ? "text-teal-700" : "text-rose-600"}`}>{sym}{trimDecimal(p.pnl, 2)} ({fmtPct(Number(p.pnlPct))})</td>
                    <td className="mono py-1.5 text-right">{Number(p.weight).toFixed(1)}%</td>
                    <td className="py-1.5 text-right"><button type="button" className="btn btn-ghost !px-2 !py-0.5 text-xs" aria-label={`Remove ${p.symbol} position`} onClick={() => void run(async () => { await apiFetch(`/api/crypto/portfolio?id=${p.id}`, { method: "DELETE", userAction: "remove-position" }); return apiFetch<PortfolioResponse>(`/api/crypto/portfolio?vs=${vs}`); })}><Icon name="trash" size={13} /></button></td>
                  </tr>
                ))}
                {data.items.length === 0 && <tr><td colSpan={7} className="py-4 text-center text-slate-500">No positions yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

/* --------------------------------- Alerts ----------------------------- */

function Alerts({ names, items }: Props) {
  const [form, setForm] = useState({ assetId: "bitcoin", condition: "above", threshold: "", note: "" });
  const { data, error, busy, run } = useAsync<{ items: CryptoAlert[] }>();
  const load = useCallback(() => run(() => apiFetch<{ items: CryptoAlert[] }>(`/api/crypto/alerts`, { userAction: "load-alerts" })), [run]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (data) void load(); }, [items]); // eslint-disable-line react-hooks/exhaustive-deps
  const spot = items.find((a) => a.id === form.assetId)?.price;
  const triggered = data?.items.filter((a) => a.status === "triggered") ?? [];
  useEffect(() => {
    if (!triggered.length || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    try { for (const a of triggered.slice(0, 3)) new Notification(`${a.symbol.toUpperCase()} alert`, { body: `${a.condition.replace("_", " ")} ${a.threshold} — now ${a.triggeredPrice ?? ""}`, tag: a.id }); } catch { /* ignore */ }
  }, [triggered.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="sketch" aria-labelledby="alerts-title">
      <h2 id="alerts-title" className="flex items-center gap-2 text-xl font-extrabold"><Icon name="target" size={18} /> Price alerts</h2>
      <p className="mt-1 text-sm text-slate-600">Evaluated on the server on every automated refresh (USD quotes), so they fire even when this tab is closed; the result is shown the next time you look.</p>
      <form className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5" onSubmit={async (e) => { e.preventDefault(); const ok = await run(async () => { await apiFetch(`/api/crypto/alerts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, vs: "usd" }), userAction: "add-alert" }); return apiFetch<{ items: CryptoAlert[] }>(`/api/crypto/alerts`); }); if (ok) setForm((f) => ({ ...f, threshold: "", note: "" })); }}>
        <label className="col-span-2 block text-sm font-semibold">Asset<select className="input mt-1 w-full" value={form.assetId} onChange={(e) => setForm((f) => ({ ...f, assetId: e.target.value }))}>{CRYPTO_IDS.map((a) => <option key={a} value={a}>{names[a] ?? a}</option>)}</select></label>
        <label className="block text-sm font-semibold">Condition<select className="input mt-1 w-full" value={form.condition} onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}><option value="above">Price above</option><option value="below">Price below</option><option value="change_up">24h change ≥ %</option><option value="change_down">24h change ≤ −%</option></select></label>
        <label className="block text-sm font-semibold">Threshold<input className="input mt-1 w-full" inputMode="decimal" required placeholder={form.condition.startsWith("change") ? "5" : spot ? spot.toFixed(2) : ""} value={form.threshold} onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value.replace(/[^\d.]/g, "") }))} /></label>
        <div className="flex items-end"><button type="submit" className="btn w-full" disabled={busy}><Icon name="plus" size={15} /> Arm</button></div>
      </form>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {typeof window !== "undefined" && "Notification" in window && Notification.permission === "default" && <button type="button" className="btn btn-ghost !py-1 text-xs" onClick={() => void Notification.requestPermission()}>Enable browser notifications</button>}
        {triggered.length > 0 && <button type="button" className="btn btn-ghost !py-1 text-xs" onClick={() => void run(async () => { await apiFetch(`/api/crypto/alerts?id=triggered`, { method: "DELETE", userAction: "clear-triggered" }); return apiFetch<{ items: CryptoAlert[] }>(`/api/crypto/alerts`); })}>Clear {triggered.length} triggered</button>}
      </div>
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-rose-700">{error}</p>}
      <ul className="mt-3 space-y-1.5 text-sm" aria-live="polite">
        {data?.items.map((a) => (
          <li key={a.id} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${a.status === "triggered" ? "border-amber-600 bg-amber-50" : "border-[color:var(--line)]/40"}`}>
            <span><span className="font-bold uppercase">{a.symbol}</span> {a.condition.replace("_", " ")} <span className="mono">{a.threshold}{a.condition.startsWith("change") ? "%" : ""}</span>{a.status === "triggered" && <span className="ml-2 chip !py-0 text-[.65rem]">Triggered {a.triggeredAt ? new Date(a.triggeredAt).toLocaleString() : ""} @ {a.triggeredPrice ? trimDecimal(a.triggeredPrice, 4) : ""}</span>}</span>
            <button type="button" className="btn btn-ghost !px-2 !py-0.5 text-xs" aria-label="Remove alert" onClick={() => void run(async () => { await apiFetch(`/api/crypto/alerts?id=${a.id}`, { method: "DELETE", userAction: "remove-alert" }); return apiFetch<{ items: CryptoAlert[] }>(`/api/crypto/alerts`); })}><Icon name="trash" size={13} /></button>
          </li>
        ))}
        {data && data.items.length === 0 && <li className="text-slate-500">No alerts armed.</li>}
      </ul>
    </section>
  );
}

function Mini({ k, v, tone }: { k: string; v: string; tone?: number }) {
  return <div className="rounded-lg border border-[color:var(--line)] bg-[color:var(--paper)] px-2.5 py-1.5"><div className="text-[.6rem] font-extrabold uppercase tracking-[.14em] text-slate-500">{k}</div><div className={`mono break-all font-bold ${tone === undefined ? "" : tone >= 0 ? "text-teal-700" : "text-rose-600"}`}>{v}</div></div>;
}

export function trimDecimal(value: string, maxFraction: number): string {
  if (!value.includes(".")) return Number(value).toLocaleString();
  const [whole, frac] = value.split(".");
  const trimmed = frac.slice(0, maxFraction).replace(/0+$/, "");
  return `${Number(whole).toLocaleString()}${trimmed ? `.${trimmed}` : ""}`;
}

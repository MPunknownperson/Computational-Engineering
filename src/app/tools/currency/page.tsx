"use client";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatedNumber, Reveal, Skeleton, PanelSwap } from "@/components/Motion";
import { ConfirmBar, ConfirmForm, LockedResult, useConfirmGate } from "@/components/Confirm";
import { Icon } from "@/components/Icons";
import { CURRENCIES, CURRENCY_INFO } from "@/lib/catalog";

type Latest = { amount: number; base: string; date: string; rates: Record<string, number> };
type Series = { base: string; start_date: string; end_date: string; series: Record<string, Record<string, number>> };

const POPULAR = ["EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "CNY", "INR", "BRL", "KRW"];
const REGIONS = ["Americas", "Europe", "Asia-Pacific", "Middle East & Africa"] as const;
/** Trend windows offered for the chart. The FX endpoint accepts any date range. */
const PERIODS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "1 year" },
] as const;

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function CurrencyPage() {
  const search = useSearchParams();
  const code = (key: string, fallback: string) => {
    const value = search.get(key)?.toUpperCase();
    return value && (CURRENCIES as readonly string[]).includes(value) ? value : fallback;
  };
  const rawAmount = search.get("amount") ?? "100";
  const amount = rawAmount.length <= 80 && rawAmount.trim() && Number.isFinite(Number(rawAmount)) ? rawAmount : "100";
  return <CurrencyWorkspace key={search.toString()} initial={{ base: code("base", "USD"), target: code("to", "EUR"), amount }} />;
}

function CurrencyWorkspace({ initial }: { initial: { base: string; target: string; amount: string } }) {
  const [base, setBase] = useState(initial.base);
  const [target, setTarget] = useState(initial.target);
  const [amount, setAmount] = useState(initial.amount);
  const [days, setDays] = useState<number>(30);
  const [latest, setLatest] = useState<Latest | null>(null);
  const [series, setSeries] = useState<Series | null>(null);
  const [asOf, setAsOf] = useState<Date | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [latestResponse, seriesResponse] = await Promise.all([
        fetch(`/api/fx?base=${encodeURIComponent(base)}`),
        fetch(`/api/fx?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(target)}&from=${isoDaysAgo(days)}&series=1`),
      ]);
      if (!latestResponse.ok || !seriesResponse.ok) throw new Error("unavailable");
      const [latestPayload, seriesPayload] = await Promise.all([latestResponse.json(), seriesResponse.json()]);
      setLatest(latestPayload);
      setSeries(seriesPayload);
      setAsOf(new Date());
      setErr(null);
    } catch {
      setErr("Currency reference information is temporarily unavailable. Try again later.");
    } finally {
      setLoading(false);
    }
  }, [base, target, days]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const timer = setInterval(refresh, 60_000);
    return () => clearInterval(timer);
  }, [refresh]);

  const rate = latest?.rates?.[target] ?? null;
  const numericAmount = Number(amount);
  const hasAmount = amount.trim().length > 0 && Number.isFinite(numericAmount);
  const canConvert = hasAmount && rate !== null;
  const converted = canConvert ? numericAmount * (rate as number) : null;

  // One upstream call already returns every quoted currency, so the full table
  // costs nothing extra and updates with the same refresh cycle.
  const tableRows = useMemo(() => {
    const rates = latest?.rates;
    if (!rates) return [];
    return CURRENCIES
      .filter((code) => code !== base && typeof rates[code] === "number")
      .map((code) => ({ code, name: CURRENCY_INFO[code as keyof typeof CURRENCY_INFO].name, region: CURRENCY_INFO[code as keyof typeof CURRENCY_INFO].region, rate: rates[code] as number }));
  }, [latest, base]);

  const chartPoints = useMemo(
    () => series?.series
      ? Object.entries(series.series).map(([, row]) => row[target] ?? null).filter((value): value is number => value !== null)
      : [],
    [series, target],
  );

  // Direction of the chosen pair over the selected window, for a plain-language read.
  const trend = useMemo(() => {
    if (chartPoints.length < 2) return null;
    const first = chartPoints[0], last = chartPoints[chartPoints.length - 1];
    const change = ((last - first) / first) * 100;
    return { first, last, change, direction: change > 0.05 ? "risen" : change < -0.05 ? "fallen" : "held steady" };
  }, [chartPoints]);

  const gate = useConfirmGate(`${base}|${target}|${amount}`, canConvert);
  const state = !hasAmount ? "needs-input" : !rate ? "invalid" : gate.revealed ? "revealed" : "awaiting";

  function selectTarget(code: string) {
    setTarget(code);
    gate.reset();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-12">
      <Reveal>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="h-title text-4xl sm:text-5xl">Currency converter <span className="h-underline">&amp; exchange rates</span></h1>
          <span className="chip">Reference information</span>
        </div>
        <p className="mt-3 max-w-2xl text-slate-600">
          Enter an amount and choose two currencies, then press <strong>Convert</strong>. The same request quotes your
          amount against every other listed currency, and the trend covers the period you choose. Reference values
          refresh in the background; results appear only when you confirm. These figures are not offers to exchange currency.
        </p>
      </Reveal>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <div className="sketch min-w-0">
            <ConfirmForm onSubmit={gate.confirm} label="Currency conversion">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label htmlFor="currency-amount" className="mb-1.5 block text-sm font-semibold text-slate-700">Amount</label>
                  <input id="currency-amount" className="input mono !text-xl !font-bold" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
                </div>
                <div>
                  <label htmlFor="currency-from" className="mb-1.5 block text-sm font-semibold text-slate-700">From</label>
                  <select id="currency-from" className="select" value={base} onChange={(e) => { setBase(e.target.value); gate.reset(); }}>
                    {REGIONS.map((region) => (
                      <optgroup key={region} label={region}>
                        {CURRENCIES.filter((code) => CURRENCY_INFO[code].region === region).map((code) => <option key={code} value={code}>{code} — {CURRENCY_INFO[code].name}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="currency-to" className="mb-1.5 block text-sm font-semibold text-slate-700">To</label>
                  <select id="currency-to" className="select" value={target} onChange={(e) => selectTarget(e.target.value)}>
                    {REGIONS.map((region) => (
                      <optgroup key={region} label={region}>
                        {CURRENCIES.filter((code) => CURRENCY_INFO[code].region === region).map((code) => <option key={code} value={code}>{code} — {CURRENCY_INFO[code].name}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div
                id="currency-result"
                role="status"
                aria-live="polite"
                className={`result-panel mt-6 ${gate.revealed ? "is-revealed" : "is-locked"}`}
              >
                <div className="text-[.62rem] font-bold uppercase tracking-[.16em] text-slate-500">Converted amount</div>
                <div className="mono mt-1.5 min-h-[2.4rem] text-3xl font-extrabold sm:text-4xl">
                  {gate.revealed && converted !== null ? (
                    <>
                      <AnimatedNumber value={converted} format={(n) => n.toLocaleString(undefined, { maximumFractionDigits: 4 })} />
                      <span className="ml-2 text-xl text-slate-500">{target}</span>
                    </>
                  ) : (
                    <LockedResult label="Converted amount hidden until you press Convert." />
                  )}
                </div>
                {gate.revealed && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
                    <span>1 {base} = <span className="mono font-bold text-[color:var(--ink)]">{rate ? rate.toFixed(4) : "—"}</span> {target}</span>
                    <span className="text-slate-500">· 1 {target} = <span className="mono font-bold">{rate ? (1 / rate).toFixed(4) : "—"}</span> {base}</span>
                    {latest?.date && <span className="text-slate-500">· reference date {latest.date}</span>}
                    {asOf && <span className="text-slate-500">· values received {asOf.toLocaleTimeString()}</span>}
                  </div>
                )}
              </div>

              <ConfirmBar
                id="currency-confirm"
                action="Convert"
                state={state}
                onConfirm={gate.confirm}
                onReset={gate.reset}
                hint="Enter an amount, then press Convert."
                errorText={err ?? "Waiting for reference values. They refresh automatically."}
                readyText={loading ? "Fetching reference values — the button becomes available shortly." : "Values ready — press Convert to show the result."}
              />
            </ConfirmForm>

            <div className="mt-7 min-w-0">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-700">Recent trend · {base} → {target}</h2>
                <fieldset className="flex flex-wrap items-center gap-1.5">
                  <legend className="sr-only">Trend period</legend>
                  {PERIODS.map((period) => (
                    <button
                      key={period.days}
                      type="button"
                      className={`chip !py-1 !text-[.68rem] ${days === period.days ? "!bg-[color:var(--accent-3)]" : ""}`}
                      aria-pressed={days === period.days}
                      onClick={() => setDays(period.days)}
                    >
                      {period.label}
                    </button>
                  ))}
                </fieldset>
              </div>
              {gate.revealed
                ? (chartPoints.length > 1
                    ? <PanelSwap trigger={`${base}-${target}-${days}`}>
                        <Sparkline points={chartPoints} />
                        {trend && (
                          <p className="mt-1.5 text-xs text-slate-600">
                            Over the last {PERIODS.find((period) => period.days === days)?.label.toLowerCase()} the rate has{" "}
                            <strong>{trend.direction}</strong> from {trend.first.toFixed(4)} to {trend.last.toFixed(4)}{" "}
                            ({trend.change >= 0 ? "+" : ""}{trend.change.toFixed(2)}%). History is context, not a prediction.
                          </p>
                        )}
                      </PanelSwap>
                    : <p className="text-sm text-slate-500">No historical values are available for this pair.</p>)
                : <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-[color:var(--line)] text-sm text-slate-500">
                    <Icon name="chart" size={16} className="mr-2" /> The trend appears after you press Convert.
                  </div>}
            </div>

            <details className="mt-6 min-w-0 rounded-xl border-2 border-[color:var(--line)] bg-white">
              <summary className="cursor-pointer px-4 py-3 text-sm font-extrabold">
                Your amount in all {CURRENCIES.length - 1} other currencies
              </summary>
              <div className="max-h-80 overflow-auto border-t-2 border-[color:var(--line)]" tabIndex={0} role="region" aria-label={`Your amount converted to every listed currency`}>
                <table className="w-full text-sm">
                  <caption className="sr-only">{`${hasAmount ? amount : "One"} ${base} converted to each listed currency`}</caption>
                  <thead className="sticky top-0 bg-[#fffdf5]">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left font-bold">Currency</th>
                      <th scope="col" className="px-4 py-2 text-right font-bold">Rate per {base}</th>
                      <th scope="col" className="px-4 py-2 text-right font-bold">Converted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row) => (
                      <tr key={row.code} className={`border-t border-[color:var(--line)] ${row.code === target ? "bg-[color:var(--accent-3)]/[0.18]" : "odd:bg-white even:bg-[#fffdf5]"}`}>
                        <th scope="row" className="px-4 py-2 text-left font-semibold">
                          <button type="button" className="underline-offset-2 hover:underline" onClick={() => selectTarget(row.code)}>
                            {row.code} <span className="font-normal text-slate-500">· {row.name}</span>
                          </button>
                        </th>
                        <td className="mono px-4 py-2 text-right">{row.rate.toFixed(4)}</td>
                        <td className="mono px-4 py-2 text-right">{hasAmount ? (numericAmount * row.rate).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}</td>
                      </tr>
                    ))}
                    {tableRows.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-500">No reference values available yet.</td></tr>}
                  </tbody>
                </table>
              </div>
              <p className="px-4 py-2.5 text-xs text-slate-500">Click a currency to make it the conversion target. Values share the reference date shown above.</p>
            </details>
            <p className="mt-4 text-xs text-slate-500">Reference values may differ from rates available in an actual transaction.</p>
          </div>
        </Reveal>

        <Reveal delay={70}>
          <div className="sketch min-w-0">
            <h2 className="font-bold tracking-tight">Other values from {base}</h2>
            <p className="mt-1 text-xs text-slate-500">Choose one to set it as the target currency.</p>
            {loading ? (
              <div className="mt-4 space-y-2.5">{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (
              <ul className="mt-3 space-y-1">
                {POPULAR.filter((code) => code !== base).map((code) => (
                  <li key={code}>
                    <button
                      type="button"
                      className={`row-hover flex min-h-11 w-full items-center justify-between rounded-xl px-2.5 py-2 text-left ${code === target ? "!bg-[color:var(--accent)]/[0.08] ring-2 ring-[color:var(--accent)]/30" : ""}`}
                      onClick={() => selectTarget(code)}
                      aria-pressed={code === target}
                    >
                      <span className={`font-bold ${code === target ? "text-[color:var(--accent)]" : ""}`}>
                        {code} <span className="text-[.68rem] font-normal text-slate-500">{CURRENCY_INFO[code as keyof typeof CURRENCY_INFO].name}</span>
                      </span>
                      <span className="mono text-sm font-semibold">{latest?.rates?.[code]?.toFixed(4) ?? "—"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {err && <p className="mt-3 text-xs font-semibold text-rose-600">{err}</p>}
          </div>
        </Reveal>
      </div>
    </div>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const w = 620, h = 156, pad = 14;
  const min = Math.min(...points), max = Math.max(...points);
  const dx = (w - pad * 2) / (points.length - 1);
  const y = (value: number) => h - pad - ((value - min) / (max - min || 1)) * (h - pad * 2);
  const line = points.map((value, i) => `${i === 0 ? "M" : "L"}${pad + i * dx},${y(value)}`).join(" ");
  const area = `${line} L${pad + (points.length - 1) * dx},${h - pad} L${pad},${h - pad} Z`;
  const first = points[0], last = points[points.length - 1];
  const direction = last > first ? "rising" : last < first ? "falling" : "unchanged";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full" role="img" aria-label={`Recent currency trend ${direction}, from ${first.toFixed(4)} to ${last.toFixed(4)}.`}>
      <defs>
        <linearGradient id="currencyArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#ff6b4a" stopOpacity=".25" /><stop offset="100%" stopColor="#ff6b4a" stopOpacity="0" /></linearGradient>
        <linearGradient id="currencyLine" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stopColor="#ff6b4a" /><stop offset="100%" stopColor="#5b8cff" /></linearGradient>
      </defs>
      <path d={area} fill="url(#currencyArea)" />
      <path d={line} fill="none" stroke="url(#currencyLine)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

"use client";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Reveal, Skeleton, PanelSwap, AnimatedNumber } from "@/components/Motion";
import { ConfirmBar, ConfirmForm, LockedResult, useConfirmGate } from "@/components/Confirm";
import { COUNTRIES, INDICATORS, INDICATOR_GROUPS } from "@/lib/catalog";

type Point = { year: string; value: number };
type EconomyData = {
  country: string;
  indicator: string;
  latest: { year: string; value: number } | null;
  series: Point[];
};
type CompareResult = { country: string; latest: { year: string; value: number } | null; series: Point[] };
type CompareData = { compare: true; countries: string[]; indicator: string; results: CompareResult[] };

const MAX_COMPARE = 6;

export default function EconomyPage() {
  const search = useSearchParams();
  const requestedCountry = search.get("country")?.toUpperCase();
  const requestedIndicator = search.get("indicator");
  const initialCountry = requestedCountry && COUNTRIES.some((item) => item.value === requestedCountry) ? requestedCountry : "USA";
  const initialIndicator = requestedIndicator && INDICATORS.some((item) => item.value === requestedIndicator) ? requestedIndicator : "inflation";
  return <EconomyWorkspace key={search.toString()} initialCountry={initialCountry} initialIndicator={initialIndicator} />;
}

function EconomyWorkspace({ initialCountry, initialIndicator }: { initialCountry: string; initialIndicator: string }) {
  // "single" reads one economy in depth; "compare" puts several side by side;
  // "ranking" lists every covered economy for one measure, latest year first.
  const [mode, setMode] = useState<"single" | "compare" | "ranking">("single");
  const [country, setCountry] = useState(initialCountry);
  const [indicator, setIndicator] = useState(initialIndicator);
  const [picks, setPicks] = useState<string[]>(() => [initialCountry, "DEU", "JPN"].filter((iso) => COUNTRIES.some((c) => c.value === iso)));
  const [responseState, setResponseState] = useState<{
    query: string;
    payload: EconomyData | CompareData | null;
    error: string | null;
    fetchedAt: Date | null;
  }>({ query: "", payload: null, error: null, fetchedAt: null });

  const query = useMemo(() => {
    if (mode === "compare") return `country=${encodeURIComponent(picks.join(","))}&indicator=${encodeURIComponent(indicator)}`;
    if (mode === "ranking") return `country=${encodeURIComponent(COUNTRIES.map((c) => c.value).join(","))}&indicator=${encodeURIComponent(indicator)}`;
    return `country=${encodeURIComponent(country)}&indicator=${encodeURIComponent(indicator)}`;
  }, [mode, picks, country, indicator]);

  // Readiness belongs to this exact query, not the last completed request.
  // Switching modes therefore disables Show synchronously on the next render.
  const matchingResponse = responseState.query === query;
  const loading = !matchingResponse;
  const error = matchingResponse ? responseState.error : null;
  const asOf = matchingResponse ? responseState.fetchedAt : null;
  const loaded = matchingResponse ? responseState.payload : null;
  const data = loaded && "country" in loaded ? loaded : null;
  const compare = loaded && "compare" in loaded ? loaded : null;

  useEffect(() => {
    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]);
    const load = async () => {
      try {
        const response = await fetch(`/api/economy?${query}`, { signal });
        if (!response.ok) throw new Error("unavailable");
        const payload = await response.json() as EconomyData | CompareData;
        if (controller.signal.aborted) return;
        setResponseState({ query, payload, error: null, fetchedAt: new Date() });
      } catch {
        if (!controller.signal.aborted) {
          setResponseState({ query, payload: null, error: "This economic information is temporarily unavailable.", fetchedAt: null });
        }
      }
    };
    void load();
    return () => controller.abort();
  }, [query]);

  const countryName = useCallback(
    (iso: string) => COUNTRIES.find((item) => item.value === iso)?.label ?? iso,
    [],
  );
  const indicatorName = INDICATORS.find((item) => item.value === indicator)?.label ?? indicator;
  const indicatorUnit = INDICATORS.find((item) => item.value === indicator)?.unit ?? "";

  // Ranking is derived from one comparison request across every covered economy.
  const ranking = useMemo(() => {
    if (mode !== "ranking" || !compare) return [];
    return compare.results
      .filter((result) => result.latest !== null)
      .map((result) => ({ country: result.country, name: countryName(result.country), ...result.latest! }))
      .sort((a, b) => b.value - a.value);
  }, [mode, compare, countryName]);

  // Each mode has its own payload (`data` for one economy, `compare` for a
  // comparison or a ranking), and its own gate signature so confirming one
  // view never reveals another.
  const payload = mode === "single" ? data : compare;
  const signature =
    mode === "compare"
      ? `compare|${picks.slice().sort().join(",")}|${indicator}`
      : mode === "ranking"
        ? `ranking|${indicator}`
        : `${country}|${indicator}`;
  const gate = useConfirmGate(signature, !loading && !error && payload !== null);
  const state = error || loading ? "invalid" : gate.needsInput ? "needs-input" : gate.revealed ? "revealed" : "awaiting";

  function togglePick(iso: string) {
    setPicks((current) => {
      if (current.includes(iso)) return current.filter((value) => value !== iso).length ? current.filter((value) => value !== iso) : current;
      if (current.length >= MAX_COMPARE) return current;
      return [...current, iso];
    });
    gate.reset();
  }

  const revealKey = mode === "compare" ? `c-${picks.join("-")}-${indicator}` : mode === "ranking" ? `r-${indicator}` : `${country}-${indicator}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-12">
      <Reveal>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="h-title text-4xl sm:text-5xl">Economic indicators: <span className="h-underline">inflation, GDP &amp; population</span></h1>
          <span className="chip">Public reference information</span>
        </div>
        <p className="mt-3 max-w-2xl text-slate-600">
          {INDICATORS.length} World Bank measures across {COUNTRIES.length} economies. Read one economy in depth, compare
          up to {MAX_COMPARE} side by side, or rank every covered economy for a single measure. Figures appear only when
          you press <strong>Show</strong>; many are periodic, refer to earlier years and can be revised.
        </p>
      </Reveal>

      <Reveal delay={50}>
        <div className="mt-7 flex flex-wrap gap-1.5" role="tablist" aria-label="Economic data view">
          {([["single", "Single economy"], ["compare", `Compare ${MAX_COMPARE}`], ["ranking", "Rank all economies"]] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              className={`chip !min-h-9 !px-3 ${mode === value ? "!bg-[color:var(--accent-3)]" : ""}`}
              onClick={() => { setMode(value); gate.reset(); }}
            >
              {label}
            </button>
          ))}
        </div>
      </Reveal>

      <Reveal delay={60}>
        <div className="sketch mt-6 min-w-0">
          <ConfirmForm onSubmit={gate.confirm} label="Economic indicator selection">
            <div className={mode === "single" ? "grid gap-5 md:grid-cols-2" : "space-y-5"}>
              {mode !== "ranking" && (
                <div>
                  <label htmlFor="economy-measure" className="mb-2 block text-sm font-semibold text-slate-700">Measure</label>
                  <select id="economy-measure" className="select" value={indicator} onChange={(e) => { setIndicator(e.target.value); gate.reset(); }}>
                    {INDICATOR_GROUPS.map((group) => (
                      <optgroup key={group} label={group}>
                        {INDICATORS.filter((item) => item.group === group).map((item) => <option key={item.value} value={item.value}>{item.label} — {item.name}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <div className="mt-2.5 text-xs text-slate-500">{asOf && <span>Retrieved {asOf.toLocaleTimeString()}</span>}</div>
                </div>
              )}

              {mode === "single" && (
                <div>
                  <label htmlFor="economy-country" className="mb-2 block text-sm font-semibold text-slate-700">Economy</label>
                  <select id="economy-country" className="select" value={country} onChange={(e) => { setCountry(e.target.value); gate.reset(); }}>
                    {COUNTRIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </div>
              )}

              {mode === "compare" && (
                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-700">Economies to compare</span>
                    <span className="chip !py-0.5 !text-[.66rem]">{picks.length} of {MAX_COMPARE} chosen</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {COUNTRIES.map((item) => {
                      const active = picks.includes(item.value);
                      return (
                        <button
                          key={item.value}
                          type="button"
                          className={`chip !py-1 !text-[.68rem] ${active ? "!bg-[color:var(--accent-3)]" : ""}`}
                          aria-pressed={active}
                          disabled={!active && picks.length >= MAX_COMPARE}
                          onClick={() => togglePick(item.value)}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Pick up to {MAX_COMPARE}. Publication lag differs, so each economy is shown with its own latest year.</p>
                </div>
              )}

              {mode === "ranking" && (
                <div>
                  <label htmlFor="economy-measure" className="mb-2 block text-sm font-semibold text-slate-700">Measure</label>
                  <select id="economy-measure" className="select" value={indicator} onChange={(e) => { setIndicator(e.target.value); gate.reset(); }}>
                    {INDICATOR_GROUPS.map((group) => (
                      <optgroup key={group} label={group}>
                        {INDICATORS.filter((item) => item.group === group).map((item) => <option key={item.value} value={item.value}>{item.label} — {item.name}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-500">Ranks the {COUNTRIES.length} economies this site covers by their most recent published value. A higher rank is not better or worse — read the measure itself.</p>
                </div>
              )}
            </div>

            <ConfirmBar
              id="economy-confirm"
              action="Show"
              state={state}
              onConfirm={gate.confirm}
              onReset={gate.reset}
              readyText={loading ? "Retrieving the figures — the button becomes available shortly." : "Figures ready — press Show."}
              errorText={error ?? "Retrieving figures for this selection…"}
              shownText={mode === "compare" ? `${picks.length} economies · ${indicatorName} shown.` : mode === "ranking" ? `${indicatorName} ranking shown.` : `${countryName(country)} · ${indicatorName} shown.`}
            />
          </ConfirmForm>

          {gate.revealed && (
            <PanelSwap trigger={revealKey} className="mt-7 min-w-0">
              {mode === "compare" && <CompareView data={compare} indicator={indicator} nameOf={countryName} />}
              {mode === "ranking" && <RankingView rows={ranking} indicator={indicator} />}
              {mode === "single" && <SingleView data={data} countryName={countryName(country)} indicator={indicator} indicatorName={indicatorName} />}
            </PanelSwap>
          )}

          {!gate.revealed && !loading && (
            <div className="result-panel is-locked mt-7 flex min-h-[7rem] flex-wrap items-center justify-center gap-3 text-sm text-slate-500">
              <LockedResult label="Figures hidden until you press Show." />
              <span>
                {mode === "compare" ? `${picks.length} economies · ${indicatorName}` : mode === "ranking" ? indicatorName : `${countryName(country)} · ${indicatorName}`} appear after you press Show.
              </span>
            </div>
          )}
          {loading && <Skeleton className="mt-7 h-44 w-full" />}
          {mode !== "ranking" && (
            <p className="mt-4 text-xs text-slate-500">
              Source: World Bank {INDICATORS.find((item) => item.value === indicator)?.code} · {indicatorUnit ? `measured in ${indicatorUnit}` : "as published"}.
            </p>
          )}
        </div>
      </Reveal>
    </div>
  );
}

function SingleView({ data, countryName, indicator, indicatorName }: {
  data: EconomyData | null; countryName: string; indicator: string; indicatorName: string;
}) {
  return (
    <>
      <div className="grid gap-5 md:grid-cols-3">
        <div className="h-full result-panel is-revealed" role="status" aria-live="polite">
          <div className="text-[.62rem] font-bold uppercase tracking-[.16em] text-slate-500">Most recent available value</div>
          <div className="mono mt-1.5 text-3xl font-extrabold">
            {data?.latest ? <AnimatedNumber value={data.latest.value} format={(n) => fmt(n, indicator)} duration={700} /> : "—"}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {data?.latest ? `${countryName} · reported year ${data.latest.year}` : "No figure available"}
          </div>
          {data?.series && data.series.length > 1 && (
            <div className="mt-3 border-t border-dashed border-slate-200 pt-2 text-xs text-slate-600">
              {changeLine(data.series)}
            </div>
          )}
        </div>
        <div className="md:col-span-2 min-w-0">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Historical values</h2>
          <BarChart points={data?.series ?? []} />
        </div>
      </div>

      <details className="mt-4 rounded-xl border-2 border-[color:var(--line)] bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-extrabold">Values as a table</summary>
        <div className="max-h-72 overflow-auto border-t-2 border-[color:var(--line)]" tabIndex={0} role="region" aria-label="Historical values table">
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
    </>
  );
}

function CompareView({ data, indicator, nameOf }: { data: CompareData | null; indicator: string; nameOf: (iso: string) => string }) {
  const rows = (data?.results ?? []).slice().sort((a, b) => (b.latest?.value ?? -Infinity) - (a.latest?.value ?? -Infinity));
  const oldestYear = rows.length ? Math.min(...rows.map((row) => Number(row.latest?.year ?? 9999))) : null;
  const newestYear = rows.length ? Math.max(...rows.map((row) => Number(row.latest?.year ?? 0))) : null;
  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>{rows.length} economies · {INDICATORS.find((item) => item.value === indicator)?.name}</span>
        {oldestYear && newestYear && oldestYear !== newestYear && (
          <span>· latest years range from {oldestYear} to {newestYear}, so this is indicative rather than like-for-like</span>
        )}
      </div>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Economy comparison table">
        <table className="w-full min-w-[520px] text-sm">
          <caption className="sr-only">{`${INDICATORS.find((item) => item.value === indicator)?.name} for the selected economies`}</caption>
          <thead className="bg-[#fffdf5]">
            <tr>
              <th scope="col" className="border-b-2 border-[color:var(--line)] px-4 py-2 text-left font-bold">Economy</th>
              <th scope="col" className="border-b-2 border-[color:var(--line)] px-4 py-2 text-right font-bold">Latest value</th>
              <th scope="col" className="border-b-2 border-[color:var(--line)] px-4 py-2 text-right font-bold">Reported year</th>
              <th scope="col" className="border-b-2 border-[color:var(--line)] px-4 py-2 text-right font-bold">Change vs prior year</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const prior = row.series.at(-2);
              const change = prior && row.latest ? ((row.latest.value - prior.value) / Math.abs(prior.value)) * 100 : null;
              return (
                <tr key={row.country} className="border-t border-[color:var(--line)] odd:bg-white even:bg-[#fffdf5]">
                  <th scope="row" className="px-4 py-2.5 text-left font-semibold">{nameOf(row.country)}</th>
                  <td className="mono px-4 py-2.5 text-right font-bold">{row.latest ? fmt(row.latest.value, indicator) : "—"}</td>
                  <td className="mono px-4 py-2.5 text-right text-slate-600">{row.latest?.year ?? "—"}</td>
                  <td className={`mono px-4 py-2.5 text-right ${change === null ? "text-slate-500" : change >= 0 ? "text-[#146c3a]" : "text-rose-700"}`}>
                    {change === null ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">No values available for this selection.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Percentages are the change from each economy&apos;s own prior published year. Levels are not adjusted for
        population, prices or exchange rates.
      </p>
    </div>
  );
}

function RankingView({ rows, indicator }: { rows: Array<{ country: string; name: string; year: string; value: number }>; indicator: string }) {
  if (!rows.length) return <p className="text-sm text-slate-500">No values are available for this measure.</p>;
  const values = rows.map((row) => row.value);
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  return (
    <div className="min-w-0">
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={`${INDICATORS.find((item) => item.value === indicator)?.name} ranking`}>
        <table className="w-full min-w-[520px] text-sm">
          <caption className="sr-only">{`${INDICATORS.find((item) => item.value === indicator)?.name} for every covered economy, highest first`}</caption>
          <thead className="bg-[#fffdf5]">
            <tr>
              <th scope="col" className="border-b-2 border-[color:var(--line)] px-3 py-2 text-left font-bold">Rank</th>
              <th scope="col" className="border-b-2 border-[color:var(--line)] px-3 py-2 text-left font-bold">Economy</th>
              <th scope="col" className="border-b-2 border-[color:var(--line)] px-3 py-2 text-right font-bold">Value</th>
              <th scope="col" className="border-b-2 border-[color:var(--line)] px-3 py-2 text-right font-bold">Year</th>
              <th scope="col" className="border-b-2 border-[color:var(--line)] px-3 py-2 text-left font-bold">Relative position</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const width = Math.max(2, ((row.value - min) / span) * 100);
              return (
                <tr key={row.country} className="border-t border-[color:var(--line)] odd:bg-white even:bg-[#fffdf5]">
                  <th scope="row" className="mono px-3 py-2 text-left font-bold">{index + 1}</th>
                  <td className="px-3 py-2 font-semibold">{row.name}</td>
                  <td className="mono px-3 py-2 text-right font-bold">{fmt(row.value, indicator)}</td>
                  <td className="mono px-3 py-2 text-right text-slate-600">{row.year}</td>
                  <td className="px-3 py-2">
                    <div className="h-2 w-full min-w-[80px] overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${width}%` }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Bars show each economy&apos;s position between the lowest and highest value in this list. Economies are listed
        with their own latest published year, which can differ.
      </p>
    </div>
  );
}

function changeLine(series: Point[]): string {
  if (series.length < 2) return "";
  const last = series[series.length - 1], prior = series[series.length - 2];
  if (!prior.value) return "";
  const change = ((last.value - prior.value) / Math.abs(prior.value)) * 100;
  return `Compared with ${prior.year}, this is ${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(2)}%.`;
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

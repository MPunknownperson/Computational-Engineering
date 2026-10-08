import { NextResponse } from "next/server";
import { COUNTRIES, INDICATORS, TIMING } from "@/lib/catalog";

// Must be a literal; keep equal to TIMING.economyCacheSeconds.
export const revalidate = 3600;

// World Bank v2 indicator endpoint. It accepts a semicolon-separated country
// list, which is what makes side-by-side comparison a single upstream request
// rather than one request per economy.
const INDICATOR_CODES: Record<string, string> = Object.fromEntries(
  INDICATORS.map((i) => [i.value, i.code]),
);

/** Hard ceiling for one upstream request; the compare UI offers up to 6. */
const MAX_COUNTRIES = 40;
const FROM_YEAR = new Date().getUTCFullYear() - TIMING.economyYears;
const DATE_RANGE = `${FROM_YEAR}:${new Date().getUTCFullYear()}`;

type Row = { date: string; value: number | null; countryiso3code?: string };

/** `country` accepts one ISO3 code, or several separated by commas for comparison. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const indicatorKey = searchParams.get("indicator") || "inflation";
  const code = INDICATOR_CODES[indicatorKey];
  if (!code) return NextResponse.json({ error: "unknown indicator" }, { status: 400 });

  const requested = (searchParams.get("country") || "USA")
    .toUpperCase()
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const known = COUNTRIES.map((country) => country.value);
  const countries = Array.from(new Set(requested.filter((value) => known.includes(value)))).slice(0, MAX_COUNTRIES);
  if (!countries.length) return NextResponse.json({ error: "unsupported country" }, { status: 400 });
  const compare = countries.length > 1;

  try {
    const url = `https://api.worldbank.org/v2/country/${encodeURIComponent(countries.join(";"))}/indicator/${code}?format=json&per_page=${Math.min(1000, countries.length * 40)}&date=${DATE_RANGE}`;
    const res = await fetch(url, { next: { revalidate: TIMING.economyCacheSeconds } });
    if (!res.ok) throw new Error(`worldbank ${res.status}`);
    const payload = await res.json();
    // WB returns [metadata, data]
    const rows: Row[] = Array.isArray(payload) ? payload[1] || [] : [];

    // Group by economy so each comparison series keeps its own latest value and
    // its own year alignment (publication lag differs between economies).
    const grouped = new Map<string, Row[]>();
    for (const row of rows) {
      if (row.value === null) continue;
      const key = row.countryiso3code || countries[0];
      const list = grouped.get(key);
      if (list) list.push(row);
      else grouped.set(key, [row]);
    }

    if (!compare) {
      const series = (grouped.get(countries[0]) ?? [])
        .slice()
        .sort((a, b) => Number(a.date) - Number(b.date))
        .map((row) => ({ year: row.date, value: row.value as number }));
      const latest = series.at(-1) ?? null;
      return NextResponse.json({
        country: countries[0],
        indicator: indicatorKey,
        indicatorCode: code,
        latest,
        series,
      });
    }

    const results = countries.map((iso) => {
      const series = (grouped.get(iso) ?? [])
        .slice()
        .sort((a, b) => Number(a.date) - Number(b.date))
        .map((row) => ({ year: row.date, value: row.value as number }));
      return { country: iso, latest: series.at(-1) ?? null, series };
    });

    return NextResponse.json({
      compare: true,
      countries,
      indicator: indicatorKey,
      indicatorCode: code,
      results,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "upstream";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

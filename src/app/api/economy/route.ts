import { NextResponse } from "next/server";
import { COUNTRIES, INDICATORS, TIMING } from "@/lib/catalog";

// Must be a literal; keep equal to TIMING.economyCacheSeconds.
export const revalidate = 3600;

// World Bank v2 indicator endpoint.
// We fetch the last ~10 years and return the latest non-null value.
const INDICATOR_CODES: Record<string, string> = Object.fromEntries(
  INDICATORS.map((i) => [i.value, i.code]),
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const country = (searchParams.get("country") || "USA").toUpperCase();
  const indicatorKey = searchParams.get("indicator") || "inflation";
  const code = INDICATOR_CODES[indicatorKey];
  if (!code) return NextResponse.json({ error: "unknown indicator" }, { status: 400 });
  if (!COUNTRIES.some((c) => c.value === country)) {
    return NextResponse.json({ error: "unsupported country" }, { status: 400 });
  }

  try {
    const url = `https://api.worldbank.org/v2/country/${encodeURIComponent(country)}/indicator/${code}?format=json&per_page=40&date=${new Date().getUTCFullYear() - TIMING.economyYears}:${new Date().getUTCFullYear()}`;
    const res = await fetch(url, { next: { revalidate: TIMING.economyCacheSeconds } });
    if (!res.ok) throw new Error(`worldbank ${res.status}`);
    const payload = await res.json();
    // WB returns [metadata, data]
    const data: Array<{ date: string; value: number | null; countryiso3code?: string }> =
      Array.isArray(payload) ? payload[1] || [] : [];
    const latest = data.find((d) => d.value !== null);
    return NextResponse.json({
      country,
      indicator: indicatorKey,
      indicatorCode: code,
      latest: latest
        ? { year: latest.date, value: latest.value }
        : null,
      series: data
        .filter((d) => d.value !== null)
        .slice()
        .reverse()
        .map((d) => ({ year: d.date, value: d.value })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "upstream" }, { status: 502 });
  }
}

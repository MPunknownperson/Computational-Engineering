import { NextResponse } from "next/server";

export const revalidate = 3600;

// World Bank v2 indicator endpoint.
// We fetch the last ~10 years and return the latest non-null value.
const INDICATORS: Record<string, string> = {
  inflation: "FP.CPI.TOTL.ZG",
  gdp_per_capita: "NY.GDP.PCAP.CD",
  unemployment: "SL.UEM.TOTL.ZS",
  population: "SP.POP.TOTL",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const country = (searchParams.get("country") || "USA").toUpperCase();
  const indicatorKey = searchParams.get("indicator") || "inflation";
  const code = INDICATORS[indicatorKey];
  if (!code) return NextResponse.json({ error: "unknown indicator" }, { status: 400 });

  try {
    const url = `https://api.worldbank.org/v2/country/${encodeURIComponent(country)}/indicator/${code}?format=json&per_page=40&date=2014:2024`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
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

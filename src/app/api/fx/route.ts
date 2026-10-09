import { NextResponse } from "next/server";
import { TIMING } from "@/lib/catalog";

// Must be a literal; keep equal to TIMING.fxCacheSeconds.
export const revalidate = 300;

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

type FrankfurterLatest = {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
};

type FrankfurterSeries = {
  amount: number;
  base: string;
  start_date: string;
  end_date: string;
  rates: Record<string, Record<string, number>>;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const base = (searchParams.get("base") || "USD").toUpperCase();
  const symbols = (searchParams.get("symbols") || "").toUpperCase();
  const series = searchParams.get("series") === "1";

  try {
    if (series) {
      // A caller may pass an explicit start date; otherwise the default window applies.
      const from = searchParams.get("from");
      const start = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : isoDaysAgo(TIMING.fxSeriesDays);
      const url = `https://api.frankfurter.dev/v1/${start}..?base=${encodeURIComponent(base)}${symbols ? `&symbols=${encodeURIComponent(symbols)}` : ""}`;
      const res = await fetch(url, { next: { revalidate: TIMING.fxSeriesCacheSeconds } });
      if (!res.ok) throw new Error(`frankfurter ${res.status}`);
      const data = (await res.json()) as FrankfurterSeries;
      // A 30-day window has ~21 ECB business days; thin only if a caller asks for more.
      const entries = Object.entries(data.rates);
      const step = Math.max(1, Math.floor(entries.length / 30));
      const thinned = entries.filter((_, i) => i % step === 0 || i === entries.length - 1);
      return NextResponse.json({
        base: data.base,
        start_date: data.start_date,
        end_date: data.end_date,
        series: Object.fromEntries(thinned),
      });
    }
    const url = `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(base)}${symbols ? `&symbols=${encodeURIComponent(symbols)}` : ""}`;
    const res = await fetch(url, { next: { revalidate: TIMING.fxCacheSeconds } });
    if (!res.ok) throw new Error(`frankfurter ${res.status}`);
    const data = (await res.json()) as FrankfurterLatest;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "upstream" }, { status: 502 });
  }
}

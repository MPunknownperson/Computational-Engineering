import { NextResponse } from "next/server";

export const revalidate = 300; // 5 min

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
      const url = `https://api.frankfurter.dev/v1/2024-01-01..?base=${encodeURIComponent(base)}${symbols ? `&symbols=${encodeURIComponent(symbols)}` : ""}`;
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) throw new Error(`frankfurter ${res.status}`);
      const data = (await res.json()) as FrankfurterSeries;
      // Thin out to ~30 points to keep payload small
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
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`frankfurter ${res.status}`);
    const data = (await res.json()) as FrankfurterLatest;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "upstream" }, { status: 502 });
  }
}

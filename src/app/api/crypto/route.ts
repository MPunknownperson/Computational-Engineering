import { NextResponse } from "next/server";

export const revalidate = 60;

const DEFAULT_IDS = "bitcoin,ethereum,tether,binancecoin,solana,ripple,cardano,dogecoin,polkadot,chainlink";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ids = searchParams.get("ids") || DEFAULT_IDS;
  const vs = (searchParams.get("vs") || "usd").toLowerCase();

  try {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${encodeURIComponent(vs)}&ids=${encodeURIComponent(ids)}&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`coingecko ${res.status}`);
    const data = await res.json();
    return NextResponse.json({ vs, items: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "upstream" }, { status: 502 });
  }
}

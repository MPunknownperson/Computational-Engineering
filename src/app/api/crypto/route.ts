import { NextResponse } from "next/server";
import { intParam, requireParam, withApiHandler } from "@/lib/core/api-handler";
import { AppError } from "@/lib/core/errors";
import { ensureAutoUpdater, getMarkets } from "@/lib/crypto/service";
import { isVs, SUPPORTED_VS } from "@/lib/crypto/providers";

export const dynamic = "force-dynamic";

/**
 * GET /api/crypto?vs=usd&ids=bitcoin,ethereum&sparkline=1
 *
 * Normalised market table served from the high-speed cache with
 * stale-while-revalidate semantics, provider failover and automated
 * snapshot persistence. The response always says where the data came
 * from (`source`) and how old it is (`ageMs`) so the UI can be honest.
 */
export const GET = withApiHandler("crypto.markets", async ({ url }) => {
  ensureAutoUpdater();
  const vs = requireParam(url, "vs", /^[a-z]{3}$/, "usd").toLowerCase();
  if (!isVs(vs)) throw new AppError("validation", `Unsupported quote currency. Use one of: ${SUPPORTED_VS.join(", ")}.`);
  const ids = (url.searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const withSparkline = intParam(url, "sparkline", 1, 0, 1) === 1;
  const result = await getMarkets(vs);
  const items = (ids.length ? result.items.filter((a) => ids.includes(a.id)) : result.items).map((a) => (withSparkline ? a : { ...a, sparkline7d: null }));
  return NextResponse.json({
    vs, items, source: result.source, live: result.live, fetchedAt: result.fetchedAt, ageMs: result.age, state: result.state, attempts: result.attempts,
    // Legacy field names kept for older clients of this endpoint.
    legacy: items.map((a) => ({ id: a.id, symbol: a.symbol, name: a.name, current_price: a.price, price_change_percentage_24h: a.change24h, market_cap: a.marketCap, total_volume: a.volume24h })),
  }, { headers: { "Cache-Control": "no-store", "X-Data-Source": result.source, "X-Data-Age": String(result.age) } });
});

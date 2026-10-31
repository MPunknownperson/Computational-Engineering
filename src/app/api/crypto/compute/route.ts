import { NextResponse } from "next/server";
import { intParam, requireParam, withApiHandler } from "@/lib/core/api-handler";
import { AppError } from "@/lib/core/errors";
import { convertExact, dcaSimulation, isPositiveDecimal } from "@/lib/crypto/precision";
import { ASSET_META, isAssetId, isVs } from "@/lib/crypto/providers";
import { ensureAutoUpdater, getHistory, latestQuotes } from "@/lib/crypto/service";

export const dynamic = "force-dynamic";

/**
 * GET /api/crypto/compute?op=convert&from=bitcoin&to=ethereum&amount=0.25&vs=usd
 * GET /api/crypto/compute?op=convert&from=bitcoin&to=fiat&amount=1&vs=eur
 * GET /api/crypto/compute?op=dca&id=bitcoin&amount=100&every=7&days=365&vs=usd
 * Exact decimal arithmetic (40 significant digits) on the cached live quotes.
 */
export const GET = withApiHandler("crypto.compute", async ({ url }) => {
  ensureAutoUpdater();
  const op = requireParam(url, "op", /^(convert|dca)$/, "convert");
  const vs = requireParam(url, "vs", /^[a-z]{3}$/, "usd");
  if (!isVs(vs)) throw new AppError("validation", "Unsupported quote currency.");
  const amount = requireParam(url, "amount", /^\d+(\.\d+)?$/, "1");
  if (!isPositiveDecimal(amount) || amount.length > 40) throw new AppError("validation", "Amount must be a positive decimal.");

  if (op === "convert") {
    const from = requireParam(url, "from", /^[a-z0-9-]{2,40}$/, "bitcoin");
    const to = requireParam(url, "to", /^[a-z0-9-]{2,40}$/, "fiat");
    if (!isAssetId(from) && from !== "fiat") throw new AppError("not_found", "Unknown source asset.");
    if (!isAssetId(to) && to !== "fiat") throw new AppError("not_found", "Unknown target asset.");
    const quotes = await latestQuotes(vs);
    const priceOf = (id: string) => (id === "fiat" ? 1 : quotes.get(id)?.price);
    const fromPrice = priceOf(from), toPrice = priceOf(to);
    if (!fromPrice || !toPrice) throw new AppError("upstream_unavailable", "A quote for one of the assets is not available right now.", { retryable: true });
    const result = convertExact(amount, fromPrice, toPrice);
    return NextResponse.json({ op, vs, from, to, amount, fromPrice: fromPrice.toString(), toPrice: toPrice.toString(), ...result, fromSymbol: from === "fiat" ? vs.toUpperCase() : ASSET_META[from].symbol.toUpperCase(), toSymbol: to === "fiat" ? vs.toUpperCase() : ASSET_META[to].symbol.toUpperCase(), quotedAt: Date.now(), precision: "decimal.js, 40 significant digits, banker's rounding on display" }, { headers: { "Cache-Control": "no-store" } });
  }

  const id = requireParam(url, "id", /^[a-z0-9-]{2,40}$/, "bitcoin");
  if (!isAssetId(id)) throw new AppError("not_found", "Unknown asset.");
  const every = intParam(url, "every", 7, 1, 90);
  const days = intParam(url, "days", 365, 7, 365);
  const history = await getHistory(id, vs, days);
  const result = dcaSimulation(history.points, amount, every);
  return NextResponse.json({ op, id, symbol: ASSET_META[id].symbol.toUpperCase(), vs, amount, every, days, source: history.source, ...result, schedule: result.schedule.slice(-60) }, { headers: { "Cache-Control": "no-store" } });
});

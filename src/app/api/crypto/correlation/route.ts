import { NextResponse } from "next/server";
import { CRYPTO_IDS } from "@/lib/catalog";
import { intParam, requireParam, withApiHandler } from "@/lib/core/api-handler";
import { AppError } from "@/lib/core/errors";
import { isAssetId, isVs } from "@/lib/crypto/providers";
import { ensureAutoUpdater, getCorrelation } from "@/lib/crypto/service";

export const dynamic = "force-dynamic";

const DEFAULT_IDS = ["bitcoin", "ethereum", "solana", "binancecoin", "ripple", "cardano", "dogecoin", "chainlink", "litecoin", "polkadot"];

/** GET /api/crypto/correlation?ids=bitcoin,ethereum&vs=usd&days=90 */
export const GET = withApiHandler("crypto.correlation", async ({ url }) => {
  ensureAutoUpdater();
  const vs = requireParam(url, "vs", /^[a-z]{3}$/, "usd");
  const days = intParam(url, "days", 90, 14, 365);
  const ids = (url.searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const chosen = (ids.length ? ids : DEFAULT_IDS).slice(0, 12);
  if (!isVs(vs)) throw new AppError("validation", "Unsupported quote currency.");
  if (chosen.length < 2 || chosen.some((id) => !isAssetId(id))) throw new AppError("validation", `Choose 2–12 known assets (${CRYPTO_IDS.slice(0, 5).join(", ")}, …).`);
  const report = await getCorrelation(chosen, vs, days);
  return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
});

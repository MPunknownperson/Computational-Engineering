import { NextResponse } from "next/server";
import { intParam, requireParam, withApiHandler } from "@/lib/core/api-handler";
import { AppError } from "@/lib/core/errors";
import { isAssetId, isVs } from "@/lib/crypto/providers";
import { ensureAutoUpdater, getHistory } from "@/lib/crypto/service";

export const dynamic = "force-dynamic";

/** GET /api/crypto/history?id=bitcoin&vs=usd&days=30 — cached price/volume series. */
export const GET = withApiHandler("crypto.history", async ({ url }) => {
  ensureAutoUpdater();
  const id = requireParam(url, "id", /^[a-z0-9-]{2,40}$/, "bitcoin");
  const vs = requireParam(url, "vs", /^[a-z]{3}$/, "usd");
  const days = intParam(url, "days", 30, 1, 365);
  if (!isAssetId(id)) throw new AppError("not_found", "Unknown asset.");
  if (!isVs(vs)) throw new AppError("validation", "Unsupported quote currency.");
  const series = await getHistory(id, vs, days);
  return NextResponse.json({ id, vs, days, ...series }, { headers: { "Cache-Control": "no-store", "X-Data-Source": series.source } });
});

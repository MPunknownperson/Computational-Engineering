import { NextResponse } from "next/server";
import { intParam, requireParam, withApiHandler } from "@/lib/core/api-handler";
import { AppError } from "@/lib/core/errors";
import { isAssetId, isVs } from "@/lib/crypto/providers";
import { ensureAutoUpdater, getAnalysis } from "@/lib/crypto/service";

export const dynamic = "force-dynamic";

/** GET /api/crypto/analysis?id=bitcoin&vs=usd&days=90 — full analytical report. */
export const GET = withApiHandler("crypto.analysis", async ({ url }) => {
  ensureAutoUpdater();
  const id = requireParam(url, "id", /^[a-z0-9-]{2,40}$/, "bitcoin");
  const vs = requireParam(url, "vs", /^[a-z]{3}$/, "usd");
  const days = intParam(url, "days", 90, 7, 365);
  if (!isAssetId(id)) throw new AppError("not_found", "Unknown asset.");
  if (!isVs(vs)) throw new AppError("validation", "Unsupported quote currency.");
  const report = await getAnalysis(id, vs, days);
  return NextResponse.json(report, { headers: { "Cache-Control": "no-store", "X-Compute-Ms": String(report.computeMs) } });
});

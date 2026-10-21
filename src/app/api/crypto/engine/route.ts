import { NextResponse } from "next/server";
import { withApiHandler } from "@/lib/core/api-handler";
import { engineStatus, ensureAutoUpdater } from "@/lib/crypto/service";

export const dynamic = "force-dynamic";

/** GET /api/crypto/engine — live engine telemetry: feed freshness, scheduler, breakers, caches. */
export const GET = withApiHandler("crypto.engine", async () => {
  ensureAutoUpdater();
  return NextResponse.json(await engineStatus(), { headers: { "Cache-Control": "no-store" } });
});

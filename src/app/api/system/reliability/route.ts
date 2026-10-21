import { NextResponse } from "next/server";
import { readJson, withApiHandler } from "@/lib/core/api-handler";
import { AppError } from "@/lib/core/errors";
import { captureAndRemediate, reliabilityOverview, runSelfTest } from "@/lib/remediation/engine";
import { engineStatus, ensureAutoUpdater } from "@/lib/crypto/service";

export const dynamic = "force-dynamic";

/** GET /api/system/reliability — incidents, deployed fixes, breakers, caches, patches, crypto engine. */
export const GET = withApiHandler("system.reliability", async () => {
  ensureAutoUpdater();
  const [overview, engine] = await Promise.all([reliabilityOverview(), engineStatus()]);
  return NextResponse.json({ ...overview, engine }, { headers: { "Cache-Control": "no-store" } });
});

/**
 * POST /api/system/reliability { action: "self-test" | "simulate", category? }
 * `self-test` runs diagnostics and repairs; `simulate` injects a synthetic
 * fault of the given category so the remediation path can be exercised.
 */
export const POST = withApiHandler("system.reliability.action", async ({ request }) => {
  const body = await readJson(request, (raw) => {
    const b = raw as Record<string, unknown>;
    const action = String(b.action ?? "");
    if (!["self-test", "simulate"].includes(action)) throw new AppError("validation", "action must be self-test or simulate");
    return { action, category: typeof b.category === "string" ? b.category : "upstream_timeout" };
  });
  if (body.action === "self-test") return NextResponse.json(await runSelfTest());
  const allowed = ["upstream_timeout", "rate_limited", "malformed_payload", "schema_missing", "database_unavailable", "render", "chunk_load", "storage_corrupt", "hydration"];
  if (!allowed.includes(body.category)) throw new AppError("validation", `category must be one of ${allowed.join(", ")}`);
  const result = await captureAndRemediate({ origin: "server", category: body.category as never, message: `Simulated ${body.category} fault (operator drill)`, route: "drill", userAction: "simulate", context: { drill: true } });
  return NextResponse.json(result);
});

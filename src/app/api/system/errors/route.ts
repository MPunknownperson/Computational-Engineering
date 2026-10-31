import { NextResponse } from "next/server";
import { readJson, withApiHandler } from "@/lib/core/api-handler";
import { AppError, type ErrorCategory } from "@/lib/core/errors";
import { captureAndRemediate } from "@/lib/remediation/engine";

export const dynamic = "force-dynamic";

const CATEGORIES: ErrorCategory[] = ["upstream_timeout", "upstream_unavailable", "rate_limited", "malformed_payload", "validation", "not_found", "database_unavailable", "schema_missing", "network_offline", "chunk_load", "hydration", "storage_corrupt", "render", "unknown"];

// Small in-memory limiter so a crashing tab cannot flood the incident table.
const buckets = new Map<string, { count: number; resetAt: number }>();
function allow(key: string): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) { buckets.set(key, { count: 1, resetAt: now + 60_000 }); return true; }
  bucket.count++;
  return bucket.count <= 30;
}

/**
 * POST /api/system/errors — browser-side incident intake.
 * Body: { message, stack?, category?, route?, userAction?, context? }
 * Returns the generated remediation plan so the browser can apply client actions.
 */
export const POST = withApiHandler("system.errors", async ({ request }) => {
  const body = await readJson(request, (raw) => {
    const b = raw as Record<string, unknown>;
    const message = typeof b.message === "string" ? b.message.slice(0, 1_000) : "";
    if (!message) throw new AppError("validation", "message is required");
    const category = typeof b.category === "string" && (CATEGORIES as string[]).includes(b.category) ? (b.category as ErrorCategory) : undefined;
    return {
      message, category,
      stack: typeof b.stack === "string" ? b.stack.slice(0, 6_000) : undefined,
      route: typeof b.route === "string" ? b.route.slice(0, 300) : null,
      userAction: typeof b.userAction === "string" ? b.userAction.slice(0, 200) : null,
      context: typeof b.context === "object" && b.context ? (b.context as Record<string, unknown>) : {},
    };
  });
  const key = request.headers.get("x-workspace")?.slice(0, 80) || "anonymous";
  if (!allow(key)) return NextResponse.json({ accepted: false, reason: "rate limited" }, { status: 202 });
  const result = await captureAndRemediate({ origin: "client", ...body, error: body.category ? undefined : new Error(body.message), context: { ...body.context, userAgentHint: request.headers.get("sec-ch-ua-platform") ?? undefined } });
  return NextResponse.json({ accepted: true, fingerprint: result.fingerprint, category: result.category, severity: result.severity, playbook: result.plan.playbook, summary: result.plan.summary, clientActions: result.plan.clientActions, deployed: result.deployed, verified: result.verified, throttled: result.throttled }, { status: 202 });
});

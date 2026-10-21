import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/** Liveness + readiness: database reachable, reliability schema present. */
export async function GET() {
  const started = Date.now();
  try {
    await db.execute(sql`select 1`);
    let schema = true;
    try { await db.execute(sql`select 1 from incident_reports limit 1`); } catch { schema = false; }
    if (!schema) {
      const { ensureReliabilitySchema } = await import("@/lib/remediation/engine");
      schema = await ensureReliabilitySchema(true);
    }
    return Response.json({ ok: true, database: "up", schema: schema ? "ready" : "degraded", latencyMs: Date.now() - started }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, database: "down", latencyMs: Date.now() - started }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}

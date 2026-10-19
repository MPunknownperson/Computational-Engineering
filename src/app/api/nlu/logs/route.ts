import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { nluInteractions, nluRegressionRuns } from "@/db/nlu-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Recent interactions plus aggregate health, for tuning and monitoring. */
export async function GET() {
  try {
    const [rows, byDomain, lastRun] = await Promise.all([
      db.select().from(nluInteractions).orderBy(desc(nluInteractions.id)).limit(50),
      db
        .select({
          domain: sql<string>`coalesce(${nluInteractions.domain}, ${nluInteractions.decision})`,
          count: sql<number>`count(*)::int`,
          avgConfidence: sql<number>`coalesce(avg(${nluInteractions.confidence}), 0)::real`,
          avgLatency: sql<number>`coalesce(avg(${nluInteractions.latencyMs}), 0)::real`,
        })
        .from(nluInteractions)
        .groupBy(sql`coalesce(${nluInteractions.domain}, ${nluInteractions.decision})`),
      db.select().from(nluRegressionRuns).orderBy(desc(nluRegressionRuns.id)).limit(1),
    ]);
    return Response.json({ interactions: rows, byDomain, lastRun: lastRun[0] ?? null });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

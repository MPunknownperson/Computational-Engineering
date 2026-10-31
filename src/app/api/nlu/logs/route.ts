import { store } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Recent interactions plus aggregate health, for tuning and monitoring. */
export async function GET() {
  try {
    const rows = store.nluInteractions.all().sort((a, b) => b.id - a.id).slice(0, 50);
    const groups = new Map<string, { domain: string; count: number; confidence: number; latency: number }>();
    for (const row of store.nluInteractions.all()) {
      const key = row.domain ?? row.decision;
      const bucket = groups.get(key) ?? { domain: key, count: 0, confidence: 0, latency: 0 };
      bucket.count += 1;
      bucket.confidence += row.confidence;
      bucket.latency += row.latencyMs;
      groups.set(key, bucket);
    }
    const byDomain = Array.from(groups.values()).map((bucket) => ({
      domain: bucket.domain,
      count: bucket.count,
      avgConfidence: bucket.count ? bucket.confidence / bucket.count : 0,
      avgLatency: bucket.count ? bucket.latency / bucket.count : 0,
    }));
    const lastRun = store.nluRegressionRuns.all().sort((a, b) => b.id - a.id)[0] ?? null;
    return Response.json({ interactions: rows, byDomain, lastRun });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

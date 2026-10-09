import { NextResponse } from "next/server";
import { computeStats, listJobs, reapStaleJobs, summariseJob } from "@/lib/workbench/jobs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  await reapStaleJobs().catch(() => 0);
  const jobs = await listJobs({
    kind: url.searchParams.get("kind") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    query: url.searchParams.get("q") ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? 60),
    before: url.searchParams.get("before") ?? undefined,
  });
  return NextResponse.json({
    ok: true,
    data: { jobs: jobs.map(summariseJob) },
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action === "reap") {
    const reaped = await reapStaleJobs();
    return NextResponse.json({ ok: true, data: { reaped } });
  }
  const stats = await computeStats();
  return NextResponse.json({ ok: true, data: stats });
}

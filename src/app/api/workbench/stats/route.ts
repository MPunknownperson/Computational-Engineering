import { NextResponse } from "next/server";
import { reapStaleJobs } from "@/lib/workbench/jobs";
import { getSnapshot } from "@/lib/workbench/snapshot";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await reapStaleJobs().catch(() => 0);
    return NextResponse.json({ ok: true, data: await getSnapshot() });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Stats failed." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { getJob, summariseJob } from "@/lib/workbench/jobs";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const job = await getJob(id);
  if (!job) {
    return NextResponse.json({ ok: false, error: "Job not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: { job: summariseJob(job) } });
}

import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { runJob, summariseJob } from "@/lib/workbench/jobs";
import { resolveInSandbox, SandboxError, WORKSPACE_ROOT } from "@/lib/workbench/sandbox";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { path?: string };
    const requested = body.path?.trim();
    if (!requested) {
      return NextResponse.json({ ok: false, error: "A path is required." }, { status: 400 });
    }
    const absolute = resolveInSandbox(requested);
    await fs.mkdir(absolute, { recursive: true });
    const job = await runJob({
      kind: "system",
      label: `mkdir ${path.relative(WORKSPACE_ROOT, absolute) || absolute}`,
      command: `mkdir -p ${absolute}`,
      cwd: WORKSPACE_ROOT,
      timeoutMs: 10_000,
      privileged: true,
      meta: { path: absolute },
    });
    return NextResponse.json({ ok: true, data: { path: absolute, job: summariseJob(job) } });
  } catch (error) {
    if (error instanceof SandboxError) {
      return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "mkdir failed." },
      { status: 500 },
    );
  }
}

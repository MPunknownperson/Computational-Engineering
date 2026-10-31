import { NextResponse } from "next/server";
import { runJob, summariseJob } from "@/lib/workbench/jobs";
import { SANDBOX_ROOT, WORKSPACE_ROOT, SandboxError, resolveInSandbox } from "@/lib/workbench/sandbox";

export const dynamic = "force-dynamic";

interface ShellBody {
  command?: string;
  cwd?: string;
  timeoutMs?: number;
}

export async function POST(request: Request) {
  let body: ShellBody;
  try {
    body = (await request.json()) as ShellBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const command = body.command?.trim();
  if (!command) {
    return NextResponse.json({ ok: false, error: "A command is required." }, { status: 400 });
  }

  try {
    const cwd = resolveInSandbox(body.cwd ?? WORKSPACE_ROOT);
    const job = await runJob({
      kind: "shell",
      label: command.length > 90 ? `${command.slice(0, 90)}…` : command,
      command,
      cwd,
      timeoutMs: body.timeoutMs ?? 30_000,
    });

    return NextResponse.json({
      ok: true,
      data: {
        job: summariseJob(job),
        cwd: job.cwd ?? cwd,
        sandboxRoot: SANDBOX_ROOT,
        workspaceRoot: WORKSPACE_ROOT,
      },
    });
  } catch (error) {
    if (error instanceof SandboxError) {
      return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

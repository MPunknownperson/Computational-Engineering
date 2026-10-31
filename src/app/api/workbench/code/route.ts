import { NextResponse } from "next/server";
import { CODEFORGE_ACTIONS, CODEFORGE_MAX_SOURCE, runCodeForge, type CodeForgeRequest } from "@/lib/workbench/codeforge";
import { recordJob } from "@/lib/workbench/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Describes the code-processing engine. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      engine: "codeforge",
      actions: CODEFORGE_ACTIONS,
      maxSourceBytes: CODEFORGE_MAX_SOURCE,
      usage: {
        method: "POST",
        body: { action: "transpile | diagnose | format | minify | analyze | hash | benchmark | lint", source: "string", filename: "optional", target: "es2017 | es2020 | es2022 | esnext", iterations: "benchmark only", scope: "benchmark only", option: "json indent or hash algorithm" },
      },
    },
  });
}

export async function POST(request: Request) {
  let body: Partial<CodeForgeRequest>;
  try {
    body = (await request.json()) as Partial<CodeForgeRequest>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.action || typeof body.source !== "string") {
    return NextResponse.json({ ok: false, error: "`action` and `source` are required." }, { status: 400 });
  }
  const result = await runCodeForge({
    action: body.action,
    source: body.source,
    filename: typeof body.filename === "string" ? body.filename.slice(0, 120) : undefined,
    iterations: typeof body.iterations === "number" ? body.iterations : undefined,
    scope: body.scope && typeof body.scope === "object" ? body.scope : undefined,
    target: body.target,
    option: typeof body.option === "string" ? body.option.slice(0, 32) : undefined,
  });
  void recordJob({
    kind: "code",
    label: `codeforge:${result.action}${body.filename ? ` ${body.filename}` : ""}`,
    command: `codeforge ${result.action}`,
    status: result.ok ? "succeeded" : "failed",
    stdout: result.output ? result.output.slice(0, 4096) : JSON.stringify(result.data ?? {}).slice(0, 4096),
    stderr: result.error,
    durationMs: Math.round(result.durationMs),
    meta: { bytes: body.source.length, engine: "codeforge" },
  }).catch(() => undefined);
  return NextResponse.json({ ok: result.ok, data: result }, { status: result.ok ? 200 : 422 });
}

import { NextResponse } from "next/server";
import { extractArchive } from "@/lib/workbench/archives";
import { SandboxError } from "@/lib/workbench/sandbox";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      archivePath?: string;
      target?: string;
      overwrite?: boolean;
      intoSubfolder?: boolean;
    };
    if (!body.archivePath?.trim()) {
      return NextResponse.json(
        { ok: false, error: "archivePath is required." },
        { status: 400 },
      );
    }
    const result = await extractArchive({
      archivePath: body.archivePath,
      target: body.target,
      overwrite: body.overwrite ?? true,
      intoSubfolder: body.intoSubfolder ?? true,
    });
    return NextResponse.json({
      ok: true,
      data: { ...result, plan: { ...result.plan, buildCommand: undefined } },
    });
  } catch (error) {
    if (error instanceof SandboxError) {
      return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Extraction failed." },
      { status: 500 },
    );
  }
}

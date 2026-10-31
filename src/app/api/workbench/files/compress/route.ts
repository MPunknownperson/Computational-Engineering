import { NextResponse } from "next/server";
import { createArchive, type CompressFormat } from "@/lib/workbench/archives";
import { SandboxError } from "@/lib/workbench/sandbox";

export const dynamic = "force-dynamic";

const FORMATS: CompressFormat[] = ["zip", "tar.gz", "tar"];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sources?: string[];
      output?: string;
      format?: CompressFormat;
      overwrite?: boolean;
    };
    if (!body.sources?.length) {
      return NextResponse.json(
        { ok: false, error: "Select at least one file or folder." },
        { status: 400 },
      );
    }
    if (!body.output?.trim()) {
      return NextResponse.json({ ok: false, error: "An output path is required." }, { status: 400 });
    }
    const requested = (body.format ?? "zip") as CompressFormat;
    const format = FORMATS.includes(requested) ? requested : "zip";
    const result = await createArchive({
      sources: body.sources,
      output: body.output,
      format,
      overwrite: body.overwrite ?? true,
    });
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    if (error instanceof SandboxError) {
      return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Compression failed." },
      { status: 500 },
    );
  }
}

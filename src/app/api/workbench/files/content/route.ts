import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { resolveInSandbox, SandboxError } from "@/lib/workbench/sandbox";

export const dynamic = "force-dynamic";

const MAX_PREVIEW = 256 * 1024;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requested = url.searchParams.get("path");
  if (!requested) {
    return NextResponse.json({ ok: false, error: "A path is required." }, { status: 400 });
  }
  try {
    const absolute = resolveInSandbox(requested);
    const stats = await fs.stat(absolute);
    if (stats.isDirectory()) {
      return NextResponse.json(
        { ok: false, error: "Path is a directory.", code: "is_directory" },
        { status: 400 },
      );
    }
    const handle = await fs.open(absolute, "r");
    const sample = Buffer.alloc(Math.min(stats.size, 8192));
    const { bytesRead } = await handle.read(sample, 0, sample.length, 0);
    await handle.close();
    const slice = sample.subarray(0, bytesRead);
    const binary = slice.includes(0) ||
      (slice.length > 0 && [...slice].filter((b) => b < 9 || (b > 13 && b < 32)).length / slice.length > 0.3);

    if (binary) {
      return NextResponse.json({
        ok: true,
        data: {
          path: absolute,
          name: path.basename(absolute),
          size: stats.size,
          binary: true,
          content: null,
          truncated: false,
          hexPreview: [...slice.subarray(0, 128)]
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(" "),
        },
      });
    }

    const buffer = Buffer.alloc(Math.min(stats.size, MAX_PREVIEW));
    const text = await fs.readFile(absolute, "utf8").catch(() => "");
    void buffer;
    const truncated = text.length > MAX_PREVIEW;
    return NextResponse.json({
      ok: true,
      data: {
        path: absolute,
        name: path.basename(absolute),
        size: stats.size,
        binary: false,
        content: truncated ? text.slice(0, MAX_PREVIEW) : text,
        truncated,
        lines: (truncated ? text.slice(0, MAX_PREVIEW) : text).split("\n").length,
        modified: stats.mtime.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof SandboxError) {
      return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Read failed." },
      { status: 500 },
    );
  }
}

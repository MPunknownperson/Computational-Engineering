import { NextResponse } from "next/server";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import fs from "node:fs/promises";
import path from "node:path";
import { db } from "@/db";
import { artifacts as artifactsTable } from "@/db/schema";
import { recordJob } from "@/lib/workbench/jobs";
import { describeArchive, kindFromName } from "@/lib/workbench/archives";
import {
  ensureWorkspace,
  formatBytes,
  resolveInSandbox,
  SandboxError,
  WORKSPACE_ROOT,
} from "@/lib/workbench/sandbox";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 512 * 1024 * 1024;

async function uniqueDestination(dir: string, name: string, overwrite: boolean) {
  const base = path.join(dir, name);
  if (overwrite) return base;
  let candidate = base;
  const ext = path.extname(name);
  const stem = path.basename(name, ext);
  for (let index = 1; index < 500; index += 1) {
    const exists = await fs.stat(candidate).catch(() => null);
    if (!exists) return candidate;
    candidate = path.join(dir, `${stem}-${index}${ext}`);
  }
  return base;
}

export async function POST(request: Request) {
  const started = Date.now();
  try {
    await ensureWorkspace();
    const form = await request.formData();
    const rawDir = (form.get("dir") as string | null) ?? WORKSPACE_ROOT;
    const overwrite = form.get("overwrite") === "true";
    const dir = resolveInSandbox(rawDir);
    await fs.mkdir(dir, { recursive: true });

    const files = form.getAll("files").filter((value): value is File => value instanceof File);
    if (!files.length) {
      return NextResponse.json({ ok: false, error: "No files were uploaded." }, { status: 400 });
    }

    const saved: Array<{
      name: string;
      path: string;
      relative: string;
      size: number;
      sizeLabel: string;
      archive: Awaited<ReturnType<typeof describeArchive>> | null;
    }> = [];
    let totalBytes = 0;

    for (const file of files) {
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new SandboxError(
          `${file.name} exceeds the ${formatBytes(MAX_UPLOAD_BYTES)} upload limit.`,
          413,
          "too_large",
        );
      }
      const safeName = path.basename(file.name || "upload.bin").replace(/[^\w.@+-]/g, "_");
      const destination = await uniqueDestination(dir, safeName, overwrite);
      await pipeline(
        Readable.fromWeb(file.stream() as unknown as WebReadableStream),
        createWriteStream(destination),
      );
      const stats = await fs.stat(destination);
      totalBytes += stats.size;
      const archive = kindFromName(safeName)
        ? await describeArchive(destination, {
            name: safeName,
            size: stats.size,
            modified: stats.mtime.toISOString(),
          })
        : null;
      saved.push({
        name: safeName,
        path: destination,
        relative: path.relative(WORKSPACE_ROOT, destination),
        size: stats.size,
        sizeLabel: formatBytes(stats.size),
        archive,
      });
      await db
        .insert(artifactsTable)
        .values({
          name: safeName,
          path: destination,
          kind: archive ? "archive" : "file",
          size: stats.size,
          source: "upload",
          detail: archive ? archive.kindLabel : `${path.extname(safeName) || "file"} upload`,
        })
        .catch(() => undefined);
    }

    await recordJob({
      kind: "upload",
      label: `Upload ${saved.length} file${saved.length === 1 ? "" : "s"} → ${path.relative(WORKSPACE_ROOT, dir) || dir}`,
      command: saved.map((entry) => `write ${entry.relative} (${entry.sizeLabel})`).join("\n"),
      cwd: dir,
      status: "succeeded",
      durationMs: Date.now() - started,
      bytesWritten: totalBytes,
      meta: { files: saved.map((entry) => entry.path), totalBytes },
    });

    return NextResponse.json({
      ok: true,
      data: { saved, totalBytes, totalLabel: formatBytes(totalBytes), dir },
    });
  } catch (error) {
    if (error instanceof SandboxError) {
      return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 },
    );
  }
}

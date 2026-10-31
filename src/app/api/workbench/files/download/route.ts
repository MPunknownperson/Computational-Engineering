import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { resolveInSandbox, SandboxError } from "@/lib/workbench/sandbox";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  zip: "application/zip",
  gz: "application/gzip",
  tgz: "application/gzip",
  tar: "application/x-tar",
  xz: "application/x-xz",
  bz2: "application/x-bzip2",
  "7z": "application/x-7z-compressed",
  json: "application/json",
  txt: "text/plain",
  md: "text/markdown",
  log: "text/plain",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
  csv: "text/csv",
  pdf: "application/pdf",
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requested = url.searchParams.get("path");
  if (!requested) {
    return new Response(JSON.stringify({ ok: false, error: "A path is required." }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  try {
    const absolute = resolveInSandbox(requested);
    const stats = await fsp.stat(absolute);
    if (stats.isDirectory()) throw new SandboxError("Cannot download a directory.", 400, "is_directory");
    const extension = path.extname(absolute).replace(".", "").toLowerCase();
    const stream = Readable.toWeb(fs.createReadStream(absolute)) as ReadableStream<Uint8Array>;
    return new Response(stream, {
      status: 200,
      headers: {
        "content-type": MIME[extension] ?? "application/octet-stream",
        "content-length": String(stats.size),
        "content-disposition": `attachment; filename="${path.basename(absolute).replace(/"/g, "")}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const status = error instanceof SandboxError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Download failed.";
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status,
      headers: { "content-type": "application/json" },
    });
  }
}

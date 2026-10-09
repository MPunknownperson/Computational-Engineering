import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { recordJob } from "@/lib/workbench/jobs";
import {
  directorySize,
  ensureWorkspace,
  listDirectory,
  resolveInSandbox,
  SANDBOX_ROOT,
  SandboxError,
  WORKSPACE_ROOT,
} from "@/lib/workbench/sandbox";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requested = url.searchParams.get("path") ?? WORKSPACE_ROOT;
  try {
    await ensureWorkspace();
    const absolute = resolveInSandbox(requested);
    const stats = await fs.stat(absolute).catch(() => null);
    if (!stats?.isDirectory()) {
      return NextResponse.json(
        { ok: false, error: `Not a directory: ${requested}`, code: "not_a_directory" },
        { status: 404 },
      );
    }
    const entries = await listDirectory(absolute);
    const breadcrumbs: Array<{ name: string; path: string }> = [];
    let cursor = absolute;
    while (cursor.startsWith(SANDBOX_ROOT)) {
      breadcrumbs.unshift({
        name: cursor === SANDBOX_ROOT ? SANDBOX_ROOT : path.basename(cursor),
        path: cursor,
      });
      if (cursor === SANDBOX_ROOT) break;
      cursor = path.dirname(cursor);
    }

    return NextResponse.json({
      ok: true,
      data: {
        path: absolute,
        relative: absolute === SANDBOX_ROOT ? "" : path.relative(SANDBOX_ROOT, absolute),
        breadcrumbs,
        canGoUp: absolute !== SANDBOX_ROOT,
        parent: absolute === SANDBOX_ROOT ? null : path.dirname(absolute),
        workspaceRoot: WORKSPACE_ROOT,
        sandboxRoot: SANDBOX_ROOT,
        entries,
        directoryCount: entries.filter((entry) => entry.type === "directory").length,
        fileCount: entries.filter((entry) => entry.type !== "directory").length,
        totalSize: entries.reduce((sum, entry) => sum + (entry.type === "file" ? entry.size : 0), 0),
      },
    });
  } catch (error) {
    if (error instanceof SandboxError) {
      return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to read directory." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const requested = url.searchParams.get("path");
  if (!requested) {
    return NextResponse.json({ ok: false, error: "A path is required." }, { status: 400 });
  }
  const started = Date.now();
  try {
    const absolute = resolveInSandbox(requested);
    if (absolute === SANDBOX_ROOT || absolute === WORKSPACE_ROOT) {
      return NextResponse.json(
        { ok: false, error: "Refusing to delete the sandbox or workspace root.", code: "protected_path" },
        { status: 403 },
      );
    }
    const stats = await fs.stat(absolute).catch(() => null);
    if (!stats) {
      return NextResponse.json({ ok: false, error: "Path not found." }, { status: 404 });
    }
    const freed = stats.isDirectory() ? await directorySize(absolute) : stats.size;
    await fs.rm(absolute, { recursive: true, force: true });
    await recordJob({
      kind: "delete",
      label: `Delete ${path.basename(absolute)}`,
      command: `rm -rf ${absolute}`,
      cwd: WORKSPACE_ROOT,
      status: "succeeded",
      durationMs: Date.now() - started,
      meta: { path: absolute, freedBytes: freed },
    });
    return NextResponse.json({ ok: true, data: { deleted: absolute, freedBytes: freed } });
  } catch (error) {
    if (error instanceof SandboxError) {
      return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Delete failed." },
      { status: 500 },
    );
  }
}

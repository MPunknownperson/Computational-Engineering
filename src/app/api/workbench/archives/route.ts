import { NextResponse } from "next/server";
import {
  ARCHIVE_LABELS,
  describeArchive,
  listArchiveEntries,
  planExtraction,
  scanArchives,
} from "@/lib/workbench/archives";
import { ensureWorkspace, resolveInSandbox, SandboxError, WORKSPACE_ROOT } from "@/lib/workbench/sandbox";
import { fileMagic } from "@/lib/workbench/archives";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const single = url.searchParams.get("path");
  const withEntries = url.searchParams.get("entries") === "1";

  try {
    await ensureWorkspace();

    if (single) {
      const absolute = resolveInSandbox(single);
      const info = await describeArchive(absolute);
      if (!info) {
        return NextResponse.json(
          { ok: false, error: `${single} is not a recognised archive.`, code: "not_an_archive" },
          { status: 422 },
        );
      }
      const plan = await planExtraction(info.kind);
      const listing = withEntries
        ? await listArchiveEntries(absolute, info.kind)
        : { entries: [], count: 0, truncated: false, method: "not requested" };
      const magic = await fileMagic(absolute);
      return NextResponse.json({
        ok: true,
        data: { archive: info, plan: { ...plan, buildCommand: undefined }, listing, magic },
      });
    }

    const archives = await scanArchives(WORKSPACE_ROOT);
    const kinds = Array.from(new Set(archives.map((archive) => archive.kind)));
    const plans = await Promise.all(
      kinds.map(async (kind) => {
        const plan = await planExtraction(kind);
        return {
          kind,
          label: ARCHIVE_LABELS[kind],
          strategy: plan.strategy,
          tool: plan.tool,
          available: plan.available,
          missingTool: plan.missingTool,
          note: plan.note,
        };
      }),
    );

    return NextResponse.json({
      ok: true,
      data: {
        workspaceRoot: WORKSPACE_ROOT,
        archives,
        plans,
        summary: {
          total: archives.length,
          extractable: archives.filter((archive) =>
            plans.some((plan) => plan.kind === archive.kind && plan.strategy !== "unsupported"),
          ).length,
          totalBytes: archives.reduce((sum, archive) => sum + archive.size, 0),
        },
      },
    });
  } catch (error) {
    if (error instanceof SandboxError) {
      return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Archive scan failed." },
      { status: 500 },
    );
  }
}

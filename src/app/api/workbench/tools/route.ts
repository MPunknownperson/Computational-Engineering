import { NextResponse } from "next/server";
import { db } from "@/db";
import { tools as toolsTable } from "@/db/schema";
import { sql } from "drizzle-orm";
import { detectPackageManager, scanTools, TOOL_CATEGORIES } from "@/lib/workbench/toolchain";
import { reapStaleJobs } from "@/lib/workbench/jobs";

export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const refresh = url.searchParams.get("refresh") === "1";

  await reapStaleJobs().catch(() => 0);

  let rows = await db.select().from(toolsTable);
  const newest = rows.reduce(
    (max, row) => (row.lastCheckedAt && row.lastCheckedAt.getTime() > max ? row.lastCheckedAt.getTime() : max),
    0,
  );
  const stale = rows.length === 0 || Date.now() - newest > CACHE_TTL_MS;

  let packageManager = await detectPackageManager();
  if (refresh || stale) {
    const scan = await scanTools();
    packageManager = scan.packageManager;
    rows = scan.tools;
  }

  const serialised = rows.map((row) => ({
    id: row.id,
    name: row.name,
    binary: row.binary,
    category: row.category,
    purpose: row.purpose,
    packages: row.packages,
    status: row.status,
    version: row.version,
    path: row.path,
    lastCheckedAt: row.lastCheckedAt ? row.lastCheckedAt.toISOString() : null,
    installedAt: row.installedAt ? row.installedAt.toISOString() : null,
  }));

  const byCategory = TOOL_CATEGORIES.map((category) => ({
    category,
    tools: serialised.filter((tool) => tool.category === category),
  })).filter((group) => group.tools.length > 0);

  return NextResponse.json({
    ok: true,
    data: {
      packageManager,
      scannedAt: new Date().toISOString(),
      tools: serialised,
      byCategory,
      summary: {
        total: serialised.length,
        installed: serialised.filter((tool) => tool.status === "installed").length,
        missing: serialised.filter((tool) => tool.status !== "installed").length,
      },
    },
  });
}

export async function HEAD() {
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(toolsTable);
  return NextResponse.json({ ok: true, tools: row?.value ?? 0 });
}

import os from "node:os";
import { db } from "@/db";
import { artifacts as artifactsTable, tools as toolsTable } from "@/db/schema";
import { desc } from "drizzle-orm";
import { scanArchives } from "@/lib/workbench/archives";
import { computeStats, listJobs, summariseJob } from "@/lib/workbench/jobs";
import {
  directorySize,
  ensureWorkspace,
  execShell,
  formatBytes,
  listDirectory,
  SANDBOX_ROOT,
  WORKSPACE_ROOT,
} from "@/lib/workbench/sandbox";
import { detectPackageManager, TOOL_CATALOG, TOOL_CATEGORIES } from "@/lib/workbench/toolchain";

export async function systemInfo() {
  await ensureWorkspace();
  const [entries, size, packageManager, diskResult, load] = await Promise.all([
    listDirectory(WORKSPACE_ROOT).catch(() => []),
    directorySize(WORKSPACE_ROOT).catch(() => 0),
    detectPackageManager(),
    execShell({
      command: "df -Pk /tmp | tail -1",
      cwd: WORKSPACE_ROOT,
      timeoutMs: 8_000,
      privileged: true,
    }),
    Promise.resolve(os.loadavg()),
  ]);

  const parts = diskResult.stdout.trim().split(/\s+/);
  const totalKb = Number(parts[1] ?? 0);
  const usedKb = Number(parts[2] ?? 0);
  const availableKb = Number(parts[3] ?? 0);
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  return {
    sandboxRoot: SANDBOX_ROOT,
    workspaceRoot: WORKSPACE_ROOT,
    packageManager,
    catalogSize: TOOL_CATALOG.length,
    catalogCategories: TOOL_CATEGORIES,
    node: process.version,
    platform: `${os.type()} ${os.release()} · ${os.arch()}`,
    cpuModel: os.cpus()[0]?.model?.replace(/\s+/g, " ").trim() ?? "unknown",
    cpus: os.cpus().length,
    loadAverage: load.map((value) => Number(value.toFixed(2))),
    memory: {
      total: totalMem,
      free: freeMem,
      totalLabel: formatBytes(totalMem),
      freeLabel: formatBytes(freeMem),
      usedLabel: formatBytes(totalMem - freeMem),
      usedPercent: totalMem ? Math.round(((totalMem - freeMem) / totalMem) * 100) : 0,
    },
    uptimeSeconds: Math.round(os.uptime()),
    user: process.env.USER ?? "workbench",
    pid: process.pid,
    workspace: {
      entries: entries.length,
      size,
      sizeLabel: formatBytes(size),
    },
    disk: {
      totalLabel: formatBytes(totalKb * 1024),
      usedLabel: formatBytes(usedKb * 1024),
      availableLabel: formatBytes(availableKb * 1024),
      usedPercent: totalKb ? Math.round((usedKb / totalKb) * 100) : 0,
    },
  };
}

export type SystemInfo = Awaited<ReturnType<typeof systemInfo>>;

export async function getSnapshot() {
  await ensureWorkspace();
  const [stats, recent, toolRows, artifacts, archives, system] = await Promise.all([
    computeStats(),
    listJobs({ limit: 8 }),
    db.select().from(toolsTable),
    db.select().from(artifactsTable).orderBy(desc(artifactsTable.createdAt)).limit(10),
    scanArchives(WORKSPACE_ROOT).catch(() => []),
    systemInfo(),
  ]);

  const installed = toolRows.filter((row) => row.status === "installed").length;

  return {
    system,
    jobs: stats,
    recentJobs: recent.map(summariseJob),
    toolchain: {
      total: toolRows.length || TOOL_CATALOG.length,
      installed,
      missing: Math.max((toolRows.length || TOOL_CATALOG.length) - installed, 0),
      readiness: toolRows.length ? Math.round((installed / toolRows.length) * 100) : 0,
      scannedAt: toolRows.reduce<string | null>(
        (latest, row) =>
          row.lastCheckedAt && (!latest || row.lastCheckedAt.toISOString() > latest)
            ? row.lastCheckedAt.toISOString()
            : latest,
        null,
      ),
      missingByCategory: TOOL_CATEGORIES.map((category) => ({
        category,
        missing: toolRows.filter((row) => row.category === category && row.status !== "installed").length,
        total: toolRows.filter((row) => row.category === category).length,
      })).filter((row) => row.total > 0),
      missingTools: toolRows
        .filter((row) => row.status !== "installed")
        .map((row) => ({ name: row.name, category: row.category, purpose: row.purpose }))
        .slice(0, 12),
      installedSamples: toolRows
        .filter((row) => row.status === "installed")
        .map((row) => ({ name: row.name, version: row.version }))
        .slice(0, 10),
    },
    archives: archives.slice(0, 6),
    archiveCount: archives.length,
    artifacts: artifacts.map((artifact) => ({
      id: artifact.id,
      name: artifact.name,
      path: artifact.path,
      kind: artifact.kind,
      size: artifact.size,
      sizeLabel: formatBytes(artifact.size),
      source: artifact.source,
      detail: artifact.detail,
      createdAt: artifact.createdAt.toISOString(),
    })),
  };
}

export type Snapshot = Awaited<ReturnType<typeof getSnapshot>>;

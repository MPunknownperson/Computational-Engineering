import { db } from "@/db";
import { jobs as jobsTable, type Job } from "@/db/schema";
import { execShell, SandboxError, WORKSPACE_ROOT, type ExecResult } from "@/lib/workbench/sandbox";
import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";

export type JobKind =
  | "shell"
  | "extract"
  | "compress"
  | "install"
  | "upload"
  | "scaffold"
  | "delete"
  | "system";

export type JobStatus = "running" | "succeeded" | "failed" | "blocked";

const MAX_STORED_OUTPUT = 96 * 1024;

export interface RunJobInput {
  kind: JobKind;
  label: string;
  command: string;
  cwd?: string;
  timeoutMs?: number;
  privileged?: boolean;
  meta?: Record<string, unknown>;
  bytesWritten?: number;
  /** Optional hook fired once the job row has its final status. */
  after?: () => Promise<void> | void;
}

function clip(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.length > MAX_STORED_OUTPUT
    ? `${value.slice(0, MAX_STORED_OUTPUT)}\n… [output clipped for storage]`
    : value;
}

export function summariseJob(job: Job) {
  return {
    id: job.id,
    kind: job.kind,
    label: job.label,
    command: job.command,
    cwd: job.cwd,
    status: job.status as JobStatus,
    exitCode: job.exitCode,
    stdout: job.stdout,
    stderr: job.stderr,
    durationMs: job.durationMs,
    bytesWritten: job.bytesWritten,
    meta: job.meta ?? null,
    createdAt: job.createdAt.toISOString(),
    finishedAt: job.finishedAt ? job.finishedAt.toISOString() : null,
  };
}

export type JobSummary = ReturnType<typeof summariseJob>;

/** Inserts a job row, executes it and persists the outcome. */
export async function runJob(input: RunJobInput): Promise<Job> {
  const cwd = input.cwd ?? WORKSPACE_ROOT;
  const [created] = await db
    .insert(jobsTable)
    .values({
      kind: input.kind,
      label: input.label,
      command: input.command,
      cwd,
      status: "running",
      meta: input.meta ?? null,
    })
    .returning();

  let result: ExecResult;
  let blocked: SandboxError | null = null;
  try {
    result = await execShell({
      command: input.command,
      cwd,
      timeoutMs: input.timeoutMs,
      privileged: input.privileged,
    });
  } catch (error) {
    if (error instanceof SandboxError) {
      blocked = error;
      result = {
        stdout: "",
        stderr: error.message,
        exitCode: 126,
        signal: null,
        timedOut: false,
        truncated: false,
        droppedBytes: 0,
        durationMs: 0,
        cwdAfter: cwd,
      };
    } else {
      const message = error instanceof Error ? error.message : String(error);
      result = {
        stdout: "",
        stderr: message,
        exitCode: 1,
        signal: null,
        timedOut: false,
        truncated: false,
        droppedBytes: 0,
        durationMs: 0,
        cwdAfter: cwd,
      };
    }
  }

  const status: JobStatus = blocked
    ? "blocked"
    : result.timedOut
      ? "failed"
      : result.exitCode === 0
        ? "succeeded"
        : "failed";

  const [updated] = await db
    .update(jobsTable)
    .set({
      status,
      exitCode: result.exitCode,
      stdout: clip(result.stdout),
      stderr: clip(result.timedOut ? `${result.stderr}\n[timed out]` : result.stderr),
      durationMs: result.durationMs,
      bytesWritten: input.bytesWritten ?? null,
      cwd: result.cwdAfter,
      meta: {
        ...(input.meta ?? {}),
        signal: result.signal,
        truncated: result.truncated,
        droppedBytes: result.droppedBytes,
        blockedReason: blocked?.code ?? null,
      },
      finishedAt: new Date(),
    })
    .where(eq(jobsTable.id, created!.id))
    .returning();

  if (input.after) {
    try {
      await input.after();
    } catch {
      /* post-job hooks must never fail the job */
    }
  }

  return updated!;
}

/** Fires a long running job and returns its id immediately. */
export async function startJob(input: RunJobInput): Promise<string> {
  const cwd = input.cwd ?? WORKSPACE_ROOT;
  const [created] = await db
    .insert(jobsTable)
    .values({
      kind: input.kind,
      label: input.label,
      command: input.command,
      cwd,
      status: "running",
      meta: input.meta ?? null,
    })
    .returning();

  void (async () => {
    let liveOut = "";
    let liveErr = "";
    let dirty = false;
    const flusher = setInterval(() => {
      if (!dirty) return;
      dirty = false;
      db.update(jobsTable)
        .set({ stdout: clip(liveOut), stderr: clip(liveErr) })
        .where(eq(jobsTable.id, created!.id))
        .catch(() => undefined);
    }, 2_500);

    try {
      const result = await execShell({
        command: input.command,
        cwd,
        timeoutMs: input.timeoutMs ?? 600_000,
        privileged: input.privileged,
        onChunk: (stream, text) => {
          dirty = true;
          if (stream === "stdout") liveOut += text;
          else liveErr += text;
        },
      });
      clearInterval(flusher);
      await db
        .update(jobsTable)
        .set({
          status: result.timedOut || result.exitCode !== 0 ? "failed" : "succeeded",
          exitCode: result.exitCode,
          stdout: clip(result.stdout),
          stderr: clip(result.stderr),
          durationMs: result.durationMs,
          meta: { ...(input.meta ?? {}), truncated: result.truncated, signal: result.signal },
          finishedAt: new Date(),
        })
        .where(eq(jobsTable.id, created!.id));
      if (input.after) {
        try {
          await input.after();
        } catch {
          /* post-job hooks must never fail the job */
        }
      }
    } catch (error) {
      clearInterval(flusher);
      const message = error instanceof Error ? error.message : String(error);
      await db
        .update(jobsTable)
        .set({
          status: "failed",
          exitCode: 1,
          stderr: clip(message),
          durationMs: 0,
          finishedAt: new Date(),
        })
        .where(eq(jobsTable.id, created!.id));
    }
  })();

  return created!.id;
}

/** Records an operation that did not go through bash (uploads, JS extractors). */
export async function recordJob(
  input: Omit<RunJobInput, "cwd"> & {
    cwd?: string;
    status: JobStatus;
    exitCode?: number;
    stdout?: string;
    stderr?: string;
    durationMs?: number;
  },
): Promise<Job> {
  const [created] = await db
    .insert(jobsTable)
    .values({
      kind: input.kind,
      label: input.label,
      command: input.command,
      cwd: input.cwd ?? WORKSPACE_ROOT,
      status: input.status,
      exitCode: input.exitCode ?? (input.status === "succeeded" ? 0 : 1),
      stdout: clip(input.stdout),
      stderr: clip(input.stderr),
      durationMs: input.durationMs ?? 0,
      bytesWritten: input.bytesWritten ?? null,
      meta: input.meta ?? null,
      finishedAt: new Date(),
    })
    .returning();
  return created!;
}

export async function getJob(id: string): Promise<Job | null> {
  const job = await db.query.jobs.findFirst({ where: eq(jobsTable.id, id) });
  return job ?? null;
}

export interface JobFilters {
  kind?: string;
  status?: string;
  query?: string;
  limit?: number;
  before?: string;
}

export async function listJobs(filters: JobFilters = {}): Promise<Job[]> {
  const conditions = [];
  if (filters.kind && filters.kind !== "all") conditions.push(eq(jobsTable.kind, filters.kind));
  if (filters.status && filters.status !== "all")
    conditions.push(eq(jobsTable.status, filters.status));
  if (filters.query) {
    const pattern = `%${filters.query}%`;
    conditions.push(
      or(ilike(jobsTable.label, pattern), ilike(jobsTable.command, pattern), ilike(jobsTable.cwd, pattern))!,
    );
  }
  if (filters.before) {
    const cursor = new Date(filters.before);
    if (!Number.isNaN(cursor.getTime())) {
      conditions.push(sql`${jobsTable.createdAt} < ${cursor}`);
    }
  }

  return db
    .select()
    .from(jobsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(jobsTable.createdAt))
    .limit(Math.min(Math.max(filters.limit ?? 60, 1), 300));
}

export async function computeStats() {
  const [totals] = await db
    .select({
      total: sql<number>`count(*)::int`,
      succeeded: sql<number>`count(*) filter (where ${jobsTable.status} = 'succeeded')::int`,
      failed: sql<number>`count(*) filter (where ${jobsTable.status} = 'failed')::int`,
      blocked: sql<number>`count(*) filter (where ${jobsTable.status} = 'blocked')::int`,
      running: sql<number>`count(*) filter (where ${jobsTable.status} = 'running')::int`,
      last24h: sql<number>`count(*) filter (where ${jobsTable.createdAt} > now() - interval '24 hours')::int`,
      avgDuration: sql<number | null>`avg(${jobsTable.durationMs})::int`,
      bytesWritten: sql<number | null>`coalesce(sum(${jobsTable.bytesWritten}), 0)::bigint`,
    })
    .from(jobsTable);

  const byKind = await db
    .select({ kind: jobsTable.kind, count: sql<number>`count(*)::int` })
    .from(jobsTable)
    .groupBy(jobsTable.kind)
    .orderBy(desc(sql`count(*)`));

  return {
    total: totals?.total ?? 0,
    succeeded: totals?.succeeded ?? 0,
    failed: totals?.failed ?? 0,
    blocked: totals?.blocked ?? 0,
    running: totals?.running ?? 0,
    last24h: totals?.last24h ?? 0,
    avgDurationMs: totals?.avgDuration ?? 0,
    bytesWritten: Number(totals?.bytesWritten ?? 0),
    byKind: byKind.map((row) => ({ kind: row.kind, count: row.count })),
  };
}

/** Clears rows that never finished (e.g. the server restarted mid-job). */
export async function reapStaleJobs(): Promise<number> {
  const stale = await db
    .update(jobsTable)
    .set({
      status: "failed",
      stderr: "Interrupted: the workbench restarted before this job reported back.",
      finishedAt: new Date(),
    })
    .where(and(eq(jobsTable.status, "running"), isNull(jobsTable.finishedAt)))
    .returning();
  return stale.length;
}

export const JOB_KINDS = [
  "shell",
  "extract",
  "compress",
  "install",
  "upload",
  "scaffold",
  "delete",
  "system",
] as const;

export async function jobsByKind(kinds: JobKind[]): Promise<Job[]> {
  if (!kinds.length) return [];
  return db
    .select()
    .from(jobsTable)
    .where(inArray(jobsTable.kind, kinds))
    .orderBy(desc(jobsTable.createdAt))
    .limit(50);
}

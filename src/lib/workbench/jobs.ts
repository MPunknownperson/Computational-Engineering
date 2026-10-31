import { newId, store, type Job } from "@/lib/store";
import { execShell, SandboxError, WORKSPACE_ROOT, type ExecResult } from "@/lib/workbench/sandbox";

export type { Job };

export type JobKind =
  | "shell"
  | "extract"
  | "compress"
  | "install"
  | "upload"
  | "scaffold"
  | "delete"
  | "system"
  | "code";

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

/** Create the "running" row for a job that is about to start. */
function createJob(input: { kind: JobKind; label: string; command: string; cwd: string; status?: JobStatus; meta?: Record<string, unknown> | null }): Job {
  return store.jobs.insert({
    id: newId(),
    kind: input.kind,
    label: input.label,
    command: input.command,
    cwd: input.cwd,
    status: input.status ?? "running",
    exitCode: null,
    stdout: null,
    stderr: null,
    durationMs: null,
    bytesWritten: null,
    meta: input.meta ?? null,
    createdAt: new Date(),
    finishedAt: null,
  });
}

function patchJob(id: string, patch: Partial<Job>): Job | undefined {
  return store.jobs.update((job) => job.id === id, patch)[0];
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

/** Records a job, executes it and stores the outcome. */
export async function runJob(input: RunJobInput): Promise<Job> {
  const cwd = input.cwd ?? WORKSPACE_ROOT;
  const created = createJob({ kind: input.kind, label: input.label, command: input.command, cwd, meta: input.meta ?? null });

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
    const message = error instanceof SandboxError ? error.message : error instanceof Error ? error.message : String(error);
    if (error instanceof SandboxError) blocked = error;
    result = {
      stdout: "",
      stderr: message,
      exitCode: blocked ? 126 : 1,
      signal: null,
      timedOut: false,
      truncated: false,
      droppedBytes: 0,
      durationMs: 0,
      cwdAfter: cwd,
    };
  }

  const status: JobStatus = blocked
    ? "blocked"
    : result.timedOut
      ? "failed"
      : result.exitCode === 0
        ? "succeeded"
        : "failed";

  const updated = patchJob(created.id, {
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
  });

  if (input.after) {
    try {
      await input.after();
    } catch {
      /* post-job hooks must never fail the job */
    }
  }

  return updated ?? created;
}

/** Fires a long running job and returns its id immediately. */
export async function startJob(input: RunJobInput): Promise<string> {
  const cwd = input.cwd ?? WORKSPACE_ROOT;
  const created = createJob({ kind: input.kind, label: input.label, command: input.command, cwd, meta: input.meta ?? null });

  void (async () => {
    let liveOut = "";
    let liveErr = "";
    let dirty = false;
    const flusher = setInterval(() => {
      if (!dirty) return;
      dirty = false;
      patchJob(created.id, { stdout: clip(liveOut), stderr: clip(liveErr) });
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
      patchJob(created.id, {
        status: result.timedOut || result.exitCode !== 0 ? "failed" : "succeeded",
        exitCode: result.exitCode,
        stdout: clip(result.stdout),
        stderr: clip(result.stderr),
        durationMs: result.durationMs,
        meta: { ...(input.meta ?? {}), truncated: result.truncated, signal: result.signal },
        finishedAt: new Date(),
      });
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
      patchJob(created.id, {
        status: "failed",
        exitCode: 1,
        stderr: clip(message),
        durationMs: 0,
        finishedAt: new Date(),
      });
    }
  })();

  return created.id;
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
  const created = createJob({
    kind: input.kind,
    label: input.label,
    command: input.command,
    cwd: input.cwd ?? WORKSPACE_ROOT,
    status: input.status,
    meta: input.meta ?? null,
  });
  return (
    patchJob(created.id, {
      exitCode: input.exitCode ?? (input.status === "succeeded" ? 0 : 1),
      stdout: clip(input.stdout),
      stderr: clip(input.stderr),
      durationMs: input.durationMs ?? 0,
      bytesWritten: input.bytesWritten ?? null,
      finishedAt: new Date(),
    }) ?? created
  );
}

export async function getJob(id: string): Promise<Job | null> {
  return store.jobs.find((job) => job.id === id) ?? null;
}

export interface JobFilters {
  kind?: string;
  status?: string;
  query?: string;
  limit?: number;
  before?: string;
}

export async function listJobs(filters: JobFilters = {}): Promise<Job[]> {
  const needle = filters.query ? filters.query.toLowerCase() : null;
  const cursor = filters.before ? new Date(filters.before) : null;
  const cursorMs = cursor && !Number.isNaN(cursor.getTime()) ? cursor.getTime() : null;

  return store.jobs
    .list((job) => {
      if (filters.kind && filters.kind !== "all" && job.kind !== filters.kind) return false;
      if (filters.status && filters.status !== "all" && job.status !== filters.status) return false;
      if (cursorMs !== null && job.createdAt.getTime() >= cursorMs) return false;
      if (needle) {
        const haystack = `${job.label} ${job.command ?? ""} ${job.cwd ?? ""}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, Math.min(Math.max(filters.limit ?? 60, 1), 300));
}

export async function computeStats() {
  const rows = store.jobs.all();
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const durations = rows.map((row) => row.durationMs ?? 0).filter((value) => value > 0);
  const byKind = new Map<string, number>();
  for (const row of rows) byKind.set(row.kind, (byKind.get(row.kind) ?? 0) + 1);

  return {
    total: rows.length,
    succeeded: rows.filter((row) => row.status === "succeeded").length,
    failed: rows.filter((row) => row.status === "failed").length,
    blocked: rows.filter((row) => row.status === "blocked").length,
    running: rows.filter((row) => row.status === "running").length,
    last24h: rows.filter((row) => row.createdAt.getTime() > since).length,
    avgDurationMs: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
    bytesWritten: rows.reduce((sum, row) => sum + (row.bytesWritten ?? 0), 0),
    byKind: Array.from(byKind, ([kind, count]) => ({ kind, count })),
  };
}

/** Clears rows that never finished (e.g. the server restarted mid-job). */
export async function reapStaleJobs(): Promise<number> {
  const stale = store.jobs.update((job) => job.status === "running" && job.finishedAt === null, {
    status: "failed",
    stderr: "Interrupted: the workbench restarted before this job reported back.",
    finishedAt: new Date(),
  });
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
  "code",
] as const;

export async function jobsByKind(kinds: JobKind[]): Promise<Job[]> {
  if (!kinds.length) return [];
  const set = new Set<string>(kinds);
  return store.jobs
    .list((job) => set.has(job.kind))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 50);
}

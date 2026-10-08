import { spawn } from "node:child_process";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { StringDecoder } from "node:string_decoder";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Everything the workbench touches lives under /tmp, never the host system. */
export const SANDBOX_ROOT = process.env.SANDBOX_ROOT ?? "/tmp";
export const WORKSPACE_ROOT =
  process.env.WORKSPACE_ROOT ?? path.join(SANDBOX_ROOT, "workspace");
const RUN_DIR = path.join(SANDBOX_ROOT, ".workbench-runs");

export class SandboxError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = "bad_request") {
    super(message);
    this.name = "SandboxError";
    this.status = status;
    this.code = code;
  }
}

export async function ensureWorkspace(): Promise<string> {
  await fs.mkdir(WORKSPACE_ROOT, { recursive: true });
  await fs.mkdir(RUN_DIR, { recursive: true });
  return WORKSPACE_ROOT;
}

/** Resolve a user supplied path and refuse anything that escapes the sandbox. */
export function resolveInSandbox(input: string, base = WORKSPACE_ROOT): string {
  const candidate = input?.trim() ? input.trim() : base;
  const absolute = path.isAbsolute(candidate)
    ? path.normalize(candidate)
    : path.resolve(base, candidate);
  const withRoot = absolute === SANDBOX_ROOT;
  if (!withRoot && !absolute.startsWith(SANDBOX_ROOT + path.sep)) {
    throw new SandboxError(
      `Path "${input}" is outside the sandbox root (${SANDBOX_ROOT}).`,
      403,
      "path_outside_sandbox",
    );
  }
  return absolute;
}

export function relativeToSandbox(absolute: string): string {
  const rel = path.relative(SANDBOX_ROOT, absolute);
  return rel === "" ? SANDBOX_ROOT : rel.startsWith("..") ? absolute : rel;
}

/* ------------------------------------------------------------------ *
 * Command guardrails
 * ------------------------------------------------------------------ */

const HARD_DENY: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /:\s*\(\s*\)\s*\{.*\}\s*;\s*:/, reason: "fork bomb pattern" },
  { pattern: /\bmkfs(\.\w+)?\b/, reason: "filesystem formatting is not allowed" },
  { pattern: /\bdd\b[^\n|;]*\bof=\/dev\//, reason: "raw writes to block devices" },
  { pattern: /\b(shutdown|reboot|halt|poweroff|init\s+0|telinit)\b/, reason: "power state changes" },
  { pattern: /\b(mount|umount|losetup|chroot|unshare|nsenter)\b/, reason: "mount/namespace manipulation" },
  { pattern: /\b(iptables|nft|ufw|route)\b\s+(add|delete|-A|-D|-F|-I)/, reason: "firewall/routing changes" },
  { pattern: /\b(useradd|userdel|usermod|groupadd|passwd|chpasswd)\b/, reason: "account management" },
  { pattern: /\bchmod\b[^\n|;]*\s-R\s+777\s+\//, reason: "recursive world-writable root chmod" },
  { pattern: /\bsudo\b/, reason: "sudo is reserved for the Toolchain installer" },
  { pattern: /\bsu\s+-?/, reason: "user switching is not allowed" },
  { pattern: /\bcurl\b[^\n|;]*\|\s*(sudo\s+)?(ba)?sh\b/, reason: "piping a remote script into a shell" },
  { pattern: /\bwget\b[^\n|;]*\|\s*(sudo\s+)?(ba)?sh\b/, reason: "piping a remote script into a shell" },
  { pattern: /\|\s*(sudo\s+)?(ba|z|da)?sh\s*($|;|&|\|)/, reason: "piping a stream into a shell" },
  { pattern: />\s*\/dev\/(sd|nvme|hd|vd)/, reason: "raw writes to block devices" },
  { pattern: /\bcrontab\b/, reason: "scheduled task changes" },
  { pattern: /\bsystemctl\b/, reason: "service manager control" },
];

const MUTATORS =
  /^(rm|rmdir|shred|unlink|mv|cp|chmod|chown|chgrp|truncate|mkdir|touch|tee|ln|dd|install|rename|sed|perl)$/;

const SENSITIVE_ROOTS =
  /^\/(etc|usr|bin|sbin|boot|dev|proc|sys|root|lib|lib64|opt|var|run|srv|media|mnt|home)(\/|$)/;

function tokenize(command: string): string[] {
  return command
    .replace(/(["'])(?:(?!\1)[^\\]|\\.)*\1/g, (m) => m.slice(1, -1))
    .split(/[\s;|&<>()]+/)
    .filter(Boolean);
}

/**
 * Blocks commands that mutate the host outside /tmp or reach for privileged
 * system controls. Read-only inspection of the system is intentionally allowed.
 */
export function assertSafeCommand(command: string): void {
  const trimmed = command.trim();
  if (!trimmed) throw new SandboxError("Empty command.", 400, "empty_command");
  if (trimmed.length > 8000) {
    throw new SandboxError("Command exceeds 8000 characters.", 400, "command_too_long");
  }

  for (const rule of HARD_DENY) {
    if (rule.pattern.test(trimmed)) {
      throw new SandboxError(`Blocked: ${rule.reason}.`, 403, "command_blocked");
    }
  }

  // Mutating verbs must not target absolute paths outside the sandbox.
  const lines = trimmed.split(/\n|;/);
  for (const line of lines) {
    const tokens = tokenize(line);
    let mutating = false;
    for (const token of tokens) {
      const bare = token.replace(/^.*\//, "");
      if (!mutating && MUTATORS.test(bare)) {
        mutating = true;
        continue;
      }
      if (token.startsWith("-")) continue;
      if (token.startsWith("/") && SENSITIVE_ROOTS.test(token)) {
        if (mutating) {
          throw new SandboxError(
            `Blocked: refusing to modify "${token}" outside ${SANDBOX_ROOT}.`,
            403,
            "command_blocked",
          );
        }
      }
    }
  }

  // Redirect targets outside /tmp are refused as well.
  const redirect = /(?:^|[^>])>{1,2}\s*(\/[^\s;|&]+)/g;
  let match: RegExpExecArray | null;
  while ((match = redirect.exec(trimmed))) {
    const target = match[1];
    if (!target.startsWith(SANDBOX_ROOT + path.sep) && target !== SANDBOX_ROOT) {
      throw new SandboxError(
        `Blocked: redirect target "${target}" is outside ${SANDBOX_ROOT}.`,
        403,
        "command_blocked",
      );
    }
  }
}

/* ------------------------------------------------------------------ *
 * Execution
 * ------------------------------------------------------------------ */

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  signal: string | null;
  timedOut: boolean;
  truncated: boolean;
  droppedBytes: number;
  durationMs: number;
  cwdAfter: string;
}

class Collector {
  private head: string[] = [];
  private tail: string[] = [];
  private headBytes = 0;
  private tailBytes = 0;
  private decoder = new StringDecoder("utf8");
  dropped = 0;
  truncated = false;

  constructor(
    private cap = 384 * 1024,
    private tailCap = 32 * 1024,
  ) {}

  push(chunk: Buffer): string {
    const text = this.decoder.write(chunk);
    if (!text) return "";
    if (this.headBytes < this.cap) {
      this.head.push(text);
      this.headBytes += text.length;
      return text;
    }
    this.truncated = true;
    this.dropped += text.length;
    this.tail.push(text);
    this.tailBytes += text.length;
    while (this.tailBytes > this.tailCap && this.tail.length > 1) {
      const removed = this.tail.shift() ?? "";
      this.tailBytes -= removed.length;
      this.dropped -= removed.length;
    }
    return text;
  }

  text(): string {
    if (!this.truncated) return this.head.join("");
    return `${this.head.join("")}\n… [${Math.max(this.dropped, 0)} bytes truncated] …\n${this.tail.join("")}`;
  }
}

function quote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/**
 * Environment handed to a sandboxed command.
 *
 * Deliberately an allowlist rather than a spread of `process.env`: even for an
 * operator who has supplied the workbench API key, an arbitrary shell must not
 * become a way to read the application's secrets (DATABASE_URL, signing keys,
 * third-party tokens) and ship them off-host. A command that genuinely needs a
 * variable gets it explicitly through `options.env`.
 */
const SAFE_ENV_KEYS = [
  "HOME",
  "LANG",
  "LC_ALL",
  "TZ",
  "USER",
  "SHELL",
  "TMPDIR",
] as const;

function sandboxEnv(extra?: Record<string, string>): NodeJS.ProcessEnv {
  const env: Record<string, string> = {};
  for (const key of SAFE_ENV_KEYS) {
    const value = process.env[key];
    if (typeof value === "string") env[key] = value;
  }
  env.TERM = "xterm-256color";
  env.CI = "1";
  env.PATH = `/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${process.env.PATH ?? ""}`;
  env.SANDBOX_ROOT = SANDBOX_ROOT;
  env.WORKSPACE_ROOT = WORKSPACE_ROOT;
  // Next.js types ProcessEnv with a required NODE_ENV; carry only that one
  // framework variable across, never the rest of the host environment.
  return { ...env, ...extra, NODE_ENV: process.env.NODE_ENV ?? "production" };
}

export interface ExecOptions {
  command: string;
  cwd?: string;
  timeoutMs?: number;
  env?: Record<string, string>;
  /** Internal helpers (tool detection, installers) skip the interactive guardrails. */
  privileged?: boolean;
  /** Optional live tap used to stream long-running job output into the database. */
  onChunk?: (stream: "stdout" | "stderr", text: string) => void;
}

const CWD_MARKER = "__WORKBENCH_CWD__";

/** Runs a command through bash inside the sandbox and reports the new cwd. */
export async function execShell(options: ExecOptions): Promise<ExecResult> {
  const started = Date.now();
  const cwd = resolveInSandbox(options.cwd ?? WORKSPACE_ROOT);
  await ensureWorkspace();

  if (!options.privileged) assertSafeCommand(options.command);
  if (!resolveInSandbox(cwd)) throw new SandboxError("Invalid working directory.", 400);

  const script = [
    "#!/usr/bin/env bash",
    `cd ${quote(cwd)} || exit 94`,
    options.command,
    "__workbench_rc=$?",
    `printf '\\n${CWD_MARKER}%s\\n' "$(pwd)"`,
    "exit $__workbench_rc",
    "",
  ].join("\n");

  const scriptPath = path.join(
    RUN_DIR,
    `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.sh`,
  );
  await fs.writeFile(scriptPath, script, { mode: 0o600 });

  const timeoutMs = Math.min(Math.max(options.timeoutMs ?? 30_000, 1_000), 900_000);
  const out = new Collector();
  const err = new Collector(128 * 1024, 16 * 1024);

  const child = spawn("/bin/bash", [scriptPath], {
    cwd,
    env: sandboxEnv(options.env),
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk: Buffer) => {
    const text = out.push(chunk);
    if (text && options.onChunk) options.onChunk("stdout", text);
  });
  child.stderr.on("data", (chunk: Buffer) => {
    const text = err.push(chunk);
    if (text && options.onChunk) options.onChunk("stderr", text);
  });

  const result = await new Promise<{
    exitCode: number;
    signal: string | null;
    timedOut: boolean;
  }>((resolve) => {
    let settled = false;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      err.push(Buffer.from(`\nworkbench: ${error.message}\n`));
      resolve({ exitCode: 127, signal: null, timedOut });
    });

    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        exitCode: code ?? (signal ? 128 : 0),
        signal: signal ?? null,
        timedOut,
      });
    });
  });

  await fs.rm(scriptPath, { force: true }).catch(() => undefined);

  let stdout = out.text();
  let cwdAfter = cwd;
  const markerIndex = stdout.lastIndexOf(CWD_MARKER);
  if (markerIndex >= 0) {
    const after = stdout.slice(markerIndex + CWD_MARKER.length);
    const line = after.split("\n")[0]?.trim();
    if (line) {
      try {
        cwdAfter = resolveInSandbox(line);
      } catch {
        cwdAfter = WORKSPACE_ROOT;
      }
    }
    stdout = (stdout.slice(0, markerIndex) + after.slice(after.indexOf("\n") + 1)).replace(
      /\n$/,
      "",
    );
  }

  return {
    stdout,
    stderr: err.text(),
    exitCode: result.exitCode,
    signal: result.signal,
    timedOut: result.timedOut,
    truncated: out.truncated || err.truncated,
    droppedBytes: out.dropped + err.dropped,
    durationMs: Date.now() - started,
    cwdAfter,
  };
}

/** Small, fixed-argument helper used for tool detection. Never touches user input. */
export async function execTool(
  file: string,
  args: string[],
  timeoutMs = 8_000,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const { stdout, stderr } = await execFileAsync(file, args, {
      timeout: timeoutMs,
      maxBuffer: 1024 * 512,
      env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ""}` },
    });
    return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; code?: number; message?: string };
    return {
      stdout: (err.stdout ?? "").trim(),
      stderr: (err.stderr ?? err.message ?? "").trim(),
      exitCode: typeof err.code === "number" ? err.code : 1,
    };
  }
}

export async function whichBinary(binary: string): Promise<string | null> {
  const result = await execTool("/usr/bin/which", [binary], 4_000);
  if (result.exitCode === 0 && result.stdout) return result.stdout.split("\n")[0]!.trim();
  return null;
}

/* ------------------------------------------------------------------ *
 * Filesystem helpers
 * ------------------------------------------------------------------ */

export interface EntryInfo {
  name: string;
  path: string;
  relative: string;
  type: "file" | "directory" | "symlink" | "other";
  size: number;
  modified: string;
  mode: string;
  extension: string;
}

export async function statEntry(absolute: string): Promise<EntryInfo> {
  const stats = await fs.stat(absolute);
  const lstat = await fs.lstat(absolute);
  const type = lstat.isSymbolicLink()
    ? "symlink"
    : stats.isDirectory()
      ? "directory"
      : stats.isFile()
        ? "file"
        : "other";
  return {
    name: path.basename(absolute),
    path: absolute,
    relative: relativeToSandbox(absolute),
    type,
    size: stats.size,
    modified: stats.mtime.toISOString(),
    mode: (stats.mode & 0o777).toString(8).padStart(3, "0"),
    extension: path.extname(absolute).replace(".", "").toLowerCase(),
  };
}

export async function listDirectory(absolute: string): Promise<EntryInfo[]> {
  const names = await fs.readdir(absolute);
  const entries = await Promise.all(
    names.map(async (name) => {
      try {
        return await statEntry(path.join(absolute, name));
      } catch {
        return null;
      }
    }),
  );
  return entries
    .filter((entry): entry is EntryInfo => entry !== null)
    .sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === "directory" ? -1 : b.type === "directory" ? 1 : 0;
    });
}

export async function directorySize(absolute: string): Promise<number> {
  let total = 0;
  const stack = [absolute];
  let guard = 0;
  while (stack.length && guard < 20_000) {
    guard += 1;
    const current = stack.pop()!;
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile()) {
        try {
          total += (await fs.stat(full)).size;
        } catch {
          /* ignore */
        }
      }
    }
  }
  return total;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}

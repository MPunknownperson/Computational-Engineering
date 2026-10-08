import fs from "node:fs/promises";
import path from "node:path";
import AdmZip from "adm-zip";
import * as tar from "tar";
import {
  execShell,
  execTool,
  formatBytes,
  listDirectory,
  resolveInSandbox,
  whichBinary,
  WORKSPACE_ROOT,
} from "@/lib/workbench/sandbox";
import { recordJob, runJob, type JobSummary, summariseJob } from "@/lib/workbench/jobs";
import { db } from "@/db";
import { artifacts as artifactsTable } from "@/db/schema";

export type ArchiveKind =
  | "zip"
  | "tar"
  | "tar.gz"
  | "tar.bz2"
  | "tar.xz"
  | "tar.zst"
  | "7z"
  | "rar"
  | "gz"
  | "bz2"
  | "xz"
  | "zst"
  | "unknown";

export const ARCHIVE_LABELS: Record<ArchiveKind, string> = {
  zip: "ZIP archive",
  tar: "tar archive",
  "tar.gz": "gzipped tarball",
  "tar.bz2": "bzip2 tarball",
  "tar.xz": "xz tarball",
  "tar.zst": "zstd tarball",
  "7z": "7-Zip archive",
  rar: "RAR archive",
  gz: "gzip stream",
  bz2: "bzip2 stream",
  xz: "xz stream",
  zst: "zstd stream",
  unknown: "unrecognised",
};

const EXTENSION_MAP: Array<[RegExp, ArchiveKind]> = [
  [/\.zip$/i, "zip"],
  [/\.tar\.gz$|\.tgz$/i, "tar.gz"],
  [/\.tar\.bz2$|\.tbz2?$|\.tbz$/i, "tar.bz2"],
  [/\.tar\.xz$|\.txz$/i, "tar.xz"],
  [/\.tar\.zst$|\.tzst$/i, "tar.zst"],
  [/\.tar$/i, "tar"],
  [/\.7z$/i, "7z"],
  [/\.rar$/i, "rar"],
  [/\.gz$/i, "gz"],
  [/\.bz2$/i, "bz2"],
  [/\.xz$/i, "xz"],
  [/\.zst$/i, "zst"],
];

export function kindFromName(name: string): ArchiveKind | null {
  for (const [pattern, kind] of EXTENSION_MAP) if (pattern.test(name)) return kind;
  return null;
}

export function stripArchiveSuffix(name: string): string {
  return name.replace(
    /\.(zip|tar|tgz|tbz2?|txz|tzst|7z|rar|tar\.gz|tar\.bz2|tar\.xz|tar\.zst|gz|bz2|xz|zst)$/i,
    "",
  );
}

/** Pure-JS magic byte sniffing — works even when the `file` utility is absent. */
export async function sniffArchive(absolute: string): Promise<ArchiveKind | null> {
  let handle: fs.FileHandle | null = null;
  try {
    handle = await fs.open(absolute, "r");
    const head = Buffer.alloc(8);
    const { bytesRead } = await handle.read(head, 0, 8, 0);
    const bytes = head.subarray(0, bytesRead);
    if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b) return "zip";
    if (bytes.length >= 3 && bytes[0] === 0x1f && bytes[1] === 0x8b) return "gz";
    if (bytes.length >= 3 && bytes.toString("latin1", 0, 3) === "BZh") return "bz2";
    if (bytes.length >= 6 && bytes.toString("latin1", 0, 6) === "\xfd7zXZ\0") return "xz";
    if (bytes.length >= 6 && bytes.toString("hex", 0, 6) === "377abcaf271c") return "7z";
    if (bytes.length >= 4 && bytes.toString("latin1", 0, 4) === "Rar!") return "rar";
    if (bytes.length >= 4 && bytes.toString("hex", 0, 4) === "28b52ffd") return "zst";

    const ustar = Buffer.alloc(6);
    const second = await handle.read(ustar, 0, 6, 257);
    if (second.bytesRead >= 5 && ustar.toString("latin1", 0, 5) === "ustar") return "tar";
    return null;
  } catch {
    return null;
  } finally {
    await handle?.close();
  }
}

function decompressorFor(kind: ArchiveKind): { binary: string; flag: string } | null {
  switch (kind) {
    case "gz":
      return { binary: "gzip", flag: "-dc" };
    case "bz2":
      return { binary: "bzip2", flag: "-dc" };
    case "xz":
      return { binary: "xz", flag: "-dc" };
    case "zst":
      return { binary: "zstd", flag: "-dc" };
    default:
      return null;
  }
}

/**
 * Turns an ambiguous single-stream extension (.gz) into a concrete kind by
 * asking tar whether the payload is a tarball.
 */
export async function refineKind(absolute: string, initial: ArchiveKind): Promise<ArchiveKind> {
  const streamMap: Record<string, ArchiveKind> = {
    gz: "tar.gz",
    bz2: "tar.bz2",
    xz: "tar.xz",
    zst: "tar.zst",
  };
  const tarKind = streamMap[initial];
  if (!tarKind) return initial;
  if (!(await whichBinary("tar"))) return initial;

  const flag =
    tarKind === "tar.gz"
      ? "-tzf"
      : tarKind === "tar.bz2"
        ? "-tjf"
        : tarKind === "tar.xz"
          ? "-tJf"
          : "--zstd -tf";
  const probe = await execShell({
    command: `tar ${flag} ${JSON.stringify(absolute)} > /dev/null 2>&1`,
    cwd: WORKSPACE_ROOT,
    timeoutMs: 20_000,
    privileged: true,
  });
  return probe.exitCode === 0 ? tarKind : initial;
}

export interface ArchiveInfo {
  name: string;
  path: string;
  relative: string;
  size: number;
  sizeLabel: string;
  modified: string;
  kind: ArchiveKind;
  kindLabel: string;
  extension: string;
}

export async function describeArchive(
  absolute: string,
  entry?: { name: string; size: number; modified: string },
): Promise<ArchiveInfo | null> {
  const name = entry?.name ?? path.basename(absolute);
  let kind = kindFromName(name);
  if (!kind) {
    const sniffed = await sniffArchive(absolute);
    if (!sniffed) return null;
    kind = sniffed;
  } else if (["gz", "bz2", "xz", "zst"].includes(kind)) {
    kind = await refineKind(absolute, kind);
  }
  const stats = entry ?? (await (async () => {
    const s = await fs.stat(absolute);
    return { name, size: s.size, modified: s.mtime.toISOString() };
  })());

  return {
    name,
    path: absolute,
    relative: absolute.replace(`${WORKSPACE_ROOT}/`, ""),
    size: stats.size,
    sizeLabel: formatBytes(stats.size),
    modified: stats.modified,
    kind,
    kindLabel: ARCHIVE_LABELS[kind],
    extension: path.extname(name).replace(".", "").toLowerCase(),
  };
}

/** Recursively scans the sandbox for anything that looks like an archive. */
export async function scanArchives(root = WORKSPACE_ROOT, limit = 400): Promise<ArchiveInfo[]> {
  const found: ArchiveInfo[] = [];
  const stack = [root];
  let guard = 0;
  while (stack.length && guard < 4000 && found.length < limit) {
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
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && entry.name !== ".git") stack.push(full);
        continue;
      }
      if (!entry.isFile()) continue;
      const byName = kindFromName(entry.name);
      if (!byName) continue;
      try {
        const stats = await fs.stat(full);
        const info = await describeArchive(full, {
          name: entry.name,
          size: stats.size,
          modified: stats.mtime.toISOString(),
        });
        if (info) found.push(info);
      } catch {
        /* ignore */
      }
    }
  }
  return found.sort((a, b) => b.modified.localeCompare(a.modified));
}

/* ------------------------------------------------------------------ *
 * Extraction planning
 * ------------------------------------------------------------------ */

export type ExtractionStrategy = "system" | "node" | "unsupported";

export interface ExtractionPlan {
  kind: ArchiveKind;
  strategy: ExtractionStrategy;
  tool: string;
  catalogName: string | null;
  available: boolean;
  missingTool: string | null;
  buildCommand: ((file: string, target: string, overwrite: boolean) => string) | null;
  note: string;
}

const q = (value: string) => JSON.stringify(value);

function nodeSupports(kind: ArchiveKind): boolean {
  return kind === "zip" || kind === "tar" || kind === "tar.gz";
}

export async function planExtraction(kind: ArchiveKind): Promise<ExtractionPlan> {
  const has = async (binary: string) => (await whichBinary(binary)) !== null;

  switch (kind) {
    case "zip": {
      if (await has("unzip"))
        return {
          kind,
          strategy: "system",
          tool: "unzip",
          catalogName: "unzip",
          available: true,
          missingTool: null,
          buildCommand: (file, target, overwrite) =>
            `unzip ${overwrite ? "-o" : "-n"} -q ${q(file)} -d ${q(target)}`,
          note: "Native unzip — fastest path and preserves permissions.",
        };
      if (await has("bsdtar"))
        return {
          kind,
          strategy: "system",
          tool: "bsdtar",
          catalogName: "bsdtar",
          available: true,
          missingTool: null,
          buildCommand: (file, target) => `bsdtar -xf ${q(file)} -C ${q(target)}`,
          note: "libarchive fallback for zip payloads.",
        };
      return {
        kind,
        strategy: "node",
        tool: "node:adm-zip",
        catalogName: "unzip",
        available: true,
        missingTool: "unzip",
        buildCommand: null,
        note: "Using the bundled JavaScript unzipper. Install `unzip` for native speed.",
      };
    }
    case "tar":
    case "tar.gz":
    case "tar.bz2":
    case "tar.xz":
    case "tar.zst": {
      if (await has("tar")) {
        const autoFlag = kind === "tar.zst" ? "--zstd -f" : "-f";
        return {
          kind,
          strategy: "system",
          tool: "tar",
          catalogName: "tar",
          available: true,
          missingTool: null,
          buildCommand: (file, target, overwrite) =>
            `tar -x ${autoFlag} ${q(file)} -C ${q(target)} --no-same-owner ${overwrite ? "--overwrite" : "--skip-old-files"}`,
          note: "GNU tar auto-detects the compression layer.",
        };
      }
      if (await has("bsdtar"))
        return {
          kind,
          strategy: "system",
          tool: "bsdtar",
          catalogName: "bsdtar",
          available: true,
          missingTool: null,
          buildCommand: (file, target) => `bsdtar -xf ${q(file)} -C ${q(target)}`,
          note: "libarchive fallback for tar payloads.",
        };
      if (nodeSupports(kind))
        return {
          kind,
          strategy: "node",
          tool: "node:tar",
          catalogName: "tar",
          available: true,
          missingTool: "tar",
          buildCommand: null,
          note: "Using the bundled JavaScript tar reader.",
        };
      return {
        kind,
        strategy: "unsupported",
        tool: "none",
        catalogName: "tar",
        available: false,
        missingTool: "tar",
        buildCommand: null,
        note: "Install `tar` to extract this payload.",
      };
    }
    case "7z": {
      for (const binary of ["7z", "7za", "7zr"]) {
        if (await has(binary))
          return {
            kind,
            strategy: "system",
            tool: binary,
            catalogName: "7-Zip",
            available: true,
            missingTool: null,
            buildCommand: (file, target, overwrite) =>
              `${binary} x ${overwrite ? "-y" : "-aos"} -o${q(target)} ${q(file)}`,
            note: `Extracting with ${binary}.`,
          };
      }
      if (await has("bsdtar"))
        return {
          kind,
          strategy: "system",
          tool: "bsdtar",
          catalogName: "bsdtar",
          available: true,
          missingTool: null,
          buildCommand: (file, target) => `bsdtar -xf ${q(file)} -C ${q(target)}`,
          note: "libarchive can read many 7z streams.",
        };
      return {
        kind,
        strategy: "unsupported",
        tool: "none",
        catalogName: "7-Zip",
        available: false,
        missingTool: "7-Zip",
        buildCommand: null,
        note: "Install p7zip-full (`7z`) to extract this archive.",
      };
    }
    case "rar": {
      if (await has("bsdtar"))
        return {
          kind,
          strategy: "system",
          tool: "bsdtar",
          catalogName: "bsdtar",
          available: true,
          missingTool: null,
          buildCommand: (file, target) => `bsdtar -xf ${q(file)} -C ${q(target)}`,
          note: "libarchive reads RARv4 streams.",
        };
      if (await has("unrar") || (await has("unrar-free")))
        return {
          kind,
          strategy: "system",
          tool: "unrar",
          catalogName: "unrar",
          available: true,
          missingTool: null,
          buildCommand: (file, target) => `unrar x -y ${q(file)} ${q(target)}/`,
          note: "Extracting with unrar.",
        };
      return {
        kind,
        strategy: "unsupported",
        tool: "none",
        catalogName: "bsdtar",
        available: false,
        missingTool: "bsdtar",
        buildCommand: null,
        note: "Install libarchive-tools (`bsdtar`) to read RAR archives.",
      };
    }
    case "gz":
    case "bz2":
    case "xz":
    case "zst": {
      const spec = decompressorFor(kind)!;
      if (await has(spec.binary))
        return {
          kind,
          strategy: "system",
          tool: spec.binary,
          catalogName: spec.binary === "zstd" ? "zstd" : spec.binary,
          available: true,
          missingTool: null,
          buildCommand: (file, target) =>
            `${spec.binary} ${spec.flag} ${q(file)} > ${q(target)}`,
          note: `Single-stream decompression with ${spec.binary}.`,
        };
      return {
        kind,
        strategy: "unsupported",
        tool: "none",
        catalogName: spec.binary === "zstd" ? "zstd" : spec.binary,
        available: false,
        missingTool: spec.binary === "zstd" ? "zstd" : spec.binary,
        buildCommand: null,
        note: `Install ${spec.binary} to decompress this stream.`,
      };
    }
    default:
      return {
        kind,
        strategy: "unsupported",
        tool: "none",
        catalogName: null,
        available: false,
        missingTool: null,
        buildCommand: null,
        note: "This file does not look like a supported archive.",
      };
  }
}

/* ------------------------------------------------------------------ *
 * Listing + extraction
 * ------------------------------------------------------------------ */

export async function listArchiveEntries(
  absolute: string,
  kind: ArchiveKind,
  limit = 400,
): Promise<{ entries: string[]; count: number; truncated: boolean; method: string }> {
  const run = async (command: string, method: string) => {
    const result = await execShell({ command, cwd: WORKSPACE_ROOT, timeoutMs: 30_000, privileged: true });
    if (result.exitCode !== 0) return null;
    const lines = result.stdout.split("\n").map((l) => l.trim()).filter(Boolean);
    return {
      entries: lines.slice(0, limit),
      count: lines.length,
      truncated: lines.length > limit,
      method,
    };
  };

  if (kind === "zip") {
    if (await whichBinary("unzip")) {
      const res = await run(`unzip -Z1 ${q(absolute)}`, "unzip -Z1");
      if (res) return res;
    }
    try {
      const zip = new AdmZip(absolute);
      const names = zip.getEntries().map((e) => e.entryName);
      return {
        entries: names.slice(0, limit),
        count: names.length,
        truncated: names.length > limit,
        method: "node:adm-zip",
      };
    } catch {
      return { entries: [], count: 0, truncated: false, method: "unavailable" };
    }
  }

  if (kind.startsWith("tar")) {
    const flag =
      kind === "tar.zst" ? "--zstd -tf" : kind === "tar" ? "-tf" : `-t${kind === "tar.gz" ? "z" : kind === "tar.bz2" ? "j" : "J"}f`;
    const res = await run(`tar ${flag} ${q(absolute)}`, `tar ${flag}`);
    if (res) return res;
  }

  if (kind === "7z") {
    for (const binary of ["7z", "7za"]) {
      if (await whichBinary(binary)) {
        const res = await run(`${binary} l -ba ${q(absolute)}`, `${binary} l`);
        if (res) return res;
      }
    }
  }

  if (kind === "rar") {
    const res = await run(`bsdtar -tf ${q(absolute)}`, "bsdtar -tf");
    if (res) return res;
  }

  return { entries: [], count: 0, truncated: false, method: "unavailable" };
}

function isUnsafeEntry(entry: string): boolean {
  return path.isAbsolute(entry) || entry.split("/").includes("..");
}

async function nodeExtract(absolute: string, kind: ArchiveKind, target: string, overwrite: boolean) {
  await fs.mkdir(target, { recursive: true });
  if (kind === "zip") {
    const zip = new AdmZip(absolute);
    const entries = zip.getEntries();
    let written = 0;
    for (const entry of entries) {
      if (isUnsafeEntry(entry.entryName)) continue; // zip-slip guard
      const destination = path.resolve(target, entry.entryName);
      if (!destination.startsWith(target + path.sep)) continue;
      if (entry.isDirectory) {
        await fs.mkdir(destination, { recursive: true });
        continue;
      }
      if (!overwrite) {
        try {
          await fs.access(destination);
          continue;
        } catch {
          /* does not exist — write it */
        }
      }
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, entry.getData());
      written += entry.header.size;
    }
    return { written, entries: entries.length };
  }

  const gzip = kind === "tar.gz";
  await tar.x({
    file: absolute,
    cwd: target,
    gzip,
    keep: !overwrite,
    strict: false,
    filter: (entryPath: string) => !isUnsafeEntry(entryPath),
  });
  const listing = await listDirectory(target);
  return { written: listing.length, entries: listing.length };
}

export interface ExtractRequest {
  archivePath: string;
  target?: string;
  overwrite?: boolean;
  intoSubfolder?: boolean;
}

export interface ExtractResult {
  job: JobSummary;
  plan: ExtractionPlan;
  archive: ArchiveInfo;
  target: string;
  entries: { name: string; type: string; size: number }[];
  totalSize: number;
}

export async function extractArchive(request: ExtractRequest): Promise<ExtractResult> {
  const absolute = resolveInSandbox(request.archivePath);
  const stats = await fs.stat(absolute).catch(() => null);
  if (!stats || !stats.isFile()) {
    throw new Error(`Archive not found: ${request.archivePath}`);
  }

  const archive = await describeArchive(absolute, {
    name: path.basename(absolute),
    size: stats.size,
    modified: stats.mtime.toISOString(),
  });
  if (!archive) throw new Error("Unsupported or unrecognised archive format.");

  const plan = await planExtraction(archive.kind);
  const baseName = stripArchiveSuffix(archive.name) || "extracted";
  const target = resolveInSandbox(
    request.target?.trim()
      ? request.target
      : request.intoSubfolder === false
        ? path.dirname(absolute)
        : path.join(path.dirname(absolute), baseName),
  );
  await fs.mkdir(target, { recursive: true });

  const overwrite = request.overwrite ?? true;
  let job;

  if (plan.strategy === "system" && plan.buildCommand) {
    const command = plan.buildCommand(absolute, target, overwrite);
    job = summariseJob(
      await runJob({
        kind: "extract",
        label: `Extract ${archive.name} → ${path.relative(WORKSPACE_ROOT, target) || target}`,
        command,
        cwd: WORKSPACE_ROOT,
        timeoutMs: 300_000,
        meta: {
          archive: archive.path,
          archiveKind: archive.kind,
          strategy: plan.strategy,
          tool: plan.tool,
          target,
          overwrite,
        },
      }),
    );
  } else if (plan.strategy === "node") {
    const started = Date.now();
    try {
      const result = await nodeExtract(absolute, archive.kind, target, overwrite);
      job = summariseJob(
        await recordJob({
          kind: "extract",
          label: `Extract ${archive.name} → ${path.relative(WORKSPACE_ROOT, target) || target}`,
          command: `node:${plan.tool} extract ${archive.path} → ${target}`,
          cwd: WORKSPACE_ROOT,
          status: "succeeded",
          durationMs: Date.now() - started,
          stdout: `Extracted ${result.entries} entries with the bundled ${plan.tool} reader.`,
          meta: {
            archive: archive.path,
            archiveKind: archive.kind,
            strategy: "node",
            tool: plan.tool,
            target,
            overwrite,
          },
        }),
      );
    } catch (error) {
      job = summariseJob(
        await recordJob({
          kind: "extract",
          label: `Extract ${archive.name}`,
          command: `node:${plan.tool} extract ${archive.path} → ${target}`,
          cwd: WORKSPACE_ROOT,
          status: "failed",
          durationMs: Date.now() - started,
          stderr: error instanceof Error ? error.message : String(error),
          meta: { archive: archive.path, strategy: "node", target },
        }),
      );
    }
  } else {
    job = summariseJob(
      await recordJob({
        kind: "extract",
        label: `Extract ${archive.name}`,
        command: plan.note,
        cwd: WORKSPACE_ROOT,
        status: "blocked",
        exitCode: 127,
        stderr: `${plan.note} Missing tool: ${plan.missingTool ?? "unknown"}.`,
        meta: { archive: archive.path, strategy: "unsupported", missingTool: plan.missingTool },
      }),
    );
  }

  const entries = await listDirectory(target).catch(() => []);
  const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);

  if (job.status === "succeeded") {
    await db
      .insert(artifactsTable)
      .values({
        name: path.basename(target) || archive.name,
        path: target,
        kind: "directory",
        size: totalSize,
        source: "extract",
        detail: `${archive.kindLabel} · ${entries.length} top-level entries via ${plan.tool}`,
      })
      .catch(() => undefined);
  }

  return {
    job,
    plan,
    archive,
    target,
    entries: entries.map((entry) => ({ name: entry.name, type: entry.type, size: entry.size })),
    totalSize,
  };
}

/* ------------------------------------------------------------------ *
 * Compression (the inverse operation)
 * ------------------------------------------------------------------ */

export type CompressFormat = "zip" | "tar.gz" | "tar";

export async function createArchive(options: {
  sources: string[];
  output: string;
  format: CompressFormat;
  overwrite?: boolean;
}): Promise<{ job: JobSummary; output: string; size: number }> {
  const sources = options.sources.map((source) => resolveInSandbox(source));
  if (!sources.length) throw new Error("Select at least one file or folder to archive.");
  const output = resolveInSandbox(options.output);
  await fs.mkdir(path.dirname(output), { recursive: true });

  const parent = path.dirname(sources[0]!);
  const names = sources.map((source) => path.basename(source));
  const list = names.map((name) => q(name)).join(" ");

  const command =
    options.format === "zip"
      ? `cd ${q(parent)} && zip -r -q ${q(output)} ${list}`
      : options.format === "tar.gz"
        ? `tar -czf ${q(output)} -C ${q(parent)} ${list}`
        : `tar -cf ${q(output)} -C ${q(parent)} ${list}`;

  const job = summariseJob(
    await runJob({
      kind: "compress",
      label: `Create ${path.basename(output)} (${options.format})`,
      command,
      cwd: parent,
      timeoutMs: 300_000,
      meta: { format: options.format, sources, output },
    }),
  );

  const size = await fs
    .stat(output)
    .then((s) => s.size)
    .catch(() => 0);

  if (job.status === "succeeded") {
    await db
      .insert(artifactsTable)
      .values({
        name: path.basename(output),
        path: output,
        kind: "archive",
        size,
        source: "compress",
        detail: `${options.format} built from ${sources.length} source(s)`,
      })
      .catch(() => undefined);
  }

  return { job, output, size };
}

export async function toolProbe() {
  const binaries = ["unzip", "zip", "tar", "gzip", "bzip2", "xz", "zstd", "7z", "bsdtar", "file"];
  const results = await Promise.all(
    binaries.map(async (binary) => ({ binary, path: await whichBinary(binary) })),
  );
  return results;
}

export async function fileMagic(absolute: string): Promise<string | null> {
  if (!(await whichBinary("file"))) return null;
  const result = await execTool("file", ["-b", absolute], 8_000);
  return result.exitCode === 0 && result.stdout ? result.stdout : null;
}

import { db } from "@/db";
import { tools as toolsTable } from "@/db/schema";
import { execTool, whichBinary } from "@/lib/workbench/sandbox";
import { eq } from "drizzle-orm";

export type PackageManager = "apt" | "apk" | "dnf" | "npm" | null;

export interface ToolSpec {
  name: string;
  binary: string;
  category: string;
  purpose: string;
  packages: { apt?: string; apk?: string; dnf?: string; npm?: string };
  versionArgs?: string[];
  /** Parse a version string out of noisy --version output. */
  versionParse?: (stdout: string) => string;
}

const firstLine = (value: string) => value.split("\n")[0]?.trim() ?? "";
const versionToken = (value: string) => {
  const match = value.match(/\d+(\.\d+)+([-.][0-9a-zA-Z.+-]+)?/);
  return match ? match[0] : firstLine(value).slice(0, 48);
};

export const TOOL_CATALOG: ToolSpec[] = [
  // --- Archive extraction -------------------------------------------------
  {
    name: "unzip",
    binary: "unzip",
    category: "Archives",
    purpose: "Extracts .zip archives and lists their contents.",
    packages: { apt: "unzip", apk: "unzip", dnf: "unzip" },
    versionArgs: ["-v"],
  },
  {
    name: "zip",
    binary: "zip",
    category: "Archives",
    purpose: "Creates .zip archives from workspace folders.",
    packages: { apt: "zip", apk: "zip", dnf: "zip" },
    versionArgs: ["-v"],
  },
  {
    name: "tar",
    binary: "tar",
    category: "Archives",
    purpose: "Handles .tar, .tar.gz, .tgz, .tar.bz2 and .tar.xz bundles.",
    packages: { apt: "tar", apk: "tar", dnf: "tar" },
    versionArgs: ["--version"],
    versionParse: versionToken,
  },
  {
    name: "gzip",
    binary: "gzip",
    category: "Archives",
    purpose: "Deflate compression for single files and tarballs.",
    packages: { apt: "gzip", apk: "gzip", dnf: "gzip" },
    versionArgs: ["--version"],
    versionParse: versionToken,
  },
  {
    name: "bzip2",
    binary: "bzip2",
    category: "Archives",
    purpose: "Burrows-Wheeler compression used by .bz2 payloads.",
    packages: { apt: "bzip2", apk: "bzip2", dnf: "bzip2" },
    versionArgs: ["--version"],
  },
  {
    name: "xz",
    binary: "xz",
    category: "Archives",
    purpose: "LZMA2 compression used by .xz payloads.",
    packages: { apt: "xz-utils", apk: "xz", dnf: "xz" },
    versionArgs: ["--version"],
    versionParse: versionToken,
  },
  {
    name: "zstd",
    binary: "zstd",
    category: "Archives",
    purpose: "Fast modern compression for .zst and .tar.zst archives.",
    packages: { apt: "zstd", apk: "zstd", dnf: "zstd" },
    versionArgs: ["--version"],
    versionParse: versionToken,
  },
  {
    name: "7-Zip",
    binary: "7z",
    category: "Archives",
    purpose: "Extracts .7z archives and high-ratio bundles.",
    packages: { apt: "p7zip-full", apk: "p7zip", dnf: "p7zip" },
    versionArgs: [],
    versionParse: (out) => versionToken(out.split("\n").slice(0, 3).join(" ")),
  },
  {
    name: "bsdtar",
    binary: "bsdtar",
    category: "Archives",
    purpose: "libarchive reader — a universal fallback for rar, iso, cab and more.",
    packages: { apt: "libarchive-tools", apk: "libarchive-tools", dnf: "bsdtar" },
    versionArgs: ["--version"],
    versionParse: versionToken,
  },
  {
    name: "unrar",
    binary: "unrar",
    category: "Archives",
    purpose: "Extracts .rar archives.",
    packages: { apt: "unrar-free", apk: "unrar", dnf: "unrar" },
    versionArgs: [],
    versionParse: (out) => firstLine(out).slice(0, 48),
  },

  // --- Inspection ---------------------------------------------------------
  {
    name: "file",
    binary: "file",
    category: "Inspection",
    purpose: "Magic-byte identification of uploaded payloads.",
    packages: { apt: "file", apk: "file", dnf: "file" },
    versionArgs: ["--version"],
    versionParse: versionToken,
  },
  {
    name: "tree",
    binary: "tree",
    category: "Inspection",
    purpose: "Renders directory structures after extraction.",
    packages: { apt: "tree", apk: "tree", dnf: "tree" },
    versionArgs: ["--version"],
    versionParse: versionToken,
  },
  {
    name: "jq",
    binary: "jq",
    category: "Inspection",
    purpose: "Queries JSON manifests, lockfiles and API payloads.",
    packages: { apt: "jq", apk: "jq", dnf: "jq" },
    versionArgs: ["--version"],
    versionParse: versionToken,
  },
  {
    name: "ripgrep",
    binary: "rg",
    category: "Inspection",
    purpose: "Fast recursive code search across extracted trees.",
    packages: { apt: "ripgrep", apk: "ripgrep", dnf: "ripgrep" },
    versionArgs: ["--version"],
    versionParse: versionToken,
  },
  {
    name: "sqlite3",
    binary: "sqlite3",
    category: "Inspection",
    purpose: "Opens .sqlite/.db files shipped inside archives.",
    packages: { apt: "sqlite3", apk: "sqlite", dnf: "sqlite" },
    versionArgs: ["--version"],
    versionParse: versionToken,
  },
  {
    name: "patch",
    binary: "patch",
    category: "Inspection",
    purpose: "Applies .diff/.patch files to extracted sources.",
    packages: { apt: "patch", apk: "patch", dnf: "patch" },
    versionArgs: ["--version"],
    versionParse: versionToken,
  },

  // --- Transfer -----------------------------------------------------------
  {
    name: "curl",
    binary: "curl",
    category: "Transfer",
    purpose: "Downloads archives and calls HTTP APIs.",
    packages: { apt: "curl", apk: "curl", dnf: "curl" },
    versionArgs: ["--version"],
    versionParse: versionToken,
  },
  {
    name: "wget",
    binary: "wget",
    category: "Transfer",
    purpose: "Alternative downloader with resume support.",
    packages: { apt: "wget", apk: "wget", dnf: "wget" },
    versionArgs: ["--version"],
    versionParse: versionToken,
  },
  {
    name: "git",
    binary: "git",
    category: "Transfer",
    purpose: "Clones repositories into the workspace.",
    packages: { apt: "git", apk: "git", dnf: "git" },
    versionArgs: ["--version"],
    versionParse: versionToken,
  },
  {
    name: "rsync",
    binary: "rsync",
    category: "Transfer",
    purpose: "Mirrors directories and syncs build artefacts.",
    packages: { apt: "rsync", apk: "rsync", dnf: "rsync" },
    versionArgs: ["--version"],
    versionParse: versionToken,
  },

  // --- Runtimes / build ---------------------------------------------------
  {
    name: "node",
    binary: "node",
    category: "Runtimes",
    purpose: "Executes the Next.js runtime and build pipeline.",
    packages: { apt: "nodejs", apk: "nodejs", dnf: "nodejs" },
    versionArgs: ["--version"],
  },
  {
    name: "npm",
    binary: "npm",
    category: "Runtimes",
    purpose: "Installs JavaScript dependencies.",
    packages: { apt: "npm", apk: "npm", dnf: "npm" },
    versionArgs: ["--version"],
  },
  {
    name: "python3",
    binary: "python3",
    category: "Runtimes",
    purpose: "Scripting fallback for one-off data transforms.",
    packages: { apt: "python3", apk: "python3", dnf: "python3" },
    versionArgs: ["--version"],
  },
  {
    name: "make",
    binary: "make",
    category: "Runtimes",
    purpose: "Builds native node modules from source.",
    packages: { apt: "build-essential", apk: "build-base", dnf: "gcc-c++ make" },
    versionArgs: ["--version"],
    versionParse: versionToken,
  },

  // --- Next.js utilities --------------------------------------------------
  {
    name: "next",
    binary: "next",
    category: "Next.js utilities",
    purpose: "Global Next.js CLI for dev/build/start of workspace apps.",
    packages: { npm: "next" },
    versionArgs: ["--version"],
    versionParse: versionToken,
  },
  {
    name: "create-next-app",
    binary: "create-next-app",
    category: "Next.js utilities",
    purpose: "Scaffolds a new Next.js project inside /tmp/workspace.",
    packages: { npm: "create-next-app" },
    versionArgs: ["--version"],
    versionParse: versionToken,
  },
  {
    name: "typescript",
    binary: "tsc",
    category: "Next.js utilities",
    purpose: "Type-checks scaffolded projects.",
    packages: { npm: "typescript" },
    versionArgs: ["--version"],
    versionParse: versionToken,
  },
  {
    name: "eslint",
    binary: "eslint",
    category: "Next.js utilities",
    purpose: "Lints extracted or scaffolded sources.",
    packages: { npm: "eslint" },
    versionArgs: ["--version"],
    versionParse: versionToken,
  },
  {
    name: "prettier",
    binary: "prettier",
    category: "Next.js utilities",
    purpose: "Formats generated code.",
    packages: { npm: "prettier" },
    versionArgs: ["--version"],
    versionParse: versionToken,
  },
  {
    name: "drizzle-kit",
    binary: "drizzle-kit",
    category: "Next.js utilities",
    purpose: "Generates and pushes Drizzle migrations for workspace apps.",
    packages: { npm: "drizzle-kit" },
    versionArgs: ["--version"],
    versionParse: versionToken,
  },
  {
    name: "pnpm",
    binary: "pnpm",
    category: "Next.js utilities",
    purpose: "Fast alternative package manager for Next.js projects.",
    packages: { npm: "pnpm" },
    versionArgs: ["--version"],
  },

  // --- Media --------------------------------------------------------------
  {
    name: "imagemagick",
    binary: "convert",
    category: "Media",
    purpose: "Converts and inspects images pulled out of archives.",
    packages: { apt: "imagemagick", apk: "imagemagick", dnf: "ImageMagick" },
    versionArgs: ["--version"],
    versionParse: versionToken,
  },
  {
    name: "ffmpeg",
    binary: "ffmpeg",
    category: "Media",
    purpose: "Probes and transcodes bundled media assets.",
    packages: { apt: "ffmpeg", apk: "ffmpeg", dnf: "ffmpeg" },
    versionArgs: ["-version"],
    versionParse: versionToken,
  },
];

export const TOOL_CATEGORIES = Array.from(new Set(TOOL_CATALOG.map((t) => t.category)));

export async function detectPackageManager(): Promise<PackageManager> {
  if (await whichBinary("apt-get")) return "apt";
  if (await whichBinary("apk")) return "apk";
  if (await whichBinary("dnf")) return "dnf";
  if (await whichBinary("yum")) return "dnf";
  if (await whichBinary("npm")) return "npm";
  return null;
}

export interface DetectionResult {
  status: "installed" | "missing";
  version: string | null;
  path: string | null;
}

export async function detectTool(spec: ToolSpec): Promise<DetectionResult> {
  const resolved = await whichBinary(spec.binary);
  if (!resolved) return { status: "missing", version: null, path: null };

  const args = spec.versionArgs ?? ["--version"];
  let version: string | null = null;
  if (args.length >= 0) {
    const result = await execTool(resolved, args, 8_000);
    const raw = result.stdout || result.stderr;
    if (raw) {
      version = spec.versionParse ? spec.versionParse(raw) : versionToken(raw);
    }
  }
  return { status: "installed", version: version?.slice(0, 64) ?? null, path: resolved };
}

/** Probes every catalogued tool and caches the result in Postgres. */
export async function scanTools() {
  const pm = await detectPackageManager();
  const detections = await Promise.all(
    TOOL_CATALOG.map(async (spec) => ({ spec, result: await detectTool(spec) })),
  );

  const rows = [];
  for (const { spec, result } of detections) {
    const existing = await db.query.tools.findFirst({
      where: eq(toolsTable.name, spec.name),
    });
    const values = {
      name: spec.name,
      binary: spec.binary,
      category: spec.category,
      purpose: spec.purpose,
      packages: spec.packages,
      status: result.status,
      version: result.version,
      path: result.path,
      lastCheckedAt: new Date(),
      installedAt:
        result.status === "installed"
          ? (existing?.installedAt ?? (existing?.status === "missing" ? new Date() : new Date()))
          : null,
    };
    if (existing) {
      await db.update(toolsTable).set(values).where(eq(toolsTable.id, existing.id));
      rows.push({ ...existing, ...values, id: existing.id });
    } else {
      const inserted = await db.insert(toolsTable).values(values).returning();
      rows.push(inserted[0]!);
    }
  }

  return { packageManager: pm, tools: rows };
}

export interface InstallPlan {
  spec: ToolSpec;
  packageManager: PackageManager;
  command: string;
  packageName: string;
  runner: "apt" | "apk" | "dnf" | "npm";
}

export function planInstall(
  spec: ToolSpec,
  packageManager: PackageManager,
): InstallPlan | null {
  if (packageManager === "apt" && spec.packages.apt) {
    return {
      spec,
      packageManager,
      runner: "apt",
      packageName: spec.packages.apt,
      command: `sudo -n apt-get install -y ${spec.packages.apt} || (sudo -n apt-get update -qq && sudo -n apt-get install -y ${spec.packages.apt})`,
    };
  }
  if (packageManager === "apk" && spec.packages.apk) {
    return {
      spec,
      packageManager,
      runner: "apk",
      packageName: spec.packages.apk,
      command: `sudo -n apk add --no-cache ${spec.packages.apk}`,
    };
  }
  if (packageManager === "dnf" && spec.packages.dnf) {
    return {
      spec,
      packageManager,
      runner: "dnf",
      packageName: spec.packages.dnf,
      command: `sudo -n dnf install -y ${spec.packages.dnf}`,
    };
  }
  if (spec.packages.npm) {
    return {
      spec,
      packageManager,
      runner: "npm",
      packageName: spec.packages.npm,
      command: `sudo -n npm install --global --no-fund --no-audit ${spec.packages.npm}@latest`,
    };
  }
  if (spec.packages.apt && packageManager !== "apt") {
    // Fall back to apt when the detected manager has no mapping for this tool.
    return {
      spec,
      packageManager: "apt",
      runner: "apt",
      packageName: spec.packages.apt,
      command: `sudo -n apt-get install -y ${spec.packages.apt} || (sudo -n apt-get update -qq && sudo -n apt-get install -y ${spec.packages.apt})`,
    };
  }
  return null;
}

export function specByName(name: string): ToolSpec | undefined {
  return TOOL_CATALOG.find((spec) => spec.name === name || spec.binary === name);
}

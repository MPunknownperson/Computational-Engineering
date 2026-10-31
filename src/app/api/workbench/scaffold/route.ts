import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { startJob } from "@/lib/workbench/jobs";
import { ensureWorkspace, resolveInSandbox, SandboxError, WORKSPACE_ROOT } from "@/lib/workbench/sandbox";

export const dynamic = "force-dynamic";

const NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,59}$/i;

interface ScaffoldBody {
  name?: string;
  typescript?: boolean;
  tailwind?: boolean;
  eslint?: boolean;
  appDir?: boolean;
  srcDir?: boolean;
  importAlias?: string;
  packageManager?: "npm" | "pnpm" | "yarn" | "bun";
  skipInstall?: boolean;
  git?: boolean;
}

export async function POST(request: Request) {
  try {
    await ensureWorkspace();
    const body = (await request.json()) as ScaffoldBody;
    const name = body.name?.trim() ?? "";
    if (!NAME_PATTERN.test(name)) {
      throw new SandboxError(
        "Project name must be 2-60 characters: letters, numbers, dot, dash or underscore.",
        400,
        "invalid_name",
      );
    }

    const target = resolveInSandbox(path.join(WORKSPACE_ROOT, name));
    const existing = await fs.stat(target).catch(() => null);
    if (existing) {
      throw new SandboxError(
        `${name} already exists in the workspace. Pick another name or delete it first.`,
        409,
        "exists",
      );
    }

    const pm = body.packageManager ?? "npm";
    const flags = [
      body.typescript === false ? "--js" : "--ts",
      body.tailwind === false ? "--no-tailwind" : "--tailwind",
      body.eslint === false ? "--no-eslint" : "--eslint",
      body.appDir === false ? "--no-app" : "--app",
      body.srcDir ? "--src-dir" : "--no-src-dir",
      `--import-alias ${JSON.stringify(body.importAlias ?? "@/*")}`,
      `--use-${pm}`,
      "--yes",
    ].join(" ");

    const command = `npx --yes create-next-app@latest ${JSON.stringify(name)} ${flags}${
      body.skipInstall ? " --skip-install" : ""
    }${body.git ? "" : " --disable-git"}`;
    const jobId = await startJob({
      kind: "scaffold",
      label: `Scaffold Next.js app "${name}"`,
      command,
      cwd: WORKSPACE_ROOT,
      timeoutMs: 900_000,
      meta: { project: name, target, packageManager: pm },
    });

    return NextResponse.json({
      ok: true,
      data: {
        jobId,
        target,
        command,
        hint: "create-next-app downloads the toolchain on first run — watch progress in Activity.",
      },
    });
  } catch (error) {
    if (error instanceof SandboxError) {
      return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Scaffold failed." },
      { status: 500 },
    );
  }
}

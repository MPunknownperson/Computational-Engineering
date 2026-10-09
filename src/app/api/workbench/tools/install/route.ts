import { NextResponse } from "next/server";
import { detectPackageManager, planInstall, scanTools, specByName, TOOL_CATALOG } from "@/lib/workbench/toolchain";
import { runJob, startJob, summariseJob } from "@/lib/workbench/jobs";
import { WORKSPACE_ROOT } from "@/lib/workbench/sandbox";

export const dynamic = "force-dynamic";

interface InstallBody {
  name?: string;
  names?: string[];
  wait?: boolean;
}

export async function POST(request: Request) {
  let body: InstallBody;
  try {
    body = (await request.json()) as InstallBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const requested = body.names?.length ? body.names : body.name ? [body.name] : [];
  if (!requested.length) {
    return NextResponse.json({ ok: false, error: "Provide a tool name to install." }, { status: 400 });
  }

  const specs = requested
    .map((name) => specByName(name))
    .filter((spec): spec is NonNullable<typeof spec> => Boolean(spec));

  const unknown = requested.filter((name) => !specByName(name));
  if (!specs.length) {
    return NextResponse.json(
      {
        ok: false,
        error: `No catalogued installer for: ${unknown.join(", ")}. The catalogue covers ${TOOL_CATALOG.length} tools.`,
        code: "unknown_tool",
      },
      { status: 404 },
    );
  }

  const packageManager = await detectPackageManager();
  const plans = specs
    .map((spec) => planInstall(spec, packageManager))
    .filter((plan): plan is NonNullable<typeof plan> => plan !== null);

  if (!plans.length) {
    return NextResponse.json(
      {
        ok: false,
        error: `No installer mapping available for ${specs.map((s) => s.name).join(", ")} with package manager "${packageManager ?? "none"}".`,
        code: "no_installer",
      },
      { status: 422 },
    );
  }

  const command = plans.map((plan) => plan.command).join(" && ");
  const label =
    plans.length === 1
      ? `Install ${plans[0]!.spec.name} (${plans[0]!.runner}: ${plans[0]!.packageName})`
      : `Install ${plans.length} tools (${plans.map((p) => p.spec.name).join(", ")})`;

  const input = {
    kind: "install" as const,
    label,
    command,
    cwd: WORKSPACE_ROOT,
    privileged: true,
    timeoutMs: 600_000,
    meta: {
      tools: plans.map((plan) => plan.spec.name),
      packages: plans.map((plan) => plan.packageName),
      runner: plans[0]!.runner,
      packageManager,
    } as Record<string, unknown>,
    // Re-probe the catalogue so the UI reflects the freshly installed binaries.
    after: async () => {
      await scanTools();
    },
  };

  if (body.wait) {
    const job = await runJob(input);
    return NextResponse.json({
      ok: true,
      data: { job: summariseJob(job), plans: plans.map((p) => ({ tool: p.spec.name, command: p.command })) },
    });
  }

  const jobId = await startJob(input);
  return NextResponse.json({
    ok: true,
    data: {
      jobId,
      background: true,
      plans: plans.map((plan) => ({
        tool: plan.spec.name,
        runner: plan.runner,
        packageName: plan.packageName,
        command: plan.command,
      })),
      skipped: specs.filter((spec) => !plans.some((plan) => plan.spec.name === spec.name)).map((s) => s.name),
    },
  });
}

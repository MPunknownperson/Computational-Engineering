import { NextRequest, NextResponse } from "next/server";
import { evaluate, runSession, solveEquation, solveLinearSystem, numericIntegral, numericDerivative, symbolicDerivative, parseVariableAssignments, formatValue, type AngleMode } from "@/lib/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ANGLES = new Set<AngleMode>(["rad", "deg", "grad"]);
const MAX_SOURCE = 6_000;

/**
 * POST /api/engine — server-side access to the computation engine.
 * Body: { op: "evaluate" | "session" | "solve" | "system" | "integrate" | "derivative", ... }
 * The same grammar policy as the browser calculators applies; nothing is stored.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.op !== "string") return NextResponse.json({ error: "op required" }, { status: 400 });
  const angle = ANGLES.has(body.angle as AngleMode) ? (body.angle as AngleMode) : "rad";
  const source = typeof body.expression === "string" ? body.expression : typeof body.source === "string" ? body.source : "";
  if (source.length > MAX_SOURCE) return NextResponse.json({ error: "input too long" }, { status: 413 });
  const scopeResult = parseVariableAssignments(typeof body.variables === "string" ? body.variables : "", { angle });
  if (!scopeResult.ok) return NextResponse.json({ ok: false, error: scopeResult.error }, { status: 400 });
  const scope = scopeResult.scope;
  const started = performance.now();
  const strip = (value: unknown) => (value && typeof value === "object" ? undefined : value);
  let payload: unknown;
  switch (body.op) {
    case "evaluate": {
      const r = evaluate(source, scope, { angle });
      payload = r.ok ? { ok: true, formatted: r.formatted, type: r.type, value: strip(r.value) } : r;
      break;
    }
    case "session": {
      const s = runSession(source, { angle, scope, budgetMs: 2500 });
      payload = { ok: s.errors === 0, lines: s.lines.map((l) => ({ index: l.index, source: l.source, kind: l.kind, name: l.name, formatted: l.formatted, error: l.error })), variables: s.variables, functions: s.functions };
      break;
    }
    case "solve": {
      payload = solveEquation(source, typeof body.variable === "string" ? body.variable : "x", scope, { angle, guess: typeof body.guess === "number" ? body.guess : undefined });
      if ((payload as { ok: boolean }).ok) payload = { ...(payload as object), solutions: (payload as { solutions: Array<{ formatted: string; method: string; residual?: number }> }).solutions.map((s) => ({ formatted: s.formatted, method: s.method, residual: s.residual })) };
      break;
    }
    case "system": {
      const equations = Array.isArray(body.equations) ? body.equations.filter((e): e is string => typeof e === "string") : source.split(/\n/);
      const unknowns = Array.isArray(body.unknowns) ? body.unknowns.filter((u): u is string => typeof u === "string") : [];
      const r = solveLinearSystem(equations, unknowns, scope);
      payload = r.ok ? { ok: true, values: Object.fromEntries(Object.entries(r.values).map(([k, v]) => [k, formatValue(v)])), residual: r.residual } : r;
      break;
    }
    case "integrate": {
      payload = numericIntegral(source, typeof body.variable === "string" ? body.variable : "x", Number(body.lower), Number(body.upper), scope, { angle });
      break;
    }
    case "derivative": {
      const variable = typeof body.variable === "string" ? body.variable : "x";
      const numeric = numericDerivative(source, variable, Number(body.at ?? 0), scope, { angle });
      payload = { ...numeric, symbolic: symbolicDerivative(source, variable) };
      break;
    }
    default:
      return NextResponse.json({ error: `unknown op "${body.op}"` }, { status: 400 });
  }
  const response = NextResponse.json(payload, { status: 200 });
  response.headers.set("Server-Timing", `engine;dur=${(performance.now() - started).toFixed(1)}`);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

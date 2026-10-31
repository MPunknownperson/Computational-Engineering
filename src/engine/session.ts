/* eslint-disable @typescript-eslint/no-explicit-any */
// Notebook-style evaluation: many lines, one persistent scope.
//
//   r = 0.12 m
//   A = pi * r^2
//   f(x) = x^2 - 2
//   nsolve(f, 1)
//   A to cm^2
//   ans * 2
import { exact, evaluate, formatValue, inspectTree, normalizeExpression, applyAngleMode, typeOfValue, userFacingError, IDENTIFIER, SAFE_CONSTANTS, SAFE_FUNCTIONS, type AngleMode, type FormatOptions } from "./core";

export interface SessionLine {
  index: number;
  source: string;
  kind: "comment" | "blank" | "assignment" | "function" | "expression" | "error";
  name?: string;
  value?: unknown;
  formatted?: string;
  type?: string;
  error?: string;
  ms: number;
}

export interface SessionResult {
  lines: SessionLine[];
  scope: Record<string, unknown>;
  variables: Array<{ name: string; formatted: string; type: string }>;
  functions: string[];
  last?: SessionLine;
  errors: number;
  totalMs: number;
}

export interface SessionOptions { angle?: AngleMode; format?: FormatOptions; scope?: Record<string, unknown>; budgetMs?: number }

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/** Split on newlines and top-level semicolons, respecting brackets and strings. */
export function splitStatements(source: string): string[] {
  const out: string[] = [];
  let depth = 0, start = 0, quote: string | null = null;
  for (let i = 0; i < source.length; i += 1) {
    const c = source[i];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === "(" || c === "[" || c === "{") depth += 1;
    else if (c === ")" || c === "]" || c === "}") depth = Math.max(0, depth - 1);
    else if ((c === "\n" || c === ";") && depth === 0) { out.push(source.slice(start, i)); start = i + 1; }
  }
  out.push(source.slice(start));
  return out;
}

export function runSession(source: string, options: SessionOptions = {}): SessionResult {
  const startedAt = now();
  const scope: Record<string, unknown> = { ...(options.scope ?? {}) };
  const functions = new Set<string>();
  const lines: SessionLine[] = [];
  let errors = 0;
  const budget = options.budgetMs ?? 4000;

  splitStatements(source).forEach((raw, index) => {
    const source = raw.trim();
    const t0 = now();
    if (!source) { lines.push({ index, source, kind: "blank", ms: 0 }); return; }
    if (/^(#|\/\/)/.test(source)) { lines.push({ index, source, kind: "comment", ms: 0 }); return; }
    if (now() - startedAt > budget) { errors += 1; lines.push({ index, source, kind: "error", error: "Time budget exhausted; later lines were skipped.", ms: 0 }); return; }
    try {
      const parsed = exact.parse(normalizeExpression(source));
      inspectTree(exact, parsed, scope, { allowAssignments: true, functions });
      const tree = applyAngleMode(exact, parsed, options.angle ?? "rad");
      const value = tree.compile().evaluate(scope);
      const kind: SessionLine["kind"] = parsed.type === "FunctionAssignmentNode" ? "function" : parsed.type === "AssignmentNode" ? "assignment" : "expression";
      const name = parsed.type === "FunctionAssignmentNode" ? (parsed as any).name : parsed.type === "AssignmentNode" ? (parsed as any).object?.name : undefined;
      if (kind === "function" && name) functions.add(name);
      if (kind !== "function") scope.ans = value;
      lines.push({ index, source, kind, name, value, formatted: kind === "function" ? `${name}(${(parsed as any).params.join(", ")}) defined` : formatValue(value, options.format), type: typeOfValue(exact, value), ms: now() - t0 });
    } catch (error) {
      errors += 1;
      lines.push({ index, source, kind: "error", error: userFacingError(error), ms: now() - t0 });
    }
  });

  const variables = Object.entries(scope)
    .filter(([name, value]) => IDENTIFIER.test(name) && typeof value !== "function" && name !== "ans")
    .map(([name, value]) => ({ name, formatted: formatValue(value, options.format), type: typeOfValue(exact, value) }));
  const evaluated = lines.filter((l) => l.kind === "expression" || l.kind === "assignment");
  return { lines, scope, variables, functions: [...functions], last: evaluated[evaluated.length - 1], errors, totalMs: now() - startedAt };
}

export type ScopeResult = { ok: true; scope: Record<string, unknown> } | { ok: false; scope: Record<string, unknown>; error: string };

/** Parse `a = 2; b = a*pi; g = 9.81 m/s^2` into a scope (no function definitions). */
export function parseVariableAssignments(source: string, options: { angle?: AngleMode } = {}): ScopeResult {
  const scope: Record<string, unknown> = {};
  for (const raw of splitStatements(source.replace(/,(?![^\[\(]*[\]\)])/g, ";"))) {
    const assignment = raw.trim();
    if (!assignment || /^(#|\/\/)/.test(assignment)) continue;
    const eq = findTopLevelEquals(assignment);
    if (eq < 1) return { ok: false, scope, error: "Use name = value for variables (for example, x = 2)." };
    const name = assignment.slice(0, eq).trim();
    const expression = assignment.slice(eq + 1).trim();
    if (!IDENTIFIER.test(name) || SAFE_FUNCTIONS.has(name) || SAFE_CONSTANTS.has(name)) return { ok: false, scope, error: `"${name}" cannot be used as a variable name.` };
    const value = evaluate(expression, scope, { angle: options.angle });
    if (!value.ok) return { ok: false, scope, error: `${name}: ${value.error}` };
    scope[name] = value.value;
  }
  return { ok: true, scope };
}

function findTopLevelEquals(value: string) {
  let depth = 0;
  for (let i = 0; i < value.length; i += 1) {
    const c = value[i];
    if (c === "(" || c === "[" || c === "{") depth += 1;
    if (c === ")" || c === "]" || c === "}") depth = Math.max(0, depth - 1);
    if (c === "=" && depth === 0 && value[i + 1] !== "=" && value[i - 1] !== "=" && value[i - 1] !== ">" && value[i - 1] !== "<" && value[i - 1] !== "!") return i;
  }
  return -1;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// Calculus, solving and sampling built on the engine core.
import {
  exact, fast, compileNumeric, derivativeAt, quadrature, scanRoots, formatValue, inspectTree, normalizeExpression,
  userFacingError, toNumber, toFastValue, type AngleMode, type EvalResult, type FormatOptions,
} from "./core";

export interface AnalysisOptions { angle?: AngleMode; format?: FormatOptions }

const fail = (error: string): EvalResult => ({ ok: false, error });
const okNumber = (value: number, diagnostic?: string, format?: FormatOptions): EvalResult => ({ ok: true, value, formatted: formatValue(value, format), type: "number", diagnostic });

/** Symbolic derivative via mathjs, simplified; null when the expression is not differentiable symbolically. */
export function symbolicDerivative(expression: string, variable = "x", order = 1): string | null {
  try {
    let node: any = exact.parse(normalizeExpression(expression.trim()));
    inspectTree(exact, node, { [variable]: 0 });
    for (let i = 0; i < order; i += 1) node = exact.derivative(node, variable, { simplify: true });
    return node.toString({ parenthesis: "auto", implicit: "show" });
  } catch {
    return null;
  }
}

/** Best-effort simplification under the grammar policy. */
export function simplifyExpression(expression: string, scope: Record<string, unknown> = {}): string | null {
  const trimmed = expression.trim();
  if (!trimmed) return null;
  try {
    const node = exact.parse(normalizeExpression(trimmed));
    inspectTree(exact, node, scope);
    return exact.simplify(node).toString({ parenthesis: "auto", implicit: "show" });
  } catch {
    return null;
  }
}

export function numericDerivative(expression: string, variable = "x", at = 0, scope: Record<string, unknown> = {}, options: AnalysisOptions & { order?: number } = {}): EvalResult {
  if (!Number.isFinite(at)) return fail("Enter a finite point for the derivative.");
  const f = compileNumeric(expression, variable, scope, options.angle);
  if (typeof f !== "function") return fail(f.error);
  const order = Math.max(1, Math.min(4, options.order ?? 1));
  const d = derivativeAt(f, at, order);
  if (!Number.isFinite(d)) return fail("The derivative could not be estimated at this point.");
  return okNumber(d, `order ${order}, Richardson-extrapolated central difference`, options.format);
}

export function numericIntegral(expression: string, variable: string, lower: number, upper: number, scope: Record<string, unknown> = {}, options: AnalysisOptions & { tolerance?: number } = {}): EvalResult {
  if (Number.isNaN(lower) || Number.isNaN(upper)) return fail("Enter numeric integration limits (Infinity is allowed).");
  if (lower === upper) return okNumber(0, undefined, options.format);
  const f = compileNumeric(expression, variable, scope, options.angle);
  if (typeof f !== "function") return fail(f.error);
  const q = quadrature(f, lower, upper, options.tolerance ?? 1e-11);
  if (!Number.isFinite(q.value)) return fail("The integral does not converge on this interval.");
  return okNumber(q.value, `adaptive Gauss–Kronrod 7–15, ${q.evaluations} evaluations, error ≈ ${q.error.toExponential(1)}`, options.format);
}

export type RootsResult = { ok: true; roots: number[]; diagnostic: string } | { ok: false; error: string };

export function findRoots(expression: string, variable: string, lower: number, upper: number, scope: Record<string, unknown> = {}, options: AnalysisOptions = {}): RootsResult {
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower >= upper) return { ok: false, error: "Enter two finite limits with left smaller than right." };
  const f = compileNumeric(expression, variable, scope, options.angle);
  if (typeof f !== "function") return { ok: false, error: f.error };
  const roots = scanRoots(f, lower, upper);
  return { ok: true, roots, diagnostic: `${roots.length} sign change${roots.length === 1 ? "" : "s"} refined with Brent's method` };
}

/** Backwards-compatible single root (first root in the interval). */
export function bracketedRoot(expression: string, variable: string, lower: number, upper: number, scope: Record<string, unknown> = {}, options: AnalysisOptions = {}): EvalResult {
  const r = findRoots(expression, variable, lower, upper, scope, options);
  if (!r.ok) return fail(r.error);
  if (r.roots.length === 0) return fail("The interval must contain a sign change.");
  return okNumber(r.roots[0], r.roots.length > 1 ? `${r.roots.length} roots found; showing the smallest` : r.diagnostic, options.format);
}

export interface Extremum { x: number; y: number; kind: "minimum" | "maximum" }

export function findExtrema(expression: string, variable: string, lower: number, upper: number, scope: Record<string, unknown> = {}, options: AnalysisOptions = {}): { ok: true; extrema: Extremum[] } | { ok: false; error: string } {
  const f = compileNumeric(expression, variable, scope, options.angle);
  if (typeof f !== "function") return { ok: false, error: f.error };
  const df = (x: number) => derivativeAt(f, x, 1);
  const stationary = scanRoots(df, lower, upper, 400);
  const extrema: Extremum[] = [];
  for (const x of stationary) {
    const second = derivativeAt(f, x, 2);
    const y = f(x);
    if (!Number.isFinite(y) || Math.abs(second) < 1e-9) continue;
    extrema.push({ x, y, kind: second > 0 ? "minimum" : "maximum" });
  }
  return { ok: true, extrema };
}

export interface SamplePoint { x: number; y: number | null }

/** Evaluate an expression on a grid (fast evaluator); non-finite values become null gaps. */
export function sampleFunction(expression: string, variable: string, lower: number, upper: number, count = 240, scope: Record<string, unknown> = {}, options: AnalysisOptions = {}): { ok: true; points: SamplePoint[]; min: number; max: number } | { ok: false; error: string } {
  const f = compileNumeric(expression, variable, scope, options.angle);
  if (typeof f !== "function") return { ok: false, error: f.error };
  const points: SamplePoint[] = [];
  let min = Infinity, max = -Infinity;
  const n = Math.max(2, Math.min(2000, count));
  for (let i = 0; i < n; i += 1) {
    const x = lower + ((upper - lower) * i) / (n - 1);
    let y: number | null;
    try { y = f(x); } catch { y = null; }
    if (y === null || !Number.isFinite(y)) y = null; else { min = Math.min(min, y); max = Math.max(max, y); }
    points.push({ x, y });
  }
  return { ok: true, points, min, max };
}

/** Taylor polynomial of `expression` about `at` up to `order`, as coefficient list and printable series. */
export function taylorSeries(expression: string, variable: string, at: number, order: number, scope: Record<string, unknown> = {}): { ok: true; coefficients: number[]; series: string } | { ok: false; error: string } {
  const f = compileNumeric(expression, variable, scope);
  if (typeof f !== "function") return { ok: false, error: f.error };
  const n = Math.max(0, Math.min(8, Math.round(order)));
  const coefficients: number[] = [];
  let node: any;
  try {
    node = fast.parse(normalizeExpression(expression.trim()));
  } catch (error) {
    return { ok: false, error: userFacingError(error) };
  }
  const fastScope: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(scope)) fastScope[k] = toFastValue(v);
  let factorial = 1;
  for (let k = 0; k <= n; k += 1) {
    if (k > 0) factorial *= k;
    let value: number;
    try {
      // Symbolic derivative where possible; numeric fallback otherwise.
      value = fast.number(node.compile().evaluate({ ...fastScope, [variable]: at }) as any);
      node = fast.derivative(node, variable, { simplify: true });
    } catch {
      value = derivativeAt(f, at, Math.min(4, k) as 1 | 2 | 3 | 4);
    }
    if (!Number.isFinite(value)) return { ok: false, error: `The series does not exist at ${variable} = ${at}.` };
    coefficients.push(value / factorial);
  }
  const terms = coefficients.map((c, k) => {
    if (Math.abs(c) < 1e-14) return null;
    const coefficient = formatValue(Number(c.toPrecision(10)), { precision: 10 });
    const shift = at === 0 ? variable : `(${variable} ${at < 0 ? "+" : "-"} ${Math.abs(at)})`;
    if (k === 0) return coefficient;
    const power = k === 1 ? shift : `${shift}^${k}`;
    return coefficient === "1" ? power : coefficient === "-1" ? `-${power}` : `${coefficient}·${power}`;
  }).filter(Boolean) as string[];
  return { ok: true, coefficients, series: terms.length ? terms.join(" + ").replace(/\+ -/g, "- ") : "0" };
}

/** Numeric limit using Richardson-style two-sided approach with shrinking steps. */
export function numericLimit(expression: string, variable: string, at: number, scope: Record<string, unknown> = {}, options: AnalysisOptions = {}): EvalResult {
  const f = compileNumeric(expression, variable, scope, options.angle);
  if (typeof f !== "function") return fail(f.error);
  if (!Number.isFinite(at)) {
    const sign = at > 0 ? 1 : -1;
    const samples = [1e3, 1e5, 1e7, 1e9].map((m) => f(sign * m)).filter(Number.isFinite);
    if (samples.length < 2) return fail("The expression could not be evaluated near that limit.");
    const last = samples[samples.length - 1];
    if (Math.abs(last) > 1e12) return okNumber(last > 0 ? Infinity : -Infinity, "diverges", options.format);
    return okNumber(last, "numeric estimate at large magnitude", options.format);
  }
  const left: number[] = [], right: number[] = [];
  for (const h of [1e-2, 1e-4, 1e-6, 1e-8]) { const l = f(at - h), r = f(at + h); if (Number.isFinite(l)) left.push(l); if (Number.isFinite(r)) right.push(r); }
  if (!left.length || !right.length) return fail("The expression could not be evaluated near that point.");
  const l = left[left.length - 1], r = right[right.length - 1];
  const scale = Math.max(1, Math.abs(l), Math.abs(r));
  if (Math.abs(l - r) > 1e-5 * scale) return fail(`Left (${formatValue(l, { precision: 8 })}) and right (${formatValue(r, { precision: 8 })}) limits differ.`);
  if (Math.abs(l) > 1e12) return okNumber(l > 0 ? Infinity : -Infinity, "diverges", options.format);
  return okNumber((l + r) / 2, "two-sided numeric estimate", options.format);
}

/* ------------------------------------------------------------------------ */
/* Equation solving                                                          */
/* ------------------------------------------------------------------------ */

export interface Solution { value: unknown; formatted: string; residual?: number; method: string }
export type SolveResult = { ok: true; solutions: Solution[]; method: string } | { ok: false; error: string };

export function splitEquation(equation: string): { lhs: string; rhs: string } | null {
  let depth = 0;
  for (let i = 0; i < equation.length; i += 1) {
    const c = equation[i];
    if (c === "(" || c === "[" || c === "{") depth += 1;
    else if (c === ")" || c === "]" || c === "}") depth -= 1;
    else if (c === "=" && depth === 0 && equation[i + 1] !== "=" && equation[i - 1] !== "=" && equation[i - 1] !== "!" && equation[i - 1] !== "<" && equation[i - 1] !== ">") {
      return { lhs: equation.slice(0, i).trim(), rhs: equation.slice(i + 1).trim() };
    }
  }
  return null;
}

/** Variables referenced by an expression that are not functions, constants or units. */
export function freeVariables(expression: string, scope: Record<string, unknown> = {}): string[] {
  try {
    const node = exact.parse(normalizeExpression(expression.trim()));
    const names = new Set<string>();
    node.traverse((n: any, _path: string, parent: any) => {
      if (n.type !== "SymbolNode") return;
      if (parent?.type === "FunctionNode" && parent.fn === n) return;
      const name = n.name as string;
      if (name in scope) { names.add(name); return; }
      let unit = false;
      try { unit = (exact as any).Unit.isValuelessUnit(name); } catch { /* not a unit */ }
      if (unit) return;
      try { if ((exact as any)[name] !== undefined && typeof (exact as any)[name] !== "function") return; } catch { /* ignore */ }
      if (typeof (exact as any)[name] === "function") return;
      names.add(name);
    });
    return [...names];
  } catch {
    return [];
  }
}

/**
 * Solve `lhs = rhs` (or `expr = 0`) for one variable.
 * 1. Exact: polynomial up to degree 3 via rationalize + polynomialRoot (complex roots included).
 * 2. Numeric: sign-change scan on a wide interval refined with Brent, plus Newton from the guess.
 */
export function solveEquation(equation: string, variable: string, scope: Record<string, unknown> = {}, options: AnalysisOptions & { guess?: number; lower?: number; upper?: number; unit?: string } = {}): SolveResult {
  const parts = splitEquation(equation) ?? { lhs: equation, rhs: "0" };
  if (!parts.lhs) return { ok: false, error: "Enter an equation such as x^2 - 5x + 6 = 0." };
  const residualExpr = `(${parts.lhs}) - (${parts.rhs})`;
  const fmt = options.format;

  // --- exact polynomial path ----------------------------------------------
  if (!options.unit) try {
    const node = exact.parse(normalizeExpression(residualExpr));
    inspectTree(exact, node, { ...scope, [variable]: 0 });
    const resolvedScope: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(scope)) if (k !== variable && typeof v !== "function") resolvedScope[k] = v;
    const rational: any = exact.rationalize(node, resolvedScope, true);
    const coefficients: unknown[] = rational.coefficients ?? [];
    const vars: string[] = rational.variables ?? [];
    if (vars.length === 1 && vars[0] === variable && coefficients.length >= 2 && coefficients.length <= 4) {
      const roots: unknown[] = coefficients.length === 2
        ? [exact.divide(exact.unaryMinus(coefficients[0] as any), coefficients[1] as any)]
        : (exact as any).polynomialRoot(...coefficients);
      const solutions: Solution[] = roots.map((r) => ({ value: r, formatted: formatValue(r, fmt), method: "exact" }));
      const degree = coefficients.length - 1;
      return { ok: true, solutions, method: degree === 1 ? "linear (exact)" : degree === 2 ? "quadratic formula (exact)" : "cubic (exact)" };
    }
  } catch {
    // not a polynomial in the variable — numeric path below
  }

  // --- numeric path -----------------------------------------------------------
  const f = compileNumeric(residualExpr, variable, scope, options.angle, options.unit);
  if (typeof f !== "function") return { ok: false, error: f.error };
  const lower = options.lower ?? -1000, upper = options.upper ?? 1000;
  const found = new Set<number>();
  // Multi-scale scan: fine near the origin, coarse far out.
  for (const [a, b, n] of [[-10, 10, 800], [lower, upper, 1200]] as Array<[number, number, number]>) {
    for (const r of scanRoots(f, a, b, n)) found.add(Number(r.toPrecision(13)));
  }
  if (options.guess !== undefined && Number.isFinite(options.guess)) {
    let x = options.guess;
    for (let i = 0; i < 100; i += 1) {
      const fx = f(x); if (!Number.isFinite(fx)) break;
      if (Math.abs(fx) < 1e-13) { found.add(Number(x.toPrecision(13))); break; }
      const d = derivativeAt(f, x, 1); if (!Number.isFinite(d) || d === 0) break;
      const next = x - fx / d;
      if (Math.abs(next - x) < 1e-14 * Math.max(1, Math.abs(x))) { found.add(Number(next.toPrecision(13))); break; }
      x = next;
    }
  }
  const solutions = [...found].sort((p, q) => p - q).map((x) => ({ value: x, formatted: formatValue(x, fmt), residual: Math.abs(f(x)), method: "numeric" }));
  if (solutions.length === 0) return { ok: false, error: `No real solution for ${variable} was found between ${lower} and ${upper}. Try a different range or starting guess.` };
  return { ok: true, solutions, method: "numeric (sign-change scan + Brent/Newton refinement)" };
}

/** Solve a square linear system written as equations, e.g. ["2x + y = 5", "x - y = 1"]. */
export function solveLinearSystem(equations: string[], variables: string[], scope: Record<string, unknown> = {}): { ok: true; values: Record<string, number>; residual: number } | { ok: false; error: string } {
  const eqs = equations.map((e) => e.trim()).filter(Boolean);
  if (eqs.length === 0) return { ok: false, error: "Enter at least one equation." };
  if (eqs.length !== variables.length) return { ok: false, error: `${eqs.length} equation(s) but ${variables.length} unknown(s); a square system is required.` };
  const fns: Array<(v: number[]) => number> = [];
  for (const eq of eqs) {
    const parts = splitEquation(eq) ?? { lhs: eq, rhs: "0" };
    const expr = normalizeExpression(`(${parts.lhs}) - (${parts.rhs})`);
    try {
      const node = fast.parse(expr);
      const zero: Record<string, unknown> = {}; for (const v of variables) zero[v] = 0;
      inspectTree(fast, node, { ...scope, ...zero });
      const code = node.compile();
      const base: Record<string, unknown> = {}; for (const [k, v] of Object.entries(scope)) base[k] = toFastValue(v);
      fns.push((vals) => { const s: Record<string, unknown> = { ...base }; variables.forEach((v, i) => { s[v] = vals[i]; }); return fast.number(code.evaluate(s) as any); });
    } catch (error) {
      return { ok: false, error: `${eq}: ${userFacingError(error)}` };
    }
  }
  const n = variables.length;
  const zeros = new Array(n).fill(0);
  const A: number[][] = [], b: number[] = [];
  try {
    for (const g of fns) {
      const c = g(zeros);
      const row = variables.map((_, j) => { const e = zeros.slice(); e[j] = 1; return g(e) - c; });
      // Linearity check with a second probe.
      const probe = variables.map((_, j) => (j + 2) * 1.5);
      const predicted = c + row.reduce((s, a, j) => s + a * probe[j], 0);
      if (Math.abs(predicted - g(probe)) > 1e-7 * Math.max(1, Math.abs(predicted))) return { ok: false, error: "At least one equation is not linear in the unknowns. Use the single-equation solver for non-linear problems." };
      A.push(row); b.push(-c);
    }
    const x = (fast.lusolve as any)(A, b) as number[][];
    const values: Record<string, number> = {};
    const flat = x.map((r) => (Array.isArray(r) ? r[0] : (r as unknown as number)));
    variables.forEach((v, i) => { values[v] = flat[i]; });
    const residual = Math.max(...fns.map((g) => Math.abs(g(flat))));
    return { ok: true, values, residual };
  } catch (error) {
    const msg = userFacingError(error);
    return { ok: false, error: /singular/i.test(msg) ? "The system is singular: the equations are dependent or inconsistent." : msg };
  }
}

/** Descriptive statistics for a numeric list. */
export function describe(values: number[]) {
  const n = values.length;
  if (n === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((s, v) => s + v, 0);
  const mean = sum / n;
  const variance = n > 1 ? values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1) : 0;
  const std = Math.sqrt(variance);
  const q = (p: number) => { const r = p * (n - 1); const lo = Math.floor(r), hi = Math.ceil(r); return sorted[lo] + (sorted[hi] - sorted[lo]) * (r - lo); };
  const skew = n > 2 && std > 0 ? (values.reduce((s, v) => s + ((v - mean) / std) ** 3, 0) * n) / ((n - 1) * (n - 2)) : 0;
  return { n, sum, mean, std, variance, min: sorted[0], max: sorted[n - 1], median: q(0.5), q1: q(0.25), q3: q(0.75), rms: Math.sqrt(values.reduce((s, v) => s + v * v, 0) / n), skew, range: sorted[n - 1] - sorted[0] };
}

/** Parse a free-form list of numbers ("1, 2 3; 4") into doubles. */
export function parseNumberList(text: string): number[] {
  return text.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean).map((t) => { const r = toNumber(exact.evaluate(normalizeExpression(t))); return r ?? NaN; }).filter((v) => Number.isFinite(v));
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// Custom-formula toolkit: a formula is an expression plus a set of named
// variables that may carry units, descriptions and uncertainties. The toolkit
// evaluates it, solves it for any variable, sweeps a parameter, ranks the
// sensitivity of the result to each input and propagates uncertainty.
import { evaluate, compileScoped, derivativeAt, formatValue, toNumber, toSINumber, unitSafeScope, exact, type AngleMode, type FormatOptions } from "./core";
import { solveEquation, freeVariables } from "./analysis";

export interface FormulaVariable {
  name: string;
  value: string;        // expression text, may include units, e.g. "12 kN"
  description?: string;
  uncertainty?: string; // absolute ± in the same unit, expression text
}

export interface FormulaSpec {
  name: string;
  expression: string;
  description?: string;
  variables: FormulaVariable[];
  resultUnit?: string;  // optional "to" conversion applied to the result
  tags?: string;
}

export interface FormulaOptions { angle?: AngleMode; format?: FormatOptions }

/** Build a scope from the variable table; returns the first error if any. */
export function buildScope(variables: FormulaVariable[], options: FormulaOptions = {}): { ok: true; scope: Record<string, unknown> } | { ok: false; error: string; scope: Record<string, unknown> } {
  const scope: Record<string, unknown> = {};
  for (const v of variables) {
    const name = v.name.trim();
    if (!name) continue;
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return { ok: false, error: `"${name}" is not a valid variable name.`, scope };
    if (!v.value.trim()) return { ok: false, error: `Give ${name} a value.`, scope };
    // Earlier variables may be referenced, but unit symbols (m, s, V, A …)
    // always mean the unit inside a value such as "27 m/s".
    const r = evaluate(v.value, unitSafeScope(scope), { angle: options.angle });
    if (!r.ok) return { ok: false, error: `${name}: ${r.error}`, scope };
    scope[name] = r.value;
  }
  return { ok: true, scope };
}

/** Apply the optional result-unit conversion outside the variable scope (so a variable named `m` cannot shadow metres). */
function convertResult(value: unknown, resultUnit: string | undefined, format?: FormatOptions): { ok: true; value: unknown; formatted: string } | { ok: false; error: string } {
  const target = resultUnit?.trim();
  if (!target) return { ok: true, value, formatted: formatValue(value, format) };
  try {
    const converted = exact.to(value as any, exact.unit(target) as any);
    return { ok: true, value: converted, formatted: formatValue(converted, format) };
  } catch {
    return { ok: false, error: `The result cannot be expressed in ${target}.` };
  }
}

export function evaluateFormula(spec: FormulaSpec, options: FormulaOptions = {}) {
  const built = buildScope(spec.variables, options);
  if (!built.ok) return { ok: false as const, error: built.error };
  const r = evaluate(spec.expression, built.scope, { angle: options.angle, format: options.format });
  if (!r.ok) return r;
  const converted = convertResult(r.value, spec.resultUnit, options.format);
  if (!converted.ok) return converted;
  return { ...r, value: converted.value, formatted: converted.formatted, scope: built.scope };
}

/** Variables the expression uses that have no row in the table yet. */
export function missingVariables(expression: string, variables: FormulaVariable[]): string[] {
  const defined = new Set(variables.map((v) => v.name.trim()));
  return freeVariables(expression).filter((name) => !defined.has(name));
}

/** Unit string of a variable's current value ("" when dimensionless). */
function unitOf(variable: FormulaVariable | undefined, scope: Record<string, unknown>, angle?: AngleMode): string {
  if (!variable?.value.trim()) return "";
  const cv = evaluate(variable.value, unitSafeScope(scope), { angle });
  if (cv.ok && exact.typeOf(cv.value as any) === "Unit") return (cv.value as any).formatUnits?.() ?? "";
  return "";
}

/** Solve `expression = target` for `unknown`, holding every other variable fixed. */
export function solveFormulaFor(spec: FormulaSpec, unknown: string, target: string, options: FormulaOptions & { guess?: number } = {}) {
  const others = spec.variables.filter((v) => v.name.trim() !== unknown);
  const built = buildScope(others, options);
  if (!built.ok) return { ok: false as const, error: built.error };
  const targetValue = evaluate(target, unitSafeScope(built.scope), { angle: options.angle });
  if (!targetValue.ok) return { ok: false as const, error: `Target: ${targetValue.error}` };
  const unit = unitOf(spec.variables.find((v) => v.name.trim() === unknown), built.scope, options.angle);
  const rhs = exact.typeOf(targetValue.value as any) === "Unit" ? `(${(targetValue.value as any).toString()})` : String(toNumber(targetValue.value) ?? target);
  const solved = solveEquation(`${spec.expression} = ${rhs}`, unknown, built.scope, { angle: options.angle, format: options.format, guess: options.guess, unit: unit || undefined });
  if (!solved.ok) return solved;
  return { ok: true as const, method: solved.method, unit, solutions: solved.solutions.map((s) => ({ ...s, formatted: unit ? `${s.formatted} ${unit}` : s.formatted })) };
}

export interface SweepRow { input: number; output: number | null; formatted: string }

/** Vary one variable linearly from `from` to `to` in `steps` points (in the variable's own unit). */
export function sweepFormula(spec: FormulaSpec, variable: string, from: number, to: number, steps: number, options: FormulaOptions = {}): { ok: true; rows: SweepRow[]; unit: string } | { ok: false; error: string } {
  const others = spec.variables.filter((v) => v.name.trim() !== variable);
  const built = buildScope(others, options);
  if (!built.ok) return { ok: false, error: built.error };
  const unit = unitOf(spec.variables.find((v) => v.name.trim() === variable), built.scope, options.angle);
  const n = Math.max(2, Math.min(200, Math.round(steps)));
  const rows: SweepRow[] = [];
  for (let i = 0; i < n; i += 1) {
    const x = from + ((to - from) * i) / (n - 1);
    const big = exact.bignumber(x.toPrecision(17));
    const value = unit ? exact.unit(big as any, unit) : big;
    const r = evaluate(spec.expression, { ...built.scope, [variable]: value }, { angle: options.angle, format: options.format });
    const c = r.ok ? convertResult(r.value, spec.resultUnit, options.format) : r;
    rows.push({ input: x, output: c.ok ? toNumber(c.value) : null, formatted: c.ok ? c.formatted : "—" });
  }
  return { ok: true, rows, unit };
}

export interface Sensitivity { name: string; partial: number; elasticity: number | null; share: number }

/** Numeric (SI-magnitude) view of a scope for the fast evaluator. */
function numericView(scope: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(scope)) { const n = toSINumber(v); if (n !== null) out[k] = n; }
  return out;
}

/** Partial derivatives of the result with respect to each numeric input, plus normalised shares (SI magnitudes). */
export function sensitivity(spec: FormulaSpec, options: FormulaOptions = {}): { ok: true; items: Sensitivity[]; base: number } | { ok: false; error: string } {
  const built = buildScope(spec.variables, options);
  if (!built.ok) return { ok: false, error: built.error };
  const numericScope = numericView(built.scope);
  const f = compileScoped(spec.expression, numericScope, options.angle);
  if (typeof f !== "function") return { ok: false, error: f.error };
  const base = f({});
  if (!Number.isFinite(base)) return { ok: false, error: "Sensitivity needs a real numeric result." };
  const items: Sensitivity[] = [];
  for (const name of Object.keys(numericScope)) {
    if (!new RegExp(`\\b${name}\\b`).test(spec.expression)) continue;
    const partial = derivativeAt((x) => f({ [name]: x }), numericScope[name], 1);
    if (!Number.isFinite(partial)) continue;
    const elasticity = base !== 0 ? (partial * numericScope[name]) / base : null;
    items.push({ name, partial, elasticity, share: 0 });
  }
  const total = items.reduce((s, i) => s + Math.abs(i.elasticity ?? 0), 0) || 1;
  for (const item of items) item.share = Math.abs(item.elasticity ?? 0) / total;
  items.sort((a, b) => b.share - a.share);
  return { ok: true, items, base };
}

export interface UncertaintyResult {
  mean: number; std: number; relative: number | null; p05: number; p95: number; samples: number;
  contributions: Array<{ name: string; sigma: number; partial: number; contribution: number; share: number }>;
  method: string;
}

/** First-order (Gaussian) error propagation cross-checked by a seeded Monte-Carlo run. Magnitudes are SI. */
export function propagateUncertainty(spec: FormulaSpec, options: FormulaOptions & { samples?: number } = {}): { ok: true; result: UncertaintyResult } | { ok: false; error: string } {
  const built = buildScope(spec.variables, options);
  if (!built.ok) return { ok: false, error: built.error };
  const numericScope = numericView(built.scope);
  const sigmas: Record<string, number> = {};
  for (const v of spec.variables) {
    if (!v.uncertainty?.trim()) continue;
    const r = evaluate(v.uncertainty, unitSafeScope(built.scope), { angle: options.angle });
    const n = r.ok ? toSINumber(r.value) : null;
    if (n === null) return { ok: false, error: `Uncertainty of ${v.name}: ${r.ok ? "must be a real number" : r.error}` };
    sigmas[v.name.trim()] = Math.abs(n);
  }
  const names = Object.keys(sigmas);
  if (names.length === 0) return { ok: false, error: "Add a ± uncertainty to at least one variable." };
  const f = compileScoped(spec.expression, numericScope, options.angle);
  if (typeof f !== "function") return { ok: false, error: f.error };
  const base = f({});
  if (!Number.isFinite(base)) return { ok: false, error: "Uncertainty propagation needs a real numeric result." };
  const contributions = names.map((name) => {
    const partial = derivativeAt((x) => f({ [name]: x }), numericScope[name], 1);
    const contribution = Number.isFinite(partial) ? (partial * sigmas[name]) ** 2 : 0;
    return { name, sigma: sigmas[name], partial: Number.isFinite(partial) ? partial : 0, contribution, share: 0 };
  });
  const variance = contributions.reduce((s, c) => s + c.contribution, 0);
  for (const c of contributions) c.share = variance > 0 ? c.contribution / variance : 0;
  const linearStd = Math.sqrt(variance);

  // Monte-Carlo with a deterministic xorshift generator so results are reproducible.
  const count = Math.max(200, Math.min(20000, options.samples ?? 4000));
  let seed = 0x9e3779b9;
  const rand = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1_000_000) / 1_000_000; };
  const gauss = () => { const u = Math.max(1e-12, rand()), v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const samples: number[] = [];
  const overrides: Record<string, number> = {};
  for (let i = 0; i < count; i += 1) {
    for (const name of names) overrides[name] = numericScope[name] + gauss() * sigmas[name];
    const y = f(overrides);
    if (Number.isFinite(y)) samples.push(y);
  }
  samples.sort((a, b) => a - b);
  const mean = samples.reduce((s, v) => s + v, 0) / Math.max(1, samples.length);
  const mcStd = Math.sqrt(samples.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, samples.length - 1));
  const pick = (p: number) => samples[Math.min(samples.length - 1, Math.floor(p * samples.length))] ?? NaN;
  const std = Number.isFinite(mcStd) && samples.length > 50 ? mcStd : linearStd;
  return {
    ok: true,
    result: { mean: samples.length ? mean : base, std, relative: base !== 0 ? std / Math.abs(base) : null, p05: pick(0.05), p95: pick(0.95), samples: samples.length, contributions: contributions.sort((a, b) => b.share - a.share), method: `first-order propagation (σ = ${formatValue(linearStd, { precision: 6 })}) cross-checked by ${samples.length} Monte-Carlo samples` },
  };
}

/* ------------------------------------------------------------------------ */
/* Engineering formula library                                               */
/* ------------------------------------------------------------------------ */

export interface LibraryFormula extends FormulaSpec { id: string; domain: string }

export const FORMULA_LIBRARY: LibraryFormula[] = [
  { id: "compound-interest", domain: "Finance", name: "Compound interest", description: "Future value with periodic compounding", expression: "P * (1 + r/n)^(n*t)", variables: [
    { name: "P", value: "1000", description: "Principal" }, { name: "r", value: "0.05", description: "Annual rate" }, { name: "n", value: "12", description: "Periods per year" }, { name: "t", value: "10", description: "Years" }] },
  { id: "loan-payment", domain: "Finance", name: "Loan payment", description: "Level payment per period", expression: "-pmt(r/12, 12*years, principal)", variables: [
    { name: "principal", value: "250000" }, { name: "r", value: "0.065", description: "Annual rate" }, { name: "years", value: "30" }] },
  { id: "ohm-power", domain: "Electrical", name: "Power from voltage and resistance", description: "P = V² / R", expression: "V^2 / R", resultUnit: "W", variables: [
    { name: "V", value: "12 V", uncertainty: "0.1 V" }, { name: "R", value: "8 ohm", uncertainty: "0.4 ohm" }] },
  { id: "rc-time", domain: "Electrical", name: "RC time constant", description: "τ = R·C, charged to 63.2 % after one τ", expression: "R * C", resultUnit: "ms", variables: [
    { name: "R", value: "10 kohm" }, { name: "C", value: "47 uF" }] },
  { id: "voltage-divider", domain: "Electrical", name: "Voltage divider", description: "Output of a resistive divider", expression: "Vin * R2 / (R1 + R2)", resultUnit: "V", variables: [
    { name: "Vin", value: "5 V" }, { name: "R1", value: "10 kohm" }, { name: "R2", value: "4.7 kohm" }] },
  { id: "beam-deflection", domain: "Structural", name: "Cantilever tip deflection", description: "δ = F·L³ / (3·E·I) for a point load at the free end", expression: "F * L^3 / (3 * E * I)", resultUnit: "mm", variables: [
    { name: "F", value: "2 kN", description: "Tip load" }, { name: "L", value: "1.5 m", description: "Length" }, { name: "E", value: "200 GPa", description: "Young's modulus (steel)" }, { name: "I", value: "8.5e-6 m^4", description: "Second moment of area" }] },
  { id: "axial-stress", domain: "Structural", name: "Axial stress", description: "σ = F / A", expression: "F / A", resultUnit: "MPa", variables: [
    { name: "F", value: "50 kN", uncertainty: "1 kN" }, { name: "A", value: "(20 mm)^2", uncertainty: "4 mm^2" }] },
  { id: "euler-buckling", domain: "Structural", name: "Euler critical buckling load", description: "P_cr = π²·E·I / (K·L)²", expression: "pi^2 * E * I / (K * L)^2", resultUnit: "kN", variables: [
    { name: "E", value: "200 GPa" }, { name: "I", value: "1.2e-6 m^4" }, { name: "K", value: "1", description: "Effective length factor" }, { name: "L", value: "3 m" }] },
  { id: "reynolds", domain: "Fluids", name: "Reynolds number", description: "Re = ρ·v·D / μ — laminar below ≈ 2300 in a pipe", expression: "rho * v * D / mu", variables: [
    { name: "rho", value: "998 kg/m^3" }, { name: "v", value: "1.2 m/s" }, { name: "D", value: "50 mm" }, { name: "mu", value: "1.002e-3 Pa s" }] },
  { id: "bernoulli-velocity", domain: "Fluids", name: "Torricelli outflow velocity", description: "v = √(2·g·h)", expression: "sqrt(2 * g0 * h)", resultUnit: "m/s", variables: [{ name: "h", value: "4 m" }] },
  { id: "darcy-weisbach", domain: "Fluids", name: "Darcy–Weisbach head loss", description: "h_f = f·(L/D)·v²/(2g)", expression: "f * (L / D) * v^2 / (2 * g0)", resultUnit: "m", variables: [
    { name: "f", value: "0.02", description: "Friction factor" }, { name: "L", value: "120 m" }, { name: "D", value: "100 mm" }, { name: "v", value: "2 m/s" }] },
  { id: "heat-conduction", domain: "Thermal", name: "Conduction through a wall", description: "Q = k·A·ΔT / d", expression: "k * A * dT / d", resultUnit: "W", variables: [
    { name: "k", value: "0.8 W/(m K)", description: "Conductivity" }, { name: "A", value: "12 m^2" }, { name: "dT", value: "20 K" }, { name: "d", value: "200 mm" }] },
  { id: "ideal-gas", domain: "Thermal", name: "Ideal gas pressure", description: "p = n·R·T / V", expression: "n * gasConstant * T / V", resultUnit: "kPa", variables: [
    { name: "n", value: "2 mol" }, { name: "T", value: "300 K" }, { name: "V", value: "50 L" }] },
  { id: "projectile-range", domain: "Mechanics", name: "Projectile range", description: "R = v²·sin(2θ) / g", expression: "v^2 * sin(2 * theta) / g0", resultUnit: "m", variables: [
    { name: "v", value: "30 m/s" }, { name: "theta", value: "35 deg" }] },
  { id: "kinetic-energy", domain: "Mechanics", name: "Kinetic energy", description: "E = ½·m·v²", expression: "1/2 * m * v^2", resultUnit: "kJ", variables: [
    { name: "m", value: "1200 kg", uncertainty: "20 kg" }, { name: "v", value: "27 m/s", uncertainty: "0.5 m/s" }] },
  { id: "pendulum-period", domain: "Mechanics", name: "Pendulum period", description: "T = 2π·√(L/g)", expression: "2 * pi * sqrt(L / g0)", resultUnit: "s", variables: [{ name: "L", value: "0.8 m" }] },
  { id: "gear-ratio-torque", domain: "Mechanical", name: "Output torque through a gear train", description: "T_out = T_in · ratio · efficiency", expression: "T_in * ratio * eta", resultUnit: "N m", variables: [
    { name: "T_in", value: "12 N m" }, { name: "ratio", value: "4.5" }, { name: "eta", value: "0.94" }] },
  { id: "radioactive-decay", domain: "Physics", name: "Radioactive decay", description: "N = N₀·e^(−λt), λ = ln2 / t½", expression: "N0 * exp(-log(2) / half * t)", variables: [
    { name: "N0", value: "1e6" }, { name: "half", value: "5730", description: "Half-life (years)" }, { name: "t", value: "2000", description: "Elapsed years" }] },
  { id: "quadratic-root", domain: "Mathematics", name: "Quadratic positive root", description: "(−b + √(b² − 4ac)) / 2a", expression: "(-b + sqrt(b^2 - 4*a*c)) / (2*a)", variables: [
    { name: "a", value: "1" }, { name: "b", value: "-5" }, { name: "c", value: "6" }] },
  { id: "bmi", domain: "Everyday", name: "Body-mass index", description: "mass / height²", expression: "m / h^2", resultUnit: "kg/m^2", variables: [{ name: "m", value: "72 kg" }, { name: "h", value: "1.78 m" }] },
];

export function findLibraryFormula(id: string | null | undefined) {
  return id ? FORMULA_LIBRARY.find((f) => f.id === id) : undefined;
}

/** Serialise the variable table for storage. */
export function serializeVariables(variables: FormulaVariable[]): string {
  return JSON.stringify(variables.filter((v) => v.name.trim()));
}

export function parseStoredVariables(raw: string | null | undefined, fallbackScopeText?: string | null): FormulaVariable[] {
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((v) => v && typeof v.name === "string").map((v) => ({ name: String(v.name), value: String(v.value ?? ""), description: v.description ? String(v.description) : undefined, uncertainty: v.uncertainty ? String(v.uncertainty) : undefined }));
    } catch { /* fall through */ }
  }
  if (fallbackScopeText) {
    return fallbackScopeText.split(/[;\n]/).map((s) => s.trim()).filter(Boolean).map((s) => { const i = s.indexOf("="); return i > 0 ? { name: s.slice(0, i).trim(), value: s.slice(i + 1).trim() } : null; }).filter(Boolean) as FormulaVariable[];
  }
  return [];
}

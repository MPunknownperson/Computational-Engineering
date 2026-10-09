"use client";

import { all, create, type MathJsStatic } from "mathjs";

// Use decimal arithmetic for literals and normal arithmetic wherever the maths
// library supports it. This avoids many of the familiar 0.1 + 0.2 binary-float
// surprises while remaining compatible with units, matrices and complex values.
const math = create(all, {
  number: "BigNumber",
  precision: 64,
  predictable: true,
  matrix: "Array",
}) as MathJsStatic;

export type EvalResult =
  | { ok: true; value: unknown; formatted: string; diagnostic?: string }
  | { ok: false; error: string };

export type ScopeResult =
  | { ok: true; scope: Record<string, unknown> }
  | { ok: false; scope: Record<string, unknown>; error: string };

const MAX_EXPRESSION_LENGTH = 4_000;
const MAX_AST_NODES = 1_500;
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

const SAFE_FUNCTIONS = new Set([
  "abs", "acos", "acosh", "add", "arg", "asin", "asinh", "atan", "atan2", "atanh",
  "bignumber", "bin", "ceil", "combinations", "complex", "conj", "cos", "cosh", "cross",
  "csc", "csch", "cube", "cbrt", "det", "diag", "divide", "dot", "e", "exp", "factorial",
  "fix", "floor", "gcd", "hypot", "im", "inv", "lcm", "log", "log10", "log2", "lusolve",
  "max", "mean", "median", "min", "mod", "multiply", "nthRoot", "norm", "ones", "pow",
  "prod", "re", "round", "sec", "sech", "sign", "sin", "sinh", "size", "sqrt", "square",
  "std", "subset", "sum", "tan", "tanh", "trace", "transpose", "unit", "variance", "zeros",
]);

const SAFE_CONSTANTS = new Set(["pi", "e", "i", "Infinity", "NaN", "true", "false"]);
// Common unit identifiers accepted by the expression grammar. Unit conversion
// remains inside the maths evaluator; these are not arbitrary scope names.
const SAFE_UNIT_SYMBOLS = new Set([
  "m", "meter", "metre", "km", "kilometer", "kilometre", "cm", "mm", "in", "inch", "ft", "foot", "yd", "yard", "mi", "mile", "nmi", "g", "kg", "mg", "lb", "oz",
  "s", "second", "min", "minute", "h", "hour", "d", "day", "week", "year", "L", "l", "liter", "litre", "mL", "ml", "gal", "galUS", "galUK", "pt", "pint", "cup",
  "m2", "m3", "mps", "mph", "kmh", "Hz", "N", "Pa", "J", "W", "V", "A", "ohm", "F", "C",
  "K", "kelvin", "deg", "degC", "degF", "rad", "bit", "byte", "B", "KB", "MB", "GB", "TB",
]);

const UNIT_ALIASES: Array<[RegExp, string]> = [
  [/\bmph\b/g, "mile / hour"],
  [/\bkmh\b/g, "km / hour"],
  [/\bmps\b/g, "m / second"],
  [/\bmi\b/g, "mile"],
  [/\bhr\b/g, "hour"],
];
const DISALLOWED_NODE_TYPES = new Set([
  "AssignmentNode", "FunctionAssignmentNode", "BlockNode", "AccessorNode", "ObjectNode",
  "ObjectPropertyNode", "UpdateNode",
]);
const ALLOWED_NODE_TYPES = new Set([
  "ConstantNode", "SymbolNode", "OperatorNode", "ParenthesisNode", "FunctionNode", "ArrayNode",
  "MatrixNode", "RangeNode", "IndexNode", "ConditionalNode", "RelationalNode", "LogicalNode",
]);

function inspectExpression(expr: string, scope: Record<string, unknown>) {
  const node = math.parse(expr);
  let count = 0;
  node.traverse((n: any) => {
    count += 1;
    if (count > MAX_AST_NODES) throw new Error("Expression is too complex to evaluate safely.");
    if (DISALLOWED_NODE_TYPES.has(n.type) || !ALLOWED_NODE_TYPES.has(n.type)) {
      throw new Error(`Unsupported expression feature: ${n.type}.`);
    }
    if (n.type === "FunctionNode") {
      if (n.fn?.type !== "SymbolNode" || !SAFE_FUNCTIONS.has(n.fn.name)) {
        throw new Error("That function is not available in this calculator.");
      }
    }
    if (n.type === "SymbolNode") {
      const name = n.name;
      if (!SAFE_FUNCTIONS.has(name) && !SAFE_CONSTANTS.has(name) && !SAFE_UNIT_SYMBOLS.has(name) && !(name in scope)) {
        throw new Error(`Unknown value: "${name}".`);
      }
    }
  });
  return node;
}

/** Evaluate an expression within a restricted, math-only grammar. */
export function safeEvaluate(expr: string, scope: Record<string, unknown> = {}): EvalResult {
  const trimmed = expr.trim();
  if (!trimmed) return { ok: false, error: "Enter an expression." };
  if (trimmed.length > MAX_EXPRESSION_LENGTH) {
    return { ok: false, error: `Keep expressions under ${MAX_EXPRESSION_LENGTH.toLocaleString()} characters.` };
  }
  const normalised = normalizeUnits(trimmed);

  try {
    inspectExpression(normalised, scope);
    const value = math.evaluate(normalised, scope);
    return { ok: true, value, formatted: formatValue(value) };
  } catch (error: unknown) {
    return { ok: false, error: userFacingError(error) };
  }
}

/** Parse sequential assignments such as `a = 2; b = a*pi; g = 9.81 m/s^2`. */
export function parseVariableAssignments(source: string): ScopeResult {
  const scope: Record<string, unknown> = {};
  const entries = splitTopLevel(source, new Set([",", ";", "\n"]));

  for (const raw of entries) {
    const assignment = raw.trim();
    if (!assignment) continue;
    const equals = findTopLevelEquals(assignment);
    if (equals < 1) {
      return { ok: false, scope, error: `Use name = value for variables (for example, x = 2).` };
    }
    const name = assignment.slice(0, equals).trim();
    const valueExpression = assignment.slice(equals + 1).trim();
    if (!IDENTIFIER.test(name) || SAFE_FUNCTIONS.has(name) || SAFE_CONSTANTS.has(name)) {
      return { ok: false, scope, error: `"${name}" cannot be used as a variable name.` };
    }
    const value = safeEvaluate(valueExpression, scope);
    if (!value.ok) return { ok: false, scope, error: `${name}: ${value.error}` };
    scope[name] = value.value;
  }
  return { ok: true, scope };
}

function normalizeUnits(expression: string) {
  return UNIT_ALIASES.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), expression);
}

function splitTopLevel(value: string, separators: Set<string>) {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (char === "(" || char === "[" || char === "{") depth += 1;
    if (char === ")" || char === "]" || char === "}") depth = Math.max(0, depth - 1);
    if (depth === 0 && separators.has(char)) {
      parts.push(value.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(value.slice(start));
  return parts;
}

function findTopLevelEquals(value: string) {
  let depth = 0;
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (char === "(" || char === "[" || char === "{") depth += 1;
    if (char === ")" || char === "]" || char === "}") depth = Math.max(0, depth - 1);
    if (char === "=" && depth === 0 && value[i + 1] !== "=" && value[i - 1] !== "=" && value[i - 1] !== ">" && value[i - 1] !== "<") return i;
  }
  return -1;
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  try {
    if (typeof value === "number") {
      if (!Number.isFinite(value)) return String(value);
      return math.format(value, { precision: 16, lowerExp: -10, upperExp: 16 });
    }
    if (typeof value === "object") {
      return math.format(value as any, { precision: 16, lowerExp: -10, upperExp: 16 });
    }
  } catch {
    // Fall through to a normal string conversion below.
  }
  return String(value);
}

/** Best-effort symbolic simplification under the same restricted grammar. */
export function simplify(expr: string, scope: Record<string, unknown> = {}): string | null {
  const trimmed = expr.trim();
  if (!trimmed || trimmed.length > MAX_EXPRESSION_LENGTH) return null;
  const normalised = normalizeUnits(trimmed);
  try {
    inspectExpression(normalised, scope);
    return math.simplify(normalised).toString();
  } catch {
    return null;
  }
}

/** Numerical derivative using a scale-aware central difference. */
export function numericDerivative(
  expr: string,
  variable = "x",
  at = 0,
  scope: Record<string, unknown> = {},
): EvalResult {
  if (!Number.isFinite(at)) return { ok: false, error: "Enter a finite point for the derivative." };
  const h = Math.cbrt(Number.EPSILON) * Math.max(1, Math.abs(at));
  const left = safeEvaluate(expr, { ...scope, [variable]: decimalPoint(at - h) });
  const right = safeEvaluate(expr, { ...scope, [variable]: decimalPoint(at + h) });
  if (!left.ok) return left;
  if (!right.ok) return right;
  const a = numericValue(left.value);
  const b = numericValue(right.value);
  if (a === null || b === null) return { ok: false, error: "The derivative needs a real numeric result." };
  const derivative = (b - a) / (2 * h);
  if (!Number.isFinite(derivative)) return { ok: false, error: "The derivative could not be estimated at this point." };
  return { ok: true, value: derivative, formatted: formatValue(derivative), diagnostic: `central difference with step ${h.toExponential(2)}` };
}

/** Adaptive Simpson integration for a real-valued expression over [a, b]. */
export function numericIntegral(
  expr: string,
  variable: string,
  lower: number,
  upper: number,
  scope: Record<string, unknown> = {},
  tolerance = 1e-9,
): EvalResult {
  if (!Number.isFinite(lower) || !Number.isFinite(upper)) return { ok: false, error: "Enter finite integration limits." };
  if (lower === upper) return { ok: true, value: 0, formatted: "0" };
  const f = (x: number): number | null => {
    const result = safeEvaluate(expr, { ...scope, [variable]: decimalPoint(x) });
    return result.ok ? numericValue(result.value) : null;
  };
  const fa = f(lower), fb = f(upper), mid = (lower + upper) / 2, fm = f(mid);
  if (fa === null || fb === null || fm === null) return { ok: false, error: "The integral needs a real numeric result across the interval." };
  const whole = simpson(lower, upper, fa, fm, fb);
  const answer = adaptiveSimpson(f, lower, upper, fa, fm, fb, whole, tolerance, 20);
  if (answer === null || !Number.isFinite(answer)) return { ok: false, error: "The integral could not be estimated over this interval." };
  return { ok: true, value: answer, formatted: formatValue(answer), diagnostic: "adaptive Simpson estimate" };
}

function simpson(a: number, b: number, fa: number, fm: number, fb: number) {
  return ((b - a) / 6) * (fa + 4 * fm + fb);
}

function adaptiveSimpson(
  f: (x: number) => number | null,
  a: number, b: number, fa: number, fm: number, fb: number,
  whole: number, tolerance: number, depth: number,
): number | null {
  const mid = (a + b) / 2;
  const leftMid = (a + mid) / 2;
  const rightMid = (mid + b) / 2;
  const flm = f(leftMid), frm = f(rightMid);
  if (flm === null || frm === null) return null;
  const left = simpson(a, mid, fa, flm, fm);
  const right = simpson(mid, b, fm, frm, fb);
  const delta = left + right - whole;
  if (depth <= 0 || Math.abs(delta) <= 15 * tolerance) return left + right + delta / 15;
  const leftResult = adaptiveSimpson(f, a, mid, fa, flm, fm, left, tolerance / 2, depth - 1);
  const rightResult = adaptiveSimpson(f, mid, b, fm, frm, fb, right, tolerance / 2, depth - 1);
  return leftResult === null || rightResult === null ? null : leftResult + rightResult;
}

/** Bracketed bisection root finder. A sign change is required for reliability. */
export function bracketedRoot(
  expr: string,
  variable: string,
  lower: number,
  upper: number,
  scope: Record<string, unknown> = {},
): EvalResult {
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower >= upper) {
    return { ok: false, error: "Enter two finite limits with left smaller than right." };
  }
  const f = (x: number): number | null => {
    const result = safeEvaluate(expr, { ...scope, [variable]: decimalPoint(x) });
    return result.ok ? numericValue(result.value) : null;
  };
  let a = lower, b = upper;
  let fa = f(a), fb = f(b);
  if (fa === null || fb === null) return { ok: false, error: "The root finder needs real numeric results." };
  if (fa === 0) return { ok: true, value: a, formatted: formatValue(a) };
  if (fb === 0) return { ok: true, value: b, formatted: formatValue(b) };
  if (Math.sign(fa) === Math.sign(fb)) return { ok: false, error: "The interval must contain a sign change." };
  for (let i = 0; i < 80; i += 1) {
    const mid = (a + b) / 2;
    const fm = f(mid);
    if (fm === null) return { ok: false, error: "The expression could not be evaluated inside this interval." };
    if (Math.abs(fm) < 1e-12 || Math.abs(b - a) < 1e-12) {
      return { ok: true, value: mid, formatted: formatValue(mid), diagnostic: `${i + 1} bisection steps` };
    }
    if (Math.sign(fa) === Math.sign(fm)) { a = mid; fa = fm; } else { b = mid; fb = fm; }
  }
  const root = (a + b) / 2;
  return { ok: true, value: root, formatted: formatValue(root), diagnostic: "80 bisection steps" };
}

function decimalPoint(value: number) {
  // Passing a string prevents predictable decimal mode from silently accepting
  // a binary IEEE-754 sample point with more than 15 significant digits.
  return math.bignumber(value.toPrecision(17));
}

function numericValue(value: unknown): number | null {
  try {
    const n = math.number(value as any);
    return typeof n === "number" && Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function userFacingError(error: unknown) {
  const message = error instanceof Error ? error.message : "Could not evaluate the expression.";
  if (/undefined symbol/i.test(message)) return message.replace(/Undefined symbol/i, "Unknown value");
  if (/unexpected/i.test(message)) return "Check the expression for a missing operator, bracket or value.";
  if (/division by zero/i.test(message)) return "This expression divides by zero.";
  return message;
}

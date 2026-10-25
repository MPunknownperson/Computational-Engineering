/* eslint-disable @typescript-eslint/no-explicit-any */
// Engineering computation core. Pure and isomorphic: the same module runs in
// the browser calculators, the voice executor and the server API.
//
// Two evaluators share one grammar policy:
//   • `exact`  — 64-digit decimal (BigNumber) arithmetic for displayed answers.
//   • `fast`   — IEEE-754 doubles for iterative numerics (root finding,
//                quadrature, Monte-Carlo) where speed matters more than digits.
import { all, create, type MathJsInstance, type MathNode } from "mathjs";

export type AngleMode = "rad" | "deg" | "grad";
export type Notation = "auto" | "fixed" | "sci" | "eng" | "fraction";
export interface FormatOptions { notation?: Notation; precision?: number; angle?: AngleMode }
export interface EvalOptions { angle?: AngleMode; allowAssignments?: boolean; format?: FormatOptions }

export type EvalResult =
  | { ok: true; value: unknown; formatted: string; type: string; diagnostic?: string; assigned?: string }
  | { ok: false; error: string };

export const MAX_EXPRESSION_LENGTH = 6_000;
export const MAX_AST_NODES = 4_000;
export const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/* ------------------------------------------------------------------------ */
/* Custom engineering / numeric functions imported into both instances       */
/* ------------------------------------------------------------------------ */

function num(math: MathJsInstance, v: unknown): number {
  const n = math.number(v as any);
  if (typeof n !== "number" || !Number.isFinite(n)) throw new Error("A finite real number was expected.");
  return n;
}
function list(math: MathJsInstance, v: unknown): number[] {
  const raw = Array.isArray(v) ? v : (v as any)?.toArray ? (v as any).toArray() : null;
  if (!raw) throw new Error("A list of numbers was expected, e.g. [1, 2, 3].");
  return raw.flat(Infinity).map((x: unknown) => num(math, x));
}
/** Accept `f` as a parser function, an expression string or a constant. */
function callable(math: MathJsInstance, f: unknown, variable = "x"): (x: number) => number {
  // BigNumber mode refuses implicit conversion of doubles with >15 digits, so
  // sample points are wrapped explicitly when the exact instance is in use.
  const big = ((math as any).config().number === "BigNumber");
  const wrap = (x: number) => (big ? math.bignumber(x) : x);
  if (typeof f === "function") return (x) => num(math, (f as any)(wrap(x)));
  if (typeof f === "string") {
    const code = math.parse(f).compile();
    return (x) => num(math, code.evaluate({ [variable]: wrap(x) }));
  }
  const c = num(math, f);
  return () => c;
}

function brent(f: (x: number) => number, a: number, b: number, tol = 1e-13, maxIter = 200): number | null {
  let fa = f(a), fb = f(b);
  if (!Number.isFinite(fa) || !Number.isFinite(fb) || fa * fb > 0) return null;
  if (fa === 0) return a;
  if (fb === 0) return b;
  let c = a, fc = fa, d = b - a, e = d;
  for (let i = 0; i < maxIter; i += 1) {
    if (fb * fc > 0) { c = a; fc = fa; d = b - a; e = d; }
    if (Math.abs(fc) < Math.abs(fb)) { a = b; b = c; c = a; fa = fb; fb = fc; fc = fa; }
    const tol1 = 2 * Number.EPSILON * Math.abs(b) + tol / 2;
    const xm = (c - b) / 2;
    if (Math.abs(xm) <= tol1 || fb === 0) return b;
    if (Math.abs(e) >= tol1 && Math.abs(fa) > Math.abs(fb)) {
      const s = fb / fa;
      let p: number, q: number;
      if (a === c) { p = 2 * xm * s; q = 1 - s; } else {
        const qq = fa / fc, r = fb / fc;
        p = s * (2 * xm * qq * (qq - r) - (b - a) * (r - 1));
        q = (qq - 1) * (r - 1) * (s - 1);
      }
      if (p > 0) q = -q; else p = -p;
      if (2 * p < Math.min(3 * xm * q - Math.abs(tol1 * q), Math.abs(e * q))) { e = d; d = p / q; } else { d = xm; e = d; }
    } else { d = xm; e = d; }
    a = b; fa = fb;
    b += Math.abs(d) > tol1 ? d : (xm > 0 ? tol1 : -tol1);
    fb = f(b);
  }
  return b;
}

function newton(f: (x: number) => number, x0: number, tol = 1e-13, maxIter = 100): number | null {
  let x = x0;
  for (let i = 0; i < maxIter; i += 1) {
    const fx = f(x);
    if (!Number.isFinite(fx)) return null;
    if (Math.abs(fx) < tol) return x;
    const h = Math.cbrt(Number.EPSILON) * Math.max(1, Math.abs(x));
    const d = (f(x + h) - f(x - h)) / (2 * h);
    if (!Number.isFinite(d) || d === 0) return null;
    const next = x - fx / d;
    if (Math.abs(next - x) < tol * Math.max(1, Math.abs(x))) return next;
    x = next;
  }
  return Math.abs(f(x)) < 1e-8 ? x : null;
}

/** Scan [a, b] for sign changes and refine each with Brent; returns distinct roots. */
export function scanRoots(f: (x: number) => number, a: number, b: number, samples = 600): number[] {
  const roots: number[] = [];
  let prevX = a, prevF = f(a);
  for (let i = 1; i <= samples; i += 1) {
    const x = a + ((b - a) * i) / samples;
    const fx = f(x);
    if (Number.isFinite(prevF) && Number.isFinite(fx)) {
      if (prevF === 0) roots.push(prevX);
      else if (prevF * fx < 0) {
        const r = brent(f, prevX, x);
        if (r !== null && Math.abs(f(r)) < 1e-6 * Math.max(1, Math.abs(prevF), Math.abs(fx))) roots.push(r);
      }
    }
    prevX = x; prevF = fx;
  }
  if (Number.isFinite(prevF) && prevF === 0) roots.push(prevX);
  const distinct: number[] = [];
  for (const r of roots.sort((p, q) => p - q)) {
    if (distinct.length === 0 || Math.abs(r - distinct[distinct.length - 1]) > 1e-9 * Math.max(1, Math.abs(r))) distinct.push(r);
  }
  return distinct;
}

// Gauss–Kronrod 7–15 nodes and weights (positive half; symmetric).
const GK_X = [0.991455371120813, 0.949107912342759, 0.864864423359769, 0.741531185599394, 0.586087235467691, 0.405845151377397, 0.207784955007898, 0];
const GK_WK = [0.022935322010529, 0.063092092629979, 0.104790010322250, 0.140653259715525, 0.169004726639267, 0.190350578064785, 0.204432940075298, 0.209482141084728];
const GK_WG = [0, 0.129484966168870, 0, 0.279705391489277, 0, 0.381830050505119, 0, 0.417959183673469];

function gk15(f: (x: number) => number, a: number, b: number): [number, number] {
  const c = (a + b) / 2, h = (b - a) / 2;
  let k = 0, g = 0;
  for (let i = 0; i < GK_X.length; i += 1) {
    const dx = h * GK_X[i];
    const f1 = f(c + dx);
    const f2 = GK_X[i] === 0 ? f1 : f(c - dx);
    const s = GK_X[i] === 0 ? f1 : f1 + f2;
    k += GK_WK[i] * s;
    g += GK_WG[i] * s;
  }
  return [k * h, Math.abs((k - g) * h)];
}

/** Adaptive Gauss–Kronrod quadrature; handles improper limits via substitution. */
export function quadrature(f: (x: number) => number, a: number, b: number, tol = 1e-10): { value: number; error: number; evaluations: number } {
  let sign = 1;
  if (a > b) { [a, b] = [b, a]; sign = -1; }
  let g = f;
  // Map infinite limits onto a finite interval.
  if (!Number.isFinite(a) && !Number.isFinite(b)) { g = (t) => f(t / (1 - t * t)) * ((1 + t * t) / ((1 - t * t) ** 2)); a = -1; b = 1; }
  else if (!Number.isFinite(b)) { const a0 = a; g = (t) => f(a0 + t / (1 - t)) / ((1 - t) ** 2); a = 0; b = 1; }
  else if (!Number.isFinite(a)) { const b0 = b; g = (t) => f(b0 - (1 - t) / t) / (t * t); a = 0; b = 1; }
  const safe = (x: number) => { const v = g(x); return Number.isFinite(v) ? v : 0; };
  let evaluations = 0;
  const wrapped = (x: number) => { evaluations += 1; return safe(x); };
  const stack: Array<[number, number, number, number]> = [];
  const [v0, e0] = gk15(wrapped, a, b);
  stack.push([a, b, v0, e0]);
  let total = v0, err = e0, iterations = 0;
  while (err > tol * Math.max(1, Math.abs(total)) && iterations < 2000) {
    iterations += 1;
    stack.sort((p, q) => p[3] - q[3]);
    const [lo, hi, v, e] = stack.pop()!;
    const mid = (lo + hi) / 2;
    const [v1, e1] = gk15(wrapped, lo, mid);
    const [v2, e2] = gk15(wrapped, mid, hi);
    total += v1 + v2 - v; err += e1 + e2 - e;
    stack.push([lo, mid, v1, e1], [mid, hi, v2, e2]);
  }
  return { value: sign * total, error: Math.abs(err), evaluations };
}

/** Richardson-extrapolated central difference of order n (1–4). */
export function derivativeAt(f: (x: number) => number, x: number, order = 1): number {
  const h0 = Math.cbrt(Number.EPSILON) * Math.max(1, Math.abs(x)) * (order === 1 ? 1 : 40 ** (order - 1));
  const d = (h: number): number => {
    switch (order) {
      case 1: return (f(x - 2 * h) - 8 * f(x - h) + 8 * f(x + h) - f(x + 2 * h)) / (12 * h);
      case 2: return (-f(x - 2 * h) + 16 * f(x - h) - 30 * f(x) + 16 * f(x + h) - f(x + 2 * h)) / (12 * h * h);
      case 3: return (-f(x - 2 * h) + 2 * f(x - h) - 2 * f(x + h) + f(x + 2 * h)) / (2 * h ** 3);
      default: return (f(x - 2 * h) - 4 * f(x - h) + 6 * f(x) - 4 * f(x + h) + f(x + 2 * h)) / h ** 4;
    }
  };
  const d1 = d(h0), d2 = d(h0 / 2);
  return (16 * d2 - d1) / 15;
}

function rk4(f: (t: number, y: number[]) => number[], t0: number, y0: number[], t1: number, steps: number) {
  const h = (t1 - t0) / steps;
  let t = t0, y = y0.slice();
  const rows: number[][] = [[t, ...y]];
  for (let i = 0; i < steps; i += 1) {
    const k1 = f(t, y);
    const k2 = f(t + h / 2, y.map((v, j) => v + (h / 2) * k1[j]));
    const k3 = f(t + h / 2, y.map((v, j) => v + (h / 2) * k2[j]));
    const k4 = f(t + h, y.map((v, j) => v + h * k3[j]));
    y = y.map((v, j) => v + (h / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
    t += h;
    rows.push([t, ...y]);
  }
  return rows;
}

function buildExtensions(math: MathJsInstance) {
  const n = (v: unknown) => num(math, v);
  const L = (v: unknown) => list(math, v);
  return {
    // Numerical calculus & solvers ----------------------------------------
    nsolve: (f: unknown, guess: unknown = 1, hi?: unknown) => {
      const g = callable(math, f);
      if (hi !== undefined) { const r = brent(g, n(guess), n(hi)); if (r === null) throw new Error("No sign change between the two limits."); return r; }
      const r = newton(g, n(guess));
      if (r === null) throw new Error("Newton iteration did not converge from that starting point.");
      return r;
    },
    roots: (f: unknown, a: unknown = -100, b: unknown = 100) => scanRoots(callable(math, f), n(a), n(b)),
    integrate: (f: unknown, a: unknown, b: unknown) => quadrature(callable(math, f), n(a), n(b)).value,
    diff: (f: unknown, x: unknown, order: unknown = 1) => derivativeAt(callable(math, f), n(x), Math.max(1, Math.min(4, Math.round(n(order))))),
    summation: (f: unknown, a: unknown, b: unknown) => { const g = callable(math, f); let s = 0, c = 0; for (let i = n(a); i <= n(b); i += 1) { const y = g(i) - c; const t = s + y; c = (t - s) - y; s = t; } return s; },
    product: (f: unknown, a: unknown, b: unknown) => { const g = callable(math, f); let p = 1; for (let i = n(a); i <= n(b); i += 1) p *= g(i); return p; },
    odesolve: (f: unknown, t0: unknown, y0: unknown, t1: unknown, steps: unknown = 200) => {
      const fy = typeof f === "function" ? f : math.parse(String(f)).compile();
      const big = ((math as any).config().number === "BigNumber");
      const wrap = (x: number) => (big ? math.bignumber(x) : x);
      const call = (t: number, y: number[]) => {
        const yy = y.length === 1 ? wrap(y[0]) : y.map(wrap);
        const out = typeof fy === "function" ? (fy as any)(wrap(t), yy) : fy.evaluate({ t: wrap(t), y: yy });
        const arr = Array.isArray(out) ? out : (out as any)?.toArray ? (out as any).toArray() : [out];
        return arr.map((v: unknown) => n(v));
      };
      const y = Array.isArray(y0) ? y0.map(n) : [n(y0)];
      return rk4(call, n(t0), y, n(t1), Math.max(1, Math.round(n(steps))));
    },
    linspace: (a: unknown, b: unknown, count: unknown = 11) => { const k = Math.max(2, Math.round(n(count))); const lo = n(a), hi = n(b); return Array.from({ length: k }, (_, i) => lo + ((hi - lo) * i) / (k - 1)); },
    // Data & statistics -----------------------------------------------------
    rms: (v: unknown) => { const d = L(v); return Math.sqrt(d.reduce((s, x) => s + x * x, 0) / d.length); },
    geomean: (v: unknown) => { const d = L(v); return Math.exp(d.reduce((s, x) => s + Math.log(x), 0) / d.length); },
    harmmean: (v: unknown) => { const d = L(v); return d.length / d.reduce((s, x) => s + 1 / x, 0); },
    percentile: (v: unknown, p: unknown) => { const d = L(v).sort((x, y) => x - y); const r = (Math.max(0, Math.min(100, n(p))) / 100) * (d.length - 1); const lo = Math.floor(r), hi = Math.ceil(r); return d[lo] + (d[hi] - d[lo]) * (r - lo); },
    cov: (a: unknown, b: unknown) => { const x = L(a), y = L(b); if (x.length !== y.length || x.length < 2) throw new Error("cov needs two equal-length lists."); const mx = x.reduce((s, v) => s + v, 0) / x.length, my = y.reduce((s, v) => s + v, 0) / y.length; return x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0) / (x.length - 1); },
    corr: (a: unknown, b: unknown) => { const x = L(a), y = L(b); if (x.length !== y.length || x.length < 2) throw new Error("corr needs two equal-length lists."); const mx = x.reduce((s, v) => s + v, 0) / x.length, my = y.reduce((s, v) => s + v, 0) / y.length; let sxy = 0, sxx = 0, syy = 0; x.forEach((v, i) => { sxy += (v - mx) * (y[i] - my); sxx += (v - mx) ** 2; syy += (y[i] - my) ** 2; }); return sxy / Math.sqrt(sxx * syy); },
    linreg: (a: unknown, b: unknown) => { const x = L(a), y = L(b); if (x.length !== y.length || x.length < 2) throw new Error("linreg needs two equal-length lists."); const mx = x.reduce((s, v) => s + v, 0) / x.length, my = y.reduce((s, v) => s + v, 0) / y.length; let sxy = 0, sxx = 0, syy = 0; x.forEach((v, i) => { sxy += (v - mx) * (y[i] - my); sxx += (v - mx) ** 2; syy += (y[i] - my) ** 2; }); const slope = sxy / sxx; return [slope, my - slope * mx, (sxy * sxy) / (sxx * syy)]; },
    polyfit: (a: unknown, b: unknown, degree: unknown = 1) => {
      const x = L(a), y = L(b), d = Math.max(1, Math.min(8, Math.round(n(degree))));
      if (x.length !== y.length || x.length <= d) throw new Error("polyfit needs more points than the polynomial degree.");
      const A = x.map((xi) => Array.from({ length: d + 1 }, (_, j) => xi ** (d - j)));
      const At = (math.transpose as any)(A);
      const coeffs = (math.lusolve as any)((math.multiply as any)(At, A), (math.multiply as any)(At, y));
      return (coeffs as number[][]).map((row) => (Array.isArray(row) ? n(row[0]) : n(row)));
    },
    polyval: (coeffs: unknown, x: unknown) => { const c = L(coeffs); const xv = n(x); return c.reduce((acc, ci) => acc * xv + ci, 0); },
    interp: (xs: unknown, ys: unknown, x: unknown) => { const X = L(xs), Y = L(ys), v = n(x); if (X.length !== Y.length || X.length < 2) throw new Error("interp needs two equal-length lists."); for (let i = 0; i < X.length - 1; i += 1) if ((v >= X[i] && v <= X[i + 1]) || (v <= X[i] && v >= X[i + 1])) return Y[i] + ((Y[i + 1] - Y[i]) * (v - X[i])) / (X[i + 1] - X[i]); throw new Error("x is outside the interpolation table."); },
    // Finance ------------------------------------------------------------------
    pmt: (rate: unknown, nper: unknown, pv: unknown, fv: unknown = 0) => { const r = n(rate), k = n(nper), p = n(pv), f = n(fv); return r === 0 ? -(p + f) / k : -(r * (p * (1 + r) ** k + f)) / ((1 + r) ** k - 1); },
    fv: (rate: unknown, nper: unknown, pmt: unknown, pv: unknown = 0) => { const r = n(rate), k = n(nper), m = n(pmt), p = n(pv); return r === 0 ? -(p + m * k) : -(p * (1 + r) ** k + (m * ((1 + r) ** k - 1)) / r); },
    pv: (rate: unknown, nper: unknown, pmt: unknown, fv: unknown = 0) => { const r = n(rate), k = n(nper), m = n(pmt), f = n(fv); return r === 0 ? -(f + m * k) : -((f + (m * ((1 + r) ** k - 1)) / r) / (1 + r) ** k); },
    npv: (rate: unknown, flows: unknown) => { const r = n(rate); return L(flows).reduce((s, c, i) => s + c / (1 + r) ** i, 0); },
    irr: (flows: unknown) => { const c = L(flows); const f = (r: number) => c.reduce((s, v, i) => s + v / (1 + r) ** i, 0); const r = brent(f, -0.99, 10) ?? newton(f, 0.1); if (r === null) throw new Error("IRR did not converge."); return r; },
    // Electrical / engineering helpers -----------------------------------------
    par: (...r: unknown[]) => 1 / r.flat().reduce((s: number, v) => s + 1 / n(v), 0),
    db: (ratio: unknown) => 10 * Math.log10(n(ratio)),
    dbv: (ratio: unknown) => 20 * Math.log10(n(ratio)),
    dbinv: (dB: unknown) => 10 ** (n(dB) / 10),
    reynolds: (rho: unknown, v: unknown, len: unknown, mu: unknown) => (n(rho) * n(v) * n(len)) / n(mu),
    clamp: (x: unknown, lo: unknown, hi: unknown) => Math.min(n(hi), Math.max(n(lo), n(x))),
    lerp: (a: unknown, b: unknown, t: unknown) => n(a) + (n(b) - n(a)) * n(t),
    sinc: (x: unknown) => { const v = n(x); return v === 0 ? 1 : Math.sin(Math.PI * v) / (Math.PI * v); },
    sigfig: (x: unknown, digits: unknown) => Number(n(x).toPrecision(Math.max(1, Math.min(21, Math.round(n(digits)))))),
    deg2rad: (x: unknown) => (n(x) * Math.PI) / 180,
    rad2deg: (x: unknown) => (n(x) * 180) / Math.PI,
  };
}

/* ------------------------------------------------------------------------ */
/* Instances                                                                 */
/* ------------------------------------------------------------------------ */

function makeInstance(mode: "exact" | "fast"): MathJsInstance {
  const math = create(all, mode === "exact"
    ? { number: "BigNumber", precision: 64, predictable: false, matrix: "Array" }
    : { number: "number", predictable: false, matrix: "Array" }) as MathJsInstance;
  math.import(buildExtensions(math) as any, { override: false, silent: true });
  // A few engineering constants mathjs does not ship under these names.
  math.import({
    g0: math.unit("9.80665 m/s^2"),
    gn: 9.80665,
    atm: math.unit("101325 Pa"),
    c0: math.unit("299792458 m/s"),
    tau: mode === "exact" ? math.bignumber("6.283185307179586476925286766559005768394338798750211641949889184615632812572") : 2 * Math.PI,
    golden: mode === "exact" ? math.bignumber("1.618033988749894848204586834365638117720309179805762862135448622705260462818") : (1 + Math.sqrt(5)) / 2,
  } as any, { override: false, silent: true });
  return math;
}

export const exact: MathJsInstance = makeInstance("exact");
export const fast: MathJsInstance = makeInstance("fast");

/* ------------------------------------------------------------------------ */
/* Grammar policy                                                            */
/* ------------------------------------------------------------------------ */

export const SAFE_FUNCTIONS = new Set([
  // arithmetic & rounding
  "abs", "add", "cbrt", "ceil", "cube", "divide", "dotDivide", "dotMultiply", "dotPow", "exp", "expm1", "fix", "floor", "gcd", "hypot", "invmod", "lcm",
  "log", "log10", "log1p", "log2", "mod", "multiply", "norm", "nthRoot", "nthRoots", "pow", "round", "sign", "sqrt", "square", "subtract", "unaryMinus", "unaryPlus", "xgcd",
  // trig & hyperbolic
  "sin", "cos", "tan", "sec", "csc", "cot", "asin", "acos", "atan", "atan2", "asec", "acsc", "acot", "sinh", "cosh", "tanh", "sech", "csch", "coth", "asinh", "acosh", "atanh", "asech", "acsch", "acoth",
  // complex
  "complex", "re", "im", "arg", "conj",
  // special & probability
  "gamma", "lgamma", "erf", "zeta", "factorial", "combinations", "combinationsWithRep", "permutations", "multinomial", "stirlingS2", "bellNumbers", "catalan", "composition",
  // numbers & bases
  "bignumber", "number", "fraction", "bin", "hex", "oct", "format", "isInteger", "isNegative", "isPositive", "isPrime", "isZero", "isNaN",
  // bitwise
  "bitAnd", "bitOr", "bitXor", "bitNot", "leftShift", "rightArithShift", "rightLogShift",
  // statistics
  "max", "min", "mean", "median", "mode", "std", "variance", "sum", "prod", "cumsum", "mad", "quantileSeq", "count",
  // matrices & linear algebra
  "det", "inv", "pinv", "transpose", "ctranspose", "trace", "diag", "identity", "ones", "zeros", "range", "size", "squeeze", "reshape", "resize", "concat", "flatten", "cross", "dot", "kron",
  "lusolve", "lup", "qr", "slu", "usolve", "lsolve", "eigs", "expm", "sqrtm", "rotationMatrix", "matrixFromColumns", "matrixFromRows", "matrixFromFunction", "sort", "subset", "column", "row", "map", "filter", "forEach",
  // symbolic
  "derivative", "simplify", "rationalize", "polynomialRoot", "resolve",
  // units & conversion
  "unit", "to", "createUnit", "splitUnit",
  // logic
  "equal", "unequal", "larger", "largerEq", "smaller", "smallerEq", "compare", "and", "or", "not", "xor",
  // engine extensions
  "nsolve", "roots", "integrate", "diff", "summation", "product", "odesolve", "linspace", "rms", "geomean", "harmmean", "percentile", "cov", "corr", "linreg", "polyfit", "polyval", "interp",
  "pmt", "fv", "pv", "npv", "irr", "par", "db", "dbv", "dbinv", "reynolds", "clamp", "lerp", "sinc", "sigfig", "deg2rad", "rad2deg",
]);
// `createUnit` can mutate the shared instance; keep it out of untrusted input.
SAFE_FUNCTIONS.delete("createUnit");

export const SAFE_CONSTANTS = new Set([
  "pi", "e", "i", "Infinity", "NaN", "true", "false", "null", "tau", "phi", "golden", "LN2", "LN10", "LOG2E", "LOG10E", "SQRT1_2", "SQRT2",
  // physical constants shipped with mathjs
  "speedOfLight", "gravitationConstant", "planckConstant", "reducedPlanckConstant", "magneticConstant", "electricConstant", "vacuumImpedance", "coulomb", "elementaryCharge",
  "bohrMagneton", "conductanceQuantum", "inverseConductanceQuantum", "magneticFluxQuantum", "nuclearMagneton", "klitzing", "bohrRadius", "classicalElectronRadius", "electronMass",
  "fermiCoupling", "fineStructure", "hartreeEnergy", "protonMass", "deuteronMass", "neutronMass", "quantumOfCirculation", "rydberg", "thomsonCrossSection", "weakMixingAngle", "efimovFactor",
  "atomicMass", "avogadro", "boltzmann", "faraday", "firstRadiation", "loschmidt", "gasConstant", "molarPlanckConstant", "molarVolume", "sackurTetrode", "secondRadiation", "stefanBoltzmann", "wienDisplacement",
  "molarMass", "molarMassC12", "gravity", "planckLength", "planckMass", "planckTime", "planckCharge", "planckTemperature",
  "g0", "gn", "atm", "c0",
]);

const DISALLOWED_NODE_TYPES = new Set(["ObjectNode", "ObjectPropertyNode", "UpdateNode"]);
const ALLOWED_NODE_TYPES = new Set([
  "ConstantNode", "SymbolNode", "OperatorNode", "ParenthesisNode", "FunctionNode", "ArrayNode", "MatrixNode", "RangeNode", "IndexNode",
  "ConditionalNode", "RelationalNode", "LogicalNode", "AssignmentNode", "FunctionAssignmentNode", "BlockNode", "AccessorNode",
]);
// Property access is limited to the result fields of library functions
// (eigs(...).values, lup(...).L, …); anything else is rejected.
const SAFE_PROPERTIES = new Set(["values", "vectors", "eigenvectors", "L", "U", "p", "q", "Q", "R", "re", "im", "coefficients", "variables", "expression", "value", "vector"]);
const ASSIGNMENT_NODE_TYPES = new Set(["AssignmentNode", "FunctionAssignmentNode", "BlockNode"]);

const UNIT_ALIASES: Array<[RegExp, string]> = [
  [/\bmph\b/g, "mile/hour"], [/\bkmh\b/g, "km/hour"], [/\bkph\b/g, "km/hour"], [/\bmps\b/g, "m/second"], [/\bmi\b/g, "mile"], [/\bhr\b/g, "hour"],
  [/\bpsi\b/g, "psi"], [/\bksi\b/g, "kpsi"], [/\bdeg\b/g, "deg"], [/×/g, "*"], [/÷/g, "/"], [/−/g, "-"], [/π/g, "pi"], [/√\(/g, "sqrt("], [/√(\d+(?:\.\d+)?)/g, "sqrt($1)"],
  [/(\d)\s*%\s*(?=$|[)+\-*/,;])/g, "($1/100)"],
];

export function normalizeExpression(expression: string) {
  return UNIT_ALIASES.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), expression);
}

function isUnitName(math: MathJsInstance, name: string) {
  try { return (math as any).Unit.isValuelessUnit(name); } catch { return false; }
}

export interface InspectOptions { allowAssignments?: boolean; functions?: Set<string> }

/** Validate the parsed tree against the grammar policy. Throws on violation. */
export function inspectTree(math: MathJsInstance, node: MathNode, scope: Record<string, unknown>, options: InspectOptions = {}) {
  let count = 0;
  const userFunctions = options.functions ?? new Set<string>();
  const localParams = new Set<string>();
  const assigned = new Set<string>();
  node.traverse((n: any) => {
    count += 1;
    if (count > MAX_AST_NODES) throw new Error("Expression is too complex to evaluate safely.");
    if (DISALLOWED_NODE_TYPES.has(n.type) || !ALLOWED_NODE_TYPES.has(n.type)) throw new Error(`Unsupported expression feature: ${n.type}.`);
    if (n.type === "AccessorNode") {
      const index = n.index;
      const names: string[] = index?.dimensions?.map((d: any) => (d.type === "ConstantNode" ? String(d.value) : "")) ?? [];
      if (!index?.dotNotation || names.some((name) => !SAFE_PROPERTIES.has(name))) throw new Error("Property access is limited to result fields such as .values or .vectors.");
    }
    if (ASSIGNMENT_NODE_TYPES.has(n.type) && !options.allowAssignments) throw new Error("Assignments are not allowed here. Define values in the Variables field instead.");
    if (n.type === "FunctionAssignmentNode") {
      if (!IDENTIFIER.test(n.name) || SAFE_FUNCTIONS.has(n.name) || SAFE_CONSTANTS.has(n.name)) throw new Error(`"${n.name}" cannot be redefined.`);
      for (const p of n.params as string[]) localParams.add(p);
      userFunctions.add(n.name);
    }
    if (n.type === "AssignmentNode") {
      const name = n.object?.name;
      if (!name || !IDENTIFIER.test(name) || SAFE_FUNCTIONS.has(name) || SAFE_CONSTANTS.has(name)) throw new Error(`"${name ?? "that"}" cannot be used as a variable name.`);
      assigned.add(name);
    }
    if (n.type === "FunctionNode") {
      const name = n.fn?.type === "SymbolNode" ? n.fn.name : null;
      const inScope = name !== null && typeof scope[name] === "function";
      if (!name || !(SAFE_FUNCTIONS.has(name) || userFunctions.has(name) || inScope || localParams.has(name))) {
        throw new Error(name ? `The function "${name}" is not available in this calculator.` : "That function is not available in this calculator.");
      }
    }
    if (n.type === "SymbolNode") {
      const name = n.name;
      if (!(SAFE_FUNCTIONS.has(name) || SAFE_CONSTANTS.has(name) || userFunctions.has(name) || localParams.has(name) || assigned.has(name) || name in scope || isUnitName(math, name))) {
        throw new Error(`Unknown value: "${name}".`);
      }
    }
  });
  return node;
}

/** Rewrite trig calls so the expression is evaluated in degrees or gradians. */
export function applyAngleMode(math: MathJsInstance, node: MathNode, mode: AngleMode): MathNode {
  if (mode === "rad") return node;
  const factor = mode === "deg" ? "pi / 180" : "pi / 200";
  const inverse = mode === "deg" ? "180 / pi" : "200 / pi";
  const direct = new Set(["sin", "cos", "tan", "sec", "csc", "cot"]);
  const inverses = new Set(["asin", "acos", "atan", "asec", "acsc", "acot", "atan2"]);
  return node.transform((n: any) => {
    if (n.type !== "FunctionNode" || n.fn?.type !== "SymbolNode") return n;
    const name = n.fn.name;
    if (direct.has(name) && n.args.length === 1) {
      const arg = n.args[0];
      // Arguments that already carry an angle unit are left untouched.
      if (arg.type === "OperatorNode" && arg.op === "*" && arg.args.some((a: any) => a.type === "SymbolNode" && /^(deg|rad|grad|arcmin|arcsec)$/.test(a.name))) return n;
      return new (math as any).FunctionNode(name, [new (math as any).OperatorNode("*", "multiply", [new (math as any).ParenthesisNode(arg), math.parse(factor)])]);
    }
    if (inverses.has(name)) {
      return new (math as any).OperatorNode("*", "multiply", [new (math as any).FunctionNode(name, n.args), math.parse(inverse)]);
    }
    return n;
  });
}

/* ------------------------------------------------------------------------ */
/* Formatting                                                                */
/* ------------------------------------------------------------------------ */

export function typeOfValue(math: MathJsInstance, value: unknown): string {
  try { return math.typeOf(value as any); } catch { return typeof value; }
}

export function formatValue(value: unknown, options: FormatOptions = {}): string {
  if (value === null || value === undefined) return String(value);
  const precision = Math.max(1, Math.min(64, options.precision ?? 16));
  const notation = options.notation ?? "auto";
  try {
    if (typeof value === "function") return "function";
    if (typeof value === "string") return value;
    if (typeof value === "boolean") return value ? "true" : "false";
    if (notation === "fraction") {
      try {
        const f = exact.fraction(value as any);
        return exact.format(f, { fraction: "ratio" });
      } catch { /* fall through */ }
    }
    const spec: Record<string, unknown> = { precision, lowerExp: -9, upperExp: 15 };
    if (notation === "fixed") { spec.notation = "fixed"; spec.precision = Math.min(precision, 20); }
    else if (notation === "sci") { spec.notation = "exponential"; }
    else if (notation === "eng") { spec.notation = "engineering"; }
    if (typeof value === "number" && !Number.isFinite(value)) return String(value);
    let out = exact.format(value as any, spec as any);
    // Trim the trailing noise 64-digit decimals leave behind at auto precision.
    if (notation === "auto" && /^-?\d+\.\d+$/.test(out)) out = out.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
    return out;
  } catch {
    try { return String(value); } catch { return "[unprintable]"; }
  }
}

export function userFacingError(error: unknown) {
  const message = error instanceof Error ? error.message : "Could not evaluate the expression.";
  if (/undefined symbol/i.test(message)) return message.replace(/Undefined symbol/i, "Unknown value");
  if (/unexpected end of expression/i.test(message)) return "The expression ends too early — check for a missing value or bracket.";
  if (/unexpected/i.test(message)) return "Check the expression for a missing operator, bracket or value.";
  if (/parenthesis\s+\)\s+expected/i.test(message)) return "A closing bracket is missing.";
  if (/division by zero/i.test(message)) return "This expression divides by zero.";
  if (/units do not match/i.test(message)) return "The units on each side of this operation do not match.";
  if (/cannot convert/i.test(message) && /unit/i.test(message)) return "That unit conversion is not possible between these quantities.";
  if (/too few arguments|too many arguments/i.test(message)) return message.replace(/\(.*?\)/, "").trim();
  return message;
}

/* ------------------------------------------------------------------------ */
/* Evaluation                                                                */
/* ------------------------------------------------------------------------ */

/** Evaluate one expression (no assignments) with the exact evaluator. */
export function evaluate(expression: string, scope: Record<string, unknown> = {}, options: EvalOptions = {}): EvalResult {
  const trimmed = expression.trim();
  if (!trimmed) return { ok: false, error: "Enter an expression." };
  if (trimmed.length > MAX_EXPRESSION_LENGTH) return { ok: false, error: `Keep expressions under ${MAX_EXPRESSION_LENGTH.toLocaleString()} characters.` };
  try {
    const parsed = exact.parse(normalizeExpression(trimmed));
    inspectTree(exact, parsed, scope, { allowAssignments: options.allowAssignments });
    const tree = applyAngleMode(exact, parsed, options.angle ?? "rad");
    const value = tree.compile().evaluate(scope);
    const assigned = (parsed as any).type === "AssignmentNode" ? (parsed as any).object?.name : (parsed as any).type === "FunctionAssignmentNode" ? (parsed as any).name : undefined;
    return { ok: true, value, formatted: formatValue(value, options.format), type: typeOfValue(exact, value), assigned };
  } catch (error) {
    return { ok: false, error: userFacingError(error) };
  }
}

/** Compile an expression into a fast `number → number` function for numerics. */
export function compileNumeric(expression: string, variable: string, scope: Record<string, unknown> = {}, angle: AngleMode = "rad", unit?: string): ((x: number) => number) | { error: string } {
  try {
    const parsed = fast.parse(normalizeExpression(expression.trim()));
    inspectTree(fast, parsed, { ...scope, [variable]: 0 });
    const code = applyAngleMode(fast, parsed, angle).compile();
    const base: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(scope)) base[k] = toFastValue(v);
    return (x: number) => {
      try {
        const out = code.evaluate({ ...base, [variable]: unit ? fast.unit(x, unit) : x });
        return fastMagnitude(out);
      } catch { return NaN; }
    };
  } catch (error) {
    return { error: userFacingError(error) };
  }
}

/** Plain double from a fast-instance result; unit values are reduced to their SI magnitude. */
export function fastMagnitude(out: unknown): number {
  try {
    if (typeOfValue(fast, out) === "Unit") { const n = (out as any).toSI().toNumber(); return typeof n === "number" ? n : NaN; }
    if (typeOfValue(fast, out) === "Complex") return Math.abs((out as any).im) < 1e-12 ? (out as any).re : NaN;
    const n = fast.number(out as any);
    return typeof n === "number" ? n : NaN;
  } catch { return NaN; }
}

/** Convert BigNumber-flavoured scope values into plain doubles for the fast instance. */
export function toFastValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "string" || typeof value === "function") return value;
  if (Array.isArray(value)) return value.map(toFastValue);
  const type = typeOfValue(exact, value);
  if (type === "BigNumber") return exact.number(value as any);
  if (type === "Fraction") return exact.number(value as any);
  if (type === "Unit") { try { return fast.unit((value as any).toString()); } catch { return value; } }
  if (type === "Complex") return fast.complex((value as any).re, (value as any).im);
  return value;
}

export function toNumber(value: unknown): number | null {
  try {
    const type = typeOfValue(exact, value);
    if (type === "Unit") { const v = (value as any).toNumber?.(); return typeof v === "number" && Number.isFinite(v) ? v : null; }
    if (type === "Complex") return Math.abs((value as any).im) < 1e-12 ? (value as any).re : null;
    const n = exact.number(value as any);
    return typeof n === "number" && Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** Decimal-safe sample point: avoids feeding binary doubles with >15 digits into BigNumber mode. */
export function decimalPoint(value: number) {
  return exact.bignumber(value.toPrecision(17));
}

/** Magnitude in SI base units (units stripped); plain numbers pass through. */
export function toSINumber(value: unknown): number | null {
  try {
    if (typeOfValue(exact, value) === "Unit") {
      const si = (value as any).toSI();
      const n = si.toNumber();
      return typeof n === "number" && Number.isFinite(n) ? n : null;
    }
  } catch { /* fall through */ }
  return toNumber(value);
}

/** Compile once; evaluate many times with per-call numeric overrides (fast evaluator). */
export function compileScoped(expression: string, scope: Record<string, number>, angle: AngleMode = "rad"): ((overrides: Record<string, number>) => number) | { error: string } {
  try {
    const parsed = fast.parse(normalizeExpression(expression.trim()));
    inspectTree(fast, parsed, scope);
    const code = applyAngleMode(fast, parsed, angle).compile();
    return (overrides) => {
      try { return fastMagnitude(code.evaluate({ ...scope, ...overrides })); } catch { return NaN; }
    };
  } catch (error) {
    return { error: userFacingError(error) };
  }
}

/** Scope without entries whose names collide with unit symbols (m, s, V, A, …). */
export function unitSafeScope(scope: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(scope)) if (!isUnitName(exact, k)) out[k] = v;
  return out;
}

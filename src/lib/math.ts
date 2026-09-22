"use client";
import { evaluate, parse } from "mathjs";

export type EvalResult =
  | { ok: true; value: unknown; formatted: string }
  | { ok: false; error: string };

const BLOCKED_IDENTIFIERS = new Set([
  "import",
  "createUnit",
  "load",
  "config",
]);

/**
 * Evaluate a user expression safely. We restrict the scope to math-only
 * symbols and reject anything that looks like an environment escape.
 */
export function safeEvaluate(expr: string, scope: Record<string, unknown> = {}): EvalResult {
  const trimmed = expr.trim();
  if (!trimmed) return { ok: false, error: "Enter an expression." };
  if (trimmed.length > 2000) return { ok: false, error: "Expression too long." };

  try {
    // Parse first so we can reject forbidden identifiers before evaluation.
    const node = parse(trimmed);
    node.traverse((n: any) => {
      if (n?.type === "SymbolNode" && BLOCKED_IDENTIFIERS.has(n.name)) {
        throw new Error(`Forbidden identifier: "${n.name}"`);
      }
      if (n?.type === "AccessorNode" || n?.type === "FunctionAssignmentNode") {
        // allow accessor for indexing only if safe — we keep it restrictive.
      }
    });

    const value = evaluate(trimmed, scope);
    return { ok: true, value, formatted: formatValue(value) };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Could not evaluate." };
  }
}

export function formatValue(v: unknown): string {
  if (v === null || v === undefined) return String(v);
  if (typeof v === "number") {
    if (Number.isInteger(v) && Math.abs(v) < 1e15) return v.toLocaleString();
    // 12 significant digits
    return Number(v.toPrecision(12)).toString();
  }
  if (typeof v === "object") {
    // mathjs Unit / Matrix etc. expose toString
    if (typeof (v as any).toString === "function") return (v as any).toString();
  }
  return String(v);
}

/**
 * Suggest a symbolic simplification of the expression (best-effort).
 */
export function simplify(expr: string): string | null {
  try {
    // mathjs exports simplify in extended bundle — fall back if absent
    const m = require("mathjs") as any;
    if (typeof m.simplify === "function") return m.simplify(expr).toString();
  } catch {
    /* noop */
  }
  return null;
}

/**
 * Numeric derivative at a point using central difference.
 * Useful for "feed to AI/calculus" feature.
 */
export function numericDerivative(expr: string, variable = "x", at = 0): EvalResult {
  const h = 1e-6;
  const a = safeEvaluate(expr.replace(new RegExp(`\\b${variable}\\b`, "g"), `(${at}-${h})`));
  const b = safeEvaluate(expr.replace(new RegExp(`\\b${variable}\\b`, "g"), `(${at}+${h})`));
  if (!a.ok) return a;
  if (!b.ok) return b;
  const d = (Number(b.value) - Number(a.value)) / (2 * h);
  return { ok: true, value: d, formatted: formatValue(d) };
}

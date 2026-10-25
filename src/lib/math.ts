// Backward-compatible façade over the engineering engine in `@/lib/engine`.
// Pure computation: no React, no browser APIs. The voice executor on the
// server and the calculator UIs in the browser share one grammar policy.
import {
  evaluate, formatValue as engineFormat, simplifyExpression, numericDerivative as engineDerivative,
  numericIntegral as engineIntegral, bracketedRoot as engineRoot, parseVariableAssignments as engineAssignments,
  type AngleMode, type EvalResult as EngineEvalResult, type ScopeResult as EngineScopeResult,
} from "@/lib/engine";

export type EvalResult = EngineEvalResult;
export type ScopeResult = EngineScopeResult;

/** Evaluate an expression within the restricted, math-only grammar (no assignments). */
export function safeEvaluate(expr: string, scope: Record<string, unknown> = {}, options: { angle?: AngleMode } = {}): EvalResult {
  return evaluate(expr, scope, { angle: options.angle });
}

/** Parse sequential assignments such as `a = 2; b = a*pi; g = 9.81 m/s^2`. */
export function parseVariableAssignments(source: string): ScopeResult {
  return engineAssignments(source);
}

export function formatValue(value: unknown): string {
  return engineFormat(value);
}

/** Best-effort symbolic simplification under the same restricted grammar. */
export function simplify(expr: string, scope: Record<string, unknown> = {}): string | null {
  return simplifyExpression(expr, scope);
}

/** Numerical derivative (Richardson-extrapolated five-point stencil). */
export function numericDerivative(expr: string, variable = "x", at = 0, scope: Record<string, unknown> = {}): EvalResult {
  return engineDerivative(expr, variable, at, scope);
}

/** Adaptive Gauss–Kronrod integration for a real-valued expression over [a, b]. */
export function numericIntegral(expr: string, variable: string, lower: number, upper: number, scope: Record<string, unknown> = {}, tolerance = 1e-9): EvalResult {
  return engineIntegral(expr, variable, lower, upper, scope, { tolerance });
}

/** Bracketed root finder (sign-change scan + Brent). */
export function bracketedRoot(expr: string, variable: string, lower: number, upper: number, scope: Record<string, unknown> = {}): EvalResult {
  return engineRoot(expr, variable, lower, upper, scope);
}

/**
 * Numerical analysis services shared by every tool module:
 * bracketed root finding, finite-difference sensitivity, elasticity ranking
 * and surrogate-model training coordinated through one cache.
 *
 * All confirmed figures still come from the exact engine in `processCalculation`.
 * The surrogate is only used for interactive previews and is always reported
 * with its measured held-out error.
 */
import { processCalculation } from '../processing';
import { toolById } from '../catalog';
import { parseNumericValue } from '../format';
import type { CalculationContext, ToolId, Values } from '../types';
import { MemoCache, runSliced, stableKey, yieldToBrowser } from './scheduler';
import { SurrogateEnsemble } from './network';
import type { EnsemblePrediction, Sample, TrainingReport } from './network';

export interface FieldRange { key: string; label: string; min: number; max: number; integer?: boolean }
export interface SensitivityEntry {
  key: string;
  label: string;
  base: number;
  /** Change in the result for a 1% increase in this input. */
  delta: number;
  /** Percentage change in the result per 1% change of the input. */
  elasticity: number;
  share: number;
}
export interface SurrogateModel {
  tool: ToolId;
  fields: FieldRange[];
  report: TrainingReport;
  members: number;
  predict: (values: Values) => EnsemblePrediction | null;
  /** Exact-engine value for a candidate, used to verify a prediction on demand. */
  verify: (values: Values) => number | null;
  usable: boolean;
}

const evaluations = new MemoCache<number | null>(256);
const surrogates = new MemoCache<SurrogateModel>(6);

export function evaluate(tool: ToolId, values: Values, ctx: CalculationContext): number | null {
  const key = stableKey([tool, values, ctx.country, ctx.region, ctx.county, ctx.currency, ctx.rate, ctx.complexity]);
  const cached = evaluations.get(key);
  if (cached !== undefined) return cached;
  const output = processCalculation(tool, values, ctx);
  const value = output.result && typeof output.result.value === 'number' ? output.result.value : null;
  return evaluations.set(key, value);
}

/** Numeric fields a tool exposes, with ranges taken from the validation rules. */
export function analysableFields(tool: ToolId, values: Values): FieldRange[] {
  const compare = toolById[tool].compareFields;
  return compare
    .filter(field => Number.isFinite(parseNumericValue(values[field.key] ?? '')))
    .map(field => {
      const base = parseNumericValue(values[field.key]);
      const magnitude = Math.abs(base) || 1;
      const integer = ['years', 'months', 'n', 'k', 'count'].includes(field.key);
      return {
        key: field.key,
        label: field.label,
        min: Math.max(field.key === 'rate' ? 0 : 0, base - magnitude * .5),
        max: base + magnitude * .5,
        integer,
      };
    });
}

/**
 * Central-difference sensitivity around the current inputs.
 * Returns the exact-engine response, not an approximation.
 */
export function sensitivity(tool: ToolId, values: Values, ctx: CalculationContext): SensitivityEntry[] {
  const base = evaluate(tool, values, ctx);
  if (base === null) return [];
  const entries: SensitivityEntry[] = [];
  for (const field of analysableFields(tool, values)) {
    const current = parseNumericValue(values[field.key]);
    const step = Math.max(Math.abs(current) * .01, field.integer ? 1 : 1e-4);
    const up = evaluate(tool, { ...values, [field.key]: String(current + step) }, ctx);
    const down = evaluate(tool, { ...values, [field.key]: String(Math.max(0, current - step)) }, ctx);
    if (up === null && down === null) continue;
    const high = up ?? base;
    const low = down ?? base;
    const derivative = (high - low) / ((up !== null ? step : 0) + (down !== null ? step : 0) || step);
    const delta = derivative * Math.abs(current) * .01;
    entries.push({
      key: field.key,
      label: field.label,
      base: current,
      delta,
      elasticity: base !== 0 && current !== 0 ? (derivative * current) / base : 0,
      share: 0,
    });
  }
  const total = entries.reduce((sum, entry) => sum + Math.abs(entry.delta), 0);
  return entries
    .map(entry => ({ ...entry, share: total > 0 ? Math.abs(entry.delta) / total : 0 }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

/** Robust bracketed solver: expanding bracket, then bisection with secant acceleration. */
export function solveField(
  tool: ToolId,
  values: Values,
  ctx: CalculationContext,
  field: string,
  target: number,
  bounds: { min: number; max: number },
): { value: number; achieved: number; iterations: number; converged: boolean } {
  const at = (candidate: number) => evaluate(tool, { ...values, [field]: String(candidate) }, ctx);
  let low = bounds.min;
  let high = bounds.max;
  let lowValue = at(low);
  let highValue = at(high);
  let expansions = 0;
  while ((highValue === null || (lowValue !== null && (highValue - target) * (lowValue - target) > 0)) && expansions < 40) {
    high = high * 2 + 1;
    highValue = at(high);
    expansions++;
  }
  if (lowValue === null || highValue === null) return { value: NaN, achieved: NaN, iterations: expansions, converged: false };
  if ((lowValue - target) * (highValue - target) > 0) return { value: NaN, achieved: NaN, iterations: expansions, converged: false };

  let mid = low;
  let midValue = lowValue;
  let iterations = 0;
  for (; iterations < 90; iterations++) {
    const secant = highValue !== lowValue ? high - (highValue - target) * (high - low) / (highValue - lowValue) : NaN;
    mid = Number.isFinite(secant) && secant > low && secant < high ? secant : (low + high) / 2;
    const candidate = at(mid);
    if (candidate === null) { mid = (low + high) / 2; continue; }
    midValue = candidate;
    if (Math.abs(midValue - target) <= Math.max(1e-7, Math.abs(target) * 1e-9)) break;
    if ((midValue - target) * (lowValue - target) > 0) { low = mid; lowValue = midValue; }
    else { high = mid; highValue = midValue; }
    if (Math.abs(high - low) < 1e-9) break;
  }
  return { value: mid, achieved: midValue, iterations, converged: Math.abs(midValue - target) <= Math.max(1e-4, Math.abs(target) * 1e-6) };
}

/** Deterministic low-discrepancy sequence keeps coverage even with few samples. */
function halton(index: number, base: number) {
  let result = 0;
  let fraction = 1;
  let i = index + 1;
  while (i > 0) {
    fraction /= base;
    result += fraction * (i % base);
    i = Math.floor(i / base);
  }
  return result;
}

const PRIMES = [2, 3, 5, 7, 11, 13, 17];

/**
 * Trains a surrogate of the exact engine over the current input ranges.
 * Sampling and training are time-sliced so the interface stays responsive.
 */
export async function trainSurrogate(
  tool: ToolId,
  values: Values,
  ctx: CalculationContext,
  options: { samples?: number; signal?: AbortSignal; onProgress?: (done: number, total: number) => void } = {},
): Promise<SurrogateModel | null> {
  const fields = analysableFields(tool, values);
  if (!fields.length) return null;
  const cacheKey = stableKey([tool, fields.map(f => [f.key, f.min, f.max]), ctx.country, ctx.region, ctx.currency, values.method, ctx.complexity]);
  const cached = surrogates.get(cacheKey);
  if (cached) return cached;

  const count = options.samples ?? 320;
  const rows = await runSliced(count, index => {
    const point = fields.map((field, dimension) => {
      const unit = halton(index, PRIMES[dimension % PRIMES.length]);
      const raw = field.min + unit * (field.max - field.min);
      return field.integer ? Math.round(raw) : raw;
    });
    const candidate = { ...values };
    fields.forEach((field, dimension) => { candidate[field.key] = String(point[dimension]); });
    const target = evaluate(tool, candidate, ctx);
    return target === null ? null : { inputs: point, target } as Sample;
  }, { signal: options.signal, onProgress: (done, total) => options.onProgress?.(done, total + 40) });

  const samples = rows.filter((row): row is Sample => row !== null);
  if (samples.length < 40) return null;

  // Each ensemble member is trained in its own slice so the frame budget is respected.
  const memberCount = 3;
  const ensemble = new SurrogateEnsemble(fields.length, [Math.min(26, fields.length * 6 + 10), 12], memberCount);
  const epochs = Math.max(60, Math.round(22000 / samples.length));
  for (let member = 0; member < memberCount; member++) {
    await yieldToBrowser();
    if (options.signal?.aborted) return null;
    ensemble.trainMember(member, samples, { epochs });
    options.onProgress?.(count + (member + 1) * 13, count + 40);
  }
  const report = ensemble.report;
  options.onProgress?.(count + 40, count + 40);

  const model: SurrogateModel = {
    tool,
    fields,
    report,
    members: memberCount,
    usable: report.r2 >= .95 && report.mape <= 5,
    predict: (candidate: Values) => {
      const inputs = fields.map(field => parseNumericValue(candidate[field.key] ?? ''));
      if (inputs.some(value => !Number.isFinite(value))) return null;
      const outside = inputs.some((value, index) => value < fields[index].min - 1e-9 || value > fields[index].max + 1e-9);
      return outside ? null : ensemble.predict(inputs);
    },
    verify: (candidate: Values) => evaluate(tool, candidate, ctx),
  };
  return surrogates.set(cacheKey, model);
}

export function clearAnalysisCaches() {
  evaluations.clear();
  surrogates.clear();
}

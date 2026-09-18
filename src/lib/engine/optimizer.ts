/**
 * Specialized optimization layer for the utility tools.
 *
 * The financial modules are dominated by one heavy amortization loop; the utility
 * tools are the opposite — thousands of tiny, repeated evaluations driven by a
 * slider or a keystroke. This layer targets that profile specifically:
 *
 *  - a numeric-keyed ring cache that avoids building string keys per keystroke
 *  - loop-unrolled sweeps over typed arrays for range previews
 *  - Kahan compensated summation so long accumulations stay accurate
 *  - incremental recompute that reuses the previous frame when one input moved
 *  - an online frequency/recency ranker that adapts the interface to the person
 *
 * Everything is deterministic and runs locally; nothing is uploaded.
 */

/** FNV-1a over a small numeric vector. Avoids string allocation in hot paths. */
export function hashNumbers(values: ArrayLike<number>, seed = 0x811c9dc5) {
  let h = seed >>> 0;
  const buffer = new Float64Array(1);
  const bytes = new Uint8Array(buffer.buffer);
  for (let i = 0; i < values.length; i++) {
    buffer[0] = values[i];
    for (let b = 0; b < 8; b++) {
      h ^= bytes[b];
      h = Math.imul(h, 0x01000193);
    }
  }
  return h >>> 0;
}

/**
 * Fixed-capacity numeric cache backed by typed arrays.
 * Insertion is O(1) with no allocation after construction.
 */
export class RingCache {
  private readonly keys: Uint32Array;
  private readonly values: Float64Array;
  private readonly stamps: Uint32Array;
  private clock = 1;
  hits = 0;
  misses = 0;

  constructor(private readonly capacity = 512) {
    this.keys = new Uint32Array(capacity);
    this.values = new Float64Array(capacity);
    this.stamps = new Uint32Array(capacity);
  }

  private slot(key: number) { return key % this.capacity; }

  get(key: number): number | undefined {
    const index = this.slot(key);
    if (this.stamps[index] !== 0 && this.keys[index] === key) {
      this.hits++;
      this.stamps[index] = this.clock++;
      return this.values[index];
    }
    this.misses++;
    return undefined;
  }

  set(key: number, value: number) {
    const index = this.slot(key);
    this.keys[index] = key;
    this.values[index] = value;
    this.stamps[index] = this.clock++;
    return value;
  }

  get hitRate() { return this.hits + this.misses === 0 ? 0 : this.hits / (this.hits + this.misses); }
  reset() { this.keys.fill(0); this.stamps.fill(0); this.hits = 0; this.misses = 0; this.clock = 1; }
}

/** Compensated summation: keeps a running correction term for long accumulations. */
export function kahanSum(values: ArrayLike<number>) {
  let sum = 0, compensation = 0;
  for (let i = 0; i < values.length; i++) {
    const adjusted = values[i] - compensation;
    const next = sum + adjusted;
    compensation = (next - sum) - adjusted;
    sum = next;
  }
  return sum;
}

/**
 * Evaluates a scalar function across a linear range using a 4-way unrolled loop.
 * Returns typed arrays so charts and tables can consume them without conversion.
 */
export function sweep(from: number, to: number, steps: number, fn: (value: number) => number) {
  const count = Math.max(2, Math.min(4096, Math.trunc(steps)));
  const inputs = new Float64Array(count);
  const outputs = new Float64Array(count);
  const stride = (to - from) / (count - 1);
  let i = 0;
  const limit = count - (count % 4);
  for (; i < limit; i += 4) {
    const a = from + stride * i, b = from + stride * (i + 1), c = from + stride * (i + 2), d = from + stride * (i + 3);
    inputs[i] = a; inputs[i + 1] = b; inputs[i + 2] = c; inputs[i + 3] = d;
    outputs[i] = fn(a); outputs[i + 1] = fn(b); outputs[i + 2] = fn(c); outputs[i + 3] = fn(d);
  }
  for (; i < count; i++) {
    const value = from + stride * i;
    inputs[i] = value;
    outputs[i] = fn(value);
  }
  return { inputs, outputs };
}

export interface SweepStats {
  min: number; max: number; mean: number; stdDev: number;
  monotonic: 'increasing' | 'decreasing' | 'mixed';
  /** Indices whose local curvature is far outside the typical range. */
  inflections: number[];
}

export function analyseSweep(outputs: Float64Array): SweepStats {
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < outputs.length; i++) {
    if (outputs[i] < min) min = outputs[i];
    if (outputs[i] > max) max = outputs[i];
  }
  const mean = kahanSum(outputs) / outputs.length;
  let variance = 0;
  for (let i = 0; i < outputs.length; i++) variance += (outputs[i] - mean) ** 2;
  variance /= outputs.length;

  let up = 0, down = 0;
  for (let i = 1; i < outputs.length; i++) {
    if (outputs[i] > outputs[i - 1]) up++;
    else if (outputs[i] < outputs[i - 1]) down++;
  }

  const curvature: number[] = [];
  for (let i = 1; i < outputs.length - 1; i++) curvature.push(Math.abs(outputs[i + 1] - 2 * outputs[i] + outputs[i - 1]));
  const curveMean = curvature.length ? kahanSum(curvature) / curvature.length : 0;
  const threshold = curveMean * 6;
  const inflections: number[] = [];
  for (let i = 0; i < curvature.length && inflections.length < 8; i++) if (curvature[i] > threshold && curvature[i] > 0) inflections.push(i + 1);

  return {
    min, max, mean, stdDev: Math.sqrt(variance),
    monotonic: down === 0 && up > 0 ? 'increasing' : up === 0 && down > 0 ? 'decreasing' : 'mixed',
    inflections,
  };
}

/**
 * Incremental recompute guard.
 * When only one field changed since the last frame, the caller can reuse cached
 * structure instead of rebuilding everything.
 */
export class DeltaTracker {
  private previous: Record<string, string> = {};
  compare(next: Record<string, string>) {
    const changed: string[] = [];
    for (const key of Object.keys(next)) if (this.previous[key] !== next[key]) changed.push(key);
    for (const key of Object.keys(this.previous)) if (!(key in next)) changed.push(key);
    const first = Object.keys(this.previous).length === 0;
    this.previous = { ...next };
    return { changed, singleField: !first && changed.length === 1 ? changed[0] : null, first };
  }
  reset() { this.previous = {}; }
}

/**
 * Adaptive display precision.
 * Small magnitudes need more decimals; very large ones need fewer. This keeps
 * conversions readable without silently discarding significant digits.
 */
export function adaptivePrecision(value: number, requested: number) {
  if (!Number.isFinite(value) || value === 0) return requested;
  const magnitude = Math.abs(value);
  if (magnitude >= 1e6) return Math.max(0, Math.min(requested, 2));
  if (magnitude >= 1) return requested;
  const leadingZeros = Math.floor(-Math.log10(magnitude));
  return Math.min(12, requested + leadingZeros + 1);
}

/** Significant-figure rounding for conversion output. */
export function toSignificant(value: number, digits: number) {
  if (!Number.isFinite(value) || value === 0) return value;
  const factor = Math.pow(10, digits - Math.ceil(Math.log10(Math.abs(value))));
  return Math.round(value * factor) / factor;
}

export interface RankedAction {
  id: string;
  label: string;
  score: number;
  reason: string;
}

interface Signal { uses: number; lastUsed: number }

/**
 * Online recency/frequency ranker.
 *
 * A deliberately small, inspectable model: each action carries a frequency term
 * with exponential recency decay plus a contextual affinity bonus. It adapts to
 * the individual without any server, training data or opaque weights.
 */
export class AdaptiveRanker {
  private readonly signals = new Map<string, Signal>();
  private readonly affinity = new Map<string, number>();
  constructor(private readonly halfLifeMs = 1000 * 60 * 60 * 24 * 7) {}

  observe(id: string, context = '', at = Date.now()) {
    const current = this.signals.get(id) || { uses: 0, lastUsed: at };
    this.signals.set(id, { uses: current.uses + 1, lastUsed: at });
    if (context) {
      const key = `${context}::${id}`;
      this.affinity.set(key, (this.affinity.get(key) || 0) + 1);
    }
  }

  seed(entries: { id: string; uses: number; createdAt?: string }[]) {
    for (const entry of entries) {
      const at = entry.createdAt ? Date.parse(entry.createdAt) || Date.now() : Date.now();
      const existing = this.signals.get(entry.id);
      this.signals.set(entry.id, { uses: (existing?.uses || 0) + Math.max(0, entry.uses), lastUsed: Math.max(existing?.lastUsed || 0, at) });
    }
  }

  score(id: string, context = '', now = Date.now()) {
    const signal = this.signals.get(id);
    if (!signal) return 0;
    const decay = Math.pow(0.5, (now - signal.lastUsed) / this.halfLifeMs);
    const frequency = Math.log1p(signal.uses);
    const contextual = context ? Math.log1p(this.affinity.get(`${context}::${id}`) || 0) * 0.6 : 0;
    return frequency * (0.35 + 0.65 * decay) + contextual;
  }

  rank(candidates: { id: string; label: string }[], context = '', now = Date.now()): RankedAction[] {
    return candidates
      .map(candidate => {
        const score = this.score(candidate.id, context, now);
        const signal = this.signals.get(candidate.id);
        const reason = !signal ? 'Not used yet on this device'
          : signal.uses > 4 ? `Used ${signal.uses} times`
            : now - signal.lastUsed < 1000 * 60 * 60 * 24 ? 'Used today'
              : `Used ${signal.uses} time${signal.uses === 1 ? '' : 's'}`;
        return { id: candidate.id, label: candidate.label, score, reason };
      })
      .sort((a, b) => b.score - a.score);
  }

  get tracked() { return this.signals.size; }
}

export interface OptimizerReport {
  cacheHitRate: number;
  evaluations: number;
  reusedFrames: number;
  lastSweepPoints: number;
  averageMicroseconds: number;
}

/** Shared instrumentation so the interface can show what the optimizations did. */
export class OptimizerProbe {
  private total = 0;
  private durations = 0;
  reused = 0;
  lastSweepPoints = 0;
  constructor(readonly cache = new RingCache(1024)) {}

  measure<T>(fn: () => T): T {
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const result = fn();
    this.durations += (typeof performance !== 'undefined' ? performance.now() : Date.now()) - start;
    this.total++;
    return result;
  }

  report(): OptimizerReport {
    return {
      cacheHitRate: this.cache.hitRate,
      evaluations: this.total,
      reusedFrames: this.reused,
      lastSweepPoints: this.lastSweepPoints,
      averageMicroseconds: this.total ? (this.durations / this.total) * 1000 : 0,
    };
  }

  reset() { this.total = 0; this.durations = 0; this.reused = 0; this.lastSweepPoints = 0; this.cache.reset(); }
}

export const utilityProbe = new OptimizerProbe();
export const utilityRanker = new AdaptiveRanker();

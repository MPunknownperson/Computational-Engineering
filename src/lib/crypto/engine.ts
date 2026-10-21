/**
 * Analytical engine for the crypto tool. Pure functions, no I/O, deterministic
 * (the Monte Carlo generator is seeded) so results are reproducible and
 * testable. Sums use Kahan–Babuška compensation to limit floating-point drift
 * over long series; exact money arithmetic lives in ./precision.ts.
 */

export type SeriesPoint = [timestamp: number, value: number];

/* ---------------------------- numerics ------------------------------ */

export function kahanSum(values: Iterable<number>): number {
  let sum = 0, c = 0;
  for (const v of values) {
    const t = sum + v;
    if (Math.abs(sum) >= Math.abs(v)) c += (sum - t) + v; else c += (v - t) + sum;
    sum = t;
  }
  return sum + c;
}

export function mean(values: number[]): number { return values.length ? kahanSum(values) / values.length : 0; }

export function stddev(values: number[], sample = true): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const ss = kahanSum(values.map((v) => (v - m) ** 2));
  return Math.sqrt(ss / (values.length - (sample ? 1 : 0)));
}

export function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/* ---------------------------- returns ------------------------------- */

export function simpleReturns(prices: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < prices.length; i++) out.push(prices[i - 1] > 0 ? prices[i] / prices[i - 1] - 1 : 0);
  return out;
}

export function logReturns(prices: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < prices.length; i++) out.push(prices[i - 1] > 0 && prices[i] > 0 ? Math.log(prices[i] / prices[i - 1]) : 0);
  return out;
}

/* --------------------------- indicators ----------------------------- */

export function sma(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  let window = 0;
  for (let i = 0; i < values.length; i++) {
    window += values[i];
    if (i >= period) window -= values[i - period];
    if (i >= period - 1) out[i] = window / period;
  }
  return out;
}

export function ema(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = mean(values.slice(0, period));
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) { prev = values[i] * k + prev * (1 - k); out[i] = prev; }
  return out;
}

/** Wilder-smoothed RSI. */
export function rsi(values: number[], period = 14): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) { const d = values[i] - values[i - 1]; if (d >= 0) gain += d; else loss -= d; }
  gain /= period; loss /= period;
  out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

export function macd(values: number[], fast = 12, slow = 26, signal = 9): { macd: Array<number | null>; signal: Array<number | null>; histogram: Array<number | null> } {
  const f = ema(values, fast), s = ema(values, slow);
  const line = values.map((_, i) => (f[i] !== null && s[i] !== null ? (f[i] as number) - (s[i] as number) : null));
  const firstIdx = line.findIndex((v) => v !== null);
  const defined = firstIdx >= 0 ? line.slice(firstIdx).map((v) => v as number) : [];
  const sig = ema(defined, signal);
  const signalLine: Array<number | null> = new Array(values.length).fill(null);
  sig.forEach((v, i) => { if (v !== null) signalLine[firstIdx + i] = v; });
  const histogram = line.map((v, i) => (v !== null && signalLine[i] !== null ? v - (signalLine[i] as number) : null));
  return { macd: line, signal: signalLine, histogram };
}

export function bollinger(values: number[], period = 20, mult = 2): { middle: Array<number | null>; upper: Array<number | null>; lower: Array<number | null>; bandwidth: Array<number | null> } {
  const middle = sma(values, period);
  const upper: Array<number | null> = [], lower: Array<number | null> = [], bandwidth: Array<number | null> = [];
  for (let i = 0; i < values.length; i++) {
    if (middle[i] === null) { upper.push(null); lower.push(null); bandwidth.push(null); continue; }
    const sd = stddev(values.slice(i - period + 1, i + 1), false);
    const m = middle[i] as number;
    upper.push(m + mult * sd); lower.push(m - mult * sd); bandwidth.push(m ? (2 * mult * sd) / m : null);
  }
  return { middle, upper, lower, bandwidth };
}

/* ------------------------------ risk -------------------------------- */

export function annualisedVolatility(returns: number[], periodsPerYear: number): number {
  return stddev(returns) * Math.sqrt(periodsPerYear);
}

export function sharpe(returns: number[], periodsPerYear: number, riskFreeAnnual = 0): number {
  const sd = stddev(returns);
  if (!sd) return 0;
  const excess = mean(returns) - riskFreeAnnual / periodsPerYear;
  return (excess / sd) * Math.sqrt(periodsPerYear);
}

export function sortino(returns: number[], periodsPerYear: number): number {
  const downside = returns.filter((r) => r < 0);
  const dd = Math.sqrt(kahanSum(downside.map((r) => r * r)) / Math.max(1, returns.length));
  if (!dd) return 0;
  return (mean(returns) / dd) * Math.sqrt(periodsPerYear);
}

export function maxDrawdown(prices: number[]): { depth: number; peakIndex: number; troughIndex: number; recovered: boolean } {
  let peak = -Infinity, peakIdx = 0, best = 0, bestPeak = 0, bestTrough = 0;
  prices.forEach((p, i) => {
    if (p > peak) { peak = p; peakIdx = i; }
    const dd = peak > 0 ? (peak - p) / peak : 0;
    if (dd > best) { best = dd; bestPeak = peakIdx; bestTrough = i; }
  });
  const recovered = bestTrough < prices.length - 1 && prices.slice(bestTrough).some((p) => p >= prices[bestPeak]);
  return { depth: best, peakIndex: bestPeak, troughIndex: bestTrough, recovered };
}

export function historicalVaR(returns: number[], confidence = 0.95): { var: number; cvar: number } {
  if (!returns.length) return { var: 0, cvar: 0 };
  const sorted = [...returns].sort((a, b) => a - b);
  const cutoff = quantile(sorted, 1 - confidence);
  const tail = sorted.filter((r) => r <= cutoff);
  return { var: -cutoff, cvar: -(tail.length ? mean(tail) : cutoff) };
}

/** Parametric (Gaussian) VaR using the inverse normal CDF (Acklam approximation). */
export function parametricVaR(returns: number[], confidence = 0.95): number {
  const z = inverseNormal(confidence);
  return -(mean(returns) - z * stddev(returns));
}

export function inverseNormal(p: number): number {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const plow = 0.02425, phigh = 1 - plow;
  let q: number, r: number;
  if (p < plow) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p <= phigh) { q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

/* ---------------------------- regression ---------------------------- */

export function linearRegression(values: number[]): { slope: number; intercept: number; r2: number; slopePct: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0, r2: 0, slopePct: 0 };
  const xs = values.map((_, i) => i);
  const mx = (n - 1) / 2, my = mean(values);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = values[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  const slope = sxx ? sxy / sxx : 0;
  const intercept = my - slope * mx;
  const r2 = syy ? (sxy * sxy) / (sxx * syy) : 0;
  return { slope, intercept, r2, slopePct: my ? slope / my : 0 };
}

export function zScore(values: number[], lookback = 20): number {
  const window = values.slice(-lookback);
  const sd = stddev(window);
  return sd ? (values[values.length - 1] - mean(window)) / sd : 0;
}

/* --------------------------- Monte Carlo ---------------------------- */

/** mulberry32 — small, fast, seedable PRNG. */
export function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function gaussian(rand: () => number): number {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export type MonteCarloResult = {
  horizonDays: number; paths: number; seed: number;
  steps: Array<{ day: number; p5: number; p25: number; p50: number; p75: number; p95: number }>;
  terminal: { p5: number; p25: number; p50: number; p75: number; p95: number; mean: number };
  probabilityAbove: number; probabilityDrawdown20: number; expectedReturn: number;
};

/** Geometric Brownian motion with drift/vol estimated from log returns. */
export function monteCarloGBM(options: { s0: number; muDaily: number; sigmaDaily: number; days: number; paths?: number; seed?: number; sampleEvery?: number }): MonteCarloResult {
  const paths = options.paths ?? 2_000, seed = options.seed ?? 42, days = options.days;
  const sampleEvery = options.sampleEvery ?? Math.max(1, Math.round(days / 30));
  const rand = prng(seed);
  const drift = options.muDaily - 0.5 * options.sigmaDaily ** 2;
  const sampled: number[][] = [];
  const terminals: number[] = [];
  let above = 0, drawdownHits = 0;
  for (let p = 0; p < paths; p++) {
    let s = options.s0, peak = s, hitDd = false;
    for (let d = 1; d <= days; d++) {
      s *= Math.exp(drift + options.sigmaDaily * gaussian(rand));
      if (s > peak) peak = s;
      if (!hitDd && peak > 0 && (peak - s) / peak >= 0.2) hitDd = true;
      if (d % sampleEvery === 0 || d === days) {
        const idx = Math.ceil(d / sampleEvery) - 1;
        (sampled[idx] ??= []).push(s);
      }
    }
    terminals.push(s);
    if (s > options.s0) above++;
    if (hitDd) drawdownHits++;
  }
  const steps = sampled.map((bucket, i) => {
    const sorted = bucket.sort((a, b) => a - b);
    return { day: Math.min(days, (i + 1) * sampleEvery), p5: quantile(sorted, 0.05), p25: quantile(sorted, 0.25), p50: quantile(sorted, 0.5), p75: quantile(sorted, 0.75), p95: quantile(sorted, 0.95) };
  });
  const sortedTerm = [...terminals].sort((a, b) => a - b);
  return {
    horizonDays: days, paths, seed, steps,
    terminal: { p5: quantile(sortedTerm, 0.05), p25: quantile(sortedTerm, 0.25), p50: quantile(sortedTerm, 0.5), p75: quantile(sortedTerm, 0.75), p95: quantile(sortedTerm, 0.95), mean: mean(terminals) },
    probabilityAbove: above / paths, probabilityDrawdown20: drawdownHits / paths, expectedReturn: mean(terminals) / options.s0 - 1,
  };
}

/* --------------------------- correlation ---------------------------- */

export function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 3) return 0;
  const ma = mean(a.slice(0, n)), mb = mean(b.slice(0, n));
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { const da = a[i] - ma, db = b[i] - mb; sab += da * db; saa += da * da; sbb += db * db; }
  return saa && sbb ? sab / Math.sqrt(saa * sbb) : 0;
}

export function beta(asset: number[], benchmark: number[]): number {
  const n = Math.min(asset.length, benchmark.length);
  if (n < 3) return 0;
  const ma = mean(asset.slice(0, n)), mb = mean(benchmark.slice(0, n));
  let cov = 0, varB = 0;
  for (let i = 0; i < n; i++) { cov += (asset[i] - ma) * (benchmark[i] - mb); varB += (benchmark[i] - mb) ** 2; }
  return varB ? cov / varB : 0;
}

/** Align series onto shared day buckets (UTC) then compute pairwise Pearson on log returns. */
export function correlationMatrix(series: Record<string, SeriesPoint[]>): { ids: string[]; matrix: number[][]; observations: number } {
  const ids = Object.keys(series);
  const daily = ids.map((id) => {
    const byDay = new Map<number, number>();
    for (const [ts, v] of series[id]) byDay.set(Math.floor(ts / 86_400_000), v);
    return byDay;
  });
  const shared = [...daily[0]?.keys() ?? []].filter((day) => daily.every((m) => m.has(day))).sort((a, b) => a - b);
  const returns = daily.map((m) => logReturns(shared.map((day) => m.get(day) as number)));
  const matrix = ids.map((_, i) => ids.map((__, j) => (i === j ? 1 : pearson(returns[i], returns[j]))));
  return { ids, matrix, observations: Math.max(0, shared.length - 1) };
}

/* ----------------------- support / resistance ----------------------- */

export function supportResistance(prices: number[], lookback = 60): { support: number[]; resistance: number[]; pivot: number } {
  const window = prices.slice(-lookback);
  const highs: number[] = [], lows: number[] = [];
  for (let i = 2; i < window.length - 2; i++) {
    const p = window[i];
    if (p > window[i - 1] && p > window[i - 2] && p > window[i + 1] && p > window[i + 2]) highs.push(p);
    if (p < window[i - 1] && p < window[i - 2] && p < window[i + 1] && p < window[i + 2]) lows.push(p);
  }
  const last = window[window.length - 1] ?? 0;
  const cluster = (levels: number[]) => {
    const sorted = [...levels].sort((a, b) => a - b);
    const out: number[] = [];
    for (const level of sorted) { if (!out.length || Math.abs(level - out[out.length - 1]) / level > 0.015) out.push(level); else out[out.length - 1] = (out[out.length - 1] + level) / 2; }
    return out;
  };
  const support = cluster(lows).filter((l) => l < last).slice(-3).reverse();
  const resistance = cluster(highs).filter((h) => h > last).slice(0, 3);
  const hi = Math.max(...window), lo = Math.min(...window);
  return { support, resistance, pivot: (hi + lo + last) / 3 };
}

/* ---------------------------- composite ----------------------------- */

export type SignalComponent = { name: string; score: number; weight: number; reason: string };
export type CompositeSignal = { score: number; label: "strong bearish" | "bearish" | "neutral" | "bullish" | "strong bullish"; components: SignalComponent[]; confidence: number };

export function compositeSignal(input: { prices: number[]; rsi: number | null; macdHist: number | null; macdHistPrev: number | null; sma20: number | null; sma50: number | null; regression: { slopePct: number; r2: number }; z: number; volAnnual: number }): CompositeSignal {
  const last = input.prices[input.prices.length - 1];
  const components: SignalComponent[] = [];
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  if (input.sma20 !== null && input.sma50 !== null) {
    const trend = clamp(((last - input.sma50) / input.sma50) * 8) * 0.6 + (input.sma20 > input.sma50 ? 0.4 : -0.4);
    components.push({ name: "Trend (SMA 20/50)", score: clamp(trend), weight: 0.3, reason: `${input.sma20 > input.sma50 ? "Short average above long average" : "Short average below long average"}; price is ${(((last - input.sma50) / input.sma50) * 100).toFixed(1)}% from SMA 50.` });
  }
  components.push({ name: "Regression slope", score: clamp(input.regression.slopePct * 150) * Math.max(0.3, input.regression.r2), weight: 0.2, reason: `Fitted slope ${(input.regression.slopePct * 100).toFixed(2)}%/period, R² ${input.regression.r2.toFixed(2)}.` });
  if (input.rsi !== null) {
    const score = input.rsi > 70 ? -((input.rsi - 70) / 30) : input.rsi < 30 ? (30 - input.rsi) / 30 : (input.rsi - 50) / 50;
    components.push({ name: "Momentum (RSI 14)", score: clamp(score), weight: 0.2, reason: input.rsi > 70 ? `RSI ${input.rsi.toFixed(0)} — overbought territory.` : input.rsi < 30 ? `RSI ${input.rsi.toFixed(0)} — oversold territory.` : `RSI ${input.rsi.toFixed(0)} — neutral range.` });
  }
  if (input.macdHist !== null) {
    const rising = input.macdHistPrev !== null && input.macdHist > input.macdHistPrev;
    const norm = last ? clamp((input.macdHist / last) * 400) : 0;
    components.push({ name: "MACD histogram", score: clamp(norm + (rising ? 0.2 : -0.2)), weight: 0.15, reason: `${input.macdHist >= 0 ? "Positive" : "Negative"} histogram, ${rising ? "expanding" : "contracting"}.` });
  }
  components.push({ name: "Mean reversion (z-score)", score: clamp(-input.z / 3), weight: 0.15, reason: `${Math.abs(input.z).toFixed(2)}σ ${input.z >= 0 ? "above" : "below"} the 20-period mean.` });
  const weight = kahanSum(components.map((c) => c.weight)) || 1;
  const raw = kahanSum(components.map((c) => c.score * c.weight)) / weight;
  const score = Math.round(raw * 100);
  const confidence = Math.max(0.1, Math.min(0.95, (0.5 + input.regression.r2 * 0.3) * (input.volAnnual > 1.5 ? 0.7 : 1)));
  const label = score <= -50 ? "strong bearish" : score <= -15 ? "bearish" : score < 15 ? "neutral" : score < 50 ? "bullish" : "strong bullish";
  return { score, label, components, confidence };
}

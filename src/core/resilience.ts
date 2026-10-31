/**
 * Resilience primitives: bounded timeouts, retry with exponential backoff and
 * decorrelated jitter, circuit breakers per upstream, and an ordered provider
 * fallback chain. Breakers are process-wide singletons so every route shares
 * the same view of an upstream's health, and the remediation engine can open
 * or close them explicitly.
 */
import { AppError, classifyError } from "./errors";

export async function withTimeout<T>(task: (signal: AbortSignal) => Promise<T>, ms: number, label = "operation"): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new AppError("upstream_timeout", `${label} timed out after ${ms}ms`)), ms);
  try {
    return await task(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) throw controller.signal.reason instanceof AppError ? controller.signal.reason : new AppError("upstream_timeout", `${label} timed out after ${ms}ms`, { cause: error });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function retry<T>(task: (attempt: number) => Promise<T>, options: { attempts?: number; baseMs?: number; maxMs?: number; retryOn?: (error: unknown) => boolean } = {}): Promise<T> {
  const attempts = options.attempts ?? 3;
  const baseMs = options.baseMs ?? 180;
  const maxMs = options.maxMs ?? 2_000;
  let lastError: unknown;
  let sleep = baseMs;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await task(attempt);
    } catch (error) {
      lastError = error;
      const retryable = options.retryOn ? options.retryOn(error) : error instanceof AppError ? error.retryable : true;
      if (!retryable || attempt === attempts) break;
      // Decorrelated jitter (AWS architecture blog): sleep = min(max, rand(base, sleep*3)).
      sleep = Math.min(maxMs, baseMs + Math.random() * (sleep * 3 - baseMs));
      await new Promise((resolve) => setTimeout(resolve, sleep));
    }
  }
  throw lastError;
}

export type BreakerState = "closed" | "open" | "half-open";

export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;
  private state: BreakerState = "closed";
  private lastError: string | null = null;
  totalCalls = 0;
  totalFailures = 0;
  constructor(readonly name: string, private readonly threshold = 3, private cooldownMs = 45_000) {}

  snapshot() {
    return { name: this.name, state: this.currentState(), failures: this.failures, totalCalls: this.totalCalls, totalFailures: this.totalFailures, cooldownMs: this.cooldownMs, lastError: this.lastError, reopensInMs: this.state === "open" ? Math.max(0, this.cooldownMs - (Date.now() - this.openedAt)) : 0 };
  }

  currentState(): BreakerState {
    if (this.state === "open" && Date.now() - this.openedAt >= this.cooldownMs) this.state = "half-open";
    return this.state;
  }

  /** Remediation hooks. */
  trip(reason: string): void { this.state = "open"; this.openedAt = Date.now(); this.lastError = reason; }
  reset(): void { this.state = "closed"; this.failures = 0; this.lastError = null; }
  setCooldown(ms: number): void { this.cooldownMs = ms; }

  async run<T>(task: () => Promise<T>): Promise<T> {
    const state = this.currentState();
    if (state === "open") throw new AppError("upstream_unavailable", `${this.name} circuit is open`, { retryable: true, detail: { breaker: this.name } });
    this.totalCalls++;
    try {
      const result = await task();
      this.failures = 0;
      this.state = "closed";
      return result;
    } catch (error) {
      this.failures++;
      this.totalFailures++;
      this.lastError = classifyError(error).message;
      if (state === "half-open" || this.failures >= this.threshold) {
        this.state = "open";
        this.openedAt = Date.now();
      }
      throw error;
    }
  }
}

const globalForBreakers = globalThis as typeof globalThis & { __radixBreakers?: Map<string, CircuitBreaker> };
const breakers = globalForBreakers.__radixBreakers ?? new Map<string, CircuitBreaker>();
globalForBreakers.__radixBreakers = breakers;

export function breaker(name: string, threshold?: number, cooldownMs?: number): CircuitBreaker {
  const existing = breakers.get(name);
  if (existing) return existing;
  const created = new CircuitBreaker(name, threshold, cooldownMs);
  breakers.set(name, created);
  return created;
}

export function allBreakers() { return [...breakers.values()].map((b) => b.snapshot()); }

export type ProviderAttempt = { provider: string; ok: boolean; ms: number; error?: string };

/** Try providers in order; return the first success plus a trace of every attempt. */
export async function fallbackChain<T>(providers: Array<{ name: string; run: () => Promise<T> }>): Promise<{ value: T; provider: string; attempts: ProviderAttempt[] }> {
  const attempts: ProviderAttempt[] = [];
  let lastError: unknown = new AppError("upstream_unavailable", "No provider available");
  for (const provider of providers) {
    const started = Date.now();
    try {
      const value = await provider.run();
      attempts.push({ provider: provider.name, ok: true, ms: Date.now() - started });
      return { value, provider: provider.name, attempts };
    } catch (error) {
      lastError = error;
      attempts.push({ provider: provider.name, ok: false, ms: Date.now() - started, error: classifyError(error).message.slice(0, 160) });
    }
  }
  const final = lastError instanceof AppError ? lastError : new AppError("upstream_unavailable", classifyError(lastError).message, { cause: lastError });
  (final as AppError & { attempts?: ProviderAttempt[] }).attempts = attempts;
  throw final;
}

/** fetch() with timeout, JSON parsing and status classification. */
export async function fetchJson<T>(url: string, options: { timeoutMs?: number; headers?: Record<string, string>; label?: string } = {}): Promise<T> {
  const label = options.label ?? new URL(url).host;
  return withTimeout(async (signal) => {
    const response = await fetch(url, { headers: { Accept: "application/json", ...(options.headers ?? {}) }, signal, cache: "no-store" });
    if (response.status === 429) throw new AppError("rate_limited", `${label} rate limited`, { retryable: true });
    if (!response.ok) throw new AppError("upstream_unavailable", `${label} responded ${response.status}`, { retryable: response.status >= 500 });
    try {
      return (await response.json()) as T;
    } catch (error) {
      throw new AppError("malformed_payload", `${label} returned malformed JSON`, { cause: error });
    }
  }, options.timeoutMs ?? 6_500, label);
}

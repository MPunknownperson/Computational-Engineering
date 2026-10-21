/**
 * High-speed in-process cache with:
 *   - TTL freshness and a separate stale-while-revalidate window
 *   - request coalescing (concurrent callers share one in-flight promise)
 *   - bounded LRU eviction
 *   - stale fallback when a refresh throws (serve last-known-good, flag it)
 *   - per-entry statistics for the engine status page
 *
 * It is deliberately dependency-free so it runs identically in the Node
 * runtime, in tests and inside the remediation self-test.
 */

type Entry<T> = { value: T; storedAt: number; ttlMs: number; swrMs: number; hits: number; source: string };

export type CacheRead<T> = { value: T; age: number; state: "fresh" | "stale" | "miss"; source: string; coalesced: boolean };

type CacheStats = { entries: number; hits: number; misses: number; staleServed: number; coalesced: number; refreshErrors: number; evictions: number };

const globalForCache = globalThis as typeof globalThis & { __radixFastCache?: Map<string, FastCache<unknown>> };
const registry = globalForCache.__radixFastCache ?? new Map<string, FastCache<unknown>>();
if (process.env.NODE_ENV !== "production") globalForCache.__radixFastCache = registry;

export class FastCache<T> {
  private readonly entries = new Map<string, Entry<T>>();
  private readonly inflight = new Map<string, Promise<T>>();
  readonly stats: CacheStats = { entries: 0, hits: 0, misses: 0, staleServed: 0, coalesced: 0, refreshErrors: 0, evictions: 0 };

  constructor(readonly name: string, private readonly maxEntries = 256) {}

  static named<T>(name: string, maxEntries?: number): FastCache<T> {
    const existing = registry.get(name);
    if (existing) return existing as FastCache<T>;
    const created = new FastCache<T>(name, maxEntries);
    registry.set(name, created as FastCache<unknown>);
    return created;
  }

  static all(): Array<{ name: string } & CacheStats> {
    return [...registry.values()].map((cache) => ({ name: cache.name, ...cache.stats, entries: cache.entries.size }));
  }

  peek(key: string): CacheRead<T> | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    const age = Date.now() - entry.storedAt;
    return { value: entry.value, age, state: age <= entry.ttlMs ? "fresh" : "stale", source: entry.source, coalesced: false };
  }

  set(key: string, value: T, options: { ttlMs: number; swrMs?: number; source?: string }): void {
    if (!this.entries.has(key) && this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) { this.entries.delete(oldest); this.stats.evictions++; }
    }
    this.entries.set(key, { value, storedAt: Date.now(), ttlMs: options.ttlMs, swrMs: options.swrMs ?? options.ttlMs * 10, hits: 0, source: options.source ?? "compute" });
  }

  delete(key: string): void { this.entries.delete(key); }
  clear(): void { this.entries.clear(); this.inflight.clear(); }

  /**
   * Fresh → return immediately. Stale within SWR window → return stale and
   * refresh in the background. Otherwise compute (coalesced). If compute
   * fails and any stale value exists, serve it flagged as stale.
   */
  async read(key: string, compute: () => Promise<{ value: T; source?: string }>, options: { ttlMs: number; swrMs?: number }): Promise<CacheRead<T>> {
    const entry = this.entries.get(key);
    const now = Date.now();
    if (entry) {
      const age = now - entry.storedAt;
      if (age <= entry.ttlMs) {
        entry.hits++; this.stats.hits++;
        this.entries.delete(key); this.entries.set(key, entry); // LRU touch
        return { value: entry.value, age, state: "fresh", source: entry.source, coalesced: false };
      }
      if (age <= entry.ttlMs + entry.swrMs) {
        this.stats.staleServed++;
        void this.refresh(key, compute, options).catch(() => undefined);
        return { value: entry.value, age, state: "stale", source: entry.source, coalesced: false };
      }
    }
    this.stats.misses++;
    const coalesced = this.inflight.has(key);
    if (coalesced) this.stats.coalesced++;
    try {
      const value = await this.refresh(key, compute, options);
      const stored = this.entries.get(key);
      return { value, age: 0, state: "fresh", source: stored?.source ?? "compute", coalesced };
    } catch (error) {
      if (entry) {
        this.stats.staleServed++;
        return { value: entry.value, age: now - entry.storedAt, state: "stale", source: entry.source, coalesced };
      }
      throw error;
    }
  }

  private refresh(key: string, compute: () => Promise<{ value: T; source?: string }>, options: { ttlMs: number; swrMs?: number }): Promise<T> {
    const pending = this.inflight.get(key);
    if (pending) return pending;
    const task = (async () => {
      try {
        const result = await compute();
        this.set(key, result.value, { ...options, source: result.source });
        return result.value;
      } catch (error) {
        this.stats.refreshErrors++;
        throw error;
      } finally {
        this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, task);
    return task;
  }
}

/**
 * Cooperative time-sliced scheduler.
 *
 * The deployment is a single HTML file, so a separate worker bundle is not
 * available. Instead of blocking the main thread, long computations yield
 * control on a frame budget so touch scrolling, typing and navigation stay
 * responsive. Every task is cancellable.
 */
export interface SliceOptions {
  budgetMs?: number;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
}

export class ComputationAborted extends Error {
  constructor() {
    super('The computation was cancelled.');
    this.name = 'ComputationAborted';
  }
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function yieldToBrowser(): Promise<void> {
  return new Promise(resolve => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });
}

/** Runs `total` indexed steps, pausing whenever the frame budget is exhausted. */
export async function runSliced<T>(total: number, step: (index: number) => T, options: SliceOptions = {}): Promise<T[]> {
  const { budgetMs = 8, signal, onProgress } = options;
  const results: T[] = new Array(total);
  let index = 0;
  while (index < total) {
    if (signal?.aborted) throw new ComputationAborted();
    const sliceStart = now();
    while (index < total && now() - sliceStart < budgetMs) {
      results[index] = step(index);
      index++;
    }
    onProgress?.(index, total);
    if (index < total) await yieldToBrowser();
  }
  return results;
}

/** Simple LRU cache shared by the engine layers so repeated work is never recomputed. */
export class MemoCache<T> {
  private readonly store = new Map<string, T>();
  constructor(private readonly limit = 48) {}
  get(key: string) {
    const hit = this.store.get(key);
    if (hit === undefined) return undefined;
    this.store.delete(key);
    this.store.set(key, hit);
    return hit;
  }
  set(key: string, value: T) {
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, value);
    if (this.store.size > this.limit) this.store.delete(this.store.keys().next().value!);
    return value;
  }
  clear() { this.store.clear(); }
  get size() { return this.store.size; }
}

export function stableKey(value: unknown): string {
  return JSON.stringify(value, (_, item) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      return Object.fromEntries(Object.entries(item as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)));
    }
    return item === Infinity ? 'Infinity' : item;
  });
}

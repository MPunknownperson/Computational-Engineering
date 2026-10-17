"use client";

import type * as TF from "@tensorflow/tfjs";
import { functionalStorage, optionalPurposeAllowed, subscribeConsentChange } from "@/lib/privacy/browser-consent";

/**
 * Shared TensorFlow.js runtime.
 *
 * Everything in `src/lib/ml/` runs inside the visitor's browser. Models are
 * tiny, are trained on-device from the site's own vocabulary plus (optionally)
 * the visitor's own local usage, and are cached in this browser's IndexedDB.
 * No audio, text, model or training data is sent to a server, and no model
 * weights are downloaded from a third party.
 *
 * TensorFlow.js itself is code-split: nothing loads until a feature that needs
 * it is actually used (recognised-text intent suggestions, predictive input, personalisation).
 */
export type Tf = typeof TF;
export type LayersModel = TF.LayersModel;

const PREFIX = "radixloom.ml.";
const MODEL_PREFIX = "radixloom-";

let loading: Promise<Tf | null> | null = null;

export function loadTf(): Promise<Tf | null> {
  if (typeof window === "undefined" || !optionalPurposeAllowed("functional")) return Promise.resolve(null);
  loading ??= (async () => {
    try {
      const tf = await import("@tensorflow/tfjs");
      // Prefer the GPU path, fall back to the CPU path for tiny models or
      // browsers without WebGL.
      let ok = false;
      try { ok = await tf.setBackend("webgl"); } catch { ok = false; }
      if (!ok) await tf.setBackend("cpu");
      await tf.ready();
      return tf;
    } catch {
      return null;
    }
  })();
  return loading;
}

/** Training jobs run one at a time so they never fight for the main thread. */
let chain: Promise<unknown> = Promise.resolve();
export function serial<T>(job: () => Promise<T>): Promise<T> {
  const run = chain.then(job, job);
  chain = run.catch(() => undefined);
  return run;
}

const instances = new Map<string, Promise<unknown>>();
if (typeof window !== "undefined") subscribeConsentChange(() => {
  if (!optionalPurposeAllowed("functional")) instances.clear();
});
/** Memoise a model for the lifetime of the page. */
export function memo<T>(key: string, make: () => Promise<T>): Promise<T> {
  const existing = instances.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const created = make();
  instances.set(key, created);
  return created;
}
export function dropMemo(prefix: string) {
  for (const key of Array.from(instances.keys())) if (key.startsWith(prefix)) instances.delete(key);
}

/* ---------------------------- local storage ---------------------------- */

function storage(): Storage | null {
  try {
    return functionalStorage();
  } catch {
    return null;
  }
}

export function readJson<T>(key: string, fallback: T): T {
  const store = storage();
  if (!store) return fallback;
  try {
    const raw = store.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown) {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* quota or private mode: personalisation is best effort */
  }
}

export function fnv(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

/* ----------------------------- model cache ----------------------------- */

interface Meta { hash: string; extra: unknown }

export async function loadCached(tf: Tf, name: string, hash: string): Promise<{ model: LayersModel; extra: unknown } | null> {
  const meta = readJson<Meta | null>(`model.${name}`, null);
  if (!meta || meta.hash !== hash) return null;
  try {
    return { model: await tf.loadLayersModel(`indexeddb://${MODEL_PREFIX}${name}`), extra: meta.extra };
  } catch {
    return null;
  }
}

export async function saveCached(name: string, hash: string, model: LayersModel, extra: unknown) {
  if (!optionalPurposeAllowed("functional")) return;
  try {
    await model.save(`indexeddb://${MODEL_PREFIX}${name}`);
    writeJson(`model.${name}`, { hash, extra } satisfies Meta);
  } catch {
    /* IndexedDB can be unavailable; the model is simply retrained next time */
  }
}

/* ------------------------------ forgetting ----------------------------- */

const DATA_KEYS = ["voice", "expr", "use"] as const;

export interface MlSummary { phrases: number; expressions: number; uses: number }

export function mlSummary(): MlSummary {
  const count = (key: string) => {
    const value = readJson<unknown[]>(key, []);
    return Array.isArray(value) ? value.length : 0;
  };
  return { phrases: count("voice"), expressions: count("expr"), uses: count("use") };
}

export function hasMlData(): boolean {
  const summary = mlSummary();
  return summary.phrases + summary.expressions + summary.uses > 0;
}

/** Remove everything the on-device models learned, including cached weights. */
export async function clearMlData(): Promise<void> {
  // Explicit data-deletion controls remain available even when consent is off.
  let store: Storage | null = null;
  try { store = window.localStorage; } catch { /* storage blocked */ }
  const names: string[] = [];
  if (store) {
    try {
      for (let index = 0; index < store.length; index += 1) {
        const key = store.key(index);
        if (key?.startsWith(`${PREFIX}model.`)) names.push(key.slice(`${PREFIX}model.`.length));
      }
      for (const key of DATA_KEYS) store.removeItem(PREFIX + key);
      for (const name of names) store.removeItem(`${PREFIX}model.${name}`);
    } catch {
      /* ignore */
    }
  }
  instances.clear();
  if (names.length === 0) return;
  const tf = await import("@tensorflow/tfjs").catch(() => null);
  if (!tf) return;
  await Promise.all(names.map((name) => tf.io.removeModel(`indexeddb://${MODEL_PREFIX}${name}`).catch(() => undefined)));
}

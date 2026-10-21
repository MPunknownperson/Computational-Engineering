/**
 * Runtime configuration with deployable patches.
 *
 * The remediation engine "deploys" a fix by writing a patch here (for example
 * switching the primary market-data provider, slowing the poll interval while
 * an upstream is rate limiting, or raising a timeout). Patches take effect
 * immediately in memory and are persisted so a restarted server keeps them
 * until they expire.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const RUNTIME_DEFAULTS = {
  "crypto.primaryProvider": "coingecko" as "coingecko" | "coinbase",
  "crypto.pollMs": 45_000,
  "crypto.cacheTtlMs": 60_000,
  "crypto.timeoutMs": 6_500,
  "crypto.historyTtlMs": 15 * 60_000,
  "crypto.autoUpdater": true,
  "crypto.persistSnapshots": true,
  "client.pollMs": 30_000,
  "client.streamPushMs": 15_000,
  "client.transport": "sse" as "sse" | "polling",
  "client.minRefreshMs": 10_000,
};

export type RuntimeKey = keyof typeof RUNTIME_DEFAULTS;
export type RuntimeValue<K extends RuntimeKey> = (typeof RUNTIME_DEFAULTS)[K];

type Patch = { value: unknown; reason: string | null; expiresAt: number | null; updatedAt: number };

const globalForRuntime = globalThis as typeof globalThis & { __radixRuntimePatches?: Map<string, Patch>; __radixRuntimeLoaded?: Promise<void> | null };
const patches = globalForRuntime.__radixRuntimePatches ?? new Map<string, Patch>();
globalForRuntime.__radixRuntimePatches = patches;

export function getRuntime<K extends RuntimeKey>(key: K): RuntimeValue<K> {
  const patch = patches.get(key);
  if (patch && (patch.expiresAt === null || patch.expiresAt > Date.now())) return patch.value as RuntimeValue<K>;
  if (patch) patches.delete(key);
  return RUNTIME_DEFAULTS[key];
}

export function listPatches(): Array<{ key: string; value: unknown; reason: string | null; expiresAt: string | null; updatedAt: string; default: unknown }> {
  const now = Date.now();
  return [...patches.entries()]
    .filter(([, patch]) => patch.expiresAt === null || patch.expiresAt > now)
    .map(([key, patch]) => ({ key, value: patch.value, reason: patch.reason, expiresAt: patch.expiresAt ? new Date(patch.expiresAt).toISOString() : null, updatedAt: new Date(patch.updatedAt).toISOString(), default: RUNTIME_DEFAULTS[key as RuntimeKey] }));
}

/** Apply a patch immediately and persist it (persistence failure never blocks the fix). */
export async function setRuntimePatch<K extends RuntimeKey>(key: K, value: RuntimeValue<K>, reason: string, ttlMs: number | null = 30 * 60_000): Promise<void> {
  const expiresAt = ttlMs === null ? null : Date.now() + ttlMs;
  patches.set(key, { value, reason, expiresAt, updatedAt: Date.now() });
  try {
    await db.execute(sql`insert into runtime_patches (key, value, reason, expires_at, updated_at)
      values (${key}, ${JSON.stringify(value)}::jsonb, ${reason}, ${expiresAt ? new Date(expiresAt) : null}, now())
      on conflict (key) do update set value = excluded.value, reason = excluded.reason, expires_at = excluded.expires_at, updated_at = now()`);
  } catch {
    // Persisting is best effort; the in-memory patch is already live.
  }
}

export async function clearRuntimePatch(key: RuntimeKey): Promise<void> {
  patches.delete(key);
  try { await db.execute(sql`delete from runtime_patches where key = ${key}`); } catch { /* best effort */ }
}

/** Load persisted patches once per process (lazy, never throws). */
export function loadRuntimePatches(): Promise<void> {
  if (globalForRuntime.__radixRuntimeLoaded) return globalForRuntime.__radixRuntimeLoaded;
  globalForRuntime.__radixRuntimeLoaded = (async () => {
    try {
      const result = await db.execute(sql`select key, value, reason, expires_at, updated_at from runtime_patches where expires_at is null or expires_at > now()`);
      for (const row of result.rows as Array<{ key: string; value: unknown; reason: string | null; expires_at: Date | string | null; updated_at: Date | string }>) {
        if (!(row.key in RUNTIME_DEFAULTS)) continue;
        patches.set(row.key, { value: row.value, reason: row.reason, expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : null, updatedAt: new Date(row.updated_at).getTime() });
      }
    } catch {
      globalForRuntime.__radixRuntimeLoaded = null; // retry on next call
    }
  })();
  return globalForRuntime.__radixRuntimeLoaded;
}

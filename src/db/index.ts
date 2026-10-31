import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type DB = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as typeof globalThis & {
  __quillorynPool?: Pool;
  __quillorynDb?: DB;
};

/**
 * Lazily create the pool on first use so `next build` (e.g. on Cloudflare,
 * where DATABASE_URL is not present at build time) never fails at import.
 */
function getPool(): Pool {
  if (globalForDb.__quillorynPool) return globalForDb.__quillorynPool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  const p = new Pool({ connectionString });
  globalForDb.__quillorynPool = p;
  return p;
}

function getDb(): DB {
  if (!globalForDb.__quillorynDb) globalForDb.__quillorynDb = drizzle(getPool(), { schema });
  return globalForDb.__quillorynDb;
}

export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

export const pool: Pool = new Proxy({} as Pool, {
  get(_t, prop) {
    const p = getPool();
    const v = Reflect.get(p, prop, p);
    return typeof v === "function" ? v.bind(p) : v;
  },
});

export const db: DB = new Proxy({} as DB, {
  get(_t, prop) {
    const d = getDb();
    const v = Reflect.get(d, prop, d);
    return typeof v === "function" ? v.bind(d) : v;
  },
});

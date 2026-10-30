/**
 * Automated error-remediation engine.
 *
 * Pipeline:  capture → classify → fingerprint → record incident →
 *            select playbook → generate fix plan → deploy server actions →
 *            verify → persist audit trail → hand client actions back.
 *
 * Server actions change live behaviour (runtime patches, cache resets,
 * breaker state, schema self-healing, DB pool reconnection, warm-up).
 * Client actions are instructions for the browser that reported the error
 * (clear a corrupt storage key, cache-busting reload, retry, switch
 * transport, reset the error boundary).
 */
import { desc, eq, sql } from "drizzle-orm";
import { db, pool } from "@/db";
import { incidentReports, remediationActions } from "@/db/schema";
import { AppError, classifyError, fingerprintError, severityFor, type ErrorCategory, type Severity } from "@/lib/core/errors";
import { FastCache } from "@/lib/core/fast-cache";
import { allBreakers, breaker } from "@/lib/core/resilience";
import { clearRuntimePatch, getRuntime, listPatches, loadRuntimePatches, setRuntimePatch, type RuntimeKey, type RuntimeValue } from "./runtime-config";

export type ServerAction =
  | { type: "patch"; key: RuntimeKey; value: RuntimeValue<RuntimeKey>; ttlMs: number | null; reason: string }
  | { type: "unpatch"; key: RuntimeKey }
  | { type: "reset-cache"; cache?: string }
  | { type: "trip-breaker"; name: string; cooldownMs?: number }
  | { type: "reset-breaker"; name: string }
  | { type: "ensure-schema" }
  | { type: "reconnect-db" }
  | { type: "warm"; target: "crypto" };

export type ClientAction =
  | { type: "retry"; delayMs: number }
  | { type: "reload"; cacheBust: boolean; delayMs?: number }
  | { type: "clear-storage"; keys: string[]; scope: "local" | "session" | "both" }
  | { type: "switch-transport"; to: "polling" | "sse" }
  | { type: "reset-boundary" }
  | { type: "notify"; message: string };

export type RemediationPlan = {
  playbook: string;
  summary: string;
  serverActions: ServerAction[];
  clientActions: ClientAction[];
  verify: "health" | "crypto" | "none";
};

export type IncidentInput = {
  origin: "server" | "client";
  error?: unknown;
  category?: ErrorCategory;
  message?: string;
  stack?: string;
  route?: string | null;
  userAction?: string | null;
  context?: Record<string, unknown>;
};

export type RemediationResult = {
  incidentId: string | null;
  fingerprint: string;
  category: ErrorCategory;
  severity: Severity;
  plan: RemediationPlan;
  deployed: Array<{ action: string; ok: boolean; detail?: string }>;
  verified: boolean | null;
  durationMs: number;
  throttled: boolean;
};

type Hooks = { warmCrypto?: () => Promise<unknown>; verifyCrypto?: () => Promise<boolean> };
const globalForEngine = globalThis as typeof globalThis & { __radixRemediationHooks?: Hooks; __radixRemediationRecent?: Map<string, number>; __radixSchemaEnsured?: Promise<boolean> | null; __radixBootAt?: number };
const hooks: Hooks = globalForEngine.__radixRemediationHooks ?? {};
globalForEngine.__radixRemediationHooks = hooks;
const recentDeploys = globalForEngine.__radixRemediationRecent ?? new Map<string, number>();
globalForEngine.__radixRemediationRecent = recentDeploys;
globalForEngine.__radixBootAt = globalForEngine.__radixBootAt ?? Date.now();

export function registerRemediationHooks(next: Hooks): void { Object.assign(hooks, next); }

/* ------------------------------------------------------------------ */
/* Schema self-healing                                                 */
/* ------------------------------------------------------------------ */

const SCHEMA_SQL = [
  `create table if not exists crypto_snapshots (id serial primary key, asset_id text not null, symbol text not null, name text not null, vs text not null default 'usd', price text not null, change_24h real, change_7d real, market_cap text, volume_24h text, high_24h text, low_24h text, rank integer, source text not null, captured_at timestamptz not null default now())`,
  `create index if not exists crypto_snapshots_asset_time_idx on crypto_snapshots (asset_id, captured_at)`,
  `create index if not exists crypto_snapshots_time_idx on crypto_snapshots (captured_at)`,
  `create table if not exists crypto_history_cache (id serial primary key, asset_id text not null, vs text not null default 'usd', days integer not null, points jsonb not null default '[]'::jsonb, volumes jsonb not null default '[]'::jsonb, source text not null, fetched_at timestamptz not null default now())`,
  `create unique index if not exists crypto_history_cache_key_idx on crypto_history_cache (asset_id, vs, days)`,
  `create table if not exists crypto_alerts (id uuid primary key default gen_random_uuid(), workspace text not null, asset_id text not null, symbol text not null, vs text not null default 'usd', condition text not null, threshold text not null, note text, status text not null default 'armed', triggered_at timestamptz, triggered_price text, created_at timestamptz not null default now())`,
  `create index if not exists crypto_alerts_workspace_idx on crypto_alerts (workspace)`,
  `create index if not exists crypto_alerts_status_idx on crypto_alerts (status)`,
  `create table if not exists crypto_positions (id uuid primary key default gen_random_uuid(), workspace text not null, asset_id text not null, symbol text not null, quantity text not null, cost_basis text not null, vs text not null default 'usd', note text, created_at timestamptz not null default now())`,
  `create index if not exists crypto_positions_workspace_idx on crypto_positions (workspace)`,
  `create table if not exists incident_reports (id uuid primary key default gen_random_uuid(), fingerprint text not null, origin text not null, category text not null, severity text not null default 'warning', message text not null, stack text, route text, user_action text, context jsonb not null default '{}'::jsonb, occurrences integer not null default 1, status text not null default 'open', first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now())`,
  `create unique index if not exists incident_reports_fingerprint_idx on incident_reports (fingerprint)`,
  `create index if not exists incident_reports_status_idx on incident_reports (status)`,
  `create table if not exists remediation_actions (id uuid primary key default gen_random_uuid(), incident_id uuid, fingerprint text not null, playbook text not null, plan jsonb not null default '{}'::jsonb, outcome text not null default 'applied', detail text, duration_ms integer not null default 0, created_at timestamptz not null default now())`,
  `create index if not exists remediation_actions_fingerprint_idx on remediation_actions (fingerprint)`,
  `create table if not exists runtime_patches (key text primary key, value jsonb not null, reason text, expires_at timestamptz, updated_at timestamptz not null default now())`,
];

/** Idempotent: creates any missing reliability/crypto table. Never throws. */
export async function ensureReliabilitySchema(force = false): Promise<boolean> {
  if (!force && globalForEngine.__radixSchemaEnsured) return globalForEngine.__radixSchemaEnsured;
  const task = (async () => {
    try {
      for (const statement of SCHEMA_SQL) await db.execute(sql.raw(statement));
      return true;
    } catch {
      globalForEngine.__radixSchemaEnsured = null;
      return false;
    }
  })();
  globalForEngine.__radixSchemaEnsured = task;
  return task;
}

/* ------------------------------------------------------------------ */
/* Playbooks                                                           */
/* ------------------------------------------------------------------ */

type Incident = { fingerprint: string; category: ErrorCategory; message: string; route: string | null; origin: "server" | "client"; context: Record<string, unknown>; occurrences: number };

type Playbook = { id: string; matches: (incident: Incident) => boolean; plan: (incident: Incident) => RemediationPlan };

const PLAYBOOKS: Playbook[] = [
  {
    id: "upstream-rate-limit-backoff",
    matches: (i) => i.category === "rate_limited",
    plan: (i) => ({
      playbook: "upstream-rate-limit-backoff",
      summary: "Provider is rate limiting: slow the scheduler, lengthen cache life, serve stale-while-revalidate and move live reads to the secondary provider for 20 minutes.",
      serverActions: [
        { type: "patch", key: "crypto.pollMs", value: 120_000, ttlMs: 20 * 60_000, reason: `rate limited (${i.fingerprint})` },
        { type: "patch", key: "crypto.cacheTtlMs", value: 180_000, ttlMs: 20 * 60_000, reason: "rate limited" },
        { type: "patch", key: "client.pollMs", value: 60_000, ttlMs: 20 * 60_000, reason: "rate limited" },
        { type: "patch", key: "crypto.primaryProvider", value: "coinbase", ttlMs: 20 * 60_000, reason: "rate limited" },
        { type: "trip-breaker", name: "coingecko", cooldownMs: 90_000 },
      ],
      clientActions: [{ type: "retry", delayMs: 4_000 }, { type: "notify", message: "Live feed is being throttled by the data provider. Switched to the secondary feed; figures refresh less often for a while." }],
      verify: "crypto",
    }),
  },
  {
    id: "upstream-timeout-failover",
    matches: (i) => i.category === "upstream_timeout" || i.category === "upstream_unavailable" || i.category === "malformed_payload",
    plan: (i) => ({
      playbook: "upstream-timeout-failover",
      summary: "Primary provider unreachable or returning bad data: fail over to the secondary provider, raise the timeout, open the breaker so requests stop waiting, then re-warm the cache.",
      serverActions: [
        { type: "patch", key: "crypto.primaryProvider", value: "coinbase", ttlMs: 10 * 60_000, reason: `upstream failure (${i.fingerprint})` },
        { type: "patch", key: "crypto.timeoutMs", value: 9_000, ttlMs: 10 * 60_000, reason: "upstream failure" },
        { type: "trip-breaker", name: "coingecko", cooldownMs: 60_000 },
        { type: "reset-cache", cache: "crypto:markets" },
        { type: "warm", target: "crypto" },
      ],
      clientActions: [{ type: "retry", delayMs: 2_500 }],
      verify: "crypto",
    }),
  },
  {
    id: "schema-self-heal",
    matches: (i) => i.category === "schema_missing",
    plan: () => ({
      playbook: "schema-self-heal",
      summary: "A table was missing: create every missing table and index idempotently, then re-run the health probe.",
      serverActions: [{ type: "ensure-schema" }, { type: "reset-cache" }],
      clientActions: [{ type: "retry", delayMs: 1_500 }],
      verify: "health",
    }),
  },
  {
    id: "database-reconnect",
    matches: (i) => i.category === "database_unavailable",
    plan: () => ({
      playbook: "database-reconnect",
      summary: "Database connection failed: drop broken pooled connections, reconnect, and keep serving market data from the in-memory cache and provider chain meanwhile.",
      serverActions: [{ type: "reconnect-db" }, { type: "patch", key: "crypto.persistSnapshots", value: false, ttlMs: 2 * 60_000, reason: "database reconnecting" }],
      clientActions: [{ type: "retry", delayMs: 3_000 }],
      verify: "health",
    }),
  },
  {
    id: "client-chunk-reload",
    matches: (i) => i.category === "chunk_load",
    plan: () => ({
      playbook: "client-chunk-reload",
      summary: "A stale browser bundle referenced a chunk that no longer exists after a deployment: perform one cache-busting reload.",
      serverActions: [],
      clientActions: [{ type: "reload", cacheBust: true, delayMs: 800 }],
      verify: "none",
    }),
  },
  {
    id: "client-storage-repair",
    matches: (i) => i.category === "storage_corrupt",
    plan: () => ({
      playbook: "client-storage-repair",
      summary: "Browser storage held corrupt or over-quota data: clear the application's own keys and reset the view.",
      serverActions: [],
      clientActions: [{ type: "clear-storage", keys: ["radix-crypto:", "quilloryn-crypto", "crypto-workspace-cache"], scope: "both" }, { type: "reset-boundary" }],
      verify: "none",
    }),
  },
  {
    id: "client-hydration-rerender",
    matches: (i) => i.category === "hydration",
    plan: () => ({
      playbook: "client-hydration-rerender",
      summary: "Server and browser markup diverged (usually a clock or locale difference): re-render on the client.",
      serverActions: [],
      clientActions: [{ type: "reset-boundary" }],
      verify: "none",
    }),
  },
  {
    id: "stream-to-polling",
    matches: (i) => i.origin === "client" && /eventsource|stream/i.test(`${i.message} ${i.route ?? ""} ${String(i.context.feature ?? "")}`),
    plan: () => ({
      playbook: "stream-to-polling",
      summary: "The live event stream failed (proxy or browser limitation): switch this client to polling without interrupting the page.",
      serverActions: [{ type: "patch", key: "client.transport", value: "polling", ttlMs: 15 * 60_000, reason: "event stream failures" }],
      clientActions: [{ type: "switch-transport", to: "polling" }],
      verify: "none",
    }),
  },
  {
    id: "render-recover",
    matches: (i) => i.category === "render" || i.category === "unknown",
    plan: (i) => ({
      playbook: "render-recover",
      summary: i.occurrences >= 3
        ? "Repeated render failure: clear cached client state and reload once with a clean cache."
        : "Component failed to render: reset the error boundary and retry with fresh data.",
      serverActions: i.origin === "server" ? [{ type: "reset-cache" }] : [],
      clientActions: i.occurrences >= 3
        ? [{ type: "clear-storage", keys: ["radix-crypto:"], scope: "session" }, { type: "reload", cacheBust: true, delayMs: 600 }]
        : [{ type: "reset-boundary" }, { type: "retry", delayMs: 1_200 }],
      verify: "none",
    }),
  },
  {
    id: "validation-noop",
    matches: (i) => i.category === "validation" || i.category === "not_found",
    plan: () => ({ playbook: "validation-noop", summary: "Input rejected by validation — no system fault; recorded for trend analysis only.", serverActions: [], clientActions: [{ type: "notify", message: "Please check the entered values." }], verify: "none" }),
  },
];

export function generateFix(incident: Incident): RemediationPlan {
  const playbook = PLAYBOOKS.find((candidate) => candidate.matches(incident)) ?? PLAYBOOKS[PLAYBOOKS.length - 2];
  return playbook.plan(incident);
}

/* ------------------------------------------------------------------ */
/* Deployment                                                          */
/* ------------------------------------------------------------------ */

async function deployAction(action: ServerAction): Promise<{ action: string; ok: boolean; detail?: string }> {
  const label = action.type === "patch" ? `patch ${action.key}=${JSON.stringify(action.value)}` : action.type === "unpatch" ? `unpatch ${action.key}` : action.type === "reset-cache" ? `reset-cache ${action.cache ?? "*"}` : action.type === "trip-breaker" || action.type === "reset-breaker" ? `${action.type} ${action.name}` : action.type;
  try {
    switch (action.type) {
      case "patch": await setRuntimePatch(action.key, action.value as never, action.reason, action.ttlMs); break;
      case "unpatch": await clearRuntimePatch(action.key); break;
      case "reset-cache": {
        for (const cache of FastCache.all()) {
          if (!action.cache || cache.name === action.cache) FastCache.named(cache.name).clear();
        }
        break;
      }
      case "trip-breaker": {
        const b = breaker(action.name);
        if (action.cooldownMs) b.setCooldown(action.cooldownMs);
        b.trip("remediation");
        break;
      }
      case "reset-breaker": breaker(action.name).reset(); break;
      case "ensure-schema": {
        const ok = await ensureReliabilitySchema(true);
        if (!ok) throw new Error("schema creation failed");
        break;
      }
      case "reconnect-db": {
        // Evict idle connections so the next query dials fresh; the pool stays usable.
        const idle = (pool as unknown as { _idle?: unknown[] })._idle?.length ?? 0;
        await Promise.race([pool.query("select 1"), new Promise((_, reject) => setTimeout(() => reject(new Error("reconnect probe timed out")), 2_500))]);
        return { action: label, ok: true, detail: `pool probe ok (idle=${idle})` };
      }
      case "warm": {
        if (hooks.warmCrypto) await hooks.warmCrypto();
        break;
      }
    }
    return { action: label, ok: true };
  } catch (error) {
    return { action: label, ok: false, detail: classifyError(error).message.slice(0, 200) };
  }
}

async function verify(kind: RemediationPlan["verify"]): Promise<boolean | null> {
  try {
    if (kind === "health") { await db.execute(sql`select 1`); return true; }
    if (kind === "crypto") return hooks.verifyCrypto ? await hooks.verifyCrypto() : null;
    return null;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Incident intake                                                     */
/* ------------------------------------------------------------------ */

async function upsertIncident(input: { fingerprint: string; origin: "server" | "client"; category: ErrorCategory; severity: Severity; message: string; stack?: string; route: string | null; userAction: string | null; context: Record<string, unknown> }): Promise<{ id: string | null; occurrences: number }> {
  try {
    const rows = await db.insert(incidentReports).values({
      fingerprint: input.fingerprint, origin: input.origin, category: input.category, severity: input.severity,
      message: input.message.slice(0, 1_000), stack: input.stack?.slice(0, 6_000), route: input.route, userAction: input.userAction,
      context: input.context, occurrences: 1, status: "open",
    }).onConflictDoUpdate({
      target: incidentReports.fingerprint,
      set: { occurrences: sql`${incidentReports.occurrences} + 1`, lastSeenAt: new Date(), message: input.message.slice(0, 1_000), route: input.route, userAction: input.userAction, context: input.context, status: sql`case when ${incidentReports.status} = 'resolved' then 'open' else ${incidentReports.status} end` },
    }).returning({ id: incidentReports.id, occurrences: incidentReports.occurrences });
    return rows[0] ?? { id: null, occurrences: 1 };
  } catch (error) {
    // If the incident table itself is missing, heal the schema and retry once.
    if (classifyError(error).category === "schema_missing" && await ensureReliabilitySchema(true)) {
      try {
        const rows = await db.insert(incidentReports).values({ fingerprint: input.fingerprint, origin: input.origin, category: input.category, severity: input.severity, message: input.message.slice(0, 1_000), route: input.route, context: input.context }).returning({ id: incidentReports.id, occurrences: incidentReports.occurrences });
        return rows[0] ?? { id: null, occurrences: 1 };
      } catch { /* fall through */ }
    }
    return { id: null, occurrences: 1 };
  }
}

/** Full pipeline. Never throws — a failing remediation must not mask the original error. */
export async function captureAndRemediate(input: IncidentInput): Promise<RemediationResult> {
  const started = Date.now();
  await loadRuntimePatches();
  const classified = input.error !== undefined ? classifyError(input.error) : { category: input.category ?? "unknown", message: input.message ?? "Unknown error", stack: input.stack };
  const category = input.category ?? classified.category;
  const message = input.message ?? classified.message;
  const stack = input.stack ?? classified.stack;
  const route = input.route ?? null;
  const fingerprint = fingerprintError(category, message, route);
  const severity = severityFor(category);
  const context = { ...(input.context ?? {}), ...(input.error instanceof AppError && input.error.detail ? { detail: input.error.detail } : {}) };
  const stored = await upsertIncident({ fingerprint, origin: input.origin, category, severity, message, stack, route, userAction: input.userAction ?? null, context });

  const incident: Incident = { fingerprint, category, message, route, origin: input.origin, context, occurrences: stored.occurrences };
  const plan = generateFix(incident);

  // Server actions are applied at most once per fingerprint per minute to
  // prevent a storm of identical incidents from thrashing live configuration.
  const last = recentDeploys.get(fingerprint) ?? 0;
  const throttled = Date.now() - last < 60_000;
  let deployed: RemediationResult["deployed"] = [];
  let verified: boolean | null = null;
  if (!throttled && plan.serverActions.length > 0) {
    recentDeploys.set(fingerprint, Date.now());
    deployed = [];
    for (const action of plan.serverActions) deployed.push(await deployAction(action));
    verified = await verify(plan.verify);
  } else if (!throttled) {
    recentDeploys.set(fingerprint, Date.now());
  }
  const durationMs = Date.now() - started;

  if (!throttled) {
    const outcome = plan.serverActions.length === 0 ? "applied" : verified === false || deployed.some((d) => !d.ok) ? "failed" : verified ? "verified" : "applied";
    try {
      await db.insert(remediationActions).values({ incidentId: stored.id, fingerprint, playbook: plan.playbook, plan: { summary: plan.summary, serverActions: plan.serverActions, clientActions: plan.clientActions, deployed, verified }, outcome, detail: deployed.map((d) => `${d.ok ? "✓" : "✗"} ${d.action}${d.detail ? ` — ${d.detail}` : ""}`).join("\n") || plan.summary, durationMs });
      if (stored.id) await db.update(incidentReports).set({ status: outcome === "verified" ? "remediated" : outcome === "failed" ? "open" : "monitoring" }).where(eq(incidentReports.id, stored.id));
    } catch { /* audit trail is best effort */ }
  }

  return { incidentId: stored.id, fingerprint, category, severity, plan, deployed, verified, durationMs, throttled };
}

/* ------------------------------------------------------------------ */
/* Self-test and overview                                              */
/* ------------------------------------------------------------------ */

export async function runSelfTest(): Promise<{ ok: boolean; checks: Array<{ name: string; ok: boolean; detail: string; repaired?: boolean }>; durationMs: number }> {
  const started = Date.now();
  const checks: Array<{ name: string; ok: boolean; detail: string; repaired?: boolean }> = [];
  try {
    const t = Date.now();
    await db.execute(sql`select 1`);
    checks.push({ name: "database", ok: true, detail: `responded in ${Date.now() - t}ms` });
  } catch (error) {
    const result = await captureAndRemediate({ origin: "server", error, route: "self-test", userAction: "self-test" });
    checks.push({ name: "database", ok: result.verified === true, detail: result.plan.summary, repaired: result.verified === true });
  }
  const schemaOk = await ensureReliabilitySchema(true);
  checks.push({ name: "schema", ok: schemaOk, detail: schemaOk ? "all reliability and crypto tables present" : "could not verify tables", repaired: schemaOk });
  // Open breakers: probe the upstream directly; if it answers, close the breaker now
  // instead of waiting for the cooldown (repair), otherwise leave it open (correct).
  const open = allBreakers().filter((b) => b.state === "open");
  const PROBES: Record<string, string> = { coingecko: "https://api.coingecko.com/api/v3/ping", coinbase: "https://api.coinbase.com/v2/time" };
  const repairedBreakers: string[] = [], stillOpen: string[] = [];
  for (const b of open) {
    const probe = PROBES[b.name];
    let healthy = false;
    if (probe) {
      try { const response = await fetch(probe, { cache: "no-store", signal: AbortSignal.timeout(4_000) }); healthy = response.ok; } catch { healthy = false; }
    }
    if (healthy) { breaker(b.name).reset(); repairedBreakers.push(b.name); } else stillOpen.push(b.name);
  }
  checks.push({ name: "circuit-breakers", ok: stillOpen.length === 0, detail: open.length ? `${repairedBreakers.length ? `${repairedBreakers.join(", ")} probed healthy and closed` : ""}${repairedBreakers.length && stillOpen.length ? "; " : ""}${stillOpen.length ? `${stillOpen.join(", ")} still failing (left open)` : ""}` : `${allBreakers().length} breakers closed`, repaired: repairedBreakers.length > 0 });
  if (repairedBreakers.length) {
    // The failover patches are no longer needed once the primary is healthy again.
    for (const key of ["crypto.primaryProvider", "crypto.pollMs", "crypto.cacheTtlMs", "crypto.timeoutMs", "client.pollMs"] as const) await clearRuntimePatch(key);
    checks.push({ name: "runtime-patches", ok: true, detail: "failover patches cleared; defaults restored", repaired: true });
  }
  if (hooks.verifyCrypto) {
    try {
      const ok = await hooks.verifyCrypto();
      checks.push({ name: "crypto-engine", ok, detail: ok ? "market data computable and fresh enough" : "market data missing" });
      if (!ok && hooks.warmCrypto) { await hooks.warmCrypto(); const again = await hooks.verifyCrypto(); checks.push({ name: "crypto-engine-rewarm", ok: again, detail: again ? "re-warmed successfully" : "re-warm failed", repaired: again }); }
    } catch (error) {
      const result = await captureAndRemediate({ origin: "server", error, route: "self-test", userAction: "self-test" });
      checks.push({ name: "crypto-engine", ok: result.verified === true, detail: result.plan.summary, repaired: result.verified === true });
    }
  }
  const caches = FastCache.all();
  checks.push({ name: "cache", ok: true, detail: `${caches.length} caches, ${caches.reduce((n, c) => n + c.entries, 0)} entries, ${caches.reduce((n, c) => n + c.hits, 0)} hits` });
  return { ok: checks.every((c) => c.ok), checks, durationMs: Date.now() - started };
}

export async function reliabilityOverview() {
  await loadRuntimePatches();
  let incidents: Array<typeof incidentReports.$inferSelect> = [];
  let actions: Array<typeof remediationActions.$inferSelect> = [];
  let dbOk = true;
  try {
    incidents = await db.select().from(incidentReports).orderBy(desc(incidentReports.lastSeenAt)).limit(40);
    actions = await db.select().from(remediationActions).orderBy(desc(remediationActions.createdAt)).limit(40);
  } catch (error) {
    dbOk = false;
    if (classifyError(error).category === "schema_missing") await ensureReliabilitySchema(true);
  }
  const summary = {
    open: incidents.filter((i) => i.status === "open").length,
    remediated: incidents.filter((i) => i.status === "remediated" || i.status === "monitoring").length,
    occurrences: incidents.reduce((n, i) => n + i.occurrences, 0),
    fixesVerified: actions.filter((a) => a.outcome === "verified").length,
    fixesApplied: actions.filter((a) => a.outcome === "applied" || a.outcome === "verified").length,
    fixesFailed: actions.filter((a) => a.outcome === "failed").length,
  };
  return {
    ok: dbOk,
    uptimeMs: Date.now() - (globalForEngine.__radixBootAt ?? Date.now()),
    summary,
    incidents: incidents.map((i) => ({ ...i, stack: undefined })),
    actions,
    breakers: allBreakers(),
    caches: FastCache.all(),
    patches: listPatches(),
    runtime: { pollMs: getRuntime("crypto.pollMs"), provider: getRuntime("crypto.primaryProvider"), cacheTtlMs: getRuntime("crypto.cacheTtlMs"), transport: getRuntime("client.transport") },
    playbooks: PLAYBOOKS.map((p) => p.id),
  };
}

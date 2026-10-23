import {
  bigint,
  serial,
  varchar,
  index,
  uniqueIndex,
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Every command, extraction, install and upload executed through the workbench
 * is recorded as a job so the UI can show a verifiable audit trail.
 */
export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  kind: text("kind").notNull(), // shell | extract | compress | install | upload | scaffold | delete
  label: text("label").notNull(),
  command: text("command"),
  cwd: text("cwd"),
  status: text("status").notNull().default("running"), // running | succeeded | failed | blocked
  exitCode: integer("exit_code"),
  stdout: text("stdout"),
  stderr: text("stderr"),
  durationMs: integer("duration_ms"),
  bytesWritten: bigint("bytes_written", { mode: "number" }),
  meta: jsonb("meta").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

/** Cached state of the external toolchain (unzip, tar, 7z, next, ...). */
export const tools = pgTable("tools", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  binary: text("binary").notNull(),
  category: text("category").notNull(),
  purpose: text("purpose").notNull(),
  packages: jsonb("packages")
    .$type<{ apt?: string; apk?: string; dnf?: string; npm?: string }>()
    .notNull(),
  status: text("status").notNull().default("unknown"), // installed | missing | unknown
  version: text("version"),
  path: text("path"),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  installedAt: timestamp("installed_at", { withTimezone: true }),
});

/** Files that entered the workspace (uploads, archives, extraction roots). */
export const artifacts = pgTable("artifacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  kind: text("kind").notNull(), // archive | file | directory
  size: bigint("size", { mode: "number" }).notNull().default(0),
  source: text("source").notNull(), // upload | extract | shell | compress
  detail: text("detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Job = typeof jobs.$inferSelect;
export type ToolRow = typeof tools.$inferSelect;
export type Artifact = typeof artifacts.$inferSelect;

/* ------------------------------------------------------------------ *
 * Radix Loom site tables (imported from the Computational-Engineering
 * project) — saved formulas and contact-form messages.
 * ------------------------------------------------------------------ */

// Saved user formulas (anonymous — no login). Scoped by a browser-generated
// "workspace" token so each browser sees only its own entries. No IP address,
// user-agent or other identifier is stored with a formula.
export const formulas = pgTable("formulas", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspace: text("workspace").notNull(),
  name: text("name").notNull(),
  expression: text("expression").notNull(),
  description: text("description"),
  tags: text("tags"), // comma-separated
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Messages sent through the contact form. Name and e-mail are optional; no IP
// address or user-agent is stored (rate limiting happens in memory only).
export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  topic: text("topic").notNull(),
  name: text("name"),
  email: text("email"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type FormulaRow = typeof formulas.$inferSelect;
export type NewFormula = typeof formulas.$inferInsert;
export type ContactMessageRow = typeof contactMessages.$inferSelect;

/** Anonymous opt-out receipts. No IP, country, name, email or user agent. */
export const privacyChoices = pgTable("privacy_choices", {
  id: uuid("id").defaultRandom().primaryKey(),
  saleSharingOptOut: boolean("sale_sharing_opt_out").notNull().default(true),
  source: text("source").notNull(), // manual | gpc
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

/** Retained for non-destructive replacement of the previous application.
 * No Radix Loom route reads or writes this legacy activity table. */
export const legacyWorkspaceOperations = pgTable("workspace_operations", {
  id: serial("id").primaryKey(),
  workspaceId: varchar("workspace_id", { length: 64 }).notNull(),
  type: varchar("type", { length: 24 }).notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull().default(""),
  status: varchar("status", { length: 16 }).notNull().default("success"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("workspace_operations_workspace_idx").on(table.workspaceId)]);

/** Legacy unpack records are preserved, but not exposed by this site. */
export const legacyUnpackActivity = pgTable("unpack_activity", {
  id: serial("id").primaryKey(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  detail: text("detail").notNull().default(""),
  status: text("status").notNull().default("success"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const legacyUnpackSettings = pgTable("unpack_settings", {
  id: integer("id").primaryKey().default(1),
  name: text("name").notNull().default("My workspace"),
  autoExtract: boolean("auto_extract").notNull().default(false),
  showHidden: boolean("show_hidden").notNull().default(false),
});

// Natural-language understanding telemetry and regression tables.
export * from "./nlu-schema";

/* ------------------------------------------------------------------ *
 * Crypto computational engine — persisted market snapshots, history
 * caches, alerts and anonymous (workspace-scoped) portfolio positions.
 * ------------------------------------------------------------------ */

/** One row per asset per automated refresh. Feeds freshness checks, the
 * stale-data fallback chain and the on-server analytics when a provider fails. */
export const cryptoSnapshots = pgTable("crypto_snapshots", {
  id: serial("id").primaryKey(),
  assetId: text("asset_id").notNull(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  vs: text("vs").notNull().default("usd"),
  price: text("price").notNull(), // decimal string — never a lossy float
  change24h: real("change_24h"),
  change7d: real("change_7d"),
  marketCap: text("market_cap"),
  volume24h: text("volume_24h"),
  high24h: text("high_24h"),
  low24h: text("low_24h"),
  rank: integer("rank"),
  source: text("source").notNull(), // coingecko | coinbase | seed
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("crypto_snapshots_asset_time_idx").on(table.assetId, table.capturedAt),
  index("crypto_snapshots_time_idx").on(table.capturedAt),
]);

/** Daily/hourly history series cached per asset so analysis never depends on
 * a live upstream call. */
export const cryptoHistoryCache = pgTable("crypto_history_cache", {
  id: serial("id").primaryKey(),
  assetId: text("asset_id").notNull(),
  vs: text("vs").notNull().default("usd"),
  days: integer("days").notNull(),
  points: jsonb("points").$type<Array<[number, number]>>().notNull().default([]),
  volumes: jsonb("volumes").$type<Array<[number, number]>>().notNull().default([]),
  source: text("source").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("crypto_history_cache_key_idx").on(table.assetId, table.vs, table.days)]);

/** Price alerts, scoped by the random browser workspace token (no account). */
export const cryptoAlerts = pgTable("crypto_alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspace: text("workspace").notNull(),
  assetId: text("asset_id").notNull(),
  symbol: text("symbol").notNull(),
  vs: text("vs").notNull().default("usd"),
  condition: text("condition").notNull(), // above | below | change_up | change_down
  threshold: text("threshold").notNull(), // decimal string
  note: text("note"),
  status: text("status").notNull().default("armed"), // armed | triggered | disabled
  triggeredAt: timestamp("triggered_at", { withTimezone: true }),
  triggeredPrice: text("triggered_price"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("crypto_alerts_workspace_idx").on(table.workspace), index("crypto_alerts_status_idx").on(table.status)]);

/** Portfolio positions, scoped by workspace token. Quantities and costs are
 * decimal strings so the P&L engine can use exact arithmetic. */
export const cryptoPositions = pgTable("crypto_positions", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspace: text("workspace").notNull(),
  assetId: text("asset_id").notNull(),
  symbol: text("symbol").notNull(),
  quantity: text("quantity").notNull(),
  costBasis: text("cost_basis").notNull(), // per-unit cost in vs currency
  vs: text("vs").notNull().default("usd"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("crypto_positions_workspace_idx").on(table.workspace)]);

/* ------------------------------------------------------------------ *
 * Reliability platform — incident intake and automated remediation.
 * ------------------------------------------------------------------ */

/** Every captured failure (server or browser) grouped by fingerprint. */
export const incidentReports = pgTable("incident_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  fingerprint: text("fingerprint").notNull(),
  origin: text("origin").notNull(), // server | client
  category: text("category").notNull(), // upstream_timeout | rate_limited | ... | unknown
  severity: text("severity").notNull().default("warning"), // info | warning | error | critical
  message: text("message").notNull(),
  stack: text("stack"),
  route: text("route"),
  userAction: text("user_action"),
  context: jsonb("context").$type<Record<string, unknown>>().notNull().default({}),
  occurrences: integer("occurrences").notNull().default(1),
  status: text("status").notNull().default("open"), // open | remediated | monitoring | resolved
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("incident_reports_fingerprint_idx").on(table.fingerprint), index("incident_reports_status_idx").on(table.status)]);

/** Fixes that the remediation engine generated and deployed, with verification. */
export const remediationActions = pgTable("remediation_actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  incidentId: uuid("incident_id"),
  fingerprint: text("fingerprint").notNull(),
  playbook: text("playbook").notNull(),
  plan: jsonb("plan").$type<Record<string, unknown>>().notNull().default({}),
  outcome: text("outcome").notNull().default("applied"), // applied | verified | failed | skipped
  detail: text("detail"),
  durationMs: integer("duration_ms").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("remediation_actions_fingerprint_idx").on(table.fingerprint)]);

/** Runtime configuration patches deployed by the remediation engine (survive restarts). */
export const runtimePatches = pgTable("runtime_patches", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  reason: text("reason"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CryptoSnapshot = typeof cryptoSnapshots.$inferSelect;
export type CryptoAlert = typeof cryptoAlerts.$inferSelect;
export type CryptoPosition = typeof cryptoPositions.$inferSelect;
export type IncidentReport = typeof incidentReports.$inferSelect;
export type RemediationAction = typeof remediationActions.$inferSelect;

/* ────────────────────────────────────────────────────────────────────────────
 * Native app shell (Ionic / Framework7 / Capacitor PWA)
 * ──────────────────────────────────────────────────────────────────────────── */

/** Payloads delivered by the OS "Share to…" sheet via the Web Share Target API. */
export const sharedItems = pgTable("shared_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  deviceId: text("device_id").notNull().default("anonymous"),
  title: text("title"),
  body: text("body"),
  url: text("url"),
  // Parsed interpretation: what the app decided the share was (expression, unit, link…)
  kind: text("kind").notNull().default("text"),
  parsed: jsonb("parsed").$type<Record<string, unknown>>().notNull().default({}),
  platform: text("platform").notNull().default("web"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("shared_items_device_idx").on(table.deviceId, table.createdAt)]);

/** Feed rows rendered by the native shell with pull-to-refresh + infinite scroll. */
export const appFeedItems = pgTable("app_feed_items", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  category: text("category").notNull().default("tool"),
  href: text("href").notNull(),
  icon: text("icon").notNull().default("calculator-outline"),
  weight: integer("weight").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("app_feed_items_slug_idx").on(table.slug), index("app_feed_items_weight_idx").on(table.weight)]);

/** Per-device native shell preferences (engine, mode, haptics) synced server-side. */
export const appDevicePrefs = pgTable("app_device_prefs", {
  deviceId: text("device_id").primaryKey(),
  engine: text("engine").notNull().default("auto"),
  mode: text("mode").notNull().default("auto"),
  haptics: boolean("haptics").notNull().default(true),
  platform: text("platform").notNull().default("web"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SharedItem = typeof sharedItems.$inferSelect;
export type AppFeedItem = typeof appFeedItems.$inferSelect;
export type AppDevicePrefs = typeof appDevicePrefs.$inferSelect;

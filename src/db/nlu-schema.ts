import { index, integer, jsonb, pgTable, real, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Every interpretation is logged: raw text, chosen intent, extracted entities,
 * confidence, the action actually taken and why. This is the evidence base for
 * tuning the models and for replay (regression) testing.
 */
export const nluInteractions = pgTable("nlu_interactions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().default("anonymous"),
  rawText: text("raw_text").notNull(),
  normalisedText: text("normalised_text").notNull().default(""),
  decision: text("decision").notNull(), // action | clarify | rejected
  domain: text("domain"), // math | currency | units | market | navigation
  opcode: text("opcode"),
  entities: jsonb("entities").$type<Array<{ type: string; value: string }>>().notNull().default([]),
  slots: jsonb("slots").$type<Record<string, string | number>>().notNull().default({}),
  confidence: real("confidence").notNull().default(0),
  actionHref: text("action_href"),
  actionLabel: text("action_label"),
  result: text("result"),
  blockedCode: text("blocked_code"),
  blockedReason: text("blocked_reason"),
  contextDomain: text("context_domain"),
  trace: jsonb("trace").$type<Array<Record<string, unknown>>>().notNull().default([]),
  latencyMs: integer("latency_ms").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Golden cases replayed after every change to the NLU stack. */
export const nluRegressionRuns = pgTable("nlu_regression_runs", {
  id: serial("id").primaryKey(),
  total: integer("total").notNull().default(0),
  passed: integer("passed").notNull().default(0),
  failed: integer("failed").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  failures: jsonb("failures").$type<Array<Record<string, unknown>>>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Language associations learned on the server: a normalised phrase paired with
 * the verified program it resolved to (never a URL, never audio). Replaying a
 * remembered program re-runs every IR and executor check, so a stale or
 * tampered row can only fail, never misroute.
 */
export const voiceAssociations = pgTable("voice_associations", {
  id: serial("id").primaryKey(),
  phrase: text("phrase").notNull(),
  locale: text("locale").notNull().default("en"),
  program: text("program").notNull(), // encoded IR, e.g. v1|en|RUN{...}
  capability: text("capability"),
  domain: text("domain"),
  source: text("source").notNull().default("pipeline"), // pipeline | codegen | association | replay
  uses: integer("uses").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("voice_associations_phrase_locale_idx").on(table.phrase, table.locale),
  index("voice_associations_capability_idx").on(table.capability),
]);

export type NluInteraction = typeof nluInteractions.$inferSelect;
export type VoiceAssociation = typeof voiceAssociations.$inferSelect;
export type NluRegressionRun = typeof nluRegressionRuns.$inferSelect;

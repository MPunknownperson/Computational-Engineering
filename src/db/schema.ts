import {
  bigint,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { GameRules, NoteEvent } from "@/engine/types";

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

/* ------------------------------------------------------------------ *
 * Engine tables — the music engine and the rhythm arena.
 *
 * Runs feed the adaptive rule generator (src/engine/game/adaptive.ts);
 * compositions are the loops the arena can chart and the studio replays.
 * ------------------------------------------------------------------ */

/** One completed arena run, with the generated rule program that produced it. */
export const gameSessions = pgTable("game_sessions", {
  id: serial("id").primaryKey(),
  mode: text("mode").notNull().default("keyboard"),
  score: integer("score").notNull().default(0),
  maxCombo: integer("max_combo").notNull().default(0),
  hits: integer("hits").notNull().default(0),
  misses: integer("misses").notNull().default(0),
  accuracy: real("accuracy").notNull().default(0),
  meanOffsetMs: real("mean_offset_ms").notNull().default(0),
  motionRatio: real("motion_ratio").notNull().default(0),
  bpm: integer("bpm").notNull().default(100),
  laneCount: integer("lane_count").notNull().default(4),
  rules: jsonb("rules").$type<GameRules>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A composed or generated musical sequence that can be replayed or charted. */
export const compositions = pgTable("compositions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  bpm: integer("bpm").notNull().default(100),
  instrument: text("instrument").notNull().default("piano"),
  seed: integer("seed").notNull().default(0),
  events: jsonb("events").$type<NoteEvent[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GameSessionRow = typeof gameSessions.$inferSelect;
export type CompositionRow = typeof compositions.$inferSelect;

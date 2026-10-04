import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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

import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Saved user formulas (anonymous — no login). Scoped by a browser-supplied
// "workspace" token so each device sees only its own entries.
export const formulas = pgTable("formulas", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspace: text("workspace").notNull(),
  name: text("name").notNull(),
  expression: text("expression").notNull(),
  description: text("description"),
  tags: text("tags"), // comma-separated
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type FormulaRow = typeof formulas.$inferSelect;
export type NewFormula = typeof formulas.$inferInsert;

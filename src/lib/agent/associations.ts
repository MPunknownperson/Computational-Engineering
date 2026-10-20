import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { voiceAssociations } from "@/db/nlu-schema";
import { decode, encode, verify, type Program } from "@/lib/voice/ir";
import { normalizeSpeech } from "@/lib/voice/parser";

/**
 * Server-side language association memory.
 *
 * Every verified program the orchestrator executes is paired with the
 * normalised phrase that produced it. When the deterministic pipeline cannot
 * read a later sentence, an identical phrase is replayed through the IR
 * verifier and the executor again — the memory stores *meaning* (an encoded
 * program with closed identifiers), never a URL, and never audio.
 *
 * Phrases are capped in length and count so the table cannot be used as a
 * free-text store; storage failures are swallowed because learning is an
 * enhancement, not a dependency.
 */

const MAX_PHRASE = 160;
const MIN_PHRASE = 2;
const MAX_ROWS = 5_000;

function keyOf(text: string): string | null {
  const key = normalizeSpeech(text).slice(0, MAX_PHRASE);
  if (key.length < MIN_PHRASE) return null;
  // A bare number carries no language to associate.
  if (/^[\d\s.,]+$/.test(key)) return null;
  return key;
}

function localeOf(locale: string | undefined): string {
  const tag = (locale ?? "en").toLowerCase().split(/[-_]/)[0];
  return /^[a-z]{2,3}$/.test(tag) ? tag : "en";
}

export interface RecalledAssociation {
  program: Program;
  locale: string;
  capability: string | null;
  uses: number;
}

/** A remembered program for this phrase, already structurally verified. */
export async function recallAssociation(text: string, locale?: string): Promise<RecalledAssociation | null> {
  const key = keyOf(text);
  if (!key) return null;
  try {
    const rows = await db
      .select()
      .from(voiceAssociations)
      .where(and(eq(voiceAssociations.phrase, key), eq(voiceAssociations.locale, localeOf(locale))))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const decoded = decode(row.program);
    if ("error" in decoded) return null;
    void db
      .update(voiceAssociations)
      .set({ uses: sql`${voiceAssociations.uses} + 1`, lastUsedAt: new Date() })
      .where(eq(voiceAssociations.id, row.id))
      .catch(() => undefined);
    return { program: decoded.program, locale: row.locale, capability: row.capability, uses: row.uses + 1 };
  } catch {
    return null;
  }
}

/** Pair a phrase with the verified program it resolved to. Best-effort. */
export async function rememberAssociation(text: string, locale: string | undefined, program: Program, domain: string): Promise<void> {
  const key = keyOf(text);
  if (!key || verify(program)) return;
  const instruction = program.code[0];
  const capability =
    typeof instruction?.slots?.capability === "string"
      ? instruction.slots.capability
      : typeof instruction?.slots?.operation === "string"
        ? instruction.slots.operation
        : typeof instruction?.slots?.topic === "string"
          ? `topic:${instruction.slots.topic}`
          : instruction?.op ?? null;
  const source = instruction?.op === "RUN" ? "codegen" : instruction?.op === "OPEN_PAGE" ? "association" : "pipeline";
  try {
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(voiceAssociations);
    if (count >= MAX_ROWS) {
      // Evict the least-used, oldest rows so the memory stays bounded.
      await db.execute(sql`delete from voice_associations where id in (select id from voice_associations order by uses asc, last_used_at asc limit 100)`);
    }
    await db
      .insert(voiceAssociations)
      .values({ phrase: key, locale: localeOf(locale), program: encode(program), capability, domain, source })
      .onConflictDoUpdate({
        target: [voiceAssociations.phrase, voiceAssociations.locale],
        set: { program: encode(program), capability, domain, source, uses: sql`${voiceAssociations.uses} + 1`, lastUsedAt: new Date() },
      });
  } catch {
    /* learning is best-effort */
  }
}

/** Aggregate view for diagnostics: no phrases, only counts per capability. */
export async function associationStats(): Promise<Array<{ capability: string | null; domain: string | null; count: number; uses: number }>> {
  try {
    return await db
      .select({
        capability: voiceAssociations.capability,
        domain: voiceAssociations.domain,
        count: sql<number>`count(*)::int`,
        uses: sql<number>`coalesce(sum(${voiceAssociations.uses}), 0)::int`,
      })
      .from(voiceAssociations)
      .groupBy(voiceAssociations.capability, voiceAssociations.domain)
      .orderBy(sql`count(*) desc`)
      .limit(50);
  } catch {
    return [];
  }
}

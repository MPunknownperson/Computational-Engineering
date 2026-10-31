import "server-only";
import { store } from "@/lib/store";
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
    const row = store.voiceAssociations.find((item) => item.phrase === key && item.locale === localeOf(locale));
    if (!row) return null;
    const decoded = decode(row.program);
    if ("error" in decoded) return null;
    store.voiceAssociations.update((item) => item.id === row.id, { uses: row.uses + 1, lastUsedAt: new Date() });
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
    if (store.voiceAssociations.size >= MAX_ROWS) {
      // Evict the least-used, oldest rows so the memory stays bounded.
      const doomed = new Set(
        store.voiceAssociations
          .all()
          .sort((a, b) => a.uses - b.uses || a.lastUsedAt.getTime() - b.lastUsedAt.getTime())
          .slice(0, 100)
          .map((row) => row.id),
      );
      store.voiceAssociations.remove((row) => doomed.has(row.id));
    }
    const localeTag = localeOf(locale);
    const now = new Date();
    const existing = store.voiceAssociations.find((row) => row.phrase === key && row.locale === localeTag);
    if (existing) {
      store.voiceAssociations.update((row) => row.id === existing.id, {
        program: encode(program), capability, domain, source, uses: existing.uses + 1, lastUsedAt: now,
      });
    } else {
      store.voiceAssociations.insert({
        id: store.voiceAssociations.nextSequence(),
        phrase: key, locale: localeTag, program: encode(program), capability, domain, source,
        uses: 1, createdAt: now, lastUsedAt: now,
      });
    }
  } catch {
    /* learning is best-effort */
  }
}

/** Aggregate view for diagnostics: no phrases, only counts per capability. */
export async function associationStats(): Promise<Array<{ capability: string | null; domain: string | null; count: number; uses: number }>> {
  try {
    const groups = new Map<string, { capability: string | null; domain: string | null; count: number; uses: number }>();
    for (const row of store.voiceAssociations.all()) {
      const key = `${row.capability ?? ""}|${row.domain ?? ""}`;
      const bucket = groups.get(key) ?? { capability: row.capability, domain: row.domain, count: 0, uses: 0 };
      bucket.count += 1;
      bucket.uses += row.uses;
      groups.set(key, bucket);
    }
    return Array.from(groups.values()).sort((a, b) => b.count - a.count).slice(0, 50);
  } catch {
    return [];
  }
}

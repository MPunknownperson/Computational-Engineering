import { normalizeSpeech } from "@/lib/voice/parser";
import { VoiceRuntime } from "@/lib/voice/pipeline";
import { decode, encode, verify, type Program } from "@/lib/voice/ir";

/**
 * Stage 6: client-side learning.
 *
 * Understanding is deterministic, so learning only has to remember pairings.
 * When the recogniser's first guess was wrong but a later hypothesis was
 * understood, the mis-heard phrase is stored with the program it produced
 * (never a URL). Next time, the phrase resolves immediately from memory.
 *
 * Stored in `localStorage`. No audio, no upload; the visitor can clear it.
 */

export interface CommandAction {
  href: string;
  label: string;
}

export interface CommandRoute {
  heard: string;
  understood: string | null;
  program: Program | null;
  action: CommandAction | null;
  learned: boolean;
}

interface Memory {
  phrase: string;
  program: string;
  uses: number;
  updatedAt: number;
}

const MEMORY_KEY = "radixloom.voice-memory.v2";
const LEGACY_KEYS = ["radixloom.command-memory.v1", "radixloom.voice.cloud-consent.v1"];
const MAX_MEMORY = 120;

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function readMemory(): Memory[] {
  const store = storage();
  if (!store) return [];
  try {
    const parsed = JSON.parse(store.getItem(MEMORY_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is Memory => {
      const value = item as Partial<Memory> | null;
      if (!value || typeof value.phrase !== "string" || typeof value.program !== "string") return false;
      // Discard anything that no longer verifies: the verifier is the gate.
      return "program" in decode(value.program);
    });
  } catch {
    return [];
  }
}

function writeMemory(memory: Memory[]) {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(MEMORY_KEY, JSON.stringify(memory.slice(0, MAX_MEMORY)));
    for (const key of LEGACY_KEYS) store.removeItem(key);
  } catch {
    /* quota or privacy mode: learning is best-effort */
  }
}

export function learnedCommandCount(): number {
  return readMemory().length;
}

export function clearLearnedCommands(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(MEMORY_KEY);
    for (const key of LEGACY_KEYS) store.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Learn that a phrase means this program. Returns the new memory size. */
export function rememberPhrase(phrase: string, program: Program): number {
  const key = normalizeSpeech(phrase);
  if (key.length < 2) return learnedCommandCount();
  const canonical = encode(program);
  if (verify(program)) return learnedCommandCount();
  const memory = readMemory();
  const existing = memory.find((item) => item.phrase === key);
  const next = memory.filter((item) => item.phrase !== key);
  next.unshift({ phrase: key, program: canonical, uses: (existing?.uses ?? 0) + 1, updatedAt: Date.now() });
  next.sort((a, b) => b.uses - a.uses || b.updatedAt - a.updatedAt);
  writeMemory(next);
  return next.length;
}

/** The program this device learned for a phrase, if any. */
export function recallPhrase(phrase: string): Program | null {
  const key = normalizeSpeech(phrase);
  const entry = readMemory().find((item) => item.phrase === key);
  if (!entry) return null;
  const decoded = decode(entry.program);
  return "program" in decoded ? decoded.program : null;
}

/**
 * Route recogniser hypotheses (best first) through the language packs.
 *
 * Hypothesis order only breaks ties: a later hypothesis that explains the
 * sentence more completely wins, which is how "convert 120 you ess dee to
 * euros" (rank 0) loses to "convert 120 USD to euros" (rank 1).
 */
export type WeightedHypothesis = { text: string; confidence?: number };

/**
 * Route recogniser hypotheses through the language packs.
 *
 * `hypotheses` may be plain strings or `{ text, confidence }` pairs. Rank order
 * still only breaks ties: a later hypothesis that explains the sentence more
 * completely wins, and the recogniser's own confidence nudges the comparison
 * when two readings are otherwise equal.
 */
export function routeHypotheses(
  hypotheses: Array<string | WeightedHypothesis>,
  runtime: VoiceRuntime,
): CommandRoute {
  const clean = hypotheses
    .map((item) => (typeof item === "string" ? { text: item } : item))
    .map((item) => ({ text: (item.text ?? "").trim(), confidence: typeof item.confidence === "number" ? item.confidence : undefined }))
    .filter((item) => item.text);
  const heard = clean[0]?.text ?? "";
  if (!heard) return { heard, understood: null, program: null, action: null, learned: false };

  const remembered = recallPhrase(heard);
  if (remembered) {
    const replayed = runtime.replay(remembered);
    if (replayed) {
      return { heard, understood: heard, program: replayed.program, action: replayed.action, learned: true };
    }
  }

  // Each hypothesis receives a fork carrying the caller's prior command. That
  // preserves real conversational context ("120 USD to EUR" → "and 80"),
  // while a losing hypothesis cannot mutate the actual session.
  let best: { hypothesis: string; interpretation: NonNullable<ReturnType<VoiceRuntime["interpret"]>>; score: number } | null = null;
  clean.forEach((item, rank) => {
    const hypothesis = item.text;
    const trial = runtime.fork();
    const interpretation = trial.interpret({ heard, hypothesis });
    if (!interpretation) return;
    // Structural completeness first, then rank order, then recogniser
    // confidence — so a stronger reading still beats a merely confident one.
    const score =
      scoreOf(interpretation) - rank * 0.05 + (item.confidence ?? 0.5) * 0.02;
    if (!best || score > best.score) best = { hypothesis, interpretation, score };
  });
  if (!best) return { heard, understood: null, program: null, action: null, learned: false };

  const chosen = best as { hypothesis: string; interpretation: NonNullable<ReturnType<VoiceRuntime["interpret"]>>; score: number };
  // Adopt the winning program into the caller's context.
  runtime.restore(chosen.interpretation.program);
  return {
    heard,
    understood: chosen.hypothesis,
    program: chosen.interpretation.program,
    action: chosen.interpretation.action,
    learned: false,
  };
}

function scoreOf(interpretation: NonNullable<ReturnType<VoiceRuntime["interpret"]>>): number {
  const analysis = interpretation.analysis;
  // An explicit page request has already been matched against the site's
  // allow-listed catalog, so it is more specific than a broad topic word.
  const base = analysis.pageId
    ? 4
    : analysis.paired
      ? 3
      : analysis.topic
        ? 1
        : analysis.mentions.length
          ? 2
          : analysis.amount || analysis.again
            ? 0.5
            : 0;
  return base + (analysis.grammar ? 0.5 : 0) + (analysis.amount ? 0.25 : 0);
}

/** Reinforce a completed command and teach any mis-hearing. Returns memory size. */
export function learnFromRoute(route: CommandRoute): number {
  if (!route.program) return learnedCommandCount();
  if (route.understood && route.understood !== route.heard) rememberPhrase(route.heard, route.program);
  return rememberPhrase(route.understood ?? route.heard, route.program);
}

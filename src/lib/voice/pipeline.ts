import { allPacks, analyse, scoreAnalysis, type Analysis } from "@/lib/voice/parser";
import { buildProgram } from "@/lib/voice/semantics";
import { execute, type ExecutedAction } from "@/lib/voice/vm";
import type { Program } from "@/lib/voice/ir";
import type { LanguagePack } from "@/lib/i18n";

/**
 * The voice runtime: stages 3–5 wired together with conversational context.
 *
 * It keeps the most recent program so ellipsis and "again" work, ranks every
 * language pack's reading of a sentence, and executes only a program that has
 * passed verification. Nothing here talks to the network.
 */

export interface Interpretation {
  program: Program;
  action: ExecutedAction;
  analysis: Analysis;
  pack: LanguagePack;
}

export interface InterpretInput {
  heard: string;
  hypothesis: string;
  learned?: boolean;
}

export class VoiceRuntime {
  private previous: Program | null = null;

  /** The language packs this runtime understands, most likely first. */
  readonly packs: LanguagePack[];

  constructor(packs: LanguagePack[]) {
    this.packs = packs;
  }

  /** The program most recently executed, available for ellipsis and repeat. */
  get last(): Program | null {
    return this.previous;
  }

  /** Load a verified program from session or local learning memory. */
  restore(program: Program) {
    this.previous = program;
  }

  /** A trial runtime carries the same prior command but cannot mutate this one. */
  fork(): VoiceRuntime {
    const next = new VoiceRuntime(this.packs);
    if (this.previous) next.restore(this.previous);
    return next;
  }

  forget() {
    this.previous = null;
  }

  /** Read a sentence and execute the best reading, or return why it failed. */
  interpret(input: InterpretInput): Interpretation | null {
    const candidates: Array<{ analysis: Analysis; score: number }> = [];
    for (const pack of this.packs) {
      const analysis = analyse(input.hypothesis, pack);
      const score = scoreAnalysis(analysis);
      if (score > 0) candidates.push({ analysis, score });
    }
    // Most complete reading first; identical scores keep the visitor's language.
    candidates.sort((a, b) => b.score - a.score);

    for (const candidate of candidates) {
      const built = buildProgram(candidate.analysis, this.previous);
      if (!built.program) continue;
      const executed = execute(built.program, this.previous);
      if (executed.ok) {
        this.previous = executed.program;
        return {
          program: executed.program,
          action: executed.action,
          analysis: candidate.analysis,
          pack: candidate.analysis.pack,
        };
      }
      // A verified program that cannot execute (unknown pair, nothing to
      // repeat) is a dead end for this reading; try the next language.
    }
    return null;
  }

  /** Run a program previously learned on this device. */
  replay(program: Program): Interpretation | null {
    const executed = execute(program, this.previous);
    if (!executed.ok) return null;
    this.previous = executed.program;
    const pack = this.packs.find((candidate) => candidate.id === program.lang) ?? this.packs[0];
    return {
      program: executed.program,
      action: executed.action,
      analysis: analyse("", pack),
      pack,
    };
  }
}

/** Stateless convenience for tests and one-shot callers: no context is kept. */
export function parseVoiceCommand(transcript: string, packs?: LanguagePack[]): ExecutedAction | null {
  const runtime = new VoiceRuntime(packs ? packs : allPacks());
  return runtime.interpret({ heard: transcript, hypothesis: transcript })?.action ?? null;
}

import { allPacks, analyse, scoreAnalysis, type Analysis } from "@/lib/voice/parser";
import { buildProgram, evidenceOfLastBuild } from "@/lib/voice/semantics";
import { execute, type ExecutedAction } from "@/lib/voice/vm";
import type { Program } from "@/lib/voice/ir";
import type { LanguagePack } from "@/lib/i18n";
import { ConversationContext, type TaskDomain } from "@/lib/voice/context";
import {
  AMBIGUITY_MARGIN,
  CONFIDENCE_THRESHOLDS,
  domainOfProgram,
  validateDispatch,
  type DispatchEvidence,
} from "@/lib/voice/dispatch-guard";

/**
 * The voice runtime: stages 3–5 wired together with typed conversational
 * context, pre-dispatch validation, confidence thresholds and a decision
 * trace.
 *
 * Reading order of a turn:
 *   1. every language pack proposes a reading
 *   2. each reading is compiled to a program (mathematics first)
 *   3. the program is validated against the evidence that produced it
 *   4. confidence is compared with the threshold for that action's domain
 *   5. only then is the program executed and the context updated
 *
 * Nothing here talks to the network.
 */

export interface TraceStep {
  stage: "analysis" | "build" | "validate" | "confidence" | "execute";
  pack: string;
  outcome: string;
  detail?: string;
  score?: number;
}

export interface Interpretation {
  program: Program;
  action: ExecutedAction;
  analysis: Analysis;
  pack: LanguagePack;
  /** Normalised 0–1 confidence for the accepted reading. */
  confidence?: number;
  /** Domain the action belongs to, used for context typing and logging. */
  domain?: TaskDomain;
  /** Ordered record of how the decision was reached. */
  trace?: TraceStep[];
}

export interface ClarificationRequest {
  kind: "clarify";
  reason: "low-confidence" | "ambiguous-domain" | "blocked";
  question: string;
  options: Array<{ label: string; domain: TaskDomain; href?: string }>;
  confidence: number;
  trace: TraceStep[];
}

export type Decision =
  | ({ kind: "action" } & Interpretation)
  | ClarificationRequest
  | { kind: "rejected"; reason: string; trace: TraceStep[] };

export interface InterpretInput {
  heard: string;
  hypothesis: string;
  learned?: boolean;
}

/** Map a raw analysis/build score onto a 0–1 confidence. */
function normaliseConfidence(score: number): number {
  if (!Number.isFinite(score) || score <= 0) return 0;
  return Math.max(0, Math.min(1, score / 3));
}

const DOMAIN_LABEL: Record<TaskDomain, string> = {
  math: "Solve it as mathematics",
  currency: "Convert it as money",
  units: "Convert it as measurements",
  market: "Look up market data",
  navigation: "Open the related page",
};

export class VoiceRuntime {
  private previous: Program | null = null;

  /** Typed, time-bounded memory of recent turns. */
  readonly context: ConversationContext;

  /** The language packs this runtime understands, most likely first. */
  readonly packs: LanguagePack[];

  /** The decision record of the most recent interpretation. */
  private lastDecision: Decision | null = null;

  constructor(packs: LanguagePack[], context?: ConversationContext) {
    this.packs = packs;
    this.context = context ?? new ConversationContext();
  }

  /** The program most recently executed, available for ellipsis and repeat. */
  get last(): Program | null {
    return this.previous;
  }

  /** Full decision record for the most recent turn (diagnostics and logging). */
  get decision(): Decision | null {
    return this.lastDecision;
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
    this.context.clear();
  }

  /** Read a sentence and execute the best reading, or return why it failed. */
  interpret(input: InterpretInput): Interpretation | null {
    const decision = this.decide(input);
    this.lastDecision = decision;
    return decision.kind === "action" ? decision : null;
  }

  /**
   * The full pipeline. Unlike `interpret` this reports *why* nothing ran:
   * blocked by validation, below the confidence threshold, or genuinely
   * ambiguous between two domains.
   */
  decide(input: InterpretInput): Decision {
    const trace: TraceStep[] = [];
    const candidates: Array<{ analysis: Analysis; score: number }> = [];

    for (const pack of this.packs) {
      const analysis = analyse(input.hypothesis, pack);
      const score = scoreAnalysis(analysis);
      trace.push({
        stage: "analysis",
        pack: pack.id,
        outcome: score > 0 ? "candidate" : "discarded",
        score,
        detail: `${analysis.mentions.length} mention(s), amount=${analysis.amount ? "yes" : "no"}`,
      });
      if (score > 0) candidates.push({ analysis, score });
    }
    // A purely mathematical sentence ("solve 3x + 5 = 20") names no currency,
    // no unit and no topic, so the lexical scorer rates every pack at zero and
    // the sentence used to fall out of the pipeline entirely. Keep the primary
    // pack as a last-resort reading so the maths branch can still compile it.
    if (!candidates.length && this.packs.length) {
      const primary = this.packs[0];
      candidates.push({ analysis: analyse(input.hypothesis, primary), score: 0 });
      trace.push({
        stage: "analysis",
        pack: primary.id,
        outcome: "fallback-candidate",
        detail: "no lexical match; retained for mathematical reading",
      });
    }
    // Most complete reading first; identical scores keep the visitor's language.
    candidates.sort((a, b) => b.score - a.score);

    const accepted: Array<{
      program: Program;
      action: ExecutedAction;
      analysis: Analysis;
      confidence: number;
      domain: TaskDomain;
    }> = [];

    for (const candidate of candidates) {
      const built = buildProgram(candidate.analysis, this.previous, this.context);
      const evidenceOfBuild = evidenceOfLastBuild();
      if (!built.program) {
        trace.push({
          stage: "build",
          pack: candidate.analysis.pack.id,
          outcome: "no-program",
          detail: built.error,
        });
        continue;
      }

      const domain = domainOfProgram(built.program);
      const recent = this.context.recent();
      const evidence: DispatchEvidence = {
        text: candidate.analysis.text,
        currencyMentions: evidenceOfBuild.currencyMentions,
        unitMentions: evidenceOfBuild.unitMentions,
        mathConfidence: evidenceOfBuild.math?.confidence ?? 0,
        hasEquation: evidenceOfBuild.math?.task === "solve-equation",
        hasAmount: Boolean(candidate.analysis.amount),
        contextDomain: recent?.domain ?? null,
        inherited: evidenceOfBuild.inherited,
      };

      const verdict = validateDispatch(built.program, evidence);
      if (!verdict.ok) {
        trace.push({
          stage: "validate",
          pack: candidate.analysis.pack.id,
          outcome: `blocked:${verdict.code}`,
          detail: verdict.message,
        });
        continue;
      }
      trace.push({
        stage: "validate",
        pack: candidate.analysis.pack.id,
        outcome: "passed",
        detail: `domain=${domain}`,
      });

      // A continuation that stays inside the domain of the previous turn is
      // strong evidence ("120 dollars to euros" → "and 80"). Crossing a domain
      // boundary has already been blocked by the dispatch guard above, so this
      // bonus can never rescue a stale-context misroute.
      const continuation = evidenceOfBuild.inherited && recent?.domain === domain ? 0.45 : 0;
      const confidence = Math.min(
        1,
        normaliseConfidence(built.score) +
          this.context.bias(domain) +
          continuation +
          (domain === "math" ? (evidenceOfBuild.math?.confidence ?? 0) * 0.3 : 0),
      );
      const threshold = CONFIDENCE_THRESHOLDS[domain];
      trace.push({
        stage: "confidence",
        pack: candidate.analysis.pack.id,
        outcome: confidence >= threshold ? "above-threshold" : "below-threshold",
        score: Number(confidence.toFixed(3)),
        detail: `threshold ${threshold} for ${domain}`,
      });

      const executed = execute(built.program, this.previous);
      if (!executed.ok) {
        trace.push({
          stage: "execute",
          pack: candidate.analysis.pack.id,
          outcome: "failed",
          detail: executed.error,
        });
        continue;
      }

      accepted.push({
        program: executed.program,
        action: executed.action,
        analysis: candidate.analysis,
        confidence,
        domain,
      });
    }

    if (!accepted.length) {
      const blocked = trace.find((step) => step.outcome.startsWith("blocked:"));
      return {
        kind: "rejected",
        reason: blocked?.detail ?? "Nothing in that sentence could be acted on safely.",
        trace,
      };
    }

    accepted.sort((a, b) => b.confidence - a.confidence);
    const best = accepted[0];
    const runnerUp = accepted.find((candidate) => candidate.domain !== best.domain);

    // Genuine cross-domain ambiguity: ask rather than guess.
    if (runnerUp && best.confidence - runnerUp.confidence < AMBIGUITY_MARGIN) {
      return {
        kind: "clarify",
        reason: "ambiguous-domain",
        question: "That could be read two ways. Which did you mean?",
        options: [best, runnerUp].map((candidate) => ({
          label: `${DOMAIN_LABEL[candidate.domain]} — ${candidate.action.label}`,
          domain: candidate.domain,
          href: candidate.action.href,
        })),
        confidence: best.confidence,
        trace,
      };
    }

    // Below the threshold for a consequential action: confirm first.
    if (best.confidence < CONFIDENCE_THRESHOLDS[best.domain]) {
      return {
        kind: "clarify",
        reason: "low-confidence",
        question: `Did you mean: ${best.action.label}?`,
        options: [
          { label: `Yes — ${DOMAIN_LABEL[best.domain]}`, domain: best.domain, href: best.action.href },
        ],
        confidence: best.confidence,
        trace,
      };
    }

    this.previous = best.program;
    this.context.record(best.domain, best.action.label);
    trace.push({
      stage: "execute",
      pack: best.analysis.pack.id,
      outcome: "dispatched",
      detail: best.action.label,
      score: Number(best.confidence.toFixed(3)),
    });

    return {
      kind: "action",
      program: best.program,
      action: best.action,
      analysis: best.analysis,
      pack: best.analysis.pack,
      confidence: best.confidence,
      domain: best.domain,
      trace,
    };
  }

  /** Run a program previously learned on this device. */
  replay(program: Program): Interpretation | null {
    const executed = execute(program, this.previous);
    if (!executed.ok) return null;
    this.previous = executed.program;
    const pack = this.packs.find((candidate) => candidate.id === program.lang) ?? this.packs[0];
    this.context.record(domainOfProgram(executed.program), executed.action.label);
    return {
      program: executed.program,
      action: executed.action,
      analysis: analyse("", pack),
      pack,
      confidence: 1,
      domain: domainOfProgram(executed.program),
    };
  }
}

/** Stateless convenience for tests and one-shot callers: no context is kept. */
export function parseVoiceCommand(transcript: string, packs?: LanguagePack[]): ExecutedAction | null {
  const runtime = new VoiceRuntime(packs ? packs : allPacks());
  return runtime.interpret({ heard: transcript, hypothesis: transcript })?.action ?? null;
}

/** One-shot full decision, used by the diagnostics endpoint and replay tests. */
export function decideVoiceCommand(transcript: string, packs?: LanguagePack[]): Decision {
  const runtime = new VoiceRuntime(packs ? packs : allPacks());
  return runtime.decide({ heard: transcript, hypothesis: transcript });
}

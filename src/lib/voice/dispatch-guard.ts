import type { Program, Slots } from "@/lib/voice/ir";
import type { TaskDomain } from "@/lib/voice/context";

/**
 * Stage 4b: action dispatch validation.
 *
 * Nothing executes on the strength of an intent label alone. Before the VM
 * runs a program we check that the *evidence in the utterance* has the data
 * types the action requires, and we block pairs that are known to be
 * nonsensical — above all "the sentence was mathematics, the action is a
 * currency conversion", which is the failure this guard was written for.
 */

export interface DispatchEvidence {
  /** Raw transcript, after speech recognition. */
  text: string;
  /** Count of explicit currency mentions found by the lexical parser. */
  currencyMentions: number;
  /** Count of explicit unit mentions found by the lexical parser. */
  unitMentions: number;
  /** Mathematical signal strength, 0–1, from the maths recogniser. */
  mathConfidence: number;
  /** True when the utterance contains an equality with an unknown. */
  hasEquation: boolean;
  /** Whether a numeric amount was heard at all. */
  hasAmount: boolean;
  /** Domain of the most recent accepted turn, if still fresh. */
  contextDomain: TaskDomain | null;
  /** The reading relies on the previous command rather than this sentence. */
  inherited: boolean;
}

export type DispatchRejection = {
  code:
    | "math-routed-to-conversion"
    | "conversion-without-currency-evidence"
    | "conversion-without-unit-evidence"
    | "cross-domain-inheritance"
    | "non-numeric-amount"
    | "missing-expression"
    | "unsafe-expression";
  message: string;
};

export type DispatchVerdict = { ok: true } | { ok: false } & DispatchRejection;

/** Characters an expression slot may legally contain. */
const EXPRESSION_ALLOWED = /^[0-9a-zA-Z+\-*/^().,%= ]+$/;

export function domainOfProgram(program: Program): TaskDomain {
  const instruction = program.code[0];
  if (!instruction) return "navigation";
  switch (instruction.op) {
    case "SOLVE":
    case "EVAL":
      return "math";
    case "CONVERT":
      return typeof instruction.slots?.category === "string" ? "units" : "currency";
    case "OPEN": {
      const topic = instruction.slots?.topic;
      if (topic === "crypto" || topic === "bitcoin" || topic === "inflation" || topic === "gdp") return "market";
      if (topic === "currency") return "currency";
      if (topic === "units") return "units";
      return "navigation";
    }
    default:
      return "navigation";
  }
}

function checkAmount(slots: Slots | undefined): DispatchRejection | null {
  if (!slots || slots.amount === undefined) return null;
  if (typeof slots.amount !== "number" || !Number.isFinite(slots.amount)) {
    return {
      code: "non-numeric-amount",
      message: "The amount slot must be a finite number before an action runs.",
    };
  }
  return null;
}

/**
 * Validate a compiled program against the evidence that produced it.
 * Returns `{ ok: true }` only when the action is safe to dispatch.
 */
export function validateDispatch(program: Program, evidence: DispatchEvidence): DispatchVerdict {
  const instruction = program.code[0];
  if (!instruction) {
    return { ok: false, code: "missing-expression", message: "The program has no instruction." };
  }

  const amountProblem = checkAmount(instruction.slots);
  if (amountProblem) return { ok: false, ...amountProblem };

  const domain = domainOfProgram(program);

  // 1. Mathematics must never be dispatched as a money or unit conversion.
  if ((domain === "currency" || domain === "units") && (evidence.hasEquation || evidence.mathConfidence >= 0.45)) {
    return {
      ok: false,
      code: "math-routed-to-conversion",
      message:
        "The utterance is mathematical (equation or arithmetic), so a conversion action was blocked. " +
        "Mathematical input is only ever dispatched to the maths executor.",
    };
  }

  // 2. A currency conversion needs currency evidence in *this* sentence, or an
  //    explicitly currency-typed context to continue.
  if (domain === "currency" && instruction.op === "CONVERT") {
    const explicit = evidence.currencyMentions >= 1;
    const continuing = evidence.inherited && evidence.contextDomain === "currency";
    if (!explicit && !continuing) {
      return {
        ok: false,
        code: "conversion-without-currency-evidence",
        message:
          "No currency was named and the previous turn was not a currency conversion, " +
          "so a bare number was not converted into money.",
      };
    }
  }

  // 3. The same rule for unit conversions.
  if (domain === "units" && instruction.op === "CONVERT") {
    const explicit = evidence.unitMentions >= 1;
    const continuing = evidence.inherited && evidence.contextDomain === "units";
    if (!explicit && !continuing) {
      return {
        ok: false,
        code: "conversion-without-unit-evidence",
        message: "No measurement unit was named, so a bare number was not converted.",
      };
    }
  }

  // 4. Inheritance may never cross a domain boundary.
  if (evidence.inherited && evidence.contextDomain && evidence.contextDomain !== domain) {
    return {
      ok: false,
      code: "cross-domain-inheritance",
      message: `A ${evidence.contextDomain} context cannot be reused for a ${domain} action.`,
    };
  }

  // 5. Maths actions need a well-formed, safe expression.
  if (domain === "math") {
    const expression = instruction.slots?.expression;
    if (typeof expression !== "string" || !expression.trim()) {
      return { ok: false, code: "missing-expression", message: "A maths action requires an expression." };
    }
    if (expression.length > 240 || !EXPRESSION_ALLOWED.test(expression)) {
      return {
        ok: false,
        code: "unsafe-expression",
        message: "The expression contains characters that are not permitted in a maths action.",
      };
    }
    if (instruction.op === "SOLVE" && !expression.includes("=")) {
      return { ok: false, code: "missing-expression", message: "Solving requires an equation with an equals sign." };
    }
  }

  return { ok: true };
}

/** Confidence required before an action runs without asking the visitor. */
export const CONFIDENCE_THRESHOLDS: Record<TaskDomain, number> = {
  // Money is the most consequential and the most historically confused.
  currency: 0.62,
  units: 0.52,
  math: 0.45,
  market: 0.55,
  navigation: 0.4,
};

/** Two readings this close, in different domains, are a genuine ambiguity. */
export const AMBIGUITY_MARGIN = 0.12;

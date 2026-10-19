import { safeEvaluate } from "@/lib/math";

/**
 * Stage 2a: mathematical intent recognition.
 *
 * The historical defect this module exists to remove: a spoken equation such as
 * "solve three x plus five equals twenty" produced a *number*, the number was
 * treated as a bare amount, and the amount fell through to the conversion
 * branch — so a linear equation was answered as a currency conversion.
 *
 * Mathematics is therefore recognised as a first-class intent **before** any
 * conversion reading is attempted, and it emits strongly typed entities
 * (`math.equation`, `math.expression`, `math.variable`, `math.number`) that the
 * dispatch guard refuses to hand to a currency or unit executor.
 */

export type MathTask = "solve-equation" | "evaluate-expression";

export type MathEntity =
  | { type: "math.equation"; value: string }
  | { type: "math.expression"; value: string }
  | { type: "math.variable"; value: string }
  | { type: "math.number"; value: number };

export interface MathIntent {
  task: MathTask;
  /** Canonical, symbol-form text: "3x + 5 = 20" or "12 * 7". */
  canonical: string;
  /** Unknown to solve for, when the task is an equation. */
  variable?: string;
  entities: MathEntity[];
  /** 0–1. Driven by explicit verbs, operators, equality and variables. */
  confidence: number;
  /** Human-readable reasons, surfaced in the diagnostics trace. */
  signals: string[];
}

/** Verbs and nouns that mark an explicitly mathematical request. */
const STRONG_MARKERS: Array<[RegExp, string, number]> = [
  [/\b(solve|solving)\b/i, "verb:solve", 0.42],
  [/\blinear\s+equations?\b/i, "phrase:linear-equation", 0.5],
  [/\bquadratic\s+(equations?|formula)\b/i, "phrase:quadratic", 0.5],
  [/\bsimultaneous\s+equations?\b/i, "phrase:simultaneous", 0.45],
  [/\bequations?\b/i, "noun:equation", 0.34],
  [/\bsolve\s+for\s+([a-z])\b/i, "phrase:solve-for", 0.46],
  [/\b(calculate|compute|evaluate|work\s+out|what\s+is|how\s+much\s+is)\b/i, "verb:evaluate", 0.2],
  [/\b(square\s+root|cube\s+root|factorial|logarithm|exponent)\b/i, "function-word", 0.3],
  [/\b(sqrt|sin|cos|tan|log|ln|abs|round)\s*\(/i, "function-call", 0.34],
  [/\b(derivative|integral|simplify|factorise|factorize)\b/i, "calculus", 0.3],
  [/\bx\s*squared\b|\bsquared\b|\bcubed\b/i, "power-word", 0.22],
];

/** Spoken-form → symbol rewrites applied before parsing. */
const REWRITES: Array<[RegExp, string]> = [
  [/\bplus\b|\band then add\b|\badded to\b/gi, " + "],
  [/\bminus\b|\bsubtract(ed by)?\b|\bless\b/gi, " - "],
  [/\b(times|multiplied by)\b/gi, " * "],
  [/\b(divided by|over)\b/gi, " / "],
  [/\b(equals|equal to|is equal to)\b/gi, " = "],
  [/\bto the power of\b/gi, " ^ "],
  [/\bsquare root of\b/gi, " sqrt"],
  [/\bcube root of\b/gi, " cbrt"],
  [/\bopen (bracket|paren(thesis)?)\b/gi, " ( "],
  [/\bclose (bracket|paren(thesis)?)\b/gi, " ) "],
  [/\bpercent\b/gi, " % "],
];

const SPOKEN_NUMBERS: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6",
  seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12",
  thirteen: "13", fourteen: "14", fifteen: "15", sixteen: "16", seventeen: "17",
  eighteen: "18", nineteen: "19", twenty: "20", thirty: "30", forty: "40",
  fifty: "50", sixty: "60", seventy: "70", eighty: "80", ninety: "90",
  hundred: "100", thousand: "1000",
};

/** Currency and unit words: their presence means this is *not* a bare sum. */
const MONETARY_WORDS =
  /\b(dollars?|usd|euros?|eur|pounds?\s+sterling|gbp|yen|jpy|yuan|cny|rupees?|inr|francs?|chf|pesos?|won|krw|rand|zar|real|brl|lira|try|ruble|rub|aud|cad|nzd|sek|nok|dkk|currency|exchange\s+rate|fx|convert\s+\w+\s+to\s+\w+)\b/i;

export function hasMonetaryLanguage(text: string): boolean {
  return MONETARY_WORDS.test(text);
}

/** Replace spoken number words, leaving digits untouched. */
function digitise(text: string): string {
  return text.replace(/\b[a-z]+\b/gi, (word) => {
    const key = word.toLowerCase();
    return Object.hasOwn(SPOKEN_NUMBERS, key) ? SPOKEN_NUMBERS[key] : word;
  });
}

/** "three x" → "3x", "5 x" → "5x"; keeps an implicit product explicit later. */
function normalise(text: string): string {
  let out = ` ${text.toLowerCase()} `;
  out = digitise(out);
  for (const [pattern, replacement] of REWRITES) out = out.replace(pattern, replacement);
  out = out
    .replace(/\b(\w+)\s+squared\b/g, "$1^2")
    .replace(/\b(\w+)\s+cubed\b/g, "$1^3")
    .replace(/\bsqrt\s+of\b/g, "sqrt")
    .replace(/[?!。，,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return out;
}

/** The arithmetic/algebraic core of a sentence, with prose stripped away. */
function extractCore(normalised: string): string | null {
  const match = /[-+]?[\d(]|\b[a-z]\s*[-+*/^=]/.exec(normalised);
  if (!match) return null;
  const tail = normalised.slice(match.index);
  // Keep only characters that belong to an expression, stopping at prose.
  const cleaned = tail.replace(
    /\b(?!sqrt|cbrt|sin|cos|tan|log|ln|abs|pi|e)[a-z]{2,}\b/g,
    " ",
  );
  const core = cleaned.replace(/[^0-9a-z+\-*/^=().,%\s]/g, " ").replace(/\s+/g, " ").trim();
  return core.length ? core : null;
}

/** Insert the multiplication signs that speech omits: 3x → 3*x, 2(x+1) → 2*(x+1). */
function explicitProducts(core: string): string {
  return core
    .replace(/(\d)\s*([a-z])/g, (_m, digit: string, letter: string) =>
      ["e", "p"].includes(letter) ? `${digit}${letter}` : `${digit}*${letter}`,
    )
    .replace(/(\d)\s*\(/g, "$1*(")
    .replace(/\)\s*\(/g, ")*(")
    .replace(/([a-z])\s*\(/g, (match, letter: string) =>
      /^(sqrt|cbrt|sin|cos|tan|log|ln|abs)$/.test(letter) ? match : `${letter}*(`,
    );
}

const RESERVED = new Set(["sqrt", "cbrt", "sin", "cos", "tan", "log", "ln", "abs", "pi", "e"]);

function findVariables(core: string): string[] {
  const found = new Set<string>();
  for (const match of core.matchAll(/\b([a-z])\b/g)) {
    if (!RESERVED.has(match[1])) found.add(match[1]);
  }
  return [...found];
}

/**
 * Decide whether an utterance is mathematical, and if so how confident we are.
 * Returns `null` when nothing mathematical is present.
 */
export function detectMathIntent(text: string): MathIntent | null {
  const raw = text.trim();
  if (!raw) return null;

  const signals: string[] = [];
  let confidence = 0;
  for (const [pattern, name, weight] of STRONG_MARKERS) {
    if (pattern.test(raw)) {
      signals.push(name);
      confidence += weight;
    }
  }

  const normalised = normalise(raw);
  const core = extractCore(normalised);
  if (!core) return null;

  const expression = explicitProducts(core);
  const hasEquals = expression.includes("=");
  const operators = (expression.match(/[+\-*/^]/g) ?? []).length;
  const numbers = expression.match(/\d+(?:\.\d+)?/g) ?? [];
  const variables = findVariables(expression);

  if (hasEquals && variables.length) {
    confidence += 0.4;
    signals.push("equality+variable");
  }
  if (operators >= 1 && numbers.length >= 2) {
    confidence += 0.26;
    signals.push("operator-between-numbers");
  }
  if (variables.length) signals.push(`variables:${variables.join("")}`);

  // Money talk suppresses the mathematical reading unless an equation is present.
  if (hasMonetaryLanguage(raw) && !(hasEquals && variables.length)) {
    confidence -= 0.6;
    signals.push("monetary-language-penalty");
  }

  // A lone number with no operator, no equality and no verb is not a sum.
  const isBareNumber = operators === 0 && !hasEquals && numbers.length <= 1 && !variables.length;
  if (isBareNumber) return null;

  confidence = Math.max(0, Math.min(1, confidence));
  if (confidence < 0.25) return null;

  const entities: MathEntity[] = [];
  const task: MathTask = hasEquals && variables.length ? "solve-equation" : "evaluate-expression";
  entities.push(
    task === "solve-equation"
      ? { type: "math.equation", value: expression }
      : { type: "math.expression", value: expression },
  );
  for (const variable of variables) entities.push({ type: "math.variable", value: variable });
  for (const number of numbers.slice(0, 8)) entities.push({ type: "math.number", value: Number(number) });

  return {
    task,
    canonical: expression,
    variable: task === "solve-equation" ? variables[0] : undefined,
    entities,
    confidence,
    signals,
  };
}

export type MathSolution =
  | { ok: true; kind: "root" | "value"; display: string; detail: string; expression: string }
  | { ok: false; error: string };

function evaluateAt(expression: string, variable: string, value: number): number | null {
  const result = safeEvaluate(expression, { [variable]: value });
  if (!result.ok) return null;
  const numeric = typeof result.value === "number" ? result.value : Number(result.value);
  return Number.isFinite(numeric) ? numeric : null;
}

function round(value: number): number {
  return Math.abs(value - Math.round(value)) < 1e-9 ? Math.round(value) : Number(value.toFixed(6));
}

/** Solve a linear (or simple quadratic) equation, or evaluate an expression. */
export function solveMath(intent: MathIntent): MathSolution {
  if (intent.task === "evaluate-expression") {
    const result = safeEvaluate(intent.canonical);
    if (!result.ok) return { ok: false, error: result.error };
    const text = typeof result.value === "number" ? String(round(result.value)) : String(result.value);
    return {
      ok: true,
      kind: "value",
      display: text,
      detail: `${intent.canonical} = ${text}`,
      expression: intent.canonical,
    };
  }

  const variable = intent.variable ?? "x";
  const sides = intent.canonical.split("=");
  if (sides.length !== 2) return { ok: false, error: "An equation needs exactly one equals sign." };
  const [left, right] = sides.map((side) => side.trim());
  if (!left || !right) return { ok: false, error: "Both sides of the equation are required." };

  // f(v) = left − right. Sample three points to identify the degree.
  const residual = `(${left}) - (${right})`;
  const f0 = evaluateAt(residual, variable, 0);
  const f1 = evaluateAt(residual, variable, 1);
  const f2 = evaluateAt(residual, variable, 2);
  if (f0 === null || f1 === null || f2 === null) {
    return { ok: false, error: "That equation could not be evaluated." };
  }

  const secondDifference = f2 - 2 * f1 + f0;
  if (Math.abs(secondDifference) < 1e-9) {
    const slope = f1 - f0;
    if (Math.abs(slope) < 1e-12) {
      return {
        ok: false,
        error: Math.abs(f0) < 1e-12 ? "Every value satisfies this equation." : "This equation has no solution.",
      };
    }
    const root = round(-f0 / slope);
    return {
      ok: true,
      kind: "root",
      display: `${variable} = ${root}`,
      detail: `Linear equation ${intent.canonical} solved for ${variable}: ${variable} = ${root}`,
      expression: intent.canonical,
    };
  }

  // Quadratic: reconstruct a, b, c from the three samples.
  const a = secondDifference / 2;
  const b = f1 - f0 - a;
  const c = f0;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    return { ok: false, error: "This quadratic has no real roots." };
  }
  const sqrtD = Math.sqrt(discriminant);
  const r1 = round((-b + sqrtD) / (2 * a));
  const r2 = round((-b - sqrtD) / (2 * a));
  const display = r1 === r2 ? `${variable} = ${r1}` : `${variable} = ${r1} or ${variable} = ${r2}`;
  return {
    ok: true,
    kind: "root",
    display,
    detail: `Quadratic equation ${intent.canonical} solved for ${variable}: ${display}`,
    expression: intent.canonical,
  };
}

import { canonicaliseSpokenNumbers } from "@/lib/voice/operation-intent";
import { safeEvaluate } from "@/lib/math";

/**
 * Stage 2b: automated code generation.
 *
 * Speech recognition produces words; the site's tools run code. This module is
 * the bridge: it reads a recognised sentence, associates it with a *capability*
 * (a named calculation the site can perform) and generates a self-contained
 * program for the restricted math evaluator — literal numbers, arithmetic
 * operators and allow-listed functions only. Nothing generated here is ever
 * `eval`ed as JavaScript; the output is verified by the IR (`safeExpression`)
 * and executed by `safeEvaluate`, which rejects assignments, property access
 * and unknown identifiers.
 *
 * Every program records the symbolic template it was generated from and the
 * bindings that were read out of the sentence, so the decision trace can show
 * exactly how "monthly payment on a 20000 loan at 6 percent over 5 years"
 * became `20000 * (0.06/12) / (1 - (1 + 0.06/12)^(-12*5))`.
 */

export type CodegenFamily =
  | "arithmetic"
  | "function"
  | "percentage"
  | "finance"
  | "geometry"
  | "everyday"
  | "statistics"
  | "conversion";

export interface GeneratedProgram {
  /** Stable capability id, e.g. "loan-payment", "factorial", "arithmetic". */
  capability: string;
  family: CodegenFamily;
  /** Generated, self-contained code for the restricted evaluator. */
  code: string;
  /** Symbolic form the code was generated from (for the trace and the UI). */
  template: string;
  /** Named parameters extracted from speech, in template order. */
  bindings: Record<string, number>;
  /** A formula-tool preset that shows the same calculation, when one exists. */
  preset?: string;
  /** Suffix for the displayed result ("%", " km/h"...). */
  unit?: string;
  confidence: number;
  signals: string[];
}

const FINANCE = new Set([
  "loan-payment", "compound-interest", "simple-interest", "savings-goal", "future-value-deposits",
  "inflation-adjusted", "effective-annual-rate", "real-return", "break-even", "tip", "bill-split",
  "discount", "vat-add", "vat-remove", "fuel-cost", "mortgage-total-interest", "rule-of-72",
]);

export function isFinanceCapability(id: string | undefined): boolean {
  return !!id && FINANCE.has(id);
}

/* ------------------------------------------------------------------ */
/* Lexical preparation                                                 */
/* ------------------------------------------------------------------ */

const NUMBER = String.raw`[-+]?(?:\d+(?:\.\d+)?|\.\d+)`;
const N = `(${NUMBER})`;

/** Word → symbol rewrites that make a spoken sum readable as code. */
const SPOKEN_OPERATORS: Array<[RegExp, string]> = [
  [/\b(?:what(?:'s| is| are)?|how much is|calculate|compute|evaluate|work out|tell me|give me|please|the (?:result|answer|value) of|equals?|is equal to|igual a|combien font|was ist|wie viel ist|cuanto es|cuanto son|calcula|calcule|berechne|计算|等于)\b/gi, " "],
  [/\b(?:plus|added to|add|and then add|mas|más|et|und|加)\b/gi, " + "],
  [/\b(?:minus|subtract(?:ed)?(?: by| from)?|less|take away|menos|moins|weniger|减)\b/gi, " - "],
  [/\b(?:times|multiplied by|multiply(?: by)?|por|fois|mal|乘以|乘)\b/gi, " * "],
  [/\b(?:divided by|divide(?: by)?|over|entre|dividido por|divise par|geteilt durch|除以)\b/gi, " / "],
  [/\b(?:to the power of|raised to(?: the power of)?|to the|power of|elevado a|puissance|hoch|的)\s*(?=[-+]?\d)/gi, " ^ "],
  [/\b(?:modulo|mod|remainder of)\b/gi, " mod "],
  [/\bsquared\b|\bal cuadrado\b|\bau carre\b|\bzum quadrat\b|\b的平方\b/gi, " ^ 2 "],
  [/\bcubed\b|\bal cubo\b|\bau cube\b|\bhoch drei\b/gi, " ^ 3 "],
  [/\bpercent(?:age)?\b|\bpor ciento\b|\bpour cent\b|\bprozent\b|%/gi, " % "],
  [/\bopen (?:bracket|paren(?:thesis)?)\b/gi, " ( "],
  [/\bclose (?:bracket|paren(?:thesis)?)\b/gi, " ) "],
  [/\bpi\b|π/gi, " pi "],
  [/\beuler'?s number\b/gi, " e "],
  [/\bnegative\s+(?=\d)/gi, "-"],
];

/** Function words → mathjs functions, applied to "<fn> of <x>" and "<fn> <x>". */
const FUNCTION_WORDS: Array<[RegExp, string]> = [
  [/\b(?:square root|sqrt|raiz cuadrada|racine carree|quadratwurzel|平方根)\b/gi, "sqrt"],
  [/\b(?:cube root|cubic root|raiz cubica|racine cubique|kubikwurzel|立方根)\b/gi, "cbrt"],
  [/\b(?:absolute value|absolute|abs|valor absoluto|valeur absolue|betrag)\b/gi, "abs"],
  [/\b(?:natural log(?:arithm)?|ln)\b/gi, "log"],
  [/\b(?:log(?:arithm)? base (?:2|two)|log2)\b/gi, "log2"],
  [/\b(?:log(?:arithm)?(?: base (?:10|ten))?|log10|logaritmo|logarithme|logarithmus)\b/gi, "log10"],
  [/\b(?:exponential|exp)\b/gi, "exp"],
  [/\b(?:sine|sin|seno|sinus)\b/gi, "sin"],
  [/\b(?:cosine|cos|coseno|cosinus)\b/gi, "cos"],
  [/\b(?:tangent|tan|tangente|tangens)\b/gi, "tan"],
  [/\b(?:arc ?sine|asin|inverse sine)\b/gi, "asin"],
  [/\b(?:arc ?cosine|acos|inverse cosine)\b/gi, "acos"],
  [/\b(?:arc ?tangent|atan|inverse tangent)\b/gi, "atan"],
  [/\b(?:round(?:ed)?|redondea|arrondi|runde)\b/gi, "round"],
  [/\b(?:floor|round down)\b/gi, "floor"],
  [/\b(?:ceiling|ceil|round up)\b/gi, "ceil"],
];

const DEGREE_FUNCTIONS = new Set(["sin", "cos", "tan"]);

export function prepareSpokenMath(input: string): string {
  // Spoken numbers ("twenty", "one thousand") become digits first.
  let text = canonicaliseSpokenNumbers(input);
  text = text.replace(/[,](?=\d{3}\b)/g, ""); // 1,000 → 1000
  text = text.replace(/(\d+)\s+(?:point|dot|comma|punto|coma|virgule|komma)\s+(\d+)/gi, "$1.$2"); // 3 point 5 → 3.5
  text = text.replace(/\$|€|£|¥|\b(?:dollars?|bucks|euros?|pounds?|quid|usd|eur|gbp|yen|jpy)\b/gi, " ");
  for (const [pattern, replacement] of SPOKEN_OPERATORS) text = text.replace(pattern, replacement);
  return text.replace(/\s+/g, " ").trim();
}

function num(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function lit(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(14)));
}

function pct(value: number): string {
  return lit(value / 100);
}

/* ------------------------------------------------------------------ */
/* Generators                                                          */
/* ------------------------------------------------------------------ */

type Generator = (text: string, raw: string) => GeneratedProgram | null;

function program(
  capability: string,
  family: CodegenFamily,
  template: string,
  bindings: Record<string, number>,
  code: string,
  confidence: number,
  signals: string[],
  extra: Partial<Pick<GeneratedProgram, "preset" | "unit">> = {},
): GeneratedProgram {
  return { capability, family, template, bindings, code, confidence, signals: [`codegen:${capability}`, ...signals], ...extra };
}

function finite(...values: number[]): boolean {
  return values.every((value) => Number.isFinite(value) && Math.abs(value) < 1e15);
}

/** Loan / mortgage monthly payment. */
const loanPayment: Generator = (text) => {
  if (!/\b(?:loan|mortgage|repayment|instal?lment|monthly payment|prestamo|hipoteca|cuota|pret|credit|kredit|darlehen|rate|贷款|月供)\b/i.test(text)) return null;
  if (!/\b(?:payment|pay|repay|monthly|instal?lment|cuota|mensualite|rate|月供|per month|a month|each month)\b/i.test(text) && !/\bloan\b/i.test(text)) return null;
  const rate = pick(text, /(\d+(?:\.\d+)?)\s*%/) ?? pick(text, /\bat\s+(\d+(?:\.\d+)?)\b/);
  const years = pick(text, /(\d+(?:\.\d+)?)\s*(?:years?|yrs?|anos?|ans|jahre?|年)/i);
  const months = years === null ? pick(text, /(\d+(?:\.\d+)?)\s*(?:months?|meses|mois|monate|个月)/i) : null;
  const principal = firstNumberExcept(text, [rate, years, months]);
  const n = years !== null ? years * 12 : months;
  if (principal === null || rate === null || n === null || !finite(principal, rate, n) || n <= 0 || principal <= 0) return null;
  const r = rate / 100;
  const code = r === 0 ? `${lit(principal)} / ${lit(n)}` : `${lit(principal)} * (${pct(rate)}/12) / (1 - (1 + ${pct(rate)}/12)^(-${lit(n)}))`;
  return program("loan-payment", "finance", "P * (r/12) / (1 - (1 + r/12)^(-n))", { P: principal, r, n }, code, 0.93, ["slots:principal+rate+term"], { preset: "loan-payment" });
};

/** Compound interest / future value of a lump sum. */
const compoundInterest: Generator = (text) => {
  if (!/\b(?:compound(?:ed|ing)?|future value|grow(?:s|th)?|invest(?:ed|ment)?|interes compuesto|zinseszins|interets composes|复利)\b/i.test(text)) return null;
  const rate = pick(text, /(\d+(?:\.\d+)?)\s*%/) ?? pick(text, /\bat\s+(\d+(?:\.\d+)?)\b/);
  const years = pick(text, /(\d+(?:\.\d+)?)\s*(?:years?|yrs?|anos?|ans|jahre?|年)/i);
  const principal = firstNumberExcept(text, [rate, years]);
  if (principal === null || rate === null || years === null || !finite(principal, rate, years)) return null;
  const monthly = /\b(?:monthly|every month|per month|mensual|mensuel|monatlich|每月)\b/i.test(text);
  const n = monthly ? 12 : 1;
  const code = `${lit(principal)} * (1 + ${pct(rate)}/${n})^(${n}*${lit(years)})`;
  return program("compound-interest", "finance", "P * (1 + r/n)^(n*t)", { P: principal, r: rate / 100, n, t: years }, code, 0.93, ["slots:principal+rate+years", monthly ? "compound:monthly" : "compound:annual"], { preset: "compound-interest" });
};

const simpleInterest: Generator = (text) => {
  if (!/\bsimple interest\b|\binteres simple\b|\binteret simple\b|\beinfache zinsen\b/i.test(text)) return null;
  const rate = pick(text, /(\d+(?:\.\d+)?)\s*%/) ?? pick(text, /\bat\s+(\d+(?:\.\d+)?)\b/);
  const years = pick(text, /(\d+(?:\.\d+)?)\s*(?:years?|yrs?|anos?|ans|jahre?|年)/i);
  const principal = firstNumberExcept(text, [rate, years]);
  if (principal === null || rate === null || years === null || !finite(principal, rate, years)) return null;
  return program("simple-interest", "finance", "P * r * t", { P: principal, r: rate / 100, t: years }, `${lit(principal)} * ${pct(rate)} * ${lit(years)}`, 0.92, ["slots:principal+rate+years"]);
};

const savingsGoal: Generator = (text) => {
  if (!/\b(?:save|saving|savings goal|reach|target|ahorrar|epargner|sparen)\b/i.test(text) || !/\b(?:month|monthly|mensual|mois|monat)/i.test(text)) return null;
  const rate = pick(text, /(\d+(?:\.\d+)?)\s*%/) ?? 0;
  const years = pick(text, /(\d+(?:\.\d+)?)\s*(?:years?|yrs?|anos?|ans|jahre?|年)/i);
  const goal = firstNumberExcept(text, [rate, years]);
  if (goal === null || years === null || !finite(goal, rate, years) || years <= 0) return null;
  const code = rate === 0 ? `${lit(goal)} / (12*${lit(years)})` : `${lit(goal)} * (${pct(rate)}/12) / ((1 + ${pct(rate)}/12)^(12*${lit(years)}) - 1)`;
  return program("savings-goal", "finance", "goal * (r/12) / ((1 + r/12)^(12*t) - 1)", { goal, r: rate / 100, t: years }, code, 0.86, ["slots:goal+rate+years"], { preset: "savings-goal-monthly" });
};

const inflationAdjusted: Generator = (text) => {
  if (!/\b(?:inflation[- ]adjusted|purchasing power|in today'?s money|worth in|adjusted for inflation|poder adquisitivo|pouvoir d'?achat|kaufkraft)\b/i.test(text)) return null;
  const rate = pick(text, /(\d+(?:\.\d+)?)\s*%/);
  const years = pick(text, /(\d+(?:\.\d+)?)\s*(?:years?|yrs?|anos?|ans|jahre?|年)/i);
  const amount = firstNumberExcept(text, [rate, years]);
  if (amount === null || rate === null || years === null || !finite(amount, rate, years)) return null;
  return program("inflation-adjusted", "finance", "amount / (1 + i)^t", { amount, i: rate / 100, t: years }, `${lit(amount)} / (1 + ${pct(rate)})^${lit(years)}`, 0.88, ["slots:amount+rate+years"], { preset: "inflation-adjusted" });
};

const effectiveRate: Generator = (text) => {
  if (!/\b(?:effective (?:annual )?rate|apy|ear|tasa efectiva|taux effectif|effektivzins)\b/i.test(text)) return null;
  const rate = pick(text, /(\d+(?:\.\d+)?)\s*%/);
  const n = /\bdaily\b/i.test(text) ? 365 : /\bweekly\b/i.test(text) ? 52 : /\bquarterly\b/i.test(text) ? 4 : /\b(?:semi-?annual|twice a year)\b/i.test(text) ? 2 : 12;
  if (rate === null || !finite(rate)) return null;
  return program("effective-annual-rate", "finance", "((1 + r/n)^n - 1) * 100", { r: rate / 100, n }, `((1 + ${pct(rate)}/${n})^${n} - 1) * 100`, 0.9, ["slots:rate", `compounds:${n}`], { preset: "effective-annual-rate", unit: "%" });
};

const ruleOf72: Generator = (text) => {
  if (!/\b(?:double my money|years to double|doubling time|rule of 72|time to double)\b/i.test(text)) return null;
  const rate = pick(text, /(\d+(?:\.\d+)?)\s*%/) ?? pick(text, /\bat\s+(\d+(?:\.\d+)?)\b/);
  if (rate === null || rate <= 0) return null;
  return program("rule-of-72", "finance", "72 / r", { r: rate }, `72 / ${lit(rate)}`, 0.9, ["slots:rate"], { unit: " years" });
};

const tipAndSplit: Generator = (text) => {
  const tip = /\b(?:tip|gratuity|propina|pourboire|trinkgeld|小费)\b/i.test(text);
  const split = /\b(?:split|share|between|among|divide .* (?:people|persons|friends)|dividir|repartir|partager|teilen|平分)\b/i.test(text) && /\b(?:people|persons?|friends|diners|guests|ways|personas|personnes|leute|personen|人)\b/i.test(text);
  if (!tip && !split) return null;
  const percent = pick(text, /(\d+(?:\.\d+)?)\s*%/) ?? (tip ? pick(text, /\b(\d+(?:\.\d+)?)\s*(?=\S*\s*(?:tip|gratuity|propina|pourboire|trinkgeld))/i) : null);
  const people = split ? pick(text, /\b(\d+)\s*(?:people|persons?|friends|diners|guests|ways|personas|personnes|leute|personen|人)/i) ?? pick(text, /\b(?:between|among|entre|zwischen)\s+(\d+)\b/i) : null;
  const bill = firstNumberExcept(text, [percent, people]);
  if (bill === null || !finite(bill) || bill < 0) return null;
  if (split) {
    if (people === null || people < 1 || !Number.isInteger(people)) return null;
    const p = percent ?? 0;
    return program("bill-split", "finance", "bill * (1 + tip) / people", { bill, tip: p / 100, people }, `${lit(bill)} * (1 + ${pct(p)}) / ${lit(people)}`, percent !== null ? 0.95 : 0.9, ["slots:bill+people", percent !== null ? "slot:tip" : "default:tip=0"], { preset: "tip-split" });
  }
  if (percent === null || !finite(percent)) return null;
  const total = /\b(?:total|including|with tip|altogether|in total)\b/i.test(text);
  return total
    ? program("tip", "finance", "bill * (1 + tip)", { bill, tip: percent / 100 }, `${lit(bill)} * (1 + ${pct(percent)})`, 0.92, ["slots:bill+tip", "mode:total"], { preset: "tip-split" })
    : program("tip", "finance", "bill * tip", { bill, tip: percent / 100 }, `${lit(bill)} * ${pct(percent)}`, 0.92, ["slots:bill+tip"], { preset: "tip-split" });
};

/** Percentages in every spoken shape. */
const percentages: Generator = (text) => {
  // "25 % off 80" / "80 with a 25 % discount"
  let m = new RegExp(String.raw`${N}\s*%\s*(?:off|discount(?: on)?|reduction(?: on)?|descuento|de remise|rabatt)\s*(?:of|on|from)?\s*${N}`, "i").exec(text)
    ?? new RegExp(String.raw`${N}\s*(?:with|after|minus|less|con|avec|mit)\s*(?:a|an|un|une|ein)?\s*${N}\s*%\s*(?:off|discount|reduction|descuento|remise|rabatt)`, "i").exec(text);
  if (m) {
    const [percent, amount] = /off|discount|reduction|descuento|remise|rabatt/i.test(m[0].slice(0, m[0].search(/\d/) + 1)) || m[0].search(/%/) < m[0].lastIndexOf(m[2]) ? [num(m[1]), num(m[2])] : [num(m[2]), num(m[1])];
    if (!finite(percent, amount)) return null;
    return program("discount", "percentage", "amount * (1 - p/100)", { amount, p: percent }, `${lit(amount)} * (1 - ${pct(percent)})`, 0.94, ["shape:percent-off"]);
  }
  // "add 20 % vat to 150" / "150 plus 20 % tax" / "150 including 20 % vat"
  m = new RegExp(String.raw`(?:add|plus|with|including|incl\.?|\+)\s*${N}\s*%\s*(?:vat|tax|gst|sales tax|iva|tva|mwst|mehrwertsteuer)?\s*(?:to|on|of)?\s*${N}`, "i").exec(text)
    ?? new RegExp(String.raw`${N}\s*(?:\+|plus|with|including|incl\.?)\s*${N}\s*%\s*(?:vat|tax|gst|iva|tva|mwst)`, "i").exec(text);
  if (m && /vat|tax|gst|iva|tva|mwst/i.test(text)) {
    const first = num(m[1]); const second = num(m[2]);
    const [percent, amount] = m[0].indexOf("%") < m[0].lastIndexOf(m[2]) ? [first, second] : [second, first];
    if (!finite(percent, amount)) return null;
    return program("vat-add", "percentage", "amount * (1 + p/100)", { amount, p: percent }, `${lit(amount)} * (1 + ${pct(percent)})`, 0.93, ["shape:add-tax"]);
  }
  // "remove 20 % vat from 120" / "120 without 20 % vat" / "net of"
  m = new RegExp(String.raw`(?:remove|without|excluding|excl\.?|net of|strip|back out)\s*${N}\s*%\s*(?:vat|tax|gst|iva|tva|mwst)?\s*(?:from|of|on)?\s*${N}`, "i").exec(text)
    ?? new RegExp(String.raw`${N}\s*(?:without|excluding|excl\.?|net of|before)\s*${N}\s*%\s*(?:vat|tax|gst|iva|tva|mwst)`, "i").exec(text);
  if (m && /vat|tax|gst|iva|tva|mwst/i.test(text)) {
    const first = num(m[1]); const second = num(m[2]);
    const [percent, amount] = m[0].indexOf("%") < m[0].lastIndexOf(m[2]) ? [first, second] : [second, first];
    if (!finite(percent, amount)) return null;
    return program("vat-remove", "percentage", "amount / (1 + p/100)", { amount, p: percent }, `${lit(amount)} / (1 + ${pct(percent)})`, 0.92, ["shape:remove-tax"]);
  }
  // "increase 80 by 25 %" / "80 increased by 25 %" / "80 up 25 %"
  m = new RegExp(String.raw`(?:increase|raise|grow|mark up|aumenta|augmente|erhohe)\s*${N}\s*(?:by|en|de|um)\s*${N}\s*%`, "i").exec(text)
    ?? new RegExp(String.raw`${N}\s*(?:increased|raised|up|more|higher|plus)\s*(?:by)?\s*${N}\s*%`, "i").exec(text);
  if (m) {
    const amount = num(m[1]); const percent = num(m[2]);
    if (!finite(percent, amount)) return null;
    return program("percent-increase", "percentage", "amount * (1 + p/100)", { amount, p: percent }, `${lit(amount)} * (1 + ${pct(percent)})`, 0.93, ["shape:increase-by"]);
  }
  m = new RegExp(String.raw`(?:decrease|reduce|lower|cut|mark down|reduce|disminuye|reduis|verringere)\s*${N}\s*(?:by|en|de|um)\s*${N}\s*%`, "i").exec(text)
    ?? new RegExp(String.raw`${N}\s*(?:decreased|reduced|down|less|lower|minus)\s*(?:by)?\s*${N}\s*%`, "i").exec(text);
  if (m) {
    const amount = num(m[1]); const percent = num(m[2]);
    if (!finite(percent, amount)) return null;
    return program("percent-decrease", "percentage", "amount * (1 - p/100)", { amount, p: percent }, `${lit(amount)} * (1 - ${pct(percent)})`, 0.93, ["shape:decrease-by"]);
  }
  // "what percent of 80 is 20" / "20 is what percent of 80" / "20 out of 80 as a percentage" / "20 as a percentage of 80"
  m = new RegExp(String.raw`(?:percent|%)\s*(?:of|de|von)\s*${N}\s*(?:is|are|es|ist)\s*${N}`, "i").exec(text);
  if (m) {
    const whole = num(m[1]); const part = num(m[2]);
    if (!finite(whole, part) || whole === 0) return null;
    return program("percent-ratio", "percentage", "part / whole * 100", { part, whole }, `${lit(part)} / ${lit(whole)} * 100`, 0.92, ["shape:what-percent-of"], { unit: "%" });
  }
  m = new RegExp(String.raw`${N}\s*(?:is|are|es|ist)?\s*(?:what|which)\s*(?:percent|%)\s*(?:of|de|von)\s*${N}`, "i").exec(text)
    ?? new RegExp(String.raw`${N}\s*(?:out of|of|de|von|sur)\s*${N}\s*(?:as|in|en|als)\s*(?:a\s*)?(?:%|percent)`, "i").exec(text)
    ?? new RegExp(String.raw`${N}\s*(?:as|in)\s*(?:a\s*)?(?:%|percent)\s*(?:of|de|von)\s*${N}`, "i").exec(text);
  if (m) {
    const part = num(m[1]); const whole = num(m[2]);
    if (!finite(whole, part) || whole === 0) return null;
    return program("percent-ratio", "percentage", "part / whole * 100", { part, whole }, `${lit(part)} / ${lit(whole)} * 100`, 0.92, ["shape:is-what-percent"], { unit: "%" });
  }
  m = new RegExp(String.raw`${N}\s*(?:is|are|es|ist)\s*%\s*(?:of|de|von)\s*${N}`, "i").exec(text);
  if (m) {
    const part = num(m[1]); const whole = num(m[2]);
    if (!finite(whole, part) || whole === 0) return null;
    return program("percent-ratio", "percentage", "part / whole * 100", { part, whole }, `${lit(part)} / ${lit(whole)} * 100`, 0.9, ["shape:is-percent-of"], { unit: "%" });
  }
  // "100 minus 15 %" / "100 plus 15 %" — a percentage of the first number.
  m = new RegExp(String.raw`^\s*${N}\s*([-+])\s*${N}\s*%\s*$`).exec(text);
  if (m) {
    const amount = num(m[1]); const percent = num(m[3]);
    if (!finite(percent, amount)) return null;
    return m[2] === "-"
      ? program("percent-decrease", "percentage", "amount * (1 - p/100)", { amount, p: percent }, `${lit(amount)} * (1 - ${pct(percent)})`, 0.9, ["shape:minus-percent"])
      : program("percent-increase", "percentage", "amount * (1 + p/100)", { amount, p: percent }, `${lit(amount)} * (1 + ${pct(percent)})`, 0.9, ["shape:plus-percent"]);
  }
  // "percentage change from 50 to 75" / "from 50 to 75 in percent" / "50 to 75 percent change"
  m = new RegExp(String.raw`(?:from|de|von)\s*${N}\s*(?:to|a|bis|zu|→)\s*${N}`, "i").exec(text);
  if (m && /\b(?:change|difference|increase|decrease|growth|variation|cambio|variacion|evolution|veranderung|anderung)\b/i.test(text) && /%|percent/i.test(text)) {
    const from = num(m[1]); const to = num(m[2]);
    if (!finite(from, to) || from === 0) return null;
    return program("percent-change", "percentage", "(to - from) / abs(from) * 100", { from, to }, `(${lit(to)} - ${lit(from)}) / abs(${lit(from)}) * 100`, 0.93, ["shape:percent-change"], { preset: "percentage-change", unit: "%" });
  }
  // "15 % of 240" / "15 percent of 240"
  m = new RegExp(String.raw`${N}\s*%\s*(?:of|de|von|du|des)\s*${N}`, "i").exec(text);
  if (m) {
    const percent = num(m[1]); const amount = num(m[2]);
    if (!finite(percent, amount)) return null;
    return program("percent-of", "percentage", "amount * p/100", { amount, p: percent }, `${lit(amount)} * ${pct(percent)}`, 0.94, ["shape:percent-of"]);
  }
  return null;
};

const bmi: Generator = (text) => {
  if (!/\b(?:bmi|body mass index|indice de masa corporal|imc|body-mass)\b/i.test(text)) return null;
  const kg = pick(text, /(\d+(?:\.\d+)?)\s*(?:kg|kilos?|kilograms?|kilogramos?|kilogrammes?)/i);
  const lb = kg === null ? pick(text, /(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)/i) : null;
  const cm = pick(text, /(\d+(?:\.\d+)?)\s*(?:cm|centimet(?:er|re)s?|centimetros?)/i);
  const m = cm === null ? pick(text, /(\d+(?:\.\d+)?)\s*(?:m|meters?|metres?|metros?)\b/i) : null;
  const ft = cm === null && m === null ? pick(text, /(\d+)\s*(?:ft|feet|foot)/i) : null;
  const inch = ft !== null ? pick(text, /(\d+(?:\.\d+)?)\s*(?:in|inch(?:es)?)\b/i) ?? 0 : null;
  const massKg = kg ?? (lb !== null ? lb * 0.45359237 : null);
  const heightM = cm !== null ? cm / 100 : m !== null ? m : ft !== null ? (ft * 12 + (inch ?? 0)) * 0.0254 : null;
  if (massKg === null || heightM === null || !finite(massKg, heightM) || heightM <= 0) return null;
  return program("bmi", "everyday", "mass / height^2", { mass: massKg, height: heightM }, `${lit(massKg)} / ${lit(heightM)}^2`, 0.93, ["slots:mass+height"]);
};

const geometry: Generator = (text) => {
  const r = pick(text, /(?:radius|radio|rayon|radius)\s*(?:of|de|von|is|=)?\s*(\d+(?:\.\d+)?)/i) ?? pick(text, /(\d+(?:\.\d+)?)\s*(?:radius|radio|rayon)/i);
  const d = pick(text, /(?:diameter|diametro|diametre|durchmesser)\s*(?:of|de|von|is|=)?\s*(\d+(?:\.\d+)?)/i);
  const radius = r ?? (d !== null ? d / 2 : null);
  if (/\b(?:circle|circulo|cercle|kreis|圆)\b/i.test(text) && radius !== null && finite(radius)) {
    if (/\b(?:circumference|perimeter|perimetro|circonference|umfang|周长)\b/i.test(text)) {
      return program("circle-circumference", "geometry", "2 * pi * r", { r: radius }, `2 * pi * ${lit(radius)}`, 0.93, ["shape:circle", "slot:radius"]);
    }
    return program("circle-area", "geometry", "pi * r^2", { r: radius }, `pi * ${lit(radius)}^2`, 0.93, ["shape:circle", "slot:radius"], { preset: "circle-area" });
  }
  if (/\b(?:sphere|esfera|kugel|球)\b/i.test(text) && radius !== null && finite(radius)) {
    return /\b(?:surface|area)\b/i.test(text)
      ? program("sphere-surface", "geometry", "4 * pi * r^2", { r: radius }, `4 * pi * ${lit(radius)}^2`, 0.92, ["shape:sphere"])
      : program("sphere-volume", "geometry", "4/3 * pi * r^3", { r: radius }, `4/3 * pi * ${lit(radius)}^3`, 0.92, ["shape:sphere"]);
  }
  const numbers = allNumbers(text);
  if (/\b(?:rectangle|rectangulo|rechteck|矩形)\b/i.test(text) && numbers.length >= 2) {
    const [a, b] = numbers;
    return /\b(?:perimeter|perimetro|umfang)\b/i.test(text)
      ? program("rectangle-perimeter", "geometry", "2 * (a + b)", { a, b }, `2 * (${lit(a)} + ${lit(b)})`, 0.9, ["shape:rectangle"])
      : program("rectangle-area", "geometry", "a * b", { a, b }, `${lit(a)} * ${lit(b)}`, 0.9, ["shape:rectangle"]);
  }
  if (/\b(?:triangle|triangulo|dreieck|三角形)\b/i.test(text) && /\b(?:area|area|flache|面积)\b/i.test(text) && numbers.length >= 2) {
    const [b, h] = numbers;
    return program("triangle-area", "geometry", "b * h / 2", { b, h }, `${lit(b)} * ${lit(h)} / 2`, 0.9, ["shape:triangle"]);
  }
  if (/\b(?:hypotenuse|pythagor(?:as|ean)|hipotenusa|hypothenuse)\b/i.test(text) && numbers.length >= 2) {
    const [a, b] = numbers;
    return program("hypotenuse", "geometry", "sqrt(a^2 + b^2)", { a, b }, `sqrt(${lit(a)}^2 + ${lit(b)}^2)`, 0.92, ["shape:right-triangle"]);
  }
  if (/\b(?:cube|cubo|wurfel)\b/i.test(text) && /\bvolume\b/i.test(text) && numbers.length >= 1) {
    const [a] = numbers;
    return program("cube-volume", "geometry", "a^3", { a }, `${lit(a)}^3`, 0.9, ["shape:cube"]);
  }
  if (/\b(?:cylinder|cilindro|zylinder)\b/i.test(text) && radius !== null) {
    const h = pick(text, /(?:height|altura|hauteur|hohe)\s*(?:of|de|is|=)?\s*(\d+(?:\.\d+)?)/i) ?? numbers.find((value) => value !== radius && value !== d) ?? null;
    if (h !== null && finite(h)) return program("cylinder-volume", "geometry", "pi * r^2 * h", { r: radius, h }, `pi * ${lit(radius)}^2 * ${lit(h)}`, 0.9, ["shape:cylinder"]);
  }
  return null;
};

const everyday: Generator = (text) => {
  // speed / distance / time
  const distance = pick(text, /(\d+(?:\.\d+)?)\s*(?:km|kilomet(?:er|re)s?|miles?|mi|metres?|meters?)\b/i);
  const hours = pick(text, /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i);
  const minutes = pick(text, /(\d+(?:\.\d+)?)\s*(?:minutes?|mins?)\b/i);
  const time = hours !== null || minutes !== null ? (hours ?? 0) + (minutes ?? 0) / 60 : null;
  if (/\b(?:average speed|speed|velocity|velocidad|vitesse|geschwindigkeit)\b/i.test(text) && distance !== null && time !== null && time > 0) {
    return program("average-speed", "everyday", "distance / time", { distance, time }, `${lit(distance)} / ${lit(time)}`, 0.9, ["slots:distance+time"]);
  }
  if (/\b(?:pace|ritmo|allure|tempo)\b/i.test(text) && distance !== null && time !== null && distance > 0) {
    const mins = time * 60;
    return program("pace", "everyday", "minutes / distance", { minutes: mins, distance }, `${lit(mins)} / ${lit(distance)}`, 0.9, ["slots:time+distance"], { preset: "pace", unit: " min per unit" });
  }
  if (/\b(?:how long|time (?:to|it takes|needed)|travel time|duration)\b/i.test(text) && distance !== null) {
    const speed = pick(text, /(?:at|@)\s*(\d+(?:\.\d+)?)/i) ?? pick(text, /(\d+(?:\.\d+)?)\s*(?:km\/h|kph|mph|kmh)/i);
    if (speed !== null && speed > 0) return program("travel-time", "everyday", "distance / speed", { distance, speed }, `${lit(distance)} / ${lit(speed)}`, 0.88, ["slots:distance+speed"], { unit: " h" });
  }
  // fuel cost: distance, consumption per 100, price per litre
  if (/\b(?:fuel|petrol|gas(?:oline)?|diesel|combustible|gasolina|carburant|benzin|kraftstoff)\b/i.test(text) && distance !== null) {
    const use = pick(text, /(\d+(?:\.\d+)?)\s*(?:l|litres?|liters?)\s*(?:per|\/|every|por|pour|pro)\s*100/i) ?? pick(text, /(\d+(?:\.\d+)?)\s*(?:l\/100|litres? per hundred)/i);
    const price = pick(text, /(?:at|@|price(?: of)?|costs?|a|por|pour)\s*(\d+(?:\.\d+)?)\s*(?:per|a|\/|each)?\s*(?:lit(?:er|re)|l)\b/i) ?? pick(text, /(\d+(?:\.\d+)?)\s*(?:per|a|\/)\s*(?:lit(?:er|re)|l)\b/i);
    if (use !== null && price !== null) {
      return program("fuel-cost", "finance", "distance * use / 100 * price", { distance, use, price }, `${lit(distance)} * ${lit(use)} / 100 * ${lit(price)}`, 0.9, ["slots:distance+consumption+price"], { preset: "fuel-estimate" });
    }
  }
  return null;
};

const statistics: Generator = (text) => {
  const m = /\b(average|mean|median|sum|total|add up|minimum|smallest|lowest|min|maximum|largest|highest|biggest|max|standard deviation|std|variance|product|range|promedio|media|mediana|suma|minimo|maximo|moyenne|mediane|somme|durchschnitt|mittelwert|summe|平均|总和)\b(?:\s+(?:of|de|von|between|des))?\s*(.*)$/i.exec(text);
  if (!m) return null;
  const word = m[1].toLowerCase();
  const list = allNumbers(m[2]);
  // "sum of 1 to 100" / "numbers from 1 to 100"
  const range = new RegExp(String.raw`(?:from\s*)?${N}\s*(?:to|through|up to|a|bis|hasta|jusqu'a)\s*${N}`, "i").exec(m[2]);
  if (range && (word === "sum" || word === "total" || word === "add up" || word === "suma" || word === "somme" || word === "summe")) {
    const a = num(range[1]); const b = num(range[2]);
    if (!finite(a, b) || !Number.isInteger(a) || !Number.isInteger(b) || b < a) return null;
    return program("series-sum", "statistics", "n*(a+b)/2", { a, b, n: b - a + 1 }, `${lit(b - a + 1)} * (${lit(a)} + ${lit(b)}) / 2`, 0.9, ["shape:arithmetic-series"]);
  }
  if (list.length < 2 || list.length > 100) return null;
  const fn = /average|mean|promedio|media$|moyenne|durchschnitt|mittelwert|平均/.test(word) ? "mean"
    : /median|mediana|mediane/.test(word) ? "median"
      : /sum|total|add up|suma|somme|summe|总和/.test(word) ? "sum"
        : /min|smallest|lowest|minimo/.test(word) ? "min"
          : /max|largest|highest|biggest|maximo/.test(word) ? "max"
            : /standard|std/.test(word) ? "std"
              : /variance/.test(word) ? "variance"
                : /product/.test(word) ? "prod"
                  : /range/.test(word) ? "range" : null;
  if (!fn) return null;
  const values = `[${list.map(lit).join(", ")}]`;
  const code = fn === "range" ? `max(${values}) - min(${values})` : `${fn}(${values})`;
  return program(fn === "mean" ? "average" : fn === "prod" ? "product" : fn, "statistics", fn === "range" ? "max(values) - min(values)" : `${fn}(values)`, Object.fromEntries(list.map((value, index) => [`x${index + 1}`, value])), code, 0.92, [`values:${list.length}`]);
};

/** Named functions: "square root of 144", "factorial of 6", "log of 1000", "sine of 30 degrees". */
const functions: Generator = (text) => {
  // factorial: "factorial of 6", "6 factorial", "6!"
  let m = new RegExp(String.raw`(?:factorial(?: of)?\s*${N}|${N}\s*(?:factorial|!))`, "i").exec(text);
  if (m) {
    const n = num(m[1] ?? m[2]);
    if (!Number.isInteger(n) || n < 0 || n > 170) return null;
    return program("factorial", "function", "n!", { n }, `factorial(${lit(n)})`, 0.95, ["function:factorial"]);
  }
  // nth root: "fourth root of 81", "5th root of 32"
  m = new RegExp(String.raw`(?:(\d+)(?:st|nd|rd|th)|(square|cube|fourth|fifth|sixth)) root of\s*${N}`, "i").exec(text);
  if (m) {
    const degree = m[1] ? num(m[1]) : { square: 2, cube: 3, fourth: 4, fifth: 5, sixth: 6 }[m[2].toLowerCase()] ?? 2;
    const x = num(m[3]);
    if (!finite(x) || degree < 2 || degree > 64) return null;
    const code = degree === 2 ? `sqrt(${lit(x)})` : degree === 3 ? `cbrt(${lit(x)})` : `nthRoot(${lit(x)}, ${degree})`;
    return program("root", "function", degree === 2 ? "sqrt(x)" : `nthRoot(x, ${degree})`, { x, n: degree }, code, 0.95, ["function:root"]);
  }
  // "log base 2 of 1024"
  m = new RegExp(String.raw`log(?:arithm)?\s*(?:base|in base|to base)\s*${N}\s*(?:of|de|von)\s*${N}`, "i").exec(text);
  if (m) {
    const base = num(m[1]); const x = num(m[2]);
    if (!finite(base, x) || base <= 0 || base === 1 || x <= 0) return null;
    return program("logarithm", "function", "log(x, base)", { x, base }, `log(${lit(x)}, ${lit(base)})`, 0.94, ["function:log-base"]);
  }
  // generic "<fn> of <expr>" / "<fn> <number>"
  for (const [pattern, fn] of FUNCTION_WORDS) {
    const re = new RegExp(String.raw`${pattern.source}\s*(?:of|de|von|du)?\s*\(?\s*${N}\s*\)?\s*(degrees?|deg|grados|degres|grad|°|radians?|rad)?`, "i");
    const hit = re.exec(text);
    if (!hit) continue;
    const x = num(hit[1]);
    if (!finite(x)) return null;
    if (fn === "sqrt" && x < 0) return null;
    if ((fn === "log" || fn === "log10" || fn === "log2") && x <= 0) return null;
    const angular = DEGREE_FUNCTIONS.has(fn);
    const radians = /^rad/i.test(hit[2] ?? "");
    const argument = angular && !radians ? `${lit(x)} deg` : lit(x);
    const code = `${fn}(${argument})`;
    const rest = text.replace(hit[0], " ").trim();
    // Something like "square root of 144 plus 5" — hand the remainder to arithmetic.
    const tail = /^[-+*/^%()\d.\s]+$/.test(rest) && /[-+*/^]/.test(rest) ? rest : "";
    const expression = tail ? `${code} ${tail}`.replace(/\s+/g, " ").trim() : code;
    const test = safeEvaluate(expression);
    if (!test.ok) return null;
    return program(fn, "function", `${fn}(x)`, { x }, expression, 0.93, [`function:${fn}`, angular && !radians ? "angle:degrees" : "angle:plain"]);
  }
  return null;
};

/** Quantifier words: half of, double, a third of, a quarter of, twice, triple. */
const quantifiers: Generator = (text) => {
  const m = new RegExp(String.raw`\b(half|a third|one third|a quarter|one quarter|a fifth|a tenth|double|twice|triple|three times|quadruple|la mitad|el doble|el triple|la moitie|le double|die halfte|das doppelte)\s*(?:of|de|von)?\s*${N}`, "i").exec(text);
  if (!m) return null;
  const x = num(m[2]);
  if (!finite(x)) return null;
  const word = m[1].toLowerCase();
  const factor = /half|mitad|moitie|halfte/.test(word) ? "/ 2"
    : /third/.test(word) ? "/ 3"
      : /quarter/.test(word) ? "/ 4"
        : /fifth/.test(word) ? "/ 5"
          : /tenth/.test(word) ? "/ 10"
            : /double|twice|doble|doppelte/.test(word) ? "* 2"
              : /triple|three times/.test(word) ? "* 3" : "* 4";
  return program("quantity", "arithmetic", `x ${factor}`, { x }, `${lit(x)} ${factor}`, 0.9, [`quantifier:${word}`]);
};

/** Any remaining pure arithmetic sentence: "12 + 7", "2 ^ 10", "pi * 2", "(3 + 4) * 5". */
const arithmetic: Generator = (text) => {
  const body = text.replace(/\b(?:result|answer|value|of|the|is|what|whats)\b/gi, " ").replace(/\s+/g, " ").trim();
  if (!body) return null;
  // Strictly numbers, constants, operators and brackets — a single number is not a calculation.
  if (!/^[-+*/^%().\d\s]*(?:\b(?:pi|e|mod)\b[-+*/^%().\d\s]*)*$/i.test(body)) return null;
  if (!/[-+*/^%]|\bmod\b/.test(body.replace(/^[-+]/, ""))) return null;
  if (!/\d|\bpi\b|\be\b/.test(body)) return null;
  // A percent sign is only a postfix "/100"; "20 % 80" is not a sum.
  const code = body.replace(/(\d)\s*%\s*(?=$|[-+*/)])/g, "$1 / 100").replace(/\s+/g, " ").trim();
  if (code.includes("%")) return null;
  const test = safeEvaluate(code);
  if (!test.ok) return null;
  return program("arithmetic", "arithmetic", "expression", {}, code, 0.9, ["shape:arithmetic"]);
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function pick(text: string, pattern: RegExp): number | null {
  const match = pattern.exec(text);
  if (!match) return null;
  const value = num(match[1]);
  return Number.isFinite(value) ? value : null;
}

function allNumbers(text: string): number[] {
  return Array.from(text.matchAll(new RegExp(NUMBER, "g"))).map((item) => num(item[0])).filter((value) => Number.isFinite(value));
}

function firstNumberExcept(text: string, taken: Array<number | null>): number | null {
  const exclude = new Set(taken.filter((value): value is number => value !== null));
  for (const value of allNumbers(text)) {
    if (exclude.has(value)) { exclude.delete(value); continue; }
    return value;
  }
  return null;
}

const GENERATORS: Generator[] = [
  loanPayment, compoundInterest, simpleInterest, savingsGoal, inflationAdjusted, effectiveRate, ruleOf72,
  tipAndSplit, bmi, percentages, geometry, everyday, statistics, functions, quantifiers, arithmetic,
];

/**
 * Generate code for a spoken request. Returns null when the sentence is not a
 * calculation this engine knows how to write. Generated code is executed once
 * here as a self-test, so a program that cannot run never reaches the IR.
 */
export function generateCode(input: string): GeneratedProgram | null {
  if (!input || input.length > 400) return null;
  const text = prepareSpokenMath(input);
  if (!text) return null;
  for (const generator of GENERATORS) {
    let generated: GeneratedProgram | null = null;
    try {
      generated = generator(text, input);
    } catch {
      generated = null;
    }
    if (!generated) continue;
    const check = safeEvaluate(generated.code);
    if (!check.ok) continue;
    return generated;
  }
  return null;
}

/** Human-readable label for a generated capability's result. */
export function describeGenerated(capability: string, result: string, unit = ""): string {
  const value = `${result}${unit}`;
  switch (capability) {
    case "loan-payment": return `Monthly payment: ${value}`;
    case "compound-interest": return `Future value: ${value}`;
    case "simple-interest": return `Interest earned: ${value}`;
    case "savings-goal": return `Monthly deposit needed: ${value}`;
    case "inflation-adjusted": return `In today's money: ${value}`;
    case "effective-annual-rate": return `Effective annual rate: ${value}`;
    case "rule-of-72": return `Time to double: about ${value}`;
    case "tip": return `Tip: ${value}`;
    case "bill-split": return `Each person pays: ${value}`;
    case "discount": return `Price after discount: ${value}`;
    case "vat-add": return `Including tax: ${value}`;
    case "vat-remove": return `Before tax: ${value}`;
    case "percent-increase": return `After the increase: ${value}`;
    case "percent-decrease": return `After the decrease: ${value}`;
    case "percent-ratio": return `That is ${value}`;
    case "percent-change": return `Percentage change: ${value}`;
    case "percent-of": return `Result: ${value}`;
    case "bmi": return `BMI: ${value}`;
    case "circle-area": return `Circle area: ${value}`;
    case "circle-circumference": return `Circumference: ${value}`;
    case "sphere-volume": return `Sphere volume: ${value}`;
    case "sphere-surface": return `Sphere surface area: ${value}`;
    case "rectangle-area": return `Rectangle area: ${value}`;
    case "rectangle-perimeter": return `Rectangle perimeter: ${value}`;
    case "triangle-area": return `Triangle area: ${value}`;
    case "hypotenuse": return `Hypotenuse: ${value}`;
    case "cube-volume": return `Cube volume: ${value}`;
    case "cylinder-volume": return `Cylinder volume: ${value}`;
    case "average-speed": return `Average speed: ${value} per hour`;
    case "pace": return `Pace: ${value}`;
    case "travel-time": return `Travel time: ${value}`;
    case "fuel-cost": return `Fuel cost: ${value}`;
    case "series-sum": return `Sum of the series: ${value}`;
    case "average": return `Average: ${value}`;
    case "median": return `Median: ${value}`;
    case "sum": return `Sum: ${value}`;
    case "min": return `Minimum: ${value}`;
    case "max": return `Maximum: ${value}`;
    case "std": return `Standard deviation: ${value}`;
    case "variance": return `Variance: ${value}`;
    case "product": return `Product: ${value}`;
    case "range": return `Range: ${value}`;
    case "factorial": return `Factorial: ${value}`;
    case "root": return `Root: ${value}`;
    case "logarithm": return `Logarithm: ${value}`;
    default: return `= ${value}`;
  }
}

/** Compact, human-readable rendering of the generated program for traces/logs. */
export function explainGenerated(generated: GeneratedProgram): string {
  const bindings = Object.entries(generated.bindings).map(([key, value]) => `${key} = ${lit(value)}`).join("; ");
  return bindings ? `${generated.template} with ${bindings} → ${generated.code}` : `${generated.template} → ${generated.code}`;
}

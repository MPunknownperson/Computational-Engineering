"use client";

import { EXPRESSION_PRESETS } from "@/lib/presets";
import { dropMemo, memo, readJson, writeJson } from "./runtime";
import { END, SequenceModel, START, UNKNOWN } from "./sequence";

/**
 * Predictive input for expressions (TensorFlow.js text generation).
 *
 * A small language model learns the *shape* of expressions from the site's own
 * formulas and from the expressions this visitor has calculated (kept only in
 * this browser). Numbers and variable names are abstracted to `<n>` / `<v>`,
 * so the model learns structure ("a function is followed by a value and a
 * closing bracket") and the names are filled in from the variables actually
 * defined in the tool.
 */
export interface ExprSuggestion {
  kind: "next" | "complete";
  label: string;
  /** Number of trailing characters of the current input this suggestion replaces. */
  replace: number;
  insert: string;
}

const CONSTANTS = new Set(["pi", "e", "tau", "phi"]);
const FUNCTIONS = [
  "sin", "cos", "tan", "asin", "acos", "atan", "sqrt", "cbrt", "log", "log10", "log2", "exp", "abs", "round", "floor",
  "ceil", "factorial", "hypot", "min", "max", "mean", "median", "std", "det", "inv", "lusolve", "pow", "sign",
];
const BUILTIN = [
  "sin(pi/4)^2 + cos(pi/4)^2", "sqrt(x^2 + y^2)", "log(x) / log(10)", "(a + b) * (a - b)", "x^2 + 2*x + 1",
  "sin(x) * cos(x)", "abs(x - y)", "exp(-x^2)", "factorial(n) / (factorial(k) * factorial(n - k))",
  "round(x * 100) / 100", "2 * pi * r", "(x + y) / 2", "sqrt(sum / n)", "a * x^2 + b * x + c", "1 / (1 + exp(-x))",
  "sin(x)^2 + cos(x)^2", "max(a, b) - min(a, b)", "(a * b) / (a + b)", "x * (1 + r)^n", "log2(x) * 3", "tan(x) / x",
];

interface Token { text: string; token: string; start: number; end: number }

export function tokenizeExpression(source: string): Token[] {
  const found: Token[] = [];
  const pattern = /([A-Za-z_][A-Za-z0-9_]*\(?|\d+(?:\.\d+)?(?:e[+-]?\d+)?|\.\d+|\S)/g;
  for (const match of source.matchAll(pattern)) {
    const text = match[0];
    let token: string;
    if (/^[\d.]/.test(text)) token = "<n>";
    else if (/^[A-Za-z_]/.test(text)) {
      token = text.endsWith("(") ? text.toLowerCase() : CONSTANTS.has(text.toLowerCase()) ? text.toLowerCase() : "<v>";
    } else token = text;
    found.push({ text, token, start: match.index ?? 0, end: (match.index ?? 0) + text.length });
  }
  return found;
}

interface Remembered { expression: string; t: number }
const MAX_EXPRESSIONS = 60;

/** Learn from an expression the visitor actually calculated (local only). */
export function recordExpression(expression: string) {
  const clean = expression.trim();
  if (clean.length < 3 || clean.length > 160) return;
  const list = readJson<Remembered[]>("expr", []).filter((item) => item.expression !== clean);
  list.unshift({ expression: clean, t: Date.now() });
  writeJson("expr", list.slice(0, MAX_EXPRESSIONS));
  dropMemo("expr:");
}

function sequences(): string[][] {
  const out: string[][] = [];
  const add = (expression: string, times = 1) => {
    const tokens = tokenizeExpression(expression).map((item) => item.token);
    if (tokens.length === 0) return;
    for (let count = 0; count < times; count += 1) out.push(tokens);
  };
  for (const preset of EXPRESSION_PRESETS) add(preset.expression, 2);
  for (const expression of BUILTIN) add(expression, 2);
  for (const name of FUNCTIONS) { add(`${name}(x)`); add(`${name}(2 * x)`); }
  const learned = readJson<Remembered[]>("expr", []);
  for (const item of Array.isArray(learned) ? learned : []) add(item.expression, 3);
  return out;
}

function model(): Promise<SequenceModel | null> {
  const learned = readJson<Remembered[]>("expr", []);
  return memo(`expr:${Array.isArray(learned) ? learned.length : 0}:${learned[0]?.t ?? 0}`, () => SequenceModel.create("expr", sequences()));
}

const BINARY = new Set(["+", "-", "*", "/", "="]);

function render(tokens: string[], before: string): string {
  let out = "";
  for (const token of tokens) {
    if (BINARY.has(token)) {
      const lead = out === "" ? (before === "" || /\s$/.test(before) ? "" : " ") : " ";
      out += `${lead}${token} `;
    } else if (token === ",") out += ", ";
    else out += token;
  }
  return out;
}

/** Predicted next input and a generated completion for the text typed so far. */
export async function suggestExpression(expression: string, variables: string[]): Promise<ExprSuggestion[]> {
  if (expression.length > 160) return [];
  const net = await model();
  if (!net) return [];
  const tokens = tokenizeExpression(expression);
  const last = tokens.at(-1);
  const typedAtEnd = last && last.end === expression.length;
  const partial = typedAtEnd && /^[A-Za-z_][A-Za-z0-9_]*$/.test(last.text) ? last : null;
  const context = (partial ? tokens.slice(0, -1) : tokens).map((item) => item.token);
  const used = new Set(tokens.filter((item) => item.token === "<v>").map((item) => item.text));
  const free = variables.filter((name) => !used.has(name));
  const pool = free.length ? free : variables;
  const prefix = partial?.text.toLowerCase() ?? "";
  const replace = partial ? partial.text.length : 0;
  const before = expression.slice(0, expression.length - replace);

  const probabilities = net.probabilities(context);
  const candidates: Array<{ text: string; p: number }> = [];
  net.vocab.forEach((token, index) => {
    const p = probabilities[index];
    if ([START, END, UNKNOWN, "<n>"].includes(token)) return;
    if (token === "<v>") {
      pool.filter((name) => name.toLowerCase().startsWith(prefix) && name !== partial?.text).slice(0, 3)
        .forEach((name, rank) => candidates.push({ text: name, p: p * (0.9 - rank * 0.1) }));
      return;
    }
    if (prefix && (!token.startsWith(prefix) || token === prefix)) return;
    candidates.push({ text: token, p });
  });
  // While a word is half-typed, compare only the words it could become.
  const mass = prefix ? candidates.reduce((total, item) => total + item.p, 0) || 1 : 1;
  const floor = prefix ? 0.08 : 0.04;
  const ranked = candidates.map((item) => ({ ...item, p: item.p / mass })).filter((item) => item.p >= floor);
  ranked.sort((a, b) => b.p - a.p);

  const out: ExprSuggestion[] = [];
  for (const candidate of ranked.slice(0, 4)) {
    out.push({ kind: "next", label: candidate.text.trim(), replace, insert: render([candidate.text], before) });
  }

  if (tokens.length > 0 && out.length > 0) {
    const first = out[0].insert.trim();
    const seed = [...context, ...(first ? tokenizeExpression(first).map((item) => item.token) : [])];
    const claimed = new Set(used);
    const concrete: string[] = first ? [first] : [];
    if (first && variables.includes(first)) claimed.add(first);
    let stop = false;
    const generated = net.generate(seed, 10, 0.3);
    for (const token of generated) {
      if (stop) break;
      if (token === "<n>") { stop = true; break; }
      if (token === "<v>") {
        const name = pool.find((item) => !claimed.has(item));
        if (!name) { stop = true; break; }
        claimed.add(name);
        concrete.push(name);
      } else concrete.push(token);
    }
    let text = render(concrete, before);
    const opens = (before + text).split("(").length - (before + text).split(")").length;
    if (opens > 0 && !stop) text += ")".repeat(opens);
    if (concrete.length >= 3 && !stop && text.trim() !== out[0].insert.trim()) {
      out.push({ kind: "complete", label: `${text.trim()}`, replace, insert: text.trimEnd() });
    }
  }
  return out.filter((item, index, list) => list.findIndex((other) => other.insert === item.insert && other.kind === item.kind) === index);
}

export function applySuggestion(expression: string, suggestion: ExprSuggestion): string {
  return expression.slice(0, expression.length - suggestion.replace) + suggestion.insert;
}

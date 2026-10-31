"use client";

import { SEARCH_PAGES } from "@/lib/search-pages";
import { TextClassifier, type Example } from "./classifier";
import { dropMemo, memo, readJson, writeJson } from "./runtime";

/**
 * On-device voice-command understanding (TensorFlow.js).
 *
 * The deterministic grammar in `lib/voice` stays the first and authoritative
 * reader of a spoken command. When it cannot make sense of what the speech
 * recogniser returned, this classifier reads the same text and proposes the
 * closest site tool. It is trained from the site's own tool vocabulary plus
 * the phrases THIS visitor has used (kept only in this browser), so it adapts
 * to their wording and to how their microphone is mis-heard.
 */
export interface DestinationGuess {
  path: string;
  label: string;
  probability: number;
}

const DESTINATIONS: Record<string, string> = {
  "/tools/units": "Unit converter",
  "/tools/currency": "Currency converter",
  "/tools/formula": "Formula tool",
  "/tools/scientific": "Scientific calculator",
  "/tools/calculator": "Calculator",
  "/tools/crypto": "Digital-asset prices",
  "/tools/economy": "Economic indicators",
  "/guides": "Guides",
  "/reference": "Reference tables",
};

const SEEDS: Record<string, string[]> = {
  "/tools/units": [
    "convert kilograms to pounds", "how many miles in a kilometer", "celsius to fahrenheit", "convert units",
    "how tall is 180 centimeters in feet", "liters to gallons", "change inches to centimeters", "how heavy is 70 kilos in pounds",
    "temperature conversion", "convert 5 miles to km", "square feet to square meters", "megabytes to gigabytes",
    "speed kilometers per hour to miles per hour", "length converter", "weight converter", "volume converter",
    "how many ounces in a pound", "convert meters to feet", "what is 30 degrees celsius in fahrenheit", "data size converter",
    "measurement conversion", "metric to imperial", "how long is a marathon in miles",
    "selsius to farenheit", "celcius to fahrenheit", "centigrade conversion", "kilo grams to pound", "mile to kilometre",
  ],
  "/tools/currency": [
    "convert dollars to euros", "exchange rate", "usd to eur", "how much is 100 pounds in dollars", "currency converter",
    "yen to dollars", "euro exchange rate today", "convert money to another currency", "foreign exchange rate",
    "swiss franc to dollar", "canadian dollars", "how many pesos for a dollar", "exchange rate history",
    "what is the dollar worth", "travel money conversion", "rupees to pounds",
  ],
  "/tools/formula": [
    "loan payment", "monthly mortgage payment", "compound interest", "tip split", "split the bill", "write my own formula",
    "save a formula", "my saved formulas", "circle area formula", "fuel cost estimate", "savings goal", "break even point",
    "percentage change", "inflation adjusted value", "quadratic formula", "pace per kilometer", "heat energy formula",
    "custom formula with variables", "how much interest will I pay", "monthly deposit to reach a goal",
  ],
  "/tools/scientific": [
    "scientific calculator", "sine of forty five degrees", "square root", "logarithm", "derivative of x squared",
    "integral of a function", "matrix determinant", "solve linear equations", "trigonometry", "factorial", "natural log",
    "limits and calculus", "evaluate an expression", "complex numbers", "standard deviation", "advanced maths",
  ],
  "/tools/calculator": [
    "calculator", "basic calculator", "add numbers", "simple math", "plus minus times divide", "chalkboard calculator",
    "quick sum", "draw on the board", "do some arithmetic", "multiply two numbers", "percent of a number", "just a calculator",
    "show me the chalkboard", "open the board", "whiteboard calculator", "sketch and calculate",
  ],
  "/tools/crypto": [
    "bitcoin price", "ethereum price", "crypto prices", "digital asset market", "how much is btc", "solana price",
    "coin market cap", "cryptocurrency market", "what is bitcoin worth", "altcoin prices",
  ],
  "/tools/economy": [
    "inflation rate", "gdp per capita", "unemployment rate", "economic indicators", "country economy data",
    "world bank statistics", "consumer price index", "population growth", "interest rates by country", "us economy",
    "how is the economy doing", "economic growth of japan",
  ],
  "/guides": [
    "guides", "how to guide", "learn how", "tutorial", "read an article", "explain how to calculate", "help me learn",
    "step by step guide", "teach me", "what is the difference between", "open a guide", "i want to read about",
  ],
  "/reference": [
    "reference tables", "constants", "formulas reference", "lookup table", "unit definitions", "conversion tables",
    "glossary", "cheat sheet", "physical constants", "look something up",
  ],
};

interface Outcome { text: string; path: string; t: number }
const MAX_OUTCOMES = 160;

/** Map any site href onto one of the classifier's destinations. */
export function destinationFor(href: string): string | null {
  const path = href.split(/[?#]/)[0];
  if (path in DESTINATIONS) return path;
  if (path.startsWith("/convert")) return "/tools/units";
  if (path.startsWith("/calculate")) return "/tools/formula";
  if (path.startsWith("/guides")) return "/guides";
  if (path.startsWith("/reference")) return "/reference";
  return null;
}

/** Remember which tool a phrase ended up opening, on this device only. */
export function recordVoiceOutcome(text: string, href: string) {
  const path = destinationFor(href);
  const clean = text.trim().slice(0, 120);
  if (!path || clean.length < 2) return;
  const outcomes = readJson<Outcome[]>("voice", []).filter((item) => item.text !== clean);
  outcomes.unshift({ text: clean, path, t: Date.now() });
  writeJson("voice", outcomes.slice(0, MAX_OUTCOMES));
  dropMemo("intent:");
}

function examples(): Example[] {
  const list: Example[] = [];
  for (const [path, phrases] of Object.entries(SEEDS)) for (const text of phrases) list.push({ text, label: path });
  for (const page of SEARCH_PAGES) {
    if (page.path in SEEDS && page.path !== "/guides") {
      list.push({ text: page.label, label: page.path }, { text: page.title, label: page.path });
    }
  }
  const learned = readJson<Outcome[]>("voice", []);
  for (const item of Array.isArray(learned) ? learned : []) {
    if (item.path in DESTINATIONS) list.push({ text: item.text, label: item.path, weight: 3 });
  }
  return list;
}

function classifier(): Promise<TextClassifier | null> {
  const learned = readJson<Outcome[]>("voice", []);
  const key = `intent:${Array.isArray(learned) ? learned.length : 0}:${learned[0]?.t ?? 0}`;
  return memo(key, () => TextClassifier.create("intent", examples()));
}

/**
 * Best on-device guess across the recogniser's hypotheses, or null when the
 * model is not confident enough — a wrong confident answer is worse than none.
 */
export async function guessDestination(hypotheses: string[]): Promise<DestinationGuess | null> {
  // A classifier always has a top class, including for unrelated everyday speech.
  // Require real tool vocabulary or a previously verified phrase before loading it.
  const ignored = new Set("a an the is are was what how much many in to for of on at by with from my me i you it this that another some just do open show read want learn about today".split(" "));
  const words = new Set(Object.values(SEEDS).flat().flatMap(text => text.toLowerCase().match(/[a-z]{2,}/g) ?? []).filter(word => !ignored.has(word)));
  const learned = readJson<Outcome[]>("voice", []);
  const relevant = hypotheses.slice(0, 5).filter(text =>
    (text.toLowerCase().match(/[a-z]{2,}/g) ?? []).some(word => words.has(word)) ||
    (Array.isArray(learned) && learned.some(item => item.text.toLowerCase() === text.trim().toLowerCase())),
  );
  if (!relevant.length) return null;
  const model = await classifier();
  if (!model) return null;
  let best: DestinationGuess | null = null;
  let runnerUp = 0;
  relevant.forEach((text, rank) => {
    const [first, second] = model.predict(text);
    if (!first) return;
    const adjusted = first.probability - rank * 0.03;
    if (!best || adjusted > best.probability) {
      best = { path: first.label, label: DESTINATIONS[first.label] ?? first.label, probability: adjusted };
      runnerUp = second?.probability ?? 0;
    }
  });
  const guess = best as DestinationGuess | null;
  if (!guess || guess.probability < 0.5 || guess.probability - runnerUp < 0.15) return null;
  return guess;
}

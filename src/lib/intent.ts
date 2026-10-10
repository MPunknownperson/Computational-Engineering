import { internalHref } from "./urls";
import { presetHref } from "./presets";

/**
 * Intent router: turns a spoken or typed phrase into the right prefilled tool.
 *
 * This replaces the site-wide search that was removed at the visitor's request:
 * the same text→destination matching is now used to power voice entry, so a
 * phrase like "70 kilos to pounds" opens the right converter rather than a
 * results list. Nothing is stored and no query is sent anywhere.
 */
export type IntentMatch = {
  href: string;
  label: string;
  description: string;
  confidence: "high" | "medium" | "low";
};

type Rule = {
  test: RegExp;
  href: string;
  label: string;
  description: string;
  confidence: IntentMatch["confidence"];
};

// Ordered: the first rule that matches wins. Longer, more specific patterns come
// first so "pounds to kilograms" is not shadowed by a generic "kilograms".
const RULES: Rule[] = [
  { test: /\b(kg|kilo|kilogram)[a-z]*\s*(to|in|into|as)?\s*(lbs?|pounds?)\b/i, href: internalHref("/tools/units", { category: "mass", from: "kg", to: "lb", value: "70" }), label: "Kilograms to pounds", description: "Mass converter, prefilled at 70 kg", confidence: "high" },
  { test: /\b(lbs?|pounds?)\s*(to|in|into|as)?\s*(kg|kilo|kilogram)[a-z]*\b/i, href: internalHref("/tools/units", { category: "mass", from: "lb", to: "kg", value: "10" }), label: "Pounds to kilograms", description: "Mass converter, prefilled at 10 lb", confidence: "high" },
  { test: /\b(cm|centimet[ae]r?e?s?)\s*(to|in|into|as)?\s*(in|inch|inches)\b/i, href: internalHref("/tools/units", { category: "length", from: "cm", to: "in", value: "100" }), label: "Centimeters to inches", description: "Length converter, prefilled at 100 cm", confidence: "high" },
  { test: /\b(in|inch|inches)\s*(to|in|into|as)?\s*(cm|centimet[ae]r?e?s?)\b/i, href: internalHref("/tools/units", { category: "length", from: "in", to: "cm", value: "10" }), label: "Inches to centimeters", description: "Length converter, prefilled at 10 in", confidence: "high" },
  { test: /\b(miles?|mi)\s*(to|in|into|as)?\s*(km|kilomet[ae]r?e?s?)\b/i, href: internalHref("/tools/units", { category: "length", from: "mi", to: "km", value: "5" }), label: "Miles to kilometers", description: "Distance converter, prefilled at 5 miles", confidence: "high" },
  { test: /\b(km|kilomet[ae]r?e?s?)\s*(to|in|into|as)?\s*(miles?|mi)\b/i, href: internalHref("/tools/units", { category: "length", from: "km", to: "mi", value: "5" }), label: "Kilometers to miles", description: "Distance converter, prefilled at 5 km", confidence: "high" },
  { test: /\b(lit[er]+s?|l)\s*(to|in|into|as)?\s*(gal|gallons?)\b/i, href: internalHref("/tools/units", { category: "volume", from: "l", to: "gal_us", value: "10" }), label: "Liters to gallons", description: "Volume converter, prefilled at 10 L", confidence: "high" },
  { test: /\b(sq|square)[ _-]?(feet|foot|ft)\s*(to|in|into|as)?\s*(m2|sqm|meters?|metres?)\b/i, href: internalHref("/tools/units", { category: "area", from: "ft2", to: "m2", value: "500" }), label: "Square feet to square meters", description: "Area converter, prefilled at 500 ft²", confidence: "high" },
  { test: /\b(km|kilomet[ae]r?e?|kilometers?)\s*(per hour|\/h|hour)\s*(to|in|into|as)?\s*(mph|miles per hour)\b/i, href: internalHref("/tools/units", { category: "speed", from: "km/h", to: "mph", value: "100" }), label: "km/h to mph", description: "Speed converter, prefilled at 100 km/h", confidence: "high" },
  { test: /\b(mb)\s*(to|in|into|as)?\s*(mib)\b/i, href: internalHref("/tools/units", { category: "data", from: "MB", to: "MiB", value: "500" }), label: "MB to MiB", description: "Data-size converter, prefilled at 500 MB", confidence: "high" },
  { test: /\b(celsius|c|centigrade)\s*(to|in|into|as)?\s*(fahrenheit|f)\b/i, href: internalHref("/tools/units", { category: "temperature", from: "C", to: "F", value: "20" }), label: "Celsius to Fahrenheit", description: "Temperature converter, prefilled at 20 °C", confidence: "high" },
  { test: /\b(fahrenheit|f)\s*(to|in|into|as)?\s*(celsius|c|centigrade)\b/i, href: internalHref("/tools/units", { category: "temperature", from: "F", to: "C", value: "68" }), label: "Fahrenheit to Celsius", description: "Temperature converter, prefilled at 68 °F", confidence: "high" },

  { test: /\b(loan|mortgage|repayment|monthly payment|emi)\b/i, href: presetHref("loan-payment"), label: "Loan payment calculator", description: "Formula tool, prefilled with a loan example", confidence: "high" },
  { test: /\b(tip|split.*(bill|check)|split the bill|restaurant)\b/i, href: presetHref("tip-split"), label: "Tip and bill split", description: "Formula tool, prefilled with a bill example", confidence: "high" },
  { test: /\b(quadratic|solve.*(equation)|roots? of)\b/i, href: presetHref("quadratic-root"), label: "Quadratic formula", description: "Formula tool, prefilled with a quadratic", confidence: "medium" },
  { test: /\b(compound|interest|growth|savings)\b/i, href: presetHref("compound-interest"), label: "Compound interest", description: "Formula tool, prefilled with a growth example", confidence: "medium" },
  { test: /\b(formula|equation|expression|maths|math)\b/i, href: "/tools/formula", label: "Formula tool", description: "Write an expression and its values", confidence: "low" },

  { test: /\b(inflation|cpi)\b/i, href: internalHref("/tools/economy", { country: "USA", indicator: "inflation" }), label: "Inflation rate", description: "Economic indicators, inflation", confidence: "high" },
  { test: /\b(gdp|income per person)\b/i, href: internalHref("/tools/economy", { country: "JPN", indicator: "gdp_per_capita" }), label: "GDP per person", description: "Economic indicators, GDP per capita", confidence: "medium" },
  { test: /\b(bitcoin|btc)\b/i, href: internalHref("/tools/crypto", { id: "bitcoin" }), label: "Bitcoin price", description: "Digital-asset market table", confidence: "high" },
  { test: /\b(crypto|ethereum|eth|solana)\b/i, href: "/tools/crypto", label: "Digital-asset prices", description: "Digital-asset market table", confidence: "medium" },
  { test: /\b(usd|dollars?)\s*(to|in|into|as)?\s*(eur|euros?)\b/i, href: internalHref("/tools/currency", { base: "USD", to: "EUR", amount: "100" }), label: "USD to EUR", description: "Currency converter, prefilled at 100 USD", confidence: "high" },
  { test: /\b(gbp|pounds sterling)\s*(to|in|into|as)?\s*(usd|dollars?)\b/i, href: internalHref("/tools/currency", { base: "GBP", to: "USD", amount: "100" }), label: "GBP to USD", description: "Currency converter, prefilled at 100 GBP", confidence: "high" },
  { test: /\b(currency|exchange rate|fx|euro|dollar)\b/i, href: "/tools/currency", label: "Currency converter", description: "Currency reference tool", confidence: "low" },

  { test: /\b(matrix|determinant|linear system|equations?)\b/i, href: presetHref("determinant", "scientific"), label: "Matrix operations", description: "Scientific calculator, matrix example", confidence: "medium" },
  { test: /\b(scientific|trig|sine|cosine|logarithm|square root|derivative|integral)\b/i, href: "/tools/scientific", label: "Scientific calculator", description: "Scientific expressions and analysis", confidence: "medium" },
  { test: /\b(convert|conversion|unit|units|weigh|height|distance|temperature)\b/i, href: "/tools/units", label: "Unit converter", description: "All unit conversions", confidence: "low" },
];

const AMOUNT = /\b(\d+(?:[.,]\d+)?)\s*(kg|kilo|kilogram|kilo[s]?|lb|lbs|pound|pounds|cm|centimet[ae]r?e?s?|mm|metre|meter|meters|miles?|mi|km|kilomet[ae]r?e?s?|litres?|liters?|l|gallons?|gal|feet|foot|ft|meters|metres|celsius|centigrade|fahrenheit|°c|°f)\b/gi;

/** Match a spoken or typed phrase against the known calculation intents. */
export function resolveIntent(input: string): IntentMatch | null {
  const text = input.trim();
  if (text.length < 2 || text.length > 200) return null;

  for (const rule of RULES) {
    if (!rule.test.test(text)) continue;
    return {
      href: withAmount(rule.href, text),
      label: rule.label,
      description: rule.description,
      confidence: rule.confidence,
    };
  }
  return null;
}

/** Pull a spoken amount/into the prefilled link where the URL supports it. */
function withAmount(href: string, spoken: string): string {
  const values: Record<string, string> = {};
  for (const match of spoken.matchAll(AMOUNT)) {
    const value = match[1].replace(",", ".");
    const unit = match[2].toLowerCase();
    if (unit.startsWith("kg") || unit.startsWith("kilo")) values.mass = value;
    else if (unit.startsWith("lb") || unit.startsWith("pound")) values.mass = value;
    else if (unit === "cm" || unit.startsWith("centim")) values.length = value;
    else if (unit === "mm") values.length = value;
    else if (unit === "km" || unit.startsWith("kilomet")) values.distance = value;
    else if (unit.startsWith("mile") || unit === "mi") values.distance = value;
    else if (unit.startsWith("litre") || unit.startsWith("liter") || unit === "l") values.volume = value;
    else if (unit.startsWith("gal")) values.volume = value;
    else if (unit.startsWith("ft") || unit.startsWith("feet") || unit.startsWith("foot")) values.area = value;
  }

  const target = new URL(href, "http://local");
  const category = target.searchParams.get("category");
  if (!category) return href;
  const key =
    category === "mass" ? "mass" :
    category === "volume" ? "volume" :
    category === "area" ? "area" :
    category === "length" ? "length" :
    category === "speed" ? "distance" : "";
  const value = key && values[key];
  if (value) target.searchParams.set("value", value);
  return `${target.pathname}${target.search}`;
}

export const VOICE_EXAMPLES = [
  "convert 70 kilos to pounds",
  "5 miles to kilometers",
  "celsius to fahrenheit",
  "loan payment",
  "split the bill",
  "bitcoin price",
  "us inflation",
];

/** Web Speech availability, safe to call during render on the client. */
export function speechRecognitionSupported(): boolean {
  return typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
}

/** Screen Wake Lock availability, safe to call during render on the client. */
export function wakeLockSupported(): boolean {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

/** Web Share availability, safe to call during render on the client. */
export function webShareSupported(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

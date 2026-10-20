import "server-only";
import { tool, type StructuredToolInterface } from "@langchain/core/tools";
import { z } from "zod";
import { COUNTRIES, CRYPTO_IDS, CURRENCIES, INDICATORS, TIMING } from "@/lib/catalog";
import { describeGenerated, explainGenerated, generateCode } from "@/lib/voice/codegen";
import { associate, associateAsset, associateCountry, associateIndicator, describeAssociations } from "@/lib/voice/association";
import { safeEvaluate } from "@/lib/math";
import { CATEGORIES, FACTORS, convert, convertTemperature, type Category } from "@/lib/units";
import { solveMath, detectMathIntent } from "@/lib/voice/math-intent";
import {
  describeOperationResult,
  detectOperationIntent,
} from "@/lib/voice/operation-intent";
import { retrieveSiteContext } from "@/lib/agent/context";

/**
 * LangChain tool registry for the backend.
 *
 * Each tool wraps an existing, deterministic backend capability (the same
 * code paths the typed tools on the site use). The orchestrator dispatches
 * them by name after the NLU pipeline has produced a validated decision, and
 * the registry is also what a model-driven agent (FastGPT workflow, LangChain
 * agent) would be handed if one were attached later. Tools never navigate or
 * mutate anything; they compute and return JSON.
 */

const TEMPERATURE = new Set(["C", "F", "K"]);

function json(value: unknown): string {
  return JSON.stringify(value);
}

export const solveMathTool = tool(
  async ({ expression, variable }) => {
    const intent = detectMathIntent(expression);
    if (intent) {
      const solved = solveMath(variable ? { ...intent, variable } : intent);
      if (solved.ok) return json({ ok: true, kind: solved.kind, display: solved.display, detail: solved.detail, expression: solved.expression });
    }
    const result = safeEvaluate(expression);
    if (!result.ok) return json({ ok: false, error: result.error });
    return json({ ok: true, kind: "expression", expression, value: result.formatted });
  },
  {
    name: "solve_math",
    description: "Evaluate an arithmetic expression or solve a linear/quadratic equation for a variable.",
    schema: z.object({
      expression: z.string().min(1).max(400).describe("Expression or equation, e.g. '3*x + 5 = 20' or 'sqrt(2) * 8'"),
      variable: z.string().max(8).optional().describe("Variable to solve for when the input is an equation"),
    }),
  },
);

export const compileOperationTool = tool(
  async ({ request }) => {
    const compiled = detectOperationIntent(request);
    if (!compiled) return json({ ok: false, error: "operation-not-understood" });
    return json({
      ok: true,
      operation: compiled.id,
      family: compiled.family,
      expression: compiled.expression,
      preset: compiled.preset ?? null,
      parameters: compiled.parameters,
      confidence: compiled.confidence,
      signals: compiled.signals,
    });
  },
  {
    name: "compile_operation",
    description: "Associate a natural-language calculation request with a typed operation and generate safe math-only code.",
    schema: z.object({ request: z.string().min(1).max(500) }),
  },
);

export const runGeneratedCalculationTool = tool(
  async ({ expression, operation }) => {
    const result = safeEvaluate(expression);
    if (!result.ok) return json({ ok: false, error: result.error, expression, operation });
    const label = operation ? describeOperationResult(operation, result.formatted) : result.formatted;
    return json({ ok: true, operation: operation ?? "calculation", expression, generatedCode: expression, value: result.formatted, display: label });
  },
  {
    name: "run_generated_calculation",
    description: "Execute generated arithmetic code inside the restricted math AST evaluator. JavaScript, shell commands, assignments, property access and unknown functions are rejected.",
    schema: z.object({
      expression: z.string().min(1).max(400),
      operation: z.string().min(1).max(48).optional(),
    }),
  },
);

export const splitBillTool = tool(
  async ({ bill, people, tipPercent }) => {
    const tip = tipPercent ?? 0;
    const total = bill * (1 + tip / 100);
    const each = total / people;
    return json({
      ok: true,
      bill,
      people,
      tipPercent: tip,
      tipAmount: bill * tip / 100,
      total,
      perPerson: each,
      display: `Bill split: ${each.toFixed(2)} per person`,
      generatedCode: `(${bill} * (1 + ${tip} / 100)) / ${people}`,
    });
  },
  {
    name: "calculate_bill_split",
    description: "Split a bill evenly across people, optionally after adding a percentage tip.",
    schema: z.object({
      bill: z.number().finite().min(0).max(1_000_000_000),
      people: z.number().int().min(1).max(10_000),
      tipPercent: z.number().finite().min(0).max(500).optional(),
    }),
  },
);

export const convertUnitsTool = tool(
  async ({ value, from, to, category }) => {
    if (category === "temperature") {
      const f = from.toUpperCase(); const t = to.toUpperCase();
      if (!TEMPERATURE.has(f) || !TEMPERATURE.has(t)) return json({ ok: false, error: "unknown-temperature-unit" });
      const result = convertTemperature(value, f as "C" | "F" | "K", t as "C" | "F" | "K");
      return json({ ok: true, category, value, from: f, to: t, result });
    }
    const table = FACTORS[category as Exclude<Category, "temperature">];
    if (!table) return json({ ok: false, error: "unknown-category" });
    if (!table[from] || !table[to]) return json({ ok: false, error: "unknown-unit", units: Object.keys(table) });
    const result = convert(category as Exclude<Category, "temperature">, value, from, to);
    return json({ ok: true, category, value, from, to, result, fromLabel: table[from].label, toLabel: table[to].label });
  },
  {
    name: "convert_units",
    description: `Convert a measurement between units. Categories: ${Object.keys(CATEGORIES).join(", ")}.`,
    schema: z.object({
      value: z.number().finite(),
      from: z.string().min(1).max(16),
      to: z.string().min(1).max(16),
      category: z.string().min(1).max(16),
    }),
  },
);

interface FrankfurterLatest { amount: number; base: string; date: string; rates: Record<string, number> }

export const convertCurrencyTool = tool(
  async ({ amount, from, to }) => {
    const base = from.toUpperCase(); const quote = to.toUpperCase();
    const known = CURRENCIES as readonly string[];
    if (!known.includes(base) || !known.includes(quote)) return json({ ok: false, error: "unknown-currency" });
    if (base === quote) return json({ ok: true, amount, from: base, to: quote, rate: 1, result: amount, date: null });
    try {
      const response = await fetch(`https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${quote}`, { next: { revalidate: 300 } });
      if (!response.ok) return json({ ok: false, error: "rate-unavailable" });
      const data = (await response.json()) as FrankfurterLatest;
      const rate = data.rates?.[quote];
      if (typeof rate !== "number") return json({ ok: false, error: "rate-unavailable" });
      return json({ ok: true, amount, from: base, to: quote, rate, result: amount * rate, date: data.date, source: "frankfurter.dev" });
    } catch {
      return json({ ok: false, error: "rate-unavailable" });
    }
  },
  {
    name: "convert_currency",
    description: "Convert an amount between ISO-4217 currencies using the latest reference rates.",
    schema: z.object({
      amount: z.number().finite().nonnegative(),
      from: z.string().length(3),
      to: z.string().length(3),
    }),
  },
);

export const findSitePageTool = tool(
  async ({ query, limit }) => json({ ok: true, pages: retrieveSiteContext(query, limit ?? 4) }),
  {
    name: "find_site_page",
    description: "Find the site tools, guides or reference pages most relevant to a request (LlamaIndex keyword retrieval).",
    schema: z.object({ query: z.string().min(1).max(300), limit: z.number().int().min(1).max(8).optional() }),
  },
);

/**
 * Automated code generation: speech → capability → self-contained code. The
 * generated code is executed by the restricted evaluator and the symbolic
 * template plus bindings are returned so the derivation is auditable.
 */
export const generateCalculationTool = tool(
  async ({ request }) => {
    const generated = generateCode(request);
    if (!generated) return json({ ok: false, error: "no-generator-for-request" });
    const result = safeEvaluate(generated.code);
    if (!result.ok) return json({ ok: false, error: result.error, generatedCode: generated.code });
    const value = tidy(result.formatted);
    return json({
      ok: true,
      capability: generated.capability,
      family: generated.family,
      template: generated.template,
      bindings: generated.bindings,
      generatedCode: generated.code,
      explanation: explainGenerated(generated),
      value: `${value}${generated.unit ?? ""}`,
      display: describeGenerated(generated.capability, value, generated.unit ?? ""),
      preset: generated.preset ?? null,
      confidence: generated.confidence,
      signals: generated.signals,
    });
  },
  {
    name: "generate_calculation_code",
    description: "Generate and run math-only code for a spoken calculation request (percentages, loans, interest, geometry, statistics, functions, everyday maths). Returns the template, bindings, generated code and result.",
    schema: z.object({ request: z.string().min(1).max(400) }),
  },
);

/** Language association: map a phrase onto a site capability or page. */
export const associateCapabilityTool = tool(
  async ({ text, locale }) => {
    const match = associate(text, { locale: locale ?? "en" });
    return json({
      ok: Boolean(match),
      association: match,
      country: associateCountry(text, locale ?? "en"),
      indicator: associateIndicator(text, locale ?? "en"),
      asset: associateAsset(text, locale ?? "en"),
      lexicon: describeAssociations().length,
    });
  },
  {
    name: "associate_capability",
    description: "Map recognised text onto the site's closed set of capabilities (tools, pages, market series, countries, assets) with recogniser-noise tolerance.",
    schema: z.object({ text: z.string().min(1).max(300), locale: z.string().max(12).optional() }),
  },
);

interface CoinMarket { id: string; symbol: string; name: string; current_price: number; price_change_percentage_24h: number | null; market_cap: number | null }

export const lookupCryptoPriceTool = tool(
  async ({ asset, vs }) => {
    if (!(CRYPTO_IDS as readonly string[]).includes(asset)) return json({ ok: false, error: "unknown-asset", assets: CRYPTO_IDS });
    const quote = (vs ?? "usd").toLowerCase();
    if (!/^[a-z]{3,4}$/.test(quote)) return json({ ok: false, error: "unknown-quote-currency" });
    try {
      const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${encodeURIComponent(quote)}&ids=${encodeURIComponent(asset)}&per_page=1&page=1&sparkline=false&price_change_percentage=24h`;
      const response = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: TIMING.cryptoCacheSeconds } });
      if (!response.ok) return json({ ok: false, error: "price-unavailable" });
      const [item] = (await response.json()) as CoinMarket[];
      if (!item || typeof item.current_price !== "number") return json({ ok: false, error: "price-unavailable" });
      return json({ ok: true, asset: item.id, symbol: item.symbol?.toUpperCase(), name: item.name, price: item.current_price, vs: quote.toUpperCase(), change24h: item.price_change_percentage_24h, marketCap: item.market_cap, source: "coingecko" });
    } catch {
      return json({ ok: false, error: "price-unavailable" });
    }
  },
  {
    name: "lookup_crypto_price",
    description: `Latest market price for a listed digital asset. Assets: ${CRYPTO_IDS.join(", ")}.`,
    schema: z.object({ asset: z.string().min(2).max(32), vs: z.string().min(3).max(4).optional() }),
  },
);

interface WorldBankPoint { date: string; value: number | null; country?: { value?: string } }

export const lookupEconomyIndicatorTool = tool(
  async ({ country, indicator }) => {
    const economy = COUNTRIES.find((item) => item.value === country.toUpperCase());
    const series = INDICATORS.find((item) => item.value === indicator);
    if (!economy) return json({ ok: false, error: "unknown-country", countries: COUNTRIES.map((item) => item.value) });
    if (!series) return json({ ok: false, error: "unknown-indicator", indicators: INDICATORS.map((item) => item.value) });
    try {
      const url = `https://api.worldbank.org/v2/country/${encodeURIComponent(economy.value)}/indicator/${encodeURIComponent(series.code)}?format=json&per_page=12&mrv=12`;
      const response = await fetch(url, { next: { revalidate: TIMING.economyCacheSeconds } });
      if (!response.ok) return json({ ok: false, error: "data-unavailable" });
      const payload = (await response.json()) as [unknown, WorldBankPoint[] | undefined];
      const latest = (payload[1] ?? []).find((point) => typeof point.value === "number");
      if (!latest) return json({ ok: false, error: "data-unavailable" });
      return json({ ok: true, country: economy.value, countryName: economy.label, indicator: series.value, indicatorName: series.name, year: latest.date, value: latest.value, unit: series.unit, source: "worldbank.org" });
    } catch {
      return json({ ok: false, error: "data-unavailable" });
    }
  },
  {
    name: "lookup_economy_indicator",
    description: `Latest World Bank value for an economic indicator. Indicators: ${INDICATORS.map((item) => item.value).join(", ")}.`,
    schema: z.object({ country: z.string().length(3), indicator: z.string().min(3).max(24) }),
  },
);

function tidy(formatted: string): string {
  const value = Number(formatted);
  if (!Number.isFinite(value)) return formatted;
  if (value === 0) return "0";
  const magnitude = Math.abs(value);
  if (magnitude >= 1e15 || magnitude < 1e-6) return value.toPrecision(6).replace(/\.?0+(e|$)/, "$1");
  const rounded = magnitude >= 1000 ? Number(value.toFixed(2)) : Number(value.toPrecision(8));
  return String(Number(rounded.toFixed(6)));
}

export const BACKEND_TOOLS: StructuredToolInterface[] = [
  generateCalculationTool,
  associateCapabilityTool,
  lookupCryptoPriceTool,
  lookupEconomyIndicatorTool,
  solveMathTool,
  compileOperationTool,
  runGeneratedCalculationTool,
  splitBillTool,
  convertUnitsTool,
  convertCurrencyTool,
  findSitePageTool,
];

export const toolsByName: Record<string, StructuredToolInterface> = Object.fromEntries(BACKEND_TOOLS.map((item) => [item.name, item]));

export interface ToolCallRecord {
  name: string;
  args: Record<string, unknown>;
  output: unknown;
  ms: number;
  ok: boolean;
}

/** Invoke a registered tool by name and record the call. */
export async function dispatchTool(name: string, args: Record<string, unknown>): Promise<ToolCallRecord> {
  const started = performance.now();
  const target = toolsByName[name];
  if (!target) return { name, args, output: { ok: false, error: "unknown-tool" }, ms: 0, ok: false };
  try {
    const raw = await target.invoke(args);
    const text = typeof raw === "string" ? raw : JSON.stringify(raw);
    let output: unknown = text;
    try { output = JSON.parse(text); } catch { /* non-JSON tool output */ }
    const ok = !(output && typeof output === "object" && (output as { ok?: boolean }).ok === false);
    return { name, args, output, ms: Math.round(performance.now() - started), ok };
  } catch (error) {
    return { name, args, output: { ok: false, error: error instanceof Error ? error.message : "tool-failed" }, ms: Math.round(performance.now() - started), ok: false };
  }
}

/** Tool manifest (name, description, JSON schema) for diagnostics and external agents. */
export function describeTools() {
  return BACKEND_TOOLS.map((item) => ({ name: item.name, description: item.description }));
}

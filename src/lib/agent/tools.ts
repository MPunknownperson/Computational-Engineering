import "server-only";
import { tool, type StructuredToolInterface } from "@langchain/core/tools";
import { z } from "zod";
import { CURRENCIES } from "@/lib/catalog";
import { safeEvaluate } from "@/lib/math";
import { CATEGORIES, FACTORS, convert, convertTemperature, type Category } from "@/lib/units";
import { solveMath, detectMathIntent } from "@/lib/voice/math-intent";
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

export const BACKEND_TOOLS: StructuredToolInterface[] = [solveMathTool, convertUnitsTool, convertCurrencyTool, findSitePageTool];

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

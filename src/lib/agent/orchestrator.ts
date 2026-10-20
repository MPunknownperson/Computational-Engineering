import "server-only";
import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";
import { allPacks, analyse } from "@/lib/voice/parser";
import { LANGUAGE_PACKS } from "@/lib/i18n";
import { VoiceRuntime, type Decision } from "@/lib/voice/pipeline";
import { domainOfProgram } from "@/lib/voice/dispatch-guard";
import type { Program } from "@/lib/voice/ir";
import { rememberTurn, retrieveSiteContext, sessionHistory, type SiteContextHit } from "@/lib/agent/context";
import { dispatchTool, type ToolCallRecord } from "@/lib/agent/tools";
import { detectOperationIntent } from "@/lib/voice/operation-intent";
import { comprehendWithFastGpt, fastGptConfigured, type FastGptComprehension } from "@/lib/agent/fastgpt";
import { recallAssociation, rememberAssociation } from "@/lib/agent/associations";
import { execute } from "@/lib/voice/vm";

/**
 * LangChain orchestration for one recognised utterance.
 *
 * The chain is a `RunnableSequence` of plain runnables — no model is in the
 * loop, so behaviour is deterministic and testable:
 *
 *   loadContext  → LlamaIndex session memory + site retrieval
 *   interpret    → the existing typed NLU pipeline (VoiceRuntime)
 *   dispatch     → LangChain tools chosen from the validated program
 *   comprehend   → FastGPT (optional, when configured) reads the whole context
 *   remember     → append the turn and outcome to LlamaIndex memory
 *
 * The VoiceRuntime is kept per session so its 3-minute typed task context
 * survives across requests exactly as it does in the browser.
 */

export interface AgentInput {
  sessionId: string;
  text: string;
  /** Which recogniser produced the text: web-speech | sherpa-onnx-wasm | typed. */
  engine?: string;
  locale?: string;
  /** Skip FastGPT even when configured (e.g. replay/regression traffic). */
  skipComprehension?: boolean;
}

export interface AgentResult {
  sessionId: string;
  engine: string;
  heard: string;
  decision: Decision;
  tools: ToolCallRecord[];
  /** Short natural-language outcome assembled from the tool results. */
  reply: string | null;
  /** Destination href when the decision resolved to a site tool/page. */
  href: string | null;
  label: string | null;
  sitePages: SiteContextHit[];
  comprehension: FastGptComprehension | null;
  history: Array<{ role: string; content: string }>;
  latencyMs: number;
  frameworks: { langchain: true; llamaindex: true; fastgpt: boolean };
}

interface Stage1 extends AgentInput { engine: string; history: Array<{ role: string; content: string }>; sitePages: SiteContextHit[]; started: number }
interface Stage2 extends Stage1 { decision: Decision }
interface Stage3 extends Stage2 { tools: ToolCallRecord[]; reply: string | null; href: string | null; label: string | null }
interface Stage4 extends Stage3 { comprehension: FastGptComprehension | null }

const RUNTIME_TTL_MS = 30 * 60_000;
const runtimes = new Map<string, { runtime: VoiceRuntime; touchedAt: number }>();

function runtimeFor(sessionId: string): VoiceRuntime {
  const now = Date.now();
  for (const [key, entry] of runtimes) if (now - entry.touchedAt > RUNTIME_TTL_MS) runtimes.delete(key);
  const existing = runtimes.get(sessionId);
  if (existing) { existing.touchedAt = now; return existing.runtime; }
  const runtime = new VoiceRuntime(allPacks());
  runtimes.set(sessionId, { runtime, touchedAt: now });
  return runtime;
}

function slotsOf(program: Program) {
  return program.code[0]?.slots ?? {};
}

function describe(value: unknown): string {
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(4).replace(/\.?0+$/, "");
  return String(value ?? "");
}

/** Choose and invoke the backend tools implied by a validated decision. */
async function dispatchFor(decision: Decision, text: string): Promise<{ tools: ToolCallRecord[]; reply: string | null }> {
  const tools: ToolCallRecord[] = [];
  if (decision.kind !== "action") {
    // No executable program: ground the clarification/rejection in real pages.
    tools.push(await dispatchTool("find_site_page", { query: text, limit: 3 }));
    return { tools, reply: decision.kind === "clarify" ? decision.question : null };
  }
  const domain = decision.domain ?? domainOfProgram(decision.program);
  const slots = slotsOf(decision.program);
  const opcode = decision.program.code[0]?.op;
  if (opcode === "RUN") {
    // Generated program: re-derive it server-side so the trace carries the
    // template, bindings and generated code, then run it in the evaluator.
    const generated = await dispatchTool("generate_calculation_code", { request: text });
    tools.push(generated);
    const output = generated.output as { ok?: boolean; display?: string; value?: string };
    if (generated.ok && output.display) return { tools, reply: output.display };
    const fallback = await dispatchTool("run_generated_calculation", { expression: String(slots.expression ?? ""), operation: typeof slots.capability === "string" ? slots.capability : undefined });
    tools.push(fallback);
    const run = fallback.output as { ok?: boolean; display?: string; value?: string };
    return { tools, reply: fallback.ok ? run.display ?? run.value ?? decision.action.label : decision.action.label };
  }
  if (domain === "market") {
    if (typeof slots.asset === "string") {
      const call = await dispatchTool("lookup_crypto_price", { asset: slots.asset });
      tools.push(call);
      const output = call.output as { ok?: boolean; name?: string; price?: number; vs?: string; change24h?: number | null };
      if (call.ok && typeof output.price === "number") {
        const change = typeof output.change24h === "number" ? ` (${output.change24h >= 0 ? "+" : ""}${output.change24h.toFixed(2)}% 24h)` : "";
        return { tools, reply: `${output.name ?? slots.asset}: ${output.price.toLocaleString("en-US", { maximumFractionDigits: output.price < 1 ? 6 : 2 })} ${output.vs ?? "USD"}${change}` };
      }
      return { tools, reply: decision.action.label };
    }
    if (typeof slots.economy === "string" && typeof slots.indicator === "string") {
      const call = await dispatchTool("lookup_economy_indicator", { country: slots.economy, indicator: slots.indicator });
      tools.push(call);
      const output = call.output as { ok?: boolean; countryName?: string; indicatorName?: string; year?: string; value?: number; unit?: string };
      if (call.ok && typeof output.value === "number") {
        const value = output.unit === "%" ? `${output.value.toFixed(2)}%` : output.value.toLocaleString("en-US", { maximumFractionDigits: 0 }) + (output.unit ? ` ${output.unit}` : "");
        return { tools, reply: `${output.indicatorName ?? slots.indicator} — ${output.countryName ?? slots.economy}: ${value} (${output.year})` };
      }
      return { tools, reply: decision.action.label };
    }
  }
  if (domain === "math" || domain === "finance") {
    const expression = typeof slots.expression === "string" ? slots.expression : text;
    const operation = typeof slots.operation === "string" ? slots.operation : null;
    if (operation === "bill-split") {
      const compiled = detectOperationIntent(text);
      const parameters = compiled?.id === "bill-split" ? compiled.parameters : null;
      if (parameters && typeof parameters.bill === "number" && typeof parameters.people === "number") {
        const call = await dispatchTool("calculate_bill_split", {
          bill: parameters.bill,
          people: parameters.people,
          tipPercent: typeof parameters.tipPercent === "number" ? parameters.tipPercent : 0,
        });
        tools.push(call);
        const output = call.output as { display?: string };
        return { tools, reply: call.ok ? output.display ?? decision.action.label : decision.action.label };
      }
    }
    const toolName = operation ? "run_generated_calculation" : "solve_math";
    const call = await dispatchTool(toolName, operation
      ? { expression, operation }
      : { expression, variable: typeof slots.variable === "string" ? slots.variable : undefined });
    tools.push(call);
    const output = call.output as { ok?: boolean; display?: string; value?: string; detail?: string };
    return { tools, reply: call.ok ? `${output.display ?? output.value ?? decision.action.result ?? ""}`.trim() || decision.action.result || null : decision.action.result ?? null };
  }
  if (domain === "currency" && typeof slots.amount === "number" && typeof slots.from === "string" && typeof slots.to === "string") {
    const call = await dispatchTool("convert_currency", { amount: slots.amount, from: slots.from, to: slots.to });
    tools.push(call);
    const output = call.output as { ok?: boolean; result?: number; rate?: number; date?: string | null };
    return { tools, reply: call.ok && typeof output.result === "number" ? `${describe(slots.amount)} ${slots.from} ≈ ${describe(output.result)} ${slots.to}${output.date ? ` (reference rate ${output.date})` : ""}` : decision.action.label };
  }
  if (domain === "units" && typeof slots.amount === "number" && typeof slots.from === "string" && typeof slots.to === "string" && typeof slots.category === "string") {
    const call = await dispatchTool("convert_units", { value: slots.amount, from: slots.from, to: slots.to, category: slots.category });
    tools.push(call);
    const output = call.output as { ok?: boolean; result?: number; fromLabel?: string; toLabel?: string };
    return { tools, reply: call.ok && typeof output.result === "number" ? `${describe(slots.amount)} ${output.fromLabel ?? slots.from} = ${describe(output.result)} ${output.toLabel ?? slots.to}` : decision.action.label };
  }
  tools.push(await dispatchTool("find_site_page", { query: `${decision.action.label} ${text}`, limit: 3 }));
  return { tools, reply: decision.action.label };
}

const loadContext = RunnableLambda.from(async (input: AgentInput): Promise<Stage1> => {
  const sessionId = (input.sessionId || "anonymous").slice(0, 64);
  const [history, sitePages] = await Promise.all([sessionHistory(sessionId), Promise.resolve(retrieveSiteContext(input.text, 4))]);
  return { ...input, sessionId, engine: input.engine || "typed", history, sitePages, started: performance.now() };
}).withConfig({ runName: "load_context" });

const interpret = RunnableLambda.from(async (input: Stage1): Promise<Stage2> => {
  const runtime = runtimeFor(input.sessionId);
  let decision = runtime.decide({ heard: input.text, hypothesis: input.text });
  if (decision.kind !== "action") {
    // Server-side language association memory: a phrase this deployment has
    // already resolved replays its verified program through the executor.
    const remembered = await recallAssociation(input.text, input.locale);
    if (remembered) {
      const executed = execute(remembered.program, runtime.last);
      if (executed.ok) {
        runtime.restore(executed.program);
        const domain = domainOfProgram(executed.program);
        runtime.context.record(domain, executed.action.label);
        const pack = LANGUAGE_PACKS[executed.program.lang] ?? LANGUAGE_PACKS.en;
        decision = {
          kind: "action",
          program: executed.program,
          action: executed.action,
          analysis: analyse(input.text, pack),
          pack,
          confidence: 0.8,
          domain,
          trace: [...decision.trace, { stage: "execute", pack: remembered.locale, outcome: "replayed-association", detail: `learned phrase (${remembered.uses} uses)` }],
        };
      }
    }
  } else {
    void rememberAssociation(input.text, input.locale, decision.program, decision.domain ?? domainOfProgram(decision.program));
  }
  return { ...input, decision };
}).withConfig({ runName: "interpret" });

const dispatch = RunnableLambda.from(async (input: Stage2): Promise<Stage3> => {
  const { tools, reply } = await dispatchFor(input.decision, input.text);
  const href = input.decision.kind === "action" ? input.decision.action.href : null;
  const label = input.decision.kind === "action" ? input.decision.action.label : null;
  return { ...input, tools, reply, href, label };
}).withConfig({ runName: "dispatch_tools" });

const comprehend = RunnableLambda.from(async (input: Stage3): Promise<Stage4> => {
  if (input.skipComprehension || !fastGptConfigured()) return { ...input, comprehension: null };
  const decision = input.decision.kind === "action"
    ? { kind: "action", domain: input.decision.domain, label: input.label, href: input.href, reply: input.reply, confidence: input.decision.confidence }
    : input.decision.kind === "clarify"
      ? { kind: "clarify", reason: input.decision.reason, question: input.decision.question }
      : { kind: "rejected", reason: input.decision.reason };
  const comprehension = await comprehendWithFastGpt(input.sessionId, input.text, {
    engine: input.engine,
    heard: input.text,
    decision,
    history: input.history,
    sitePages: input.sitePages.map((page) => ({ path: page.path, label: page.label })),
    locale: input.locale,
  });
  return { ...input, comprehension };
}).withConfig({ runName: "fastgpt_comprehension" });

const remember = RunnableLambda.from(async (input: Stage4): Promise<AgentResult> => {
  await rememberTurn(input.sessionId, "user", input.text, { engine: input.engine });
  const outcome = input.comprehension?.reply ?? input.reply ?? (input.decision.kind === "rejected" ? `rejected: ${input.decision.reason}` : "no action");
  await rememberTurn(input.sessionId, "assistant", outcome, {
    kind: input.decision.kind,
    href: input.href,
    tools: input.tools.map((call) => call.name),
  });
  return {
    sessionId: input.sessionId,
    engine: input.engine,
    heard: input.text,
    decision: input.decision,
    tools: input.tools,
    reply: input.reply,
    href: input.href,
    label: input.label,
    sitePages: input.sitePages,
    comprehension: input.comprehension,
    history: [...input.history, { role: "user", content: input.text }, { role: "assistant", content: outcome }],
    latencyMs: Math.round(performance.now() - input.started),
    frameworks: { langchain: true, llamaindex: true, fastgpt: fastGptConfigured() },
  };
}).withConfig({ runName: "remember" });

export const utteranceChain = RunnableSequence.from<AgentInput, AgentResult>([loadContext, interpret, dispatch, comprehend, remember]).withConfig({ runName: "voice_utterance" });

/** Run the full chain for one utterance. */
export function orchestrateUtterance(input: AgentInput): Promise<AgentResult> {
  return utteranceChain.invoke(input);
}

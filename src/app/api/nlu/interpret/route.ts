import { type Decision } from "@/lib/voice/pipeline";
import { logInteraction, describeDecision } from "@/lib/voice/telemetry";
import { orchestrateUtterance, type AgentResult } from "@/lib/agent/orchestrator";
import { describeTools } from "@/lib/agent/tools";
import { siteIndexSize } from "@/lib/agent/context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-side interpretation endpoint.
 *
 * Accepts the text produced by speech recognition (browser Web Speech API or
 * the sherpa-onnx WebAssembly fallback) or typed input and runs it through the
 * LangChain orchestration chain: LlamaIndex session context → typed NLU
 * pipeline → backend tool dispatch → memory.
 * Every turn is logged with its decision trace.
 */
export async function POST(request: Request) {
  let body: { text?: string; turns?: string[]; sessionId?: string; engine?: string; locale?: string; comprehend?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const turns = Array.isArray(body.turns) && body.turns.length
    ? body.turns.filter((turn) => typeof turn === "string").slice(0, 10)
    : [typeof body.text === "string" ? body.text : ""];
  if (!turns[0]?.trim()) {
    return Response.json({ error: "text is required" }, { status: 400 });
  }

  const sessionId = (body.sessionId ?? "anonymous").slice(0, 64);
  const engine = typeof body.engine === "string" ? body.engine.slice(0, 32) : "typed";
  const results: Array<{ text: string; decision: Decision; latencyMs: number; summary: ReturnType<typeof describeDecision>; agent: AgentResult }> = [];

  for (const text of turns) {
    const agent = await orchestrateUtterance({ sessionId, text, engine, locale: body.locale, skipComprehension: body.comprehend === false || turns.length > 1 });
    results.push({ text, decision: agent.decision, latencyMs: agent.latencyMs, summary: describeDecision(text, agent.decision, agent.latencyMs, sessionId), agent });
    await logInteraction(text, agent.decision, agent.latencyMs, sessionId);
  }

  const last = results[results.length - 1];
  return Response.json({
    ok: true,
    decision: last.decision,
    summary: last.summary,
    turns: results.map((entry) => ({ text: entry.text, summary: entry.summary })),
    context: last.agent.history,
    agent: {
      engine: last.agent.engine,
      reply: last.agent.reply,
      href: last.agent.href,
      label: last.agent.label,
      tools: last.agent.tools,
      sitePages: last.agent.sitePages,
      comprehension: last.agent.comprehension,
      frameworks: last.agent.frameworks,
    },
  });
}

/** Capability manifest: registered tools and framework status. */
export async function GET() {
  return Response.json({
    ok: true,
    frameworks: { langchain: true, llamaindex: { nodes: siteIndexSize() } },
    tools: describeTools(),
  });
}

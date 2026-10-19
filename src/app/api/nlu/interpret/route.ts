import { allPacks } from "@/lib/voice/parser";
import { VoiceRuntime, type Decision } from "@/lib/voice/pipeline";
import { logInteraction, describeDecision } from "@/lib/voice/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-side interpretation endpoint.
 *
 * Accepts the text produced by browser speech recognition (or typed input),
 * runs the full NLU pipeline, logs the decision, and returns the trace so the
 * caller can see exactly which intent, entities and confidence produced the
 * action.
 */
export async function POST(request: Request) {
  let body: { text?: string; turns?: string[]; sessionId?: string };
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
  const machine = new VoiceRuntime(allPacks());
  const results: Array<{ text: string; decision: Decision; latencyMs: number; summary: ReturnType<typeof describeDecision> }> = [];

  for (const text of turns) {
    const started = performance.now();
    const decision = machine.decide({ heard: text, hypothesis: text });
    const latencyMs = Math.round(performance.now() - started);
    results.push({ text, decision, latencyMs, summary: describeDecision(text, decision, latencyMs, sessionId) });
    await logInteraction(text, decision, latencyMs, sessionId);
  }

  const last = results[results.length - 1];
  return Response.json({
    ok: true,
    decision: last.decision,
    summary: last.summary,
    turns: results.map((entry) => ({ text: entry.text, summary: entry.summary })),
    context: machine.context.history(),
  });
}

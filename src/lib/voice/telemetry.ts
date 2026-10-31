import { store } from "@/lib/store";
import type { Decision } from "@/lib/voice/pipeline";
import { detectMathIntent } from "@/lib/voice/math-intent";

/** Flatten a decision into the row shape used for tuning and replay. */
export function describeDecision(rawText: string, decision: Decision, latencyMs: number, sessionId: string) {
  const math = detectMathIntent(rawText);
  const entities: Array<{ type: string; value: string }> = (math?.entities ?? []).map((entity) => ({
    type: entity.type,
    value: String(entity.value),
  }));

  if (decision.kind === "action") {
    const instruction = decision.program.code[0];
    for (const [key, value] of Object.entries(instruction?.slots ?? {})) {
      entities.push({ type: `slot.${key}`, value: String(value) });
    }
    return {
      sessionId,
      rawText,
      normalisedText: decision.analysis.raw || decision.analysis.text,
      decision: "action" as const,
      domain: decision.domain ?? null,
      opcode: instruction?.op ?? null,
      entities,
      slots: (instruction?.slots ?? {}) as Record<string, string | number>,
      confidence: decision.confidence ?? 0,
      actionHref: decision.action.href,
      actionLabel: decision.action.label,
      result: decision.action.result ?? null,
      blockedCode: null,
      blockedReason: null,
      contextDomain: null,
      trace: (decision.trace ?? []) as unknown as Array<Record<string, unknown>>,
      latencyMs,
    };
  }

  if (decision.kind === "clarify") {
    return {
      sessionId,
      rawText,
      normalisedText: rawText,
      decision: "clarify" as const,
      domain: decision.options[0]?.domain ?? null,
      opcode: null,
      entities,
      slots: {},
      confidence: decision.confidence,
      actionHref: null,
      actionLabel: decision.question,
      result: null,
      blockedCode: decision.reason,
      blockedReason: decision.question,
      contextDomain: null,
      trace: decision.trace as unknown as Array<Record<string, unknown>>,
      latencyMs,
    };
  }

  const blocked = decision.trace.find((step) => step.outcome.startsWith("blocked:"));
  return {
    sessionId,
    rawText,
    normalisedText: rawText,
    decision: "rejected" as const,
    domain: null,
    opcode: null,
    entities,
    slots: {},
    confidence: 0,
    actionHref: null,
    actionLabel: null,
    result: null,
    blockedCode: blocked?.outcome.replace("blocked:", "") ?? null,
    blockedReason: decision.reason,
    contextDomain: null,
    trace: decision.trace as unknown as Array<Record<string, unknown>>,
    latencyMs,
  };
}

/** Persist one interaction. Logging failures never break the interaction. */
export async function logInteraction(
  rawText: string,
  decision: Decision,
  latencyMs: number,
  sessionId = "anonymous",
): Promise<void> {
  try {
    store.nluInteractions.insert({
      id: store.nluInteractions.nextSequence(),
      ...describeDecision(rawText, decision, latencyMs, sessionId),
      createdAt: new Date(),
    });
  } catch {
    // Telemetry is best-effort.
  }
}

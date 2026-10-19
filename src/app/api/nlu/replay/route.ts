import { db } from "@/db";
import { nluRegressionRuns } from "@/db/nlu-schema";
import { allPacks } from "@/lib/voice/parser";
import { VoiceRuntime } from "@/lib/voice/pipeline";
import { REGRESSION_DIALOGUES, REGRESSION_SUITE } from "@/lib/voice/regression-suite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CaseResult {
  id: string;
  utterance: string;
  expected: string;
  actual: string;
  result?: string;
  confidence: number;
  pass: boolean;
  problem?: string;
  note: string;
}

function outcomeOf(runtimeInstance: VoiceRuntime, utterance: string) {
  const decision = runtimeInstance.decide({ heard: utterance, hypothesis: utterance });
  if (decision.kind === "action") {
    return {
      actual: decision.domain ?? "action",
      confidence: decision.confidence ?? 0,
      result: decision.action.result ?? decision.action.label,
    };
  }
  if (decision.kind === "clarify") return { actual: "clarify", confidence: decision.confidence, result: decision.question };
  return { actual: "rejected", confidence: 0, result: decision.reason };
}

/** Replay every golden case and store the run. This is the regression gate. */
export async function POST() {
  const started = Date.now();
  const results: CaseResult[] = [];

  for (const testCase of REGRESSION_SUITE) {
    const machine = new VoiceRuntime(allPacks());
    const { actual, confidence, result } = outcomeOf(machine, testCase.utterance);
    let problem: string | undefined;
    if (actual !== testCase.expect) problem = `expected ${testCase.expect}, got ${actual}`;
    else if (testCase.forbid?.includes(actual as never)) problem = `forbidden domain ${actual}`;
    else if (testCase.expectResult && !String(result ?? "").includes(testCase.expectResult)) {
      problem = `expected result containing "${testCase.expectResult}", got "${result}"`;
    }
    results.push({
      id: testCase.id,
      utterance: testCase.utterance,
      expected: testCase.expect,
      actual,
      result: String(result ?? ""),
      confidence: Number(confidence.toFixed(3)),
      pass: !problem,
      problem,
      note: testCase.note,
    });
  }

  for (const dialogue of REGRESSION_DIALOGUES) {
    const machine = new VoiceRuntime(allPacks());
    let problem: string | undefined;
    const spoken: string[] = [];
    let confidence = 0;
    let lastResult = "";
    for (const turn of dialogue.turns) {
      const outcome = outcomeOf(machine, turn.utterance);
      spoken.push(`${turn.utterance} → ${outcome.actual}`);
      confidence = outcome.confidence;
      lastResult = String(outcome.result ?? "");
      if (!problem && outcome.actual !== turn.expect) {
        problem = `turn "${turn.utterance}": expected ${turn.expect}, got ${outcome.actual}`;
      }
      if (!problem && turn.forbid?.includes(outcome.actual as never)) {
        problem = `turn "${turn.utterance}": forbidden domain ${outcome.actual}`;
      }
    }
    results.push({
      id: dialogue.id,
      utterance: spoken.join(" | "),
      expected: dialogue.turns.map((turn) => turn.expect).join(" → "),
      actual: problem ? "mismatch" : "as expected",
      result: lastResult,
      confidence: Number(confidence.toFixed(3)),
      pass: !problem,
      problem,
      note: dialogue.note,
    });
  }

  const failures = results.filter((entry) => !entry.pass);
  const durationMs = Date.now() - started;

  try {
    await db.insert(nluRegressionRuns).values({
      total: results.length,
      passed: results.length - failures.length,
      failed: failures.length,
      durationMs,
      failures: failures as unknown as Array<Record<string, unknown>>,
    });
  } catch {
    // Recording the run is best-effort; the result is still returned.
  }

  return Response.json({
    ok: failures.length === 0,
    total: results.length,
    passed: results.length - failures.length,
    failed: failures.length,
    durationMs,
    results,
  });
}

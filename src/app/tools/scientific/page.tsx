"use client";
import { useSearchParams } from "next/navigation";
import { findPreset, type ExpressionPreset } from "@/lib/presets";
import { useDeferredValue, useMemo, useState } from "react";
import {
  bracketedRoot, numericDerivative, numericIntegral,
  parseVariableAssignments, safeEvaluate, simplify,
} from "@/lib/math";
import { Reveal, PanelSwap } from "@/components/Motion";
import { ConfirmBar, ConfirmForm, LockedResult, useConfirmGate } from "@/components/Confirm";
import { Icon } from "@/components/Icons";
import { WakeLockToggle, ShareCopy } from "@/components/tech/BrowserTools";

const EXAMPLES = [
  { label: "Pythagoras", expr: "sqrt(a^2 + b^2)", vars: "a = 3; b = 4" },
  { label: "Compound growth", expr: "P * (1 + r/n)^(n*t)", vars: "P = 1000; r = 0.05; n = 12; t = 10" },
  { label: "Matrix determinant", expr: "det([1, 2; 3, 4])", vars: "" },
  { label: "Linear system", expr: "lusolve([2, 1; 1, -1], [5; 1])", vars: "" },
  { label: "Unit expression", expr: "100 km/h to mph", vars: "" },
  { label: "Root of a quadratic", expr: "x^2 - 5*x + 6", vars: "lower = 0; upper = 2.5" },
];

export default function ScientificPage() {
  const search = useSearchParams();
  return <ScientificWorkspace key={search.toString()} initial={findPreset(search.get("preset"))} />;
}

function ScientificWorkspace({ initial }: { initial?: ExpressionPreset }) {
  const [expression, setExpression] = useState(initial?.expression ?? "sin(pi/4)^2 + cos(pi/4)^2");
  const [variablesText, setVariablesText] = useState(initial?.variables ?? "x = 2; y = 5");
  const [at, setAt] = useState("0");
  const [lower, setLower] = useState("0");
  const [upper, setUpper] = useState("1");
  const [history, setHistory] = useState<{ expression: string; result: string }[]>([]);

  const variables = useMemo(() => parseVariableAssignments(variablesText), [variablesText]);
  const scope = useMemo(() => (variables.ok ? variables.scope : {}), [variables]);
  const isValid = expression.trim().length > 0 && variables.ok;

  // Everything below is computed while the visitor types, but nothing is shown
  // until they press Calculate.
  const result = useMemo(
    () => isValid ? safeEvaluate(expression, scope) : { ok: false as const, error: variables.ok ? "Enter an expression." : variables.error },
    [expression, isValid, scope, variables],
  );

  const deferredExpression = useDeferredValue(expression);
  const simplified = useMemo(
    () => isValid ? simplify(deferredExpression, scope) : null,
    [deferredExpression, isValid, scope],
  );

  const point = Number(at);
  const from = Number(lower);
  const to = Number(upper);
  const usesX = /\bx\b/.test(deferredExpression);
  const analysisReady = isValid && usesX && result.ok && Number.isFinite(point) && Number.isFinite(from) && Number.isFinite(to) && from < to;

  const derivative = useMemo(
    () => analysisReady ? numericDerivative(deferredExpression, "x", point, scope) : null,
    [analysisReady, deferredExpression, point, scope],
  );
  const root = useMemo(
    () => analysisReady ? bracketedRoot(deferredExpression, "x", from, to, scope) : null,
    [analysisReady, deferredExpression, from, to, scope],
  );
  const integral = useMemo(
    () => analysisReady ? numericIntegral(deferredExpression, "x", from, to, scope) : null,
    [analysisReady, deferredExpression, from, to, scope],
  );

  const gate = useConfirmGate(`${expression}|${variablesText}|${at}|${lower}|${upper}`, isValid && result.ok);
  const state = !variables.ok || expression.trim().length === 0
    ? "needs-input"
    : !result.ok ? "invalid"
      : gate.revealed ? "revealed" : "awaiting";

  function calculate() {
    gate.confirm();
    if (gate.revealed || !result.ok) return;
    const value = safeEvaluate(expression, scope);
    if (value.ok) {
      setHistory((old) => old[0]?.expression === expression && old[0]?.result === value.formatted
        ? old
        : [{ expression, result: value.formatted }, ...old].slice(0, 8));
    }
  }

  function applyExample(example: (typeof EXAMPLES)[number]) {
    setExpression(example.expr);
    setVariablesText(example.vars);
    gate.reset();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-12">
      <Reveal>
        <h1 className="h-title text-4xl sm:text-5xl">Scientific <span className="h-underline">calculator</span></h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Enter an expression and any values it needs, then press <strong>Calculate</strong>. The work is done while you
          type; the answer appears only when you confirm. Decimal arithmetic is used where possible — check important
          results independently.
        </p>
      </Reveal>

      <div className="sketch mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
        <WakeLockToggle />
        <ShareCopy
          title="Scientific calculator"
          text={`Expression: ${expression}`}
          href="/tools/scientific"
        />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <div className="sketch">
            <ConfirmForm onSubmit={calculate} label="Scientific calculation">
              <label htmlFor="scientific-expression" className="mb-1.5 block text-sm font-semibold text-slate-700">Expression</label>
              <input
                id="scientific-expression"
                className="input mono !text-base sm:!text-lg"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="e.g. sqrt(2) * log(100, 10)"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
              />

              <label htmlFor="scientific-variables" className="mb-1.5 mt-5 block text-sm font-semibold text-slate-700">
                Values <span className="font-normal text-slate-500">— separate with semicolons; a value may use an earlier one</span>
              </label>
              <textarea
                id="scientific-variables"
                className="textarea !min-h-24"
                value={variablesText}
                onChange={(e) => setVariablesText(e.target.value)}
                placeholder="x = 2; y = 5"
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
              />
              {!variables.ok && <p role="alert" className="mt-2 text-sm font-semibold text-rose-600">{variables.error}</p>}

              <div
                id="scientific-result"
                role="status"
                aria-live="polite"
                className={`result-panel mt-6 ${gate.revealed ? "is-revealed" : "is-locked"}`}
              >
                <div className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Result</div>
                {gate.revealed ? (
                  result.ok
                    ? <div className="mono mt-2 break-all text-xl font-extrabold sm:text-3xl">= {result.formatted}</div>
                    : <div className="mt-2 font-semibold text-rose-600">{result.error}</div>
                ) : (
                  <div className="mt-2"><LockedResult label="Result hidden until you press Calculate." /></div>
                )}
                {gate.revealed && simplified && simplified !== expression && (
                  <div className="mt-3 text-sm text-slate-600">Simplified: <span className="mono break-all text-[color:var(--ink)]">{simplified}</span></div>
                )}
              </div>

              <ConfirmBar
                id="scientific-confirm"
                action="Calculate"
                state={state}
                onConfirm={calculate}
                onReset={gate.reset}
                hint="Enter an expression, then press Calculate."
                errorText={result.ok ? "" : result.error}
                shownText="Result shown."
              />
            </ConfirmForm>

            {gate.revealed && usesX && (
              <PanelSwap trigger="analysis" className="mt-5">
                <div className="rounded-xl border-2 border-[color:var(--line)] bg-white p-4">
                  <h2 className="text-sm font-extrabold">Numerical analysis for x</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Estimates computed from your expression. A root needs the expression to change sign between the two limits.
                    Change a limit and press Calculate again to refresh these values.
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <label className="text-sm font-semibold text-slate-700">At x
                      <input className="input mono mt-1" value={at} onChange={(e) => setAt(e.target.value)} inputMode="decimal" />
                    </label>
                    <label className="text-sm font-semibold text-slate-700">Left limit
                      <input className="input mono mt-1" value={lower} onChange={(e) => setLower(e.target.value)} inputMode="decimal" />
                    </label>
                    <label className="text-sm font-semibold text-slate-700">Right limit
                      <input className="input mono mt-1" value={upper} onChange={(e) => setUpper(e.target.value)} inputMode="decimal" />
                    </label>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <AnalysisCard label="Derivative at x" result={derivative} />
                    <AnalysisCard label="Root between limits" result={root} />
                    <AnalysisCard label="Integral between limits" result={integral} />
                  </div>
                </div>
              </PanelSwap>
            )}

            <details className="mt-5 rounded-xl border-2 border-[color:var(--line)] bg-white">
              <summary className="cursor-pointer px-4 py-3 text-sm font-extrabold">Examples and supported operations</summary>
              <div className="border-t-2 border-[color:var(--line)] px-4 py-4">
                <div className="flex flex-wrap gap-2">
                  {EXAMPLES.map((example) => (
                    <button key={example.label} type="button" className="btn !min-h-11 !px-3 !py-1.5 text-xs" onClick={() => applyExample(example)}>
                      {example.label}
                    </button>
                  ))}
                </div>
                <ul className="mono mt-4 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                  <li>sqrt(x), cbrt(x), pow(a,b), factorial(n)</li>
                  <li>sin, cos, tan, asin, acos, atan2</li>
                  <li>log(x), log10(x), log2(x), exp(x)</li>
                  <li>det(A), inv(A), transpose(A), lusolve(A,b)</li>
                  <li>sum([…]), mean([…]), std([…]), norm(v)</li>
                  <li>pi, e, i · 5 km to mi · 72 degF to degC</li>
                </ul>
              </div>
            </details>
          </div>
        </Reveal>

        <Reveal delay={70}>
          <aside className="sketch">
            <div className="flex items-center gap-2">
              <Icon name="chart" size={17} className="text-slate-500" />
              <h2 className="font-semibold">Confirmed results</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">Only calculations you confirmed are listed.</p>
            {history.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Nothing confirmed yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-[color:var(--line)]">
                {history.map((item, index) => (
                  <li key={`${item.expression}-${index}`} className="py-2.5">
                    <button type="button" className="w-full text-left" onClick={() => { setExpression(item.expression); gate.reset(); }}>
                      <span className="mono block truncate text-xs text-slate-500">{item.expression}</span>
                      <span className="mono block break-all font-semibold">= {item.result}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </Reveal>
      </div>
    </div>
  );
}

function AnalysisCard({ label, result }: { label: string; result: ReturnType<typeof numericDerivative> | null }) {
  return (
    <div className="rounded-lg border border-[color:var(--line)] bg-[#fffdf5] p-3">
      <div className="text-[.65rem] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mono mt-1 break-all text-sm font-bold">{result?.ok ? result.formatted : "—"}</div>
      {!result?.ok && result?.error && <div className="mt-1 text-xs text-slate-500">{result.error}</div>}
    </div>
  );
}

"use client";
import { useSearchParams } from "next/navigation";
import { findPreset, type ExpressionPreset } from "@/lib/presets";
import { useDeferredValue, useMemo, useState } from "react";
import { ExpressionAssist } from "@/components/tech/MlAssist";
import { recordExpression } from "@/lib/ml/completion";
import {
  evaluate, parseVariableAssignments, simplifyExpression, symbolicDerivative, numericDerivative, numericIntegral,
  findRoots, findExtrema, taylorSeries, numericLimit, sampleFunction, solveEquation, solveLinearSystem,
  runSession, describe, parseNumberList, formatValue, freeVariables, type FormatOptions,
} from "@/lib/engine";
import { Reveal, PanelSwap, Segmented } from "@/components/Motion";
import { ConfirmBar, ConfirmForm, LockedResult, useConfirmGate } from "@/components/Confirm";
import { Icon } from "@/components/Icons";
import { WakeLockToggle, ShareCopy } from "@/components/tech/BrowserTools";
import { EngineSettingsBar, Field, FunctionPlot, KeyValue, useEngineSettings } from "@/components/engine/EngineUi";

type Tab = "expression" | "notebook" | "solve" | "calculus" | "data";

const EXAMPLES = [
  { label: "Pythagoras", expr: "sqrt(a^2 + b^2)", vars: "a = 3; b = 4" },
  { label: "Compound growth", expr: "P * (1 + r/n)^(n*t)", vars: "P = 1000; r = 0.05; n = 12; t = 10" },
  { label: "Eigenvalues", expr: "eigs([2, 1; 1, 2]).values", vars: "" },
  { label: "Linear system", expr: "lusolve([2, 1; 1, -1], [5; 1])", vars: "" },
  { label: "Unit expression", expr: "(12 V)^2 / (8 ohm) to W", vars: "" },
  { label: "Complex", expr: "(3 + 4i) * exp(i * pi / 3)", vars: "" },
  { label: "Loan payment", expr: "-pmt(r/12, 12*years, principal)", vars: "principal = 250000; r = 0.065; years = 30" },
  { label: "Numeric root", expr: 'nsolve("cos(x) - x", 0.5)', vars: "" },
  { label: "Integral", expr: 'integrate("exp(-x^2)", -Infinity, Infinity)', vars: "" },
  { label: "Series Σ", expr: 'summation("1/k^2", 1, 10000)', vars: "" },
  { label: "Stats", expr: "std([2.1, 2.4, 1.9, 2.2, 2.6]) / mean([2.1, 2.4, 1.9, 2.2, 2.6])", vars: "" },
  { label: "Speed of light", expr: "speedOfLight * 1 ns to cm", vars: "" },
];

const KEYPAD: Array<{ label: string; insert: string; title?: string }[]> = [
  [{ label: "sin", insert: "sin(" }, { label: "cos", insert: "cos(" }, { label: "tan", insert: "tan(" }, { label: "asin", insert: "asin(" }, { label: "acos", insert: "acos(" }, { label: "atan", insert: "atan(" }, { label: "sinh", insert: "sinh(" }, { label: "cosh", insert: "cosh(" }],
  [{ label: "ln", insert: "log(" }, { label: "log₁₀", insert: "log10(" }, { label: "log₂", insert: "log2(" }, { label: "eˣ", insert: "exp(" }, { label: "√", insert: "sqrt(" }, { label: "∛", insert: "cbrt(" }, { label: "x²", insert: "^2" }, { label: "xʸ", insert: "^" }],
  [{ label: "n!", insert: "factorial(" }, { label: "nCr", insert: "combinations(" }, { label: "nPr", insert: "permutations(" }, { label: "Γ", insert: "gamma(" }, { label: "erf", insert: "erf(" }, { label: "|x|", insert: "abs(" }, { label: "mod", insert: "mod(" }, { label: "gcd", insert: "gcd(" }],
  [{ label: "π", insert: "pi" }, { label: "e", insert: "e" }, { label: "i", insert: "i" }, { label: "τ", insert: "tau" }, { label: "φ", insert: "golden" }, { label: "g₀", insert: "g0" }, { label: "c", insert: "speedOfLight" }, { label: "h", insert: "planckConstant" }],
  [{ label: "[ ; ]", insert: "[1, 2; 3, 4]", title: "matrix" }, { label: "det", insert: "det(" }, { label: "inv", insert: "inv(" }, { label: "Aᵀ", insert: "transpose(" }, { label: "eig", insert: "eigs(" }, { label: "solve", insert: "lusolve(" }, { label: "×", insert: "cross(" }, { label: "·", insert: "dot(" }],
  [{ label: "∫", insert: 'integrate("', title: "integrate(\"f(x)\", a, b)" }, { label: "d/dx", insert: 'diff("', title: "diff(\"f(x)\", at)" }, { label: "root", insert: 'nsolve("', title: "nsolve(\"f(x)\", guess)" }, { label: "Σ", insert: 'summation("', title: "summation(\"f(k)\", from, to)" }, { label: "→unit", insert: " to " }, { label: "hex", insert: "hex(" }, { label: "bin", insert: "bin(" }, { label: "%", insert: "%" }],
];

const EXPRESSION_ALLOWED = /^[0-9a-zA-Z+\-*/^().,;%=\[\] "'_]{1,400}$/;

/** A voice maths action arrives as ?expr=…&vars=…; anything else is ignored. */
function initialFromSearch(search: URLSearchParams): ExpressionPreset | undefined {
  const preset = findPreset(search.get("preset"));
  if (preset) return preset;
  const expr = search.get("expr");
  if (!expr || !EXPRESSION_ALLOWED.test(expr)) return undefined;
  const vars = search.get("vars");
  return { id: "voice", name: "From voice input", description: "Expression supplied by a verified voice maths action.", expression: expr, variables: vars && EXPRESSION_ALLOWED.test(vars) ? vars : "" };
}

export default function ScientificPage() {
  const search = useSearchParams();
  return <ScientificWorkspace key={search.toString()} initial={initialFromSearch(new URLSearchParams(search.toString()))} />;
}

function ScientificWorkspace({ initial }: { initial?: ExpressionPreset }) {
  const [settings, updateSettings] = useEngineSettings();
  const format: FormatOptions = useMemo(() => ({ notation: settings.notation, precision: settings.precision }), [settings.notation, settings.precision]);
  const [tab, setTab] = useState<Tab>("expression");
  const [expression, setExpression] = useState(initial?.expression ?? "sin(pi/4)^2 + cos(pi/4)^2");
  const [variablesText, setVariablesText] = useState(initial?.variables ?? "x = 2; y = 5");
  const [history, setHistory] = useState<{ expression: string; result: string }[]>([]);

  const variables = useMemo(() => parseVariableAssignments(variablesText, { angle: settings.angle }), [variablesText, settings.angle]);
  const scope = useMemo(() => (variables.ok ? variables.scope : {}), [variables]);
  const isValid = expression.trim().length > 0 && variables.ok;

  // Computed while the visitor types; shown only after they press Calculate.
  const result = useMemo(
    () => isValid ? evaluate(expression, scope, { angle: settings.angle, format }) : { ok: false as const, error: variables.ok ? "Enter an expression." : variables.error },
    [expression, isValid, scope, variables, settings.angle, format],
  );
  const deferredExpression = useDeferredValue(expression);
  const simplified = useMemo(() => (isValid ? simplifyExpression(deferredExpression, scope) : null), [deferredExpression, isValid, scope]);
  const gate = useConfirmGate(`${expression}|${variablesText}|${settings.angle}|${settings.notation}|${settings.precision}`, isValid && result.ok);
  const state = !variables.ok || expression.trim().length === 0 ? "needs-input" : !result.ok ? "invalid" : gate.revealed ? "revealed" : "awaiting";

  function calculate() {
    gate.confirm();
    if (gate.revealed || !result.ok) return;
    recordExpression(expression);
    setHistory((old) => old[0]?.expression === expression && old[0]?.result === result.formatted ? old : [{ expression, result: result.formatted }, ...old].slice(0, 12));
  }
  function insert(token: string) {
    const field = document.getElementById("scientific-expression") as HTMLInputElement | null;
    const start = field?.selectionStart ?? expression.length;
    const end = field?.selectionEnd ?? start;
    const next = `${expression.slice(0, start)}${token}${expression.slice(end)}`;
    setExpression(next);
    gate.reset();
    requestAnimationFrame(() => { field?.focus(); field?.setSelectionRange(start + token.length, start + token.length); });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-12">
      <Reveal>
        <h1 className="h-title text-4xl sm:text-5xl">Scientific <span className="h-underline">calculator</span></h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          64-digit decimal arithmetic, complex numbers, matrices, physical units and constants, symbolic and numerical
          calculus, equation solving and a notebook for multi-step work. Results stay hidden until you press
          <strong> Calculate</strong>. Check important results independently.
        </p>
      </Reveal>

      <div className="sketch mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
        <EngineSettingsBar settings={settings} onChange={(patch) => { updateSettings(patch); gate.reset(); }} />
        <div className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-3">
          <WakeLockToggle />
          <ShareCopy title="Scientific calculator" text={`Expression: ${expression}`} href="/tools/scientific" />
        </div>
      </div>

      <div className="mt-6">
        <Segmented<Tab> ariaLabel="Calculator mode" value={tab} onChange={setTab} options={[
          { value: "expression", label: "Expression" }, { value: "notebook", label: "Notebook" }, { value: "solve", label: "Solve" }, { value: "calculus", label: "Calculus & plot" }, { value: "data", label: "Data" },
        ]} />
      </div>

      {tab === "expression" && (
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <div className="sketch">
              <ConfirmForm onSubmit={calculate} label="Scientific calculation">
                <label htmlFor="scientific-expression" className="mb-1.5 block text-sm font-semibold text-slate-700">Expression</label>
                <input id="scientific-expression" className="input mono !text-base sm:!text-lg" value={expression} onChange={(e) => { setExpression(e.target.value); gate.reset(); }} placeholder="e.g. sqrt(2) * log(100, 10)" spellCheck={false} autoCapitalize="off" autoCorrect="off" />
                <ExpressionAssist inputId="scientific-expression" expression={expression} variables={Object.keys(scope)} onApply={(next) => { setExpression(next); gate.reset(); }} />

                <div className="mt-3 grid grid-cols-8 gap-1" aria-label="Function keypad">
                  {KEYPAD.flat().map((key) => (
                    <button key={key.label + key.insert} type="button" className="board-key !min-h-9 !text-xs" title={key.title ?? key.insert} onClick={() => insert(key.insert)}>{key.label}</button>
                  ))}
                </div>

                <label htmlFor="scientific-variables" className="mb-1.5 mt-5 block text-sm font-semibold text-slate-700">
                  Values <span className="font-normal text-slate-500">— semicolon-separated; units allowed (L = 2.5 m); a value may use an earlier one</span>
                </label>
                <textarea id="scientific-variables" className="textarea !min-h-20" value={variablesText} onChange={(e) => { setVariablesText(e.target.value); gate.reset(); }} placeholder="x = 2; y = 5" spellCheck={false} autoCapitalize="off" autoCorrect="off" />
                {!variables.ok && <p role="alert" className="mt-2 text-sm font-semibold text-rose-600">{variables.error}</p>}

                <div id="scientific-result" role="status" aria-live="polite" className={`result-panel mt-6 ${gate.revealed ? "is-revealed" : "is-locked"}`}>
                  <div className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Result{gate.revealed && result.ok ? ` · ${result.type}` : ""}</div>
                  {gate.revealed ? (
                    result.ok ? <div className="mono mt-2 break-all text-xl font-extrabold sm:text-3xl">= {result.formatted}</div> : <div className="mt-2 font-semibold text-rose-600">{result.error}</div>
                  ) : <div className="mt-2"><LockedResult label="Result hidden until you press Calculate." /></div>}
                  {gate.revealed && result.ok && settings.notation !== "auto" && <div className="mt-2 text-xs text-slate-500">Full precision: <span className="mono">{formatValue(result.value, { precision: 20 })}</span></div>}
                  {gate.revealed && simplified && simplified !== expression && (
                    <div className="mt-3 text-sm text-slate-600">Simplified: <span className="mono break-all text-[color:var(--ink)]">{simplified}</span></div>
                  )}
                </div>

                <ConfirmBar id="scientific-confirm" action="Calculate" state={state} onConfirm={calculate} onReset={gate.reset} hint="Enter an expression, then press Calculate." errorText={result.ok ? "" : result.error} shownText="Result shown." />
              </ConfirmForm>
            </div>
          </Reveal>

          <Reveal delay={90}>
            <aside className="space-y-5">
              <div className="sketch">
                <h2 className="font-extrabold">Examples</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {EXAMPLES.map((example) => (
                    <button key={example.label} type="button" className="chip !min-h-8 hover:!bg-[color:var(--accent-3)]" onClick={() => { setExpression(example.expr); setVariablesText(example.vars); gate.reset(); }}>{example.label}</button>
                  ))}
                </div>
              </div>
              <div className="sketch">
                <h2 className="font-extrabold">History</h2>
                {history.length === 0 ? <p className="mt-2 text-sm text-slate-500">Calculated results appear here. They stay in this tab only.</p> : (
                  <ul className="mt-3 space-y-2">
                    {history.map((item, i) => (
                      <li key={`${item.expression}-${i}`}>
                        <button type="button" className="w-full rounded-xl border border-[color:var(--line)] px-3 py-2 text-left row-hover" onClick={() => { setExpression(item.expression); gate.reset(); }}>
                          <span className="mono block truncate text-xs text-slate-500">{item.expression}</span>
                          <span className="mono block truncate text-sm font-bold">= {item.result}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="sketch text-sm leading-relaxed text-slate-600">
                <h2 className="font-extrabold text-[color:var(--ink)]">Engine notes</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Decimal (BigNumber) arithmetic: <span className="mono">0.1 + 0.2 = 0.3</span>.</li>
                  <li>Units: <span className="mono">5 kN * 2 m to J</span>, <span className="mono">100 km/h to mph</span>.</li>
                  <li>Complex: <span className="mono">sqrt(-4)</span>, <span className="mono">(1+2i)^3</span>.</li>
                  <li>Percent: <span className="mono">200 * 12%</span>; bases: <span className="mono">0xff + 0b101</span>, <span className="mono">hex(255)</span>.</li>
                  <li>Numeric helpers: <span className="mono">nsolve, roots, integrate, diff, summation, odesolve, polyfit, linreg, pmt, npv, irr, par, db</span>.</li>
                </ul>
              </div>
            </aside>
          </Reveal>
        </div>
      )}

      {tab === "notebook" && <NotebookPanel angle={settings.angle} format={format} />}
      {tab === "solve" && <SolvePanel angle={settings.angle} format={format} />}
      {tab === "calculus" && <CalculusPanel angle={settings.angle} format={format} seed={expression} scope={scope} />}
      {tab === "data" && <DataPanel format={format} />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function NotebookPanel({ angle, format }: { angle: "rad" | "deg" | "grad"; format: FormatOptions }) {
  const [source, setSource] = useState("# Beam check — each line sees the ones above\nF = 2 kN\nL = 1.5 m\nE = 200 GPa\nI = 8.5e-6 m^4\ndelta = F * L^3 / (3 * E * I)\ndelta to mm\n\n# Functions and numeric tools\nf(x) = x^3 - 2x - 5\nroots(f, -5, 5)\nintegrate(f, 0, 2)\nans * 2");
  const [ran, setRan] = useState<string | null>(null);
  const session = useMemo(() => (ran === null ? null : runSession(ran, { angle, format })), [ran, angle, format]);
  return (
    <PanelSwap trigger="notebook" className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="sketch">
        <h2 className="text-lg font-extrabold">Notebook</h2>
        <p className="mt-1 text-sm text-slate-600">One statement per line (or separate with <span className="mono">;</span>). Assignments persist, <span className="mono">f(x) = …</span> defines a function, <span className="mono">ans</span> is the previous result, <span className="mono">#</span> starts a comment.</p>
        <textarea className="textarea mt-3 !min-h-64" value={source} onChange={(e) => setSource(e.target.value)} spellCheck={false} autoCapitalize="off" aria-label="Notebook source" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-primary" onClick={() => setRan(source)}><Icon name="bolt" size={16} /> Run notebook</button>
          {session && <span className="text-xs text-slate-500">{session.lines.filter((l) => l.kind !== "blank" && l.kind !== "comment").length} statements · {session.errors} error{session.errors === 1 ? "" : "s"} · {session.totalMs.toFixed(0)} ms</span>}
        </div>
        {session && (
          <ol className="mt-4 divide-y divide-dashed divide-[color:var(--line)] rounded-xl border-2 border-[color:var(--line)]">
            {session.lines.filter((l) => l.kind !== "blank").map((line) => (
              <li key={line.index} className="grid gap-1 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <span className={`mono text-sm ${line.kind === "comment" ? "text-slate-500" : ""}`}>{line.source}</span>
                {line.kind === "error" ? <span className="text-sm font-semibold text-rose-600">{line.error}</span>
                  : line.kind === "comment" ? <span />
                    : <span className="mono break-all text-sm font-bold">{line.kind === "function" ? line.formatted : `${line.name ? `${line.name} = ` : "= "}${line.formatted}`}<span className="ml-2 text-xs font-normal text-slate-500">{line.type}</span></span>}
              </li>
            ))}
          </ol>
        )}
      </div>
      <aside className="sketch">
        <h2 className="font-extrabold">Workspace</h2>
        {!session ? <p className="mt-2 text-sm text-slate-500">Run the notebook to see every defined variable and function here.</p> : (
          <>
            <KeyValue items={session.variables.map((v) => ({ k: v.name, v: v.formatted }))} />
            {session.functions.length > 0 && <p className="mt-3 text-sm text-slate-600">Functions: <span className="mono">{session.functions.join(", ")}</span></p>}
          </>
        )}
      </aside>
    </PanelSwap>
  );
}

/* -------------------------------------------------------------------------- */

function SolvePanel({ angle, format }: { angle: "rad" | "deg" | "grad"; format: FormatOptions }) {
  const [equation, setEquation] = useState("x^3 - 2x - 5 = 0");
  const [variable, setVariable] = useState("x");
  const [known, setKnown] = useState("");
  const [guess, setGuess] = useState("1");
  const [lower, setLower] = useState("-1000");
  const [upper, setUpper] = useState("1000");
  const [single, setSingle] = useState<ReturnType<typeof solveEquation> | null>(null);
  const [system, setSystem] = useState("2x + y - z = 5\nx - y + 3z = 4\n3x + 2y + z = 10");
  const [unknowns, setUnknowns] = useState("x, y, z");
  const [sys, setSys] = useState<ReturnType<typeof solveLinearSystem> | null>(null);

  const candidates = useMemo(() => freeVariables(equation.replace("=", "-")), [equation]);
  function runSingle() {
    const scope = parseVariableAssignments(known, { angle });
    if (!scope.ok) { setSingle({ ok: false, error: scope.error }); return; }
    setSingle(solveEquation(equation, variable.trim() || "x", scope.scope, { angle, format, guess: Number(guess), lower: Number(lower), upper: Number(upper) }));
  }
  function runSystem() {
    const names = unknowns.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
    setSys(solveLinearSystem(system.split(/\n/), names));
  }
  return (
    <PanelSwap trigger="solve" className="mt-5 grid gap-5 lg:grid-cols-2">
      <div className="sketch">
        <h2 className="text-lg font-extrabold">Solve one equation</h2>
        <p className="mt-1 text-sm text-slate-600">Linear, quadratic and cubic equations are solved exactly (complex roots included). Anything else is scanned for sign changes and refined with Brent and Newton iterations.</p>
        <Field label="Equation" className="mt-3"><input className="input mono mt-1" value={equation} onChange={(e) => setEquation(e.target.value)} spellCheck={false} /></Field>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Solve for" hint={candidates.length > 1 ? `(found: ${candidates.join(", ")})` : undefined}><input className="input mono mt-1" value={variable} onChange={(e) => setVariable(e.target.value)} /></Field>
          <Field label="Known values" hint="optional, e.g. m = 2; g = 9.81"><input className="input mono mt-1" value={known} onChange={(e) => setKnown(e.target.value)} spellCheck={false} /></Field>
          <Field label="Starting guess"><input className="input mono mt-1" value={guess} onChange={(e) => setGuess(e.target.value)} inputMode="decimal" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Scan from"><input className="input mono mt-1" value={lower} onChange={(e) => setLower(e.target.value)} inputMode="decimal" /></Field>
            <Field label="to"><input className="input mono mt-1" value={upper} onChange={(e) => setUpper(e.target.value)} inputMode="decimal" /></Field>
          </div>
        </div>
        <button type="button" className="btn btn-primary mt-4" onClick={runSingle}><Icon name="bolt" size={16} /> Solve</button>
        {single && (
          <div className="result-panel is-revealed mt-4" role="status">
            {single.ok ? (
              <>
                <div className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">{single.solutions.length} solution{single.solutions.length === 1 ? "" : "s"} · {single.method}</div>
                <ul className="mt-2 space-y-1">
                  {single.solutions.map((s, i) => <li key={i} className="mono break-all text-lg font-extrabold">{variable} = {s.formatted}{s.residual !== undefined && s.residual > 1e-9 && <span className="ml-2 text-xs font-normal text-slate-500">residual {s.residual.toExponential(1)}</span>}</li>)}
                </ul>
              </>
            ) : <p className="font-semibold text-rose-600">{single.error}</p>}
          </div>
        )}
      </div>
      <div className="sketch">
        <h2 className="text-lg font-extrabold">Solve a linear system</h2>
        <p className="mt-1 text-sm text-slate-600">One equation per line. The coefficient matrix is extracted automatically and solved by LU decomposition; a non-linear or singular system is reported, not guessed.</p>
        <Field label="Equations" className="mt-3"><textarea className="textarea mt-1 !min-h-28" value={system} onChange={(e) => setSystem(e.target.value)} spellCheck={false} /></Field>
        <Field label="Unknowns" className="mt-3"><input className="input mono mt-1" value={unknowns} onChange={(e) => setUnknowns(e.target.value)} /></Field>
        <button type="button" className="btn btn-primary mt-4" onClick={runSystem}><Icon name="bolt" size={16} /> Solve system</button>
        {sys && (
          <div className="result-panel is-revealed mt-4" role="status">
            {sys.ok ? (
              <>
                <KeyValue items={Object.entries(sys.values).map(([k, v]) => ({ k, v: formatValue(v, format) }))} />
                <p className="mt-2 text-xs text-slate-500">Max residual {sys.residual.toExponential(2)}</p>
              </>
            ) : <p className="font-semibold text-rose-600">{sys.error}</p>}
          </div>
        )}
      </div>
    </PanelSwap>
  );
}

/* -------------------------------------------------------------------------- */

function CalculusPanel({ angle, format, seed, scope }: { angle: "rad" | "deg" | "grad"; format: FormatOptions; seed: string; scope: Record<string, unknown> }) {
  const [expr, setExpr] = useState(/\bx\b/.test(seed) ? seed : "x^3 - 3x + 1");
  const [at, setAt] = useState("1");
  const [lower, setLower] = useState("-3");
  const [upper, setUpper] = useState("3");
  const [order, setOrder] = useState("4");
  const [run, setRun] = useState<{ expr: string; at: number; lower: number; upper: number; order: number } | null>(null);
  const analysisScope = useMemo(() => { const s = { ...scope }; delete s.x; return s; }, [scope]);

  const out = useMemo(() => {
    if (!run) return null;
    const { expr, at, lower, upper, order } = run;
    const ok = Number.isFinite(lower) && Number.isFinite(upper) && lower < upper;
    return {
      value: evaluate(expr, { ...analysisScope, x: at }, { angle, format }),
      symbolic: symbolicDerivative(expr, "x"),
      second: symbolicDerivative(expr, "x", 2),
      derivative: numericDerivative(expr, "x", at, analysisScope, { angle, format }),
      integral: ok ? numericIntegral(expr, "x", lower, upper, analysisScope, { angle, format }) : null,
      roots: ok ? findRoots(expr, "x", lower, upper, analysisScope, { angle }) : null,
      extrema: ok ? findExtrema(expr, "x", lower, upper, analysisScope, { angle }) : null,
      taylor: taylorSeries(expr, "x", at, order, analysisScope),
      limit: numericLimit(expr, "x", at, analysisScope, { angle }),
      samples: ok ? sampleFunction(expr, "x", lower, upper, 320, analysisScope, { angle }) : null,
    };
  }, [run, analysisScope, angle, format]);

  const marks = useMemo(() => {
    if (!out) return [];
    const m: Array<{ x: number; y: number; label?: string; tone?: "root" | "min" | "max" }> = [];
    if (out.roots?.ok) for (const r of out.roots.roots) m.push({ x: r, y: 0, label: "root", tone: "root" });
    if (out.extrema?.ok) for (const e of out.extrema.extrema) m.push({ x: e.x, y: e.y, label: e.kind === "minimum" ? "min" : "max", tone: e.kind === "minimum" ? "min" : "max" });
    return m;
  }, [out]);

  return (
    <PanelSwap trigger="calculus" className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="sketch">
        <h2 className="text-lg font-extrabold">Calculus lab for f(x)</h2>
        <p className="mt-1 text-sm text-slate-600">Symbolic derivatives come from the computer-algebra layer; integrals use adaptive Gauss–Kronrod quadrature; roots and extrema are located by a sign-change scan with Brent refinement. Values from the Expression tab are available as constants.</p>
        <Field label="f(x)" className="mt-3"><input className="input mono mt-1" value={expr} onChange={(e) => setExpr(e.target.value)} spellCheck={false} /></Field>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="At x"><input className="input mono mt-1" value={at} onChange={(e) => setAt(e.target.value)} inputMode="decimal" /></Field>
          <Field label="From"><input className="input mono mt-1" value={lower} onChange={(e) => setLower(e.target.value)} inputMode="decimal" /></Field>
          <Field label="To"><input className="input mono mt-1" value={upper} onChange={(e) => setUpper(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Taylor order"><input className="input mono mt-1" value={order} onChange={(e) => setOrder(e.target.value)} inputMode="numeric" /></Field>
        </div>
        <button type="button" className="btn btn-primary mt-4" onClick={() => setRun({ expr, at: Number(at), lower: Number(lower), upper: Number(upper), order: Number(order) })}><Icon name="bolt" size={16} /> Analyse</button>
        {out && (
          <div className="result-panel is-revealed mt-4 space-y-3 text-sm" role="status">
            <Row k={`f(${run?.at})`} v={out.value.ok ? out.value.formatted : out.value.error} />
            <Row k="f′(x)" v={out.symbolic ?? "not available symbolically"} />
            <Row k="f″(x)" v={out.second ?? "—"} />
            <Row k={`f′(${run?.at})`} v={out.derivative.ok ? out.derivative.formatted : out.derivative.error} />
            <Row k={`lim x→${run?.at}`} v={out.limit.ok ? out.limit.formatted : out.limit.error} />
            {out.integral && <Row k={`∫ from ${run?.lower} to ${run?.upper}`} v={out.integral.ok ? <>{out.integral.formatted}<span className="ml-2 text-xs font-normal text-slate-500">{out.integral.diagnostic}</span></> : out.integral.error} />}
            {out.roots && <Row k="Roots" v={out.roots.ok ? (out.roots.roots.length ? out.roots.roots.map((r) => formatValue(r, format)).join(", ") : "none on this interval") : out.roots.error} />}
            {out.extrema && <Row k="Extrema" v={out.extrema.ok ? (out.extrema.extrema.length ? out.extrema.extrema.map((e) => `${e.kind} at x = ${formatValue(e.x, { precision: 8 })} (f = ${formatValue(e.y, { precision: 8 })})`).join("; ") : "none on this interval") : out.extrema.error} />}
            <Row k={`Taylor about ${run?.at}`} v={out.taylor.ok ? out.taylor.series : out.taylor.error} />
          </div>
        )}
      </div>
      <div className="sketch">
        <h2 className="text-lg font-extrabold">Plot</h2>
        {out?.samples?.ok ? <FunctionPlot className="mt-3" points={out.samples.points} marks={marks} label={`f(x) = ${run?.expr} on [${run?.lower}, ${run?.upper}] — roots and extrema marked`} height={300} />
          : <p className="mt-2 text-sm text-slate-500">{out?.samples && !out.samples.ok ? out.samples.error : "Press Analyse to draw f(x) with its roots and turning points."}</p>}
      </div>
    </PanelSwap>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="grid gap-1 sm:grid-cols-[10rem_minmax(0,1fr)]"><span className="font-semibold text-slate-600">{k}</span><span className="mono break-all font-bold text-[color:var(--ink)]">{v}</span></div>;
}

/* -------------------------------------------------------------------------- */

function DataPanel({ format }: { format: FormatOptions }) {
  const [text, setText] = useState("12.1, 11.8, 12.4, 12.0, 11.9, 12.6, 12.2, 11.7, 12.3, 12.0");
  const [pairs, setPairs] = useState("0 1.2\n1 1.9\n2 3.1\n3 3.8\n4 5.2\n5 6.1");
  const [ran, setRan] = useState(false);
  const stats = useMemo(() => (ran ? describe(parseNumberList(text)) : null), [ran, text]);
  const fit = useMemo(() => {
    if (!ran) return null;
    const rows = pairs.split(/\n/).map((r) => parseNumberList(r)).filter((r) => r.length >= 2);
    if (rows.length < 2) return null;
    const xs = rows.map((r) => r[0]), ys = rows.map((r) => r[1]);
    const r = evaluate("linreg(xs, ys)", { xs, ys });
    const p2 = evaluate("polyfit(xs, ys, 2)", { xs, ys });
    return { r, p2, n: rows.length };
  }, [ran, pairs]);
  const f = (v: number) => formatValue(v, format);
  return (
    <PanelSwap trigger="data" className="mt-5 grid gap-5 lg:grid-cols-2">
      <div className="sketch">
        <h2 className="text-lg font-extrabold">Descriptive statistics</h2>
        <Field label="Sample" hint="numbers separated by commas, spaces or new lines" className="mt-3"><textarea className="textarea mt-1 !min-h-24" value={text} onChange={(e) => setText(e.target.value)} /></Field>
        <button type="button" className="btn btn-primary mt-4" onClick={() => setRan(true)}><Icon name="bolt" size={16} /> Compute</button>
        {ran && (stats ? (
          <div className="result-panel is-revealed mt-4">
            <KeyValue items={[
              { k: "n", v: stats.n }, { k: "mean", v: f(stats.mean) }, { k: "std (sample)", v: f(stats.std) }, { k: "variance", v: f(stats.variance) },
              { k: "median", v: f(stats.median) }, { k: "Q1 / Q3", v: `${f(stats.q1)} / ${f(stats.q3)}` }, { k: "min / max", v: `${f(stats.min)} / ${f(stats.max)}` }, { k: "range", v: f(stats.range) },
              { k: "RMS", v: f(stats.rms) }, { k: "skewness", v: f(stats.skew) }, { k: "sum", v: f(stats.sum) }, { k: "CV", v: stats.mean !== 0 ? `${(100 * stats.std / Math.abs(stats.mean)).toFixed(2)} %` : "—" },
            ]} />
          </div>
        ) : <p className="mt-3 text-sm text-rose-600">Enter at least one number.</p>)}
      </div>
      <div className="sketch">
        <h2 className="text-lg font-extrabold">Regression</h2>
        <Field label="x y pairs" hint="one pair per line" className="mt-3"><textarea className="textarea mt-1 !min-h-24" value={pairs} onChange={(e) => setPairs(e.target.value)} /></Field>
        <button type="button" className="btn btn-primary mt-4" onClick={() => setRan(true)}><Icon name="bolt" size={16} /> Fit</button>
        {ran && fit && (
          <div className="result-panel is-revealed mt-4 space-y-2 text-sm">
            {fit.r.ok && Array.isArray(fit.r.value) ? (
              <>
                <Row k="Linear fit" v={`y = ${f(Number(fit.r.value[0]))}·x + ${f(Number(fit.r.value[1]))}`} />
                <Row k="R²" v={f(Number(fit.r.value[2]))} />
              </>
            ) : <p className="text-rose-600">{fit.r.ok ? "" : fit.r.error}</p>}
            {fit.p2.ok && Array.isArray(fit.p2.value) && fit.n > 3 && <Row k="Quadratic fit" v={`y = ${(fit.p2.value as number[]).map((c, i) => `${f(Number(c))}${i === 0 ? "·x²" : i === 1 ? "·x" : ""}`).join(" + ")}`} />}
          </div>
        )}
      </div>
    </PanelSwap>
  );
}

"use client";
import { useSearchParams } from "next/navigation";
import { findPreset, type ExpressionPreset } from "@/lib/presets";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  evaluateFormula, solveFormulaFor, sweepFormula, sensitivity, propagateUncertainty, missingVariables, simplifyExpression, symbolicDerivative,
  FORMULA_LIBRARY, findLibraryFormula, parseStoredVariables, formatValue, type FormulaVariable, type FormulaSpec, type FormatOptions,
} from "@/lib/engine";
import { Reveal, PanelSwap, Segmented } from "@/components/Motion";
import { ConfirmBar, ConfirmForm, LockedResult, useConfirmGate } from "@/components/Confirm";
import { Icon } from "@/components/Icons";
import { WakeLockToggle, ShareCopy } from "@/components/tech/BrowserTools";
import { SITE } from "@/lib/site";
import { ExpressionAssist } from "@/components/tech/MlAssist";
import { recordExpression } from "@/lib/ml/completion";
import { functionalStorage, optionalPurposeAllowed } from "@/lib/privacy/browser-consent";
import { useOptionalConsent } from "@/components/consent/use-consent";
import { CookieSettingsButton } from "@/components/consent/CookieSettingsButton";
import { EngineSettingsBar, Field, FunctionPlot, KeyValue, useEngineSettings } from "@/components/engine/EngineUi";

type Formula = { id: string; name: string; expression: string; description: string | null; tags: string | null; variables?: string | null };
type Analysis = "solve" | "sweep" | "sensitivity" | "uncertainty";

export default function FormulaPage() {
  const search = useSearchParams();
  return <FormulaWorkspace key={search.toString()} initial={findPreset(search.get("preset"))} library={findLibraryFormula(search.get("library"))} />;
}

function presetVariables(initial?: ExpressionPreset): FormulaVariable[] {
  return parseStoredVariables(null, initial?.variables ?? "P = 1000; r = 0.05; n = 12; t = 10");
}

function FormulaWorkspace({ initial, library }: { initial?: ExpressionPreset; library?: FormulaSpec }) {
  const functionalAllowed = useOptionalConsent("functional");
  const [settings, updateSettings] = useEngineSettings();
  const format: FormatOptions = useMemo(() => ({ notation: settings.notation, precision: settings.precision }), [settings.notation, settings.precision]);
  const [workspace, setWorkspace] = useState("");
  const [name, setName] = useState(library?.name ?? initial?.name ?? "Compound interest");
  const [description, setDescription] = useState(library?.description ?? initial?.description ?? "Future value with periodic compounding");
  const [expression, setExpression] = useState(library?.expression ?? initial?.expression ?? "P * (1 + r/n)^(n*t)");
  const [resultUnit, setResultUnit] = useState(library?.resultUnit ?? "");
  const [variables, setVariables] = useState<FormulaVariable[]>(library?.variables ?? presetVariables(initial));
  const [saved, setSaved] = useState<Formula[]>([]);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis>("solve");
  const [domain, setDomain] = useState("All");

  useEffect(() => {
    if (!functionalAllowed) { setWorkspace(""); setSaved([]); return; }
    const storage = functionalStorage();
    if (!storage) return;
    try {
      const existing = storage.getItem(SITE.storageKeys[0].key) || SITE.legacyStorageKeys.map((key) => storage.getItem(key)).find(Boolean);
      const ws = existing || "ws_" + crypto.randomUUID().replace(/-/g, "").slice(0, 24);
      storage.setItem(SITE.storageKeys[0].key, ws);
      setWorkspace(ws);
    } catch {
      setStatus({ kind: "err", text: "Browser storage is unavailable. You can still evaluate formulas without saving them." });
    }
  }, [functionalAllowed]);

  const load = useCallback(async () => {
    if (!workspace) return;
    try {
      const r = await fetch(`/api/formulas?workspace=${encodeURIComponent(workspace)}`);
      const j = await r.json();
      if (optionalPurposeAllowed("functional")) setSaved(j.items || []);
    } catch { /* noop */ }
  }, [workspace]);
  useEffect(() => { load(); }, [load]);

  const spec: FormulaSpec = useMemo(() => ({ name, expression, description, variables, resultUnit }), [name, expression, description, variables, resultUnit]);
  const missing = useMemo(() => missingVariables(expression, variables), [expression, variables]);
  const result = useMemo(() => (expression.trim() ? evaluateFormula(spec, { angle: settings.angle, format }) : { ok: false as const, error: "Enter an expression." }), [spec, expression, settings.angle, format]);
  const signature = JSON.stringify([expression, variables, resultUnit, settings]);
  const gate = useConfirmGate(signature, result.ok);
  const gateState = expression.trim().length === 0 ? "needs-input" : !result.ok ? "invalid" : gate.revealed ? "revealed" : "awaiting";
  const simplified = useMemo(() => simplifyExpression(expression), [expression]);
  useEffect(() => { if (gate.revealed) recordExpression(expression); }, [gate.revealed, expression]);

  const updateVariable = (index: number, patch: Partial<FormulaVariable>) => { setVariables((current) => current.map((v, i) => (i === index ? { ...v, ...patch } : v))); gate.reset(); };
  const removeVariable = (index: number) => { setVariables((current) => current.filter((_, i) => i !== index)); gate.reset(); };
  const addVariable = (name = "") => { setVariables((current) => [...current, { name, value: "" }]); gate.reset(); };
  const applyLibrary = (item: FormulaSpec) => {
    setName(item.name); setDescription(item.description ?? ""); setExpression(item.expression); setResultUnit(item.resultUnit ?? ""); setVariables(item.variables.map((v) => ({ ...v })));
    setStatus(null); gate.reset();
  };

  const save = async () => {
    if (!workspace || !optionalPurposeAllowed("functional")) return;
    setStatus(null); setSaving(true);
    try {
      const r = await fetch("/api/formulas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspace, name, expression, description, variables: { variables: variables.filter((v) => v.name.trim()), resultUnit } }) });
      if (!r.ok) throw new Error("save failed");
      setStatus({ kind: "ok", text: `Saved “${name}” with its ${variables.length} variable${variables.length === 1 ? "" : "s"}.` });
      load();
    } catch {
      setStatus({ kind: "err", text: "Could not save. Please try again." });
    } finally { setSaving(false); }
  };
  const remove = async (id: string) => { await fetch(`/api/formulas?id=${encodeURIComponent(id)}&workspace=${encodeURIComponent(workspace)}`, { method: "DELETE" }); load(); };
  const loadFormula = (f: Formula) => {
    let stored: { variables?: FormulaVariable[]; resultUnit?: string } | null = null;
    try { stored = f.variables ? JSON.parse(f.variables) : null; } catch { stored = null; }
    setName(f.name); setExpression(f.expression); setDescription(f.description || "");
    setResultUnit(stored?.resultUnit ?? "");
    setVariables(stored?.variables?.length ? stored.variables : missingVariables(f.expression, []).map((n) => ({ name: n, value: "" })));
    setStatus(null); gate.reset();
  };

  const domains = useMemo(() => ["All", ...Array.from(new Set(FORMULA_LIBRARY.map((f) => f.domain)))], []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-12">
      <Reveal>
        <h1 className="h-title text-4xl sm:text-5xl">Custom <span className="h-underline">formula</span></h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Write the method once, give every variable a value — with units if you like — and press <strong>Evaluate</strong>.
          Then solve the same formula for any variable, sweep a parameter, rank which inputs matter most, or propagate
          measurement uncertainty. Saving is optional; saved expressions can be downloaded or removed from the Privacy Policy.
        </p>
      </Reveal>

      <div className="sketch mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
        <EngineSettingsBar settings={settings} onChange={(patch) => { updateSettings(patch); gate.reset(); }} />
        <div className="ml-auto flex flex-wrap items-center gap-x-6 gap-y-3">
          <WakeLockToggle />
          <ShareCopy title="Custom formula" text={`Formula: ${expression}`} href="/tools/formula" />
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <div className="sketch space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name"><input id="f-name" className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <Field label="Description" hint="(optional)"><input id="f-desc" className="input mt-1" value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
            </div>

            <ConfirmForm onSubmit={gate.confirm} label="Formula evaluation">
              <div>
                <label htmlFor="f-expr" className="mb-1.5 block text-sm font-semibold text-slate-700">Expression</label>
                <textarea id="f-expr" className="textarea !min-h-20" value={expression} onChange={(e) => { setExpression(e.target.value); gate.reset(); }} placeholder="e.g. F * L^3 / (3 * E * I)" spellCheck={false} />
                <ExpressionAssist inputId="f-expr" expression={expression} variables={variables.map((v) => v.name)} onApply={(next) => { setExpression(next); gate.reset(); }} />
              </div>

              <div className="mt-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-700">Variables <span className="font-normal text-slate-500">— values may carry units (<span className="mono">2 kN</span>, <span className="mono">200 GPa</span>) and a ± uncertainty</span></span>
                  {missing.length > 0 && <button type="button" className="chip !min-h-8" onClick={() => missing.forEach((n) => addVariable(n))}><Icon name="plus" size={12} /> add {missing.join(", ")}</button>}
                </div>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[34rem] text-sm">
                    <thead className="text-left text-xs font-bold uppercase tracking-wider text-slate-500"><tr><th className="py-1 pr-2">Name</th><th className="py-1 pr-2">Value</th><th className="py-1 pr-2">± uncertainty</th><th className="py-1 pr-2">Meaning</th><th /></tr></thead>
                    <tbody>
                      {variables.map((v, i) => (
                        <tr key={i} className="align-top">
                          <td className="py-1 pr-2 w-24"><input className="input mono !min-h-10 !px-2" value={v.name} onChange={(e) => updateVariable(i, { name: e.target.value })} aria-label={`Variable ${i + 1} name`} spellCheck={false} /></td>
                          <td className="py-1 pr-2"><input className="input mono !min-h-10 !px-2" value={v.value} onChange={(e) => updateVariable(i, { value: e.target.value })} aria-label={`${v.name || "variable"} value`} spellCheck={false} /></td>
                          <td className="py-1 pr-2 w-32"><input className="input mono !min-h-10 !px-2" value={v.uncertainty ?? ""} onChange={(e) => updateVariable(i, { uncertainty: e.target.value })} aria-label={`${v.name || "variable"} uncertainty`} placeholder="—" spellCheck={false} /></td>
                          <td className="py-1 pr-2"><input className="input !min-h-10 !px-2" value={v.description ?? ""} onChange={(e) => updateVariable(i, { description: e.target.value })} aria-label={`${v.name || "variable"} description`} placeholder="optional" /></td>
                          <td className="py-1"><button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${v.name || "variable"}`} onClick={() => removeVariable(i)}><Icon name="trash" size={15} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <button type="button" className="btn btn-ghost !min-h-9" onClick={() => addVariable()}><Icon name="plus" size={15} /> Add variable</button>
                  <Field label="Result unit" hint="(optional)" className="flex items-center gap-2 !text-xs"><input className="input mono !min-h-9 !w-28 !px-2" value={resultUnit} onChange={(e) => { setResultUnit(e.target.value); gate.reset(); }} placeholder="e.g. mm" spellCheck={false} /></Field>
                </div>
              </div>

              <div id="formula-result" role="status" aria-live="polite" className={`result-panel mt-5 ${gate.revealed ? "is-revealed" : "is-locked"}`}>
                <div className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Result{gate.revealed && result.ok ? ` · ${result.type}` : ""}</div>
                {gate.revealed ? (
                  result.ok ? <div className="mono mt-2 break-all text-2xl font-extrabold sm:text-3xl">= {result.formatted}</div> : <div className="mt-2 font-semibold text-rose-600">{result.error}</div>
                ) : <div className="mt-2"><LockedResult label="Result hidden until you press Evaluate." /></div>}
                {gate.revealed && simplified && simplified !== expression && <div className="mt-3 text-sm text-slate-600">Simplified: <span className="mono break-all text-[color:var(--ink)]">{simplified}</span></div>}
                {gate.revealed && result.ok && variables.filter((v) => v.name.trim()).slice(0, 4).map((v) => {
                  const d = symbolicDerivative(expression, v.name.trim());
                  return d ? <div key={v.name} className="mt-1 text-xs text-slate-500">∂/∂{v.name}: <span className="mono text-slate-700">{d}</span></div> : null;
                })}
              </div>

              <ConfirmBar id="formula-confirm" action="Evaluate" state={gateState} onConfirm={gate.confirm} onReset={gate.reset} hint="Enter an expression and its values, then press Evaluate." errorText={result.ok ? "" : result.error} shownText="Result shown." />
            </ConfirmForm>

            {!functionalAllowed && <div className="rounded-lg border-2 border-dashed border-[color:var(--line)] p-3 text-sm" role="status">
              <p>Formula saving is off. You can evaluate normally without optional storage. Enable Functional preferences to remember a workspace and save formulas to the server.</p>
              <CookieSettingsButton className="mt-2 text-xs" />
            </div>}
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn btn-primary" onClick={save} disabled={saving || !workspace || !functionalAllowed || !name.trim() || !expression.trim()}>
                <Icon name="plus" size={17} />{saving ? "Saving…" : "Save formula"}
              </button>
              {status && <span role="status" className={`text-sm font-semibold ${status.kind === "ok" ? "text-[#146c3a]" : "text-rose-600"}`}>{status.text}</span>}
            </div>
          </div>

          <div className="sketch mt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold">Analyse this formula</h2>
              <Segmented<Analysis> size="sm" ariaLabel="Analysis" value={analysis} onChange={setAnalysis} options={[{ value: "solve", label: "Solve for…" }, { value: "sweep", label: "Sweep" }, { value: "sensitivity", label: "Sensitivity" }, { value: "uncertainty", label: "Uncertainty" }]} />
            </div>
            {analysis === "solve" && <SolveFor spec={spec} angle={settings.angle} format={format} />}
            {analysis === "sweep" && <Sweep spec={spec} angle={settings.angle} format={format} />}
            {analysis === "sensitivity" && <SensitivityPanel spec={spec} angle={settings.angle} format={format} />}
            {analysis === "uncertainty" && <UncertaintyPanel spec={spec} angle={settings.angle} format={format} />}
          </div>
        </Reveal>

        <Reveal delay={90}>
          <aside className="space-y-5">
            <div className="sketch">
              <h2 className="font-extrabold">Engineering library</h2>
              <p className="mt-1 text-xs text-slate-500">Ready-made formulas with typical values and units. Load one, then change what you need.</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {domains.map((d) => <button key={d} type="button" className={`chip !min-h-7 !text-[.66rem] ${domain === d ? "!bg-[color:var(--accent-3)]" : ""}`} aria-pressed={domain === d} onClick={() => setDomain(d)}>{d}</button>)}
              </div>
              <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto pr-1">
                {FORMULA_LIBRARY.filter((f) => domain === "All" || f.domain === domain).map((f) => (
                  <li key={f.id}>
                    <button type="button" className="w-full rounded-xl border border-[color:var(--line)] px-3 py-2 text-left row-hover" onClick={() => applyLibrary(f)}>
                      <span className="block text-sm font-bold">{f.name}</span>
                      <span className="mono block truncate text-xs text-slate-500">{f.expression}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="sketch">
              <h2 className="font-semibold">Saved in this browser ({saved.length})</h2>
              <p className="mt-1.5 text-xs text-slate-500">Saved formulas associated with this browser. <Link href="/privacy#your-data" className="font-bold underline decoration-2 underline-offset-2">Download or remove them</Link>.</p>
              {saved.length === 0 ? <p className="mt-4 text-sm text-slate-500">Nothing saved yet.</p> : (
                <ul className="mt-4 divide-y divide-[color:var(--line)]">
                  {saved.map((f) => (
                    <li key={f.id} className="flex items-start justify-between gap-3 py-2.5">
                      <button className="min-w-0 flex-1 text-left" onClick={() => loadFormula(f)}>
                        <div className="font-semibold">{f.name}</div>
                        <div className="mono truncate text-xs text-slate-500">{f.expression}</div>
                      </button>
                      <button className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600" onClick={() => remove(f.id)} aria-label={`Delete ${f.name}`}><Icon name="trash" size={15} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </Reveal>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */

type PanelProps = { spec: FormulaSpec; angle: "rad" | "deg" | "grad"; format: FormatOptions };

function variableNames(spec: FormulaSpec) { return spec.variables.map((v) => v.name.trim()).filter(Boolean); }

function SolveFor({ spec, angle, format }: PanelProps) {
  const names = variableNames(spec);
  const [unknown, setUnknown] = useState(names[0] ?? "");
  const [target, setTarget] = useState("");
  const [guess, setGuess] = useState("1");
  const [out, setOut] = useState<ReturnType<typeof solveFormulaFor> | null>(null);
  useEffect(() => { if (!names.includes(unknown)) setUnknown(names[0] ?? ""); }, [names, unknown]);
  return (
    <PanelSwap trigger="solve" className="mt-4">
      <p className="text-sm text-slate-600">Set the result you want and the engine finds the value of one variable that produces it, keeping every other variable at its current value. Units are honoured: the answer is reported in the unit the variable currently uses.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Field label="Unknown"><select className="select mt-1" value={unknown} onChange={(e) => setUnknown(e.target.value)}>{names.map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>
        <Field label="Result should equal" hint={spec.resultUnit ? `(e.g. 5 ${spec.resultUnit})` : undefined}><input className="input mono mt-1" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={spec.resultUnit ? `5 ${spec.resultUnit}` : "e.g. 2000"} /></Field>
        <Field label="Starting guess" hint="(non-linear cases)"><input className="input mono mt-1" value={guess} onChange={(e) => setGuess(e.target.value)} inputMode="decimal" /></Field>
      </div>
      <button type="button" className="btn btn-primary mt-3" disabled={!unknown || !target.trim()} onClick={() => setOut(solveFormulaFor(spec, unknown, target, { angle, format, guess: Number(guess) }))}><Icon name="bolt" size={16} /> Solve for {unknown || "…"}</button>
      {out && (
        <div className="result-panel is-revealed mt-3" role="status">
          {out.ok ? (<>
            <div className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">{out.method}</div>
            <ul className="mt-1 space-y-1">{out.solutions.map((s, i) => <li key={i} className="mono break-all text-lg font-extrabold">{unknown} = {s.formatted}</li>)}</ul>
          </>) : <p className="font-semibold text-rose-600">{out.error}</p>}
        </div>
      )}
    </PanelSwap>
  );
}

function Sweep({ spec, angle, format }: PanelProps) {
  const names = variableNames(spec);
  const [variable, setVariable] = useState(names[0] ?? "");
  const [from, setFrom] = useState("0");
  const [to, setTo] = useState("10");
  const [steps, setSteps] = useState("11");
  const [out, setOut] = useState<ReturnType<typeof sweepFormula> | null>(null);
  useEffect(() => { if (!names.includes(variable)) setVariable(names[0] ?? ""); }, [names, variable]);
  const points = useMemo(() => (out?.ok ? out.rows.map((r) => ({ x: r.input, y: r.output })) : []), [out]);
  return (
    <PanelSwap trigger="sweep" className="mt-4">
      <p className="text-sm text-slate-600">Vary one input across a range and tabulate the result — a quick design table or what-if curve.</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Variable"><select className="select mt-1" value={variable} onChange={(e) => setVariable(e.target.value)}>{names.map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>
        <Field label={`From${out?.ok && out.unit ? ` (${out.unit})` : ""}`}><input className="input mono mt-1" value={from} onChange={(e) => setFrom(e.target.value)} inputMode="decimal" /></Field>
        <Field label="To"><input className="input mono mt-1" value={to} onChange={(e) => setTo(e.target.value)} inputMode="decimal" /></Field>
        <Field label="Points"><input className="input mono mt-1" value={steps} onChange={(e) => setSteps(e.target.value)} inputMode="numeric" /></Field>
      </div>
      <button type="button" className="btn btn-primary mt-3" disabled={!variable} onClick={() => setOut(sweepFormula(spec, variable, Number(from), Number(to), Number(steps), { angle, format }))}><Icon name="bolt" size={16} /> Run sweep</button>
      {out && (out.ok ? (
        <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,1fr)_18rem]">
          <FunctionPlot points={points} label={`${spec.name || "result"} against ${variable}${out.unit ? ` (${out.unit})` : ""}`} height={240} />
          <div className="max-h-64 overflow-y-auto rounded-xl border-2 border-[color:var(--line)]">
            <table className="w-full text-sm"><thead className="sticky top-0 bg-[color:var(--paper-2)] text-left text-xs uppercase tracking-wider"><tr><th className="px-3 py-1.5">{variable}</th><th className="px-3 py-1.5">result</th></tr></thead>
              <tbody>{out.rows.map((r, i) => <tr key={i} className="border-t border-[color:var(--line)]"><td className="mono px-3 py-1">{formatValue(r.input, { precision: 8 })}</td><td className="mono px-3 py-1">{r.formatted}</td></tr>)}</tbody></table>
          </div>
        </div>
      ) : <p className="mt-3 text-sm font-semibold text-rose-600">{out.error}</p>)}
    </PanelSwap>
  );
}

function SensitivityPanel({ spec, angle, format }: PanelProps) {
  const [out, setOut] = useState<ReturnType<typeof sensitivity> | null>(null);
  return (
    <PanelSwap trigger="sensitivity" className="mt-4">
      <p className="text-sm text-slate-600">Which inputs drive the answer? Elasticity is the % change in the result per 1 % change in each variable (computed from partial derivatives at the current values, SI magnitudes).</p>
      <button type="button" className="btn btn-primary mt-3" onClick={() => setOut(sensitivity(spec, { angle, format }))}><Icon name="bolt" size={16} /> Rank inputs</button>
      {out && (out.ok ? (
        <ul className="mt-3 space-y-2">
          {out.items.map((item) => (
            <li key={item.name} className="rounded-xl border-2 border-[color:var(--line)] px-3 py-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm"><span className="mono font-extrabold">{item.name}</span><span className="text-slate-600">elasticity <span className="mono font-bold text-[color:var(--ink)]">{item.elasticity === null ? "—" : formatValue(item.elasticity, { precision: 5 })}</span> · ∂f/∂{item.name} = <span className="mono">{formatValue(item.partial, { precision: 6 })}</span></span></div>
              <div className="rive-meter mt-1.5"><span style={{ width: `${Math.round(item.share * 100)}%` }} /></div>
            </li>
          ))}
          {out.items.length === 0 && <li className="text-sm text-slate-500">No numeric variables influence this expression.</li>}
        </ul>
      ) : <p className="mt-3 text-sm font-semibold text-rose-600">{out.error}</p>)}
    </PanelSwap>
  );
}

function UncertaintyPanel({ spec, angle, format }: PanelProps) {
  const [out, setOut] = useState<ReturnType<typeof propagateUncertainty> | null>(null);
  const hasSigma = spec.variables.some((v) => v.uncertainty?.trim());
  return (
    <PanelSwap trigger="uncertainty" className="mt-4">
      <p className="text-sm text-slate-600">Fill the ± column for measured inputs. The engine propagates them to the result with first-order Gaussian error propagation and cross-checks the distribution with a seeded Monte-Carlo run (magnitudes in SI units).</p>
      <button type="button" className="btn btn-primary mt-3" disabled={!hasSigma} onClick={() => setOut(propagateUncertainty(spec, { angle, format }))}><Icon name="bolt" size={16} /> Propagate uncertainty</button>
      {!hasSigma && <p className="mt-2 text-xs text-slate-500">Add at least one ± value above to enable this.</p>}
      {out && (out.ok ? (
        <div className="result-panel is-revealed mt-3">
          <KeyValue items={[
            { k: "Mean (SI)", v: formatValue(out.result.mean, format) }, { k: "Std. deviation σ", v: formatValue(out.result.std, format) },
            { k: "Relative", v: out.result.relative === null ? "—" : `${(out.result.relative * 100).toFixed(2)} %` }, { k: "90 % interval", v: `${formatValue(out.result.p05, { precision: 6 })} … ${formatValue(out.result.p95, { precision: 6 })}` },
          ]} />
          <p className="mt-2 text-xs text-slate-500">{out.result.method}</p>
          <ul className="mt-3 space-y-1 text-sm">
            {out.result.contributions.map((c) => <li key={c.name} className="flex items-center gap-3"><span className="mono w-16 font-bold">{c.name}</span><span className="rive-meter flex-1"><span style={{ width: `${Math.round(c.share * 100)}%` }} /></span><span className="w-14 text-right text-xs text-slate-600">{(c.share * 100).toFixed(0)} %</span></li>)}
          </ul>
        </div>
      ) : <p className="mt-3 text-sm font-semibold text-rose-600">{out.error}</p>)}
    </PanelSwap>
  );
}

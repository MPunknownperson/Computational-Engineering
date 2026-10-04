"use client";
import { useSearchParams } from "next/navigation";
import { findPreset, type ExpressionPreset } from "@/lib/presets";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { safeEvaluate, simplify, numericDerivative, parseVariableAssignments } from "@/lib/math";
import { Reveal } from "@/components/Motion";
import { ConfirmBar, ConfirmForm, LockedResult, useConfirmGate } from "@/components/Confirm";
import { Icon } from "@/components/Icons";
import { WakeLockToggle, ShareCopy } from "@/components/tech/BrowserTools";
import { SITE } from "@/lib/site";

type Formula = {
  id: string;
  name: string;
  expression: string;
  description: string | null;
  tags: string | null;
};

export default function FormulaPage() {
  const search = useSearchParams();
  return <FormulaWorkspace key={search.toString()} initial={findPreset(search.get("preset"))} />;
}

function FormulaWorkspace({ initial }: { initial?: ExpressionPreset }) {
  const [workspace, setWorkspace] = useState("");
  const [name, setName] = useState(initial?.name ?? "Compound interest");
  const [description, setDescription] = useState(initial?.description ?? "Future value with periodic compounding");
  const [expression, setExpression] = useState(initial?.expression ?? "P * (1 + r/n)^(n*t)");
  const [scopeText, setScopeText] = useState(initial?.variables ?? "P = 1000; r = 0.05; n = 12; t = 10");
  const [saved, setSaved] = useState<Formula[]>([]);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Read the current key, falling back to earlier brand keys so returning
    // visitors keep the formulas they saved before the rename.
    const existing =
      localStorage.getItem(SITE.storageKeys[0].key) ||
      SITE.legacyStorageKeys.map((k) => localStorage.getItem(k)).find(Boolean) ||
      null;
    const ws = existing || "ws_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(SITE.storageKeys[0].key, ws);
    setWorkspace(ws);
  }, []);

  const load = useCallback(async () => {
    if (!workspace) return;
    try {
      const r = await fetch(`/api/formulas?workspace=${encodeURIComponent(workspace)}`);
      const j = await r.json();
      setSaved(j.items || []);
    } catch { /* noop */ }
  }, [workspace]);

  useEffect(() => { load(); }, [load]);

  const variables = useMemo(() => parseVariableAssignments(scopeText), [scopeText]);
  const scope = useMemo(() => (variables.ok ? variables.scope : {}), [variables]);
  const isValid = expression.trim().length > 0 && variables.ok;
  // Evaluated while typing; revealed only after the visitor confirms.
  const result = useMemo(
    () => isValid ? safeEvaluate(expression, scope) : { ok: false as const, error: variables.ok ? "Enter an expression." : variables.error },
    [expression, isValid, scope, variables],
  );
  const gate = useConfirmGate(`${expression}|${scopeText}`, isValid && result.ok);
  const gateState = !variables.ok || expression.trim().length === 0
    ? "needs-input"
    : !result.ok ? "invalid"
      : gate.revealed ? "revealed" : "awaiting";
  // Heavier symbolic work runs on a deferred value so typing stays fluid.
  const deferredExpression = useDeferredValue(expression);
  const simplified = useMemo(() => variables.ok ? simplify(deferredExpression, scope) : null, [deferredExpression, scope, variables.ok]);
  const deriv = useMemo(() => variables.ok ? numericDerivative(deferredExpression, "x", 0, scope) : null, [deferredExpression, scope, variables.ok]);
  const usesX = /\bx\b/.test(deferredExpression);

  const save = async () => {
    setStatus(null);
    setSaving(true);
    try {
      const r = await fetch("/api/formulas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace, name, expression, description }),
      });
      if (!r.ok) throw new Error("save failed");
      setStatus({ kind: "ok", text: `Saved “${name}”.` });
      load();
    } catch {
      setStatus({ kind: "err", text: "Could not save. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    await fetch(
      `/api/formulas?id=${encodeURIComponent(id)}&workspace=${encodeURIComponent(workspace)}`,
      { method: "DELETE" },
    );
    load();
  };

  const loadFormula = (f: Formula) => {
    setName(f.name);
    setExpression(f.expression);
    setDescription(f.description || "");
    setStatus(null);
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <Reveal>
        <h1 className="h-title text-4xl sm:text-5xl">
          Custom <span className="h-underline">formula</span>
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Enter an expression and values for its variables, then review the result. The tool can show
          a simplified form and estimate a derivative. Saving is optional; saved expressions can be
          downloaded or removed from the Privacy Notice.
        </p>
      </Reveal>

      <div className="sketch mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
        <WakeLockToggle />
        <ShareCopy
          title="Custom formula"
          text={`Formula: ${expression}`}
          href="/tools/formula"
        />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <div className="sketch space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="f-name" className="mb-1.5 block text-sm font-semibold text-slate-700">Name</label>
                <input id="f-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="f-desc" className="mb-1.5 block text-sm font-semibold text-slate-700">Description (optional)</label>
                <input id="f-desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>

            <ConfirmForm onSubmit={gate.confirm} label="Formula evaluation">
            <div>
              <label htmlFor="f-expr" className="mb-1.5 block text-sm font-semibold text-slate-700">Expression</label>
              <textarea
                id="f-expr"
                className="textarea"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="e.g. P * (1 + r/n)^(n*t)"
                spellCheck={false}
              />
            </div>

            <div>
              <label htmlFor="f-vars" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Variables <span className="font-normal text-slate-400">— separate assignments with semicolons, e.g. P = 1000; r = 0.05</span>
              </label>
              <input id="f-vars" className="input mono" value={scopeText} onChange={(e) => setScopeText(e.target.value)} spellCheck={false} />
              {!variables.ok && <p role="alert" className="mt-2 text-sm font-semibold text-rose-600">{variables.error}</p>}
            </div>

            <div
              id="formula-result"
              role="status"
              aria-live="polite"
              className={`result-panel ${gate.revealed ? "is-revealed" : "is-locked"}`}
            >
              <div className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Result</div>
              {gate.revealed ? (
                result.ok ? (
                  <div className="mono mt-2 break-all text-2xl font-extrabold sm:text-3xl">= {result.formatted}</div>
                ) : (
                  <div className="mt-2 font-semibold text-rose-600">{result.error}</div>
                )
              ) : (
                <div className="mt-2"><LockedResult label="Result hidden until you press Evaluate." /></div>
              )}
              {gate.revealed && simplified && simplified !== expression && (
                <div className="mt-3 text-sm text-slate-600">
                  Simplified: <span className="mono break-all text-[color:var(--ink)]">{simplified}</span>
                </div>
              )}
              {gate.revealed && usesX && (
                <div className="mt-2 text-xs text-slate-500">
                  Derivative with respect to x at x = 0 (numerical estimate):{" "}
                  <span className="mono font-semibold text-slate-700">
                    {!deriv ? "—" : deriv.ok ? deriv.formatted : deriv.error}
                  </span>
                </div>
              )}
            </div>

            <ConfirmBar
              id="formula-confirm"
              action="Evaluate"
              state={gateState}
              onConfirm={gate.confirm}
              onReset={gate.reset}
              hint="Enter an expression and its values, then press Evaluate."
              errorText={result.ok ? "" : result.error}
              shownText="Result shown."
            />
            </ConfirmForm>

            <div className="flex flex-wrap items-center gap-3">
              <button className="btn btn-primary" onClick={save} disabled={saving || !name.trim() || !expression.trim()}>
                <Icon name="plus" size={17} />
                {saving ? "Saving…" : "Save formula"}
              </button>
              {status && (
                <span role="status" className={`text-sm font-semibold ${status.kind === "ok" ? "text-[#146c3a]" : "text-rose-600"}`}>
                  {status.text}
                </span>
              )}
            </div>
          </div>
        </Reveal>

        <Reveal delay={90}>
          <aside className="sketch">
            <h2 className="font-semibold">Saved in this browser ({saved.length})</h2>
            <p className="mt-1.5 text-xs text-slate-500">
              Saved formulas associated with this browser.{" "}
              <Link href="/privacy#your-data" className="font-bold underline decoration-2 underline-offset-2">Download or remove them</Link>.
            </p>

            {saved.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Nothing saved yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-[color:var(--line)]">
                {saved.map((f) => (
                  <li key={f.id} className="flex items-start justify-between gap-3 py-2.5">
                    <button className="min-w-0 flex-1 text-left" onClick={() => loadFormula(f)}>
                      <div className="font-semibold">{f.name}</div>
                      <div className="mono truncate text-xs text-slate-500">{f.expression}</div>
                    </button>
                    <button
                      className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                      onClick={() => remove(f.id)}
                      aria-label={`Delete ${f.name}`}
                    >
                      <Icon name="trash" size={15} />
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

function parseScope(text: string): Record<string, number> {
  const out: Record<string, number> = {};
  text.split(",").forEach((p) => {
    const [k, v] = p.split("=").map((s) => s.trim());
    if (k && v) {
      const n = Number(v);
      if (!Number.isNaN(n)) out[k] = n;
    }
  });
  return out;
}

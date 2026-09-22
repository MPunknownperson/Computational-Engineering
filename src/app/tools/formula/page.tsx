"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { safeEvaluate, simplify, numericDerivative } from "@/lib/math";

type Formula = {
  id: string;
  name: string;
  expression: string;
  description: string | null;
  tags: string | null;
};

export default function FormulaPage() {
  const [workspace, setWorkspace] = useState<string>("");
  const [name, setName] = useState("Compound interest");
  const [description, setDescription] = useState("Future value with periodic compounding");
  const [expression, setExpression] = useState("P * (1 + r/n)^(n*t)");
  const [scopeText, setScopeText] = useState("P = 1000, r = 0.05, n = 12, t = 10");
  const [saved, setSaved] = useState<Formula[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const existing = localStorage.getItem("numeriq.workspace");
    const ws = existing || "ws_" + Math.random().toString(36).slice(2, 10);
    if (!existing) localStorage.setItem("numeriq.workspace", ws);
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

  const scope = useMemo(() => parseScope(scopeText), [scopeText]);
  const result = useMemo(() => safeEvaluate(expression, scope), [expression, scope]);
  const simplified = useMemo(() => simplify(expression), [expression]);
  const deriv = useMemo(() => numericDerivative(expression, "x", 0), [expression]);

  const save = async () => {
    setErr(null); setInfo(null);
    try {
      const r = await fetch("/api/formulas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace, name, expression, description }),
      });
      if (!r.ok) throw new Error("save failed");
      setInfo("Saved ✓");
      load();
    } catch {
      setErr("Could not save.");
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/formulas?id=${encodeURIComponent(id)}&workspace=${encodeURIComponent(workspace)}`, { method: "DELETE" });
    load();
  };

  const loadFormula = (f: Formula) => {
    setName(f.name);
    setExpression(f.expression);
    setDescription(f.description || "");
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="h-title text-4xl">
        <span className="h-underline">Custom</span> formula
      </h1>
      <p className="mt-2 text-slate-600 max-w-3xl">
        Write your own expression, give it a name, and save it for later. The
        engine evaluates it with <span className="mono">mathjs</span>, can
        simplify it symbolically, and can compute numerical derivatives on
        demand — effectively feeding your formula into an AI-style calculation
        pipeline.
      </p>

      <div className="mt-6 grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 sketch bg-white p-5 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Description</label>
              <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Expression</label>
            <textarea
              className="textarea"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder="Type any mathjs expression…"
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {[
                ["sin(x)", "sin(x)"], ["sqrt(x)", "sqrt(x)"], ["log(x)", "log(x)"],
                ["sum([x^2 for x=1:5])", "sum([x^2 for x=1:5])"],
                ["P*(1+r)^t", "compound"], ["a*x^2+b*x+c", "quadratic"],
              ].map(([ins, lbl]) => (
                <button key={lbl} className="btn btn-ghost text-xs mono" onClick={() => setExpression(ins)}>{ins}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Variables <span className="text-slate-500 font-normal">(e.g. P = 1000, r = 0.05)</span>
            </label>
            <input className="input mono" value={scopeText} onChange={(e) => setScopeText(e.target.value)} />
          </div>

          <div className="p-4 sketch-sm bg-[color:var(--paper-2)]">
            <div className="text-xs uppercase tracking-wide font-semibold text-slate-500">Evaluation</div>
            {result.ok ? (
              <div className="mono text-2xl font-bold mt-1 break-all">= {result.formatted}</div>
            ) : (
              <div className="text-[color:var(--accent)] font-semibold mt-1">{result.error}</div>
            )}
            {simplified && simplified !== expression && (
              <div className="mt-2 text-sm text-slate-600">
                Simplified: <span className="mono">{simplified}</span>
              </div>
            )}
            <div className="mt-2 text-xs text-slate-500">
              ∂/∂x at x=0: <span className="mono">{deriv.ok ? deriv.formatted : deriv.error}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button className="btn btn-primary" onClick={save}>Save formula</button>
            <button className="btn" onClick={() => {
              navigator.clipboard?.writeText(expression);
              setInfo("Copied ✓");
              setTimeout(() => setInfo(null), 1500);
            }}>Copy expression</button>
            {info && <span className="text-sm text-emerald-600 font-semibold">{info}</span>}
            {err && <span className="text-sm text-[color:var(--accent)] font-semibold">{err}</span>}
          </div>
        </div>

        <aside className="sketch bg-white p-5">
          <h3 className="font-bold flex items-center gap-2">
            Your formulas
            <span className="chip">{saved.length}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Workspace: <span className="mono">{workspace}</span>
          </p>
          {saved.length === 0 ? (
            <p className="text-sm text-slate-500 mt-3">Nothing saved yet. Click “Save formula”.</p>
          ) : (
            <ul className="mt-3 divide-y divide-black/5">
              {saved.map((f) => (
                <li key={f.id} className="py-2">
                  <button className="text-left w-full" onClick={() => loadFormula(f)}>
                    <div className="font-semibold">{f.name}</div>
                    <div className="mono text-xs text-slate-500 truncate">{f.expression}</div>
                  </button>
                  <button
                    className="text-xs text-rose-600 mt-1"
                    onClick={() => remove(f.id)}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
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

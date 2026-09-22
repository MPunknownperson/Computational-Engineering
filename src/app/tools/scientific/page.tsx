"use client";
import { useEffect, useMemo, useState } from "react";
import { safeEvaluate, numericDerivative, simplify } from "@/lib/math";

export default function ScientificPage() {
  const [expr, setExpr] = useState("sin(pi/4)^2 + cos(pi/4)^2");
  const [scopeText, setScopeText] = useState("x = 2, y = 5");
  const result = useMemo(() => {
    const scope = parseScope(scopeText);
    return safeEvaluate(expr, scope);
  }, [expr, scopeText]);

  const simplified = useMemo(() => simplify(expr), [expr]);
  const [derivAt, setDerivAt] = useState("0");
  const deriv = useMemo(() => {
    const at = Number(derivAt);
    if (!Number.isFinite(at)) return null;
    return numericDerivative(expr, "x", at);
  }, [expr, derivAt]);

  const [history, setHistory] = useState<{ expr: string; value: string }[]>([]);
  useEffect(() => {
    if (result.ok) {
      setHistory((h) => [{ expr, value: result.formatted }, ...h].slice(0, 12));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.ok && result.ok ? result.formatted : null]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="h-title text-4xl">
        <span className="h-underline">Scientific</span> calculator
      </h1>
      <p className="mt-2 text-slate-600">
        Type any mathematical expression. Supports trig, logs, roots,
        constants (<span className="mono">pi, e</span>), matrices, units, and
        custom variables defined below.
      </p>

      <div className="mt-6 grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 sketch bg-white p-5">
          <label className="block text-sm font-semibold mb-1">Expression</label>
          <input
            className="input mono text-lg"
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            placeholder="e.g. sqrt(2) * log(100, 10)"
          />

          <label className="block text-sm font-semibold mt-4 mb-1">
            Variables <span className="text-slate-500 font-normal">(comma-separated assignments)</span>
          </label>
          <input
            className="input mono"
            value={scopeText}
            onChange={(e) => setScopeText(e.target.value)}
            placeholder="x = 2, y = 5"
          />

          <div className="mt-5 p-4 sketch-sm bg-[color:var(--paper-2)]">
            <div className="text-xs uppercase tracking-wide font-semibold text-slate-500">Result</div>
            {result.ok ? (
              <div className="mono text-2xl font-bold mt-1 break-all">= {result.formatted}</div>
            ) : (
              <div className="text-[color:var(--accent)] font-semibold mt-1">{result.error}</div>
            )}
            {simplified && simplified !== expr && (
              <div className="mt-2 text-sm text-slate-600">
                Simplified: <span className="mono">{simplified}</span>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {SNIPPETS.map((s) => (
              <button
                key={s.label}
                className="btn btn-ghost text-sm"
                onClick={() => setExpr(s.expr)}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <div className="sketch-sm p-3 bg-white">
              <div className="text-sm font-semibold">Numerical derivative ∂/∂x at x =</div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  className="input mono"
                  value={derivAt}
                  onChange={(e) => setDerivAt(e.target.value)}
                />
                <span className="mono text-sm">
                  {deriv?.ok ? `= ${deriv.formatted}` : deriv?.error || "—"}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Tip: include <span className="mono">x</span> in your expression.
              </div>
            </div>
            <div className="sketch-sm p-3 bg-white">
              <div className="text-sm font-semibold">Quick reference</div>
              <ul className="text-xs text-slate-600 mt-1 space-y-0.5 mono">
                <li>sqrt(x), cbrt(x), pow(a,b)</li>
                <li>sin, cos, tan, asin, acos, atan</li>
                <li>log(x), log(x, base), exp(x)</li>
                <li>pi, e, i (imaginary)</li>
                <li>5 km to mi &nbsp;|&nbsp; 72 degF to degC</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="sketch bg-white p-5">
          <h3 className="font-bold">Recent</h3>
          {history.length === 0 ? (
            <p className="text-sm text-slate-500 mt-2">Results appear here as you type.</p>
          ) : (
            <ul className="mt-2 divide-y divide-black/5">
              {history.map((h, i) => (
                <li key={i} className="py-2 text-sm">
                  <div className="mono text-xs text-slate-500 truncate">{h.expr}</div>
                  <div className="mono font-semibold">= {h.value}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
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

const SNIPPETS = [
  { label: "Pythagoras", expr: "sqrt(a^2 + b^2)" },
  { label: "Compound interest", expr: "P * (1 + r/n)^(n*t)" },
  { label: "Quadratic root", expr: "(-b + sqrt(b^2 - 4*a*c)) / (2*a)" },
  { label: "Unit convert", expr: "100 km/h to mph" },
  { label: "Integral (numeric)", expr: "sum([sqrt(1-x^2) for x=0:0.01:1]) * 0.01" },
];

"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ConfirmBar, ConfirmForm, LockedResult, useConfirmGate } from "@/components/Confirm";
import { safeEvaluate, parseVariableAssignments } from "@/lib/math";
import { convertPrecise, convertTemperaturePrecise, FACTORS } from "@/lib/units";
import type { LandingPage } from "@/lib/landing";

type ConvertWidget = Extract<LandingPage["widget"], { type: "convert" }>;
type CalculateWidget = Extract<LandingPage["widget"], { type: "calculate" }>;
type ReferenceWidget = Extract<LandingPage["widget"], { type: "reference" }>;

function formatDecimal(value: string): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  if (number === 0) return "0";
  const abs = Math.abs(number);
  if (abs >= 1e15 || abs < 1e-9) return number.toExponential(10).replace(/\.0+e/, "e");
  return Number(number.toPrecision(14)).toLocaleString(undefined, { maximumFractionDigits: 12 });
}

/** Compact converter preloaded for one intent; result appears on Convert. */
export function ConvertWidget({ widget, toolHref }: { widget: ConvertWidget; toolHref: string }) {
  const [value, setValue] = useState(widget.value);
  const isTemperature = widget.category === "temperature";
  const choicesValid = value.trim().length > 0 && value.length <= 120;

  const output = useMemo(() => {
    if (!choicesValid) return { ok: false as const, error: "Enter a number." };
    return isTemperature
      ? convertTemperaturePrecise(value, widget.from as "C" | "F" | "K", widget.to as "C" | "F" | "K")
      : convertPrecise(widget.category as Exclude<keyof typeof FACTORS, "temperature">, value, widget.from, widget.to);
  }, [choicesValid, isTemperature, value, widget]);

  const gate = useConfirmGate(`${widget.from}|${widget.to}|${value}`, choicesValid && output.ok);
  const state = !choicesValid || !output.ok ? "invalid" : gate.revealed ? "revealed" : "awaiting";

  return (
    <div className="sketch">
      <ConfirmForm onSubmit={gate.confirm} label={`${widget.fromLabel} to ${widget.toLabel} conversion`}>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <div>
            <label htmlFor={`landing-value-${widget.from}-${widget.to}`} className="mb-1.5 block text-sm font-semibold text-slate-700">
              {widget.fromLabel}
            </label>
            <input
              id={`landing-value-${widget.from}-${widget.to}`}
              className="input mono !text-xl !font-bold"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputMode="decimal"
            />
          </div>
          <div className="hidden text-center font-extrabold text-slate-400 sm:block" aria-hidden="true">→</div>
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">{widget.toLabel}</span>
            <div role="status" aria-live="polite" className={`result-panel flex min-h-[54px] items-center ${gate.revealed ? "is-revealed" : "is-locked"}`}>
              {gate.revealed && output.ok
                ? <span className="mono break-all text-xl font-extrabold sm:text-2xl">{formatDecimal(output.value)}</span>
                : <LockedResult label="Converted value hidden until you press Convert." />}
            </div>
          </div>
        </div>
        <ConfirmBar
          id={`landing-convert-${widget.from}-${widget.to}`}
          action="Convert"
          state={state}
          onConfirm={gate.confirm}
          onReset={gate.reset}
          hint="Enter a value, then press Convert."
          errorText={output.ok ? "" : output.error}
        />
      </ConfirmForm>
      <p className="mt-4 text-xs text-slate-500">
        Need more units? <Link href={toolHref} className="font-bold underline underline-offset-4">Open the full converter</Link>.
      </p>
    </div>
  );
}

/** Compact formula evaluator preloaded for one intent; result appears on Evaluate. */
export function CalculateWidget({ widget, toolHref }: { widget: CalculateWidget; toolHref: string }) {
  const [expression, setExpression] = useState(widget.expression);
  const [variablesText, setVariablesText] = useState(widget.variables);

  const variables = useMemo(() => parseVariableAssignments(variablesText), [variablesText]);
  const scope = useMemo(() => (variables.ok ? variables.scope : {}), [variables]);
  const isValid = expression.trim().length > 0 && variables.ok;
  const result = useMemo(
    () => isValid ? safeEvaluate(expression, scope) : { ok: false as const, error: variables.ok ? "Enter an expression." : variables.error },
    [expression, isValid, scope, variables],
  );

  const gate = useConfirmGate(`${expression}|${variablesText}`, isValid && result.ok);
  const state = !variables.ok || expression.trim().length === 0 ? "needs-input" : !result.ok ? "invalid" : gate.revealed ? "revealed" : "awaiting";

  return (
    <div className="sketch">
      <ConfirmForm onSubmit={gate.confirm} label={`${widget.name ?? "Formula"} calculation`}>
        <div>
          <label htmlFor={`landing-expr-${widget.preset}`} className="mb-1.5 block text-sm font-semibold text-slate-700">Expression</label>
          <input
            id={`landing-expr-${widget.preset}`}
            className="input mono"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
        </div>
        <div className="mt-4">
          <label htmlFor={`landing-vars-${widget.preset}`} className="mb-1.5 block text-sm font-semibold text-slate-700">
            Values <span className="font-normal text-slate-500">— separate with semicolons</span>
          </label>
          <input
            id={`landing-vars-${widget.preset}`}
            className="input mono"
            value={variablesText}
            onChange={(e) => setVariablesText(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
          {!variables.ok && <p role="alert" className="mt-2 text-sm font-semibold text-rose-600">{variables.error}</p>}
        </div>
        <div role="status" aria-live="polite" className={`result-panel mt-4 ${gate.revealed ? "is-revealed" : "is-locked"}`}>
          <div className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Result</div>
          {gate.revealed
            ? result.ok
              ? <div className="mono mt-2 break-all text-2xl font-extrabold">= {result.formatted}</div>
              : <div className="mt-2 font-semibold text-rose-600">{result.error}</div>
            : <div className="mt-2"><LockedResult label="Result hidden until you press Evaluate." /></div>}
        </div>
        <ConfirmBar
          id={`landing-calc-${widget.preset}`}
          action="Evaluate"
          state={state}
          onConfirm={gate.confirm}
          onReset={gate.reset}
          hint="Enter the expression and values, then press Evaluate."
          errorText={result.ok ? "" : result.error}
        />
      </ConfirmForm>
      <p className="mt-4 text-xs text-slate-500">
        Want simplification, history or saving? <Link href={toolHref} className="font-bold underline underline-offset-4">Open it in the formula tool</Link>.
      </p>
    </div>
  );
}

function money(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}

/** Compact reference viewer: data is fetched only after the visitor confirms. */
export function ReferenceWidget({ widget, toolHref }: { widget: ReferenceWidget; toolHref: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [lines, setLines] = useState<{ label: string; value: string }[]>([]);
  const [note, setNote] = useState<string>("");

  async function show() {
    setStatus("loading");
    try {
      if (widget.feed === "economy") {
        const response = await fetch(`/api/economy?country=${encodeURIComponent(widget.params.country)}&indicator=${encodeURIComponent(widget.params.indicator)}`);
        if (!response.ok) throw new Error("unavailable");
        const payload = await response.json();
        if (!payload.latest) throw new Error("empty");
        const unit = widget.params.indicator === "population" ? "" : widget.params.indicator === "gdp_per_capita" ? "USD" : "%";
        const formatted = widget.params.indicator === "population"
          ? Math.round(payload.latest.value).toLocaleString()
          : widget.params.indicator === "gdp_per_capita"
            ? money(payload.latest.value)
            : `${Number(payload.latest.value).toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit}`;
        setLines([
          { label: "Latest value", value: formatted },
          { label: "Reference year", value: String(payload.latest.year) },
          { label: "Observations", value: String(payload.series?.length ?? 0) },
        ]);
        setNote("Published figures lag the present and may be revised.");
      } else if (widget.feed === "currency") {
        const response = await fetch(`/api/fx?base=${encodeURIComponent(widget.params.base)}&symbols=${encodeURIComponent(widget.params.to)}`);
        if (!response.ok) throw new Error("unavailable");
        const payload = await response.json();
        const rate = payload?.rates?.[widget.params.to];
        if (typeof rate !== "number") throw new Error("empty");
        const amount = Number(widget.params.amount);
        setLines([
          { label: "Converted amount", value: `${(amount * rate).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${widget.params.to}` },
          { label: "Reference rate", value: `1 ${widget.params.base} = ${rate.toFixed(4)} ${widget.params.to}` },
          { label: "Reference date", value: String(payload.date ?? "not published") },
        ]);
        setNote("A reference value, not a dealing quote.");
      } else {
        const response = await fetch("/api/crypto");
        if (!response.ok) throw new Error("unavailable");
        const payload = await response.json();
        const asset = (payload.items ?? []).find((item: { id: string }) => item.id === widget.params.id);
        if (!asset) throw new Error("empty");
        const change = asset.price_change_percentage_24h;
        setLines([
          { label: "Price", value: money(asset.current_price) },
          { label: "Daily change", value: change === null ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%` },
          { label: "Name", value: `${asset.name} (${String(asset.symbol).toUpperCase()})` },
        ]);
        setNote("Values move quickly; this is a reference snapshot.");
      }
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="sketch">
      <p className="text-sm text-slate-600">{widget.blurb}</p>
      {status !== "ready" && status !== "loading" && (
        <button type="button" className="btn btn-primary mt-4" onClick={show}>
          {status === "error" ? "Try again" : "Show the figure"}
        </button>
      )}
      {status === "loading" && (
        <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-600" role="status">
          <span className="confirm-dot" aria-hidden /> Retrieving the latest published figure…
        </div>
      )}
      {status === "error" && (
        <p role="alert" className="mt-4 text-sm font-semibold text-rose-600">
          This information is temporarily unavailable. Try again later, or open the full tool below.
        </p>
      )}
      {status === "ready" && (
        <dl className="result-panel is-revealed mt-4 space-y-2" aria-live="polite">
          {lines.map((line) => (
            <div key={line.label} className="flex items-baseline justify-between gap-4">
              <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">{line.label}</dt>
              <dd className="mono text-right font-extrabold">{line.value}</dd>
            </div>
          ))}
          <p className="pt-1 text-xs text-slate-500">{note}</p>
        </dl>
      )}
      <p className="mt-4 text-xs text-slate-500">
        More context lives in the full tool: <Link href={toolHref} className="font-bold underline underline-offset-4">open it here</Link>.
      </p>
    </div>
  );
}

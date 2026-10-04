"use client";
import { useSearchParams } from "next/navigation";
import { unitInput, type UnitInput } from "@/lib/presets";
import { useMemo, useState } from "react";
import { bignumber } from "mathjs";
import {
  CATEGORIES, FACTORS, TEMPERATURE_UNITS, type Category,
  convertPrecise, convertTemperaturePrecise,
} from "@/lib/units";
import { Segmented, Reveal, PanelSwap } from "@/components/Motion";
import { ConfirmBar, ConfirmForm, LockedResult, useConfirmGate } from "@/components/Confirm";
import { Icon } from "@/components/Icons";
import { WakeLockToggle, ShareCopy } from "@/components/tech/BrowserTools";

export default function UnitsPage() {
  const search = useSearchParams();
  return <UnitsWorkspace key={search.toString()} initial={unitInput(search)} />;
}

function UnitsWorkspace({ initial }: { initial: UnitInput }) {
  const [category, setCategory] = useState<Category>(initial.category);
  const [value, setValue] = useState(initial.value);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const isTemperature = category === "temperature";

  const units = useMemo(
    () => isTemperature ? Object.keys(TEMPERATURE_UNITS) : Object.keys(FACTORS[category as Exclude<Category, "temperature">]),
    [category, isTemperature],
  );

  const choicesValid = value.trim().length > 0 && value.length <= 500 && units.includes(from) && units.includes(to);

  // Conversion is performed while the visitor types; the answer is revealed only
  // after they confirm. Both ratio and affine conversions keep decimal precision.
  const output = useMemo(() => {
    if (!choicesValid) return { ok: false as const, error: "Enter a number and choose two units." };
    return isTemperature
      ? convertTemperaturePrecise(value, from as "C" | "F" | "K", to as "C" | "F" | "K")
      : convertPrecise(category as Exclude<Category, "temperature">, value, from, to);
  }, [category, choicesValid, from, isTemperature, to, value]);
  const isValid = choicesValid && output.ok;

  const allUnits = useMemo(() => {
    if (!isValid || isTemperature) return [];
    return units
      .filter((unit) => unit !== from)
      .map((unit) => {
        const precise = convertPrecise(category as Exclude<Category, "temperature">, value, from, unit);
        return { unit, label: labelFor(category, unit), text: precise.ok ? formatDecimal(precise.value) : "—" };
      });
  }, [category, from, isTemperature, isValid, units, value]);

  const gate = useConfirmGate(`${category}|${value}|${from}|${to}`, isValid && output.ok);
  const state = !isValid || !output.ok ? "invalid" : gate.revealed ? "revealed" : "awaiting";

  function chooseCategory(next: Category) {
    if (next === category) return;
    setCategory(next);
    gate.reset();
    if (next === "temperature") { setFrom("C"); setTo("F"); return; }
    const keys = Object.keys(FACTORS[next as Exclude<Category, "temperature">]);
    setFrom(keys[0]);
    setTo(keys[Math.min(1, keys.length - 1)]);
  }

  function swapUnits() {
    setFrom(to);
    setTo(from);
    gate.reset();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-5 sm:py-12">
      <Reveal>
        <h1 className="h-title text-4xl sm:text-5xl">Unit <span className="h-underline">converter</span></h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Enter a value, choose the two units, then press <strong>Convert</strong>. The conversion is
          prepared while you type and shown only when you confirm.
        </p>
      </Reveal>

      <Reveal delay={50}>
      <div className="sketch mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
        <WakeLockToggle />
        <ShareCopy
          title="Unit converter"
          text={`Converting ${value} ${from} to ${to}`}
          href={`/tools/units?category=${category}&from=${from}&to=${to}&value=${value}`}
        />
      </div>

        <div className="sketch mt-8">
          <Segmented
            ariaLabel="Unit category"
            options={(Object.keys(CATEGORIES) as Category[]).map((key) => ({ value: key, label: CATEGORIES[key] }))}
            value={category}
            onChange={chooseCategory}
          />

          <PanelSwap trigger={category} className="mt-6 sm:mt-8">
            <ConfirmForm onSubmit={gate.confirm} label="Unit conversion">
              <div className="grid items-end gap-4 md:grid-cols-[1fr_auto_1fr]">
                <div>
                  <label htmlFor="unit-value" className="mb-1.5 block text-sm font-semibold text-slate-700">Value</label>
                  <input
                    id="unit-value"
                    className="input mono !text-xl !font-bold sm:!text-2xl"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    inputMode="decimal"
                    aria-describedby="unit-help"
                  />
                  <label htmlFor="unit-from" className="mt-2.5 block text-sm font-semibold text-slate-700">From</label>
                  <select id="unit-from" className="select mt-1" value={from} onChange={(e) => setFrom(e.target.value)}>
                    {units.map((unit) => <option key={unit} value={unit}>{labelFor(category, unit)}</option>)}
                  </select>
                </div>

                <button type="button" onClick={swapUnits} aria-label="Swap the two units" className="btn mx-auto !h-12 !w-12 !p-0 md:mb-24">
                  <Icon name="swap" size={19} />
                </button>

                <div>
                  <label htmlFor="unit-to" className="mb-1.5 block text-sm font-semibold text-slate-700">To</label>
                  <select id="unit-to" className="select" value={to} onChange={(e) => setTo(e.target.value)}>
                    {units.map((unit) => <option key={unit} value={unit}>{labelFor(category, unit)}</option>)}
                  </select>

                  <div
                    id="unit-result"
                    role="status"
                    aria-live="polite"
                    className={`result-panel mt-2.5 flex min-h-[58px] items-center ${gate.revealed ? "is-revealed" : "is-locked"}`}
                  >
                    {gate.revealed && output.ok ? (
                      <span className="mono break-all text-xl font-extrabold sm:text-2xl">{output.value}</span>
                    ) : (
                      <LockedResult label="Result hidden until you press Convert." />
                    )}
                  </div>
                </div>
              </div>

              <ConfirmBar
                id="unit-confirm"
                action="Convert"
                state={state}
                onConfirm={gate.confirm}
                onReset={gate.reset}
                errorText={isValid ? output.ok ? "" : "Check the value and units." : "Enter a number, then press Convert."}
              />
            </ConfirmForm>

            {gate.revealed && allUnits.length > 0 && (
              <div className="mt-7">
                <h2 className="mb-3 text-sm font-semibold text-slate-700">
                  {formatDecimal(value)} {labelFor(category, from)} also equals
                </h2>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {allUnits.map((row) => (
                    <button
                      key={row.unit}
                      type="button"
                      onClick={() => { setTo(row.unit); gate.reset(); }}
                      className={`sketch-sm row-hover flex min-h-12 w-full items-center justify-between gap-3 text-left ${row.unit === to ? "!border-[color:var(--accent)] ring-2 ring-[color:var(--accent)]/20" : ""}`}
                      aria-pressed={row.unit === to}
                    >
                      <span className="text-sm text-slate-600">{row.label}</span>
                      <span className="mono text-sm font-bold">{row.text}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Choose a tile to make it the target unit, then press Convert again.
                </p>
              </div>
            )}
          </PanelSwap>

          <p id="unit-help" className="mt-5 text-xs leading-relaxed text-slate-500">
            Conversions use defined base factors. Temperature uses a separate offset calculation; a year means 365 days.
            Data units labelled kB/MB/GB are decimal; KiB/MiB/GiB are binary. Results are prepared in the background and
            shown only after you confirm.
          </p>
        </div>
      </Reveal>
    </div>
  );
}

function labelFor(category: Category, unit: string): string {
  if (category === "temperature") return (TEMPERATURE_UNITS as Record<string, string>)[unit];
  return (FACTORS[category as Exclude<Category, "temperature">] as Record<string, { label: string }>)[unit].label;
}

function formatDecimal(value: string): string {
  try {
    const decimal = bignumber(value);
    if (!decimal.isFinite()) return "—";
    if (decimal.isZero()) return "0";
    const absolute = decimal.abs();
    if (absolute.gte("1e15") || absolute.lt("1e-9")) return decimal.toExponential(12).replace(/\.0+e/, "e");
    return decimal.toPrecision(16).replace(/(?:\.0+|(?<=\..*?)0+)$/, "");
  } catch {
    return "—";
  }
}

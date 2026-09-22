"use client";
import { useMemo, useState } from "react";
import {
  CATEGORIES,
  FACTORS,
  TEMPERATURE_UNITS,
  type Category,
  convert,
  convertTemperature,
} from "@/lib/units";

export default function UnitsPage() {
  const [category, setCategory] = useState<Category>("length");
  const [value, setValue] = useState("1");
  const [from, setFrom] = useState("m");
  const [to, setTo] = useState("ft");

  // keep from/to sane when category changes
  const categoryUnits = useMemo(() => {
    if (category === "temperature") return Object.keys(TEMPERATURE_UNITS);
    return Object.keys(FACTORS[category as Exclude<Category, "temperature">]);
  }, [category]);

  const v = Number(value);
  const output = useMemo(() => {
    if (!Number.isFinite(v)) return "—";
    if (category === "temperature") {
      const r = convertTemperature(v, from as any, to as any);
      return formatNum(r);
    }
    const r = convert(category as Exclude<Category, "temperature">, v, from, to);
    return formatNum(r);
  }, [v, from, to, category]);

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <h1 className="h-title text-4xl">
        <span className="h-underline">Unit</span> converter
      </h1>
      <p className="mt-2 text-slate-600">
        Convert between common units across length, mass, time, temperature,
        area, volume, speed and digital data.
      </p>

      <div className="mt-6 sketch bg-white p-5">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CATEGORIES) as Category[]).map((c) => (
            <button
              key={c}
              className={`btn ${category === c ? "btn-ink" : "btn-ghost"} text-sm`}
              onClick={() => {
                setCategory(c);
                if (c === "temperature") { setFrom("C"); setTo("F"); }
                else {
                  const keys = Object.keys(FACTORS[c as Exclude<Category, "temperature">]);
                  setFrom(keys[0]); setTo(keys[Math.min(1, keys.length - 1)]);
                }
              }}
            >
              {CATEGORIES[c]}
            </button>
          ))}
        </div>

        <div className="mt-6 grid md:grid-cols-[1fr_auto_1fr] gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold mb-1">From</label>
            <input
              className="input mono text-2xl"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputMode="decimal"
            />
            <select
              className="select mt-2"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            >
              {unitOptions(category, categoryUnits).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-ghost justify-self-center"
            onClick={() => { const t = from; setFrom(to); setTo(t); }}
            aria-label="Swap"
            title="Swap"
          >
            ⇄
          </button>

          <div>
            <label className="block text-sm font-semibold mb-1">To</label>
            <div className="input mono text-2xl bg-[color:var(--paper-2)] min-h-[48px]">
              {output}
            </div>
            <select
              className="select mt-2"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            >
              {unitOptions(category, categoryUnits).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        {category !== "temperature" && (
          <div className="mt-6">
            <h3 className="font-semibold mb-2 text-sm">All conversions from this value</h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
              {categoryUnits.map((u) => {
                if (u === from) return null;
                const r = convert(
                  category as Exclude<Category, "temperature">,
                  Number.isFinite(v) ? v : 0,
                  from,
                  u,
                );
                const label = (FACTORS[category as Exclude<Category, "temperature">] as any)[u].label;
                return (
                  <div key={u} className="sketch-sm bg-white p-2.5 flex items-center justify-between">
                    <span className="text-sm">{label}</span>
                    <span className="mono font-semibold">{formatNum(r)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function unitOptions(category: Category, units: string[]): Array<[string, string]> {
  if (category === "temperature") {
    return units.map((u) => [u, (TEMPERATURE_UNITS as any)[u]]);
  }
  return units.map((u) => [u, (FACTORS[category as Exclude<Category, "temperature">] as any)[u].label]);
}

function formatNum(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs === 0) return "0";
  if (abs >= 1e12 || abs < 1e-6) return n.toExponential(6);
  if (Number.isInteger(n)) return n.toLocaleString();
  return Number(n.toPrecision(10)).toLocaleString(undefined, { maximumFractionDigits: 10 });
}

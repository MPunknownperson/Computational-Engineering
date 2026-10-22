"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, FACTORS, TEMPERATURE_UNITS, convert, convertTemperature, type Category } from "@/lib/units";

export function PwaConverter() {
  const [category, setCategory] = useState<Category>("length");
  const [value, setValue] = useState("1");
  const units = useMemo(() => {
    if (category === "temperature") return Object.entries(TEMPERATURE_UNITS).map(([k, v]) => [k, v] as const);
    return Object.entries(FACTORS[category]).map(([k, v]) => [k, v.label] as const);
  }, [category]);
  const [from, setFrom] = useState(units[0][0]);
  const [to, setTo] = useState(units[1]?.[0] ?? units[0][0]);

  const changeCategory = (next: Category) => {
    setCategory(next);
    const list = next === "temperature"
      ? Object.keys(TEMPERATURE_UNITS)
      : Object.keys(FACTORS[next]);
    setFrom(list[0]);
    setTo(list[1] ?? list[0]);
  };

  let output = "—";
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    try {
      const result = category === "temperature"
        ? convertTemperature(numeric, from as "C" | "F" | "K", to as "C" | "F" | "K")
        : convert(category, numeric, from, to);
      output = String(Number(result.toPrecision(10)));
    } catch {
      output = "—";
    }
  }

  return (
    <div style={{ display: "grid", gap: ".85rem" }}>
      <div className="pwa-card" style={{ display: "grid", gap: ".7rem" }}>
        <label style={{ display: "grid", gap: ".3rem" }}>
          <span className="pwa-muted" style={{ fontSize: ".8rem" }}>Category</span>
          <select className="pwa-select" value={category} onChange={(e) => changeCategory(e.target.value as Category)}>
            {Object.entries(CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: ".3rem" }}>
          <span className="pwa-muted" style={{ fontSize: ".8rem" }}>Value</span>
          <input className="pwa-input" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".6rem" }}>
          <label style={{ display: "grid", gap: ".3rem" }}>
            <span className="pwa-muted" style={{ fontSize: ".8rem" }}>From</span>
            <select className="pwa-select" value={from} onChange={(e) => setFrom(e.target.value)}>
              {units.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label style={{ display: "grid", gap: ".3rem" }}>
            <span className="pwa-muted" style={{ fontSize: ".8rem" }}>To</span>
            <select className="pwa-select" value={to} onChange={(e) => setTo(e.target.value)}>
              {units.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className="pwa-card" style={{ textAlign: "center" }}>
        <p className="pwa-muted" style={{ fontSize: ".8rem" }}>Result</p>
        <p style={{ fontSize: "1.9rem", fontWeight: 700, wordBreak: "break-all" }}>{output}</p>
      </div>
    </div>
  );
}

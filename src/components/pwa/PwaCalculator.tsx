"use client";

import { useState } from "react";
import { evaluate } from "mathjs";

const KEYS = ["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "(", ")", "C", "⌫", "+", "="];

export function PwaCalculator() {
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState("0");

  const press = (key: string) => {
    if (key === "C") { setExpr(""); setResult("0"); return; }
    if (key === "⌫") { setExpr((v) => v.slice(0, -1)); return; }
    if (key === "=") {
      try {
        const value = evaluate(expr || "0");
        setResult(String(value));
      } catch {
        setResult("Error");
      }
      return;
    }
    setExpr((v) => v + key);
  };

  return (
    <div style={{ display: "grid", gap: "0.85rem" }}>
      <div className="pwa-card" style={{ textAlign: "right" }}>
        <div className="pwa-muted" style={{ minHeight: "1.4rem", wordBreak: "break-all" }}>{expr || "\u00a0"}</div>
        <div style={{ fontSize: "2.1rem", fontWeight: 700, wordBreak: "break-all" }}>{result}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: ".5rem" }}>
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className="pwa-btn"
            data-variant={key === "=" ? "accent" : undefined}
            onClick={() => press(key)}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}

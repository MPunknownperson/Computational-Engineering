"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Segmented } from "@/components/Motion";
import type { AngleMode, Notation, SamplePoint } from "@/lib/engine";

export interface EngineSettings { angle: AngleMode; notation: Notation; precision: number }
const DEFAULTS: EngineSettings = { angle: "rad", notation: "auto", precision: 12 };
const KEY = "radixloom.engine-settings.v1";

/** Angle mode, notation and precision shared by every calculator (remembered in this browser). */
export function useEngineSettings(): [EngineSettings, (patch: Partial<EngineSettings>) => void] {
  const [settings, setSettings] = useState<EngineSettings>(DEFAULTS);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) { const parsed = JSON.parse(raw); setSettings({ ...DEFAULTS, ...parsed }); }
    } catch { /* ignore */ }
  }, []);
  const update = (patch: Partial<EngineSettings>) => setSettings((current) => {
    const next = { ...current, ...patch };
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });
  return [settings, update];
}

export function EngineSettingsBar({ settings, onChange, compact = false }: { settings: EngineSettings; onChange: (patch: Partial<EngineSettings>) => void; compact?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3" role="group" aria-label="Engine settings">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Angle</span>
        <Segmented<AngleMode> size="sm" ariaLabel="Angle mode" value={settings.angle} onChange={(angle) => onChange({ angle })} options={[{ value: "rad", label: "rad" }, { value: "deg", label: "deg" }, { value: "grad", label: "grad" }]} />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Format</span>
        <Segmented<Notation> size="sm" ariaLabel="Number format" value={settings.notation} onChange={(notation) => onChange({ notation })} options={[{ value: "auto", label: "auto" }, { value: "fixed", label: "fixed" }, { value: "sci", label: "sci" }, { value: "eng", label: "eng" }, { value: "fraction", label: "a/b" }]} />
      </div>
      {!compact && (
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          Digits
          <input type="range" min={3} max={40} value={settings.precision} onChange={(e) => onChange({ precision: Number(e.target.value) })} aria-label="Significant digits" className="w-28 accent-[color:var(--accent-2)]" />
          <span className="mono w-6 text-right text-sm text-[color:var(--ink)]">{settings.precision}</span>
        </label>
      )}
    </div>
  );
}

/** Dependency-free SVG line plot with gaps for undefined values and optional marked points. */
export function FunctionPlot({ points, marks = [], label, height = 220, className = "" }: {
  points: SamplePoint[];
  marks?: Array<{ x: number; y: number; label?: string; tone?: "root" | "min" | "max" }>;
  label?: string;
  height?: number;
  className?: string;
}) {
  const width = 640;
  const pad = { l: 46, r: 14, t: 14, b: 28 };
  const geometry = useMemo(() => {
    const defined = points.filter((p) => p.y !== null) as Array<{ x: number; y: number }>;
    if (defined.length < 2) return null;
    const xs = points.map((p) => p.x);
    const xMin = Math.min(...xs), xMax = Math.max(...xs);
    // Robust y-range: clip to the 2–98 percentile band so one pole does not flatten the curve.
    const ys = defined.map((p) => p.y).sort((a, b) => a - b);
    const lo = ys[Math.floor(ys.length * 0.02)], hi = ys[Math.min(ys.length - 1, Math.ceil(ys.length * 0.98))];
    let yMin = Math.min(lo, 0), yMax = Math.max(hi, 0);
    if (yMax - yMin < 1e-12) { yMin -= 1; yMax += 1; }
    const span = yMax - yMin; yMin -= span * 0.08; yMax += span * 0.08;
    const sx = (x: number) => pad.l + ((x - xMin) / (xMax - xMin || 1)) * (width - pad.l - pad.r);
    const sy = (y: number) => pad.t + (1 - (y - yMin) / (yMax - yMin)) * (height - pad.t - pad.b);
    let d = "";
    let pen = false;
    for (const p of points) {
      if (p.y === null || p.y < yMin - span || p.y > yMax + span) { pen = false; continue; }
      d += `${pen ? "L" : "M"}${sx(p.x).toFixed(1)} ${sy(Math.max(yMin, Math.min(yMax, p.y))).toFixed(1)} `;
      pen = true;
    }
    const ticks = (min: number, max: number, n: number) => Array.from({ length: n + 1 }, (_, i) => min + ((max - min) * i) / n);
    return { d, sx, sy, xMin, xMax, yMin, yMax, xTicks: ticks(xMin, xMax, 6), yTicks: ticks(yMin, yMax, 4) };
  }, [points, height]);

  if (!geometry) return <p className="text-sm text-slate-500">Nothing to plot on this interval.</p>;
  const { d, sx, sy, xTicks, yTicks, xMin, xMax, yMin, yMax } = geometry;
  const fmt = (v: number) => (Math.abs(v) >= 1e5 || (Math.abs(v) < 1e-3 && v !== 0) ? v.toExponential(1) : Number(v.toPrecision(4)).toString());
  return (
    <figure className={`engine-plot ${className}`}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label ?? "Function plot"} className="block h-auto w-full">
        {yTicks.map((t) => <line key={`gy${t}`} x1={pad.l} x2={width - pad.r} y1={sy(t)} y2={sy(t)} className="engine-plot__grid" />)}
        {xTicks.map((t) => <line key={`gx${t}`} y1={pad.t} y2={height - pad.b} x1={sx(t)} x2={sx(t)} className="engine-plot__grid" />)}
        {yMin < 0 && yMax > 0 && <line x1={pad.l} x2={width - pad.r} y1={sy(0)} y2={sy(0)} className="engine-plot__axis" />}
        {xMin < 0 && xMax > 0 && <line y1={pad.t} y2={height - pad.b} x1={sx(0)} x2={sx(0)} className="engine-plot__axis" />}
        <path d={d} fill="none" className="engine-plot__line" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
        {marks.map((m, i) => (
          <g key={i} className={`engine-plot__mark is-${m.tone ?? "root"}`}>
            <circle cx={sx(m.x)} cy={sy(Math.max(yMin, Math.min(yMax, m.y)))} r={5} />
            {m.label && <text x={sx(m.x) + 7} y={sy(Math.max(yMin, Math.min(yMax, m.y))) - 7} fontSize={11} fontWeight={700}>{m.label}</text>}
          </g>
        ))}
        {xTicks.map((t) => <text key={`tx${t}`} x={sx(t)} y={height - 8} textAnchor="middle" fontSize={11} className="engine-plot__tick">{fmt(t)}</text>)}
        {yTicks.map((t) => <text key={`ty${t}`} x={pad.l - 6} y={sy(t) + 4} textAnchor="end" fontSize={11} className="engine-plot__tick">{fmt(t)}</text>)}
      </svg>
      {label && <figcaption className="mt-1 text-xs text-slate-500">{label}</figcaption>}
    </figure>
  );
}

export function Field({ label, hint, children, className = "" }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`block text-sm font-semibold text-slate-700 ${className}`}>
      <span className="block">{label}{hint && <span className="ml-1 font-normal text-slate-500">{hint}</span>}</span>
      {children}
    </label>
  );
}

export function KeyValue({ items }: { items: Array<{ k: string; v: ReactNode }> }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.k} className="flex items-baseline justify-between gap-3 border-b border-dashed border-[color:var(--line)] py-1 text-sm">
          <dt className="font-semibold text-slate-600">{item.k}</dt>
          <dd className="mono text-right break-all text-[color:var(--ink)]">{item.v}</dd>
        </div>
      ))}
    </dl>
  );
}

"use client";
import { useId, useMemo, useState } from "react";

type Nullable = Array<number | null>;

function extent(values: Array<number | null | undefined>): [number, number] {
  let lo = Infinity, hi = -Infinity;
  for (const v of values) { if (v === null || v === undefined || !Number.isFinite(v)) continue; if (v < lo) lo = v; if (v > hi) hi = v; }
  if (!Number.isFinite(lo)) return [0, 1];
  if (lo === hi) return [lo * 0.98, hi * 1.02 || 1];
  const pad = (hi - lo) * 0.06;
  return [lo - pad, hi + pad];
}

function path(values: Nullable, x: (i: number) => number, y: (v: number) => number): string {
  let d = "", pen = false;
  values.forEach((v, i) => { if (v === null || !Number.isFinite(v)) { pen = false; return; } d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`; pen = true; });
  return d;
}

export function Sparkline({ values, positive, width = 112, height = 32 }: { values: number[] | null; positive: boolean; width?: number; height?: number }) {
  if (!values || values.length < 2) return <span className="text-xs text-slate-400">—</span>;
  const [lo, hi] = extent(values);
  const x = (i: number) => (i / (values.length - 1)) * (width - 2) + 1;
  const y = (v: number) => height - 2 - ((v - lo) / (hi - lo)) * (height - 4);
  const d = path(values, x, y);
  const color = positive ? "#0e8a72" : "#c2417c";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="overflow-visible">
      <path d={`${d}L${x(values.length - 1)},${height}L${x(0)},${height}Z`} fill={color} opacity={0.12} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export type Overlay = { label: string; values: Nullable; color: string; dash?: string };

export function PriceChart({ points, overlays = [], band, levels = [], format, height = 300 }: { points: Array<[number, number]>; overlays?: Overlay[]; band?: { upper: Nullable; lower: Nullable; color: string }; levels?: Array<{ value: number; label: string; color: string }>; format: (v: number) => string; height?: number }) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const width = 760, padL = 8, padR = 72, padT = 10, padB = 26;
  const prices = points.map(([, p]) => p);
  const all = [...prices, ...overlays.flatMap((o) => o.values), ...(band ? [...band.upper, ...band.lower] : []), ...levels.map((l) => l.value)];
  const [lo, hi] = extent(all);
  const x = (i: number) => padL + (i / Math.max(1, points.length - 1)) * (width - padL - padR);
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (height - padT - padB);
  const line = useMemo(() => path(prices, x, y), [prices.length, lo, hi]); // eslint-disable-line react-hooks/exhaustive-deps
  const ticks = useMemo(() => Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) * i) / 4), [lo, hi]);
  const dates = useMemo(() => [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (points.length - 1))), [points.length]);
  const up = prices.length > 1 && prices[prices.length - 1] >= prices[0];
  const color = up ? "#0e8a72" : "#c2417c";
  const spanDays = points.length > 1 ? (points[points.length - 1][0] - points[0][0]) / 86_400_000 : 1;
  const fmtDate = (ts: number) => new Date(ts).toLocaleDateString(undefined, spanDays <= 2 ? { hour: "2-digit", minute: "2-digit" } : spanDays <= 120 ? { month: "short", day: "numeric" } : { month: "short", year: "2-digit" });
  const onMove = (event: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clientX = "touches" in event ? event.touches[0]?.clientX ?? 0 : event.clientX;
    const px = ((clientX - rect.left) / rect.width) * width;
    const i = Math.round(((px - padL) / (width - padL - padR)) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };
  const bandPath = band ? (() => { const u = path(band.upper, x, y); let l = ""; for (let i = band.lower.length - 1; i >= 0; i--) { const v = band.lower[i]; if (v === null) continue; l += `L${x(i).toFixed(1)},${y(v).toFixed(1)}`; } return u && l ? `${u}${l}Z` : ""; })() : "";
  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Price chart" className="h-auto w-full touch-none select-none" onMouseMove={onMove} onMouseLeave={() => setHover(null)} onTouchStart={onMove} onTouchMove={onMove} onTouchEnd={() => setHover(null)}>
        <defs><linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.28} /><stop offset="100%" stopColor={color} stopOpacity={0.02} /></linearGradient></defs>
        {ticks.map((t) => <g key={t}><line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity={0.08} /><text x={width - padR + 6} y={y(t) + 4} fontSize={11} fill="currentColor" opacity={0.6} className="mono">{format(t)}</text></g>)}
        {dates.map((i) => points[i] && <text key={i} x={x(i)} y={height - 8} fontSize={11} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fill="currentColor" opacity={0.6}>{fmtDate(points[i][0])}</text>)}
        {bandPath && <path d={bandPath} fill={band!.color} opacity={0.1} />}
        {line && <path d={`${line}L${x(points.length - 1)},${y(lo)}L${x(0)},${y(lo)}Z`} fill={`url(#${id}-fill)`} />}
        {overlays.map((o) => <path key={o.label} d={path(o.values, x, y)} fill="none" stroke={o.color} strokeWidth={1.4} strokeDasharray={o.dash} opacity={0.9} />)}
        <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {levels.map((l) => <g key={l.label + l.value}><line x1={padL} x2={width - padR} y1={y(l.value)} y2={y(l.value)} stroke={l.color} strokeDasharray="4 4" strokeWidth={1} /><text x={padL + 4} y={y(l.value) - 3} fontSize={10} fill={l.color} fontWeight={700}>{l.label}</text></g>)}
        {hover !== null && points[hover] && <g><line x1={x(hover)} x2={x(hover)} y1={padT} y2={height - padB} stroke="currentColor" strokeOpacity={0.35} strokeDasharray="3 3" /><circle cx={x(hover)} cy={y(prices[hover])} r={4} fill={color} stroke="#fff" strokeWidth={1.5} /></g>}
      </svg>
      {hover !== null && points[hover] && (
        <figcaption className="pointer-events-none absolute left-2 top-2 rounded-lg border-2 border-[color:var(--line)] bg-[color:var(--paper)] px-3 py-2 text-xs shadow-[var(--shadow-ink-sm)]">
          <div className="font-bold">{format(prices[hover])}</div>
          <div className="text-slate-600">{new Date(points[hover][0]).toLocaleString()}</div>
          {overlays.map((o) => o.values[hover] !== null && o.values[hover] !== undefined && <div key={o.label} style={{ color: o.color }}>{o.label}: {format(o.values[hover] as number)}</div>)}
        </figcaption>
      )}
      <figcaption className="mt-1 flex flex-wrap gap-3 text-[.68rem] font-semibold text-slate-600">
        <span><span className="inline-block h-2 w-4 rounded" style={{ background: color }} /> Price</span>
        {overlays.map((o) => <span key={o.label}><span className="inline-block h-0.5 w-4 align-middle" style={{ background: o.color }} /> {o.label}</span>)}
        {band && <span><span className="inline-block h-2 w-4 rounded" style={{ background: band.color, opacity: 0.3 }} /> Bollinger 20/2σ</span>}
      </figcaption>
    </figure>
  );
}

export function IndicatorChart({ values, signal, histogram, bounds, lines = [], height = 110, label }: { values: Nullable; signal?: Nullable; histogram?: Nullable; bounds?: [number, number]; lines?: Array<{ value: number; color: string }>; height?: number; label: string }) {
  const width = 760, padR = 40;
  const all = [...values, ...(signal ?? []), ...(histogram ?? []), ...(bounds ?? []), ...lines.map((l) => l.value)];
  const [lo, hi] = bounds ?? extent(all);
  const x = (i: number) => (i / Math.max(1, values.length - 1)) * (width - padR);
  const y = (v: number) => 6 + (1 - (v - lo) / (hi - lo)) * (height - 12);
  const zero = y(Math.max(lo, Math.min(hi, 0)));
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="h-auto w-full">
      {lines.map((l) => <line key={l.value} x1={0} x2={width - padR} y1={y(l.value)} y2={y(l.value)} stroke={l.color} strokeDasharray="4 4" />)}
      {histogram && histogram.map((h, i) => (h === null ? null : <rect key={i} x={x(i) - 1} width={Math.max(1.5, (width - padR) / values.length - 1)} y={Math.min(zero, y(h))} height={Math.abs(zero - y(h))} fill={h >= 0 ? "#0e8a72" : "#c2417c"} opacity={0.5} />))}
      <path d={path(values, x, y)} fill="none" stroke="#315dc1" strokeWidth={1.6} />
      {signal && <path d={path(signal, x, y)} fill="none" stroke="#ad381f" strokeWidth={1.3} strokeDasharray="3 2" />}
      <text x={width - padR + 4} y={12} fontSize={10} fill="currentColor" opacity={0.6} className="mono">{hi.toFixed(hi > 10 ? 0 : 2)}</text>
      <text x={width - padR + 4} y={height - 4} fontSize={10} fill="currentColor" opacity={0.6} className="mono">{lo.toFixed(Math.abs(lo) > 10 ? 0 : 2)}</text>
      <text x={4} y={12} fontSize={11} fontWeight={800} fill="currentColor" opacity={0.75}>{label}</text>
    </svg>
  );
}

export function FanChart({ steps, s0, format }: { steps: Array<{ day: number; p5: number; p25: number; p50: number; p75: number; p95: number }>; s0: number; format: (v: number) => string }) {
  const width = 760, height = 220, padR = 72, padB = 22;
  const all = steps.flatMap((s) => [s.p5, s.p95]).concat([s0]);
  const [lo, hi] = extent(all);
  const xs = [{ day: 0, p5: s0, p25: s0, p50: s0, p75: s0, p95: s0 }, ...steps];
  const x = (i: number) => (i / Math.max(1, xs.length - 1)) * (width - padR);
  const y = (v: number) => 6 + (1 - (v - lo) / (hi - lo)) * (height - 6 - padB);
  const area = (upper: keyof typeof xs[number], lower: keyof typeof xs[number]) => `${xs.map((s, i) => `${i ? "L" : "M"}${x(i)},${y(s[upper] as number)}`).join("")}${[...xs].reverse().map((s, j) => `L${x(xs.length - 1 - j)},${y(s[lower] as number)}`).join("")}Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Monte Carlo projection fan chart" className="h-auto w-full">
      {[0, 0.5, 1].map((f) => { const v = lo + (hi - lo) * f; return <g key={f}><line x1={0} x2={width - padR} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity={0.08} /><text x={width - padR + 6} y={y(v) + 4} fontSize={11} fill="currentColor" opacity={0.6} className="mono">{format(v)}</text></g>; })}
      <path d={area("p95", "p5")} fill="#315dc1" opacity={0.12} />
      <path d={area("p75", "p25")} fill="#315dc1" opacity={0.22} />
      <path d={xs.map((s, i) => `${i ? "L" : "M"}${x(i)},${y(s.p50)}`).join("")} fill="none" stroke="#315dc1" strokeWidth={2} />
      <line x1={0} x2={width - padR} y1={y(s0)} y2={y(s0)} stroke="currentColor" strokeOpacity={0.4} strokeDasharray="4 4" />
      {xs.filter((_, i) => i % Math.ceil(xs.length / 6) === 0 || i === xs.length - 1).map((s, _, arr) => <text key={s.day} x={x(xs.indexOf(s))} y={height - 6} fontSize={11} textAnchor={s === arr[arr.length - 1] ? "end" : "middle"} fill="currentColor" opacity={0.6}>+{s.day}d</text>)}
    </svg>
  );
}

export function Heatmap({ labels, matrix }: { labels: string[]; matrix: number[][] }) {
  const n = labels.length, cell = 44, pad = 46;
  const size = pad + n * cell;
  const color = (v: number) => { const t = Math.max(-1, Math.min(1, v)); return t >= 0 ? `rgba(14,138,114,${0.12 + 0.78 * t})` : `rgba(194,65,124,${0.12 + 0.78 * -t})`; };
  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Correlation heatmap" className="mx-auto h-auto w-full max-w-[560px]">
      {labels.map((l, i) => <g key={l}><text x={pad + i * cell + cell / 2} y={pad - 10} fontSize={11} fontWeight={800} textAnchor="middle" fill="currentColor">{l}</text><text x={pad - 6} y={pad + i * cell + cell / 2 + 4} fontSize={11} fontWeight={800} textAnchor="end" fill="currentColor">{l}</text></g>)}
      {matrix.map((row, i) => row.map((v, j) => <g key={`${i}-${j}`}><rect x={pad + j * cell} y={pad + i * cell} width={cell - 2} height={cell - 2} rx={6} fill={color(v)} stroke="var(--line)" strokeWidth={1} /><text x={pad + j * cell + cell / 2 - 1} y={pad + i * cell + cell / 2 + 4} fontSize={11} fontWeight={700} textAnchor="middle" fill={Math.abs(v) > 0.55 ? "#fff" : "currentColor"} className="mono">{v.toFixed(2)}</text></g>))}
    </svg>
  );
}

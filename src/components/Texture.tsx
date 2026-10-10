/**
 * Shared illustration material layer.
 *
 * The drawn world on Radix Loom is ink-on-paper: flat shapes, bold outlines and
 * offset shadows. This module adds the *texture* of that world without adding
 * weight — a paper grain, a soft cast shadow, and the small set of surface
 * gradients used to shade bodies, tiles and cards so cartoon elements stop
 * looking like flat clip art and start feeling like printed, layered art.
 *
 * Every def is namespaced with an `id` prefix because several illustrations can
 * live in the same document and SVG ids resolve globally.
 */

export type TextureTone = "warm" | "cool" | "mint" | "violet";

const WASH: Record<TextureTone, [string, string]> = {
  warm: ["#fff6e2", "#f3e6c8"],
  cool: ["#e6efff", "#c9dcff"],
  mint: ["#e7faf0", "#c4ecd7"],
  violet: ["#f0eaff", "#dcd2ff"],
};

export function TextureDefs({
  id,
  tone = "warm",
  grain = 0.9,
}: {
  id: string;
  tone?: TextureTone;
  /** Higher = coarser paper tooth. 0.6–1.2 reads as printed paper. */
  grain?: number;
}) {
  const [washA, washB] = WASH[tone];
  return (
    <defs>
      {/* Paper surface: a warm gradient plate that shapes can sit on. */}
      <linearGradient id={`${id}-paper`} x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0%" stopColor="#fffdf7" />
        <stop offset="55%" stopColor="#fdf6e8" />
        <stop offset="100%" stopColor="#f4ead6" />
      </linearGradient>

      {/* Colour wash used for backdrops and plates. */}
      <linearGradient id={`${id}-wash`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={washA} />
        <stop offset="100%" stopColor={washB} />
      </linearGradient>

      {/* Light falls from the upper-left across the whole drawn world. */}
      <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity=".55" />
        <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="100%" stopColor="#0b1020" stopOpacity=".16" />
      </linearGradient>

      <linearGradient id={`${id}-sun`} x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0%" stopColor="#ffe27a" />
        <stop offset="100%" stopColor="#f4b824" />
      </linearGradient>

      <linearGradient id={`${id}-coral`} x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0%" stopColor="#ff8b6b" />
        <stop offset="100%" stopColor="#e04f2c" />
      </linearGradient>

      <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0%" stopColor="#8fb2ff" />
        <stop offset="100%" stopColor="#4470e8" />
      </linearGradient>

      <linearGradient id={`${id}-mint`} x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0%" stopColor="#7ff0b1" />
        <stop offset="100%" stopColor="#28b466" />
      </linearGradient>

      {/* Specular top highlight for glass-like surfaces (calculator screens). */}
      <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity=".85" />
        <stop offset="60%" stopColor="#ffffff" stopOpacity=".08" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>

      {/*
        Printed paper tooth.

        Performance: this was an `feTurbulence` filter. Fractal-noise filters
        are rasterised on the CPU over the full filter region and are re-run
        whenever anything in the same SVG invalidates — which, in a scene with
        ambient animation, means repeatedly. A stochastic dot pattern is a
        GPU-friendly tile that gives the same printed tooth for a fraction of
        the cost, and it scales with `grain` the same way.
      */}
      <pattern
        id={`${id}-grain`}
        width={Math.round(13 / grain)}
        height={Math.round(13 / grain)}
        patternUnits="userSpaceOnUse"
      >
        <circle cx="2.4" cy="3.1" r="1" fill="#0b1020" fillOpacity=".085" />
        <circle cx="8.9" cy="9.4" r="1.1" fill="#0b1020" fillOpacity=".06" />
        <circle cx="11.6" cy="2.2" r=".8" fill="#0b1020" fillOpacity=".065" />
        <circle cx="5.1" cy="7.2" r=".7" fill="#0b1020" fillOpacity=".05" />
        <circle cx="1.4" cy="10.8" r=".65" fill="#0b1020" fillOpacity=".045" />
      </pattern>

    </defs>
  );
}

/** Faint paper grain laid over a scene region (a tiled fill, not a filter). */
export function GrainOverlay({
  id,
  x,
  y,
  width,
  height,
  opacity = 0.28,
  rx = 0,
}: {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
  rx?: number;
}) {
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={rx}
      fill={`url(#${id}-grain)`}
      opacity={opacity}
      pointerEvents="none"
    />
  );
}

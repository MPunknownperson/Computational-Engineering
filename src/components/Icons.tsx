// Radix Loom icon layer — a small, original line-icon set drawn for this site.
// Every glyph below is hand-built geometry (not a third-party icon library and
// not emoji), using the same rounded ink strokes as the mascots and cards so
// icons, illustrations and chrome read as one consistent, drawn world.
import type { SVGProps } from "react";

export type IconName =
  | "sigma" | "swap" | "globe" | "coin" | "function" | "chart"
  | "sparkle" | "arrow-right" | "check" | "chevron" | "plus"
  | "refresh" | "copy" | "trash" | "bolt" | "shield" | "layers"
  | "grid" | "target" | "prism" | "clock" | "flask" | "keyboard" | "star"
  | "calculator" | "ruler" | "thermometer" | "gauge" | "drive"
  | "activity" | "boxes" | "infinity" | "trend" | "wallet" | "waves" | "menu" | "close" | "search"
  | "mic" | "sun" | "download" | "book" | "language" | "path" | "flag" | "ear" | "node";

/**
 * Each icon is a small function returning its inner markup at a 24×24 grid.
 * Strokes share one weight and rounded caps/joins so the set feels drawn by
 * one hand, matching the Owl/Pip mascots and the sketch-card border language.
 */
const GLYPHS: Record<IconName, (p: { fill: string }) => React.ReactNode> = {
  sigma: () => (
    <path d="M6.2 5h11l.6 3.1M17.8 19h-11l6.4-6.8L6.6 5.3" />
  ),
  swap: () => (
    <>
      <path d="M4 8h13.5M14 4.2 17.8 8l-3.8 3.8" />
      <path d="M20 16H6.5M10 12.2 6.2 16l3.8 3.8" />
    </>
  ),
  globe: () => (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16M12 4c2.4 2.3 3.6 5 3.6 8s-1.2 5.7-3.6 8c-2.4-2.3-3.6-5-3.6-8s1.2-5.7 3.6-8Z" />
    </>
  ),
  coin: (p) => (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <circle cx="12" cy="12" r="5" strokeDasharray="1.2 2.6" />
      <path d="M12 9.3v5.4M10.4 10.3c0-.9.8-1.4 1.8-1.4.9 0 1.7.5 1.7 1.3 0 2-3.5 1-3.5 2.9 0 .8.8 1.3 1.8 1.3s1.8-.4 1.9-1.3" fill="none" />
      <circle cx="17.3" cy="7.3" r="1" fill={p.fill} stroke="none" />
    </>
  ),
  function: () => (
    <>
      <path d="M8.6 20c1-3.5 1.7-8.3 2.2-12.2.3-2.4 1.6-3.6 3.4-3.3" />
      <path d="M7 13.2h7.4" />
    </>
  ),
  chart: () => (
    <>
      <path d="M4.5 20V4.5" />
      <path d="M4.5 20h15" />
      <rect x="7.2" y="13.5" width="2.8" height="6.5" rx=".6" />
      <rect x="12" y="9.5" width="2.8" height="10.5" rx=".6" />
      <rect x="16.8" y="6" width="2.8" height="14" rx=".6" />
    </>
  ),
  sparkle: () => (
    <>
      <path d="M12 3.5c.5 3 1.6 5.2 3.3 6.5 1.7 1.3 3.9 1.9 5.2 2-1.3.1-3.5.7-5.2 2-1.7 1.3-2.8 3.5-3.3 6.5-.5-3-1.6-5.2-3.3-6.5-1.7-1.3-3.9-1.9-5.2-2 1.3-.1 3.5-.7 5.2-2 1.7-1.3 2.8-3.5 3.3-6.5Z" />
    </>
  ),
  "arrow-right": () => (
    <path d="M4.5 12h14.3M13.4 6.3l5.4 5.7-5.4 5.7" />
  ),
  check: () => <path d="M4.5 12.8 9 17.3 19.5 6.3" />,
  chevron: () => <path d="M5.5 9 12 15.5 18.5 9" />,
  plus: () => <path d="M12 5v14M5 12h14" />,
  refresh: () => (
    <>
      <path d="M19 10a7 7 0 0 0-12.3-4.2M5 14a7 7 0 0 0 12.3 4.2" />
      <path d="M18.6 4.6v4.6H14M5.4 19.4v-4.6H10" />
    </>
  ),
  copy: () => (
    <>
      <rect x="4.3" y="4.3" width="11" height="13.5" rx="1.6" />
      <path d="M8.3 19.7h9.4a1.6 1.6 0 0 0 1.6-1.6V8" strokeDasharray="0" />
    </>
  ),
  trash: () => (
    <>
      <path d="M4.5 7h15M9.5 7V5a1.6 1.6 0 0 1 1.6-1.6h1.8A1.6 1.6 0 0 1 14.5 5v2" />
      <path d="M6.3 7l.8 11.3A1.8 1.8 0 0 0 8.9 20h6.2a1.8 1.8 0 0 0 1.8-1.7L17.7 7" />
      <path d="M10.3 11v5.3M13.7 11v5.3" />
    </>
  ),
  bolt: () => <path d="M13 3 6 13.3h4.8L11 21l7-10.3h-4.8L13 3Z" />,
  shield: () => (
    <>
      <path d="M12 3.6 19 6v5.6c0 4.4-2.9 7.6-7 9-4.1-1.4-7-4.6-7-9V6l7-2.4Z" />
      <path d="M8.8 12.1l2.1 2.2L15.4 10" />
    </>
  ),
  layers: () => (
    <>
      <path d="M12 3.6 20.5 8 12 12.4 3.5 8 12 3.6Z" />
      <path d="M3.5 12 12 16.4 20.5 12M3.5 16l8.5 4.4L20.5 16" />
    </>
  ),
  grid: () => (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.3" />
      <rect x="13" y="4" width="7" height="7" rx="1.3" />
      <rect x="4" y="13" width="7" height="7" rx="1.3" />
      <rect x="13" y="13" width="7" height="7" rx="1.3" />
    </>
  ),
  target: () => (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  prism: () => (
    <>
      <path d="M12 3.4 20 9l-3 11.6H7L4 9l8-5.6Z" />
      <path d="M4 9h16M12 3.4v17.2" />
    </>
  ),
  clock: () => (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.4V12l3.4 2" />
    </>
  ),
  flask: () => (
    <>
      <path d="M10 3.6h4M10.2 3.6v6.3L5.4 18a2 2 0 0 0 1.8 3h9.6a2 2 0 0 0 1.8-3l-4.8-8.1V3.6" />
      <path d="M8.1 15h7.8" />
      <circle cx="10.6" cy="17.6" r=".7" fill="currentColor" stroke="none" />
    </>
  ),
  keyboard: () => (
    <>
      <rect x="3.3" y="6.3" width="17.4" height="11.4" rx="1.8" />
      <path d="M6.3 10h.01M9.3 10h.01M12.3 10h.01M15.3 10h.01M17.7 10h.01M7.5 13.4h9" />
    </>
  ),
  star: () => (
    <path d="M12 3.8 14.5 9l5.7.6-4.3 3.9 1.2 5.7L12 16.3 6.9 19.2l1.2-5.7-4.3-3.9L9.5 9 12 3.8Z" />
  ),
  calculator: () => (
    <>
      <rect x="5" y="3.4" width="14" height="17.2" rx="2" />
      <path d="M7.6 7.4h8.8" />
      <circle cx="8" cy="12" r=".75" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r=".75" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r=".75" fill="currentColor" stroke="none" />
      <circle cx="8" cy="15.6" r=".75" fill="currentColor" stroke="none" />
      <circle cx="12" cy="15.6" r=".75" fill="currentColor" stroke="none" />
      <path d="M15 14.5v4.4M13.2 16.7h3.6" />
    </>
  ),
  ruler: () => (
    <>
      <rect x="3" y="9" width="18" height="6" rx="1.4" transform="rotate(-8 12 12)" />
      <path d="m7.1 9.8.7 2.4M10.6 9.2l.7 2.4M14.1 8.6l.7 2.4" />
    </>
  ),
  thermometer: () => (
    <>
      <path d="M12 4a2.2 2.2 0 0 1 2.2 2.2v7.6a4 4 0 1 1-4.4 0V6.2A2.2 2.2 0 0 1 12 4Z" />
      <path d="M12 9v5.6" />
      <circle cx="12" cy="16.6" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  gauge: () => (
    <>
      <path d="M4.5 16.5a7.5 7.5 0 1 1 15 0" />
      <path d="M12 16.5 15.3 11" />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  drive: () => (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M3.5 14.5h17" />
      <circle cx="7" cy="17.1" r=".8" fill="currentColor" stroke="none" />
      <path d="M10.4 17.1h6.2" />
    </>
  ),
  activity: () => <path d="M3.5 12.5h3.6l2.1-6.3 3.2 12.6 2.3-9.3 1.6 3h4.2" />,
  boxes: () => (
    <>
      <path d="M12 3.6 18.6 7v7L12 17.4 5.4 14V7L12 3.6Z" />
      <path d="M5.4 7 12 10.4 18.6 7M12 10.4v7" />
    </>
  ),
  infinity: () => (
    <path d="M7 9.3a3.3 3.3 0 1 0 0 6.6c2.4 0 3.7-2.1 5-4.3s2.6-4.3 5-4.3a3.3 3.3 0 1 1 0 6.6c-2.4 0-3.7-2.1-5-4.3S9.4 9.3 7 9.3Z" />
  ),
  trend: () => (
    <>
      <path d="M4 16.5 9.6 11l3.6 3.3L20 7" />
      <path d="M14.6 7h5.4v5.4" />
    </>
  ),
  wallet: () => (
    <>
      <path d="M4 7.6a2 2 0 0 1 2-2h11a1.4 1.4 0 0 1 1.4 1.4V8" />
      <rect x="4" y="7.6" width="16" height="11.8" rx="2" />
      <path d="M14.6 13.5a1.1 1.1 0 1 0 0 2.2h3.9v-2.2Z" fill="currentColor" stroke="none" />
    </>
  ),
  waves: () => (
    <>
      <path d="M3 9.5c1.6-1.6 3.2-1.6 4.8 0s3.2 1.6 4.8 0 3.2-1.6 4.8 0 3.2 1.6 4.8 0" />
      <path d="M3 15.5c1.6-1.6 3.2-1.6 4.8 0s3.2 1.6 4.8 0 3.2-1.6 4.8 0 3.2 1.6 4.8 0" />
    </>
  ),
  menu: () => <path d="M4 6.5h16M4 12h16M4 17.5h16" />,
  close: () => <path d="M5.6 5.6 18.4 18.4M18.4 5.6 5.6 18.4" />,
  search: () => (
    <>
      <circle cx="10.6" cy="10.6" r="6.6" />
      <path d="M15.3 15.3 20 20" />
    </>
  ),
  mic: () => (
    <>
      <rect x="9" y="3.4" width="6" height="10.4" rx="3" />
      <path d="M6 11.2a6 6 0 0 0 12 0" />
      <path d="M12 17.2V21M9 21h6" />
    </>
  ),
  sun: () => (
    <>
      <circle cx="12" cy="12" r="4.4" />
      <path d="M12 2.8v2.6M12 18.6v2.6M4.6 12H2M22 12h-2.6M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
    </>
  ),
  download: () => (
    <>
      <path d="M12 3.6v11M7.6 10.4l4.4 4.4 4.4-4.4" />
      <path d="M4.5 16.6v2.2a1.7 1.7 0 0 0 1.7 1.7h11.6a1.7 1.7 0 0 0 1.7-1.7v-2.2" />
    </>
  ),
  book: () => (
    <>
      <path d="M4.5 5.4A2 2 0 0 1 6.5 4H12v16H6.5a2 2 0 0 0-2 2V5.4Z" />
      <path d="M19.5 5.4A2 2 0 0 0 17.5 4H12v16h5.5a2 2 0 0 1 2 2V5.4Z" />
      <path d="M12 4v16" />
    </>
  ),
  language: () => (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M3.8 12h16.4M12 3.8c2 2.2 3.1 5 3.1 8.2s-1.1 6-3.1 8.2c-2-2.2-3.1-5-3.1-8.2s1.1-6 3.1-8.2Z" />
      <path d="M6.1 6.3c1.6 1 3.7 1.6 5.9 1.6s4.3-.6 5.9-1.6M6.1 17.7c1.6-1 3.7-1.6 5.9-1.6s4.3.6 5.9 1.6" />
    </>
  ),
  path: () => (
    <>
      <circle cx="5.4" cy="18.6" r="2" />
      <circle cx="12" cy="7.5" r="2" />
      <circle cx="18.6" cy="18.6" r="2" />
      <path d="M6.9 17.3 10.6 9.3M13.4 9.3l3.7 8" />
    </>
  ),
  flag: () => (
    <>
      <path d="M6 20.6V4" />
      <path d="M6 5.2h11.4l-2.6 3.6 2.6 3.6H6" />
    </>
  ),
  ear: () => (
    <>
      <path d="M8.4 16.3a5.6 5.6 0 1 1 7.8-5.6c-.1 1.7-1 2.4-1.9 3.2-.8.7-1.5 1.4-1.5 2.8a2.3 2.3 0 0 1-4.4.9" />
      <path d="M11 11.4a2 2 0 1 1 2.8 1.8" />
    </>
  ),
  node: () => (
    <>
      <circle cx="12" cy="12" r="3.4" />
      <circle cx="12" cy="12" r="7.6" strokeDasharray="2.6 3.2" />
    </>
  ),
};

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.9,
  className = "",
  ...rest
}: { name: IconName; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  const draw = GLYPHS[name];
  const fill = (rest.color as string) ?? "currentColor";
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden
      {...rest}
    >
      {draw({ fill })}
    </svg>
  );
}

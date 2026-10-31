import { ImageResponse } from "next/og";
import type { SearchPage } from "@/lib/search-pages";
import { SITE } from "@/lib/site";
import type { ReactNode } from "react";


/**
 * The page image. For articles (guides and worked examples) this is the
 * actual hero illustration shown on the page via <img>, so the same file that
 * Google Images indexes is the one visitors see. For tools and information
 * pages it is a compact share card. Everything is drawn here as original
 * vector art; text is rendered as HTML because the OG rasteriser does not
 * support SVG <text> nodes.
 */

type Scene =
  | "meter-foot" | "thermometer" | "mass" | "data" | "compound" | "matrix"
  | "exchange" | "road" | "speed" | "liquid" | "quadratic" | "area"
  | "inflation" | "receipt" | "bitcoin" | "voice" | "formula" | "board";

type Palette = { paper: string; wash: string; accent: string; accent2: string };

/**
 * Restrained drafting-room palette.
 *
 * The first version of these plates leaned on bright, saturated pastels and
 * glossy candy accents — the look people now read instantly as "machine
 * generated". They are replaced here by the inks of a printed engineering
 * handbook: warm off-white stock, one muted process colour and one earthy
 * secondary per subject, so each plate reads as a drawn figure, not a render.
 */
const PALETTES: Record<Scene, Palette> = {
  "meter-foot": { paper: "#f4f1e8", wash: "#e4e0d2", accent: "#2f5d7c", accent2: "#b4873f" },
  thermometer: { paper: "#f5f0e9", wash: "#e6ded1", accent: "#a8452f", accent2: "#577083" },
  mass: { paper: "#f2f2ea", wash: "#dfe2d6", accent: "#4a6b4f", accent2: "#9a7b3f" },
  data: { paper: "#f1f1ee", wash: "#dedfe2", accent: "#4c4f6b", accent2: "#8c6a4a" },
  compound: { paper: "#f6f1e5", wash: "#e8dfc9", accent: "#8a6a2b", accent2: "#4a6b4f" },
  matrix: { paper: "#eff2f0", wash: "#dbe3df", accent: "#2f6557", accent2: "#4d5f78" },
  exchange: { paper: "#f6f2e7", wash: "#e8dfcb", accent: "#7d6128", accent2: "#3f5d74" },
  road: { paper: "#f1f2f1", wash: "#dde1e3", accent: "#3b5f7d", accent2: "#9b5a3c" },
  speed: { paper: "#f0f2ed", wash: "#dde3d9", accent: "#3f6b4c", accent2: "#8c7434" },
  liquid: { paper: "#eef2f2", wash: "#dae3e3", accent: "#2f6470", accent2: "#95643c" },
  quadratic: { paper: "#f2f0f3", wash: "#e0dde4", accent: "#56476b", accent2: "#9b5a3c" },
  area: { paper: "#f2f3ec", wash: "#e0e4d4", accent: "#5c6e34", accent2: "#44617c" },
  inflation: { paper: "#f5f0ee", wash: "#e6dcd9", accent: "#8b4a56", accent2: "#45617a" },
  receipt: { paper: "#f6f2ea", wash: "#e8ded0", accent: "#8a5a32", accent2: "#5b6a46" },
  bitcoin: { paper: "#f5f2e8", wash: "#e7e0cd", accent: "#7f6420", accent2: "#3f5970" },
  voice: { paper: "#f1f2f4", wash: "#dde1e7", accent: "#3b5675", accent2: "#8a6a3a" },
  formula: { paper: "#f2f2ef", wash: "#dfe0dc", accent: "#3c5570", accent2: "#8a5f3a" },
  board: { paper: "#eff1f3", wash: "#dcdfe4", accent: "#27313f", accent2: "#8a6a3a" },
};

const SCENES: Array<[RegExp, Scene]> = [
  [/tools\/calculator/, "board"],
  [/voice-coach/, "voice"],
  [/meters-to-feet|centimeters-to-inches/, "meter-foot"],
  [/celsius-to-fahrenheit/, "thermometer"],
  [/pounds-to-kilograms|kilograms-to-pounds/, "mass"],
  [/megabytes-vs-mebibytes/, "data"],
  [/compound-interest|loan-payment/, "compound"],
  [/solve-linear-systems/, "matrix"],
  [/exchange-rate|usd-to-eur|currency/, "exchange"],
  [/miles-to-kilometers/, "road"],
  [/kilometers-per-hour-to-mph/, "speed"],
  [/liters-to-us-gallons|liters-to-gallons/, "liquid"],
  [/quadratic/, "quadratic"],
  [/square-feet-to-square-meters/, "area"],
  [/inflation|economy/, "inflation"],
  [/split-a-bill|tip-split/, "receipt"],
  [/bitcoin|crypto/, "bitcoin"],
];

function sceneFor(path: string): Scene {
  for (const [matcher, scene] of SCENES) if (matcher.test(path)) return scene;
  return "formula";
}

/** Small HTML labels placed over the art (the rasteriser cannot draw SVG text). */
function Tag({ x, y, children, bg = "#fbf9f3", fg = "#23272e" }: { x: number; y: number; children: ReactNode; bg?: string; fg?: string }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", padding: "4px 9px", borderRadius: 3, background: bg, color: fg, border: "1.4px solid #23272e", fontSize: 16, fontWeight: 600, letterSpacing: 0.3, lineHeight: 1 }}>
      {children}
    </div>
  );
}

/** Content-specific vector scenes on a 560×360 canvas. Path-only SVG. */
function SceneArt({ scene, p, scale = 1 }: { scene: Scene; p: Palette; scale?: number }): ReactNode {
  const L = "#23272e"; // printing ink, not UI black
  const a = p.accent;
  const b = p.accent2;
  const W = 560, H = 360;
  // Crisp, flat vector shapes compress efficiently without grain or glows.
  // A plate from a printed manual: ruled stock, a trimmed border, registration
  // ticks in the corners and a single flat ground line. Deliberately plain —
  // no glows, no gradients, no symmetrical "sticker" blobs.
  const svg = (children: ReactNode) => (
    <svg width={W * scale} height={H * scale} viewBox={`0 0 ${W} ${H}`} fill="none">
      <rect width={W} height={H} fill={p.paper} />
      {/* faint 20px drafting grid */}
      {Array.from({ length: Math.floor(W / 20) }).map((_, i) => (
        <path key={`v${i}`} d={`M${i * 20} 0v${H}`} stroke={p.wash} strokeWidth="1" />
      ))}
      {Array.from({ length: Math.floor(H / 20) }).map((_, i) => (
        <path key={`h${i}`} d={`M0 ${i * 20}h${W}`} stroke={p.wash} strokeWidth="1" />
      ))}
      <rect x="14" y="14" width={W - 28} height={H - 28} fill="none" stroke={L} strokeWidth="1.6" />
      <path d="M14 34V14h20M546 14h-20v20M14 326v20h20M546 346h-20v-20" stroke={L} strokeWidth="2.4" fill="none" />
      <path d={`M28 300h${W - 56}`} stroke={L} strokeWidth="2" />
      {Array.from({ length: 22 }).map((_, i) => (
        <path key={`t${i}`} d={`M${34 + i * 23} 300v${i % 5 === 0 ? 9 : 5}`} stroke={L} strokeWidth="1.4" />
      ))}
      {children}
    </svg>
  );
  switch (scene) {
    case "meter-foot": return svg(<g>
      <g transform="translate(60 120) rotate(-7 220 30)">
        <rect width="440" height="60" rx="10" fill="#fff" stroke={L} strokeWidth="4" />
        {Array.from({ length: 29 }).map((_, i) => <path key={i} d={`M${16 + i * 15} 0v${i % 5 === 0 ? 30 : i % 2 ? 13 : 20}`} stroke={L} strokeWidth="2.6" />)}
      </g>
      <path d="M90 262h380" stroke={L} strokeWidth="4" strokeDasharray="4 11" strokeLinecap="round" />
      <path d="M440 244l40 18-40 18" fill={a} stroke={L} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="92" cy="262" r="13" fill={b} stroke={L} strokeWidth="3" />
    </g>);
    case "thermometer": return svg(<g>
      <path d="M150 42a22 22 0 0 1 22 22v142a42 42 0 1 1-44 0V64a22 22 0 0 1 22-22Z" fill="#fff" stroke={L} strokeWidth="4.5" />
      <path d="M150 112v100" stroke={a} strokeWidth="20" strokeLinecap="round" />
      <circle cx="150" cy="248" r="27" fill={a} stroke={L} strokeWidth="4.5" />
      <path d="M232 128h130" stroke={L} strokeWidth="4.5" strokeDasharray="5 10" strokeLinecap="round" />
      <path d="M350 108l36 20-36 20" fill={b} stroke={L} strokeWidth="3.2" strokeLinejoin="round" />
      <circle cx="470" cy="80" r="30" fill={b} stroke={L} strokeWidth="4" />
      {Array.from({ length: 8 }).map((_, i) => <path key={i} d="M470 36v-14" stroke={L} strokeWidth="4" strokeLinecap="round" transform={`rotate(${i * 45} 470 80)`} />)}
    </g>);
    case "mass": return svg(<g>
      <path d="M280 48v230M136 86h288" stroke={L} strokeWidth="5" strokeLinecap="round" />
      <circle cx="280" cy="48" r="8" fill={L} />
      <path d="M160 86l-40 100h80Z" fill="#fff" stroke={L} strokeWidth="4" strokeLinejoin="round" />
      <path d="M400 86l-40 100h80Z" fill={a} stroke={L} strokeWidth="4" strokeLinejoin="round" />
      <path d="M160 86l-40 100M160 86l40 100M400 86l-40 100M400 86l40 100" stroke={L} strokeWidth="2.4" />
      <rect x="228" y="276" width="104" height="30" rx="8" fill={b} stroke={L} strokeWidth="4" />
    </g>);
    case "data": return svg(<g>
      <rect x="110" y="40" width="170" height="270" rx="16" fill="#fff" stroke={L} strokeWidth="4.5" />
      {[0, 1, 2, 3, 4].map((row) => <g key={row}><rect x="132" y={66 + row * 48} width="126" height="30" rx="6" fill={row % 2 ? a : "#e6e8ec"} stroke={L} strokeWidth="2.4" /><circle cx="150" cy={81 + row * 48} r="4" fill={row % 2 ? "#fff" : L} /></g>)}
      <path d="M310 176h90" stroke={L} strokeWidth="4.5" strokeDasharray="5 10" strokeLinecap="round" />
      <path d="M384 156l34 20-34 20" fill={b} stroke={L} strokeWidth="3.2" strokeLinejoin="round" />
      <circle cx="470" cy="176" r="46" fill={a} stroke={L} strokeWidth="4.5" />
      <path d="M452 160h36M470 160v34" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
    </g>);
    case "compound": return svg(<g>
      <path d="M70 300h430" stroke={L} strokeWidth="4" strokeLinecap="round" />
      <path d="M92 284c60-22 94-30 140-72 50-44 96-36 136-82 40-46 84-30 126-96" fill="none" stroke={a} strokeWidth="7" strokeLinecap="round" />
      {[0, 1, 2, 3].map((i) => <g key={i} transform={`translate(${120 + i * 100} ${264 - i * 44})`}><ellipse cx="0" cy="18" rx="36" ry="11" fill={i % 2 ? a : b} stroke={L} strokeWidth="3.5" /><ellipse cx="0" cy="4" rx="36" ry="11" fill="#e3d7b4" stroke={L} strokeWidth="3.5" /><ellipse cx="0" cy="-10" rx="36" ry="11" fill={i % 2 ? b : a} stroke={L} strokeWidth="3.5" /></g>)}
    </g>);
    case "matrix": return svg(<g>
      <path d="M118 60v230M136 60v230M424 60v230M406 60v230" stroke={L} strokeWidth="5" strokeLinecap="round" />
      {[[190, 130], [320, 130], [190, 230], [320, 230]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="30" fill={i === 0 || i === 3 ? a : "#fff"} stroke={L} strokeWidth="4" />)}
      <path d="M190 112v36M172 130h36" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <path d="M302 230h36" stroke={L} strokeWidth="5" strokeLinecap="round" />
      <path d="M462 180h40" stroke={L} strokeWidth="4.5" /><path d="M490 160l32 20-32 20" fill={b} stroke={L} strokeWidth="3.2" />
    </g>);
    case "exchange": return svg(<g>
      <circle cx="170" cy="180" r="76" fill={a} stroke={L} strokeWidth="5" />
      <circle cx="170" cy="180" r="58" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="6 10" />
      <circle cx="400" cy="180" r="76" fill={b} stroke={L} strokeWidth="5" />
      <circle cx="400" cy="180" r="58" fill="none" stroke={L} strokeWidth="3" strokeDasharray="6 10" />
      <path d="M252 152h74M326 134l30 18-30 18M318 208h-74M244 190l-30 18 30 18" stroke={L} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </g>);
    case "road": return svg(<g>
      <path d="M70 300c60-150 230-190 440-120" fill="none" stroke={L} strokeWidth="56" strokeLinecap="round" />
      <path d="M70 300c60-150 230-190 440-120" fill="none" stroke="#fbf9f3" strokeWidth="46" strokeLinecap="round" />
      <path d="M92 282c60-128 220-164 400-104" fill="none" stroke={a} strokeWidth="5" strokeDasharray="14 18" strokeLinecap="round" />
      <path d="M112 236l44 28-50 12Z" fill={b} stroke={L} strokeWidth="3.5" strokeLinejoin="round" />
      <circle cx="486" cy="146" r="22" fill={b} stroke={L} strokeWidth="4" />
    </g>);
    case "speed": return svg(<g>
      <path d="M90 262a190 190 0 0 1 380 0" fill="none" stroke={L} strokeWidth="9" strokeLinecap="round" />
      <path d="M90 262a190 190 0 0 1 206-184" fill="none" stroke={a} strokeWidth="11" strokeLinecap="round" />
      <path d="M280 262l108-132" stroke={L} strokeWidth="7" strokeLinecap="round" />
      <circle cx="280" cy="262" r="17" fill={L} /><circle cx="280" cy="262" r="7" fill={b} />
      {[0, 1, 2, 3, 4].map((i) => <path key={i} d="M280 90v-16" stroke={L} strokeWidth="5" strokeLinecap="round" transform={`rotate(${-90 + i * 45} 280 262)`} />)}
    </g>);
    case "liquid": return svg(<g>
      <path d="M120 70h110v190H120Z" fill="#fff" stroke={L} strokeWidth="4.5" />
      <path d="M120 160h110v100H120Z" fill={a} stroke={L} strokeWidth="3" />
      <path d="M120 108h110M120 146h110" stroke={L} strokeWidth="2.4" opacity=".55" />
      <path d="M268 170h86" stroke={L} strokeWidth="4.5" strokeDasharray="5 10" /><path d="M334 150l34 20-34 20" fill={b} stroke={L} strokeWidth="3.2" />
      <path d="M402 100h58l12 28v132h-82V128Z" fill="#fff" stroke={L} strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M390 192h82v68h-82Z" fill={a} stroke={L} strokeWidth="3" />
    </g>);
    case "quadratic": return svg(<g>
      <path d="M70 288h420M280 50v238" stroke={L} strokeWidth="3" opacity=".55" />
      <path d="M106 70c66 236 222 236 348 0" fill="none" stroke={a} strokeWidth="8" strokeLinecap="round" />
      <circle cx="190" cy="288" r="11" fill={L} /><circle cx="370" cy="288" r="11" fill={L} />
      <circle cx="190" cy="288" r="4" fill={b} /><circle cx="370" cy="288" r="4" fill={b} />
    </g>);
    case "area": return svg(<g>
      {Array.from({ length: 4 }).map((_, row) => Array.from({ length: 6 }).map((__, col) => (
        <rect key={`${row}-${col}`} x={110 + col * 58} y={66 + row * 50} width="52" height="44" rx="4" fill={row === 1 && col === 2 ? a : "#fff"} stroke={L} strokeWidth="2.6" />
      )))}
      <path d="M98 62v202M94 62h18M94 264h18M106 276h348M106 272v18M454 272v18" stroke={L} strokeWidth="3.5" />
      <circle cx="486" cy="100" r="22" fill={b} stroke={L} strokeWidth="4" />
    </g>);
    case "inflation": return svg(<g>
      <path d="M90 290V60M90 290h400" stroke={L} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M126 246 206 220 280 232 356 160 452 100" fill="none" stroke={a} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      {[[126, 246], [206, 220], [280, 232], [356, 160], [452, 100]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="10" fill={b} stroke={L} strokeWidth="3.5" />)}
      {[0, 1, 2, 3].map((i) => <path key={i} d={`M90 ${110 + i * 52}h400`} stroke={L} strokeWidth="1.5" opacity=".2" />)}
    </g>);
    case "receipt": return svg(<g>
      <path d="M130 42h190v232l-17-11-17 11-17-11-17 11-17-11-17 11-17-11-17 11-17-11-17 11-17-11-17 11V42Z" fill="#fbf9f3" stroke={L} strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M160 94h130M160 128h130M160 162h84M160 206h130" stroke={L} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M160 236h130" stroke={L} strokeWidth="3" strokeDasharray="3 7" />
      <circle cx="430" cy="196" r="64" fill={a} stroke={L} strokeWidth="5" />
      <path d="M404 172l52 48M456 172l-52 48" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity=".9" />
    </g>);
    case "bitcoin": return svg(<g>
      <circle cx="226" cy="180" r="104" fill="#e3d7b4" stroke={L} strokeWidth="6" />
      <circle cx="226" cy="180" r="80" fill="none" stroke={L} strokeWidth="3" strokeDasharray="5 11" />
      <path d="M200 120v120M226 120v120M190 134h52c14 0 24 10 24 22s-10 22-24 22h-52M190 178h58c14 0 24 10 24 22s-10 22-24 22h-58" stroke={L} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M360 236c50-20 76-62 104-128" fill="none" stroke={a} strokeWidth="7" strokeLinecap="round" />
      <path d="M440 110l34-2-10 32" fill={b} stroke={L} strokeWidth="3.5" strokeLinejoin="round" />
    </g>);
    case "board": return svg(<g>
      <rect x="70" y="48" width="420" height="250" rx="22" fill="#243044" stroke={L} strokeWidth="5" />
      <path d="M110 118c40-18 90 12 140-6 46-16 88 20 140 4" fill="none" stroke="#f6f1e4" strokeWidth="7" strokeLinecap="round" />
      <path d="M118 188h92M118 216h168" stroke="#ece0bf" strokeWidth="6" strokeLinecap="round" />
      <circle cx="430" cy="86" r="18" fill={b} stroke={L} strokeWidth="4" />
    </g>);
    case "voice": return svg(<g>
      <rect x="92" y="78" width="60" height="110" rx="30" fill="#fff" stroke={L} strokeWidth="5" />
      <path d="M62 160a60 60 0 0 0 120 0" fill="none" stroke={L} strokeWidth="5.5" strokeLinecap="round" />
      <path d="M122 222v34M92 256h60" stroke={L} strokeWidth="5.5" strokeLinecap="round" />
      {[22, 48, 76, 112, 70, 40, 92, 124, 58, 30].map((h, i) => <path key={i} d={`M${232 + i * 23} ${180 - h / 2}v${h}`} stroke={a} strokeWidth="9" strokeLinecap="round" />)}
      <circle cx="486" cy="100" r="26" fill={b} stroke={L} strokeWidth="4" />
    </g>);
    default: return svg(<g>
      <rect x="110" y="64" width="340" height="232" rx="22" fill="#fff" stroke={L} strokeWidth="5" />
      <path d="M146 124h200M146 180h260M146 236h150" stroke={L} strokeWidth="5" strokeLinecap="round" />
      <circle cx="394" cy="124" r="36" fill={a} stroke={L} strokeWidth="4.5" />
      <path d="M378 114h32M378 134h32" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
    </g>);
  }
}

/** Example labels that make each article image specific to its worked example. */
const SCENE_TAGS: Partial<Record<Scene, Array<{ x: number; y: number; text: string; bg?: string; fg?: string }>>> = {
  // Annotations sit on the plate like a draughtsman's callouts: paper-tinted
  // label boxes with hairline rules, never coloured stickers.
  "meter-foot": [{ x: 30, y: 70, text: "1 m" }, { x: 420, y: 70, text: "3.28 ft", bg: "#dfe4ea", fg: "#23272e" }],
  thermometer: [{ x: 230, y: 160, text: "20 °C" }, { x: 395, y: 160, text: "68 °F", bg: "#e8dcd4", fg: "#23272e" }],
  mass: [{ x: 100, y: 200, text: "10 lb" }, { x: 340, y: 200, text: "4.54 kg", bg: "#dfe6da" }],
  data: [{ x: 300, y: 72, text: "1 MB = 1,000,000 B" }, { x: 300, y: 236, text: "1 MiB = 2²⁰ B", bg: "#e1dfe8", fg: "#23272e" }],
  compound: [{ x: 30, y: 70, text: "A = P(1 + r/n)^(nt)" }, { x: 360, y: 236, text: "n = 12, t = 10", bg: "#ece4cf" }],
  matrix: [{ x: 150, y: 72, text: "2x + y = 5" }, { x: 320, y: 72, text: "x − y = 1" }, { x: 190, y: 250, text: "x = 2, y = 1", bg: "#dae5e1", fg: "#23272e" }],
  exchange: [{ x: 134, y: 164, text: "USD", bg: "#ece0cb", fg: "#23272e" }, { x: 364, y: 164, text: "EUR", bg: "#dfe4ea", fg: "#23272e" }, { x: 206, y: 72, text: "amount × rate" }],
  road: [{ x: 30, y: 72, text: "5 mi" }, { x: 400, y: 236, text: "8.05 km", bg: "#dfe4ea", fg: "#23272e" }],
  speed: [{ x: 60, y: 236, text: "100 km/h" }, { x: 370, y: 236, text: "62.1 mph", bg: "#dde7df", fg: "#23272e" }],
  liquid: [{ x: 60, y: 72, text: "10 L", bg: "#dae6e8", fg: "#23272e" }, { x: 360, y: 72, text: "2.64 US gal" }],
  quadratic: [{ x: 150, y: 72, text: "x² − 5x + 6 = 0" }, { x: 140, y: 250, text: "x = 2" }, { x: 330, y: 250, text: "x = 3" }],
  area: [{ x: 30, y: 236, text: "500 ft²" }, { x: 380, y: 236, text: "46.45 m²", bg: "#e2e7d6", fg: "#23272e" }],
  inflation: [{ x: 210, y: 72, text: "(206 − 200) ÷ 200 = 3%" }],
  receipt: [{ x: 30, y: 72, text: "184.50 × 1.12 ÷ 5" }, { x: 370, y: 236, text: "41.33 each", bg: "#ece0d2", fg: "#23272e" }],
  bitcoin: [{ x: 30, y: 72, text: "BTC · 24h change" }],
  voice: [{ x: 290, y: 236, text: "“120 USD to EUR”", bg: "#23272e", fg: "#f4f2ec" }],
  board: [{ x: 90, y: 236, text: "sketch · calculate", bg: "#ece4cf", fg: "#23272e" }],
};

/** Draws the plate for a page: a reproduced figure, not a generated render. */
export function renderPageImage(page: SearchPage) {
  const scene = sceneFor(page.path);
  const p = PALETTES[scene];
  const isArticle = page.kind === "article";
  // The art for a given slug is deterministic, so it can be cached hard. This
  // turns the 1200×630 render into a one-time cost per image per visitor.
  const headers = {
    "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
  };

  if (isArticle) {
    // Scene-dominant editorial image: the illustration fills the frame and the
    // article title sits in a caption band, so the picture reads as content in
    // image search rather than as a text card.
    return new ImageResponse(
      <div style={{ display: "flex", width: "100%", height: "100%", background: p.paper, color: "#23272e", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        {/* 560×360 scene scaled ×2.143 = 1200×771; the top 490px fills the stage
            edge to edge so the picture reads as a full-bleed illustration. */}
        <div style={{ display: "flex", position: "relative", width: 1200, height: 490, alignItems: "center", justifyContent: "center", overflow: "hidden", background: p.paper }}>
          {/* The complete 560×360 plate, scaled to the stage height, so the
              drawn border, grid and scale bar stay visible — a reproduced
              figure rather than a zoomed-in crop. */}
          <div style={{ display: "flex", position: "relative", width: 762, height: 490 }}>
            <SceneArt scene={scene} p={p} scale={1.361} />
            {(SCENE_TAGS[scene] ?? []).map((tag, i) => (
              <Tag key={i} x={tag.x * 1.361} y={tag.y * 1.361} bg={tag.bg} fg={tag.fg}>{tag.text}</Tag>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 22, padding: "0 54px", background: "#fbf9f3", borderTop: "1.6px solid #23272e" }}>
          <div style={{ display: "flex", width: 50, height: 50, borderRadius: 4, background: p.accent, border: "1.6px solid #23272e", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 600, color: "#fbf9f3" }}>Q</div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", fontSize: page.title.length > 52 ? 29 : 34, fontWeight: 600, lineHeight: 1.12, letterSpacing: -0.2 }}>{page.title}</div>
            <div style={{ display: "flex", marginTop: 6, fontSize: 18, color: "#5a5f67" }}>{page.formula ?? SITE.name} · drawn plate · {SITE.name}</div>
          </div>
        </div>
      </div>,
      { width: 1200, height: 630, headers },
    );
  }

  return new ImageResponse(
      <div style={{ display: "flex", position: "relative", width: "100%", height: "100%", background: "#f4f2ec", color: "#23272e", padding: "42px 54px", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: 6, background: p.accent }} />
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", width: 44, height: 44, borderRadius: 4, background: p.accent2, border: "1.6px solid #23272e", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 600, color: "#fbf9f3" }}>Q</div>
        <span style={{ fontSize: 28, fontWeight: 700 }}>{SITE.name}</span>
        <span style={{ fontSize: 16, marginLeft: "auto", color: "#5a5f67" }}>CALCULATE · CONVERT · EXPLORE</span>
      </div>
      <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 38 }}>
        <div style={{ display: "flex", width: "52%", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: page.title.length > 65 ? 43 : 51, fontWeight: 700, lineHeight: 1.08 }}>{page.title}</div>
          <div style={{ display: "flex", marginTop: 22, padding: "15px 18px", fontSize: 23, lineHeight: 1.25, background: "#fbf9f3", border: "1.4px solid #23272e", borderRadius: 4 }}>
            {page.formula ?? "Prepare inputs, then confirm the result."}
          </div>
        </div>
        <div style={{ display: "flex", width: "48%", height: 360, alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", borderRadius: 4 }}>
          <SceneArt scene={scene} p={p} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ background: p.accent, width: 13, height: 13, borderRadius: 2, border: "1.4px solid #23272e" }} />
        <span style={{ background: p.accent2, width: 13, height: 13, borderRadius: 2, border: "1.4px solid #23272e" }} />
        <span style={{ fontSize: 18, color: "#5a5f67", marginLeft: 8 }}>{page.path}</span>
        <span style={{ fontSize: 17, color: "#5a5f67", marginLeft: "auto" }}>No account required</span>
      </div>
    </div>,
    { width: 1200, height: 630, headers },
  );
}

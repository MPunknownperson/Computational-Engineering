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

const PALETTES: Record<Scene, Palette> = {
  "meter-foot": { paper: "#edf5ff", wash: "#c8e0ff", accent: "#5b8cff", accent2: "#ffd23f" },
  thermometer: { paper: "#fff0ec", wash: "#ffd1c6", accent: "#ff6b4a", accent2: "#ffd23f" },
  mass: { paper: "#effaf2", wash: "#c8f0d2", accent: "#4ade80", accent2: "#5b8cff" },
  data: { paper: "#f1efff", wash: "#d8d1ff", accent: "#7a61d9", accent2: "#ffd23f" },
  compound: { paper: "#fff7dd", wash: "#ffe6a0", accent: "#d09117", accent2: "#4ade80" },
  matrix: { paper: "#eef7f4", wash: "#c6eee4", accent: "#27a98f", accent2: "#5b8cff" },
  exchange: { paper: "#fff8dc", wash: "#ffdfa1", accent: "#df8c20", accent2: "#5b8cff" },
  road: { paper: "#eef5ff", wash: "#c9defd", accent: "#5b8cff", accent2: "#ff6b4a" },
  speed: { paper: "#eef9f3", wash: "#c6eed6", accent: "#2ebf69", accent2: "#ffd23f" },
  liquid: { paper: "#eaf8fb", wash: "#beeef2", accent: "#36b7c4", accent2: "#ff9d3d" },
  quadratic: { paper: "#f7f0ff", wash: "#e3d3ff", accent: "#9a6add", accent2: "#ff6b4a" },
  area: { paper: "#f4f8ea", wash: "#dcebb7", accent: "#7ba73c", accent2: "#5b8cff" },
  inflation: { paper: "#fff0f5", wash: "#ffd0df", accent: "#e35c8a", accent2: "#5b8cff" },
  receipt: { paper: "#fff6e6", wash: "#ffe0ae", accent: "#ef9343", accent2: "#ff6b4a" },
  bitcoin: { paper: "#fff8dc", wash: "#ffe9a8", accent: "#d09219", accent2: "#5b8cff" },
  voice: { paper: "#eef3ff", wash: "#cfe0ff", accent: "#5b8cff", accent2: "#ffd23f" },
  formula: { paper: "#f1f4ff", wash: "#d4ddff", accent: "#5b8cff", accent2: "#ff6b4a" },
  board: { paper: "#eef3ff", wash: "#d5deee", accent: "#243044", accent2: "#ffd23f" },
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
function Tag({ x, y, children, bg = "#fff", fg = "#0b1020" }: { x: number; y: number; children: ReactNode; bg?: string; fg?: string }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", padding: "6px 12px", borderRadius: 12, background: bg, color: fg, border: "2.5px solid #0b1020", fontSize: 22, fontWeight: 800, lineHeight: 1 }}>
      {children}
    </div>
  );
}

/** Content-specific vector scenes on a 560×360 canvas. Path-only SVG. */
function SceneArt({ scene, p, scale = 1 }: { scene: Scene; p: Palette; scale?: number }): ReactNode {
  const L = "#0b1020";
  const a = p.accent;
  const b = p.accent2;
  const W = 560, H = 360;
  // Crisp, flat vector shapes compress efficiently without grain or glows.
  const svg = (children: ReactNode) => (
    <svg width={W * scale} height={H * scale} viewBox={`0 0 ${W} ${H}`} fill="none">
      <rect width={W} height={H} rx="26" fill={p.wash} />
      <path d="M0 280c80-26 170-22 260-2s170 24 300-10v92H0Z" fill="#fffdf5" />
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
      {[0, 1, 2, 3, 4].map((row) => <g key={row}><rect x="132" y={66 + row * 48} width="126" height="30" rx="6" fill={row % 2 ? a : "#edf1ff"} stroke={L} strokeWidth="2.4" /><circle cx="150" cy={81 + row * 48} r="4" fill={row % 2 ? "#fff" : L} /></g>)}
      <path d="M310 176h90" stroke={L} strokeWidth="4.5" strokeDasharray="5 10" strokeLinecap="round" />
      <path d="M384 156l34 20-34 20" fill={b} stroke={L} strokeWidth="3.2" strokeLinejoin="round" />
      <circle cx="470" cy="176" r="46" fill={a} stroke={L} strokeWidth="4.5" />
      <path d="M452 160h36M470 160v34" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
    </g>);
    case "compound": return svg(<g>
      <path d="M70 300h430" stroke={L} strokeWidth="4" strokeLinecap="round" />
      <path d="M92 284c60-22 94-30 140-72 50-44 96-36 136-82 40-46 84-30 126-96" fill="none" stroke={a} strokeWidth="7" strokeLinecap="round" />
      {[0, 1, 2, 3].map((i) => <g key={i} transform={`translate(${120 + i * 100} ${264 - i * 44})`}><ellipse cx="0" cy="18" rx="36" ry="11" fill={i % 2 ? a : b} stroke={L} strokeWidth="3.5" /><ellipse cx="0" cy="4" rx="36" ry="11" fill="#ffd23f" stroke={L} strokeWidth="3.5" /><ellipse cx="0" cy="-10" rx="36" ry="11" fill={i % 2 ? b : a} stroke={L} strokeWidth="3.5" /></g>)}
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
      <path d="M70 300c60-150 230-190 440-120" fill="none" stroke="#fffdf5" strokeWidth="46" strokeLinecap="round" />
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
      <path d="M130 42h190v232l-17-11-17 11-17-11-17 11-17-11-17 11-17-11-17 11-17-11-17 11-17-11-17 11V42Z" fill="#fffdf5" stroke={L} strokeWidth="4.5" strokeLinejoin="round" />
      <path d="M160 94h130M160 128h130M160 162h84M160 206h130" stroke={L} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M160 236h130" stroke={L} strokeWidth="3" strokeDasharray="3 7" />
      <circle cx="430" cy="196" r="64" fill={a} stroke={L} strokeWidth="5" />
      <path d="M404 172l52 48M456 172l-52 48" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity=".9" />
    </g>);
    case "bitcoin": return svg(<g>
      <circle cx="226" cy="180" r="104" fill="#ffd23f" stroke={L} strokeWidth="6" />
      <circle cx="226" cy="180" r="80" fill="none" stroke={L} strokeWidth="3" strokeDasharray="5 11" />
      <path d="M200 120v120M226 120v120M190 134h52c14 0 24 10 24 22s-10 22-24 22h-52M190 178h58c14 0 24 10 24 22s-10 22-24 22h-58" stroke={L} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M360 236c50-20 76-62 104-128" fill="none" stroke={a} strokeWidth="7" strokeLinecap="round" />
      <path d="M440 110l34-2-10 32" fill={b} stroke={L} strokeWidth="3.5" strokeLinejoin="round" />
    </g>);
    case "board": return svg(<g>
      <rect x="70" y="48" width="420" height="250" rx="22" fill="#243044" stroke={L} strokeWidth="5" />
      <path d="M110 118c40-18 90 12 140-6 46-16 88 20 140 4" fill="none" stroke="#f6f1e4" strokeWidth="7" strokeLinecap="round" />
      <path d="M118 188h92M118 216h168" stroke="#ffe08a" strokeWidth="6" strokeLinecap="round" />
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
  // Visible band after the full-bleed crop is scene y ≈ 62–280 and x ≈ 0–520.
  "meter-foot": [{ x: 30, y: 70, text: "1 m" }, { x: 420, y: 70, text: "3.28 ft", bg: "#5b8cff", fg: "#0b1020" }],
  thermometer: [{ x: 230, y: 160, text: "20 °C" }, { x: 395, y: 160, text: "68 °F", bg: "#ff6b4a", fg: "#0b1020" }],
  mass: [{ x: 100, y: 200, text: "10 lb" }, { x: 340, y: 200, text: "4.54 kg", bg: "#4ade80" }],
  data: [{ x: 300, y: 72, text: "1 MB = 1,000,000 B" }, { x: 300, y: 236, text: "1 MiB = 2²⁰ B", bg: "#7a61d9", fg: "#0b1020" }],
  compound: [{ x: 30, y: 70, text: "A = P(1 + r/n)^(nt)" }, { x: 360, y: 236, text: "n = 12, t = 10", bg: "#ffd23f" }],
  matrix: [{ x: 150, y: 72, text: "2x + y = 5" }, { x: 320, y: 72, text: "x − y = 1" }, { x: 190, y: 250, text: "x = 2, y = 1", bg: "#27a98f", fg: "#0b1020" }],
  exchange: [{ x: 134, y: 164, text: "USD", bg: "#df8c20", fg: "#0b1020" }, { x: 364, y: 164, text: "EUR", bg: "#5b8cff", fg: "#0b1020" }, { x: 206, y: 72, text: "amount × rate" }],
  road: [{ x: 30, y: 72, text: "5 mi" }, { x: 400, y: 236, text: "8.05 km", bg: "#5b8cff", fg: "#0b1020" }],
  speed: [{ x: 60, y: 236, text: "100 km/h" }, { x: 370, y: 236, text: "62.1 mph", bg: "#2ebf69", fg: "#0b1020" }],
  liquid: [{ x: 60, y: 72, text: "10 L", bg: "#36b7c4", fg: "#0b1020" }, { x: 360, y: 72, text: "2.64 US gal" }],
  quadratic: [{ x: 150, y: 72, text: "x² − 5x + 6 = 0" }, { x: 140, y: 250, text: "x = 2" }, { x: 330, y: 250, text: "x = 3" }],
  area: [{ x: 30, y: 236, text: "500 ft²" }, { x: 380, y: 236, text: "46.45 m²", bg: "#7ba73c", fg: "#0b1020" }],
  inflation: [{ x: 210, y: 72, text: "(206 − 200) ÷ 200 = 3%" }],
  receipt: [{ x: 30, y: 72, text: "184.50 × 1.12 ÷ 5" }, { x: 370, y: 236, text: "41.33 each", bg: "#ef9343", fg: "#0b1020" }],
  bitcoin: [{ x: 30, y: 72, text: "BTC · 24h change" }],
  voice: [{ x: 290, y: 236, text: "“120 USD to EUR”", bg: "#0b1020", fg: "#ffd23f" }],
  board: [{ x: 90, y: 236, text: "sketch · calculate", bg: "#ffd23f", fg: "#0b1020" }],
};

/** Rendered by scripts/generate-guide-images.tsx, never on a visitor request. */
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
      <div style={{ display: "flex", width: "100%", height: "100%", background: p.paper, color: "#0b1020", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        {/* 560×360 scene scaled ×2.143 = 1200×771; the top 490px fills the stage
            edge to edge so the picture reads as a full-bleed illustration. */}
        <div style={{ display: "flex", position: "relative", width: 1200, height: 490, alignItems: "flex-start", justifyContent: "center", overflow: "hidden" }}>
          <div style={{ display: "flex", position: "relative", width: 1200, height: 771, marginTop: -120 }}>
            <SceneArt scene={scene} p={p} scale={2.143} />
            {(SCENE_TAGS[scene] ?? []).map((tag, i) => (
              <Tag key={i} x={tag.x * 2.143} y={tag.y * 2.143} bg={tag.bg} fg={tag.fg}>{tag.text}</Tag>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 22, padding: "0 54px", background: "#fffdf5", borderTop: "4px solid #0b1020" }}>
          <div style={{ display: "flex", width: 54, height: 54, borderRadius: 16, background: "#ffd23f", border: "3px solid #0b1020", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800 }}>R</div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", fontSize: page.title.length > 52 ? 30 : 36, fontWeight: 800, lineHeight: 1.1 }}>{page.title}</div>
            <div style={{ display: "flex", marginTop: 6, fontSize: 19, color: "#475569" }}>{page.formula ?? SITE.name} · {SITE.name}</div>
          </div>
        </div>
      </div>,
      { width: 1200, height: 630, headers },
    );
  }

  return new ImageResponse(
      <div style={{ display: "flex", position: "relative", width: "100%", height: "100%", background: "#f7f5ef", color: "#0b1020", padding: "42px 54px", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: 12, background: p.accent }} />
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", width: 46, height: 46, borderRadius: 13, background: p.accent2, border: "3px solid #0b1020", alignItems: "center", justifyContent: "center", fontSize: 21, fontWeight: 800 }}>R</div>
        <span style={{ fontSize: 28, fontWeight: 700 }}>{SITE.name}</span>
        <span style={{ fontSize: 16, marginLeft: "auto", color: "#475569" }}>CALCULATE · CONVERT · EXPLORE</span>
      </div>
      <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 38 }}>
        <div style={{ display: "flex", width: "52%", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: page.title.length > 65 ? 43 : 51, fontWeight: 700, lineHeight: 1.08 }}>{page.title}</div>
          <div style={{ display: "flex", marginTop: 22, padding: "15px 18px", fontSize: 23, lineHeight: 1.25, background: "#fffdf5", border: "2px solid #0b1020", borderRadius: 14 }}>
            {page.formula ?? "Prepare inputs, then confirm the result."}
          </div>
        </div>
        <div style={{ display: "flex", width: "48%", height: 360, alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", borderRadius: 26 }}>
          <SceneArt scene={scene} p={p} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ background: p.accent, width: 14, height: 14, borderRadius: 4, border: "2px solid #0b1020" }} />
        <span style={{ background: p.accent2, width: 14, height: 14, borderRadius: 4, border: "2px solid #0b1020" }} />
        <span style={{ fontSize: 18, color: "#475569", marginLeft: 8 }}>{page.path}</span>
        <span style={{ fontSize: 17, color: "#475569", marginLeft: "auto" }}>No account required</span>
      </div>
    </div>,
    { width: 1200, height: 630, headers },
  );
}

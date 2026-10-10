import type { ReactNode } from "react";
import type { ToolTone } from "@/components/ToolCard";

export type ToolCartoonId = "calculator" | "scientific" | "units" | "currency" | "crypto" | "formula" | "economy";

const WASH: Record<ToolTone, string> = {
  ink: "#e8ebf1",
  coral: "#ffe8df",
  sky: "#e5eeff",
  mint: "#e5f8ee",
  violet: "#f0e9ff",
  pink: "#ffe6f0",
  terra: "#ffefe4",
};

function Frame({ tone, label, children }: { tone: ToolTone; label: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 280 168" role="img" aria-label={label} className="tool-cartoon h-auto w-full">
      <rect x="8" y="8" width="264" height="152" rx="22" fill={WASH[tone]} stroke="#0b1020" strokeWidth="2.4" />
      <rect x="16" y="16" width="248" height="136" rx="16" fill="#fffdf8" stroke="#0b1020" strokeWidth="2" />
      {children}
    </svg>
  );
}

function CalculatorScene() {
  return (
    <Frame tone="ink" label="Cartoon of an owl sketching a sum on a blackboard">
      <rect x="36" y="36" width="128" height="96" rx="8" fill="#1c2438" stroke="#0b1020" strokeWidth="2.4" />
      <path className="cartoon-draw" d="M52 78h40M52 96h28M92 70l16 36" stroke="#f4f1ea" strokeWidth="3" strokeLinecap="round" fill="none" />
      <text x="58" y="64" fill="#ffd23f" fontSize="13" fontWeight="800">12 + 7</text>
      <g className="cartoon-bob">
        <rect x="148" y="48" width="10" height="42" rx="3" fill="#f4f1ea" stroke="#0b1020" strokeWidth="2" transform="rotate(18 153 70)" />
        <path d="M168 42c8 2 10 10 4 14" stroke="#cbd5e1" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
      <g className="cartoon-hop">
        <ellipse cx="214" cy="108" rx="28" ry="24" fill="#8b5a3c" stroke="#0b1020" strokeWidth="2.4" />
        <ellipse cx="214" cy="114" rx="16" ry="14" fill="#f4d9b3" stroke="#0b1020" strokeWidth="2" />
        <circle cx="206" cy="104" r="4" fill="#0b1020" />
        <circle cx="222" cy="104" r="4" fill="#0b1020" />
        <polygon points="214,112 210,118 218,118" fill="#ff9d3d" stroke="#0b1020" strokeWidth="1.4" />
        <polygon points="198,92 204,78 210,94" fill="#8b5a3c" stroke="#0b1020" strokeWidth="2" />
        <polygon points="230,92 224,78 218,94" fill="#8b5a3c" stroke="#0b1020" strokeWidth="2" />
      </g>
    </Frame>
  );
}

function ScientificScene() {
  return (
    <Frame tone="coral" label="Cartoon of a sigma, an orbit and a rising graph">
      <g className="cartoon-tilt" style={{ transformOrigin: "78px 84px" }}>
        <text x="48" y="108" fill="#b83a1c" fontSize="64" fontWeight="800">Σ</text>
      </g>
      <g className="cartoon-orbit">
        <circle cx="176" cy="78" r="36" fill="none" stroke="#315dc1" strokeWidth="2.4" strokeDasharray="6 6" />
        <circle cx="176" cy="42" r="7" fill="#ffd23f" stroke="#0b1020" strokeWidth="2" />
      </g>
      <path className="cartoon-draw" d="M150 124c16-8 22-28 36-30 12-2 16 10 28 4 10-5 16-18 28-16" stroke="#0b1020" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <text x="168" y="132" fontSize="12" fontWeight="800" fill="#334155">sin · √ · det</text>
    </Frame>
  );
}

function UnitsScene() {
  return (
    <Frame tone="sky" label="Cartoon of a stretching ruler, a bouncing weight and a rising thermometer">
      <g className="cartoon-stretch">
        <rect x="36" y="46" width="150" height="22" rx="6" fill="#ffd23f" stroke="#0b1020" strokeWidth="2.2" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <path key={i} d={`M${52 + i * 18} 48v${i % 2 ? 8 : 14}`} stroke="#0b1020" strokeWidth="2" />
        ))}
      </g>
      <g className="cartoon-bob">
        <path d="M78 88v18" stroke="#0b1020" strokeWidth="2.4" />
        <circle cx="78" cy="118" r="14" fill="#315dc1" stroke="#0b1020" strokeWidth="2.2" />
        <text x="78" y="122" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff">kg</text>
      </g>
      <g>
        <rect x="196" y="40" width="22" height="84" rx="11" fill="#fff" stroke="#0b1020" strokeWidth="2.2" />
        <rect className="cartoon-rise" x="201" y="78" width="12" height="40" rx="6" fill="#ff6b4a" />
        <circle cx="207" cy="124" r="12" fill="#ff6b4a" stroke="#0b1020" strokeWidth="2.2" />
      </g>
      <text x="150" y="140" fontSize="12" fontWeight="800" fill="#334155">m → ft</text>
    </Frame>
  );
}

function CurrencyScene() {
  return (
    <Frame tone="terra" label="Cartoon of a coin-cat watching coins flip">
      <g className="cartoon-flip">
        <ellipse cx="70" cy="72" rx="22" ry="22" fill="#ffd23f" stroke="#0b1020" strokeWidth="2.4" />
        <text x="70" y="78" textAnchor="middle" fontSize="16" fontWeight="800">$</text>
      </g>
      <g className="cartoon-flip" style={{ animationDelay: ".35s" }}>
        <ellipse cx="118" cy="58" rx="18" ry="18" fill="#c9daff" stroke="#0b1020" strokeWidth="2.4" />
        <text x="118" y="63" textAnchor="middle" fontSize="13" fontWeight="800">€</text>
      </g>
      <g className="cartoon-hop">
        <ellipse cx="196" cy="104" rx="36" ry="26" fill="#ffb26b" stroke="#0b1020" strokeWidth="2.4" />
        <polygon points="172,84 166,62 186,78" fill="#ffb26b" stroke="#0b1020" strokeWidth="2.2" />
        <polygon points="220,84 226,62 206,78" fill="#ffb26b" stroke="#0b1020" strokeWidth="2.2" />
        <circle cx="184" cy="98" r="4" fill="#0b1020" />
        <circle cx="208" cy="98" r="4" fill="#0b1020" />
        <path d="M190 112q6 6 12 0" stroke="#0b1020" strokeWidth="2" fill="none" />
        <path className="cartoon-wag" d="M160 108q-16-4-10-24" stroke="#0b1020" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      </g>
    </Frame>
  );
}

function CryptoScene() {
  return (
    <Frame tone="violet" label="Cartoon of a pulsing coin and growing price bars">
      <g className="cartoon-pulse">
        <circle cx="78" cy="78" r="32" fill="#6f4bd8" stroke="#0b1020" strokeWidth="2.4" />
        <circle cx="78" cy="78" r="22" fill="#dccfff" stroke="#0b1020" strokeWidth="2" />
        <text x="78" y="84" textAnchor="middle" fontSize="16" fontWeight="800">₿</text>
      </g>
      {[46, 70, 54, 86, 62].map((h, i) => (
        <rect key={h} className="cartoon-bar" x={150 + i * 20} y={128 - h} width="14" height={h} rx="4" fill={i % 2 ? "#ffd23f" : "#6f4bd8"} stroke="#0b1020" strokeWidth="2" style={{ animationDelay: `${i * 0.12}s` }} />
      ))}
      <path className="cartoon-spark" d="M118 42l4 8 8 2-8 2-4 8-4-8-8-2 8-2z" fill="#ffd23f" stroke="#0b1020" strokeWidth="1.4" />
    </Frame>
  );
}

function FormulaScene() {
  return (
    <Frame tone="pink" label="Cartoon of a pencil writing a formula while variables pop in">
      <rect x="40" y="42" width="150" height="86" rx="10" fill="#fff" stroke="#0b1020" strokeWidth="2.2" />
      <text x="54" y="78" fontSize="15" fontWeight="800" fill="#0b1020">P(1+r)ⁿ</text>
      <path className="cartoon-draw" d="M54 96h92" stroke="#c2417c" strokeWidth="3" strokeLinecap="round" />
      <g className="cartoon-scribble">
        <rect x="168" y="58" width="54" height="10" rx="3" fill="#ff9d3d" stroke="#0b1020" strokeWidth="2" transform="rotate(38 190 70)" />
        <polygon points="214,92 228,98 216,104" fill="#f4d9b3" stroke="#0b1020" strokeWidth="2" />
      </g>
      {["P", "r", "n"].map((v, i) => (
        <g key={v} className="cartoon-pop" style={{ animationDelay: `${0.2 + i * 0.25}s` }}>
          <circle cx={62 + i * 36} cy="138" r="12" fill="#ffe6f0" stroke="#0b1020" strokeWidth="2" />
          <text x={62 + i * 36} y="142" textAnchor="middle" fontSize="11" fontWeight="800">{v}</text>
        </g>
      ))}
    </Frame>
  );
}

function EconomyScene() {
  return (
    <Frame tone="mint" label="Cartoon of growing economic bars and a small newspaper">
      {[40, 62, 48, 78, 56, 88].map((h, i) => (
        <rect key={h} className="cartoon-bar" x={40 + i * 22} y={126 - h} width="16" height={h} rx="4" fill={i === 5 ? "#2f7d45" : "#b9efd0"} stroke="#0b1020" strokeWidth="2" style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
      <g className="cartoon-flap">
        <rect x="176" y="46" width="72" height="52" rx="6" fill="#fff" stroke="#0b1020" strokeWidth="2.2" />
        <path d="M184 60h56M184 70h40M184 80h48" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
        <text x="184" y="52" fontSize="9" fontWeight="800" fill="#2f7d45">GDP</text>
      </g>
      <circle className="cartoon-bob" cx="236" cy="124" r="10" fill="#ffd23f" stroke="#0b1020" strokeWidth="2" />
    </Frame>
  );
}

const SCENES: Record<ToolCartoonId, () => ReactNode> = {
  calculator: CalculatorScene,
  scientific: ScientificScene,
  units: UnitsScene,
  currency: CurrencyScene,
  crypto: CryptoScene,
  formula: FormulaScene,
  economy: EconomyScene,
};

export function ToolCartoon({ id }: { id: ToolCartoonId }) {
  const Scene = SCENES[id];
  return <Scene />;
}

/**
 * Homepage artwork: a flat, 2D cartoon scene. A cheerful calculator character
 * hops on a grassy hill beside a walking note card that holds a currency
 * question, while number bubbles float up, clouds drift and the sun turns.
 *
 * Everything is solid fills and bold ink outlines (no gradients or grain), so
 * it reads like an animation cel. Motion is transform-only, and the global
 * reduced-motion rule switches it all off. Animated groups are always nested
 * inside a positioned group so CSS transforms never replace SVG positioning.
 */
const INK = "#0b1020";

function Eyes({ x, y, gap = 22, r = 6.5 }: { x: number; y: number; gap?: number; r?: number }) {
  return (
    <g className="anim-blink">
      <ellipse cx={x} cy={y} rx={r} ry={r * 1.15} fill="#fff" stroke={INK} strokeWidth="2.4" />
      <ellipse cx={x + gap} cy={y} rx={r} ry={r * 1.15} fill="#fff" stroke={INK} strokeWidth="2.4" />
      <circle cx={x + 1.2} cy={y + 1} r={r * 0.5} fill={INK} />
      <circle cx={x + gap + 1.2} cy={y + 1} r={r * 0.5} fill={INK} />
      <circle cx={x - 0.6} cy={y - 1.4} r={r * 0.18} fill="#fff" />
      <circle cx={x + gap - 0.6} cy={y - 1.4} r={r * 0.18} fill="#fff" />
    </g>
  );
}

function Cloud({ w = 92 }: { w?: number }) {
  const s = w / 92;
  return (
    <path
      transform={`scale(${s})`}
      d="M14 40c-9 0-14-6-14-13s6-13 14-12c2-9 10-15 20-15 9 0 16 5 19 13 3-2 6-3 10-3 9 0 16 7 16 15 7 0 13 5 13 12s-6 13-13 13H14Z"
      fill="#fff"
      stroke={INK}
      strokeWidth={3 / s}
      strokeLinejoin="round"
    />
  );
}

export function HeroIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-[540px] select-none">
      <div className="art-plate art-plate--sky" aria-hidden="true" />
      <svg viewBox="0 0 520 430" className="illus art-plate__art hero-cartoon" aria-hidden>
        {/* sun with turning rays and a friendly face */}
        <g transform="translate(442 70)">
          <g className="cartoon-spin-slow">
            {Array.from({ length: 10 }).map((_, i) => (
              <path
                key={i}
                d="M0 -50 L7 -36 L-7 -36 Z"
                transform={`rotate(${i * 36})`}
                fill="#ffb01f"
                stroke={INK}
                strokeWidth="2.4"
                strokeLinejoin="round"
              />
            ))}
          </g>
          <circle r="31" fill="#ffd23f" stroke={INK} strokeWidth="3" />
          <path d="M-14 -24a28 28 0 0 1 22-5" stroke="#fff" strokeWidth="4" strokeLinecap="round" fill="none" />
          <circle cx="-9" cy="-3" r="3.2" fill={INK} />
          <circle cx="9" cy="-3" r="3.2" fill={INK} />
          <path d="M-9 8q9 8 18 0" stroke={INK} strokeWidth="2.8" strokeLinecap="round" fill="none" />
          <circle cx="-17" cy="6" r="4" fill="#ff7a59" opacity=".55" />
          <circle cx="17" cy="6" r="4" fill="#ff7a59" opacity=".55" />
        </g>

        {/* drifting clouds */}
        <g transform="translate(40 34)"><g className="cartoon-drift"><Cloud w={96} /></g></g>
        <g transform="translate(250 22)"><g className="cartoon-drift is-slow"><Cloud w={70} /></g></g>

        {/* rolling hills */}
        <path d="M-4 330c60-40 140-46 210-14s120 30 170 4 110-24 148 2v114H-4Z" fill="#8fe39b" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M-4 366c90-26 180-22 266 2s170 18 262-8v76H-4Z" fill="#4fcb6e" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        {/* grass tufts and flowers */}
        <g stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none">
          <path d="M60 392l4-10 3 10M190 404l4-10 3 10M380 398l4-10 3 10M470 388l4-10 3 10" />
        </g>
        {[[110, 384, "#ff7a59"], [300, 392, "#ffd23f"], [440, 376, "#c9a7ff"]].map(([x, y, c]) => (
          <g key={`${x}`} transform={`translate(${x} ${y})`}>
            <g className="cartoon-tilt">
              <path d="M0 0v14" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
              {[0, 72, 144, 216, 288].map((a) => (
                <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 5} cy={Math.sin((a * Math.PI) / 180) * 5} r="4" fill={c as string} stroke={INK} strokeWidth="1.8" />
              ))}
              <circle r="3" fill="#fff" stroke={INK} strokeWidth="1.8" />
            </g>
          </g>
        ))}

        {/* note card character holding the question */}
        <g transform="translate(64 128)">
          <g className="cartoon-waddle">
            {/* legs */}
            <g stroke={INK} strokeWidth="3.2" strokeLinecap="round">
              <path d="M62 196v22h-10M120 196v22h10" fill="none" />
            </g>
            <ellipse cx="91" cy="226" rx="66" ry="7" fill={INK} opacity=".12" />
            <rect x="6" y="6" width="170" height="194" rx="20" fill={INK} />
            <rect x="0" y="0" width="170" height="194" rx="20" fill="#fffdf4" stroke={INK} strokeWidth="3" />
            {/* arm waving */}
            <g transform="translate(168 104)">
              <g className="cartoon-wave">
                <path d="M0 0c14-6 24-18 28-32" stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none" />
                <circle cx="29" cy="-35" r="7" fill="#fffdf4" stroke={INK} strokeWidth="2.6" />
              </g>
            </g>
            <path d="M2 104c-12 8-18 20-18 32" stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none" />
            <Eyes x={60} y={40} gap={50} r={8} />
            <path d="M74 62q11 10 22 0" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
            <circle cx="46" cy="60" r="6" fill="#ff7a59" opacity=".45" />
            <circle cx="124" cy="60" r="6" fill="#ff7a59" opacity=".45" />
            <text x="22" y="112" fontSize="26" fontWeight="800" fill={INK}>120 USD</text>
            <text x="22" y="146" fontSize="23" fontWeight="800" fill="#2f66e0">→ EUR</text>
            <rect x="20" y="160" width="130" height="22" rx="11" fill="#ffd23f" stroke={INK} strokeWidth="2.4" />
            <text x="34" y="176" fontSize="11.5" fontWeight="800" fill={INK}>amount × rate</text>
          </g>
        </g>

        {/* calculator character, hopping */}
        <g transform="translate(300 112)">
          <ellipse cx="78" cy="248" rx="58" ry="7" fill={INK} opacity=".12" className="cartoon-shadow" />
          <g className="cartoon-hop">
            <g stroke={INK} strokeWidth="3.2" strokeLinecap="round" fill="none">
              <path d="M52 222v16h-10M104 222v16h10" />
              <path d="M2 120c-14 4-22 14-24 26M154 120c14-6 22-18 22-32" />
            </g>
            <circle cx="-22" cy="148" r="7" fill="#5b8cff" stroke={INK} strokeWidth="2.6" />
            <circle cx="176" cy="85" r="7" fill="#5b8cff" stroke={INK} strokeWidth="2.6" />
            <rect x="6" y="6" width="150" height="220" rx="24" fill={INK} />
            <rect x="0" y="0" width="150" height="220" rx="24" fill="#5b8cff" stroke={INK} strokeWidth="3" />
            {/* screen face */}
            <rect x="14" y="14" width="122" height="66" rx="14" fill="#d9f5ff" stroke={INK} strokeWidth="2.6" />
            <path d="M24 24h46" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
            <text x="34" y="68" fontSize="24" fontWeight="800" fill={INK}>110.42</text>
            <Eyes x={50} y={104} gap={50} r={8} />
            <path d="M63 124q12 12 24 0" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="#ff7a59" />
            {/* keys */}
            {Array.from({ length: 2 }).map((_, row) =>
              Array.from({ length: 3 }).map((__, col) => (
                <rect
                  key={`${row}-${col}`}
                  x={18 + col * 40}
                  y={146 + row * 32}
                  width="32"
                  height="24"
                  rx="9"
                  fill={row === 1 && col === 2 ? "#ffd23f" : "#fffdf4"}
                  stroke={INK}
                  strokeWidth="2.4"
                />
              )),
            )}
          </g>
        </g>

        {/* floating number bubbles */}
        {[
          { x: 250, y: 120, t: "+", c: "#ffd23f", d: "" },
          { x: 262, y: 216, t: "=", c: "#ff9fc4", d: "is-delay-1" },
          { x: 34, y: 120, t: "%", c: "#8fe39b", d: "is-delay-2" },
          { x: 484, y: 190, t: "÷", c: "#c9a7ff", d: "is-delay-1" },
        ].map((b) => (
          <g key={b.t} transform={`translate(${b.x} ${b.y})`}>
            <g className={`cartoon-float ${b.d}`}>
              <circle r="17" fill={b.c} stroke={INK} strokeWidth="2.8" />
              <path d="M-9 -7a10 10 0 0 1 7-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
              <text y="8" textAnchor="middle" fontSize="22" fontWeight="800" fill={INK}>{b.t}</text>
            </g>
          </g>
        ))}

        {/* sparkles */}
        {[[214, 76], [500, 280], [22, 260]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <g className="cartoon-spark">
              <path d="M0 -12l3.5 8.5L12 0l-8.5 3.5L0 12l-3.5-8.5L-12 0l8.5-3.5Z" fill="#fff" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}

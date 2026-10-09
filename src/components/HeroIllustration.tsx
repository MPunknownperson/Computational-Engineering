// Homepage editorial artwork: a hand-drawn number workbench rather than a
// repeating mascot loop. The scene tells the product story at a glance — a
// quantity, a unit pair, a formula and a result arranged on a calm paper desk.
// Scroll/parallax motion lives around this SVG; the illustration itself is
// deliberately still so it remains clear, polished and inexpensive to render.
export function HeroIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-[540px] select-none">
      <svg viewBox="0 0 520 430" className="w-full" aria-hidden>
        <defs>
          <radialGradient id="studio-wash" cx="48%" cy="44%" r="62%">
            <stop offset="0%" stopColor="#d8e6ff" stopOpacity=".85" />
            <stop offset="100%" stopColor="#d8e6ff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="studio-paper" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fffdf5" />
            <stop offset="100%" stopColor="#f2efe5" />
          </linearGradient>
        </defs>

        <ellipse cx="260" cy="210" rx="235" ry="175" fill="url(#studio-wash)" />
        <path d="M28 352c70-20 150-21 229-4s155 13 235-11v65H28Z" fill="#fff5dc" stroke="#0b1020" strokeWidth="3" />

        {/* background graph paper, deliberately faint */}
        <g opacity=".18" stroke="#0b1020" strokeWidth="1">
          {Array.from({ length: 8 }).map((_, i) => <path key={`v${i}`} d={`M${74 + i * 48} 54v238`} />)}
          {Array.from({ length: 5 }).map((_, i) => <path key={`h${i}`} d={`M74 ${74 + i * 48}h336`} />)}
        </g>

        {/* formula sheet */}
        <g transform="translate(78 82) rotate(-5 112 116)">
          <rect width="224" height="232" rx="16" fill="url(#studio-paper)" stroke="#0b1020" strokeWidth="3" />
          <path d="M25 47h110M25 66h164M25 85h139" stroke="#0b1020" strokeWidth="2.2" strokeLinecap="round" opacity=".35" />
          <text x="26" y="125" fontSize="25" fontWeight="800" fill="#0b1020">120 USD</text>
          <path d="M29 146h106" stroke="#0b1020" strokeWidth="2.4" strokeDasharray="3 6" strokeLinecap="round" />
          <text x="26" y="178" fontSize="23" fontWeight="800" fill="#5b8cff">→ EUR</text>
          <rect x="25" y="193" width="155" height="22" rx="7" fill="#ffd23f" stroke="#0b1020" strokeWidth="2" />
          <text x="36" y="209" fontSize="11" fontWeight="800" fill="#0b1020">amount × reference rate</text>
        </g>

        {/* tilted calculator */}
        <g transform="translate(290 72) rotate(7 80 116)">
          <rect x="0" y="0" width="160" height="226" rx="21" fill="#0b1020" stroke="#0b1020" strokeWidth="3" />
          <rect x="14" y="15" width="132" height="54" rx="9" fill="#d8e6ff" stroke="#fff" strokeOpacity=".3" strokeWidth="1.5" />
          <text x="28" y="51" fontSize="24" fontWeight="800" fill="#0b1020">110.42</text>
          <g fill="#fffdf5" stroke="#0b1020" strokeWidth="1.8">
            {Array.from({ length: 3 }).map((_, row) => Array.from({ length: 3 }).map((__, col) => (
              <rect key={`${row}-${col}`} x={16 + col * 41} y={86 + row * 34} width="31" height="24" rx="6" />
            )))}
            <rect x="16" y="188" width="72" height="23" rx="6" fill="#ffd23f" />
            <rect x="97" y="188" width="47" height="23" rx="6" fill="#ff6b4a" />
          </g>
        </g>

        {/* measuring tab and line graph: joins tools to calculations */}
        <g transform="translate(331 317)">
          <path d="M0 42h142" stroke="#0b1020" strokeWidth="3" strokeLinecap="round" />
          <path d="M13 40 35 25l28 8 31-24 31 9" fill="none" stroke="#4ade80" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {[13, 35, 63, 94, 125].map((x, i) => <circle key={x} cx={x} cy={[40, 25, 33, 9, 18][i]} r="4" fill="#ffd23f" stroke="#0b1020" strokeWidth="2" />)}
        </g>
        <g transform="translate(48 320)">
          <rect x="0" y="0" width="195" height="30" rx="7" fill="#fff" stroke="#0b1020" strokeWidth="2.4" />
          {Array.from({ length: 13 }).map((_, i) => <path key={i} d={`M${13 + i * 14} 0v${i % 4 === 0 ? 17 : 10}`} stroke="#0b1020" strokeWidth="1.8" />)}
          <text x="88" y="23" fontSize="11" fontWeight="800" fill="#5b8cff">m ↔ ft</text>
        </g>

        {/* sparse handmade accents; no looping movement */}
        <circle cx="51" cy="75" r="10" fill="#ff6b4a" stroke="#0b1020" strokeWidth="2.4" />
        <path d="M454 64l8 14 14 8-14 8-8 14-8-14-14-8 14-8Z" fill="#ffd23f" stroke="#0b1020" strokeWidth="2.2" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

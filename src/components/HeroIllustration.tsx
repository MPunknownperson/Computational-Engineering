// The original cartoon hero: Nova the owl helper plus floating math glyphs,
// staged in a little paper valley with clouds, a turning sun and falling coins.
export function HeroIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-[540px] select-none">
      <svg viewBox="0 0 520 430" className="w-full" aria-hidden>
        <defs>
          <radialGradient id="blob" cx="50%" cy="44%" r="55%">
            <stop offset="0%" stopColor="#ffe8b0" />
            <stop offset="100%" stopColor="#fff4d8" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7ee0a3" />
            <stop offset="100%" stopColor="#4ade80" />
          </linearGradient>
        </defs>

        <ellipse cx="260" cy="215" rx="240" ry="180" fill="url(#blob)" />

        {/* sun */}
        <g transform="translate(455 60)">
          <g>
            <circle r="20" fill="#ffd23f" stroke="#0b1020" strokeWidth="3" />
            {Array.from({ length: 8 }).map((_, i) => (
              <line
                key={i}
                x1={0} y1={-30} x2={0} y2={-38}
                stroke="#0b1020" strokeWidth="3" strokeLinecap="round"
                transform={`rotate(${i * 45})`}
              />
            ))}
          </g>
        </g>

        {/* clouds */}
        <g opacity=".95">
          <ellipse cx="80" cy="66" rx="30" ry="16" fill="#fff" stroke="#0b1020" strokeWidth="2.6" />
          <ellipse cx="104" cy="60" rx="20" ry="13" fill="#fff" stroke="#0b1020" strokeWidth="2.6" />
        </g>
        <g>
          <ellipse cx="360" cy="42" rx="24" ry="13" fill="#fff" stroke="#0b1020" strokeWidth="2.4" />
        </g>

        {/* hills */}
        <path d="M0 400 Q120 330 250 392 T520 380 L520 430 L0 430 Z" fill="url(#hill)" stroke="#0b1020" strokeWidth="3" />
        <path d="M0 414 Q160 372 320 414 T520 404 L520 430 L0 430 Z" fill="#3fce7f" stroke="#0b1020" strokeWidth="3" />

        {/* floating glyphs */}
        <g>
          <circle cx="74" cy="150" r="25" fill="#ff6b4a" stroke="#0b1020" strokeWidth="3" />
          <text x="74" y="158" textAnchor="middle" fontSize="26" fontWeight="800" fill="#fff">+</text>
        </g>
        <g>
          <rect x="416" y="126" width="48" height="48" rx="12" fill="#5b8cff" stroke="#0b1020" strokeWidth="3" />
          <text x="440" y="160" textAnchor="middle" fontSize="26" fontWeight="800" fill="#fff">÷</text>
        </g>
        <g>
          <text x="260" y="80" textAnchor="middle" fontSize="34" fontWeight="800" fill="#0b1020">∑</text>
        </g>
        <g>
          <polygon points="120,274 148,320 92,320" fill="#ffd23f" stroke="#0b1020" strokeWidth="3" />
        </g>
        <g>
          <circle cx="412" cy="300" r="21" fill="#4ade80" stroke="#0b1020" strokeWidth="3" />
          <text x="412" y="308" textAnchor="middle" fontSize="21" fontWeight="800" fill="#0b1020">π</text>
        </g>

        {/* falling coins */}
        <g style={{ animationDelay: "0s" }}>
          <circle cx="200" cy="96" r="9" fill="#ffd23f" stroke="#0b1020" strokeWidth="2.4" />
        </g>
        <g style={{ animationDelay: "1.1s" }}>
          <circle cx="330" cy="86" r="7" fill="#ffd23f" stroke="#0b1020" strokeWidth="2.2" />
        </g>
        <g style={{ animationDelay: "2.1s" }}>
          <circle cx="272" cy="70" r="8" fill="#ffd23f" stroke="#0b1020" strokeWidth="2.2" />
        </g>

        {/* Nova the owl */}
        <g transform="translate(196 186)"><g>
          <ellipse cx="64" cy="150" rx="54" ry="10" fill="#0b1020" opacity=".12" />
          <ellipse cx="64" cy="86" rx="56" ry="62" fill="#8b5a3c" stroke="#0b1020" strokeWidth="3" />
          <ellipse cx="64" cy="102" rx="36" ry="40" fill="#f4d9b3" stroke="#0b1020" strokeWidth="2.5" />
          <polygon points="22,36 38,8 48,46" fill="#8b5a3c" stroke="#0b1020" strokeWidth="3" />
          <polygon points="106,36 90,8 80,46" fill="#8b5a3c" stroke="#0b1020" strokeWidth="3" />

          <circle cx="45" cy="66" r="18" fill="#fff" stroke="#0b1020" strokeWidth="3" />
          <circle cx="83" cy="66" r="18" fill="#fff" stroke="#0b1020" strokeWidth="3" />
          <g className="brand-eye">
            <circle cx="46" cy="68" r="7.5" fill="#0b1020" />
            <circle cx="84" cy="68" r="7.5" fill="#0b1020" />
            <circle cx="48.4" cy="65" r="2.3" fill="#fff" />
            <circle cx="86.4" cy="65" r="2.3" fill="#fff" />
          </g>
          <polygon points="64,80 56,93 72,93" fill="#ff9d3d" stroke="#0b1020" strokeWidth="2.5" />

          {/* wings */}
          <g>
            <ellipse cx="16" cy="100" rx="14" ry="28" fill="#6b4428" stroke="#0b1020" strokeWidth="3" />
            <ellipse cx="112" cy="100" rx="14" ry="28" fill="#6b4428" stroke="#0b1020" strokeWidth="3" />
          </g>
          <path d="M48 142 l-7 11 M56 143 l0 12 M64 142 l7 11" stroke="#ff9d3d" strokeWidth="3.4" strokeLinecap="round" />

          {/* graduation cap */}
          <g transform="translate(64 16)">
            <polygon points="0,-8 26,2 0,12 -26,2" fill="#0b1020" />
            <path d="M0 12 v10" stroke="#ffd23f" strokeWidth="2.6" strokeLinecap="round" />
            <circle cx="0" cy="23" r="3" fill="#ffd23f" stroke="#0b1020" strokeWidth="1.6" />
          </g>

          {/* thought bubble */}
          <g transform="translate(112 -6)">
            <circle cx="0" cy="34" r="5" fill="#fff" stroke="#0b1020" strokeWidth="2" />
            <circle cx="12" cy="18" r="7" fill="#fff" stroke="#0b1020" strokeWidth="2" />
            <ellipse cx="40" cy="-4" rx="34" ry="22" fill="#fff" stroke="#0b1020" strokeWidth="2.6" />
            <text x="40" y="2" textAnchor="middle" fontSize="17" fontWeight="800" fill="#0b1020">x²</text>
          </g>
        </g></g>

        {/* Pip the coin-cat */}
        <g transform="translate(64 316)"><g style={{ animationDelay: ".8s" }}>
          <ellipse cx="34" cy="56" rx="30" ry="7" fill="#0b1020" opacity=".12" />
          <ellipse cx="34" cy="34" rx="27" ry="21" fill="#ffb26b" stroke="#0b1020" strokeWidth="2.8" />
          <polygon points="14,20 10,2 26,14" fill="#ffb26b" stroke="#0b1020" strokeWidth="2.6" />
          <polygon points="54,20 58,2 42,14" fill="#ffb26b" stroke="#0b1020" strokeWidth="2.6" />
          <circle cx="25" cy="32" r="4.4" fill="#0b1020" />
          <circle cx="43" cy="32" r="4.4" fill="#0b1020" />
          <path d="M31 41 q3 3 6 0" stroke="#0b1020" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <g>
            <path d="M8 40 q-16 -6 -10 -22" stroke="#0b1020" strokeWidth="3" fill="none" strokeLinecap="round" />
          </g>
          <g transform="translate(58 42)">
            <circle r="11" fill="#ffd23f" stroke="#0b1020" strokeWidth="2.6" />
            <text y="5" textAnchor="middle" fontSize="13" fontWeight="800" fill="#0b1020">¢</text>
          </g>
        </g></g>
      </svg>
    </div>
  );
}

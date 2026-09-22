// Tasteful cartoon-style hero: a small thinking owl helper + floating math
// glyphs. Intentionally lightweight, not a heavy character rig.
export function HeroIllustration() {
  return (
    <div className="relative w-full max-w-[520px] aspect-[5/4] mx-auto select-none">
      <svg viewBox="0 0 500 400" className="w-full h-full" aria-hidden>
        {/* soft backdrop blob */}
        <defs>
          <radialGradient id="blob" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#ffe8b0" />
            <stop offset="100%" stopColor="#fff4d8" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="250" cy="210" rx="230" ry="170" fill="url(#blob)" />

        {/* floating glyphs */}
        <g className="anim-float" style={{ transformOrigin: "90px 110px" }}>
          <circle cx="90" cy="110" r="26" fill="#ff6b4a" stroke="#0b1020" strokeWidth="3" />
          <text x="90" y="118" textAnchor="middle" fontSize="28" fontWeight="800" fill="#fff">+</text>
        </g>
        <g className="anim-float-alt" style={{ transformOrigin: "420px 90px" }}>
          <rect x="394" y="66" width="52" height="52" rx="10" fill="#5b8cff" stroke="#0b1020" strokeWidth="3" />
          <text x="420" y="102" textAnchor="middle" fontSize="28" fontWeight="800" fill="#fff">÷</text>
        </g>
        <g className="anim-float" style={{ transformOrigin: "70px 270px" }}>
          <polygon points="70,240 100,290 40,290" fill="#ffd23f" stroke="#0b1020" strokeWidth="3" />
        </g>
        <g className="anim-float-alt" style={{ transformOrigin: "430px 290px" }}>
          <circle cx="430" cy="290" r="22" fill="#4ade80" stroke="#0b1020" strokeWidth="3" />
          <text x="430" y="298" textAnchor="middle" fontSize="22" fontWeight="800" fill="#0b1020">π</text>
        </g>
        <g className="anim-wiggle" style={{ transformOrigin: "250px 50px" }}>
          <text x="250" y="56" textAnchor="middle" fontSize="30" fontWeight="800" fill="#0b1020">∑</text>
        </g>

        {/* Owl helper */}
        <g transform="translate(200 170)">
          {/* body */}
          <ellipse cx="50" cy="80" rx="55" ry="60" fill="#8b5a3c" stroke="#0b1020" strokeWidth="3" />
          {/* belly */}
          <ellipse cx="50" cy="95" rx="35" ry="38" fill="#f4d9b3" stroke="#0b1020" strokeWidth="2.5" />
          {/* ear tufts */}
          <polygon points="10,30 25,5 35,40" fill="#8b5a3c" stroke="#0b1020" strokeWidth="3" />
          <polygon points="90,30 75,5 65,40" fill="#8b5a3c" stroke="#0b1020" strokeWidth="3" />
          {/* eyes (big round) */}
          <g>
            <circle cx="32" cy="60" r="16" fill="#fff" stroke="#0b1020" strokeWidth="3" />
            <circle cx="68" cy="60" r="16" fill="#fff" stroke="#0b1020" strokeWidth="3" />
            <g className="anim-blink" style={{ transformOrigin: "32px 60px" }}>
              <circle cx="32" cy="62" r="7" fill="#0b1020" />
              <circle cx="34" cy="59" r="2" fill="#fff" />
            </g>
            <g className="anim-blink" style={{ transformOrigin: "68px 60px" }}>
              <circle cx="68" cy="62" r="7" fill="#0b1020" />
              <circle cx="70" cy="59" r="2" fill="#fff" />
            </g>
          </g>
          {/* beak */}
          <polygon points="50,72 43,84 57,84" fill="#ff9d3d" stroke="#0b1020" strokeWidth="2.5" />
          {/* wings (swaying) */}
          <g className="anim-sway" style={{ transformOrigin: "50px 90px" }}>
            <ellipse cx="5" cy="95" rx="14" ry="26" fill="#6b4428" stroke="#0b1020" strokeWidth="3" />
            <ellipse cx="95" cy="95" rx="14" ry="26" fill="#6b4428" stroke="#0b1020" strokeWidth="3" />
          </g>
          {/* feet */}
          <path d="M35 135 l-6 10 M40 135 l0 12 M45 135 l6 10" stroke="#ff9d3d" strokeWidth="3" strokeLinecap="round" />
          <path d="M55 135 l-6 10 M60 135 l0 12 M65 135 l6 10" stroke="#ff9d3d" strokeWidth="3" strokeLinecap="round" />
          {/* thought bubble */}
          <g transform="translate(100 -10)">
            <circle cx="0" cy="30" r="5" fill="#fff" stroke="#0b1020" strokeWidth="2" />
            <circle cx="10" cy="15" r="7" fill="#fff" stroke="#0b1020" strokeWidth="2" />
            <ellipse cx="35" cy="-5" rx="30" ry="20" fill="#fff" stroke="#0b1020" strokeWidth="2.5" />
            <text x="35" y="0" textAnchor="middle" fontSize="16" fontWeight="800" fill="#0b1020">x²</text>
          </g>
        </g>
      </svg>
    </div>
  );
}

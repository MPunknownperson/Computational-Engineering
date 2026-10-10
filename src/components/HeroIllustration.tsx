import { GrainOverlay, TextureDefs } from "@/components/Texture";

/**
 * Homepage editorial artwork: a hand-drawn number workbench rather than a
 * repeating mascot loop. The scene tells the product story at a glance — a
 * quantity, a unit pair, a formula and a result arranged on a calm paper desk.
 *
 * Material notes: every plate carries its own gradient body, a soft cast shadow
 * and a faint paper grain so the artwork reads as printed, layered ink rather
 * than flat clip art. Motion is limited to a slow ambient drift on the floating
 * props and a one-shot stroke draw on the graph line — transform/opacity only,
 * and the global reduced-motion rule switches it all off.
 */
export function HeroIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-[540px] select-none">
      {/* Real paper stock under the drawn art: a 19 KB greyscale fibre tile,
          repeated by the compositor as a single cached background layer rather
          than a decoded <img> element. */}
      <div className="art-plate" aria-hidden="true" />
      <svg viewBox="0 0 520 430" className="illus art-plate__art" aria-hidden>
        <TextureDefs id="hero" tone="cool" />
        <radialGradient id="studio-wash" cx="48%" cy="44%" r="62%">
          <stop offset="0%" stopColor="#d8e6ff" stopOpacity=".85" />
          <stop offset="100%" stopColor="#d8e6ff" stopOpacity="0" />
        </radialGradient>

        <ellipse cx="260" cy="210" rx="235" ry="175" fill="url(#studio-wash)" />
        <path
          d="M28 352c70-20 150-21 229-4s155 13 235-11v65H28Z"
          fill="url(#hero-wash)"
          stroke="#0b1020"
          strokeWidth="3"
        />

        {/* background graph paper, deliberately faint */}
        <g opacity=".18" stroke="#0b1020" strokeWidth="1">
          {Array.from({ length: 8 }).map((_, i) => (
            <path key={`v${i}`} d={`M${74 + i * 48} 54v238`} />
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <path key={`h${i}`} d={`M74 ${74 + i * 48}h336`} />
          ))}
        </g>

        {/* formula sheet — drifts very slightly, like paper on a desk */}
        <g transform="translate(78 82) rotate(-5 112 116)">
          <g >
          <rect
            x="-4"
            y="-2"
            width="224"
            height="232"
            rx="16"
            fill="#0b1020"
            opacity=".14"
          />
          <rect
            width="224"
            height="232"
            rx="16"
            fill="url(#hero-paper)"
            stroke="#0b1020"
            strokeWidth="3"
          />
          <rect width="224" height="232" rx="16" fill="url(#hero-shade)" />
          <path d="M25 47h110M25 66h164M25 85h139" stroke="#0b1020" strokeWidth="2.2" strokeLinecap="round" opacity=".35" />
          <text x="26" y="125" fontSize="25" fontWeight="800" fill="#0b1020">120 USD</text>
          <path d="M29 146h106" stroke="#0b1020" strokeWidth="2.4" strokeDasharray="3 6" strokeLinecap="round" />
          <text x="26" y="178" fontSize="23" fontWeight="800" fill="#4470e8">→ EUR</text>
          <rect x="25" y="193" width="155" height="22" rx="7" fill="url(#hero-sun)" stroke="#0b1020" strokeWidth="2" />
          <text x="36" y="209" fontSize="11" fontWeight="800" fill="#0b1020">amount × reference rate</text>
          {/* hand-inked corner fold + stitch marks */}
          <path d="M186 8c10 6 22 12 30 24-8 2-18 2-26 0" fill="#fffdf5" stroke="#0b1020" strokeWidth="2" strokeLinejoin="round" />
          <path d="M16 226h16" stroke="#5b8cff" strokeWidth="3" strokeLinecap="round" />
          </g>
        </g>

        {/* tilted calculator — screen glass, key depth and a gloss sweep */}
        <g transform="translate(290 72) rotate(7 80 116)">
          <g >
          <rect x="4" y="6" width="160" height="226" rx="21" fill="#0b1020" opacity=".16" />
          <rect x="0" y="0" width="160" height="226" rx="21" fill="url(#hero-sky)" stroke="#0b1020" strokeWidth="3" />
          <rect x="14" y="15" width="132" height="54" rx="9" fill="url(#hero-wash)" stroke="#fff" strokeOpacity=".55" strokeWidth="1.5" />
          <rect x="14" y="15" width="132" height="27" rx="9" fill="url(#hero-gloss)" opacity=".75" />
          <text x="28" y="51" fontSize="24" fontWeight="800" fill="#0b1020">110.42</text>
          <g>
            {Array.from({ length: 3 }).map((_, row) =>
              Array.from({ length: 3 }).map((__, col) => (
                <g key={`${row}-${col}`}>
                  <rect
                    x={16 + col * 41}
                    y={89 + row * 34}
                    width="31"
                    height="24"
                    rx="6"
                    fill="#0b1020"
                    opacity=".22"
                  />
                  <rect
                    x={16 + col * 41}
                    y={86 + row * 34}
                    width="31"
                    height="24"
                    rx="6"
                    fill="#fffdf5"
                    stroke="#0b1020"
                    strokeWidth="1.8"
                  />
                </g>
              )),
            )}
            <rect x="16" y="191" width="72" height="23" rx="6" fill="#0b1020" opacity=".22" />
            <rect x="16" y="188" width="72" height="23" rx="6" fill="url(#hero-sun)" stroke="#0b1020" strokeWidth="1.8" />
            <rect x="97" y="191" width="47" height="23" rx="6" fill="#0b1020" opacity=".22" />
            <rect x="97" y="188" width="47" height="23" rx="6" fill="url(#hero-coral)" stroke="#0b1020" strokeWidth="1.8" />
          </g>
          </g>
        </g>

        {/* measuring tab and line graph: joins tools to calculations */}
        <g transform="translate(331 317)">
          <path d="M0 42h142" stroke="#0b1020" strokeWidth="3" strokeLinecap="round" />
          <path
            d="M13 40 35 25l28 8 31-24 31 9"
            fill="none"
            stroke="url(#hero-mint)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="anim-draw-in"
          />
          {[13, 35, 63, 94, 125].map((x, i) => (
            <circle key={x} cx={x} cy={[40, 25, 33, 9, 18][i]} r="4.6" fill="url(#hero-sun)" stroke="#0b1020" strokeWidth="2" />
          ))}
        </g>

        <g transform="translate(48 320)">
          <rect x="0" y="3" width="195" height="30" rx="7" fill="#0b1020" opacity=".16" />
          <rect x="0" y="0" width="195" height="30" rx="7" fill="#fff" stroke="#0b1020" strokeWidth="2.4" />
          <rect x="0" y="0" width="195" height="15" rx="7" fill="url(#hero-gloss)" opacity=".6" />
          {Array.from({ length: 13 }).map((_, i) => (
            <path key={i} d={`M${13 + i * 14} 0v${i % 4 === 0 ? 17 : 10}`} stroke="#0b1020" strokeWidth="1.8" />
          ))}
          <text x="88" y="23" fontSize="11" fontWeight="800" fill="#4470e8">m ↔ ft</text>
        </g>

        {/* sparse handmade accents; slow drift only */}
        <g >
          <circle cx="51" cy="75" r="10" fill="url(#hero-coral)" stroke="#0b1020" strokeWidth="2.4" />
          <circle cx="47" cy="71" r="3" fill="#fff" opacity=".5" />
        </g>
        <g >
          <path
            d="M454 64l8 14 14 8-14 8-8 14-8-14-14-8 14-8Z"
            fill="url(#hero-sun)"
            stroke="#0b1020"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        </g>

        <GrainOverlay id="hero" x={0} y={0} width={520} height={430} opacity={0.16} />
      </svg>
    </div>
  );
}

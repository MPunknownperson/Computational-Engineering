import { GrainOverlay, TextureDefs } from "@/components/Texture";

/**
 * Homepage voice feature illustration: an audio wave becomes a verified program
 * card and then a prefilled tool.
 *
 * The waveform is a real animated level meter — each bar grows from its own
 * baseline on a stagger — while the cards carry gradient bodies, cast shadows
 * and a faint paper grain so the whole scene matches the printed, hand-drawn
 * material used everywhere else. Everything is transform/opacity only.
 */
export function VoiceIllustration() {
  const BARS = [10, 22, 36, 52, 31, 18, 42, 58, 27, 15];

  return (
    <div className="relative mx-auto w-full max-w-[460px] select-none">
      {/* Same printed-paper stock as the hero scene, so both home illustrations
          read as pages torn from the same workbook. */}
      <div className="art-plate" aria-hidden="true" />
      <svg viewBox="0 0 420 340" className="illus art-plate__art" aria-hidden>
        <TextureDefs id="voice" tone="cool" />
        <radialGradient id="voice-halo" cx="44%" cy="46%" r="64%">
          <stop offset="0%" stopColor="#cfe0ff" stopOpacity=".8" />
          <stop offset="100%" stopColor="#cfe0ff" stopOpacity="0" />
        </radialGradient>
        <ellipse cx="206" cy="173" rx="194" ry="150" fill="url(#voice-halo)" />

        {/* microphone, framed as a quiet piece of equipment */}
        <g transform="translate(54 119)">
          <g >
            <rect x="27" y="3" width="34" height="59" rx="17" fill="#0b1020" opacity=".16" />
            <rect x="27" y="0" width="34" height="59" rx="17" fill="url(#voice-paper)" stroke="#0b1020" strokeWidth="3" />
            <rect x="27" y="0" width="34" height="22" rx="17" fill="url(#voice-gloss)" />
            <path d="M36 19h16M36 29h16M36 39h16" stroke="#0b1020" strokeWidth="2.2" strokeLinecap="round" opacity=".55" />
            <path d="M10 44a34 34 0 0 0 68 0" fill="none" stroke="#0b1020" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M44 78v18M27 96h34" stroke="#0b1020" strokeWidth="3.2" strokeLinecap="round" />
          </g>
        </g>

        {/* level meter: bars grow from their own baseline on a stagger */}
        <g transform="translate(162 162)">
          {BARS.map((height, i) => (
            <g key={i} className="anim-bar" style={{ animationDelay: `${i * 90}ms` }}>
              <path
                d={`M${i * 16} ${30 - height / 2}v${height}`}
                stroke={i % 3 === 0 ? "#4470e8" : "#5b8cff"}
                strokeWidth="4"
                strokeLinecap="round"
              />
            </g>
          ))}
        </g>

        {/* deterministic language parser card */}
        <g transform="translate(216 52)">
          <g >
            <rect x="4" y="6" width="190" height="105" rx="18" fill="#0b1020" opacity=".14" />
            <rect width="190" height="105" rx="18" fill="url(#voice-paper)" stroke="#0b1020" strokeWidth="2.8" />
            <rect width="190" height="105" rx="18" fill="url(#voice-shade)" />
            <rect x="14" y="14" width="74" height="22" rx="7" fill="url(#voice-sun)" stroke="#0b1020" strokeWidth="1.7" />
            <text x="51" y="29" textAnchor="middle" fontSize="10" fontWeight="800" fill="#0b1020" textLength="62" lengthAdjust="spacingAndGlyphs">VOICE INPUT</text>
            <text x="14" y="56" fontSize="12" fontWeight="800" fill="#4470e8" textLength="104" lengthAdjust="spacingAndGlyphs">120 USD → EUR</text>
            <path d="M14 66h162" stroke="#0b1020" strokeOpacity=".16" strokeWidth="1.5" />
            <text x="14" y="86" fontSize="10" fontWeight="700" fill="#0b1020" textLength="162" lengthAdjust="spacingAndGlyphs">CONVERT &#123; amount, from, to &#125;</text>
          </g>
        </g>

        {/* verified route card */}
        <g transform="translate(210 195)">
          <g >
            <rect x="4" y="6" width="190" height="72" rx="14" fill="#0b1020" opacity=".18" />
            <rect width="190" height="72" rx="14" fill="url(#voice-sky)" stroke="#0b1020" strokeWidth="2.6" />
            <rect width="190" height="30" rx="14" fill="url(#voice-gloss)" opacity=".45" />
            <circle cx="21" cy="22" r="7" fill="url(#voice-mint)" stroke="#fff" strokeWidth="1.5" />
            <text x="36" y="27" fontSize="10" fontWeight="800" fill="#fff" textLength="140" lengthAdjust="spacingAndGlyphs">CURRENCY CONVERTER</text>
            <text x="18" y="51" fontSize="16" fontWeight="800" fill="#ffd23f" textLength="150" lengthAdjust="spacingAndGlyphs">120 USD → EUR</text>
          </g>
        </g>

        <path d="M178 127c17-21 25-25 34-28" stroke="#0b1020" strokeWidth="2.6" fill="none" strokeDasharray="3 7" strokeLinecap="round" />
        <path d="M194 120l-6 14 15-3" fill="url(#voice-sun)" stroke="#0b1020" strokeWidth="2" strokeLinejoin="round" />
        <path d="M294 164v22" stroke="#0b1020" strokeWidth="2.6" strokeDasharray="3 7" strokeLinecap="round" />
        <path d="M285 176l9 14 9-14" fill="url(#voice-mint)" stroke="#0b1020" strokeWidth="2" strokeLinejoin="round" />

        {/* language samples are typography, not flag/sticker decoration */}
        <g fill="#0b1020" fontWeight="800" fontSize="13">
          <text x="48" y="58">EN</text>
          <text x="71" y="78">ES</text>
          <text x="43" y="280">中文</text>
          <text x="120" y="294">FR</text>
        </g>
        <circle cx="42" cy="45" r="4" fill="url(#voice-coral)" stroke="#0b1020" strokeWidth="1.6" />
        <circle cx="388" cy="284" r="6" fill="url(#voice-sun)" stroke="#0b1020" strokeWidth="1.8" />

        <GrainOverlay id="voice" x={0} y={0} width={420} height={340} opacity={0.14} />
      </svg>
    </div>
  );
}

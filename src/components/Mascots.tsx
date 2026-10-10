// Reusable cartoon mascots for tool states: Nova the owl (thinking / happy /
// sleepy / worried) and Pip the coin-cat. Ink outlines + offset shadows so they
// sit on the hand-drawn cards.
//
// Each mascot is exported two ways: as a standalone <svg> (Owl / Pip, used on
// their own) and as a bare glyph (OwlGlyph / PipGlyph) returning only the
// drawn shapes so other original illustrations — like GuideHero — can place
// the same character inside a bigger hand-drawn scene via a single <g transform>.
export type Mood = "think" | "happy" | "sleep" | "worry";

const CAPTION: Record<Mood, string> = {
  think: "thinking it through…",
  happy: "got it!",
  sleep: "napping — tap to wake me",
  worry: "the feed is acting up",
};

/** Nova's face, body and wings only — no outer <svg>, drawn on a 0–100×0–95 grid. */
export function OwlGlyph({ mood = "think" }: { mood?: Mood }) {
  const happy = mood === "happy";
  const asleep = mood === "sleep";
  const worry = mood === "worry";

  return (
    <>
      {/* ground contact + soft cast shadow */}
      <ellipse cx="50" cy="90.5" rx="27" ry="4.4" fill="#0b1020" opacity=".1" />
      <ellipse cx="50" cy="88" rx="26" ry="5" fill="#0b1020" opacity=".14" />

      {/* body: warm base with a shaded right flank and a lit crown */}
      <ellipse cx="50" cy="52" rx="32" ry="35" fill="#8b5a3c" stroke="#0b1020" strokeWidth="3" />
      <path d="M55 18c14 5 24 18 27 33-4 12-13 21-25 25 9-16 9-43 -2-58Z" fill="#6b4428" opacity=".55" />
      <path d="M31 24c5-7 12-11 19-11-8 3-14 8-17 15-1-1-1-3-2-4Z" fill="#fff" opacity=".38" />
      {/* feather hatching gives the body printed texture */}
      <g stroke="#4d2f1c" strokeWidth="1.7" strokeLinecap="round" opacity=".38">
        <path d="M32 44c3 3 7 4 10 3M32 54c3 3 7 4 10 3M32 64c3 3 7 4 10 3" />
        <path d="M60 46c-3 3-7 4-10 3M60 56c-3 3-7 4-10 3M60 66c-3 3-7 4-10 3" />
      </g>

      <ellipse cx="50" cy="61" rx="20" ry="22" fill="#f4d9b3" stroke="#0b1020" strokeWidth="2.4" />
      <path d="M50 40c9 0 17 8 19 18-3 8-9 14-17 17 4-11 3-25 -2-35Z" fill="#e2bd91" opacity=".65" />
      <path d="M37 46c4-4 9-6 13-6-5 3-9 7-11 12-1-2-1-4-2-6Z" fill="#fff" opacity=".55" />

      <polygon points="27,26 36,9 42,32" fill="#8b5a3c" stroke="#0b1020" strokeWidth="3" />
      <polygon points="73,26 64,9 58,32" fill="#8b5a3c" stroke="#0b1020" strokeWidth="3" />
      <polygon points="30,24 36,13 39,27" fill="#6b4428" opacity=".7" />
      <polygon points="70,24 64,13 61,27" fill="#6b4428" opacity=".7" />

      {asleep ? (
        <>
          <path d="M34 45 q7 6 14 0" stroke="#0b1020" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M52 45 q7 6 14 0" stroke="#0b1020" strokeWidth="3" fill="none" strokeLinecap="round" />
          <text x="82" y="24" fontSize="14" fontWeight="800" fill="#5b8cff">z</text>
          <text x="90" y="14" fontSize="10" fontWeight="800" fill="#5b8cff">z</text>
        </>
      ) : (
        <>
          <circle cx="39" cy="44" r="12" fill="#fff" stroke="#0b1020" strokeWidth="2.8" />
          <circle cx="61" cy="44" r="12" fill="#fff" stroke="#0b1020" strokeWidth="2.8" />
          {/* iris shadow keeps the eyes from reading as flat paper dots */}
          <path d="M28.5 47a11 11 0 0 0 20 2 12 12 0 0 1-20-2Z" fill="#c9d6ff" opacity=".65" />
          <path d="M50.5 47a11 11 0 0 0 20 2 12 12 0 0 1-20-2Z" fill="#c9d6ff" opacity=".65" />
          <g className="anim-blink">
            <circle cx={happy ? 41 : 40} cy={worry ? 46 : 45} r="5.4" fill="#0b1020" />
            <circle cx={happy ? 63 : 62} cy={worry ? 46 : 45} r="5.4" fill="#0b1020" />
            <circle cx={happy ? 42.6 : 41.6} cy="43" r="1.8" fill="#fff" />
            <circle cx={happy ? 64.6 : 63.6} cy="43" r="1.8" fill="#fff" />
          </g>
          {worry && (
            <>
              <path d="M31 31 l14 3" stroke="#0b1020" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M69 31 l-14 3" stroke="#0b1020" strokeWidth="2.6" strokeLinecap="round" />
            </>
          )}
        </>
      )}

      <polygon points="50,54 44,64 56,64" fill="#ff9d3d" stroke="#0b1020" strokeWidth="2.4" />
      <path d="M50 55.5 46.6 61.5h6.8Z" fill="#ffd6a3" opacity=".8" />
      <g>
        <ellipse cx="17" cy="62" rx="8" ry="17" fill="#6b4428" stroke="#0b1020" strokeWidth="2.8" />
        <ellipse cx="83" cy="62" rx="8" ry="17" fill="#6b4428" stroke="#0b1020" strokeWidth="2.8" />
        {/* wing feather lines + rim light */}
        <path d="M14 52c3 4 4 10 3 16M18 52c3 4 4 10 3 16" stroke="#4d2f1c" strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
        <path d="M86 52c-3 4-4 10-3 16M82 52c-3 4-4 10-3 16" stroke="#4d2f1c" strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
        <path d="M12 52c2-3 5-5 8-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".35" />
        <path d="M88 52c-2-3-5-5-8-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".35" />
      </g>

      {happy && (
        <g>
          <circle cx="14" cy="24" r="4" fill="#ffd23f" stroke="#0b1020" strokeWidth="2" />
          <circle cx="88" cy="30" r="3.4" fill="#4ade80" stroke="#0b1020" strokeWidth="2" />
        </g>
      )}
    </>
  );
}

export function Owl({
  mood = "think",
  size = 96,
  showCaption = false,
}: {
  mood?: Mood;
  size?: number;
  showCaption?: boolean;
}) {
  return (
    <div className="inline-flex flex-col items-center gap-1.5">
      <svg
        width={size}
        height={size * 0.95}
        viewBox="0 0 100 95"
        fill="none"
        aria-hidden
        shapeRendering="geometricPrecision"
        className="mascot "
      >
        <OwlGlyph mood={mood} />
      </svg>
      {showCaption && (
        <span className="chip !py-0.5 !text-[.66rem]">{CAPTION[mood]}</span>
      )}
    </div>
  );
}

/** Pip's face, ears, tail and coin — no outer <svg>, drawn on a 0–80×0–68 grid. */
export function PipGlyph({ coin = true }: { coin?: boolean }) {
  return (
    <>
      <ellipse cx="40" cy="64" rx="25" ry="4" fill="#0b1020" opacity=".1" />
      <ellipse cx="40" cy="62" rx="24" ry="4.6" fill="#0b1020" opacity=".16" />
      <ellipse cx="40" cy="40" rx="26" ry="19" fill="#ffb26b" stroke="#0b1020" strokeWidth="2.8" />
      <path d="M44 22c11 3 19 10 22 18-4 10-13 17-24 19 6-11 8-27 2-37Z" fill="#e89452" opacity=".7" />
      <path d="M22 30c3-4 7-6 11-6-4 3-7 6-9 10-1-1-1-3-2-4Z" fill="#fff" opacity=".5" />
      {/* tabby stripes */}
      <g stroke="#d1793c" strokeWidth="2" strokeLinecap="round" opacity=".6">
        <path d="M28 27c2 2 5 3 7 3M24 34c2 2 5 3 7 3" />
        <path d="M52 27c-2 2-5 3-7 3M56 34c-2 2-5 3-7 3" />
      </g>
      <polygon points="20,26 16,8 32,20" fill="#ffb26b" stroke="#0b1020" strokeWidth="2.6" />
      <polygon points="60,26 64,8 48,20" fill="#ffb26b" stroke="#0b1020" strokeWidth="2.6" />
      <polygon points="21,23 19,13 28,20" fill="#f2a06c" stroke="#0b1020" strokeWidth="1.2" />
      <polygon points="59,23 61,13 52,20" fill="#f2a06c" stroke="#0b1020" strokeWidth="1.2" />
      <g className="anim-blink">
        <circle cx="31" cy="38" r="4.6" fill="#0b1020" />
        <circle cx="49" cy="38" r="4.6" fill="#0b1020" />
        <circle cx="29.4" cy="36.2" r="1.6" fill="#fff" opacity=".9" />
        <circle cx="47.4" cy="36.2" r="1.6" fill="#fff" opacity=".9" />
      </g>
      <path d="M36 46 q4 4 8 0" stroke="#0b1020" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M40 42.6v2.2" stroke="#0b1020" strokeWidth="1.8" strokeLinecap="round" />
      {/* whiskers */}
      <g stroke="#0b1020" strokeWidth="1.4" strokeLinecap="round" opacity=".55">
        <path d="M26 45 15 42M26 48 15 50M54 45l11-3M54 48l11 2" />
      </g>
      <g className="anim-tail">
        <path d="M16 46 q-15 -6 -9 -21" stroke="#0b1020" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      </g>
      {coin && (
        <g transform="translate(64 46)">
          {/* minted coin: rim, milled ring, recessed face and a specular arc */}
          <circle r="10.8" fill="#e0a315" stroke="#0b1020" strokeWidth="2.2" />
          <circle r="8.4" fill="#ffd23f" stroke="#0b1020" strokeWidth="1.1" strokeOpacity=".55" />
          <circle r="6.2" fill="#ffe082" stroke="#0b1020" strokeWidth="1" strokeOpacity=".35" />
          <path d="M-6.4-3.2A7 7 0 0 1 0-6.8" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".75" fill="none" />
          <text y="4" textAnchor="middle" fontSize="11" fontWeight="800" fill="#0b1020">¢</text>
        </g>
      )}
    </>
  );
}

export function Pip({ size = 74, coin = true }: { size?: number; coin?: boolean }) {
  return (
    <svg
      width={size}
      height={size * 0.85}
      viewBox="0 0 80 68"
      fill="none"
      aria-hidden
      shapeRendering="geometricPrecision"
      className="mascot "
    >
      <PipGlyph coin={coin} />
    </svg>
  );
}

/** Small corner doodle used on tool headers. */
export function MascotBadge({ mood = "think", label }: { mood?: Mood; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-2xl border-2 border-[color:var(--line)] bg-white px-2.5 py-1.5 shadow-[var(--shadow-ink-sm)]">
      <Owl mood={mood} size={34} />
      {label && <span className="text-xs font-bold">{label}</span>}
    </span>
  );
}

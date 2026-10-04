// Reusable cartoon mascots for tool states: Nova the owl (thinking / happy /
// sleepy / worried) and Pip the coin-cat. Ink outlines + offset shadows so they
// sit on the hand-drawn cards.
export type Mood = "think" | "happy" | "sleep" | "worry";

const CAPTION: Record<Mood, string> = {
  think: "thinking it through…",
  happy: "got it!",
  sleep: "napping — tap to wake me",
  worry: "the feed is acting up",
};

export function Owl({
  mood = "think",
  size = 96,
  showCaption = false,
}: {
  mood?: Mood;
  size?: number;
  showCaption?: boolean;
}) {
  const happy = mood === "happy";
  const asleep = mood === "sleep";
  const worry = mood === "worry";

  return (
    <div className="inline-flex flex-col items-center gap-1.5">
      <svg
        width={size}
        height={size * 0.95}
        viewBox="0 0 100 95"
        fill="none"
        aria-hidden
       
      >
        <ellipse cx="50" cy="88" rx="26" ry="5" fill="#0b1020" opacity=".12" />
        <ellipse cx="50" cy="52" rx="32" ry="35" fill="#8b5a3c" stroke="#0b1020" strokeWidth="3" />
        <ellipse cx="50" cy="61" rx="20" ry="22" fill="#f4d9b3" stroke="#0b1020" strokeWidth="2.4" />
        <polygon points="27,26 36,9 42,32" fill="#8b5a3c" stroke="#0b1020" strokeWidth="3" />
        <polygon points="73,26 64,9 58,32" fill="#8b5a3c" stroke="#0b1020" strokeWidth="3" />

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
            <g className="brand-eye">
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
        <g>
          <ellipse cx="17" cy="62" rx="8" ry="17" fill="#6b4428" stroke="#0b1020" strokeWidth="2.8" />
          <ellipse cx="83" cy="62" rx="8" ry="17" fill="#6b4428" stroke="#0b1020" strokeWidth="2.8" />
        </g>

        {happy && (
          <g>
            <circle cx="14" cy="24" r="4" fill="#ffd23f" stroke="#0b1020" strokeWidth="2" />
            <circle cx="88" cy="30" r="3.4" fill="#4ade80" stroke="#0b1020" strokeWidth="2" />
          </g>
        )}
      </svg>
      {showCaption && (
        <span className="chip !py-0.5 !text-[.66rem]">{CAPTION[mood]}</span>
      )}
    </div>
  );
}

export function Pip({ size = 74, coin = true }: { size?: number; coin?: boolean }) {
  return (
    <svg width={size} height={size * 0.85} viewBox="0 0 80 68" fill="none" aria-hidden>
      <ellipse cx="40" cy="62" rx="24" ry="4.6" fill="#0b1020" opacity=".12" />
      <ellipse cx="40" cy="40" rx="26" ry="19" fill="#ffb26b" stroke="#0b1020" strokeWidth="2.8" />
      <polygon points="20,26 16,8 32,20" fill="#ffb26b" stroke="#0b1020" strokeWidth="2.6" />
      <polygon points="60,26 64,8 48,20" fill="#ffb26b" stroke="#0b1020" strokeWidth="2.6" />
      <g className="brand-eye">
        <circle cx="31" cy="38" r="4" fill="#0b1020" />
        <circle cx="49" cy="38" r="4" fill="#0b1020" />
      </g>
      <path d="M36 46 q4 4 8 0" stroke="#0b1020" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <g>
        <path d="M16 46 q-15 -6 -9 -21" stroke="#0b1020" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      </g>
      {coin && (
          <g transform="translate(64 46)">
            <g>
              <circle r="10" fill="#ffd23f" stroke="#0b1020" strokeWidth="2.4" />
              <text y="4" textAnchor="middle" fontSize="11" fontWeight="800" fill="#0b1020">¢</text>
            </g>
          </g>
      )}
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

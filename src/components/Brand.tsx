// NumeriQ brand mark: a stylised "N" glyph with a small orbit ring and a
// counting bead. Clean, friendly, not a character.
export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
    >
      <rect x="2" y="2" width="60" height="60" rx="16" fill="#0b1020" />
      {/* orbit ring */}
      <g className="anim-orbit" style={{ transformOrigin: "32px 32px" }}>
        <ellipse
          cx="32"
          cy="32"
          rx="22"
          ry="10"
          stroke="#ffd23f"
          strokeWidth="2.5"
          strokeDasharray="3 4"
          fill="none"
        />
        <circle cx="54" cy="32" r="3.5" fill="#ff6b4a" stroke="#0b1020" strokeWidth="1.5" />
      </g>
      {/* N letter */}
      <path
        d="M20 46 V18 L44 46 V18"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

import { useEffect, useId, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

export type NovaMood = 'idle' | 'wave' | 'think' | 'cheer' | 'point' | 'sleep';

/**
 * Nova - the hand-drawn anime mascot of the site.
 *
 * The character is a real cel-style drawing built from SVG paths: back hair,
 * fringe, ahoge, face with large highlighted eyes, blush, collar, tunic and two
 * jointed arms. Every moving part is its own group with a declared
 * `transform-origin`, so the keyframes in `styles/mascot.css` animate joints
 * (blinking, breathing, hair sway, waving, pointing) rather than sliding the
 * whole picture around. Motion is disabled wholesale under
 * `prefers-reduced-motion`, which simply freezes the drawing in its rest pose.
 */
export function Nova({ mood = 'idle', size = 220, className = '' }: { mood?: NovaMood; size?: number; className?: string }) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '');
  const hairId = `nova-hair-${uid}`;
  const tunicId = `nova-tunic-${uid}`;
  const skinId = `nova-skin-${uid}`;
  const glowId = `nova-glow-${uid}`;

  const mouth = {
    idle: 'M92 128q8 7 16 0',
    wave: 'M90 126q10 11 20 0',
    think: 'M94 130q7 2 12-2',
    cheer: 'M88 124q12 15 24 0q-12 5-24 0',
    point: 'M92 127q8 8 16 1',
    sleep: 'M95 130q5 4 10 0',
  }[mood];

  return (
    <svg
      className={`nova nova-${mood} ${className}`}
      width={size}
      height={size * 1.18}
      viewBox="0 0 200 236"
      role="img"
      aria-label="Nova, the site mascot"
      style={{ '--nova-size': `${size}px` } as CSSProperties}
    >
      <defs>
        <linearGradient id={hairId} x1="40" y1="20" x2="170" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6f8cff" />
          <stop offset="0.55" stopColor="#8b6bf0" />
          <stop offset="1" stopColor="#4b3ec9" />
        </linearGradient>
        <linearGradient id={tunicId} x1="60" y1="150" x2="150" y2="235" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dfe7ff" />
        </linearGradient>
        <radialGradient id={skinId} cx="0.5" cy="0.45" r="0.62">
          <stop offset="0" stopColor="#fff4ec" />
          <stop offset="1" stopColor="#ffddc9" />
        </radialGradient>
        <radialGradient id={glowId} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#8ea8ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#8ea8ff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse className="nova-shadow" cx="100" cy="226" rx="46" ry="8" fill="#5b6bb5" opacity="0.18" />
      <circle cx="100" cy="120" r="96" fill={`url(#${glowId})`} className="nova-aura" />

      <g className="nova-bob">
        {/* --- floating maths motes ------------------------------------ */}
        <g className="nova-motes" fill="#7f6bf2" fontSize="13" fontFamily="'IBM Plex Mono', monospace">
          <text className="nova-mote nova-mote-1" x="20" y="60">π</text>
          <text className="nova-mote nova-mote-2" x="168" y="46">Σ</text>
          <text className="nova-mote nova-mote-3" x="176" y="140">%</text>
          <text className="nova-mote nova-mote-4" x="14" y="150">√</text>
        </g>

        {/* --- back hair ------------------------------------------------ */}
        <g className="nova-hair-back">
          <path d="M100 18c-38 0-58 27-58 60 0 28 4 44-6 78 16 8 30-4 30-4l68 2s16 10 30 2c-12-34-6-50-6-78 0-33-20-60-58-60Z" fill={`url(#${hairId})`} />
        </g>

        {/* --- body ------------------------------------------------------ */}
        <g className="nova-body">
          <path d="M100 146c-24 0-38 12-44 34-4 15-6 26-6 34h100c0-8-2-19-6-34-6-22-20-34-44-34Z" fill={`url(#${tunicId})`} stroke="#3b4a73" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M84 148l16 18 16-18" fill="none" stroke="#3b4a73" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M78 196h44" stroke="#9fb2e6" strokeWidth="3" strokeLinecap="round" />
          <circle cx="100" cy="182" r="7" fill="#ffd166" stroke="#3b4a73" strokeWidth="2" />
          <path d="M96.5 182h7M100 178.5v7" stroke="#3b4a73" strokeWidth="1.6" strokeLinecap="round" />
        </g>

        {/* --- arms ------------------------------------------------------ */}
        <g className="nova-arm nova-arm-left">
          <path d="M62 156c-12 6-20 18-22 30" fill="none" stroke="#3b4a73" strokeWidth="9" strokeLinecap="round" />
          <path d="M62 156c-12 6-20 18-22 30" fill="none" stroke="#ffffff" strokeWidth="5.5" strokeLinecap="round" />
          <circle cx="39" cy="188" r="7.5" fill="none" stroke="#3b4a73" strokeWidth="2.2" />
          <circle cx="39" cy="188" r="6" fill={`url(#${skinId})`} />
        </g>
        <g className="nova-arm nova-arm-right">
          <path d="M138 156c12 6 20 18 22 30" fill="none" stroke="#3b4a73" strokeWidth="9" strokeLinecap="round" />
          <path d="M138 156c12 6 20 18 22 30" fill="none" stroke="#ffffff" strokeWidth="5.5" strokeLinecap="round" />
          <circle cx="161" cy="188" r="7.5" fill="none" stroke="#3b4a73" strokeWidth="2.2" />
          <circle cx="161" cy="188" r="6" fill={`url(#${skinId})`} />
        </g>

        {/* --- head ------------------------------------------------------ */}
        <g className="nova-head">
          <path className="nova-ahoge" d="M100 30c6-14 18-20 26-14-8 2-10 8-8 14" fill="none" stroke={`url(#${hairId})`} strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="100" cy="98" rx="27" ry="12" fill={`url(#${skinId})`} />
          <path d="M100 42c-28 0-45 20-45 48 0 30 20 48 45 48s45-18 45-48c0-28-17-48-45-48Z" fill={`url(#${skinId})`} stroke="#3b4a73" strokeWidth="2.4" />

          {/* ears */}
          <ellipse cx="56" cy="96" rx="6" ry="9" fill={`url(#${skinId})`} stroke="#3b4a73" strokeWidth="2" />
          <ellipse cx="144" cy="96" rx="6" ry="9" fill={`url(#${skinId})`} stroke="#3b4a73" strokeWidth="2" />

          {/* fringe */}
          <g className="nova-fringe">
            <path d="M55 92c-2-32 18-54 45-54s47 22 45 54c-6-16-14-24-14-24s-14 14-34 14-28-6-32-10c0 0-6 10-10 20Z" fill={`url(#${hairId})`} />
            <path d="M58 88c6-10 12-16 12-16s-2 12-4 20Z" fill="#ffffff" opacity="0.28" />
          </g>

          {/* eyes */}
          <g className="nova-eyes">
            <g className="nova-eye nova-eye-left">
              <ellipse cx="82" cy="100" rx="9.5" ry="12" fill="#2b3357" />
              <ellipse cx="82" cy="103" rx="8" ry="8.5" fill="#4f7bff" />
              <circle cx="78.5" cy="96.5" r="3.4" fill="#ffffff" />
              <circle cx="85.5" cy="106" r="1.8" fill="#ffffff" opacity="0.85" />
            </g>
            <g className="nova-eye nova-eye-right">
              <ellipse cx="118" cy="100" rx="9.5" ry="12" fill="#2b3357" />
              <ellipse cx="118" cy="103" rx="8" ry="8.5" fill="#4f7bff" />
              <circle cx="114.5" cy="96.5" r="3.4" fill="#ffffff" />
              <circle cx="121.5" cy="106" r="1.8" fill="#ffffff" opacity="0.85" />
            </g>
          </g>
          {/* closed-eye arcs used by the sleep pose */}
          <g className="nova-eyes-closed" stroke="#2b3357" strokeWidth="2.6" strokeLinecap="round" fill="none">
            <path d="M74 101q8 7 16 0" />
            <path d="M110 101q8 7 16 0" />
          </g>

          <path className="nova-brow nova-brow-left" d="M73 84q9-5 18-1" fill="none" stroke="#5a4bb5" strokeWidth="2.6" strokeLinecap="round" />
          <path className="nova-brow nova-brow-right" d="M109 83q9-4 18 1" fill="none" stroke="#5a4bb5" strokeWidth="2.6" strokeLinecap="round" />

          <ellipse className="nova-blush" cx="68" cy="114" rx="8" ry="4.6" fill="#ff9ec4" opacity="0.6" />
          <ellipse className="nova-blush" cx="132" cy="114" rx="8" ry="4.6" fill="#ff9ec4" opacity="0.6" />
          <path className="nova-mouth" d={mouth} fill="none" stroke="#3b4a73" strokeWidth="2.6" strokeLinecap="round" />

          {/* headset: the character is an assistant, so she wears one */}
          <path d="M52 92a48 44 0 0 1 96 0" fill="none" stroke="#3b4a73" strokeWidth="4" strokeLinecap="round" />
          <rect x="44" y="86" width="12" height="20" rx="5" fill="#4f7bff" stroke="#3b4a73" strokeWidth="2" />
          <rect x="144" y="86" width="12" height="20" rx="5" fill="#4f7bff" stroke="#3b4a73" strokeWidth="2" />
          <circle className="nova-headset-led" cx="150" cy="96" r="2.2" fill="#8dffcf" />
        </g>

        {/* --- sparkles -------------------------------------------------- */}
        <g className="nova-sparkles" fill="#ffd166">
          <path className="nova-sparkle nova-sparkle-1" d="M36 68l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
          <path className="nova-sparkle nova-sparkle-2" d="M164 108l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" />
          <path className="nova-sparkle nova-sparkle-3" d="M148 40l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ff9ec4" />
        </g>

        {mood === 'sleep' && (
          <g className="nova-zzz" fill="#7f8dc4" fontFamily="'Inter', sans-serif" fontWeight="700">
            <text className="nova-z nova-z-1" x="150" y="60" fontSize="14">z</text>
            <text className="nova-z nova-z-2" x="162" y="44" fontSize="18">z</text>
            <text className="nova-z nova-z-3" x="176" y="26" fontSize="22">z</text>
          </g>
        )}
      </g>
    </svg>
  );
}

/**
 * Pip - Nova's companion: a bouncing coin-cat. Drawn as a separate character so
 * scenes can stage the two together (Pip reacts when Nova celebrates).
 */
export function Pip({ size = 96, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={`pip ${className}`} width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="Pip, the coin companion">
      <ellipse className="pip-shadow" cx="60" cy="108" rx="26" ry="6" fill="#5b6bb5" opacity="0.2" />
      <g className="pip-hop">
        <path className="pip-ear pip-ear-left" d="M34 40l-4-18 18 8z" fill="#ffca4a" stroke="#8a5b12" strokeWidth="2.4" strokeLinejoin="round" />
        <path className="pip-ear pip-ear-right" d="M86 40l4-18-18 8z" fill="#ffca4a" stroke="#8a5b12" strokeWidth="2.4" strokeLinejoin="round" />
        <circle cx="60" cy="64" r="34" fill="#ffd76a" stroke="#8a5b12" strokeWidth="3" />
        <circle cx="60" cy="64" r="26" fill="none" stroke="#f0b52f" strokeWidth="2.5" strokeDasharray="4 5" />
        <g className="pip-eyes" fill="#4a3208">
          <ellipse className="pip-eye" cx="49" cy="60" rx="4.2" ry="5.4" />
          <ellipse className="pip-eye" cx="71" cy="60" rx="4.2" ry="5.4" />
        </g>
        <path d="M54 73q6 6 12 0" fill="none" stroke="#4a3208" strokeWidth="2.6" strokeLinecap="round" />
        <ellipse cx="42" cy="70" rx="5" ry="3" fill="#ff9ec4" opacity="0.7" />
        <ellipse cx="78" cy="70" rx="5" ry="3" fill="#ff9ec4" opacity="0.7" />
        <path className="pip-tail" d="M92 76c12 2 16 12 10 20" fill="none" stroke="#ffca4a" strokeWidth="6" strokeLinecap="round" />
      </g>
    </svg>
  );
}

const LINES = [
  'Fetching the latest reference rates…',
  'Every result shows its formula.',
  'Numbers are checked, then double-checked.',
  'Live markets refresh while you read.',
  'Pick a country — the rules follow.',
];

/** A speech bubble that types its line out, character by character. */
export function NovaSpeech({ lines = LINES, className = '' }: { lines?: string[]; className?: string }) {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const reduce = useMemo(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  useEffect(() => {
    const line = lines[index % lines.length];
    if (reduce) { setTyped(line); return; }
    setTyped('');
    let position = 0;
    const typer = setInterval(() => {
      position += 1;
      setTyped(line.slice(0, position));
      if (position >= line.length) {
        clearInterval(typer);
        hold = setTimeout(() => setIndex(value => value + 1), 2600);
      }
    }, 38);
    let hold: ReturnType<typeof setTimeout>;
    return () => { clearInterval(typer); clearTimeout(hold); };
  }, [index, lines, reduce]);

  return (
    <p className={`nova-speech ${className}`} aria-live="off">
      <span>{typed}</span>
      <i className="nova-caret" aria-hidden="true" />
    </p>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Nova, NovaSpeech, Pip } from './Nova';
import type { NovaMood } from './Nova';

/**
 * A full animated cartoon scene: layered sky, drifting clouds, a turning sun,
 * looping birds, rolling hills and bouncing coins, with the two characters
 * staged in front. Everything is SVG plus CSS keyframes, so it scales to any
 * viewport, costs no network request and freezes politely when the visitor
 * asks for reduced motion.
 */
export function MascotScene({ mood = 'wave', speech = true }: { mood?: NovaMood; speech?: boolean }) {
  return (
    <div className="scene" aria-hidden={false}>
      <svg className="scene-sky" viewBox="0 0 900 420" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustrated valley with drifting clouds">
        <defs>
          <linearGradient id="scene-sky-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dce8ff" />
            <stop offset="0.6" stopColor="#f2f0ff" />
            <stop offset="1" stopColor="#fff6f2" />
          </linearGradient>
          <linearGradient id="scene-hill-back" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b9c9ff" />
            <stop offset="1" stopColor="#8fa6f6" />
          </linearGradient>
          <linearGradient id="scene-hill-front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8f7ff0" />
            <stop offset="1" stopColor="#6a5bd6" />
          </linearGradient>
        </defs>

        <rect width="900" height="420" fill="url(#scene-sky-fill)" />

        <g className="scene-sun">
          <circle cx="742" cy="92" r="40" fill="#ffd166" />
          <g className="scene-sun-rays" stroke="#ffd166" strokeWidth="5" strokeLinecap="round">
            <path d="M742 30v-16M742 170v16M680 92h-16M820 92h16M698 48l-11-11M786 136l11 11M786 48l11-11M698 136l-11 11" />
          </g>
        </g>

        <g className="scene-clouds-far" fill="#ffffff" opacity="0.85">
          <g className="scene-cloud scene-cloud-1"><ellipse cx="120" cy="80" rx="46" ry="24" /><ellipse cx="160" cy="88" rx="34" ry="18" /><ellipse cx="86" cy="90" rx="30" ry="16" /></g>
          <g className="scene-cloud scene-cloud-2"><ellipse cx="520" cy="60" rx="38" ry="20" /><ellipse cx="556" cy="68" rx="28" ry="14" /></g>
          <g className="scene-cloud scene-cloud-3"><ellipse cx="330" cy="130" rx="30" ry="15" /><ellipse cx="358" cy="136" rx="22" ry="11" /></g>
        </g>

        <g className="scene-birds" stroke="#5b6bb5" strokeWidth="3" fill="none" strokeLinecap="round">
          <path className="scene-bird scene-bird-1" d="M0 0q8-8 16 0q8-8 16 0" />
          <path className="scene-bird scene-bird-2" d="M0 0q6-6 12 0q6-6 12 0" />
        </g>

        <path className="scene-hill scene-hill-back" d="M0 300q140-70 270-20t250-10q140-40 380 30v120H0Z" fill="url(#scene-hill-back)" />
        <path className="scene-hill scene-hill-front" d="M0 350q180-60 340-10t260-20q160-30 300 40v60H0Z" fill="url(#scene-hill-front)" />

        <g className="scene-coins" fill="#ffd76a" stroke="#c99413" strokeWidth="2">
          <circle className="scene-coin scene-coin-1" cx="200" cy="0" r="11" />
          <circle className="scene-coin scene-coin-2" cx="640" cy="0" r="9" />
          <circle className="scene-coin scene-coin-3" cx="430" cy="0" r="13" />
        </g>
      </svg>

      <div className="scene-cast">
        <Nova mood={mood} size={210} />
        <div className="scene-cast-side">
          {speech && <NovaSpeech />}
          <Pip size={104} />
        </div>
      </div>
    </div>
  );
}

/** Suspense / pending state: Nova thinks while an orbit of dots spins. */
export function MascotLoader({ title = 'Loading', detail }: { title?: string; detail?: string }) {
  return (
    <div className="mascot-loader" role="status" aria-live="polite">
      <div className="mascot-loader-art">
        <Nova mood="think" size={132} />
        <svg className="mascot-orbit" viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#dbe3ff" strokeWidth="2" strokeDasharray="6 8" />
          <circle className="mascot-orbit-dot" cx="60" cy="8" r="5" fill="#4f7bff" />
        </svg>
      </div>
      <div>
        <p className="mascot-loader-title">{title}</p>
        {detail && <p className="mascot-loader-detail">{detail}</p>}
      </div>
    </div>
  );
}

/** A small mascot that reacts to a value going up or down. */
export function MascotReaction({ direction }: { direction: 'up' | 'down' | 'flat' }) {
  const mood: NovaMood = direction === 'up' ? 'cheer' : direction === 'down' ? 'think' : 'idle';
  return <Nova mood={mood} size={96} className="mascot-reaction" />;
}

/**
 * A frame-by-frame cartoon: Nova walks across the strip carrying a result,
 * driven by a hand-written sprite timeline rather than a CSS transition.
 * This is a real keyframed animation loop with its own transport controls.
 */
const FRAMES: { mood: NovaMood; caption: string }[] = [
  { mood: 'idle', caption: 'You type the numbers.' },
  { mood: 'think', caption: 'Nova checks the rules for your region.' },
  { mood: 'point', caption: 'The formula is shown, step by step.' },
  { mood: 'cheer', caption: 'And the answer lands — with its sources.' },
];

export function NovaFilmstrip() {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => setFrame(value => (value + 1) % FRAMES.length), 2400);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [playing]);

  const current = FRAMES[frame];
  return (
    <div className="filmstrip">
      <div className="filmstrip-stage">
        <div className={`filmstrip-walk ${playing ? 'is-playing' : ''}`}>
          <Nova mood={current.mood} size={150} />
        </div>
        <div className="filmstrip-ground" />
      </div>
      <p className="filmstrip-caption" key={frame}>{current.caption}</p>
      <div className="filmstrip-controls">
        <button type="button" className="secondary-button" onClick={() => setPlaying(value => !value)}>{playing ? 'Pause' : 'Play'}</button>
        <div className="filmstrip-dots" role="tablist" aria-label="Animation frames">
          {FRAMES.map((item, index) => (
            <button
              key={item.caption}
              type="button"
              role="tab"
              aria-selected={index === frame}
              aria-label={`Frame ${index + 1}`}
              className={index === frame ? 'active' : ''}
              onClick={() => { setPlaying(false); setFrame(index); }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

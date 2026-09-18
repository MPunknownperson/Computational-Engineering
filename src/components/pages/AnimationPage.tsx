import { useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Nova, NovaSpeech, Pip } from '../mascot/Nova';
import type { NovaMood } from '../mascot/Nova';
import { MascotScene, NovaFilmstrip } from '../mascot/Scene';
import { Reveal } from '../motion';
import { brand } from '../../lib/legal';

const MOODS: { id: NovaMood; label: string; note: string }[] = [
  { id: 'idle', label: 'Idle', note: 'Breathing loop, hair sway, blink every 5.6 seconds.' },
  { id: 'wave', label: 'Wave', note: 'Right shoulder joint swings between +8° and −34°.' },
  { id: 'think', label: 'Think', note: 'Slow head tilt with a raised hand near the chin.' },
  { id: 'point', label: 'Point', note: 'Arm locks out to the result while the body keeps bobbing.' },
  { id: 'cheer', label: 'Cheer', note: 'Both arms up, faster bob, open smile.' },
  { id: 'sleep', label: 'Sleep', note: 'Eyes become closed arcs and z-marks drift upward.' },
];

export default function AnimationPage({ onNavigate }: { onNavigate: (hash: string) => void }) {
  const [mood, setMood] = useState<NovaMood>('wave');

  return (
    <div className="route-enter animation-page">
      <header className="page-intro">
        <h1>The animation studio</h1>
        <p>
          {brand.name} is drawn, not decorated. Nova and Pip are cel-style characters built from SVG
          paths with named joints, and every pose below is a keyframed loop of those joints — the
          same rig the header mark, the loading states and the market reactions all reuse.
        </p>
      </header>

      <MascotScene mood={mood} />

      <section className="home-section">
        <header className="home-section-head"><h2><Sparkles size={18} />Poses</h2></header>
        <div className="mood-grid">
          {MOODS.map((item, index) => (
            <Reveal as="article" key={item.id} delay={index * 40} className={`mood-card ${mood === item.id ? 'active' : ''}`}>
              <button type="button" onClick={() => setMood(item.id)} aria-pressed={mood === item.id}>
                <Nova mood={item.id} size={124} />
                <h3>{item.label}</h3>
                <p>{item.note}</p>
              </button>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="home-section animation-split">
        <div>
          <h2>A scene, frame by frame</h2>
          <p className="animation-copy">
            The strip below runs a four-beat cartoon: the visitor types, Nova checks the regional
            rules, points at the working, and celebrates the answer. It has transport controls,
            because an animation you cannot stop is a bug, not a feature.
          </p>
          <NovaFilmstrip />
        </div>
        <aside className="animation-aside">
          <div className="animation-pip"><Pip size={130} /><NovaSpeech lines={['Pip carries the coins.', 'I carry the formulas.', 'Together we carry the result.']} /></div>
          <h3>How it is built</h3>
          <ul className="animation-notes">
            <li>Pure SVG + CSS keyframes — no animation library, no video, no sprite sheets to download.</li>
            <li>Joints declare <code>transform-box: fill-box</code> so rotations land identically in Chrome, Firefox and Safari.</li>
            <li>Every loop is disabled under <code>prefers-reduced-motion</code>; the drawing simply rests.</li>
            <li>Characters are rendered at request size, so they stay crisp on any display density.</li>
          </ul>
          <button type="button" className="text-button" onClick={() => onNavigate('markets')}>See the characters react to live data<ArrowRight size={15} /></button>
        </aside>
      </section>
    </div>
  );
}

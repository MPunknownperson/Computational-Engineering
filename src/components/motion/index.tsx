import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { easings, onFrame, prefersReducedMotion, spring, tween } from '../../lib/engine/animation';

/** Counts a number up to its target. Falls back to the final value instantly when motion is reduced. */
export function AnimatedNumber({ value, format, duration = 620, className = '' }: { value: number; format: (value: number) => string; duration?: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);
  useEffect(() => {
    if (previous.current === value) return;
    const cancel = tween({
      from: previous.current,
      to: value,
      duration,
      easing: easings.decelerate,
      onUpdate: setDisplay,
    });
    previous.current = value;
    return cancel;
  }, [value, duration]);
  return <span className={className}>{format(Number.isFinite(display) ? display : value)}</span>;
}

/** Reveals children with a spring once they enter the viewport. */
export function Reveal({ children, delay = 0, as: Tag = 'div', className = '' }: { children: ReactNode; delay?: number; as?: 'div' | 'section' | 'li' | 'article'; className?: string }) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(prefersReducedMotion());
  useEffect(() => {
    const node = ref.current;
    if (!node || shown || typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setShown(true); observer.disconnect(); }
    }, { rootMargin: '0px 0px -8% 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [shown]);
  const style = { '--reveal-delay': `${delay}ms` } as CSSProperties;
  return <Tag ref={ref as never} className={`reveal ${shown ? 'is-shown' : ''} ${className}`} style={style}>{children}</Tag>;
}

/** Progress arc driven by the spring integrator. */
export function ProgressRing({ progress, size = 44, label }: { progress: number; size?: number; label?: string }) {
  const [shown, setShown] = useState(progress);
  const current = useRef(progress);
  useEffect(() => {
    const cancel = spring({
      from: current.current,
      to: progress,
      config: { stiffness: 140, damping: 22, precision: .001 },
      onUpdate: value => { current.current = value; setShown(value); },
    });
    return cancel;
  }, [progress]);
  const radius = size / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  return <svg className="progress-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label || `${Math.round(progress * 100)} percent complete`}>
    <circle cx={size / 2} cy={size / 2} r={radius} className="progress-ring-track" strokeWidth="3" fill="none" />
    <circle cx={size / 2} cy={size / 2} r={radius} className="progress-ring-value" strokeWidth="3" fill="none"
      strokeDasharray={circumference} strokeDashoffset={circumference * (1 - Math.max(0, Math.min(1, shown)))} strokeLinecap="round" />
  </svg>;
}

/** Skeleton placeholder used while a panel's data is being computed. */
export function Skeleton({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true">
    {Array.from({ length: lines }, (_, index) => <span key={index} className="skeleton-line" style={{ width: `${92 - index * 13}%` }} />)}
  </div>;
}

/** Indeterminate bar for work with unknown duration. */
export function LoadingBar({ label }: { label: string }) {
  return <div className="loading-bar" role="status" aria-live="polite">
    <span className="loading-bar-track"><span className="loading-bar-value" /></span>
    <span className="loading-bar-label">{label}</span>
  </div>;
}

/** Determinate bar with a smoothed value so progress never jumps backwards visually. */
export function ProgressBar({ progress, label }: { progress: number; label: string }) {
  const [shown, setShown] = useState(progress);
  const current = useRef(progress);
  useEffect(() => {
    const cancel = tween({ from: current.current, to: progress, duration: 220, easing: easings.decelerate, onUpdate: value => { current.current = value; setShown(value); } });
    return cancel;
  }, [progress]);
  return <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label={label}>
    <span style={{ width: `${Math.max(2, shown * 100)}%` }} />
  </div>;
}

/** Full-panel loading state combining a ring, message and skeleton. */
export function PanelLoader({ title, detail, progress }: { title: string; detail?: string; progress?: number }) {
  return <div className="panel-loader" role="status" aria-live="polite">
    <div className="panel-loader-head">
      {progress === undefined ? <span className="spinner" aria-hidden="true" /> : <ProgressRing progress={progress} />}
      <div><strong>{title}</strong>{detail && <small>{detail}</small>}</div>
    </div>
    <Skeleton lines={3} />
  </div>;
}

/** Subtle animated gradient used behind hero sections; static when motion is reduced. */
export function AuroraBackdrop() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion()) return;
    return onFrame((_, time) => {
      const drift = Math.sin(time / 7000);
      node.style.setProperty('--aurora-x', `${50 + drift * 8}%`);
      node.style.setProperty('--aurora-y', `${42 + Math.cos(time / 9000) * 6}%`);
    });
  }, []);
  return <div className="aurora" ref={ref} aria-hidden="true" />;
}

/** Staggered delays for lists, collapsing to zero under reduced motion. */
export function useStagger(count: number, stepMs = 45) {
  return useMemo(() => {
    const reduced = prefersReducedMotion();
    return Array.from({ length: count }, (_, index) => (reduced ? 0 : index * stepMs));
  }, [count, stepMs]);
}

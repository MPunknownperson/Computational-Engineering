/**
 * Animation engine.
 *
 * A single shared requestAnimationFrame loop drives every animation on the
 * page, so adding motion does not add timers. It supports tweens with easing
 * and a real spring integrator (semi-implicit Euler with a fixed sub-step, so
 * behaviour does not change with frame rate).
 *
 * Reduced motion is respected globally: animations jump to their final value
 * instead of being skipped, so state stays correct.
 */
export type Easing = (t: number) => number;

export const easings = {
  linear: (t: number) => t,
  standard: (t: number) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  decelerate: (t: number) => 1 - Math.pow(1 - t, 3),
  accelerate: (t: number) => t * t * t,
  emphasis: (t: number) => (t === 0 || t === 1 ? t : t < .5
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2),
} satisfies Record<string, Easing>;

export interface SpringConfig { stiffness?: number; damping?: number; mass?: number; precision?: number }

interface Driver { id: number; tick: (deltaMs: number, timeMs: number) => boolean }

let nextId = 1;
const drivers = new Map<number, Driver>();
let frame = 0;
let lastTime = 0;

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function loop(time: number) {
  const delta = lastTime ? Math.min(64, time - lastTime) : 16.67;
  lastTime = time;
  for (const driver of [...drivers.values()]) {
    let alive = false;
    try { alive = driver.tick(delta, time); }
    catch { alive = false; }
    if (!alive) drivers.delete(driver.id);
  }
  frame = drivers.size ? requestAnimationFrame(loop) : 0;
  if (!drivers.size) lastTime = 0;
}

function register(tick: Driver['tick']): () => void {
  const id = nextId++;
  drivers.set(id, { id, tick });
  if (!frame && typeof requestAnimationFrame === 'function') frame = requestAnimationFrame(loop);
  return () => { drivers.delete(id); };
}

/** Animates a numeric value with an easing curve. Returns a cancel function. */
export function tween(options: {
  from: number;
  to: number;
  duration?: number;
  easing?: Easing;
  onUpdate: (value: number, progress: number) => void;
  onComplete?: () => void;
}): () => void {
  const { from, to, duration = 420, easing = easings.standard, onUpdate, onComplete } = options;
  if (prefersReducedMotion() || duration <= 0 || from === to || typeof requestAnimationFrame !== 'function') {
    onUpdate(to, 1);
    onComplete?.();
    return () => {};
  }
  let elapsed = 0;
  return register(delta => {
    elapsed += delta;
    const progress = Math.min(1, elapsed / duration);
    onUpdate(from + (to - from) * easing(progress), progress);
    if (progress >= 1) { onComplete?.(); return false; }
    return true;
  });
}

/**
 * Spring integrator with a fixed 1/240s sub-step so the motion is identical
 * regardless of display refresh rate.
 */
export function spring(options: {
  from: number;
  to: number;
  velocity?: number;
  config?: SpringConfig;
  onUpdate: (value: number, velocity: number) => void;
  onComplete?: () => void;
}): () => void {
  const { from, to, velocity = 0, config = {}, onUpdate, onComplete } = options;
  const { stiffness = 170, damping = 24, mass = 1, precision = .01 } = config;
  if (prefersReducedMotion() || from === to || typeof requestAnimationFrame !== 'function') {
    onUpdate(to, 0);
    onComplete?.();
    return () => {};
  }
  let position = from;
  let speed = velocity;
  const step = 1 / 240;
  return register(delta => {
    let remaining = Math.min(delta, 64) / 1000;
    while (remaining > 0) {
      const dt = Math.min(step, remaining);
      remaining -= dt;
      const force = -stiffness * (position - to) - damping * speed;
      speed += (force / mass) * dt;
      position += speed * dt;
    }
    if (Math.abs(position - to) < precision && Math.abs(speed) < precision) {
      onUpdate(to, 0);
      onComplete?.();
      return false;
    }
    onUpdate(position, speed);
    return true;
  });
}

/** Runs a callback on every shared frame; used for continuous effects. */
export function onFrame(callback: (deltaMs: number, timeMs: number) => boolean | void): () => void {
  return register((delta, time) => callback(delta, time) !== false);
}

/** Number of animations currently running; used by the diagnostics suite. */
export function activeAnimations() { return drivers.size; }

/** Stops every animation. Used when a view unmounts during navigation. */
export function stopAllAnimations() {
  drivers.clear();
  if (frame) { cancelAnimationFrame(frame); frame = 0; }
  lastTime = 0;
}

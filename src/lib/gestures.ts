export function swipeStep(dx: number, dy: number, duration: number, width: number): -1 | 0 | 1 {
  const distance = Math.min(96, Math.max(56, width * .15));
  if (duration > 700 || duration < 0 || Math.abs(dx) < distance || Math.abs(dx) < Math.abs(dy) * 1.8) return 0;
  return dx < 0 ? 1 : -1;
}

export function adjacentTab(index: number, step: number, count: number): number {
  return Math.max(0, Math.min(count - 1, index + step));
}
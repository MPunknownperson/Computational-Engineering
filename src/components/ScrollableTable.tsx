import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export default function ScrollableTable({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const measure = () => setOverflow(container.scrollWidth > container.clientWidth + 1);
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(container);
    if (container.firstElementChild) observer?.observe(container.firstElementChild);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [children]);
  return <div className="table-region">
    {overflow && <p className="table-scroll-hint" id={hintId}>Swipe or scroll sideways to see all columns. Keyboard: focus the table and use arrow keys.</p>}
    <div className="table-scroll" ref={ref} role="region" tabIndex={overflow ? 0 : -1} aria-label={label} aria-describedby={overflow ? hintId : undefined} data-no-swipe>{children}</div>
  </div>;
}
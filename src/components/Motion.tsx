"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

const ORDER = [
  "/", "/calculators", "/tools/scientific", "/tools/units", "/tools/formula",
  "/tools/currency", "/tools/crypto", "/tools/economy", "/about",
];

/* ------------------------------------------------------------------ */
/* Page transition — direction aware                                    */
/* ------------------------------------------------------------------ */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Direction is derived during render from the previously rendered path, which
  // is the documented "adjust state while rendering" pattern — no ref reads.
  const [route, setRoute] = useState({ path: pathname, direction: 1 });
  if (route.path !== pathname) {
    const next = Math.max(0, ORDER.indexOf(pathname));
    const previous = Math.max(0, ORDER.indexOf(route.path));
    setRoute({ path: pathname, direction: next >= previous ? 1 : -1 });
  }

  return (
    <div
      key={pathname}
      className="page-enter"
      style={{ ["--enter-y" as string]: `${route.direction * 18}px` }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PanelSwap — morph content whenever a tab / toggle / mode changes      */
/* ------------------------------------------------------------------ */
export function PanelSwap({
  trigger,
  children,
  className = "",
  stagger = false,
  axis = 1,
}: {
  trigger: string | number;
  children: ReactNode;
  className?: string;
  stagger?: boolean;
  /** 1 = enter from below, -1 = enter from above */
  axis?: 1 | -1;
}) {
  return (
    <div
      key={trigger}
      className={`${stagger ? "stagger" : "panel-swap"} ${className}`}
      style={{
        ["--from-x" as string]: `${axis * 18}px`,
        ["--to-x" as string]: `${-axis * 12}px`,
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reveal — blur + lift on scroll, with stagger                          */
/* ------------------------------------------------------------------ */
export function Reveal({ children, className = "" }: {
  children: ReactNode; delay?: number; className?: string; once?: boolean;
}) {
  return <div className={className}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/* AnimatedNumber — eased tween + rolling digits                         */
/* ------------------------------------------------------------------ */
export function AnimatedNumber({
  value,
  format,
  duration = 560,
  className = "",
}: {
  value: number | null;
  format: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value ?? 0);
  const fromRef = useRef(value ?? 0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (value === null || !Number.isFinite(value)) return;
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    const isReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (isReduced || duration <= 0) {
      fromRef.current = to;
      const frame = requestAnimationFrame(() => setDisplay(to));
      return () => cancelAnimationFrame(frame);
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  const text = format(display);
  return (
    <span className={`tabular-nums ${className}`}>
      {Array.from(text).map((ch, i) => (
        <span key={`${i}:${ch}`} className={/[0-9.,]/.test(ch) ? "digit-roll" : undefined}>
          {ch}
        </span>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Segmented — sliding spring pill                                       */
/* ------------------------------------------------------------------ */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  ariaLabel = "Options",
}: {
  options: { value: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  const measure = () => {
    const el = btnRefs.current[index];
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
  };

  useLayoutEffect(measure, [index, options.length, value]);
  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    const t1 = setTimeout(measure, 70);
    const t2 = setTimeout(measure, 320);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, options.length]);

  const moveFocus = (current: number, direction: number) => {
    const next = (current + direction + options.length) % options.length;
    btnRefs.current[next]?.focus();
    onChange(options[next].value);
  };

  return (
    <div ref={wrapRef} className="segmented" role="radiogroup" aria-label={ariaLabel}>
      <span
        className="segmented-pill"
        style={{
          transform: `translateX(${pill.left}px)`,
          width: `${pill.width}px`,
          opacity: pill.ready ? 1 : 0,
        }}
      />
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => { btnRefs.current[i] = el; }}
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          className={`segmented-item ${size === "sm" ? "is-sm" : ""} ${
            o.value === value ? "is-active" : ""
          }`}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); moveFocus(i, 1); }
            if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); moveFocus(i, -1); }
            if (event.key === "Home") { event.preventDefault(); btnRefs.current[0]?.focus(); onChange(options[0].value); }
            if (event.key === "End") { event.preventDefault(); const last = options.length - 1; btnRefs.current[last]?.focus(); onChange(options[last].value); }
          }}
          onClick={() => onChange(o.value)}
        >
          <span className="inline-flex items-center gap-1.5">
            {o.icon}
            {o.label}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Skeleton                                                              */
/* ------------------------------------------------------------------ */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

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
/* Reveal — a one-shot fade + lift as a section enters the viewport      */
/*                                                                        */
/* Safe by construction: the very first render (server and first client   */
/* paint) carries none of the "hidden" styling, so a visitor without       */
/* JavaScript — or before hydration completes — always sees the final,     */
/* fully visible content. Only once mounted does the component arm itself  */
/* and fade the content in as it scrolls into view. Reduced-motion         */
/* preferences skip the animation outright. Transform/opacity only, so the  */
/* browser can run it entirely on the compositor thread.                   */
/* ------------------------------------------------------------------ */
export function Reveal({ children, delay = 0, className = "", once = true }: {
  children: ReactNode; delay?: number; className?: string; once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return; // stay fully visible, exactly as rendered on the server

    // Arm on the next frame so the browser paints the base (visible) state at
    // least once before the "hidden" class can apply — this is what makes the
    // transition play instead of popping straight to the revealed state.
    const armFrame = requestAnimationFrame(() => setArmed(true));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setShown(false);
          }
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(node);
    return () => {
      cancelAnimationFrame(armFrame);
      observer.disconnect();
    };
  }, [once]);

  return (
    <div
      ref={ref}
      className={`${armed ? (shown ? "reveal reveal-in" : "reveal") : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Parallax — a few pixels of scroll-linked drift, nothing more          */
/*                                                                        */
/* A restrained alternative to scroll-hijacking "smooth scroll" libraries: */
/* native scrolling is never touched, the browser stays in full control,   */
/* and a single rAF-batched listener nudges decorative artwork by a few     */
/* pixels while it is on screen. Disabled for reduced motion and for touch  */
/* / coarse pointers, where the effect is least useful and costs the most.  */
/* ------------------------------------------------------------------ */
export function Parallax({
  children,
  range = 16,
  className = "",
}: {
  children: ReactNode;
  /** Maximum drift, in pixels, in either direction. */
  range?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia?.("(pointer: coarse)").matches;
    if (reduced || coarse) return;

    const update = () => {
      frame.current = 0;
      const rect = node.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const viewportMid = window.innerHeight / 2;
      // -1 at the very top of the screen, +1 at the very bottom; clamp so the
      // drift never runs away for very tall pages or very short viewports.
      const progress = Math.max(-1, Math.min(1, (mid - viewportMid) / (window.innerHeight / 2 + rect.height / 2)));
      setOffset(-progress * range);
    };

    const onScroll = () => {
      if (frame.current) return;
      frame.current = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [range]);

  return (
    <div ref={ref} className={className} style={{ transform: `translate3d(0, ${offset.toFixed(2)}px, 0)` }}>
      {children}
    </div>
  );
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

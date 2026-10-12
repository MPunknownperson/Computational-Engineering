"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion, useAnimationControls, useReducedMotion } from "framer-motion";

const spring = { type: "spring" as const, stiffness: 280, damping: 28, mass: 0.85 };

/** Keep the App Router's RSC surface mounted so linked tools stay hydrated. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const previous = useRef(pathname);
  const controls = useAnimationControls();

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    if (reduced) return;
    controls.set({ opacity: 0.92, y: 9 });
    void controls.start({ opacity: 1, y: 0, transition: { ...spring, opacity: { duration: 0.2 } } });
  }, [controls, pathname, reduced]);

  return <motion.div data-route-surface initial={false} animate={controls}>{children}</motion.div>;
}

/** A keyed result panel that can leave before the replacement is displayed. */
export function PanelSwap({ trigger, children, className = "", stagger = false }: {
  trigger: string | number;
  children: ReactNode;
  className?: string;
  stagger?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={trigger}
        layout="position"
        className={className}
        initial={reduced ? false : { opacity: 0.8, y: stagger ? 12 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? { opacity: 1 } : { opacity: 0, y: -8 }}
        transition={reduced ? { duration: 0 } : spring}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/** Render readable server markup while progressively settling into view. */
export function Reveal({ children, delay = 0, className = "", once = true }: {
  children: ReactNode;
  delay?: number;
  className?: string;
  once?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0.86, y: 15 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.08 }}
      transition={reduced ? { duration: 0 } : { ...spring, delay: Math.min(delay, 300) / 1000 }}
    >
      {children}
    </motion.div>
  );
}

/** Subtle lift and pressed state for linked, keyboard-accessible cards. */
export function MotionCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      layout="position"
      className={className}
      whileHover={reduced ? undefined : { y: -5, rotate: -0.3 }}
      whileTap={reduced ? undefined : { scale: 0.985, y: 0 }}
      transition={spring}
    >
      {children}
    </motion.div>
  );
}

/** Numeric updates are short and scoped to the text node, not the whole card. */
export function AnimatedNumber({ value, format, duration = 240, className = "" }: {
  value: number | null;
  format: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const node = useRef<HTMLSpanElement>(null);
  const current = useRef(value ?? 0);
  useEffect(() => {
    const target = node.current;
    if (!target || value === null || !Number.isFinite(value)) return;
    const from = current.current;
    if (from === value || duration <= 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current.current = value;
      target.textContent = format(value);
      return;
    }
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      current.current = from + (value - from) * (1 - (1 - progress) ** 3);
      target.textContent = format(current.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, format, duration]);
  return <span ref={node} className={`tabular-nums ${className}`} aria-label={value === null ? undefined : format(value)}>{format(value ?? 0)}</span>;
}

/** Shared-layout indicator follows selection without measuring pixel widths. */
export function Segmented<T extends string>({ options, value, onChange, size = "md", ariaLabel = "Options" }: {
  options: { value: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const groupId = useId();
  const reduced = useReducedMotion();

  const focus = (next: number) => {
    buttons.current[next]?.focus();
    onChange(options[next].value);
  };

  return (
    <LayoutGroup id={groupId}>
      <div className="segmented" role="radiogroup" aria-label={ariaLabel}>
        {options.map((option, i) => (
          <motion.button
            key={option.value}
            type="button"
            ref={(element) => { buttons.current[i] = element; }}
            role="radio"
            aria-checked={option.value === value}
            tabIndex={option.value === value ? 0 : -1}
            className={`segmented-item ${size === "sm" ? "is-sm" : ""} ${option.value === value ? "is-active" : ""}`}
            whileTap={reduced ? undefined : { scale: 0.96 }}
            onKeyDown={(event) => {
              if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) {
                event.preventDefault();
                if (event.key === "Home") focus(0);
                else if (event.key === "End") focus(options.length - 1);
                else focus((i + (event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
              }
            }}
            onClick={() => onChange(option.value)}
          >
            {option.value === value && (
              <motion.span
                layoutId="segmented-active-pill"
                className="segmented-pill"
                aria-hidden="true"
                transition={reduced ? { duration: 0 } : spring}
              />
            )}
            <span className="segmented-label inline-flex items-center gap-1.5">{option.icon}{option.label}</span>
          </motion.button>
        ))}
      </div>
    </LayoutGroup>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

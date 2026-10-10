"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/** A single short translation, without keyed remounts, fades or double effects. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const previous = useRef(pathname);

  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    const node = ref.current;
    if (!node?.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = node.animate(
      [{ transform: "translateY(4px)" }, { transform: "none" }],
      { duration: 160, easing: "cubic-bezier(.2,.7,.3,1)" },
    );
    return () => animation.cancel();
  }, [pathname]);

  return <div ref={ref} data-route-surface>{children}</div>;
}

export function PanelSwap({ trigger, children, className = "", stagger = false }: {
  trigger: string | number;
  children: ReactNode;
  className?: string;
  stagger?: boolean;
}) {
  return (
    <div key={trigger} className={`${stagger ? "stagger" : "panel-swap"} ${className}`}>
      {children}
    </div>
  );
}

/** Always-visible server markup. Animate once; never hide already-painted text. */
export function Reveal({ children, delay = 0, className = "", once = true }: {
  children: ReactNode;
  delay?: number;
  className?: string;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node?.animate || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let animation: Animation | undefined;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      animation?.cancel();
      animation = node.animate([{ transform: "translateY(4px)" }, { transform: "none" }], {
        duration: 180,
        delay: Math.min(delay, 80),
        easing: "cubic-bezier(.2,.7,.3,1)",
      });
      if (once) observer.disconnect();
    }, { threshold: 0.05 });
    observer.observe(node);
    return () => { observer.disconnect(); animation?.cancel(); };
  }, [delay, once]);
  return <div ref={ref} className={className}>{children}</div>;
}

/** Tween only the text node; never re-key/re-animate each digit every frame. */
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

export function Segmented<T extends string>({ options, value, onChange, size = "md", ariaLabel = "Options" }: {
  options: { value: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const [pill, setPill] = useState({ left: 0, width: 0 });
  const index = Math.max(0, options.findIndex((option) => option.value === value));

  useLayoutEffect(() => {
    const node = buttons.current[index];
    if (!node) return;
    const measure = () => {
      const next = { left: node.offsetLeft, width: node.offsetWidth };
      setPill((previous) => previous.left === next.left && previous.width === next.width ? previous : next);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    if (wrap.current) observer.observe(wrap.current);
    return () => observer.disconnect();
  }, [index, options.length]);

  const focus = (next: number) => {
    buttons.current[next]?.focus();
    onChange(options[next].value);
  };

  return (
    <div ref={wrap} className="segmented" role="radiogroup" aria-label={ariaLabel}>
      <span className="segmented-pill" aria-hidden="true" style={{ transform: `translateX(${pill.left}px)`, width: pill.width, visibility: pill.width ? "visible" : "hidden" }} />
      {options.map((option, i) => (
        <button
          key={option.value}
          type="button"
          ref={(element) => { buttons.current[i] = element; }}
          role="radio"
          aria-checked={option.value === value}
          tabIndex={option.value === value ? 0 : -1}
          className={`segmented-item ${size === "sm" ? "is-sm" : ""} ${option.value === value ? "is-active" : ""}`}
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
          <span className="inline-flex items-center gap-1.5">{option.icon}{option.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

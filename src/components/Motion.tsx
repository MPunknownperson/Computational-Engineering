"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const spring = { type: "spring" as const, stiffness: 280, damping: 28, mass: 0.85 };

/** Route motion preserves fully opaque, readable content throughout navigation. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const reduced = useReducedMotion();
  const surface = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  const pendingNavigation = useRef(false);

  useGSAP(() => {
    const element = surface.current;
    if (!element) return;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (reduced) {
      gsap.set(element, { clearProps: "opacity,visibility,transform" });
      return;
    }
    gsap.fromTo(
      element,
      { y: 10 },
      { y: 0, duration: 0.36, ease: "power2.out", clearProps: "transform" },
    );
  }, { scope: surface, dependencies: [pathname, reduced], revertOnUpdate: true });

  useEffect(() => {
    pendingNavigation.current = false;
  }, [pathname]);

  useEffect(() => {
    const captureInteraction = (event: MouseEvent) => {
      const target = event.target instanceof Element
        ? event.target
        : event.target instanceof Node
          ? event.target.parentElement
          : null;
      if (!target) return;

      const control = target.closest<HTMLElement>(
        'button:not(:disabled), [role="button"], a.btn, .segmented-item, .card-hover',
      );
      if (control && !reduced) {
        gsap.fromTo(
          control,
          { scale: 0.975 },
          { scale: 1, duration: 0.24, ease: "back.out(1.65)", overwrite: "auto", clearProps: "transform" },
        );
      }

      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) return;

      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;

      let destination: URL;
      try {
        destination = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;

      event.preventDefault();
      if (pendingNavigation.current) return;
      pendingNavigation.current = true;
      const nextLocation = `${destination.pathname}${destination.search}${destination.hash}`;
      const navigate = () => router.push(nextLocation);
      const element = surface.current;
      if (reduced || !element) {
        navigate();
        return;
      }
      gsap.killTweensOf(element);
      gsap.to(element, {
        y: -7,
        duration: 0.17,
        ease: "power1.in",
        overwrite: "auto",
        onComplete: navigate,
      });
    };

    document.addEventListener("click", captureInteraction, true);
    return () => document.removeEventListener("click", captureInteraction, true);
  }, [pathname, reduced, router]);

  return <div ref={surface} data-route-surface>{children}</div>;
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

/** Content enters as it reaches the reading viewport, without hiding SSR markup. */
export function Reveal({ children, delay = 0, className = "", once = true }: {
  children: ReactNode;
  delay?: number;
  className?: string;
  once?: boolean;
}) {
  const reduced = useReducedMotion();
  const element = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const node = element.current;
    if (!node || reduced) return;
    gsap.fromTo(
      node,
      { autoAlpha: 0, y: 15 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.48,
        delay: Math.min(Math.max(delay, 0), 350) / 1000,
        ease: "power2.out",
        clearProps: "opacity,visibility,transform",
        scrollTrigger: {
          trigger: node,
          start: "top 92%",
          once,
          toggleActions: once ? "play none none none" : "play none none reverse",
        },
      },
    );
  }, { scope: element, dependencies: [delay, once, reduced], revertOnUpdate: true });

  return <div ref={element} className={className}>{children}</div>;
}

/** Small pointer and press feedback for linked cards across the site. */
export function MotionCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  const card = useRef<HTMLDivElement>(null);

  const settle = () => {
    const node = card.current;
    if (!node || reduced) return;
    gsap.to(node, { y: 0, scale: 1, rotate: 0, duration: 0.2, ease: "power2.out", overwrite: "auto", clearProps: "transform" });
  };

  return (
    <div
      ref={card}
      className={className}
      onPointerEnter={(event) => {
        if (reduced || event.pointerType !== "mouse" || !card.current) return;
        gsap.to(card.current, { y: -4, rotate: -0.12, duration: 0.22, ease: "power2.out", overwrite: "auto" });
      }}
      onPointerLeave={settle}
      onPointerDown={() => {
        if (!reduced && card.current) gsap.to(card.current, { scale: 0.985, duration: 0.1, ease: "power1.out", overwrite: "auto" });
      }}
      onPointerUp={settle}
      onPointerCancel={settle}
    >
      {children}
    </div>
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

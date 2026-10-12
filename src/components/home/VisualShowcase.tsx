"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowLeft, ArrowRight, MoveHorizontal, Sparkles } from "lucide-react";
import type HoverEffect from "hover-effect";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Slide = { src: string; title: string; subtitle: string; alt: string };

export function VisualShowcase({ firstImage, secondImage }: { firstImage: string; secondImage: string }) {
  const slides: [Slide, Slide] = [
    { src: firstImage, title: "Start with the question", subtitle: "A visual way into everyday numbers.", alt: "Illustrated computational engineering workspace with a calculator and numbers." },
    { src: secondImage, title: "See how it connects", subtitle: "From a sketch to a working method.", alt: "Illustrated scientific calculator and mathematical concepts." },
  ];
  const sectionRef = useRef<HTMLElement>(null);
  const canvasHost = useRef<HTMLDivElement>(null);
  const effect = useRef<HoverEffect | null>(null);
  const scrollPlayed = useRef(false);
  const [active, setActive] = useState<0 | 1>(0);
  const [webglReady, setWebglReady] = useState(false);
  const reduced = useReducedMotion();

  const { contextSafe } = useGSAP(() => {
    if (reduced) return;
    gsap.fromTo(".showcase-copy", { y: 22, opacity: 0.78 }, {
      y: 0, opacity: 1, duration: 0.85, ease: "power3.out",
      scrollTrigger: { trigger: sectionRef.current, start: "top 85%", once: true },
    });
    gsap.fromTo(".showcase-spark", { rotate: -16 }, {
      rotate: 12, repeat: -1, yoyo: true, duration: 2.3, ease: "sine.inOut",
    });
  }, { scope: sectionRef, dependencies: [reduced] });

  const clickAccent = contextSafe(() => {
    if (reduced) return;
    gsap.fromTo(".showcase-counter", { y: 7, opacity: 0.55 }, { y: 0, opacity: 1, duration: 0.4, ease: "back.out(1.6)" });
  });

  function showSlide(index: 0 | 1, animateClick = false) {
    if (index === 1) effect.current?.next();
    else effect.current?.previous();
    setActive(index);
    if (animateClick) clickAccent();
  }

  useEffect(() => {
    if (reduced || !canvasHost.current) return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;
    let supported = false;
    try { supported = Boolean(document.createElement("canvas").getContext("webgl")); } catch { /* Canvas is optional. */ }
    if (!supported) return;

    let cancelled = false;
    let started = false;
    let capturedResize: EventListenerOrEventListenerObject | null = null;
    const host = canvasHost.current;

    const preload = (src: string) => new Promise<void>((resolve, reject) => {
      const image = new window.Image();
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`Unable to load ${src}`));
      image.src = src;
    });

    async function mountEffect() {
      if (started || !host) return;
      started = true;
      try {
        await Promise.all([preload(firstImage), preload(secondImage), preload("/images/liquid-displacement.png")]);
        const { default: HoverEffectCtor } = await import("hover-effect");
        if (cancelled || !host) return;

        // The library doesn't expose destroy(). Capture its one global resize
        // listener so route changes don't leave a detached WebGL scene behind.
        const original = window.addEventListener;
        const addListener = original.bind(window) as (name: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => void;
        window.addEventListener = ((name: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
          if (name === "resize") capturedResize = listener;
          addListener(name, listener, options);
        }) as typeof window.addEventListener;
        try {
          effect.current = new HoverEffectCtor({
            parent: host,
            image1: firstImage,
            image2: secondImage,
            displacementImage: "/images/liquid-displacement.png",
            imagesRatio: 630 / 1200,
            intensity: 0.22,
            angle: Math.PI / 3,
            speedIn: 0.85,
            speedOut: 0.85,
            hover: false,
          });
        } finally {
          window.addEventListener = original;
        }
        host.querySelector("canvas")?.setAttribute("aria-hidden", "true");
        if (!cancelled) setWebglReady(true);
      } catch {
        // Responsive, accessible still images remain fully usable without WebGL.
      }
    }

    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer?.disconnect();
      void mountEffect();
    }, { rootMargin: "250px" });
    if (observer) observer.observe(host);
    else void mountEffect();

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (capturedResize) window.removeEventListener("resize", capturedResize);
      const canvas = host?.querySelector("canvas");
      try { canvas?.getContext("webgl")?.getExtension("WEBGL_lose_context")?.loseContext(); } catch { /* Already detached. */ }
      canvas?.remove();
      effect.current = null;
    };
  }, [firstImage, secondImage, reduced]);

  useEffect(() => {
    if (!webglReady || reduced || scrollPlayed.current || !sectionRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || scrollPlayed.current) return;
      scrollPlayed.current = true;
      effect.current?.next();
      setActive(1);
      observer.disconnect();
    }, { threshold: 0.58 });
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [webglReady, reduced]);

  return (
    <section ref={sectionRef} className="visual-showcase mx-auto max-w-7xl px-5 py-10 sm:py-14" aria-labelledby="visual-showcase-title">
      <div className="showcase-shell sketch overflow-hidden !p-0">
        <div className="showcase-copy">
          <span className="showcase-eyebrow"><Sparkles size={15} className="showcase-spark" /> MORE THAN A NUMBER</span>
          <h2 id="visual-showcase-title" className="h-title">An idea looks better<br /><span className="h-underline">when it moves.</span></h2>
          <p>Explore two sides of the same thought. Hover to discover, swipe to shift perspective, or use the arrows to take it at your own pace.</p>
          <div className="showcase-actions" aria-label="Illustration controls">
            <button type="button" className="showcase-arrow" onClick={() => showSlide(0, true)} aria-label="Show the first illustration" disabled={active === 0}><ArrowLeft size={18} /></button>
            <button type="button" className="showcase-arrow" onClick={() => showSlide(1, true)} aria-label="Show the second illustration" disabled={active === 1}><ArrowRight size={18} /></button>
            <span className="showcase-counter" aria-live="polite">0{active + 1} <span>/ 02</span></span>
          </div>
          <span className="showcase-hint"><MoveHorizontal size={15} /> HOVER · SWIPE · CLICK</span>
        </div>
        <div className="showcase-art-panel">
          <motion.div
            className={`showcase-viewport ${webglReady ? "has-webgl" : ""}`}
            role="group"
            aria-label="Interactive illustration comparison"
            drag={reduced ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.16}
            onDragEnd={(_, info) => {
              if (info.offset.x < -42 || info.velocity.x < -320) showSlide(1, true);
              if (info.offset.x > 42 || info.velocity.x > 320) showSlide(0, true);
            }}
            onPointerEnter={(event) => { if (event.pointerType === "mouse") showSlide(1); }}
            onPointerLeave={(event) => { if (event.pointerType === "mouse") showSlide(0); }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.img
                key={active}
                className="showcase-image"
                src={slides[active].src}
                alt={slides[active].alt}
                width={1200}
                height={630}
                initial={reduced ? false : { opacity: 0.55, scale: 1.025 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
                transition={{ duration: reduced ? 0 : 0.35 }}
                draggable={false}
              />
            </AnimatePresence>
            <div ref={canvasHost} className="showcase-webgl" aria-hidden="true" />
            <div className="showcase-art-label" aria-hidden="true">LIQUID STUDIES <span>↗</span></div>
          </motion.div>
          <div className="showcase-art-caption" aria-live="polite"><strong>{slides[active].title}</strong><span>{slides[active].subtitle}</span></div>
        </div>
      </div>
    </section>
  );
}

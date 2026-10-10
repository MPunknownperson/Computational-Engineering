"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { PackId } from "@/lib/i18n";

/**
 * Deferred voice entry.
 *
 * The voice card pulls in the language packs, the command grammar, the IR
 * encoder and the on-device AI bridge — a meaningful amount of JavaScript for
 * a control most visitors scroll past. It is therefore:
 *
 *   1. code-split out of the page bundle (`next/dynamic`, client-only), and
 *   2. only requested once it is actually close to the viewport.
 *
 * The placeholder reserves the card's height so bringing it in never shifts
 * layout, which keeps the page stable (and CLS at zero) while it loads.
 */
const SpeakCalcImpl = dynamic(
  () => import("@/components/tech/SpeakCalc").then((mod) => mod.SpeakCalc),
  {
    ssr: false,
    loading: () => <VoicePlaceholder label="Loading voice input…" />,
  },
);

function VoicePlaceholder({ label }: { label: string }) {
  return (
    <div
      className="sketch flex min-h-[168px] items-center gap-3 text-sm text-slate-500"
      aria-hidden="true"
    >
      <span className="sticker-badge animate-pulse" />
      <span>{label}</span>
    </div>
  );
}

export function SpeakCalc({ packId = "en" }: { packId?: PackId }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // No IntersectionObserver (very old browsers): load immediately rather
    // than leaving the visitor with a placeholder that never resolves.
    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      // Start fetching a little before the card is reached so it is usually
      // ready by the time it is on screen.
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} data-voice-entry>
      {visible ? <SpeakCalcImpl packId={packId} /> : <VoicePlaceholder label="Voice input" />}
    </div>
  );
}

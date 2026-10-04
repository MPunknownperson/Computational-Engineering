"use client";
import type { ReactNode } from "react";

/**
 * Deliberately minimal effects module.
 *
 * Earlier versions of the site shipped a click-ripple layer, toast
 * notifications, a magnetic hover, confetti bursts, 3D card tilt and a scroll
 * progress bar. They have been removed: they added motion and controls that
 * did not help anyone complete a calculation. The exports below are kept so
 * that no page needs a special case — they simply render their children.
 */

export function Tilt({ children, className = "" }: { children: ReactNode; className?: string; max?: number; lift?: number }) {
  return <div className={className}>{children}</div>;
}

export function Magnetic({ children, className = "" }: { children: ReactNode; className?: string; strength?: number }) {
  return <div className={`inline-block ${className}`}>{children}</div>;
}

/** Status messages are now shown inline next to the control that produced them. */
export function notify(_msg: string, _tone?: "ok" | "info" | "bad") {
  void _msg;
  void _tone;
}

export function useToast() {
  return notify;
}

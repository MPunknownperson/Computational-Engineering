"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { functionalStorage, subscribeConsentChange } from "@/lib/privacy/browser-consent";

const KEY = "radix-loom-theme";
const EVENT = "radix-loom-theme-change";
type Appearance = "light" | "dark";
let transientAppearance: Appearance | null = null;

function systemAppearance(): Appearance {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readAppearance(): Appearance {
  if (transientAppearance) return transientAppearance;
  try {
    const saved = functionalStorage()?.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Private browsing can disallow storage; follow the operating system instead.
  }
  return systemAppearance();
}

function applyAppearance(mode: Appearance): void {
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content",
    mode === "dark" ? "#141d30" : "#f7f5ef",
  );
}

function subscribe(notify: () => void): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const sync = () => {
    applyAppearance(readAppearance());
    notify();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) sync();
  };
  media.addEventListener("change", sync);
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, sync);
  const unsubscribeConsent = subscribeConsentChange(sync);
  return () => {
    unsubscribeConsent();
    media.removeEventListener("change", sync);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, sync);
  };
}

function chooseAppearance(mode: Appearance): void {
  transientAppearance = mode;
  try {
    functionalStorage()?.setItem(KEY, mode);
  } catch {
    // The control still works for the current session when storage is unavailable.
  }
  applyAppearance(mode);
  window.dispatchEvent(new Event(EVENT));
}

/** The OS preference is applied silently until the visitor explicitly changes it. */
export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, readAppearance, () => "light" as const);
  const dark = mode === "dark";

  useEffect(() => {
    applyAppearance(readAppearance());
  }, []);

  return (
    <div className="theme-controls">
      <button
        type="button"
        className="theme-switch"
        role="switch"
        aria-checked={dark}
        aria-label={`Dark mode ${dark ? "on" : "off"}. Switch to ${dark ? "light" : "dark"} mode`}
        title={dark ? "Switch to light mode" : "Switch to dark mode"}
        onClick={() => chooseAppearance(dark ? "light" : "dark")}
      >
        <Sun className="theme-sun" size={15} strokeWidth={2.3} aria-hidden="true" />
        <Moon className="theme-moon" size={14} strokeWidth={2.3} aria-hidden="true" />
        <span className="theme-thumb" aria-hidden="true" />
      </button>
    </div>
  );
}

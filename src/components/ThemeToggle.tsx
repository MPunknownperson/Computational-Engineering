"use client";

import { useEffect, useSyncExternalStore } from "react";
import { MonitorCog, Moon, Sun } from "lucide-react";

const KEY = "radix-loom-theme";
const EVENT = "radix-loom-theme-change";
type Choice = "system" | "light" | "dark";

function readTheme(): `${Choice}:${"light" | "dark"}` {
  let choice: Choice = "system";
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored === "light" || stored === "dark") choice = stored;
  } catch { /* Private browsing can disallow storage. */ }
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return `${choice}:${choice === "system" ? (systemDark ? "dark" : "light") : choice}`;
}

function subscribe(notify: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", notify);
  window.addEventListener("storage", notify);
  window.addEventListener(EVENT, notify);
  return () => {
    media.removeEventListener("change", notify);
    window.removeEventListener("storage", notify);
    window.removeEventListener(EVENT, notify);
  };
}

function chooseTheme(choice: Choice) {
  try {
    if (choice === "system") window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, choice);
  } catch { /* Still allow this-session appearance changes. */ }
  const resolved = choice === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : choice;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#151d30" : "#f7f5ef");
  window.dispatchEvent(new Event(EVENT));
}

/** Elongated switch with an explicit return-to-system preference. */
export function ThemeToggle() {
  const snapshot = useSyncExternalStore(subscribe, readTheme, () => "system:light" as const);
  const [choice, resolved] = snapshot.split(":") as [Choice, "light" | "dark"];
  const dark = resolved === "dark";

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#151d30" : "#f7f5ef");
  }, [resolved, dark]);

  return (
    <div className="theme-controls" aria-label="Appearance settings">
      <button
        type="button"
        className="theme-switch"
        role="switch"
        aria-checked={dark}
        aria-label={`Dark mode ${dark ? "on" : "off"}. Switch to ${dark ? "day" : "dark"} mode`}
        title={dark ? "Switch to day mode" : "Switch to dark mode"}
        onClick={() => chooseTheme(dark ? "light" : "dark")}
      >
        <Sun className="theme-sun" size={15} strokeWidth={2.3} aria-hidden />
        <Moon className="theme-moon" size={14} strokeWidth={2.3} aria-hidden />
        <span className="theme-thumb" aria-hidden="true" />
      </button>
      <button
        type="button"
        className={`theme-auto ${choice === "system" ? "is-auto" : ""}`}
        onClick={() => chooseTheme("system")}
        aria-label={`Use system appearance${choice === "system" ? " (active)" : ""}`}
        aria-pressed={choice === "system"}
        title="Use device appearance automatically"
      >
        <MonitorCog size={15} strokeWidth={2} aria-hidden />
        <span className="sr-only">Auto</span>
      </button>
    </div>
  );
}

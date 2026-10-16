"use client";

import { Cookie } from "lucide-react";
import { openCookieSettings } from "./consent-events";

/** Settings are available to everyone; categories and notices vary by region. */
export function CookieSettingsButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={openCookieSettings}
      className={`inline-flex items-center gap-2 font-semibold underline underline-offset-4 hover:text-[color:var(--ink)] ${className}`}
    >
      <Cookie size={18} strokeWidth={2.2} aria-hidden="true" className="shrink-0 text-[#b45309]" />
      <span>Cookie settings</span>
    </button>
  );
}

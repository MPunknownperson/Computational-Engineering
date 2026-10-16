"use client";

import { openCookieSettings } from "./consent-events";

/** Re-opens the consent preferences (Silktide modal) or the simple notice. */
export function CookieSettingsButton({ className = "" }: { className?: string }) {
  return (
    <button type="button" onClick={openCookieSettings} className={`font-semibold text-slate-600 hover:text-[color:var(--ink)] hover:underline ${className}`}>
      Cookie settings
    </button>
  );
}

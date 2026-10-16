"use client";

import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { isManagedRegime } from "@/lib/privacy/consent-regime";
import { CONSENT_REGIME_EVENT, currentConsentRegime, openCookieSettings } from "./consent-events";

/**
 * Re-opens the consent preferences modal. Rendered only for visitors in a
 * jurisdiction with a managed consent experience (GDPR/UK, California, Brazil,
 * Canada, Australia, Singapore, Japan, India); everyone else sees nothing.
 */
export function CookieSettingsButton({ className = "" }: { className?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = (regime: string | undefined) => setVisible(isManagedRegime(regime));
    sync(currentConsentRegime());
    const onRegime = (event: Event) => sync((event as CustomEvent<string>).detail);
    window.addEventListener(CONSENT_REGIME_EVENT, onRegime);
    return () => window.removeEventListener(CONSENT_REGIME_EVENT, onRegime);
  }, []);

  if (!visible) return null;
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

"use client";

import { useEffect, useState } from "react";
import { regimeFromTimezone, type ConsentRegime, type ServerConsentRegime } from "@/lib/privacy/consent-regime";
import { SilktideConsent } from "./SilktideConsent";
import { StandardCookieNotice } from "./StandardCookieNotice";
import { announceConsentRegime } from "./consent-events";

/**
 * Chooses the right consent experience for the visitor:
 * - GDPR regions, California, Brazil, Canada, Australia, Singapore, Japan and
 *   India get the Silktide Consent Manager v2.0 with jurisdiction-specific
 *   settings and text. The footer "Cookie settings" control is global.
 * - Everyone else keeps the same informational notice and can open settings.
 * The server decides from a trusted edge location; when none is configured the
 * browser applies a conservative timezone fallback after hydration.
 */
export function ConsentManager({ serverRegime }: { serverRegime: ServerConsentRegime }) {
  const [regime, setRegime] = useState<ConsentRegime | null>(serverRegime === "unknown" ? null : serverRegime);

  useEffect(() => {
    if (regime) return;
    let resolved: ConsentRegime = "standard";
    try {
      resolved = regimeFromTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.language);
    } catch {
      resolved = "standard";
    }
    setRegime(resolved);
  }, [regime]);

  useEffect(() => {
    if (regime) announceConsentRegime(regime);
  }, [regime]);

  if (!regime) return null;
  return (
    <>
      {regime === "standard" && <StandardCookieNotice />}
      <SilktideConsent regime={regime} />
    </>
  );
}

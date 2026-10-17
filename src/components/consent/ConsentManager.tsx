"use client";

import { useEffect, useState } from "react";
import { protectiveConsentRegime, type ServerConsentRegime } from "@/lib/privacy/consent-regime";
import { SilktideConsent } from "./SilktideConsent";
import { StandardCookieNotice } from "./StandardCookieNotice";
import { announceConsentRegime } from "./consent-events";

/** The server's verified location is authoritative; browser preferences cannot change it. */
export function ConsentManager({ serverRegime }: { serverRegime: ServerConsentRegime }) {
  const [mounted, setMounted] = useState(false);
  const regime = protectiveConsentRegime(serverRegime);

  useEffect(() => {
    // Retire the previous location override rather than migrating or honoring it.
    try { localStorage.removeItem("radixloom.consent-region.v1"); } catch { /* Storage is optional. */ }
    announceConsentRegime(regime);
    setMounted(true);
  }, [regime]);

  if (!mounted) return null;
  return <>
    {regime === "standard" && <StandardCookieNotice />}
    <SilktideConsent regime={regime} />
  </>;
}

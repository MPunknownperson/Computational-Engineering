"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import type { ConsentRegime } from "@/lib/privacy/consent-regime";
import { buildSilktideConfig } from "./silktide-config";
import { OPEN_COOKIE_SETTINGS_EVENT, SILKTIDE_SCRIPT, SILKTIDE_STYLES } from "./consent-events";

/** Records a CCPA sale/sharing opt-out server-side so it outlives localStorage. */
async function recordOptOut(): Promise<void> {
  try {
    await fetch("/api/privacy/choices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "opt-out", source: navigator.globalPrivacyControl ? "gpc" : "manual" }),
      keepalive: true,
    });
  } catch {
    // The site never sells or shares regardless; failure to persist is non-fatal.
  }
}

export function SilktideConsent({ regime }: { regime: Exclude<ConsentRegime, "standard"> }) {
  const [ready, setReady] = useState(false);
  const initialised = useRef<string | null>(null);

  const initialise = useCallback(() => {
    const api = window.silktideConsentManager;
    if (!api || initialised.current === regime) return;
    initialised.current = regime;
    const config = buildSilktideConfig({
      regime,
      globalPrivacyControl: navigator.globalPrivacyControl === true,
      onOptOut: () => { void recordOptOut(); },
    });
    api.init(config);
  }, [regime]);

  // The script may already be cached and executed on client-side navigations.
  useEffect(() => {
    if (window.silktideConsentManager) { setReady(true); initialise(); }
  }, [initialise]);

  useEffect(() => { if (ready) initialise(); }, [ready, initialise]);

  // Footer "Cookie settings" link re-opens the preferences modal.
  useEffect(() => {
    const open = () => window.silktideConsentManager?.getInstance()?.toggleModal(true);
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
  }, []);

  return (
    <>
      <link rel="stylesheet" href={SILKTIDE_STYLES} precedence="default" />
      <Script src={SILKTIDE_SCRIPT} strategy="afterInteractive" onLoad={() => setReady(true)} onReady={() => setReady(true)} />
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { isManagedRegime, regimeFromTimezone, type ConsentRegime, type ServerConsentRegime } from "@/lib/privacy/consent-regime";
import { SilktideConsent } from "./SilktideConsent";
import { StandardCookieNotice } from "./StandardCookieNotice";
import { announceConsentRegime, CHANGE_CONSENT_REGION_EVENT, CONSENT_REGION_PREFERENCE_KEY } from "./consent-events";

export type ConsentRegionPreference = ConsentRegime | "auto";

function validPreference(value: unknown): value is ConsentRegionPreference {
  return value === "auto" || value === "standard" || isManagedRegime(value);
}

export function ConsentManager({ serverRegime }: { serverRegime: ServerConsentRegime }) {
  // Resolve before mounting either notice. Never briefly display the standard
  // notice to a managed-region visitor during hydration or script loading.
  const [regime, setRegime] = useState<ConsentRegime | null>(null);
  const [preference, setPreference] = useState<ConsentRegionPreference>("auto");

  useEffect(() => {
    const resolve = (choice: ConsentRegionPreference) => {
      let resolved: ConsentRegime;
      if (choice !== "auto") resolved = choice;
      else if (serverRegime !== "unknown") resolved = serverRegime;
      else {
        let timezone: string | undefined;
        try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* Locale hints still work without Intl timezone support. */ }
        resolved = regimeFromTimezone(timezone, navigator.languages?.length ? navigator.languages : navigator.language);
      }
      setPreference(choice);
      announceConsentRegime(resolved);
      setRegime(resolved);
    };
    let stored: unknown = "auto";
    try { stored = localStorage.getItem(CONSENT_REGION_PREFERENCE_KEY) || "auto"; } catch { /* Privacy settings work without persistent storage. */ }
    resolve(validPreference(stored) ? stored : "auto");

    const change = (event: Event) => {
      const choice: unknown = (event as CustomEvent).detail;
      if (!validPreference(choice)) return;
      try {
        if (choice === "auto") localStorage.removeItem(CONSENT_REGION_PREFERENCE_KEY);
        else localStorage.setItem(CONSENT_REGION_PREFERENCE_KEY, choice);
      } catch { /* Keep this page's selection in memory. */ }
      resolve(choice);
    };
    const storage = (event: StorageEvent) => {
      if (event.key === CONSENT_REGION_PREFERENCE_KEY || event.key === null) {
        const choice = event.newValue;
        resolve(validPreference(choice) ? choice : "auto");
      }
    };
    window.addEventListener(CHANGE_CONSENT_REGION_EVENT, change);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener(CHANGE_CONSENT_REGION_EVENT, change);
      window.removeEventListener("storage", storage);
    };
  }, [serverRegime]);

  if (!regime) return null;
  return <>
    {regime === "standard" && <StandardCookieNotice />}
    <SilktideConsent regime={regime} regionPreference={preference} />
  </>;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import type { ConsentRegime } from "@/lib/privacy/consent-regime";
import { announceConsentChange, consentNamespace } from "@/lib/privacy/browser-consent";
import { buildSilktideConfig } from "./silktide-config";
import { CHANGE_CONSENT_REGION_EVENT, OPEN_COOKIE_SETTINGS_EVENT, SILKTIDE_SCRIPT, SILKTIDE_STYLES } from "./consent-events";

async function recordOptOut(): Promise<void> {
  try {
    await fetch("/api/privacy/choices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "opt-out", source: navigator.globalPrivacyControl ? "gpc" : "manual" }),
      keepalive: true,
    });
  } catch {
    // No sale or sharing takes place even when a receipt cannot be persisted.
  }
}

export function SilktideConsent({ regime, regionPreference = "auto" }: { regime: ConsentRegime; regionPreference?: ConsentRegime | "auto" }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const initialised = useRef<string | null>(null);
  const pendingOpen = useRef(false);

  const initialise = useCallback((force = false) => {
    const api = window.silktideConsentManager;
    const configurationKey = `${regime}:${regionPreference}`;
    if (!api || (!force && initialised.current === configurationKey)) return;
    initialised.current = configurationKey;
    const gpc = navigator.globalPrivacyControl === true;
    const namespace = consentNamespace(regime);
    const sync = () => {
      const instance = api.getInstance();
      if (!instance || instance.config.namespace !== namespace) return;
      // Vendor toggles contain only aria-hidden ON/OFF text. Give every
      // checkbox a real accessible name and its purpose description.
      for (const type of instance.config.consentTypes) {
        const checkbox = document.getElementById(`consent-${type.id}`) as HTMLInputElement | null;
        if (!checkbox) continue;
        checkbox.setAttribute("aria-label", type.required ? `${type.label} (always on)` : type.label);
        const description = checkbox.closest("fieldset")?.querySelector(".stcm-consent-description");
        if (description) {
          description.id = `consent-description-${type.id}`;
          checkbox.setAttribute("aria-describedby", description.id);
        }
      }
      if (gpc) {
        for (const type of instance.config.consentTypes) {
          if (["advertising", "sale-sharing", "third-party-provision"].includes(type.id)) {
            if (instance.getConsentChoice(type.id) !== false) instance.setConsentChoice(type.id, false);
            const checkbox = document.getElementById(`consent-${type.id}`) as HTMLInputElement | null;
            if (checkbox) { checkbox.checked = false; checkbox.disabled = true; }
          }
        }
      }
      announceConsentChange();
    };
    const scheduleSync = () => queueMicrotask(sync);
    const config = buildSilktideConfig({
      regime,
      regionPreference,
      globalPrivacyControl: gpc,
      onOptOut: () => {
        if (regime === "ccpa") void recordOptOut();
      },
    });
    for (const type of config.consentTypes) {
      const accept = type.onAccept;
      const reject = type.onReject;
      type.onAccept = () => { accept?.(); scheduleSync(); };
      type.onReject = () => { reject?.(); scheduleSync(); };
    }
    config.onAcceptAll = scheduleSync;
    config.onRejectAll = scheduleSync;
    config.onPreferencesOpen = scheduleSync;
    config.onPreferencesClose = () => {
      // The vendor removes the prompt when opening preferences. Closing without
      // saving must restore it, not silently dismiss the unanswered notice.
      window.setTimeout(() => {
        const instance = api.getInstance();
        if (!instance || instance.config.namespace !== namespace) return;
        if (regime !== "standard" && !instance.getHasConsented()) {
          api.init(config);
        }
        sync();
      }, 0);
    };
    api.init(config);
    sync();
    if (gpc && regime === "ccpa") void recordOptOut();
    if (pendingOpen.current || document.documentElement.dataset.cookieSettingsPending === "1") {
      pendingOpen.current = false;
      delete document.documentElement.dataset.cookieSettingsPending;
      api.getInstance()?.toggleModal(true);
    }
  }, [regime, regionPreference]);

  useEffect(() => {
    if (window.silktideConsentManager) { setReady(true); initialise(); }
  }, [initialise]);

  useEffect(() => { if (ready) initialise(); }, [ready, initialise]);

  useEffect(() => {
    const open = () => {
      const instance = window.silktideConsentManager?.getInstance();
      if (instance) { delete document.documentElement.dataset.cookieSettingsPending; instance.toggleModal(true); }
      else pendingOpen.current = true;
    };
    const changeRegion = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLSelectElement) || target.id !== "consent-region-selector") return;
      pendingOpen.current = true;
      window.dispatchEvent(new CustomEvent(CHANGE_CONSENT_REGION_EVENT, { detail: target.value }));
    };
    document.addEventListener("change", changeRegion);
    const storage = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith(`stcm.${consentNamespace(regime)}.`)) initialise(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
    window.addEventListener("storage", storage);
    return () => {
      document.removeEventListener("change", changeRegion);
      window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, open);
      window.removeEventListener("storage", storage);
    };
  }, [regime, initialise]);

  return (
    <>
      <link rel="stylesheet" href={SILKTIDE_STYLES} precedence="default" />
      <Script src={SILKTIDE_SCRIPT} strategy="afterInteractive" onLoad={() => setReady(true)} onReady={() => setReady(true)} onError={() => setFailed(true)} />
      {failed && <aside className="cookie-notice" role="status"><div className="cookie-notice-card"><p className="cookie-notice-text">Cookie settings could not load. Only strictly necessary storage is enabled; optional features remain off. Please reload to make a selection.</p><button className="btn btn-ink" onClick={() => window.location.reload()}>Reload settings</button></div></aside>}
    </>
  );
}

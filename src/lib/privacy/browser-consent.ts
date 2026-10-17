import { isManagedRegime, type ConsentRegime } from "./consent-regime";

export const CONSENT_CHANGED_EVENT = "radixloom:consent-changed";
export const CONSENT_REGIME_EVENT = "radixloom:consent-regime";
export const CONSENT_VERSION = "v2";
export type OptionalPurpose = "functional" | "analytics" | "advertising";

/** A new namespace requires a fresh, explicit choice for this policy version. */
export function consentNamespace(regime: ConsentRegime): string {
  return `radixloom-${CONSENT_VERSION}-${regime}`;
}

export function browserConsentRegime(): ConsentRegime | null {
  if (typeof window === "undefined") return null;
  const resolved = document.documentElement.dataset.consentRegime;
  if (resolved === "standard" || isManagedRegime(resolved)) return resolved;
  return null;
}

export function hasConsentSelection(regime = browserConsentRegime()): boolean {
  if (!regime || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(`stcm.${consentNamespace(regime)}.hasConsented`) === "1";
  } catch {
    return false;
  }
}

/** Browsing is not consent. No optional purpose is enabled by a default alone. */
export function optionalPurposeAllowed(purpose: OptionalPurpose): boolean {
  const regime = browserConsentRegime();
  if (!regime || !hasConsentSelection(regime)) return false;
  if (purpose === "advertising" && navigator.globalPrivacyControl === true) return false;
  const id = purpose === "advertising" ? regime === "ccpa" ? "sale-sharing" : regime === "appi" ? "third-party-provision" : "advertising" : purpose;
  try {
    return window.localStorage.getItem(`stcm.${consentNamespace(regime)}.consent.${id}`) === "true";
  } catch {
    return false;
  }
}

export function announceConsentChange(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
}

export function subscribeConsentChange(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const storage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith("stcm.")) listener();
  };
  window.addEventListener(CONSENT_CHANGED_EVENT, listener);
  window.addEventListener(CONSENT_REGIME_EVENT, listener);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(CONSENT_CHANGED_EVENT, listener);
    window.removeEventListener(CONSENT_REGIME_EVENT, listener);
    window.removeEventListener("storage", storage);
  };
}

export function functionalStorage(kind: "local" | "session" = "local"): Storage | null {
  if (!optionalPurposeAllowed("functional")) return null;
  try {
    return kind === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

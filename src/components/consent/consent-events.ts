/** Shared browser-only constants for the cookie consent UI. */
export const OPEN_COOKIE_SETTINGS_EVENT = "radixloom:cookie-settings";
/** Fired by the ConsentManager once the visitor's consent regime is resolved. */
export const CONSENT_REGIME_EVENT = "radixloom:consent-regime";
export const STANDARD_NOTICE_KEY = "radixloom.cookie-notice";
export const SILKTIDE_SCRIPT = "/vendor/silktide/silktide-consent-manager.js";
export const SILKTIDE_STYLES = "/vendor/silktide/silktide-consent-manager.css";

export function openCookieSettings(): void {
  document.documentElement.dataset.cookieSettingsPending = "1";
  window.dispatchEvent(new CustomEvent(OPEN_COOKIE_SETTINGS_EVENT));
}

export function announceConsentRegime(regime: string): void {
  document.documentElement.dataset.consentRegime = regime;
  window.dispatchEvent(new CustomEvent(CONSENT_REGIME_EVENT, { detail: regime }));
}

export function currentConsentRegime(): string | undefined {
  return typeof document === "undefined" ? undefined : document.documentElement.dataset.consentRegime;
}

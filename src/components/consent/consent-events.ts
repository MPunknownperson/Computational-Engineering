/** Shared browser-only constants for the cookie consent UI. */
export const OPEN_COOKIE_SETTINGS_EVENT = "radixloom:cookie-settings";
export const STANDARD_NOTICE_KEY = "radixloom.cookie-notice";
export const SILKTIDE_SCRIPT = "/vendor/silktide/silktide-consent-manager.js";
export const SILKTIDE_STYLES = "/vendor/silktide/silktide-consent-manager.css";

export function openCookieSettings(): void {
  window.dispatchEvent(new CustomEvent(OPEN_COOKIE_SETTINGS_EVENT));
}

import type { PrivacyArea } from "./geo";

/**
 * Which cookie-consent experience a visitor receives.
 *
 * - `gdpr`     — EU/EEA, UK and Switzerland: prior opt-in consent for all
 *                non-essential storage (GDPR / UK GDPR / ePrivacy / FADP).
 * - `ccpa`     — California: notice at collection plus an opt-out of
 *                sale/sharing (CCPA/CPRA). Non-essential categories default on
 *                unless Global Privacy Control is present.
 * - `standard` — everywhere else: a simple informational notice.
 * - `unknown`  — the server could not establish a trusted location; the
 *                browser applies a conservative fallback.
 */
export type ConsentRegime = "gdpr" | "ccpa" | "standard";
export type ServerConsentRegime = ConsentRegime | "unknown";

/** EU member states + EEA (IS, LI, NO) + UK + Switzerland. */
export const GDPR_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT",
  "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  "IS", "LI", "NO", "GB", "CH",
  // Outermost regions / dependencies where EU or UK law applies.
  "GF", "GP", "MQ", "YT", "RE", "MF", "AX", "GI",
]);

export function regimeForArea(area: PrivacyArea | null): ServerConsentRegime {
  if (!area) return "unknown";
  if (GDPR_COUNTRIES.has(area.country)) return "gdpr";
  if (area.country === "US") {
    if (area.region === "CA") return "ccpa";
    // Edge knows the country but not the state: let the browser's timezone
    // decide between the California notice and the standard notice.
    if (!area.region) return "unknown";
    return "standard";
  }
  return "standard";
}

/**
 * Browser-side fallback used only when the server had no trusted location.
 * IANA timezones cannot be spoofed by a header and err toward the more
 * protective experience; they never unlock anything sensitive.
 */
export function regimeFromTimezone(timeZone: string | undefined, language?: string): ConsentRegime {
  const tz = (timeZone ?? "").trim();
  if (!tz) return "standard";
  if (tz === "America/Los_Angeles" || tz === "US/Pacific" || tz === "PST8PDT") return "ccpa";
  if (tz.startsWith("Europe/")) {
    // Europe/* also includes Istanbul, Moscow, Minsk, Kyiv etc. Exclude a few
    // clearly non-GDPR zones; everything else in Europe gets the opt-in banner.
    const nonGdpr = new Set(["Europe/Istanbul", "Europe/Moscow", "Europe/Minsk", "Europe/Kyiv", "Europe/Kiev",
      "Europe/Simferopol", "Europe/Samara", "Europe/Volgograd", "Europe/Saratov", "Europe/Ulyanovsk",
      "Europe/Kirov", "Europe/Astrakhan", "Europe/Kaliningrad", "Europe/Belgrade", "Europe/Sarajevo",
      "Europe/Skopje", "Europe/Podgorica", "Europe/Tirane", "Europe/Chisinau", "Europe/Tiraspol"]);
    return nonGdpr.has(tz) ? "standard" : "gdpr";
  }
  if (tz === "Atlantic/Reykjavik" || tz === "Atlantic/Canary" || tz === "Atlantic/Madeira" || tz === "Atlantic/Azores" || tz === "Atlantic/Faroe") return "gdpr";
  if (tz === "Asia/Nicosia" || tz === "Asia/Famagusta") return "gdpr";
  // A UK or Irish locale on an unrecognised zone still gets the protective default.
  if (language && /^(en-GB|en-IE|ga-IE|cy-GB|gd-GB)$/i.test(language)) return "gdpr";
  return "standard";
}

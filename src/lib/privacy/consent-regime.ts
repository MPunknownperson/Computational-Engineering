import type { PrivacyArea } from "./geo";

/**
 * Which cookie-consent experience a visitor receives.
 *
 * - `gdpr`     — EU/EEA, UK and Switzerland: prior opt-in consent for all
 *                non-essential storage (GDPR / UK GDPR / ePrivacy / FADP).
 * - `ccpa`     — California: notice at collection plus an opt-out of
 *                sale/sharing (CCPA/CPRA). Non-essential categories default on
 *                unless Global Privacy Control is present.
 * - `lgpd`     — Brazil: opt-in consent with purpose-specific categories (LGPD).
 * - `pipeda`   — Canada: meaningful consent; Quebec Law 25 requires opt-in for
 *                tracking, so non-essential categories default off.
 * - `au`       — Australia: Privacy Act 1988 / APPs notice with opt-out controls.
 * - `pdpa`     — Singapore: PDPA notification and purpose-based consent.
 * - `appi`     — Japan: APPI notice; opt-in for third-party provision of
 *                personally referable information (advertising identifiers).
 * - `dpdp`     — India: DPDP Act 2023 free, specific, informed opt-in consent
 *                with an equally easy withdrawal.
 * - `standard` — everywhere else: a simple informational notice, no settings.
 * - `unknown`  — the server could not establish a trusted location; the
 *                browser applies a conservative fallback.
 */
export type ManagedConsentRegime = "gdpr" | "ccpa" | "lgpd" | "pipeda" | "au" | "pdpa" | "appi" | "dpdp";
export type ConsentRegime = ManagedConsentRegime | "standard";
export type ServerConsentRegime = ConsentRegime | "unknown";

export const MANAGED_REGIMES: readonly ManagedConsentRegime[] = ["gdpr", "ccpa", "lgpd", "pipeda", "au", "pdpa", "appi", "dpdp"];

export function isManagedRegime(value: unknown): value is ManagedConsentRegime {
  return typeof value === "string" && (MANAGED_REGIMES as readonly string[]).includes(value);
}

/** EU member states + EEA (IS, LI, NO) + UK + Switzerland. */
export const GDPR_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT",
  "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  "IS", "LI", "NO", "GB", "CH",
  // Outermost regions / dependencies where EU or UK law applies.
  "GF", "GP", "MQ", "YT", "RE", "MF", "AX", "GI",
]);

/** Countries with their own tailored cookie-settings experience. */
export const COUNTRY_REGIMES: Record<string, ManagedConsentRegime> = {
  BR: "lgpd",
  CA: "pipeda",
  AU: "au",
  SG: "pdpa",
  JP: "appi",
  IN: "dpdp",
};

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
  return COUNTRY_REGIMES[area.country] ?? "standard";
}

const TZ_REGIMES: Array<[RegExp, ManagedConsentRegime]> = [
  [/^America\/(Sao_Paulo|Bahia|Belem|Fortaleza|Recife|Araguaina|Maceio|Campo_Grande|Cuiaba|Santarem|Porto_Velho|Boa_Vista|Manaus|Eirunepe|Rio_Branco|Noronha)$/, "lgpd"],
  [/^America\/(Toronto|Montreal|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Whitehorse|Yellowknife|Iqaluit|Moncton|Glace_Bay|Goose_Bay|Blanc-Sablon|Atikokan|Rankin_Inlet|Resolute|Cambridge_Bay|Inuvik|Dawson|Dawson_Creek|Fort_Nelson|Creston|Swift_Current|Nipigon|Thunder_Bay|Rainy_River)$/, "pipeda"],
  [/^Canada\//, "pipeda"],
  [/^Australia\//, "au"],
  [/^Antarctica\/(Macquarie|Casey|Davis|Mawson)$/, "au"],
  [/^Asia\/Singapore$/, "pdpa"],
  [/^Singapore$/, "pdpa"],
  [/^Asia\/Tokyo$/, "appi"],
  [/^Japan$/, "appi"],
  [/^Asia\/(Kolkata|Calcutta)$/, "dpdp"],
];

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
  for (const [pattern, regime] of TZ_REGIMES) if (pattern.test(tz)) return regime;
  // A UK or Irish locale on an unrecognised zone still gets the protective default.
  if (language && /^(en-GB|en-IE|ga-IE|cy-GB|gd-GB)$/i.test(language)) return "gdpr";
  if (language && /^pt-BR$/i.test(language)) return "lgpd";
  if (language && /^(en|fr)-CA$/i.test(language)) return "pipeda";
  if (language && /^en-AU$/i.test(language)) return "au";
  if (language && /^en-SG$/i.test(language)) return "pdpa";
  if (language && /^ja(-JP)?$/i.test(language)) return "appi";
  if (language && /^(en|hi)-IN$/i.test(language)) return "dpdp";
  return "standard";
}

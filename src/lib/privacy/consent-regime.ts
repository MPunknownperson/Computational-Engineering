import type { PrivacyArea } from "./geo";

/**
 * Which cookie-consent experience a visitor receives.
 *
 * - `gdpr`     — EU/EEA, UK and Switzerland: prior opt-in consent for all
 *                non-essential storage (GDPR / UK GDPR / ePrivacy / FADP).
 * - `ccpa`     — California: notice at collection plus an opt-out of
 *                sale/sharing (CCPA/CPRA). The site keeps optional categories off until an explicit choice;
 *                Global Privacy Control always restricts sale/sharing.
 * - `lgpd`     — Brazil: opt-in consent with purpose-specific categories (LGPD).
 * - `pipeda`   — Canada: meaningful consent; Quebec Law 25 requires opt-in for
 *                tracking, so non-essential categories default off.
 * - `au`       — Australia: Privacy Act 1988 / APPs notice with opt-out controls.
 * - `pdpa`     — Singapore: PDPA notification and purpose-based consent.
 * - `appi`     — Japan: APPI notice; opt-in for third-party provision of
 *                personally referable information (advertising identifiers).
 * - `dpdp`     — India: DPDP Act 2023 free, specific, informed opt-in consent
 *                with an equally easy withdrawal.
 * - `standard` — everywhere else: the existing informational notice, with settings available on demand.
 * - `unknown`  — the server could not establish a trusted location; a
 *                protective opt-in notice is used without inferring a location.
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
    // California gets the CCPA/CPRA experience; every other state (and a US
    // visitor whose state could not be resolved) gets the standard US notice.
    // The country is known, so a foreign regime must never be applied here.
    return area.region === "CA" ? "ccpa" : "standard";
  }
  return COUNTRY_REGIMES[area.country] ?? "standard";
}

/**
 * When no location could be established at all, show the neutral standard
 * notice. Optional categories stay off until the visitor chooses, so this is
 * still privacy-protective, but no jurisdiction-specific banner (GDPR, CCPA…)
 * is forced on someone who may not be covered by it.
 */
export function protectiveConsentRegime(regime: ServerConsentRegime): ConsentRegime {
  return regime === "unknown" ? "standard" : regime;
}

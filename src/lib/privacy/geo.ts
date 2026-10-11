import { createHmac, timingSafeEqual } from "node:crypto";

export interface GeoConfiguration {
  provider?: string;
  signingSecret?: string;
}

export interface PrivacyArea {
  country: string;
  region: string | null;
}

function normalizeCountry(value: string | null): string | null {
  const country = value?.trim().toUpperCase();
  return country && /^[A-Z]{2}$/.test(country) && !["XX", "ZZ", "EU"].includes(country) ? country : null;
}

function normalizeRegion(value: string | null): string | null {
  const region = value?.trim().toUpperCase();
  return region && /^[A-Z]{2,3}$/.test(region) ? region : null;
}

function signaturesMatch(expected: Buffer, signature: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;
  const supplied = Buffer.from(signature, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

function signedPayload(
  headers: Pick<Headers, "get">,
  secret: string,
  now: number,
): { country: string; region: string | null } | null {
  const country = normalizeCountry(headers.get("x-privacy-geo-country"));
  const timestamp = headers.get("x-privacy-geo-timestamp") ?? "";
  const signature = headers.get("x-privacy-geo-signature") ?? "";
  const region = normalizeRegion(headers.get("x-privacy-geo-region"));
  if (!country || !/^\d{13}$/.test(timestamp)) return null;
  if (Math.abs(now - Number(timestamp)) > 5 * 60_000) return null;
  if (region) {
    const withRegion = createHmac("sha256", secret).update(`${country}.${region}.${timestamp}`).digest();
    if (signaturesMatch(withRegion, signature)) return { country, region };
  }
  const countryOnly = createHmac("sha256", secret).update(`${country}.${timestamp}`).digest();
  return signaturesMatch(countryOnly, signature) ? { country, region: null } : null;
}

/**
 * This is a server-side access decision, not a language preference. Only an
 * explicitly configured hosting edge (which must strip client-supplied geo
 * headers), or a short-lived HMAC assertion from a trusted gateway, is used.
 * Missing/invalid configuration and unknown location fail closed. Query params,
 * Accept-Language, localStorage and ordinary x-country headers never grant access.
 */
export function trustedPrivacyCountry(
  headers: Pick<Headers, "get">,
  config: GeoConfiguration = {
    provider: process.env.PRIVACY_GEO_PROVIDER,
    signingSecret: process.env.PRIVACY_GEO_SIGNING_SECRET,
  },
  now = Date.now(),
): string | null {
  return trustedPrivacyArea(headers, config, now)?.country ?? null;
}

export function trustedPrivacyArea(
  headers: Pick<Headers, "get">,
  config: GeoConfiguration = {
    provider: process.env.PRIVACY_GEO_PROVIDER,
    signingSecret: process.env.PRIVACY_GEO_SIGNING_SECRET,
  },
  now = Date.now(),
): PrivacyArea | null {
  if (config.provider === "cloudflare") {
    const country = normalizeCountry(headers.get("cf-ipcountry"));
    return country ? { country, region: normalizeRegion(headers.get("cf-region-code")) } : null;
  }
  if (config.provider === "vercel") {
    const country = normalizeCountry(headers.get("x-vercel-ip-country"));
    return country ? { country, region: normalizeRegion(headers.get("x-vercel-ip-country-region")) } : null;
  }
  if (config.provider !== "signed-header" || !config.signingSecret || config.signingSecret.length < 32) return null;
  return signedPayload(headers, config.signingSecret, now);
}

/** Browser preference controls on the choice page. Fail closed when location is unknown. */
export function browserPreferenceControlsVisible(
  headers: Pick<Headers, "get">,
  config?: GeoConfiguration,
  now?: number,
): boolean {
  const area = trustedPrivacyArea(headers, config, now);
  return area?.country === "US" && area.region === "CA";
}

export { PRIVACY_GEO_VARY } from "./constants";

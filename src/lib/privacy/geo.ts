import { createHmac, timingSafeEqual } from "node:crypto";
import { geoFromEdgeHeaders, resolvedGeoFromHeaders } from "./geo-resolver";

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
  return country && /^[A-Z]{2}$/.test(country) && !["XX", "ZZ", "EU", "T1"].includes(country) ? country : null;
}

function normalizeRegion(value: string | null): string | null {
  const region = value?.trim().toUpperCase().replace(/^[A-Z]{2}-/, "");
  return region && /^[A-Z0-9]{1,3}$/.test(region) ? region : null;
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
    provider: process.env.PRIVACY_GEO_PROVIDER ?? (process.env.VERCEL === "1" ? "vercel" : undefined),
    signingSecret: process.env.PRIVACY_GEO_SIGNING_SECRET,
  },
  now = Date.now(),
): string | null {
  return trustedPrivacyArea(headers, config, now)?.country ?? null;
}

export function trustedPrivacyArea(
  headers: Pick<Headers, "get">,
  config: GeoConfiguration = {
    provider: process.env.PRIVACY_GEO_PROVIDER ?? (process.env.VERCEL === "1" ? "vercel" : undefined),
    signingSecret: process.env.PRIVACY_GEO_SIGNING_SECRET,
  },
  now = Date.now(),
): PrivacyArea | null {
  // The proxy resolves the visitor's location once per request (edge headers
  // or a cached IP lookup) and injects it after stripping client copies.
  // That answer is authoritative for every provider mode.
  const resolved = resolvedGeoFromHeaders(headers);
  if (resolved) return { country: resolved.country, region: resolved.region };

  if (config.provider === "cloudflare") {
    const country = normalizeCountry(headers.get("cf-ipcountry"));
    return country ? { country, region: normalizeRegion(headers.get("cf-region-code")) } : null;
  }
  if (config.provider === "vercel") {
    const country = normalizeCountry(headers.get("x-vercel-ip-country"));
    return country ? { country, region: normalizeRegion(headers.get("x-vercel-ip-country-region")) } : null;
  }
  if (config.provider === "signed-header") {
    if (!config.signingSecret || config.signingSecret.length < 32) return null;
    return signedPayload(headers, config.signingSecret, now);
  }
  // "auto" (default): accept whichever hosting edge is in front of the app, and a
  // signed assertion when a secret is configured.
  const edge = geoFromEdgeHeaders(headers);
  if (edge) return { country: edge.country, region: edge.region };
  if (config.signingSecret && config.signingSecret.length >= 32) return signedPayload(headers, config.signingSecret, now);
  return null;
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

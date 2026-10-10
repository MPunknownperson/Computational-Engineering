import { createHmac, timingSafeEqual } from "node:crypto";

export interface GeoConfiguration {
  provider?: string;
  signingSecret?: string;
}

function normalizeCountry(value: string | null): string | null {
  const country = value?.trim().toUpperCase();
  return country && /^[A-Z]{2}$/.test(country) && !["XX", "ZZ", "EU"].includes(country) ? country : null;
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
  if (config.provider === "cloudflare") return normalizeCountry(headers.get("cf-ipcountry"));
  if (config.provider === "vercel") return normalizeCountry(headers.get("x-vercel-ip-country"));
  if (config.provider !== "signed-header" || !config.signingSecret || config.signingSecret.length < 32) return null;

  const country = normalizeCountry(headers.get("x-privacy-geo-country"));
  const timestamp = headers.get("x-privacy-geo-timestamp") ?? "";
  const signature = headers.get("x-privacy-geo-signature") ?? "";
  if (!country || !/^\d{13}$/.test(timestamp) || !/^[a-f0-9]{64}$/.test(signature)) return null;
  if (Math.abs(now - Number(timestamp)) > 5 * 60_000) return null;
  const expected = createHmac("sha256", config.signingSecret).update(`${country}.${timestamp}`).digest();
  const supplied = Buffer.from(signature, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied) ? country : null;
}

export const PRIVACY_GEO_VARY = "cf-ipcountry, x-vercel-ip-country, x-privacy-geo-country, x-privacy-geo-timestamp, x-privacy-geo-signature";

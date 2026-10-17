import "server-only";
import { trustedPrivacyArea, type PrivacyArea } from "./geo";

const EDGE_LOCATIONS = [
  ["cf-ipcountry", "cf-region-code"],
  ["x-vercel-ip-country", "x-vercel-ip-country-region"],
  ["cloudfront-viewer-country", "cloudfront-viewer-country-region"],
  ["x-appengine-country", "x-appengine-region"],
  ["fastly-client-country", "fastly-client-region"],
  ["fly-client-country", "fly-client-region"],
] as const;

/**
 * Location hints choose a consent PRESENTATION only. They never grant access to
 * private routes or legal supplements. Those still use trustedPrivacyArea.
 * Reverse proxies should overwrite their own geo headers, not forward clients'.
 * No IP lookup, third-party request, GPS permission, or location storage is used.
 */
export function consentAreaFromHeaders(headers: Pick<Headers, "get">): PrivacyArea | null {
  const trusted = trustedPrivacyArea(headers);
  if (trusted) return trusted;
  // An explicitly configured signed/edge policy must not be bypassed with a hint.
  if (process.env.PRIVACY_GEO_PROVIDER) return null;
  for (const [countryHeader, regionHeader] of EDGE_LOCATIONS) {
    const country = headers.get(countryHeader)?.trim().toUpperCase();
    if (!country || !/^[A-Z]{2}$/.test(country) || ["XX", "ZZ", "EU", "T1"].includes(country)) continue;
    const subdivision = headers.get(regionHeader)?.trim().toUpperCase().replace(new RegExp(`^${country}-`), "");
    return { country, region: subdivision && /^[A-Z0-9]{1,3}$/.test(subdivision) ? subdivision : null };
  }
  return null;
}

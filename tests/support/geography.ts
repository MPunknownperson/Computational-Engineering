import { createHmac } from "node:crypto";
import { config } from "dotenv";

config({ quiet: true });

/** Integration-test assertions, signed using the server-only local environment secret. */
export function trustedGeoHeaders(country: string, region?: string): Record<string, string> {
  const secret = process.env.PRIVACY_GEO_SIGNING_SECRET;
  if (!secret) throw new Error("Geography integration tests need a configured gateway signing secret.");
  const timestamp = String(Date.now());
  const payload = region ? `${country}.${region}.${timestamp}` : `${country}.${timestamp}`;
  return {
    "x-privacy-geo-country": country,
    ...(region ? { "x-privacy-geo-region": region } : {}),
    "x-privacy-geo-timestamp": timestamp,
    "x-privacy-geo-signature": createHmac("sha256", secret).update(payload).digest("hex"),
  };
}

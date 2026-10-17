import "server-only";
import { trustedPrivacyArea, type PrivacyArea } from "./geo";

/**
 * Consent and restricted pages share the same trusted location source.
 * A configured edge must overwrite incoming geo headers; a trusted gateway can
 * instead supply a short-lived signed assertion. Unverified headers, cookies,
 * query parameters, locale and timezone never establish location.
 */
export function consentAreaFromHeaders(headers: Pick<Headers, "get">): PrivacyArea | null {
  return trustedPrivacyArea(headers);
}

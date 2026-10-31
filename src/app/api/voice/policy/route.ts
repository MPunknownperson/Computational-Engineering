import { NextResponse } from "next/server";
import { trustedPrivacyCountry } from "@/lib/privacy/geo";
import { resolveVisitorGeo } from "@/lib/privacy/geo-resolver";
import { PRIVACY_GEO_VARY } from "@/lib/privacy/constants";
import { parseRegionOverrides, regionRule } from "@/lib/voice/policy";

export const dynamic = "force-dynamic";

/** Geography comes from the same configured trust boundary as regional pages. */
export async function GET(request: Request) {
  // The proxy normally injects the resolved location; fall back to resolving
  // it here (edge headers, then a cached IP lookup) so the answer never
  // depends on which path the request took.
  const geo = await resolveVisitorGeo(request.headers);
  const country = geo?.country ?? trustedPrivacyCountry(request.headers);
  const overrides = parseRegionOverrides(process.env.VOICE_REGION_POLICY);
  return NextResponse.json({
    country,
    region: geo?.region ?? null,
    source: geo?.source ?? (country ? "trusted-gateway" : null),
    rule: regionRule(country, overrides),
    overrides,
  }, { headers: { "Cache-Control": "private, no-store", Vary: PRIVACY_GEO_VARY } });
}

import { NextResponse } from "next/server";
import { trustedPrivacyCountry } from "@/lib/privacy/geo";
import { PRIVACY_GEO_VARY } from "@/lib/privacy/constants";
import { parseRegionOverrides, regionRule } from "@/lib/voice/policy";

export const dynamic = "force-dynamic";

/** Geography comes from the same configured trust boundary as regional pages. */
export async function GET(request: Request) {
  const country = trustedPrivacyCountry(request.headers);
  const overrides = parseRegionOverrides(process.env.VOICE_REGION_POLICY);
  return NextResponse.json({
    country,
    source: country ? "trusted-gateway" : null,
    rule: regionRule(country, overrides),
    overrides,
  }, { headers: { "Cache-Control": "private, no-store", Vary: PRIVACY_GEO_VARY } });
}

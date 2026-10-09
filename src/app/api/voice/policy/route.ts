import { NextResponse } from "next/server";
import { normalizeRegion, parseRegionOverrides, regionRule } from "@/lib/voice/policy";

export const dynamic = "force-dynamic";

/** Country headers set by common CDNs / hosting edges, most specific first. */
const GEO_HEADERS = [
  "cf-ipcountry",
  "x-vercel-ip-country",
  "cloudfront-viewer-country",
  "x-appengine-country",
  "fastly-client-country",
  "x-country-code",
  "x-geo-country",
];

/**
 * Returns the visitor's country (from the hosting edge, never stored) and the
 * voice availability rule that applies to it. The client combines this with
 * device and browser capabilities to pick local, cloud or no processing.
 */
export async function GET(request: Request) {
  let country: string | null = null;
  let source: string | null = null;
  for (const header of GEO_HEADERS) {
    const value = normalizeRegion(request.headers.get(header));
    if (value) {
      country = value;
      source = header;
      break;
    }
  }
  const overrides = parseRegionOverrides(process.env.VOICE_REGION_POLICY);
  return NextResponse.json(
    {
      country,
      source,
      rule: country ? regionRule(country, overrides) : null,
      overrides,
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}

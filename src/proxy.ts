import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { trustedPrivacyCountry, PRIVACY_GEO_VARY } from "@/lib/privacy/geo";
import { privacyRegion, REGIONAL_PRIVACY_PREFIX } from "@/lib/privacy/regions";
import { PRIVACY_COOKIE_SECONDS, PRIVACY_OPTOUT_COOKIE } from "@/lib/privacy/constants";

const PRIVATE_API_PREFIX = "/api/workbench/";
const PAGE_TONES: Array<[string, string]> = [
  ["/", "home"], ["/tools/calculator", "ink"], ["/tools/scientific", "indigo"],
  ["/tools/units", "teal"], ["/tools/currency", "terra"], ["/tools/crypto", "violet"],
  ["/tools/formula", "rose"], ["/tools/economy", "green"], ["/calculators", "ink"],
  ["/convert", "teal"], ["/calculate", "indigo"], ["/reference", "terra"],
  ["/guides", "blue"], ["/about", "warm"], ["/contact", "warm"],
  ["/accessibility", "warm"], ["/privacy", "slate"], ["/do-not-sell-or-share", "slate"],
  ["/terms", "slate"], ["/disclaimer", "slate"],
];

function toneForPathname(pathname: string): string {
  return PAGE_TONES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? "home";
}

/** Denied responses contain no regional clauses, including for RSC/prefetch/HEAD. */
function regionalDenial(status: 403 | 404): NextResponse {
  const title = status === 403 ? "Regional privacy supplement unavailable" : "Privacy supplement not found";
  return new NextResponse(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title} | Radix Loom</title></head><body style="margin:0;background:#f2f3f6;color:#172033;font:16px/1.65 system-ui,sans-serif"><main style="max-width:680px;margin:12vh auto;padding:28px"><p>Radix Loom · Privacy</p><h1>${title}</h1><p>This regional page is available only when our trusted hosting connection identifies the corresponding country. Your location may be unknown or affected by a VPN or proxy. We do not request precise device location.</p><p>This restriction does not determine your legal rights. The full Privacy Policy, its GDPR and CCPA sections, and the opt-out controls remain available to everyone. Contact us if you need a regional copy or want to exercise your rights while travelling.</p><p><a href="/privacy">Read the Privacy Policy</a> · <a href="/do-not-sell-or-share">Do Not Sell or Share My Personal Information</a> · <a href="/contact">Contact us</a></p></main></body></html>`, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex, nofollow, noarchive",
      "x-content-type-options": "nosniff",
      vary: PRIVACY_GEO_VARY,
    },
  });
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith(PRIVATE_API_PREFIX)) {
    const expected = process.env.WORKBENCH_API_KEY;
    const supplied = (request.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i)?.[1] ?? "";
    if (!expected || Buffer.byteLength(expected, "utf8") < 32) return hiddenResponse();
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(supplied, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return hiddenResponse();
    return NextResponse.next();
  }

  if (pathname.startsWith(REGIONAL_PRIVACY_PREFIX)) {
    const slug = pathname.slice(REGIONAL_PRIVACY_PREFIX.length).replace(/\/$/, "");
    const region = privacyRegion(slug);
    if (!region) return regionalDenial(404);
    if (trustedPrivacyCountry(request.headers) !== region.country) return regionalDenial(403);
  }

  // Supply this to the server layout as a REQUEST header, overriding spoofed input.
  const requestHeaders = new Headers(request.headers);
  const tone = toneForPathname(pathname);
  requestHeaders.set("x-page-tone", tone);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-page-tone", tone);

  if (pathname === "/privacy" || pathname.startsWith(REGIONAL_PRIVACY_PREFIX) || pathname === "/do-not-sell-or-share") {
    response.headers.set("cache-control", "private, no-store");
    response.headers.append("vary", `${PRIVACY_GEO_VARY}, Cookie, Sec-GPC`);
    if (pathname.startsWith(REGIONAL_PRIVACY_PREFIX)) response.headers.set("x-robots-tag", "noindex, nofollow, noarchive");
  }

  // A non-identifying, restrictive preference. No login, location check or
  // consent challenge is needed to honor GPC; it can never enable tracking.
  if (request.headers.get("sec-gpc") === "1") {
    response.cookies.set(PRIVACY_OPTOUT_COOKIE, "1", {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: PRIVACY_COOKIE_SECONDS,
    });
    response.headers.set("cache-control", "private, no-store");
    response.headers.append("vary", "Sec-GPC");
  }
  return response;
}

function hiddenResponse() {
  return new NextResponse(null, { status: 404, headers: {
    "cache-control": "no-store", "x-content-type-options": "nosniff",
    "x-robots-tag": "noindex, nofollow, noarchive",
  } });
}

export const config = {
  matcher: ["/api/workbench/:path*", "/((?!api|_next|_not-found|media|icons|favicon\\.svg|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|indexnow\\.txt).*)"],
};

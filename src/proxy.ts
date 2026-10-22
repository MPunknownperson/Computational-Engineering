import { NextResponse, type NextRequest } from "next/server";
import { hasAdminKey } from "@/lib/admin-key";
import { missingPageResponse } from "@/lib/not-found-response";
import { pageDisposition } from "@/lib/public-routes";
import { privacyRegion } from "@/lib/privacy/regions";
import { trustedPrivacyCountry } from "@/lib/privacy/geo";
import { PRIVACY_COOKIE_SECONDS, PRIVACY_GEO_VARY, PRIVACY_OPTOUT_COOKIE } from "@/lib/privacy/constants";
import { applyResolvedGeo, resolveVisitorGeo } from "@/lib/privacy/geo-resolver";

// Operator-only backend surfaces: the workbench (shell, archives, tool
// installation, code engine) and the NLU regression replay, which writes to
// the database. All of them answer 404 without a valid bearer key.
const PRIVATE_API_PREFIXES = ["/api/workbench/", "/api/nlu/replay"];
const PAGE_TONES: Array<[string, string]> = [
  ["/", "home"], ["/tools/calculator", "ink"], ["/tools/scientific", "indigo"],
  ["/tools/units", "teal"], ["/tools/currency", "terra"], ["/tools/crypto", "violet"],
  ["/tools/formula", "rose"], ["/tools/economy", "green"], ["/calculators", "ink"],
  ["/convert", "teal"], ["/calculate", "indigo"], ["/reference", "terra"],
  ["/guides", "blue"], ["/about", "warm"], ["/contact", "warm"],
  ["/accessibility", "warm"], ["/privacy", "slate"], ["/do-not-sell-or-share", "slate"],
  ["/terms", "slate"], ["/disclaimer", "slate"], ["/system", "slate"],
];

function toneForPathname(pathname: string): string {
  return PAGE_TONES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? "home";
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (PRIVATE_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
    if (!hasAdminKey(request)) return hiddenResponse();
    return NextResponse.next();
  }

  // Resolve the visitor's country/region once per request from the hosting
  // edge or a cached IP lookup, and pass it on as a trusted request header.
  // Client-supplied copies of the internal header are discarded first.
  const requestHeaders = new Headers(request.headers);
  applyResolvedGeo(requestHeaders, null);
  const geo = await resolveVisitorGeo(requestHeaders);
  applyResolvedGeo(requestHeaders, geo);

  if (pathname.startsWith("/api/")) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // These intentional private pages are not part of the public SEO catalog.
  // Gate document, HEAD and RSC requests before any content can be streamed.
  const regionalMatch = pathname.match(/^\/privacy\/regions\/([^/]+)\/?$/);
  const regional = regionalMatch ? privacyRegion(regionalMatch[1]) : undefined;
  if (regionalMatch && !regional) return missingPageResponse();
  if (regional && trustedPrivacyCountry(requestHeaders) !== regional.country) {
    return new NextResponse("This privacy supplement is unavailable for this location. Visit /privacy or /contact for assistance.", {
      status: 403,
      headers: {
        "content-type": "text/plain; charset=utf-8", "cache-control": "private, no-store",
        "x-robots-tag": "noindex, nofollow, noarchive", "vary": PRIVACY_GEO_VARY,
      },
    });
  }

  // Unknown pages must be HTTP 404 before the App Router streams a 200
  // not-found shell. A non-flight 404 also forces the client router into a
  // real document navigation instead of a soft "page not found" on status 200.
  if (!regional && pageDisposition(pathname) === "missing") return missingPageResponse();

  // Supply this to the server layout as a REQUEST header, overriding spoofed input.
  const tone = toneForPathname(pathname);
  requestHeaders.set("x-page-tone", tone);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-page-tone", tone);

  if (regional || pathname === "/privacy" || pathname === "/do-not-sell-or-share") {
    response.headers.set("cache-control", "private, no-store");
    if (regional) response.headers.set("x-robots-tag", "noindex, nofollow, noarchive");
    response.headers.append("vary", `Cookie, Sec-GPC, ${PRIVACY_GEO_VARY}`);
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
  matcher: ["/api/workbench/:path*", "/api/nlu/:path*", "/api/voice/:path*", "/api/privacy/:path*", "/((?!api|_next|_not-found|media|images|icons|vendor|favicon\\.svg|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|indexnow\\.txt|sw\\.js|sw\\.js\\.map|workbox-.*\\.js).*)"],
};

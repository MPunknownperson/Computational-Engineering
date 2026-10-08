import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

const PRIVATE_API_PREFIX = "/api/workbench/";

/**
 * The sandbox/runtime APIs are administrative infrastructure, not public
 * product routes. A high-entropy server-only secret must be configured before
 * any route under /api/workbench is reachable. This keeps shell execution,
 * package installation, file writes and project scaffolding out of the public
 * Radix Loom application surface.
 */
export function proxy(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith(PRIVATE_API_PREFIX)) {
    return NextResponse.next();
  }

  const expected = process.env.WORKBENCH_API_KEY;
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.match(/^Bearer\s+(.+)$/i)?.[1] ?? "";

  // Fail closed when no strong key is configured. Return a bland 404 so the
  // private maintenance API is not advertised by its response behavior.
  if (!expected || Buffer.byteLength(expected, "utf8") < 32) {
    return hiddenResponse();
  }

  const expectedBytes = Buffer.from(expected, "utf8");
  const suppliedBytes = Buffer.from(supplied, "utf8");
  const valid =
    expectedBytes.length === suppliedBytes.length &&
    timingSafeEqual(expectedBytes, suppliedBytes);

  if (!valid) return hiddenResponse();
  return NextResponse.next();
}

function hiddenResponse() {
  return new NextResponse(null, {
    status: 404,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex, nofollow, noarchive",
    },
  });
}

export const config = {
  matcher: ["/api/workbench/:path*"],
};

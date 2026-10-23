import { NextResponse, type NextRequest } from "next/server";
import { readFeedPage } from "@/lib/native/server-feed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Paginated feed consumed by the native shell's infinite scroll and
 * pull-to-refresh. The PWA is online-only, so this response is never cached.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const rawCursor = params.get("cursor");
  const cursor = rawCursor && /^\d+$/.test(rawCursor) ? Number(rawCursor) : null;
  const limit = Number(params.get("limit") ?? 6);
  const category = params.get("category");

  const page = await readFeedPage(cursor, Number.isFinite(limit) ? limit : 6, category);
  return NextResponse.json(
    { ...page, servedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

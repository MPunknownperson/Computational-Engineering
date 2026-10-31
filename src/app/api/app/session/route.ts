import { NextResponse, type NextRequest } from "next/server";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Connectivity probe for the online-only gate. The shell pings this before it
 * renders; a failure means the device genuinely cannot reach the origin, which
 * this app treats as a hard stop rather than falling back to a cache.
 */
export async function GET() {
  return NextResponse.json(
    { online: true, serverTime: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Persists native shell preferences (engine, visual mode, haptics). */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      deviceId?: string;
      engine?: string;
      mode?: string;
      haptics?: boolean;
      platform?: string;
    };
    const deviceId = body.deviceId?.trim();
    if (!deviceId) return NextResponse.json({ ok: false }, { status: 400 });

    const engine = ["auto", "ionic", "framework7"].includes(body.engine ?? "") ? body.engine! : "auto";
    const mode = ["auto", "ios", "md"].includes(body.mode ?? "") ? body.mode! : "auto";
    const values = {
      deviceId,
      engine,
      mode,
      haptics: body.haptics !== false,
      platform: body.platform ?? "web",
      updatedAt: new Date(),
    };

    store.appPrefs.upsert((row) => row.deviceId === deviceId, () => values, values);

    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEVICE_COOKIE = "rl_device";

/** Items this device received through the OS share sheet. */
export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get("deviceId") || "anonymous";
  const cookieDevice = request.cookies.get(DEVICE_COOKIE)?.value;

  try {
    const rows = store.sharedItems
      .list((row) => row.deviceId === deviceId || (!!cookieDevice && row.deviceId === cookieDevice))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 50);

    const response = NextResponse.json({ items: rows }, { headers: { "Cache-Control": "no-store" } });
    // Bind the browser-generated device id to a cookie so share POSTs (which
    // carry no JavaScript context) land in the same bucket.
    if (deviceId !== "anonymous" && cookieDevice !== deviceId) {
      response.cookies.set(DEVICE_COOKIE, deviceId, {
        httpOnly: true,
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return response;
  } catch {
    return NextResponse.json({ items: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}

/** Removes one shared item, or clears the whole inbox for the device. */
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const deviceId = request.nextUrl.searchParams.get("deviceId") || "anonymous";
  try {
    if (id) {
      store.sharedItems.remove((row) => row.id === id && row.deviceId === deviceId);
    } else {
      store.sharedItems.remove((row) => row.deviceId === deviceId);
    }
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { privacyChoiceStatus, savePrivacyOptOut } from "@/lib/privacy/choices";
import { PRIVACY_CHOICE_COOKIE, PRIVACY_COOKIE_SECONDS, PRIVACY_OPTOUT_COOKIE, PRIVACY_CHOICES_PATH } from "@/lib/privacy/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const HEADERS = { "Cache-Control": "private, no-store", Vary: "Cookie, Sec-GPC" };

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json(await privacyChoiceStatus(request.headers, request.cookies), { headers: HEADERS });
  } catch {
    return NextResponse.json({ error: "We could not read the saved preference. Please try again." }, { status: 503, headers: HEADERS });
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && !sameOrigin(origin, request))) {
    return NextResponse.json({ error: "Please submit this choice from this website." }, { status: 403, headers: HEADERS });
  }
  const formRequest = (request.headers.get("content-type") ?? "").startsWith("application/x-www-form-urlencoded");
  try {
    const text = await request.text();
    if (text.length > 2048) return NextResponse.json({ error: "Request too large." }, { status: 413, headers: HEADERS });
    const body = formRequest ? Object.fromEntries(new URLSearchParams(text)) : JSON.parse(text) as { action?: unknown; source?: unknown };
    if (!body || typeof body !== "object" || body.action !== "opt-out") {
      return NextResponse.json({ error: "Choose opt-out to save your preference." }, { status: 400, headers: HEADERS });
    }
    const gpc = request.headers.get("sec-gpc") === "1" || body.source === "gpc";
    const choice = await savePrivacyOptOut(request.cookies, gpc ? "gpc" : "manual");
    const response = formRequest
      ? new NextResponse(null, { status: 303, headers: { ...HEADERS, Location: `${PRIVACY_CHOICES_PATH}?saved=1` } })
      : NextResponse.json({
          optedOut: true, stored: true, globalPrivacyControl: gpc, source: choice.source,
          updatedAt: choice.updatedAt.toISOString(), saleOrSharingEnabled: false,
        }, { headers: HEADERS });
    const options = {
      httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: PRIVACY_COOKIE_SECONDS,
    };
    response.cookies.set(PRIVACY_CHOICE_COOKIE, choice.id, options);
    response.cookies.set(PRIVACY_OPTOUT_COOKIE, "1", options);
    return response;
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid request." }, { status: 400, headers: HEADERS });
    if (formRequest) return new NextResponse(null, { status: 303, headers: { ...HEADERS, Location: `${PRIVACY_CHOICES_PATH}?error=1` } });
    return NextResponse.json({ error: "Your preference was not saved. Please retry; we still do not sell or share personal information." }, { status: 503, headers: HEADERS });
  }
}

function sameOrigin(origin: string, request: NextRequest): boolean {
  try { return new URL(origin).host === request.headers.get("host"); }
  catch { return false; }
}

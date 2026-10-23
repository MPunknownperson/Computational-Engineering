import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { sharedItems } from "@/db/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEVICE_COOKIE = "rl_device";

/**
 * Classifies an incoming share so the app can open the right screen instead of
 * dumping raw text on the user — the behaviour people expect from a native
 * share extension.
 */
function classify(text: string, url: string | null): { kind: string; parsed: Record<string, unknown> } {
  const value = text.trim();
  if (url) return { kind: "link", parsed: { url } };
  if (!value) return { kind: "text", parsed: {} };

  const urlMatch = value.match(/https?:\/\/\S+/i);
  if (urlMatch) return { kind: "link", parsed: { url: urlMatch[0] } };

  // "12 km to miles" style unit conversions.
  const conversion = value.match(/^\s*(-?[\d.]+)\s*([a-zA-Z°µ]+)\s+(?:to|in|->)\s+([a-zA-Z°µ]+)\s*$/);
  if (conversion) {
    return {
      kind: "conversion",
      parsed: { value: Number(conversion[1]), from: conversion[2], to: conversion[3] },
    };
  }

  // Anything that is only maths characters is treated as an expression.
  if (/^[\d\s+\-*/^().,%eE]+$/.test(value) && /[\d]/.test(value)) {
    return { kind: "expression", parsed: { expression: value } };
  }
  return { kind: "text", parsed: { text: value } };
}

async function persist(request: NextRequest, title: string | null, text: string | null, url: string | null) {
  const deviceId = request.cookies.get(DEVICE_COOKIE)?.value || "anonymous";
  const { kind, parsed } = classify(text ?? "", url);
  const platform = /Android/i.test(request.headers.get("user-agent") ?? "")
    ? "android"
    : /iPhone|iPad|iPod/i.test(request.headers.get("user-agent") ?? "")
      ? "ios"
      : "web";
  try {
    const [row] = await db
      .insert(sharedItems)
      .values({ deviceId, title, body: text, url, kind, parsed, platform })
      .returning({ id: sharedItems.id });
    return row?.id ?? null;
  } catch {
    return null;
  }
}

/** Web Share Target (POST / multipart) — the system "Share to…" entry point. */
export async function POST(request: NextRequest) {
  let title: string | null = null;
  let text: string | null = null;
  let url: string | null = null;

  try {
    const form = await request.formData();
    const read = (key: string) => {
      const v = form.get(key);
      return typeof v === "string" && v.length > 0 ? v : null;
    };
    title = read("title");
    text = read("text");
    url = read("url");
  } catch {
    // Some platforms send urlencoded bodies instead of multipart.
    try {
      const params = new URLSearchParams(await request.text());
      title = params.get("title");
      text = params.get("text");
      url = params.get("url");
    } catch {
      /* give up and record an empty share */
    }
  }

  const id = await persist(request, title, text, url);
  const target = new URL("/app/shared", request.nextUrl.origin);
  if (id) target.searchParams.set("id", id);
  // 303 converts the POST into a GET so the shell loads normally.
  return NextResponse.redirect(target, 303);
}

/** GET variant for platforms configured with a query-string share target. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const title = params.get("title");
  const text = params.get("text");
  const url = params.get("url");
  if (!title && !text && !url) {
    return NextResponse.redirect(new URL("/app/shared", request.nextUrl.origin), 302);
  }
  const id = await persist(request, title, text, url);
  const target = new URL("/app/shared", request.nextUrl.origin);
  if (id) target.searchParams.set("id", id);
  return NextResponse.redirect(target, 303);
}

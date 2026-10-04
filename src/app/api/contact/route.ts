import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { CONTACT_LIMITS as L, CONTACT_TOPICS } from "@/lib/catalog";
import { verifyTurnstile } from "@/lib/turnstile";

const TOPICS: readonly string[] = CONTACT_TOPICS.map((t) => t.value);

// In-memory, per-process rate limit. The IP is used only as a transient map
// key and is never written to the database or to application logs.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > L.perIpPerHour;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: real users never see or fill this field.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const topic = TOPICS.includes(body.topic) ? (body.topic as string) : "general";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, L.name) : "";
  const email = typeof body.email === "string" ? body.email.trim().slice(0, L.email) : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (message.length < L.minMessage) {
    return NextResponse.json({ error: `Please write at least ${L.minMessage} characters.` }, { status: 400 });
  }
  if (message.length > L.message) {
    return NextResponse.json({ error: `Please keep your message under ${L.message} characters.` }, { status: 400 });
  }
  if (email && !EMAIL.test(email)) {
    return NextResponse.json({ error: "That e-mail address does not look valid." }, { status: 400 });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
  if (limited(ip)) {
    return NextResponse.json({ error: "Too many messages — please try again later." }, { status: 429 });
  }

  // Opt-in bot check. With no keys configured this returns {skipped:true} and
  // nothing changes; with keys it verifies the Turnstile token before saving.
  const human = await verifyTurnstile(typeof body.turnstile === "string" ? body.turnstile : undefined);
  if (!human.ok) return NextResponse.json({ error: human.error }, { status: 400 });

  await db.insert(contactMessages).values({
    topic,
    name: name || null,
    email: email || null,
    message,
  });

  return NextResponse.json({ ok: true });
}

"use client";

import { decode, encode, type Program } from "@/lib/voice/ir";

/**
 * The last verified command is short-lived browser session state, not a voice
 * recording. It enables practical follow-ups after auto-navigation: a visitor
 * can return to Calculators and say “and 80” or “again” without restating the
 * currency/unit direction. Closing the tab clears it; it is never uploaded.
 */
const KEY = "radixloom.voice-session.v1";
const TTL_MS = 20 * 60 * 1000;

type Stored = { encoded: string; expiresAt: number };

function store(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveVoiceSession(program: Program) {
  const target = store();
  if (!target) return;
  try {
    const value: Stored = { encoded: encode(program), expiresAt: Date.now() + TTL_MS };
    target.setItem(KEY, JSON.stringify(value));
  } catch {
    /* browser storage can be unavailable in privacy modes */
  }
}

export function loadVoiceSession(): Program | null {
  const target = store();
  if (!target) return null;
  try {
    const raw = target.getItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<Stored>;
    if (typeof value.encoded !== "string" || typeof value.expiresAt !== "number" || value.expiresAt < Date.now()) {
      target.removeItem(KEY);
      return null;
    }
    const decoded = decode(value.encoded);
    return "program" in decoded ? decoded.program : null;
  } catch {
    return null;
  }
}

export function clearVoiceSession() {
  try {
    store()?.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

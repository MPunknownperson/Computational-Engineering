/**
 * Lightweight helper for OS- and browser-level APIs that are often overlooked.
 *
 * Speech recognition:
 *   Chrome's default implementation sends the user's microphone audio to
 *   Google's cloud speech service for processing. Safari sends to Apple.
 *   The newer `processLocally` option (Chrome 139+, Edge) downloads a small
 *   language model to the device so audio never leaves it. This module
 *   requests that option whenever the browser supports it. Whether it
 *   succeeds depends on the browser and whether the user has downloaded the
 *   language pack.
 *
 * Vibration:
 *   The Vibration API provides haptic feedback on Android, and on some
 *   desktop devices through the OS's input settings. Safari does not
 *   support it.
 */

/** Does the browser support the Screen Wake Lock API? */
export function hasWakeLock(): boolean {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

/** Does the browser support the Web Share API? */
export function hasShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/** Does the browser expose a vibration engine? */
export function hasVibration(): boolean {
  return typeof navigator !== "undefined" && "vibrate" in navigator;
}

/** The WakeLockSentinel is the token returned by navigator.wakeLock.request(). */
export type WakeLockSentinelLike = { release(): Promise<void>; released: boolean; addEventListener(t: "release", cb: () => void): void };

/** Fire-and-forget haptic feedback. Silently ignored where unavailable. */
export function vibrate(pattern: number | number[]) {
  if (!hasVibration()) return;
  try {
    (navigator as unknown as { vibrate: (p: number | number[]) => boolean }).vibrate(pattern);
  } catch {
    /* vibration not available or page not user-activated */
  }
}

/**
 * SpeechRecognition type: the W3C spec + Chrome's processLocally extension.
 * We request processLocally when available so that, where the browser
 * supports it, audio is transcribed on-device rather than being streamed
 * to a third-party server. Whether that succeeds is not under our control.
 */
export type SpeechAvailability = "on-device" | "cloud" | "unavailable";

export function speechRecognitionAvailability(): SpeechAvailability {
  if (typeof window === "undefined") return "unavailable";
  const ctor =
    (window as unknown as Record<string, unknown>)["SpeechRecognition"] ??
    (window as unknown as Record<string, unknown>)["webkitSpeechRecognition"];
  if (!ctor) return "unavailable";
  // We cannot determine at call time whether on-device models are
  // installed; assume cloud is available and let the browser pick the
  // best path. When processLocally is set, Chrome 139+ will use the
  // local model where it is available and fall back to cloud otherwise.
  return "cloud";
}

export type RecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  processLocally?: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

/** Create a SpeechRecognition with processLocally preferred. */
export function createRecognition(lang?: string): RecognitionInstance | null {
  const ctor =
    (window as unknown as Record<string, unknown>)["SpeechRecognition"] ??
    (window as unknown as Record<string, unknown>)["webkitSpeechRecognition"];
  if (!ctor) return null;
  const recognition = new (ctor as new () => RecognitionInstance)();
  recognition.lang = lang || navigator.language || "en-US";
  recognition.interimResults = true;
  recognition.continuous = false;
  // Prefer on-device processing where the browser supports it.
  // If the language model is not downloaded, the browser either downloads
  // it or falls back to cloud processing — we cannot force one path.
  (recognition as unknown as { processLocally: boolean }).processLocally = true;
  return recognition;
}
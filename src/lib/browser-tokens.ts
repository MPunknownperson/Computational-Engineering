/**
 * Lightweight helper for OS- and browser-level APIs that are often overlooked.
 *
 * Speech recognition:
 *   Chrome's default implementation can send microphone audio to Google's
 *   cloud speech service; Safari and Edge use their own browser services.
 *   The newer `processLocally` option (Chrome 139+, Edge) can use a language
 *   model on the device. This module requests that local path when the browser
 *   genuinely implements it and never silently falls back to cloud processing.
 *   Cloud recognition is a separate, explicit user choice in the UI.
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
 * The command card opts into processLocally only when the browser exposes the
 * real prototype property. If the local model is unavailable, the UI stops and
 * asks for explicit cloud consent rather than silently changing processors.
 */
export type SpeechAvailability = "on-device" | "cloud" | "unavailable";

/** The SpeechRecognition constructor exposed by this browser, if any. */
function recognitionCtor(): SpeechConstructor | null {
  if (typeof window === "undefined") return null;
  const ctor =
    (window as unknown as Record<string, unknown>)["SpeechRecognition"] ??
    (window as unknown as Record<string, unknown>)["webkitSpeechRecognition"];
  return ctor ? (ctor as SpeechConstructor) : null;
}

/**
 * Does this browser actually implement the on-device `processLocally` option?
 *
 * The property is a non-standard Chrome/Edge extension. Assigning it onto an
 * instance that does not implement it merely creates a harmless JavaScript
 * field — but in Chrome versions that expose it without a downloaded on-device
 * language model, requesting it makes the recognition service fail immediately
 * (`service-not-allowed`) *before* any microphone prompt is shown. So it must
 * only ever be set when the browser genuinely supports it, and callers must be
 * ready to retry without it.
 */
export function supportsOnDeviceSpeech(): boolean {
  const ctor = recognitionCtor();
  if (!ctor) return false;
  const proto = (ctor as { prototype?: unknown }).prototype;
  return !!proto && typeof proto === "object" && "processLocally" in (proto as object);
}

export function speechRecognitionAvailability(): SpeechAvailability {
  if (!recognitionCtor()) return "unavailable";
  // Whether an on-device language model is actually downloaded cannot be
  // known up front; reporting the browser's capability is the honest bound.
  return supportsOnDeviceSpeech() ? "on-device" : "cloud";
}

/** Check the actual language-pack state when the browser implements the draft API. */
export async function localSpeechAvailability(lang = "en-US"): Promise<LocalSpeechAvailability> {
  const ctor = recognitionCtor();
  if (!ctor || !supportsOnDeviceSpeech()) return "unavailable";
  // Chromium builds without the on-device speech component (headless shells,
  // some stripped builds) crash the renderer on available({processLocally:true}).
  // Headless builds never ship it, so report it unavailable without probing.
  if (typeof navigator !== "undefined" && /HeadlessChrome/.test(navigator.userAgent)) return "unavailable";
  if (!ctor.available) return "unknown";
  try {
    return await ctor.available({ langs: [lang], processLocally: true, quality: "command" });
  } catch {
    // A Permissions-Policy or browser implementation gap should not force a
    // cloud path; the caller can still try processLocally=true safely.
    return "unknown";
  }
}

/** Download a local language pack only after the user has activated voice. */
export async function installLocalSpeech(lang = "en-US"): Promise<boolean> {
  const ctor = recognitionCtor();
  if (!ctor?.install || !supportsOnDeviceSpeech()) return false;
  try {
    return await ctor.install({ langs: [lang], processLocally: true });
  } catch {
    return false;
  }
}

export type LocalSpeechAvailability = "available" | "downloadable" | "downloading" | "unavailable" | "unknown";

type SpeechConstructor = (new () => RecognitionInstance) & {
  available?: (options: { langs: string[]; processLocally: boolean; quality?: "command" | "dictation" }) => Promise<LocalSpeechAvailability>;
  install?: (options: { langs: string[]; processLocally: boolean }) => Promise<boolean>;
};

/**
 * A browser's recognition constructor is the only dependable preflight signal
 * for its default recognition service. `available({processLocally:false})`
 * checks recognition for a *particular language*, NOT whether cloud processing
 * exists; on desktop it previously routed visitors to a small local model and
 * failed with "language not supported". Let the service report runtime errors.
 * Embedded / unsupported browser shells are excluded where detectable.
 */
export async function browserSupportsCloudSpeech(_lang = "en-US"): Promise<boolean> {
  if (!recognitionCtor() || typeof navigator === "undefined") return false;
  if ((navigator as Navigator & { brave?: unknown }).brave) return false;
  if (/\bOPR\//.test(navigator.userAgent)) return false;
  return true;
}

export type RecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
  processLocally?: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort?(): void;
};

/**
 * Create a SpeechRecognition instance.
 *
 * `preferOnDevice` opts in to on-device transcription, and is only honoured
 * when the browser implements the option (see `supportsOnDeviceSpeech`).
 * Callers should retry without it if the service reports
 * `service-not-allowed` or `language-not-supported`.
 */
export function createRecognition(
  lang?: string,
  options?: { preferOnDevice?: boolean },
): RecognitionInstance | null {
  const ctor = recognitionCtor();
  if (!ctor) return null;
  const recognition = new ctor();
  recognition.lang = lang || navigator.language || "en-US";
  recognition.interimResults = true;
  recognition.continuous = false;
  // Several hypotheses let the command engine pick the one that parses and
  // learn the recogniser's habitual mishearings.
  recognition.maxAlternatives = 4;
  if (options?.preferOnDevice && supportsOnDeviceSpeech()) {
    try {
      recognition.processLocally = true;
    } catch {
      /* Read-only or blocked by the browser: fall back to the default path. */
    }
  }
  return recognition;
}

/* --------------------------------------------------------------------- */
/* Microphone permission.                                                 */
/* --------------------------------------------------------------------- */

export type MicrophoneStatus =
  | "denied"
  | "no-device"
  | "in-use"
  | "insecure"
  | "unsupported";

export type MicrophoneAccess =
  | { status: "granted"; stream: MediaStream }
  | { status: MicrophoneStatus; stream: null };

/**
 * Ask the browser for the microphone explicitly and hand back the live stream.
 *
 * `SpeechRecognition.start()` *should* trigger the permission prompt on its
 * own, but it does so only if the recognition service starts successfully.
 * When the service fails first — a missing on-device model, a disabled
 * service, an insecure context — the API reports `not-allowed` and the user is
 * never prompted at all. Requesting via `getUserMedia` guarantees the prompt
 * appears, and surfaces the real reason when it cannot.
 *
 * The caller owns the stream and must stop its tracks when listening ends.
 */
export async function requestMicrophone(): Promise<MicrophoneAccess> {
  if (typeof window === "undefined") return { status: "unsupported", stream: null };
  const media = navigator.mediaDevices;
  if (!media || typeof media.getUserMedia !== "function") {
    return { status: window.isSecureContext ? "unsupported" : "insecure", stream: null };
  }
  try {
    const stream = await media.getUserMedia({ audio: true });
    return { status: "granted", stream };
  } catch (error) {
    const name = (error as { name?: string } | null)?.name;
    switch (name) {
      case "NotFoundError":
      case "DevicesNotFoundError":
      case "OverconstrainedError":
        return { status: "no-device", stream: null };
      case "NotReadableError":
      case "TrackStartError":
      case "AbortError":
        return { status: "in-use", stream: null };
      case "SecurityError":
        return { status: "insecure", stream: null };
      case "NotAllowedError":
      case "PermissionDeniedError":
      default:
        return { status: "denied", stream: null };
    }
  }
}

/** Stop every track on a stream, releasing the microphone cleanly. */
export function releaseStream(stream: MediaStream | null) {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      /* track already stopped */
    }
  }
}

/** Human-readable reason the microphone could not be obtained. */
export function microphoneMessage(status: MicrophoneStatus): string {
  switch (status) {
    case "denied":
      return "Microphone access is blocked. Click the lock or microphone icon in the address bar, allow the microphone, then try again.";
    case "no-device":
      return "No microphone was found. Connect one, or use the buttons below.";
    case "in-use":
      return "Your microphone is being used by another application. Close it and try again.";
    case "insecure":
      return "Voice input needs a secure (https) connection. The buttons below work everywhere.";
    case "unsupported":
      return "This browser does not expose the microphone to web pages. Try Chrome, Edge or Safari.";
  }
}

/** Human-readable reason the recognition session failed, by API error code. */
export function speechErrorMessage(code: string | undefined): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "The browser's speech service is not available. Check that the microphone is allowed in the address bar and that speech recognition is enabled in your browser settings.";
    case "audio-capture":
      return "No microphone was captured. Connect one, or use the buttons below.";
    case "language-not-supported":
      return "Voice input is unavailable for your browser's language. Switch the browser language to English and try again.";
    case "network":
      return "The browser's speech service could not be reached. Check your connection and try again.";
    case "no-speech":
      return "Nothing was heard. Speak a little louder and try again.";
    case "aborted":
      return "Listening stopped.";
    default:
      return "Voice input could not be started. Try again, or use the buttons below.";
  }
}

/**
 * Lightweight helper for OS- and browser-level APIs that are often overlooked.
 *
 * Speech recognition:
 *   Chrome's default implementation can send microphone audio to Google's
 *   cloud speech service; Safari and Edge use their own browser services.
 *   The newer `processLocally` option (Chrome 139+, Edge) can use a language
 *   model on the device. This module requests that local path when the browser
 *   genuinely implements it and never silently falls back to cloud processing.
 *   A switch to the browser service is disclosed and requires a fresh tap.
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
  const scope = window as unknown as Record<string, unknown>;
  // Some WebKit shells expose a placeholder under the standard name. Do not
  // let a non-callable value hide the working prefixed constructor.
  for (const name of ["SpeechRecognition", "webkitSpeechRecognition"]) {
    const ctor = scope[name];
    if (typeof ctor === "function") return ctor as SpeechConstructor;
  }
  return null;
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
  if (typeof navigator !== "undefined" && (navigator.webdriver || /HeadlessChrome/.test(navigator.userAgent)) && /\[native code\]/.test(Function.prototype.toString.call(ctor))) return "unavailable";
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

export type RecognitionResult = ArrayLike<{ transcript: string; confidence: number }> & { isFinal?: boolean };

export type RecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
  processLocally?: boolean;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onaudioend: (() => void) | null;
  onnomatch: (() => void) | null;
  onresult: ((event: { resultIndex: number; results: ArrayLike<RecognitionResult> }) => void) | null;
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
 * A local failure must not silently fall back to the default/cloud service.
 * Only a fresh user gesture and a policy-permitted, disclosed choice can retry.
 */
export function createRecognition(
  lang?: string,
  options?: { preferOnDevice?: boolean },
): RecognitionInstance | null {
  const ctor = recognitionCtor();
  if (!ctor) return null;
  const recognition = new ctor();
  // Use the operating-system locale rather than pinning recognition to the
  // English HTML document. Native speech does not universally auto-detect language.
  if (lang) recognition.lang = lang;
  recognition.interimResults = true;
  recognition.continuous = false;
  // Several hypotheses let the command engine pick the one that parses and
  // learn the recogniser's habitual mishearings.
  recognition.maxAlternatives = 4;
  if (options?.preferOnDevice) {
    if (!supportsOnDeviceSpeech()) throw new DOMException("On-device speech is unavailable", "NotSupportedError");
    recognition.processLocally = true;
    if (recognition.processLocally !== true) throw new DOMException("Local speech could not be enabled", "NotSupportedError");
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
 * Capture for MediaRecorder/local audio models only. Native SpeechRecognition
 * requests and owns its own microphone. The signal releases late-granted
 * streams even if the visitor cancels while a permission prompt is open.
 */
export async function requestMicrophone(signal?: AbortSignal): Promise<MicrophoneAccess> {
  if (typeof window === "undefined") return { status: "unsupported", stream: null };
  const media = navigator.mediaDevices;
  if (!media || typeof media.getUserMedia !== "function") {
    return { status: window.isSecureContext ? "unsupported" : "insecure", stream: null };
  }
  if (signal?.aborted) return { status: "in-use", stream: null };
  let onAbort: (() => void) | undefined;
  try {
    const capture = media.getUserMedia({ audio: true }).then((stream) => {
      if (signal?.aborted) {
        releaseStream(stream);
        throw new DOMException("Microphone request cancelled", "AbortError");
      }
      return stream;
    });
    const stream = signal ? await new Promise<MediaStream>((resolve, reject) => {
      onAbort = () => reject(new DOMException("Microphone request cancelled", "AbortError"));
      signal.addEventListener("abort", onAbort, { once: true });
      if (signal.aborted) onAbort();
      capture.then(resolve, reject);
    }) : await capture;
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
  } finally {
    if (onAbort) signal?.removeEventListener("abort", onAbort);
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

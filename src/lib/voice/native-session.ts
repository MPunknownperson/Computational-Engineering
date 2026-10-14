import { createRecognition, type RecognitionInstance } from "@/lib/browser-tokens";

export type NativePhase = "requesting" | "starting" | "listening" | "processing";
export interface NativeSession {
  start(): void;
  stop(): void;
  cancel(): void;
}

export const VOICE_TIMEOUTS = {
  permission: 30_000,
  audioStart: 8_000,
  utterance: 20_000,
  result: 8_000,
} as const;

/**
 * One gesture, one recognizer, one terminal outcome. Never restarts itself.
 * Native SpeechRecognition owns microphone permission/capture: opening a
 * getUserMedia stream first loses activation and competes for audio on iOS.
 * The caller MUST invoke start() synchronously from a click/tap handler.
 */
export function createNativeSession(options: {
  language: string;
  local: boolean;
  onPhase: (phase: NativePhase) => void;
  onInterim: (text: string) => void;
  onResult: (hypotheses: Array<{ text: string; confidence: number }>) => void;
  onError: (code: string) => void;
}): NativeSession {
  let recognition: RecognitionInstance | null = null;
  let live = true;
  let launched = false;
  let capturing = false;
  let finishing = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const clearTimer = () => { clearTimeout(timer); timer = undefined; };
  const dispose = () => {
    live = false;
    clearTimer();
    const current = recognition;
    recognition = null;
    if (!current) return;
    current.onstart = null;
    current.onaudiostart = null;
    current.onspeechstart = null;
    current.onspeechend = null;
    current.onaudioend = null;
    current.onresult = null;
    current.onnomatch = null;
    current.onerror = null;
    current.onend = null;
    try { if (current.abort) current.abort(); else current.stop(); } catch { /* already ended */ }
  };
  const fail = (code: string) => {
    if (!live) return;
    dispose();
    options.onError(code);
  };
  const arm = (delay: number, action: () => void) => {
    clearTimer();
    timer = setTimeout(() => { if (live) action(); }, delay);
  };
  const processing = () => {
    if (!live || finishing) return;
    finishing = true;
    options.onPhase("processing");
    arm(VOICE_TIMEOUTS.result, () => fail("no-speech"));
  };
  const stop = () => {
    if (!live) return;
    if (!capturing) { dispose(); return; }
    processing();
    try { recognition?.stop(); } catch { fail("audio-capture"); }
  };
  const audioStarted = () => {
    if (!live || capturing || finishing) return;
    capturing = true;
    options.onPhase("listening");
    arm(VOICE_TIMEOUTS.utterance, stop);
  };

  return {
    start() {
      if (!live || launched) return;
      launched = true;
      options.onPhase("requesting");
      try {
        recognition = createRecognition(options.language, { preferOnDevice: options.local });
        if (!recognition) { fail("unsupported"); return; }
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.onstart = () => {
          if (!live || capturing || finishing) return;
          // Service started is not yet proof that microphone capture started.
          options.onPhase("starting");
          arm(VOICE_TIMEOUTS.audioStart, () => fail("startup-timeout"));
        };
        recognition.onaudiostart = audioStarted;
        recognition.onspeechstart = audioStarted;
        recognition.onspeechend = () => { if (capturing) processing(); };
        recognition.onaudioend = () => { if (capturing) processing(); };
        recognition.onresult = (event) => {
          if (!live) return;
          const interim: string[] = [];
          for (let i = event.resultIndex ?? 0; i < event.results.length; i++) {
            const result = event.results[i];
            if (!result?.length) continue;
            if (result.isFinal === false) {
              interim.push(result[0]?.transcript ?? "");
              continue;
            }
            const hypotheses = Array.from({ length: result.length }, (_, index) => ({
              text: result[index]?.transcript?.trim() ?? "",
              confidence: result[index]?.confidence ?? 0,
            })).filter((item) => item.text);
            if (!hypotheses.length) continue;
            // Detach and release before routing; onend cannot overwrite success.
            dispose();
            options.onResult(hypotheses);
            return;
          }
          if (interim.length) {
            audioStarted();
            options.onInterim(interim.join(" "));
          }
        };
        recognition.onnomatch = () => fail("no-speech");
        recognition.onerror = (event) => fail(event.error ?? "generic");
        recognition.onend = () => fail(capturing ? "no-speech" : "ended-before-start");
        arm(VOICE_TIMEOUTS.permission, () => fail("startup-timeout"));
        // Deliberately no await, promise continuation, permission request, or
        // timer before start. Preserve the original mobile user activation.
        recognition.start();
      } catch (error) {
        const name = error instanceof Error ? error.name : "";
        fail(name === "NotAllowedError" ? "not-allowed"
          : name === "SecurityError" ? "not-allowed"
          : name === "NotFoundError" ? "no-device"
          : name === "NotReadableError" ? "audio-capture"
          : name === "InvalidStateError" ? "busy"
          : name === "NotSupportedError" ? "service-not-allowed" : "generic");
      }
    },
    stop,
    cancel: dispose,
  };
}

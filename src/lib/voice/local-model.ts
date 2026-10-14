"use client";

import { releaseStream, requestMicrophone } from "@/lib/browser-tokens";
import { aiAvailability, hasOnDeviceAi, prepareAudioTranscriber, type AudioTranscriber } from "@/lib/ai/on-device";
import { supportsGenerativeSpeechLanguage } from "./languages";

export type ModelEngineStatus = "loading" | "requesting" | "recording" | "decoding" | "error";
export interface ModelAssetProgress { percent: number | null }
export interface LocalModelEngine { start(): Promise<void>; stop(): void; cancel(): void; dispose(): void }

export function canRunLocalModel(language = "en-US"): boolean {
  return supportsGenerativeSpeechLanguage(language)
    && typeof window !== "undefined" && window.isSecureContext
    && typeof MediaRecorder !== "undefined"
    && !!navigator.mediaDevices?.getUserMedia && hasOnDeviceAi();
}
export async function localModelReady(language = "en-US"): Promise<boolean> {
  return canRunLocalModel(language) && await aiAvailability("audio", language) !== "unavailable";
}
function mimeType(): string | undefined {
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]
    .find((type) => MediaRecorder.isTypeSupported(type));
}

/** Bound even browser APIs that ignore AbortSignal; late sessions self-dispose. */
function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new DOMException("Cancelled", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

export function createLocalModelEngine(options: {
  language: string;
  onStatus?: (status: ModelEngineStatus) => void;
  onProgress?: (progress: ModelAssetProgress) => void;
  onText: (transcript: string) => void;
}): LocalModelEngine | null {
  if (!canRunLocalModel(options.language)) return null;
  let running = false;
  let disposed = false;
  let controller: AbortController | null = null;
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let transcriber: AudioTranscriber | null = null;
  let recordingTimer: ReturnType<typeof setTimeout> | undefined;

  const stop = () => { if (recorder?.state === "recording") recorder.stop(); };
  const releaseAudio = () => {
    clearTimeout(recordingTimer);
    try { stop(); } catch { /* capture already ended */ }
    recorder = null;
    releaseStream(stream);
    stream = null;
  };
  const cancel = () => {
    controller?.abort();
    releaseAudio();
    transcriber?.dispose();
    transcriber = null;
  };

  return {
    async start() {
      if (running || disposed) return;
      running = true;
      controller = new AbortController();
      const signal = controller.signal;
      let timedOut = false;
      const deadline = setTimeout(() => { timedOut = true; controller?.abort(); }, 90_000);
      try {
        options.onStatus?.("loading");
        transcriber = await abortable(prepareAudioTranscriber({
          language: options.language, signal,
          onProgress: (percent) => { if (!signal.aborted) options.onProgress?.({ percent }); },
        }), signal);
        if (signal.aborted) return;
        if (!transcriber) throw new Error("no-local-model");
        options.onStatus?.("requesting");
        const access = await requestMicrophone(signal);
        if (signal.aborted) {
          releaseStream(access.stream);
          if (timedOut) throw new Error("speech-timeout");
          return;
        }
        if (access.status !== "granted") throw new Error(`microphone:${access.status}`);
        stream = access.stream;
        const type = mimeType();
        const capture = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
        recorder = capture;
        const audio = await new Promise<Blob>((resolve, reject) => {
          const chunks: Blob[] = [];
          const abort = () => {
            try { stop(); } catch { /* already stopped */ }
            reject(new DOMException("Cancelled", "AbortError"));
          };
          signal.addEventListener("abort", abort, { once: true });
          capture.addEventListener("dataavailable", (event) => { if (event.data.size) chunks.push(event.data); });
          capture.addEventListener("error", () => {
            signal.removeEventListener("abort", abort);
            reject(new Error("audio-capture"));
          }, { once: true });
          capture.addEventListener("stop", () => {
            signal.removeEventListener("abort", abort);
            resolve(new Blob(chunks, { type: capture.mimeType || type || "audio/webm" }));
          }, { once: true });
          capture.addEventListener("start", () => {
            if (signal.aborted) { abort(); return; }
            options.onStatus?.("recording");
            recordingTimer = setTimeout(stop, 12_000);
          }, { once: true });
          if (signal.aborted) { abort(); return; }
          capture.start(); // UI waits for the real MediaRecorder start event.
        });
        releaseAudio();
        if (signal.aborted) return;
        if (audio.size < 1200) throw new Error("no-speech");
        options.onStatus?.("decoding");
        const text = await abortable(transcriber.transcribe(audio, signal), signal);
        if (signal.aborted) return;
        if (!text) throw new Error("no-speech");
        options.onText(text);
      } catch (error) {
        if (timedOut && !disposed) { options.onStatus?.("error"); throw new Error("speech-timeout"); }
        if (!signal.aborted && !disposed) { options.onStatus?.("error"); throw error; }
      } finally {
        clearTimeout(deadline);
        releaseAudio();
        transcriber?.dispose();
        transcriber = null;
        controller = null;
        running = false;
      }
    },
    stop, cancel,
    dispose() { disposed = true; cancel(); },
  };
}

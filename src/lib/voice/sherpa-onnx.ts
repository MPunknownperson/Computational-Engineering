"use client";

import { releaseStream, requestMicrophone } from "@/lib/browser-tokens";
import { resampleSpeech } from "@/lib/voice/portable-speech";
import type { NativePhase, NativeSession } from "@/lib/voice/native-session";

/**
 * sherpa-onnx WebAssembly fallback for browsers without a usable Web Speech
 * API (Firefox, de-Googled Android browsers, many embedded WebViews, …).
 *
 * The runtime (k2-fsa/sherpa-onnx, Apache-2.0) and a compact int8 streaming
 * Zipformer model are self-hosted under /vendor/sherpa-onnx and executed in a
 * dedicated worker. Microphone PCM is resampled to 16 kHz in the page and
 * streamed to the worker; partial and final transcripts stream back. Nothing
 * is uploaded.
 *
 * The session mirrors `createNativeSession`: one tap, one utterance, one
 * terminal outcome, and start() must run synchronously inside the tap so iOS
 * audio activation rules are honoured.
 */

export const SHERPA_ONNX_BASE = (process.env.NEXT_PUBLIC_SHERPA_ONNX_BASE_URL || "/vendor/sherpa-onnx/").replace(/\/?$/, "/");
export const SHERPA_ONNX_ENGINE_ID = "sherpa-onnx-wasm";

/** Languages the bundled model can transcribe (English Zipformer, 20M). */
const SUPPORTED_LANGUAGES = new Set(["en"]);

export interface SherpaProgress { percent: number | null; stage: "runtime" | "download" | "init" }

type WorkerReply =
  | { type: "progress"; loaded: number; total: number; status: string }
  | { type: "ready" }
  | { type: "error"; message: string }
  | { type: "partial"; text: string }
  | { type: "final"; text: string; endpoint: boolean };

function audioContextConstructor(): typeof AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  return window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

/** Capability-based check: WebAssembly, workers, Web Audio and a microphone API. */
export function canUseSherpaOnnx(language = "en-US"): boolean {
  if (typeof window === "undefined" || !window.isSecureContext) return false;
  if (typeof Worker !== "function" || typeof WebAssembly !== "object") return false;
  if (!audioContextConstructor() || typeof navigator.mediaDevices?.getUserMedia !== "function") return false;
  return sherpaSupportsLanguage(language);
}

export function sherpaSupportsLanguage(language: string): boolean {
  const primary = language.toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGUAGES.has(primary);
}

/* ------------------------------------------------------------------ */
/* Shared worker: the model is loaded once per page and kept warm.      */
/* ------------------------------------------------------------------ */

let worker: Worker | null = null;
let readyPromise: Promise<void> | null = null;
let isReady = false;
const listeners = new Set<(reply: WorkerReply) => void>();
const progressListeners = new Set<(progress: SherpaProgress) => void>();

function ensureWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(`${SHERPA_ONNX_BASE}asr.worker.js`);
  worker.onmessage = (event: MessageEvent<WorkerReply>) => {
    const reply = event.data;
    if (reply.type === "progress") {
      const percent = reply.total > 0 ? Math.min(99, Math.round((reply.loaded / reply.total) * 100)) : null;
      const stage: SherpaProgress["stage"] = reply.status === "download" ? "download" : reply.status === "runtime" ? "runtime" : "init";
      for (const listener of progressListeners) listener({ percent, stage });
      return;
    }
    for (const listener of listeners) listener(reply);
  };
  worker.onerror = () => {
    for (const listener of listeners) listener({ type: "error", message: "worker-crashed" });
    disposeSherpaOnnx();
  };
  return worker;
}

export function sherpaOnnxReady(): boolean {
  return isReady;
}

/** Download/initialise the runtime once. Safe to call repeatedly. */
export function prepareSherpaOnnx(onProgress?: (progress: SherpaProgress) => void, timeoutMs = 180_000): Promise<void> {
  if (isReady) return Promise.resolve();
  if (onProgress) progressListeners.add(onProgress);
  if (!readyPromise) {
    readyPromise = new Promise<void>((resolve, reject) => {
      const current = ensureWorker();
      const timer = setTimeout(() => { cleanup(); disposeSherpaOnnx(); reject(new Error("model-timeout")); }, timeoutMs);
      const listener = (reply: WorkerReply) => {
        if (reply.type === "ready") { cleanup(); isReady = true; resolve(); }
        else if (reply.type === "error") { cleanup(); disposeSherpaOnnx(); reject(new Error(reply.message)); }
      };
      const cleanup = () => { clearTimeout(timer); listeners.delete(listener); };
      listeners.add(listener);
      current.postMessage({ type: "prepare", base: new URL(SHERPA_ONNX_BASE, window.location.origin).href });
    }).finally(() => { progressListeners.clear(); });
  }
  return readyPromise;
}

export function disposeSherpaOnnx() {
  worker?.terminate();
  worker = null;
  readyPromise = null;
  isReady = false;
  listeners.clear();
  progressListeners.clear();
}

/* ------------------------------------------------------------------ */
/* One utterance                                                        */
/* ------------------------------------------------------------------ */

const TIMEOUTS = { permission: 30_000, utterance: 20_000, result: 8_000 } as const;

export function createSherpaSession(options: {
  language: string;
  onPhase: (phase: NativePhase) => void;
  onInterim: (text: string) => void;
  onResult: (hypotheses: Array<{ text: string; confidence: number }>) => void;
  onError: (code: string) => void;
}): NativeSession {
  let live = true;
  let launched = false;
  let capturing = false;
  let finishing = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stream: MediaStream | null = null;
  let context: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let processor: ScriptProcessorNode | null = null;
  let silent: GainNode | null = null;
  let lastPartial = "";
  const controller = new AbortController();

  const clearTimer = () => { clearTimeout(timer); timer = undefined; };
  const arm = (delay: number, action: () => void) => { clearTimer(); timer = setTimeout(() => { if (live) action(); }, delay); };

  const releaseAudio = () => {
    if (processor) { processor.onaudioprocess = null; try { processor.disconnect(); } catch { /* closed */ } }
    try { source?.disconnect(); silent?.disconnect(); } catch { /* closed */ }
    processor = null; source = null; silent = null;
    releaseStream(stream); stream = null;
    if (context) { void context.close().catch(() => undefined); context = null; }
  };

  const onReply = (reply: WorkerReply) => {
    if (!live) return;
    if (reply.type === "partial") {
      lastPartial = reply.text;
      options.onInterim(reply.text);
      return;
    }
    if (reply.type === "final") {
      const text = (reply.text || lastPartial).trim();
      dispose();
      if (!text) { options.onError("no-speech"); return; }
      options.onResult([{ text, confidence: 0.85 }]);
      return;
    }
    if (reply.type === "error") {
      dispose();
      options.onError(reply.message === "not-ready" ? "speech-needs-preparation" : "model-error");
    }
  };

  const dispose = () => {
    if (!live) return;
    live = false;
    clearTimer();
    controller.abort();
    listeners.delete(onReply);
    releaseAudio();
    try { worker?.postMessage({ type: "reset" }); } catch { /* worker gone */ }
  };

  const fail = (code: string) => {
    if (!live) return;
    dispose();
    options.onError(code);
  };

  const finish = () => {
    if (!live || finishing) return;
    finishing = true;
    options.onPhase("processing");
    // Stop feeding audio; the worker flushes and answers with a final result.
    if (processor) processor.onaudioprocess = null;
    arm(TIMEOUTS.result, () => {
      if (lastPartial) { const text = lastPartial; dispose(); options.onResult([{ text, confidence: 0.6 }]); }
      else fail("no-speech");
    });
    try { ensureWorker().postMessage({ type: "finish" }); } catch { fail("model-error"); }
  };

  return {
    start() {
      if (!live || launched) return;
      launched = true;
      if (!isReady || !worker) { fail("speech-needs-preparation"); return; }
      const Context = audioContextConstructor();
      if (!Context) { fail("unsupported"); return; }
      listeners.add(onReply);
      options.onPhase("requesting");
      // Create and resume the AudioContext inside the tap, before any await.
      try { context = new Context(); } catch { fail("audio-capture"); return; }
      const activeContext = context;
      void activeContext.resume().catch(() => undefined);
      arm(TIMEOUTS.permission, () => fail("startup-timeout"));
      void requestMicrophone(controller.signal).then((access) => {
        if (!live) { releaseStream(access.stream); return; }
        if (access.status !== "granted" || !access.stream) {
          fail(access.status === "denied" ? "not-allowed"
            : access.status === "no-device" ? "no-device"
            : access.status === "in-use" ? "audio-capture"
            : access.status === "insecure" ? "not-allowed"
            : access.status === "unsupported" ? "unsupported" : "audio-capture");
          return;
        }
        const granted = access.stream;
        stream = granted;
        try {
          worker?.postMessage({ type: "start" });
          source = activeContext.createMediaStreamSource(granted);
          processor = activeContext.createScriptProcessor(4096, 1, 1);
          silent = activeContext.createGain();
          silent.gain.value = 0;
          processor.onaudioprocess = (event) => {
            if (!live || finishing) return;
            const input = event.inputBuffer.getChannelData(0);
            const samples = resampleSpeech(new Float32Array(input), activeContext.sampleRate);
            worker?.postMessage({ type: "audio", samples }, [samples.buffer]);
          };
          source.connect(processor);
          processor.connect(silent);
          silent.connect(activeContext.destination);
          capturing = true;
          options.onPhase("listening");
          arm(TIMEOUTS.utterance, finish);
        } catch {
          fail("audio-capture");
        }
      }).catch((error: unknown) => {
        const name = error instanceof Error ? error.name : "";
        fail(name === "NotAllowedError" || name === "SecurityError" ? "not-allowed"
          : name === "NotFoundError" ? "no-device"
          : name === "NotReadableError" ? "audio-capture"
          : name === "AbortError" ? "aborted" : "audio-capture");
      });
    },
    stop() {
      if (!live) return;
      if (!capturing) { dispose(); options.onError("aborted"); return; }
      // Even without a partial yet, let the decoder flush the utterance tail;
      // the result timer reports no-speech if nothing was heard.
      finish();
    },
    cancel: dispose,
  };
}

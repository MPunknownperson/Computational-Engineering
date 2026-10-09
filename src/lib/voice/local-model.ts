"use client";

import { releaseStream, requestMicrophone } from "@/lib/browser-tokens";

/** Local multilingual Whisper Base, executed in a dedicated Web Worker. */
export type ModelEngineStatus = "loading" | "requesting" | "recording" | "decoding" | "error";

export interface ModelAssetProgress {
  file: string;
  percent: number | null;
  loaded: number;
  total: number;
  completed: number;
  assetCount: number;
}

export interface LocalModelEngine {
  /** Downloads/caches model assets, requests mic permission and transcribes. */
  start(): Promise<void>;
  /** Finish the current utterance and decode it. */
  stop(): void;
  /** Cancel the utterance or pending load without decoding. */
  cancel(): void;
  /** Release worker resources when the voice card is discarded. */
  dispose(): void;
}

const WORKER_MODEL_ID = "Xenova/whisper-base";
const LANGUAGE_NAMES: Record<string, string> = {
  ar: "arabic", bg: "bulgarian", ca: "catalan", cs: "czech", da: "danish", de: "german",
  el: "greek", en: "english", es: "spanish", et: "estonian", fa: "persian", fi: "finnish",
  fr: "french", he: "hebrew", hi: "hindi", hr: "croatian", hu: "hungarian", id: "indonesian",
  is: "icelandic", it: "italian", ja: "japanese", ko: "korean", lt: "lithuanian", lv: "latvian",
  ms: "malay", nl: "dutch", no: "norwegian", pl: "polish", pt: "portuguese", ro: "romanian",
  ru: "russian", sk: "slovak", sl: "slovenian", sv: "swedish", th: "thai", tr: "turkish",
  uk: "ukrainian", ur: "urdu", vi: "vietnamese", zh: "chinese", yue: "cantonese",
};

/** Convert a BCP-47 locale into Whisper's language-name parameter. */
export function whisperLanguage(locale: string): string | undefined {
  return LANGUAGE_NAMES[locale.toLowerCase().split(/[-_]/)[0]];
}

/** Conservative capability check; actual model creation may still fail. */
export function canRunLocalModel(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined" || typeof Worker === "undefined") return false;
  const webgpu = "gpu" in navigator;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 0;
  return typeof WebAssembly === "object" && (webgpu || (navigator.hardwareConcurrency ?? 0) >= 4) && (memory === 0 || memory >= 4);
}

/** Linear resampling to the 16 kHz mono waveform expected by Whisper. */
function resample(input: Float32Array, originalRate: number): Float32Array {
  if (originalRate === 16_000) return input;
  const factor = originalRate / 16_000;
  const output = new Float32Array(Math.floor(input.length / factor));
  for (let index = 0; index < output.length; index += 1) {
    const position = index * factor;
    const left = Math.floor(position);
    const right = Math.min(left + 1, input.length - 1);
    const ratio = position - left;
    output[index] = input[left] * (1 - ratio) + input[right] * ratio;
  }
  return output;
}

interface WorkerResponse {
  type: "ready" | "progress" | "result" | "error";
  id?: string;
  message?: string;
  text?: string;
  file?: string;
  filePercent?: number | null;
  loaded?: number;
  total?: number;
  completed?: number;
  assets?: number;
}

interface PendingRequest {
  resolve: (value: string | undefined) => void;
  reject: (error: Error) => void;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Create the Worker-backed in-browser recogniser. Model publisher: Xenova;
 * host: Hugging Face Hub; license: Apache-2.0. Whisper Base has 74M
 * parameters; quantized q8 files are downloaded individually on first use and
 * cached by the browser. Only model/config/tokenizer assets go to that host;
 * captured audio is transferred to a same-origin worker and stays on-device.
 */
export function createLocalModelEngine(options: {
  language: string;
  onStatus?: (status: ModelEngineStatus) => void;
  onProgress?: (progress: ModelAssetProgress) => void;
  onText: (transcript: string) => void;
}): LocalModelEngine | null {
  if (!canRunLocalModel()) return null;

  let worker: Worker | null;
  try {
    worker = new Worker(new URL("./asr.worker.ts", import.meta.url), {
      type: "module",
      name: "radix-loom-whisper-base",
    });
  } catch {
    return null;
  }
  let workerReady: Promise<void> | null = null;
  let requestId = 0;
  let disposed = false;
  let cancelled = false;
  let running = false;
  let stream: MediaStream | null = null;
  let context: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let processor: ScriptProcessorNode | null = null;
  let finishRecording: (() => void) | null = null;
  let limitTimer: ReturnType<typeof setTimeout> | null = null;
  const chunks: Float32Array[] = [];
  const pending = new Map<string, PendingRequest>();

  const rejectPending = (error: Error) => {
    for (const [id, request] of pending) {
      request.reject(error);
      pending.delete(id);
    }
  };

  worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
    const message = event.data;
    if (message.type === "progress") {
      options.onProgress?.({
        file: message.file ?? "model asset",
        percent: typeof message.filePercent === "number" ? Math.max(0, Math.min(100, Math.round(message.filePercent))) : null,
        loaded: message.loaded ?? 0,
        total: message.total ?? 0,
        completed: message.completed ?? 0,
        assetCount: message.assets ?? 0,
      });
      return;
    }
    const request = message.id ? pending.get(message.id) : undefined;
    if (!request) return;
    pending.delete(message.id!);
    if (message.type === "error") request.reject(new Error(message.message ?? "The local speech model failed."));
    else request.resolve(message.text);
  });
  worker.addEventListener("error", (event) => rejectPending(new Error(event.message || "The local speech worker failed.")));

  const send = (message: Record<string, unknown>, transfer: Transferable[] = []): Promise<string | undefined> => {
    if (!worker || disposed) return Promise.reject(new Error("The local model worker is not available."));
    const id = String(++requestId);
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker!.postMessage({ ...message, id }, { transfer });
    });
  };

  const prepare = () => {
    if (!workerReady) {
      options.onStatus?.("loading");
      workerReady = send({ type: "prepare", device: "gpu" in navigator ? "webgpu" : "wasm" })
        .then(() => undefined)
        .catch((error: unknown) => {
          workerReady = null;
          throw error;
        });
    }
    return workerReady;
  };

  const cleanupAudio = () => {
    if (limitTimer) clearTimeout(limitTimer);
    limitTimer = null;
    processor?.disconnect();
    processor = null;
    source?.disconnect();
    source = null;
    if (context && context.state !== "closed") void context.close().catch(() => undefined);
    context = null;
    releaseStream(stream);
    stream = null;
  };

  const stop = () => {
    if (finishRecording) {
      const resolve = finishRecording;
      finishRecording = null;
      resolve();
    }
  };

  const cancel = () => {
    cancelled = true;
    stop();
    cleanupAudio();
    // If the visitor cancels during model download, release the worker and let
    // browser-cached assets make the next attempt cheaper.
    if (!running && worker) {
      worker.terminate();
      worker = null;
      workerReady = null;
      rejectPending(new Error("cancelled"));
    }
  };

  const dispose = () => {
    cancel();
    disposed = true;
    worker?.terminate();
    worker = null;
    workerReady = null;
    rejectPending(new Error("The local model worker was released."));
  };

  return {
    async start() {
      if (running || disposed) return;
      running = true;
      cancelled = false;
      chunks.length = 0;
      try {
        // Model files load first. The visible status names the publisher/host
        // and shows per-file progress; no microphone is open during this step.
        await prepare();
        if (cancelled) return;

        options.onStatus?.("requesting");
        const access = await requestMicrophone();
        if (access.status !== "granted") throw new Error(`microphone:${access.status}`);
        if (cancelled) {
          releaseStream(access.stream);
          return;
        }
        stream = access.stream;

        context = new AudioContext();
        source = context.createMediaStreamSource(stream);
        processor = context.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (event) => {
          if (!cancelled) chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
        };
        source.connect(processor);
        processor.connect(context.destination);
        options.onStatus?.("recording");
        await new Promise<void>((resolve) => {
          finishRecording = resolve;
          limitTimer = setTimeout(stop, 12_000);
        });
        if (cancelled) return;

        const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        if (!context || length < context.sampleRate / 4) throw new Error("no-speech");
        const audio = new Float32Array(length);
        let cursor = 0;
        for (const chunk of chunks) {
          audio.set(chunk, cursor);
          cursor += chunk.length;
        }
        const mono16k = resample(audio, context.sampleRate);
        cleanupAudio(); // free the mic while the model decodes
        if (cancelled) return;
        options.onStatus?.("decoding");
        const buffer = mono16k.buffer;
        const text = await send({ type: "transcribe", audio: buffer, language: options.language }, [buffer]);
        if (!cancelled && text?.trim()) options.onText(text.trim());
        else if (!cancelled) throw new Error("no-speech");
      } catch (error) {
        if (!cancelled) {
          options.onStatus?.("error");
          throw error;
        }
      } finally {
        cleanupAudio();
        running = false;
      }
    },
    stop,
    cancel,
    dispose,
  };
}

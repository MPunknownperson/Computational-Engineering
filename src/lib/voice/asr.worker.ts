/// <reference lib="webworker" />
import { pipeline } from "@huggingface/transformers";
import { whisperLanguage } from "@/lib/voice/whisper-language";

/**
 * Background worker. Model: Xenova/whisper-base (multilingual, Apache-2.0).
 * Host: Hugging Face Hub. Model/config/tokenizer files are fetched separately,
 * one at a time by Transformers.js and cached in browser storage. Microphone
 * audio is transferred from the page to this same-origin worker only.
 */
const MODEL_ID = "Xenova/whisper-base";

interface ProgressInfo {
  status?: string;
  name?: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
}
interface AssetState { loaded: number; total: number; done: boolean }
interface Transcriber {
  (audio: Float32Array, options: Record<string, unknown>): Promise<{ text?: string }>;
}
interface Incoming {
  type: "prepare" | "transcribe";
  id: string;
  device?: "webgpu" | "wasm";
  audio?: ArrayBuffer;
  language?: string;
}

const assetStates = new Map<string, AssetState>();
let transcriber: Transcriber | null = null;
let loading: Promise<Transcriber> | null = null;

function post(message: Record<string, unknown>, transfer: Transferable[] = []) {
  self.postMessage(message, { transfer });
}

function reportProgress(info: ProgressInfo) {
  const file = info.file ?? "model asset";
  const current = assetStates.get(file) ?? { loaded: 0, total: 0, done: false };
  if (info.status === "progress") {
    current.loaded = info.loaded ?? current.loaded;
    current.total = info.total ?? current.total;
  }
  if (info.status === "done") current.done = true;
  assetStates.set(file, current);
  const files = [...assetStates.values()];
  const total = files.reduce((sum, asset) => sum + asset.total, 0);
  const loaded = files.reduce((sum, asset) => sum + Math.min(asset.loaded, asset.total || asset.loaded), 0);
  post({
    type: "progress",
    status: info.status ?? "download",
    file,
    filePercent: info.progress ?? null,
    loaded,
    total,
    completed: files.filter((asset) => asset.done).length,
    assets: files.length,
  });
}

function loadModel(device: "webgpu" | "wasm"): Promise<Transcriber> {
  if (transcriber) return Promise.resolve(transcriber);
  if (!loading) {
    assetStates.clear();
    loading = (async () => {
      if (device === "webgpu") {
        try {
          return await pipeline("automatic-speech-recognition", MODEL_ID, {
            device: "webgpu",
            dtype: "q8",
            progress_callback: (info: unknown) => reportProgress(info as ProgressInfo),
          }) as unknown as Transcriber;
        } catch {
          // A browser can advertise WebGPU but lack an operator the model needs.
          assetStates.clear();
        }
      }
      return await pipeline("automatic-speech-recognition", MODEL_ID, {
        device: "wasm",
        dtype: "q8",
        progress_callback: (info: unknown) => reportProgress(info as ProgressInfo),
      }) as unknown as Transcriber;
    })().then((result) => {
      transcriber = result;
      return result;
    }).catch((error: unknown) => {
      loading = null; // let a later press retry if the user was offline
      throw error;
    });
  }
  return loading;
}

const modelLanguage = whisperLanguage;

self.addEventListener("message", (event: MessageEvent<Incoming>) => {
  const message = event.data;
  if (!message?.id) return;

  if (message.type === "prepare") {
    void loadModel(message.device ?? "wasm")
      .then(() => post({ type: "ready", id: message.id }))
      .catch((error: unknown) => post({ type: "error", id: message.id, message: error instanceof Error ? error.message : String(error) }));
    return;
  }

  if (message.type === "transcribe" && message.audio && transcriber) {
    const audio = new Float32Array(message.audio);
    const language = modelLanguage(message.language);
    const options: Record<string, unknown> = {
      task: "transcribe",
      // Beam search and repetition guards are measurably steadier on short
      // number/currency phrases than greedy decoding, at a modest latency cost.
      num_beams: 3,
      max_new_tokens: 96,
      no_repeat_ngram_size: 3,
      repetition_penalty: 1.05,
    };
    if (language) options.language = language;
    void transcriber(audio, options)
      .then((result) => post({ type: "result", id: message.id, text: result.text ?? "" }))
      .catch((error: unknown) => post({ type: "error", id: message.id, message: error instanceof Error ? error.message : String(error) }));
  }
});

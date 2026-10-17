"use client";

import { releaseStream, requestMicrophone } from "@/lib/browser-tokens";
import { optionalPurposeAllowed } from "@/lib/privacy/browser-consent";
import { whisperLanguage } from "./whisper-language";

export interface PortableProgress { percent: number | null }
export interface PortableRecording {
  language: string;
  onStatus(status: "requesting" | "recording" | "decoding"): void;
  onText(text: string): void;
}
export interface PortableSpeechEngine {
  readonly ready: boolean;
  prepare(onProgress: (progress: PortableProgress) => void): Promise<void>;
  start(options: PortableRecording): Promise<void>;
  stop(): void;
  cancel(): void;
  dispose(): void;
}

function audioContextConstructor(): typeof AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  return window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

/** Capability-based: no UA, GPU, experimental AI, MediaRecorder, or speech-service requirement. */
export function canUsePortableSpeech(language = "en-US"): boolean {
  return typeof window !== "undefined" && window.isSecureContext
    && typeof Worker === "function" && typeof WebAssembly === "object"
    && !!audioContextConstructor() && typeof navigator.mediaDevices?.getUserMedia === "function"
    && !!whisperLanguage(language);
}

/** Resample microphone PCM to Whisper's 16 kHz, independent of the phone's hardware rate. */
export function resampleSpeech(input: Float32Array, sampleRate: number): Float32Array {
  if (sampleRate === 16000) return input;
  const ratio = sampleRate / 16000;
  const output = new Float32Array(Math.floor(input.length / ratio));
  for (let index = 0; index < output.length; index++) {
    const position = index * ratio;
    const left = Math.floor(position);
    const fraction = position - left;
    output[index] = input[left] * (1 - fraction) + (input[Math.min(left + 1, input.length - 1)] || 0) * fraction;
  }
  return output;
}

type Reply = { type: string; id?: string; message?: string; text?: string; loaded?: number; total?: number };
type Pending = { resolve: (reply: Reply) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };

export function createPortableSpeechEngine(): PortableSpeechEngine {
  let worker: Worker | null = null;
  let prepared = false;
  let disposed = false;
  let generation = 0;
  let counter = 0;
  let progress: ((value: PortableProgress) => void) | null = null;
  const pending = new Map<string, Pending>();
  let stream: MediaStream | null = null;
  let context: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let processor: ScriptProcessorNode | null = null;
  let silent: GainNode | null = null;
  let stopRecording: (() => void) | null = null;
  let rejectRecording: (() => void) | null = null;
  let recordingTimer: ReturnType<typeof setTimeout> | undefined;
  let audioStartTimer: ReturnType<typeof setTimeout> | undefined;
  let captureController: AbortController | null = null;

  const releaseAudio = () => {
    clearTimeout(recordingTimer); clearTimeout(audioStartTimer);
    stopRecording = null; rejectRecording = null;
    if (processor) { processor.onaudioprocess = null; try { processor.disconnect(); } catch { /* Already closed. */ } }
    try { source?.disconnect(); silent?.disconnect(); } catch { /* Already disconnected. */ }
    processor = null; source = null; silent = null;
    releaseStream(stream); stream = null;
    if (context) { void context.close().catch(() => undefined); context = null; }
  };
  const terminate = (error: Error = new DOMException("Cancelled", "AbortError")) => {
    worker?.terminate(); worker = null; prepared = false; progress = null;
    for (const task of pending.values()) { clearTimeout(task.timer); task.reject(error); }
    pending.clear();
  };
  const ensureWorker = () => {
    if (worker) return worker;
    if (disposed) throw new DOMException("Cancelled", "AbortError");
    worker = new Worker(new URL("./asr.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<Reply>) => {
      const reply = event.data;
      if (reply.type === "progress") {
        progress?.({ percent: reply.total ? Math.min(99, Math.round((reply.loaded || 0) / reply.total * 100)) : null });
        return;
      }
      if (!reply.id) return;
      const task = pending.get(reply.id);
      if (!task) return;
      clearTimeout(task.timer); pending.delete(reply.id);
      if (reply.type === "error") task.reject(new Error(reply.message || "speech-model-error"));
      else task.resolve(reply);
    };
    worker.onerror = () => terminate(new Error("speech-model-error"));
    return worker;
  };
  const request = (message: Record<string, unknown>, timeout: number, transfer: Transferable[] = []) => {
    const current = ensureWorker();
    const id = `voice-${++counter}`;
    return new Promise<Reply>((resolve, reject) => {
      const timer = setTimeout(() => terminate(new Error("speech-timeout")), timeout);
      pending.set(id, { resolve, reject, timer });
      try { current.postMessage({ ...message, id }, transfer); }
      catch (error) { clearTimeout(timer); pending.delete(id); reject(error); }
    });
  };
  const cancel = () => {
    generation++;
    captureController?.abort(); captureController = null;
    rejectRecording?.();
    releaseAudio();
    // Preserve an idle, prepared worker between utterances; cancel a model
    // download or decode immediately instead of leaving it busy off-screen.
    if (pending.size) terminate();
  };

  return {
    get ready() { return prepared && !disposed; },
    async prepare(onProgress) {
      if (prepared) return;
      if (disposed) throw new DOMException("Cancelled", "AbortError");
      progress = onProgress;
      onProgress({ percent: null });
      try {
        await request({ type: "prepare", device: "wasm", cache: optionalPurposeAllowed("functional") }, 120000);
        prepared = true;
        onProgress({ percent: 100 });
      } finally { progress = null; }
    },
    async start(options) {
      if (!prepared || disposed) throw new Error("speech-needs-preparation");
      const attempt = ++generation;
      const Context = audioContextConstructor();
      if (!Context) throw new Error("microphone:unsupported");
      captureController = new AbortController();
      const signal = captureController.signal;
      // Both operations begin IN the click handler, before the first await.
      // This is essential for iOS/iPadOS Web Audio user-activation rules.
      context = new Context();
      const activeContext = context;
      void activeContext.resume().catch(() => undefined);
      options.onStatus("requesting");
      const capture = requestMicrophone(signal);
      const permissionTimer = setTimeout(() => captureController?.abort(), 30000);
      try {
        const access = await capture;
        clearTimeout(permissionTimer);
        if (generation !== attempt || disposed) { releaseStream(access.stream); return; }
        if (access.status !== "granted") throw new Error(`microphone:${access.status}`);
        stream = access.stream;
        const frames: Float32Array[] = [];
        let samples = 0; let speech = false; let lastSpeech = 0; let capturing = false;
        const audio = await new Promise<Float32Array>((resolve, reject) => {
          const finish = () => {
            if (!samples) { reject(new Error("audio-capture")); return; }
            if (!speech) { reject(new Error("no-speech")); return; }
            const result = new Float32Array(samples);
            let offset = 0;
            for (const frame of frames) { result.set(frame, offset); offset += frame.length; }
            resolve(resampleSpeech(result, activeContext.sampleRate));
          };
          stopRecording = finish;
          rejectRecording = () => reject(new DOMException("Cancelled", "AbortError"));
          source = activeContext.createMediaStreamSource(stream!);
          // ScriptProcessor is the widely supported fallback on WebKit phones;
          // inference still runs in the worker and never blocks the page.
          processor = activeContext.createScriptProcessor(4096, 1, 1);
          silent = activeContext.createGain(); silent.gain.value = 0;
          processor.onaudioprocess = (event) => {
            if (generation !== attempt || signal.aborted) return;
            if (!capturing) { capturing = true; clearTimeout(audioStartTimer); options.onStatus("recording"); }
            const frame = new Float32Array(event.inputBuffer.getChannelData(0));
            frames.push(frame); samples += frame.length;
            let energy = 0;
            for (const value of frame) energy += value * value;
            if (Math.sqrt(energy / frame.length) > .004) { speech = true; lastSpeech = performance.now(); }
            if (speech && samples / activeContext.sampleRate > 1.2 && performance.now() - lastSpeech > 1200) finish();
          };
          source.connect(processor); processor.connect(silent); silent.connect(activeContext.destination);
          audioStartTimer = setTimeout(() => reject(new Error("audio-capture")), 8000);
          recordingTimer = setTimeout(finish, 12000);
        });
        releaseAudio();
        if (generation !== attempt || disposed) return;
        options.onStatus("decoding");
        const buffer = new Float32Array(audio).buffer;
        const reply = await request({ type: "transcribe", audio: buffer, language: options.language }, 60000, [buffer]);
        if (generation !== attempt || disposed) return;
        const text = reply.text?.trim();
        if (!text) throw new Error("no-speech");
        options.onText(text);
      } finally {
        clearTimeout(permissionTimer);
        if (generation === attempt) { captureController = null; releaseAudio(); }
      }
    },
    stop() { stopRecording?.(); },
    cancel,
    dispose() { disposed = true; cancel(); terminate(); },
  };
}

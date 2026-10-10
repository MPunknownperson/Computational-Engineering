"use client";

import { supportsGenerativeSpeechLanguage } from "@/lib/voice/languages";

export type AiAvailability = "available" | "downloadable" | "downloading" | "unavailable";
type Capability = "text" | "audio";
type Prompt = string | Array<{ role: "system" | "user"; content: string | Array<{ type: "text" | "audio"; value: string | Blob }> }>;
interface Session {
  prompt(input: Prompt, options?: { signal?: AbortSignal }): Promise<string>;
  destroy(): void;
}
interface ModelApi {
  availability(options: Record<string, unknown>): Promise<AiAvailability>;
  create(options: Record<string, unknown>): Promise<Session>;
}

function modelApi(): ModelApi | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as { LanguageModel?: ModelApi };
  const api = scope.LanguageModel;
  return api && typeof api.create === "function" && typeof api.availability === "function" ? api : null;
}

export function hasOnDeviceAi(): boolean { return modelApi() !== null; }

/** Use exactly the same capability options for availability() and create(). */
function capabilityOptions(capability: Capability): Record<string, unknown> {
  return {
    expectedInputs: [
      { type: "text", languages: ["en"] },
      ...(capability === "audio" ? [{ type: "audio", languages: ["en"] }] : []),
    ],
    expectedOutputs: [{ type: "text", languages: ["en"] }],
  };
}

export async function aiAvailability(capability: Capability = "text", language = "en-US"): Promise<AiAvailability> {
  // Gate before touching the browser API; a present text model is not proof
  // that audio, the requested language, or the device GPU is supported.
  if (!supportsGenerativeSpeechLanguage(language)) return "unavailable";
  const api = modelApi();
  if (!api) return "unavailable";
  try { return await api.availability(capabilityOptions(capability)); }
  catch { return "unavailable"; }
}

export interface AudioTranscriber {
  transcribe(audio: Blob, signal: AbortSignal): Promise<string | null>;
  dispose(): void;
}

/**
 * Create only after the user presses Speak, before opening the microphone.
 * The browser may download its own model. We host no model weights; that does
 * NOT mean first use is download-free. Preparation is cancellable and visible.
 */
export async function prepareAudioTranscriber(options: {
  language: string;
  signal: AbortSignal;
  onProgress?: (percent: number) => void;
}): Promise<AudioTranscriber | null> {
  if (await aiAvailability("audio", options.language) === "unavailable" || options.signal.aborted) return null;
  const api = modelApi();
  if (!api) return null;
  const session = await api.create({
    ...capabilityOptions("audio"),
    initialPrompts: [{ role: "system", content: "Transcribe English speech verbatim. Return only the spoken words, not answers, translations or explanations. Return (none) for silence." }],
    signal: options.signal,
    monitor(monitor: EventTarget) {
      monitor.addEventListener("downloadprogress", (event) => {
        const loaded = (event as Event & { loaded?: number }).loaded;
        if (typeof loaded === "number") options.onProgress?.(Math.round(Math.max(0, Math.min(1, loaded)) * 100));
      });
    },
  });
  if (options.signal.aborted) { session.destroy(); return null; }
  return {
    async transcribe(audio, signal) {
      const response = await session.prompt([{ role: "user", content: [
        { type: "text", value: "Transcribe this English audio verbatim." },
        { type: "audio", value: audio },
      ] }], { signal });
      const text = response.trim().replace(/^["'`]|["'`]$/g, "");
      return text && !/^\(?none\)?$/i.test(text) ? text : null;
    },
    dispose() { session.destroy(); },
  };
}

/**
 * An optional English-only repair on an ALREADY downloaded text model. Never
 * trigger a download after a failed command. Each short-lived session has its
 * own prompt/context, an abort signal and a strict time limit; no unused pool
 * or explanation service is retained.
 */
export async function repairCommandOnDevice(transcript: string, options: { language?: string; signal?: AbortSignal } = {}): Promise<string | null> {
  if (!transcript.trim() || await aiAvailability("text", options.language ?? "en-US") !== "available" || options.signal?.aborted) return null;
  const api = modelApi();
  if (!api) return null;
  const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(3000)]) : AbortSignal.timeout(3000);
  let session: Session | undefined;
  try {
    session = await api.create({
      ...capabilityOptions("text"),
      signal,
      initialPrompts: [{ role: "system", content: "Restate an English calculator or conversion request as one short literal command. Preserve all numbers, currencies and units. Never compute or answer. For unrelated requests, return (none)." }],
    });
    const text = (await session.prompt(transcript.slice(0, 300), { signal })).trim().replace(/^["'`]|["'`]$/g, "");
    return text && text.length <= 120 && !/^\(?none\)?$/i.test(text) ? text : null;
  } catch { return null; }
  finally { session?.destroy(); }
}

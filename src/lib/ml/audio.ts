"use client";

import { loadCached, loadTf, saveCached, serial, memo, type LayersModel, type Tf } from "./runtime";

/**
 * Audio classification for voice input (TensorFlow.js).
 *
 * While the on-device speech model is recording, short spectral frames from
 * the microphone are classified as silence, speech, steady noise or a tone.
 * The visitor benefits in two ways: recording stops by itself shortly after
 * they finish speaking, and they are told when background noise is drowning
 * the voice. Only five numbers per frame derived from the live spectrum are
 * kept in memory; no audio is stored, uploaded or even buffered by this code.
 *
 * The classifier is trained in the browser on spectra synthesised from
 * acoustic rules (formant peaks + syllabic modulation for speech, flat
 * spectra for noise, a single narrow peak for tones), so no dataset or model
 * download is needed.
 */
export const AUDIO_CLASSES = ["silence", "speech", "noise", "tone"] as const;
export type AudioClass = (typeof AUDIO_CLASSES)[number];

const BANDS = 20;
const FEATURES = BANDS + 5;
const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value));

/** Spectral shape + level + flatness + centroid + frame-to-frame change. */
export function audioFeatures(bandsDb: number[], absDb: number, relDb: number, delta: number): number[] {
  const peak = Math.max(...bandsDb);
  const shape = bandsDb.map((value) => clamp(1 + (value - peak) / 60));
  const power = bandsDb.map((value) => Math.pow(10, value / 10) + 1e-12);
  const sum = power.reduce((total, value) => total + value, 0);
  const geometric = Math.exp(power.reduce((total, value) => total + Math.log(value), 0) / BANDS);
  const flatness = clamp(geometric / (sum / BANDS));
  const centroid = power.reduce((total, value, index) => total + index * value, 0) / sum / (BANDS - 1);
  return [...shape, clamp((absDb + 90) / 70), clamp(relDb / 40), flatness, centroid, clamp(delta * 4)];
}

/* ------------------------- synthetic training data ------------------------- */

export function rng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function synthesize(kind: AudioClass, random: () => number): number[] {
  const jitter = (amount: number) => (random() - 0.5) * 2 * amount;
  const bands = new Array<number>(BANDS).fill(0);
  let abs: number;
  let rel: number;
  let delta: number;
  if (kind === "silence") {
    abs = -98 + random() * 18;
    for (let index = 0; index < BANDS; index += 1) bands[index] = abs + jitter(3);
    rel = random() * 4;
    delta = random() * 0.04;
  } else if (kind === "noise") {
    abs = -68 + random() * 38;
    const tilt = jitter(0.9);
    for (let index = 0; index < BANDS; index += 1) bands[index] = abs + tilt * (index - BANDS / 2) + jitter(2.5);
    rel = 8 + random() * 22;
    delta = random() * 0.09;
  } else if (kind === "speech") {
    abs = -58 + random() * 30;
    const formants = [3 + random() * 4, 8 + random() * 5, 13 + random() * 4];
    for (let index = 0; index < BANDS; index += 1) {
      const resonance = Math.max(...formants.map((centre, order) => -Math.pow((index - centre) / (1.6 + order * 0.4), 2) * 9 - order * 5));
      const rolloff = index > 16 ? (index - 16) * 7 : 0;
      bands[index] = abs - 12 + resonance - rolloff + jitter(3.5);
    }
    rel = 14 + random() * 26;
    delta = 0.12 + random() * 0.4;
  } else {
    abs = -66 + random() * 30;
    const centre = 2 + random() * (BANDS - 4);
    for (let index = 0; index < BANDS; index += 1) bands[index] = abs - 38 - Math.pow(index - centre, 2) * 6 + jitter(1.5);
    bands[Math.round(centre)] = abs;
    rel = 10 + random() * 24;
    delta = random() * 0.04;
  }
  return audioFeatures(bands, abs, rel, delta);
}

export class AudioClassifier {
  private constructor(private readonly tf: Tf, private readonly model: LayersModel) {}

  static create(): Promise<AudioClassifier | null> {
    return memo("audio", async () => {
      const tf = await loadTf();
      if (!tf) return null;
      const hash = "synthetic-v1";
      const cached = await loadCached(tf, "audio", hash);
      if (cached) return new AudioClassifier(tf, cached.model);
      return serial(async () => {
        const random = rng(2024);
        const perClass = 360;
        const rows: number[] = [];
        const labels: number[] = [];
        AUDIO_CLASSES.forEach((kind, label) => {
          for (let count = 0; count < perClass; count += 1) {
            rows.push(...synthesize(kind, random));
            labels.push(label);
          }
        });
        const xs = tf.tensor2d(rows, [labels.length, FEATURES]);
        const ys = tf.oneHot(tf.tensor1d(labels, "int32"), AUDIO_CLASSES.length);
        const model = tf.sequential({
          layers: [
            tf.layers.dense({ inputShape: [FEATURES], units: 24, activation: "relu", kernelInitializer: tf.initializers.glorotUniform({ seed: 3 }) }),
            tf.layers.dense({ units: AUDIO_CLASSES.length, activation: "softmax", kernelInitializer: tf.initializers.glorotUniform({ seed: 4 }) }),
          ],
        });
        model.compile({ optimizer: tf.train.adam(0.02), loss: "categoricalCrossentropy" });
        try {
          await model.fit(xs, ys, { epochs: 25, batchSize: 64, shuffle: true, verbose: 0 });
        } finally {
          xs.dispose();
          ys.dispose();
        }
        await saveCached("audio", hash, model, null);
        return new AudioClassifier(tf, model);
      });
    });
  }

  classify(features: number[]): number[] {
    const { tf } = this;
    const out = tf.tidy(() => this.model.predict(tf.tensor2d(features, [1, FEATURES])) as ReturnType<typeof tf.tensor>);
    const data = Array.from(out.dataSync());
    out.dispose();
    return data;
  }
}

/* ------------------------------ live monitor ------------------------------ */

export interface AudioMonitorOptions {
  /** The speaker finished: speech was heard, then a sustained pause. */
  onEndpoint?: () => void;
  /** Steady noise dominates and no speech has been heard. */
  onNoisy?: () => void;
  onClass?: (kind: AudioClass) => void;
}
export interface AudioMonitor { dispose(): void }

const FRAME_MS = 80;
const TRAILING_SILENCE_MS = 1400;
const MIN_SPEECH_MS = 400;
const NOISY_MS = 2400;

/** Start classifying a live microphone stream. Resolves to null when unsupported. */
export async function createAudioMonitor(stream: MediaStream, options: AudioMonitorOptions): Promise<AudioMonitor | null> {
  const Context = typeof window === "undefined" ? undefined
    : window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return null;
  const classifier = await AudioClassifier.create();
  if (!classifier) return null;

  let context: AudioContext;
  try { context = new Context(); } catch { return null; }
  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.3;
  analyser.minDecibels = -110;
  const source = context.createMediaStreamSource(stream);
  source.connect(analyser); // analysis only: never connected to the speakers
  void context.resume().catch(() => undefined);

  const bins = new Float32Array(analyser.frequencyBinCount);
  const nyquist = context.sampleRate / 2;
  const edges = Array.from({ length: BANDS + 1 }, (_, index) => 80 * Math.pow(Math.min(7600, nyquist * 0.95) / 80, index / BANDS));
  const binOf = (hz: number) => Math.min(bins.length - 1, Math.max(1, Math.round((hz / nyquist) * bins.length)));
  const recent: number[] = [];
  let previousAbs = -100;
  let smoothed = [1, 0, 0, 0];
  let speechMs = 0;
  let quietMs = 0;
  let noisyMs = 0;
  let heardSpeech = false;
  let endpointed = false;
  let warned = false;
  let lastKind: AudioClass = "silence";

  const timer = setInterval(() => {
    analyser.getFloatFrequencyData(bins);
    const bandsDb = new Array<number>(BANDS);
    let total = 0;
    for (let band = 0; band < BANDS; band += 1) {
      const from = binOf(edges[band]);
      const to = Math.max(from + 1, binOf(edges[band + 1]));
      let power = 0;
      for (let bin = from; bin < to; bin += 1) power += Math.pow(10, bins[bin] / 10);
      power /= to - from;
      total += power;
      bandsDb[band] = 10 * Math.log10(power + 1e-12);
    }
    const abs = 10 * Math.log10(total / BANDS + 1e-12);
    recent.push(abs);
    if (recent.length > 40) recent.shift();
    const floor = Math.min(...recent);
    const probabilities = classifier.classify(audioFeatures(bandsDb, abs, abs - floor, Math.abs(abs - previousAbs) / 20));
    previousAbs = abs;
    smoothed = smoothed.map((value, index) => value * 0.6 + probabilities[index] * 0.4);
    const top = smoothed.indexOf(Math.max(...smoothed));
    const kind = AUDIO_CLASSES[top];
    if (kind !== lastKind) { lastKind = kind; options.onClass?.(kind); }

    // "Quiet" means nothing new is happening: classified silence, or a level
    // that has fallen back to the rolling noise floor (which also covers a
    // steady background hum). Loud frames the model is unsure about are
    // neutral, so a misread syllable can never end the recording early.
    const nearFloor = abs - floor < 6;
    if (kind === "speech" && smoothed[top] > 0.5) {
      speechMs += FRAME_MS;
      quietMs = 0;
      if (speechMs >= MIN_SPEECH_MS) heardSpeech = true;
    } else if (heardSpeech && (kind === "silence" || nearFloor)) {
      quietMs += FRAME_MS;
      if (quietMs >= TRAILING_SILENCE_MS && !endpointed) {
        endpointed = true;
        options.onEndpoint?.();
      }
    }
    if (kind === "noise" && smoothed[top] > 0.6 && !heardSpeech) {
      noisyMs += FRAME_MS;
      if (noisyMs >= NOISY_MS && !warned) { warned = true; options.onNoisy?.(); }
    } else if (kind !== "noise") noisyMs = Math.max(0, noisyMs - FRAME_MS);
  }, FRAME_MS);

  return {
    dispose() {
      clearInterval(timer);
      try { source.disconnect(); } catch { /* already disconnected */ }
      void context.close().catch(() => undefined);
    },
  };
}

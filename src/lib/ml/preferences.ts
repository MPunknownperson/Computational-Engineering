"use client";

import { readJson, loadTf, writeJson } from "./runtime";

/**
 * Personalised tool defaults (TensorFlow.js, traditional machine learning).
 *
 * Each time a visitor completes a conversion the tool records a tiny local
 * event: which tool, which option, the hour bucket, weekday/weekend and which
 * tool was used just before. A softmax-regression model trained on those
 * events — in the browser, on demand — predicts which option the visitor is
 * likely to want next. Tools use the prediction to open on the visitor's
 * usual choice and to offer quick "Your usual" picks.
 *
 * Nothing leaves the device and nothing is shared between visitors.
 */
export type PreferenceTool = "units" | "currency";
const TOOLS = ["units", "currency", "none"] as const;
const MIN_EVENTS = 3;
const MAX_PER_TOOL = 120;
const MAX_EVENTS = 300;

interface UseEvent { tool: string; label: string; t: number; prev: string }
export interface PreferencePick { label: string; probability: number }

function events(): UseEvent[] {
  const list = readJson<UseEvent[]>("use", []);
  return Array.isArray(list) ? list.filter((item) => typeof item?.tool === "string" && typeof item.label === "string") : [];
}

export function recordUse(tool: PreferenceTool, label: string) {
  const list = events();
  const prev = list.at(-1)?.tool ?? "none";
  list.push({ tool, label, t: Date.now(), prev });
  const own = list.filter((item) => item.tool === tool);
  const trimmed = own.length > MAX_PER_TOOL ? list.filter((item) => item.tool !== tool || own.indexOf(item) >= own.length - MAX_PER_TOOL) : list;
  writeJson("use", trimmed.slice(-MAX_EVENTS));
}

function features(at: number, prev: string): number[] {
  const date = new Date(at);
  const hour = date.getHours();
  const weekend = date.getDay() === 0 || date.getDay() === 6 ? 1 : 0;
  const buckets = [0, 0, 0, 0, 0, 0].map((_, bucket) => {
    // Soft one-hot over six 4-hour windows, so 3:59 and 4:01 look alike.
    const centre = bucket * 4 + 2;
    const distance = Math.min(Math.abs(hour + date.getMinutes() / 60 - centre), 24 - Math.abs(hour + date.getMinutes() / 60 - centre));
    return Math.exp(-(distance * distance) / 18);
  });
  return [...buckets, weekend, ...TOOLS.map((name) => (name === prev ? 1 : 0))];
}

/** Ranked options this visitor is likely to choose now, or [] when unsure. */
export async function predictUse(tool: PreferenceTool, at = Date.now()): Promise<PreferencePick[]> {
  const all = events();
  const own = all.filter((item) => item.tool === tool);
  // Too little behaviour to learn from: say nothing rather than guess.
  if (own.length < MIN_EVENTS) return [];
  const labels = Array.from(new Set(own.map((item) => item.label)));
  const prev = all.at(-1)?.tool ?? "none";
  const tf = await loadTf();
  if (!tf) return [];

  const xs = tf.tensor2d(own.map((item) => features(item.t, item.prev)));
  const ys = tf.oneHot(tf.tensor1d(own.map((item) => labels.indexOf(item.label)), "int32"), labels.length);
  const model = tf.sequential({
    layers: [tf.layers.dense({
      inputShape: [features(at, prev).length], units: labels.length, activation: "softmax",
      kernelInitializer: tf.initializers.zeros(), biasInitializer: tf.initializers.zeros(),
    })],
  });
  try {
    model.compile({ optimizer: tf.train.adam(0.1), loss: "categoricalCrossentropy" });
    await model.fit(xs, ys, { epochs: 60, batchSize: 32, shuffle: false, verbose: 0 });
    const out = tf.tidy(() => model.predict(tf.tensor2d([features(at, prev)])) as ReturnType<typeof tf.tensor>);
    const data = out.dataSync();
    out.dispose();
    return labels
      .map((label, index) => ({ label, probability: data[index] }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 3);
  } finally {
    xs.dispose();
    ys.dispose();
    model.dispose();
  }
}

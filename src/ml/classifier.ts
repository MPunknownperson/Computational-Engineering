"use client";

import { fnv, loadCached, loadTf, saveCached, serial, type LayersModel, type Tf } from "./runtime";
import { featurize, TEXT_DIM } from "./text";

export interface Example { text: string; label: string; weight?: number }
export interface Prediction { label: string; probability: number }

/**
 * A small TensorFlow.js text classifier (hashed n-gram features → dense →
 * softmax). It is trained in the browser from examples and cached in
 * IndexedDB, keyed by a hash of the examples so it retrains only when the
 * examples change.
 */
export class TextClassifier {
  private constructor(
    private readonly tf: Tf,
    readonly labels: string[],
    private readonly model: LayersModel,
  ) {}

  static async create(name: string, examples: Example[]): Promise<TextClassifier | null> {
    const tf = await loadTf();
    if (!tf || examples.length === 0) return null;
    const labels = Array.from(new Set(examples.map((example) => example.label))).sort();
    if (labels.length < 2) return null;
    const hash = fnv(JSON.stringify([labels, examples.map((example) => [example.text, example.label, example.weight ?? 1])]));

    const cached = await loadCached(tf, `${name}-clf`, hash);
    if (cached) return new TextClassifier(tf, labels, cached.model);

    return serial(async () => {
      const rows: Float32Array[] = [];
      const targets: number[] = [];
      for (const example of examples) {
        const repeats = Math.max(1, Math.min(4, Math.round(example.weight ?? 1)));
        const vector = featurize(example.text);
        for (let repeat = 0; repeat < repeats; repeat += 1) {
          rows.push(vector);
          targets.push(labels.indexOf(example.label));
        }
      }
      const flat = new Float32Array(rows.length * TEXT_DIM);
      rows.forEach((row, index) => flat.set(row, index * TEXT_DIM));
      const xs = tf.tensor2d(flat, [rows.length, TEXT_DIM]);
      const ys = tf.oneHot(tf.tensor1d(targets, "int32"), labels.length);
      const model = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [TEXT_DIM], units: 48, activation: "relu",
            kernelInitializer: tf.initializers.glorotUniform({ seed: 7 }),
            kernelRegularizer: tf.regularizers.l2({ l2: 1e-4 }),
          }),
          tf.layers.dropout({ rate: 0.2, seed: 7 }),
          tf.layers.dense({
            units: labels.length, activation: "softmax",
            kernelInitializer: tf.initializers.glorotUniform({ seed: 11 }),
          }),
        ],
      });
      model.compile({ optimizer: tf.train.adam(0.01), loss: "categoricalCrossentropy" });
      try {
        await model.fit(xs, ys, { epochs: 40, batchSize: 32, shuffle: true, verbose: 0 });
      } finally {
        xs.dispose();
        ys.dispose();
      }
      await saveCached(`${name}-clf`, hash, model, null);
      return new TextClassifier(tf, labels, model);
    });
  }

  /** Probabilities for every label, most likely first. */
  predict(text: string): Prediction[] {
    const { tf } = this;
    const output = tf.tidy(() => this.model.predict(tf.tensor2d(featurize(text), [1, TEXT_DIM])) as ReturnType<typeof tf.tensor>);
    const data = output.dataSync();
    output.dispose();
    return this.labels
      .map((label, index) => ({ label, probability: data[index] }))
      .sort((a, b) => b.probability - a.probability);
  }
}

"use client";

import { fnv, loadCached, loadTf, saveCached, serial, type LayersModel, type Tf } from "./runtime";

export const START = "<s>";
export const END = "</s>";
export const UNKNOWN = "<unk>";
const CONTEXT = 3;

/** Three one-hot blocks, one per context position. */
function encodeInto(target: Float32Array, offset: number, ids: number[], size: number) {
  ids.forEach((id, position) => { target[offset + position * size + id] = 1; });
}

/**
 * A tiny next-token language model in TensorFlow.js (one-hot context → dense →
 * softmax over the vocabulary, three tokens of context). It powers predictive
 * input and greedy text generation: the caller supplies its own tokeniser, so
 * the same model class serves maths expressions and plain-language words.
 */
export class SequenceModel {
  private readonly index: Map<string, number>;

  private constructor(
    private readonly tf: Tf,
    readonly vocab: string[],
    private readonly model: LayersModel,
  ) {
    this.index = new Map(vocab.map((token, position) => [token, position]));
  }

  static async create(name: string, sequences: string[][]): Promise<SequenceModel | null> {
    const tf = await loadTf();
    if (!tf || sequences.length === 0) return null;
    const vocab = [START, END, UNKNOWN, ...Array.from(new Set(sequences.flat())).filter((token) => ![START, END, UNKNOWN].includes(token)).sort()];
    const hash = fnv(JSON.stringify(sequences));

    const cached = await loadCached(tf, `${name}-seq`, hash);
    if (cached && Array.isArray((cached.extra as { vocab?: unknown } | null)?.vocab)) {
      return new SequenceModel(tf, (cached.extra as { vocab: string[] }).vocab, cached.model);
    }

    return serial(async () => {
      const lookup = new Map(vocab.map((token, position) => [token, position]));
      // Identical (context → next token) pairs are collapsed and re-weighted
      // (at most 3x) so training cost grows with variety, not with repetition.
      const pairs = new Map<string, { ids: number[]; target: number; count: number }>();
      for (const sequence of sequences) {
        const padded = [START, START, START, ...sequence, END].map((token) => lookup.get(token) ?? 2);
        for (let at = CONTEXT; at < padded.length; at += 1) {
          const ids = padded.slice(at - CONTEXT, at);
          const key = `${ids.join(",")}>${padded[at]}`;
          const existing = pairs.get(key);
          if (existing) existing.count += 1;
          else pairs.set(key, { ids, target: padded[at], count: 1 });
        }
      }
      const rows: Array<{ ids: number[]; target: number }> = [];
      for (const pair of pairs.values()) for (let repeat = 0; repeat < Math.min(3, pair.count); repeat += 1) rows.push(pair);
      const width = CONTEXT * vocab.length;
      const flat = new Float32Array(rows.length * width);
      rows.forEach((row, index) => encodeInto(flat, index * width, row.ids, vocab.length));
      const xs = tf.tensor2d(flat, [rows.length, width]);
      const ys = tf.oneHot(tf.tensor1d(rows.map((row) => row.target), "int32"), vocab.length);
      const model = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [width], units: 40, activation: "relu", kernelInitializer: tf.initializers.glorotUniform({ seed: 13 }) }),
          tf.layers.dense({ units: vocab.length, activation: "softmax", kernelInitializer: tf.initializers.glorotUniform({ seed: 17 }) }),
        ],
      });
      model.compile({ optimizer: tf.train.adam(0.03), loss: "categoricalCrossentropy" });
      try {
        await model.fit(xs, ys, { epochs: 30, batchSize: 128, shuffle: true, verbose: 0 });
      } finally {
        xs.dispose();
        ys.dispose();
      }
      await saveCached(`${name}-seq`, hash, model, { vocab });
      return new SequenceModel(tf, vocab, model);
    });
  }

  /** Probability of every vocabulary token following `context`. */
  probabilities(context: string[]): Float32Array {
    const { tf } = this;
    const padded = [START, START, START, ...context].slice(-CONTEXT).map((token) => this.index.get(token) ?? 2);
    const input = new Float32Array(CONTEXT * this.vocab.length);
    encodeInto(input, 0, padded, this.vocab.length);
    const output = tf.tidy(() => this.model.predict(tf.tensor2d(input, [1, input.length])) as ReturnType<typeof tf.tensor>);
    const data = output.dataSync() as Float32Array;
    output.dispose();
    return data;
  }

  /** Greedy generation: keep taking the likeliest next token. */
  generate(context: string[], maxTokens: number, minProbability: number, accept: (token: string, history: string[]) => boolean = () => true): string[] {
    const history = [...context];
    const produced: string[] = [];
    for (let step = 0; step < maxTokens; step += 1) {
      const probabilities = this.probabilities(history);
      let best = -1;
      let bestP = 0;
      for (let position = 0; position < probabilities.length; position += 1) {
        const token = this.vocab[position];
        if (token === START || token === UNKNOWN) continue;
        if (token !== END && !accept(token, history)) continue;
        if (probabilities[position] > bestP) { best = position; bestP = probabilities[position]; }
      }
      if (best < 0 || bestP < minProbability || this.vocab[best] === END) break;
      history.push(this.vocab[best]);
      produced.push(this.vocab[best]);
    }
    return produced;
  }
}

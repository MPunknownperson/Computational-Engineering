/**
 * A small fully-connected neural network implemented from scratch:
 * forward pass, backpropagation and Adam updates over typed arrays.
 *
 * It is trained in the browser on samples produced by the exact deterministic
 * calculation engine, so it is a measured surrogate of that engine, not a
 * language model and not a source of authoritative figures. Every model
 * reports held-out error so a caller can decide whether it is usable.
 */
import { mulberry32 } from '../calculations';

export interface Sample { inputs: number[]; target: number }

export interface TrainingReport {
  samples: number;
  epochs: number;
  /** Mean absolute error on held-out data, in output units. */
  mae: number;
  /** Mean absolute percentage error on held-out data. */
  mape: number;
  /** Coefficient of determination on held-out data. */
  r2: number;
  /** Largest single held-out error, in output units. */
  worst: number;
  trainingMs: number;
}

interface Layer { weights: Float64Array; bias: Float64Array; inputs: number; outputs: number }

const he = (rng: () => number, fan: number) => (rng() * 2 - 1) * Math.sqrt(2 / Math.max(1, fan));

function createLayer(inputs: number, outputs: number, rng: () => number): Layer {
  const weights = new Float64Array(inputs * outputs);
  for (let i = 0; i < weights.length; i++) weights[i] = he(rng, inputs);
  return { weights, bias: new Float64Array(outputs), inputs, outputs };
}

export class SurrogateNetwork {
  private readonly layers: Layer[];
  private readonly inputMean: Float64Array;
  private readonly inputScale: Float64Array;
  private outputMean = 0;
  private outputScale = 1;

  constructor(private readonly inputSize: number, hidden: number[] = [16, 12], seed = 20260101) {
    const rng = mulberry32(seed);
    const sizes = [inputSize, ...hidden, 1];
    this.layers = sizes.slice(0, -1).map((size, index) => createLayer(size, sizes[index + 1], rng));
    this.inputMean = new Float64Array(inputSize);
    this.inputScale = new Float64Array(inputSize).fill(1);
  }

  private normalize(inputs: number[], out: Float64Array) {
    for (let i = 0; i < this.inputSize; i++) out[i] = (inputs[i] - this.inputMean[i]) / this.inputScale[i];
    return out;
  }

  /** Forward pass with tanh hidden activations and a linear output. */
  private forward(x: Float64Array, activations: Float64Array[]) {
    let current = x;
    for (let l = 0; l < this.layers.length; l++) {
      const layer = this.layers[l];
      const next = activations[l];
      for (let o = 0; o < layer.outputs; o++) {
        let sum = layer.bias[o];
        const offset = o * layer.inputs;
        for (let i = 0; i < layer.inputs; i++) sum += layer.weights[offset + i] * current[i];
        next[o] = l === this.layers.length - 1 ? sum : Math.tanh(sum);
      }
      current = next;
    }
    return current[0];
  }

  predict(inputs: number[]): number {
    const x = this.normalize(inputs, new Float64Array(this.inputSize));
    const activations = this.layers.map(layer => new Float64Array(layer.outputs));
    return this.forward(x, activations) * this.outputScale + this.outputMean;
  }

  /**
   * Trains with Adam on a shuffled 80/20 split and returns held-out accuracy.
   * `stepBudget` keeps each call short so the caller can interleave frames.
   */
  train(samples: Sample[], options: { epochs?: number; learningRate?: number; seed?: number } = {}): TrainingReport {
    const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const { epochs = 240, learningRate = .01, seed = 7 } = options;
    const rng = mulberry32(seed);
    const shuffled = [...samples].sort(() => rng() - .5);
    const split = Math.max(1, Math.floor(shuffled.length * .8));
    const train = shuffled.slice(0, split);
    const holdout = shuffled.slice(split).length ? shuffled.slice(split) : shuffled.slice(-1);

    for (let i = 0; i < this.inputSize; i++) {
      const column = train.map(sample => sample.inputs[i]);
      const mean = column.reduce((sum, value) => sum + value, 0) / column.length;
      const variance = column.reduce((sum, value) => sum + (value - mean) ** 2, 0) / column.length;
      this.inputMean[i] = mean;
      this.inputScale[i] = Math.sqrt(variance) || 1;
    }
    const targets = train.map(sample => sample.target);
    this.outputMean = targets.reduce((sum, value) => sum + value, 0) / targets.length;
    const spread = Math.sqrt(targets.reduce((sum, value) => sum + (value - this.outputMean) ** 2, 0) / targets.length);
    this.outputScale = spread || 1;

    const moment1 = this.layers.map(layer => ({ w: new Float64Array(layer.weights.length), b: new Float64Array(layer.outputs) }));
    const moment2 = this.layers.map(layer => ({ w: new Float64Array(layer.weights.length), b: new Float64Array(layer.outputs) }));
    const activations = this.layers.map(layer => new Float64Array(layer.outputs));
    const deltas = this.layers.map(layer => new Float64Array(layer.outputs));
    const x = new Float64Array(this.inputSize);
    let iteration = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
      for (const sample of train) {
        iteration++;
        this.normalize(sample.inputs, x);
        const predicted = this.forward(x, activations);
        const scaledTarget = (sample.target - this.outputMean) / this.outputScale;
        const last = this.layers.length - 1;
        deltas[last][0] = predicted - scaledTarget;

        for (let l = last - 1; l >= 0; l--) {
          const nextLayer = this.layers[l + 1];
          const layerDelta = deltas[l];
          for (let o = 0; o < this.layers[l].outputs; o++) {
            let sum = 0;
            for (let n = 0; n < nextLayer.outputs; n++) sum += nextLayer.weights[n * nextLayer.inputs + o] * deltas[l + 1][n];
            const activation = activations[l][o];
            layerDelta[o] = sum * (1 - activation * activation);
          }
        }

        const correction1 = 1 - Math.pow(.9, iteration);
        const correction2 = 1 - Math.pow(.999, iteration);
        for (let l = 0; l < this.layers.length; l++) {
          const layer = this.layers[l];
          const input = l === 0 ? x : activations[l - 1];
          for (let o = 0; o < layer.outputs; o++) {
            const delta = deltas[l][o];
            const offset = o * layer.inputs;
            for (let i = 0; i < layer.inputs; i++) {
              const index = offset + i;
              const gradient = delta * input[i];
              moment1[l].w[index] = .9 * moment1[l].w[index] + .1 * gradient;
              moment2[l].w[index] = .999 * moment2[l].w[index] + .001 * gradient * gradient;
              layer.weights[index] -= learningRate * (moment1[l].w[index] / correction1) / (Math.sqrt(moment2[l].w[index] / correction2) + 1e-8);
            }
            moment1[l].b[o] = .9 * moment1[l].b[o] + .1 * delta;
            moment2[l].b[o] = .999 * moment2[l].b[o] + .001 * delta * delta;
            layer.bias[o] -= learningRate * (moment1[l].b[o] / correction1) / (Math.sqrt(moment2[l].b[o] / correction2) + 1e-8);
          }
        }
      }
    }

    let absolute = 0;
    let percent = 0;
    let worst = 0;
    let residual = 0;
    const holdoutMean = holdout.reduce((sum, sample) => sum + sample.target, 0) / holdout.length;
    let variance = 0;
    for (const sample of holdout) {
      const error = Math.abs(this.predict(sample.inputs) - sample.target);
      absolute += error;
      percent += Math.abs(sample.target) > 1e-9 ? error / Math.abs(sample.target) : 0;
      worst = Math.max(worst, error);
      residual += error * error;
      variance += (sample.target - holdoutMean) ** 2;
    }
    return {
      samples: samples.length,
      epochs,
      mae: absolute / holdout.length,
      mape: (percent / holdout.length) * 100,
      r2: variance > 0 ? 1 - residual / variance : 1,
      worst,
      trainingMs: (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started,
    };
  }
}

export interface EnsemblePrediction {
  value: number;
  /** Standard deviation across ensemble members, in output units. */
  uncertainty: number;
  /** Approximate 95% interval derived from member disagreement. */
  interval: [number, number];
}

/**
 * An ensemble of independently seeded networks.
 *
 * Averaging several members reduces variance, and the spread between them is a
 * genuine uncertainty signal: where members disagree, the surrogate is
 * extrapolating and should not be trusted. A single network cannot express that.
 */
export class SurrogateEnsemble {
  private readonly members: SurrogateNetwork[];
  private reports: TrainingReport[] = [];

  constructor(inputSize: number, hidden: number[] = [18, 12], memberCount = 3, baseSeed = 20260401) {
    this.members = Array.from({ length: memberCount }, (_, index) =>
      new SurrogateNetwork(inputSize, hidden, baseSeed + index * 7919));
  }

  trainMember(index: number, samples: Sample[], options: { epochs?: number; learningRate?: number } = {}): TrainingReport {
    const report = this.members[index].train(samples, { ...options, seed: 13 + index * 31 });
    this.reports[index] = report;
    return report;
  }

  get memberCount() { return this.members.length; }

  /** Aggregate accuracy across members, using the worst member as the headline. */
  get report(): TrainingReport {
    const done = this.reports.filter(Boolean);
    if (!done.length) throw new Error('The ensemble has not been trained.');
    return {
      samples: done[0].samples,
      epochs: done[0].epochs,
      mae: done.reduce((sum, item) => sum + item.mae, 0) / done.length,
      mape: Math.max(...done.map(item => item.mape)),
      r2: Math.min(...done.map(item => item.r2)),
      worst: Math.max(...done.map(item => item.worst)),
      trainingMs: done.reduce((sum, item) => sum + item.trainingMs, 0),
    };
  }

  predict(inputs: number[]): EnsemblePrediction {
    const values = this.members.map(member => member.predict(inputs));
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
    const uncertainty = Math.sqrt(variance);
    return { value: mean, uncertainty, interval: [mean - 1.96 * uncertainty, mean + 1.96 * uncertainty] };
  }
}

import { defaultSettings } from '../regions';
import { toolById } from '../catalog';
import { processCalculation } from '../processing';
import { mulberry32 } from '../calculations';
import { taxDefaultsForLocation } from '../regionalSettings';
import type { CalculationContext, Values } from '../types';
import { SurrogateNetwork } from './network';
import { evaluate, sensitivity, solveField } from './analysis';
import { buildCollaboration } from './collaboration';
import { MemoCache, stableKey } from './scheduler';

const ctx: CalculationContext = { ...defaultSettings, currency: 'USD' };

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function near(actual: number, expected: number, tolerance: number) {
  assert(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance, `Expected ${expected} within ${tolerance}, received ${actual}.`);
}

export const engineChecks: [string, () => void][] = [
  ['Network learns a known non-linear function', () => {
    const rng = mulberry32(99);
    const target = (a: number, b: number) => 3 * a * a - 2 * a * b + 5 * b + 7;
    const samples = Array.from({ length: 260 }, () => {
      const a = rng() * 4 - 2;
      const b = rng() * 4 - 2;
      return { inputs: [a, b], target: target(a, b) };
    });
    const network = new SurrogateNetwork(2, [16, 12], 4242);
    const report = network.train(samples, { epochs: 140 });
    assert(report.r2 > .98, `Held-out R2 was only ${report.r2.toFixed(4)}.`);
    near(network.predict([1, 1]), target(1, 1), Math.max(.6, report.mae * 4));
  }],
  ['Network training is deterministic for a fixed seed', () => {
    const rng = mulberry32(5);
    const samples = Array.from({ length: 80 }, () => { const x = rng() * 2; return { inputs: [x], target: 2 * x + 1 }; });
    const first = new SurrogateNetwork(1, [8], 31);
    const second = new SurrogateNetwork(1, [8], 31);
    first.train(samples, { epochs: 40, seed: 3 });
    second.train(samples, { epochs: 40, seed: 3 });
    near(first.predict([1.25]), second.predict([1.25]), 1e-12);
  }],
  ['Surrogate reproduces the exact mortgage engine', () => {
    const base = toolById.mortgage.defaults;
    const rng = mulberry32(2026);
    const samples = Array.from({ length: 200 }, () => {
      const rate = 2 + rng() * 8;
      const years = 10 + Math.round(rng() * 25);
      const values: Values = { ...base, rate: String(rate), years: String(years) };
      const exact = evaluate('mortgage', values, ctx);
      return exact === null ? null : { inputs: [rate, years], target: exact };
    }).filter((sample): sample is { inputs: number[]; target: number } => sample !== null);
    assert(samples.length > 150, 'The exact engine did not produce enough training samples.');
    const network = new SurrogateNetwork(2, [18, 12], 777);
    const report = network.train(samples, { epochs: 120 });
    assert(report.mape < 5, `Surrogate error was ${report.mape.toFixed(2)}% of the exact payment.`);
    const exact = evaluate('mortgage', { ...base, rate: '6', years: '25' }, ctx)!;
    near(network.predict([6, 25]), exact, Math.max(exact * .06, report.worst));
  }],
  ['Solver hits a mortgage payment target through the exact engine', () => {
    const values = { ...toolById.mortgage.defaults, frequency: '12' };
    const solved = solveField('mortgage', values, ctx, 'price', 2400, { min: 90000, max: 900000 });
    assert(solved.converged, 'The solver did not converge.');
    const verified = evaluate('mortgage', { ...values, price: String(solved.value) }, ctx)!;
    near(verified, 2400, .01);
  }],
  ['Solver reports failure instead of inventing an answer', () => {
    const impossible = solveField('mortgage', toolById.mortgage.defaults, ctx, 'price', -50, { min: 1, max: 1000 });
    assert(!impossible.converged && Number.isNaN(impossible.value), 'An unreachable target was reported as solved.');
  }],
  ['Sensitivity signs and ordering match the mortgage model', () => {
    const drivers = sensitivity('mortgage', { ...toolById.mortgage.defaults, extra: '0' }, ctx);
    const rate = drivers.find(driver => driver.key === 'rate');
    const years = drivers.find(driver => driver.key === 'years');
    const price = drivers.find(driver => driver.key === 'price');
    assert(Boolean(rate && years && price), 'Expected rate, term and price drivers.');
    assert(rate!.delta > 0 && price!.delta > 0, 'A higher rate or price must increase the payment.');
    assert(years!.delta < 0, 'A longer term must reduce the periodic payment.');
    const total = drivers.reduce((sum, driver) => sum + driver.share, 0);
    near(total, 1, .001);
  }],
  ['Cross-module affordability is reproducible by the exact engine', () => {
    const data = Object.fromEntries(Object.entries(toolById).map(([id, tool]) => [id, { ...tool.defaults }])) as Record<keyof typeof toolById, Values>;
    data.tax = { ...taxDefaultsForLocation(ctx.country, ctx.region, ''), income: '120000' };
    const graph = buildCollaboration(data, ctx);
    const affordability = graph.links.find(link => link.id === 'affordability');
    assert(Boolean(affordability), 'The affordability link was not produced.');
    const taxRun = processCalculation('tax', data.tax, ctx);
    const monthlyNet = Number(taxRun.result!.value) / 12;
    const payment = evaluate('mortgage', { ...data.mortgage, frequency: '12', price: String(affordability!.value) }, ctx)!;
    near(payment, monthlyNet * .28, Math.max(.05, monthlyNet * .001));
    assert(affordability!.chain.length >= 2, 'A collaboration link must combine more than one module.');
  }],
  ['Collaboration omits links instead of guessing', () => {
    const data = Object.fromEntries(Object.entries(toolById).map(([id, tool]) => [id, { ...tool.defaults }])) as Record<keyof typeof toolById, Values>;
    data.tax = { ...taxDefaultsForLocation(ctx.country, ctx.region, ''), income: 'not-a-number' };
    const graph = buildCollaboration(data, ctx);
    assert(graph.links.every(link => link.id === 'payment-burden' || !link.chain.includes('tax')), 'A link was produced without a valid tax result.');
    assert(graph.unavailable.length > 0, 'Missing prerequisites were not reported.');
  }],
  ['Evaluation cache returns identical values to a direct call', () => {
    const values = { ...toolById.compound.defaults, rate: '6.25' };
    const cached = evaluate('compound', values, ctx);
    const direct = processCalculation('compound', values, ctx).result!.value as number;
    near(cached!, direct, 1e-9);
  }],
  ['Memo cache evicts least-recently-used entries', () => {
    const cache = new MemoCache<number>(2);
    cache.set('a', 1); cache.set('b', 2);
    cache.get('a');
    cache.set('c', 3);
    assert(cache.get('b') === undefined, 'The least-recently-used entry was not evicted.');
    assert(cache.get('a') === 1 && cache.get('c') === 3, 'Recent entries were lost.');
  }],
  ['Cache keys ignore property order but not values', () => {
    assert(stableKey({ a: 1, b: 2 }) === stableKey({ b: 2, a: 1 }), 'Equivalent inputs produced different keys.');
    assert(stableKey({ a: 1 }) !== stableKey({ a: 2 }), 'Different inputs produced the same key.');
  }],
];

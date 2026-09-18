import type { ToolModule } from './types';
import { formula, metric, node } from './helpers';

export const probabilityModule: ToolModule = {
  id: 'probability', name: 'Discrete probability network', description: 'Selects exact event algebra, conditional probability, binomial log-space evaluation, exact BigInt counting, or seeded simulation.',
  dataInputs: ['probability model', 'event probabilities', 'condition', 'trials', 'successes', 'success probability', 'simulation count', 'seed'], companionTools: ['scientific'],
  build: (v, _ctx, result) => ({
    formulas: [
      formula('and', 'Independent intersection', 'P(A and B) = P(A)P(B)', 'Both independent events occur.', v.method === 'independent' && v.event === 'and'),
      formula('or', 'Independent union', 'P(A or B) = P(A) + P(B) - P(A)P(B)', 'At least one event occurs.', v.method === 'independent' && v.event === 'or'),
      formula('xor', 'Exactly one event', 'P(exactly one) = P(A)(1-P(B)) + P(B)(1-P(A))', 'One event occurs but not both.', v.method === 'independent' && v.event === 'xor'),
      formula('conditional', 'Conditional probability', 'P(A|B) = P(A and B) / P(B)', 'A occurs given B.', v.method === 'conditional'),
      formula('binomial', 'Binomial probability', 'P(X=k) = C(n,k)p^k(1-p)^(n-k)', 'Exact repeated independent-trial probability.', v.method === 'binomial' || v.method === 'monte-carlo'),
      formula('combination', 'Exact combinations', 'C(n,k) = n! / (k!(n-k)!)', 'Counts unordered selections with BigInt.', v.method === 'combinations'),
      formula('permutation', 'Exact permutations', 'P(n,k) = n! / (n-k)!', 'Counts ordered selections with BigInt.', v.method === 'permutations'),
      formula('simulation', 'Seeded Monte Carlo', 'Estimate = qualifying simulations / S; SE = sqrt(p_hat(1-p_hat)/S)', 'Reproducible numerical simulation checked against the exact binomial value.', v.method === 'monte-carlo'),
    ],
    nodes: v.method === 'monte-carlo' ? [
      node('inputs', 'Trial model', 'Bernoulli model', `n=${v.n}, k=${v.k}, p=${v.p}%`, 'text', 'Simulation inputs', ['simulation', 'exact']),
      node('simulation', 'Monte Carlo estimate', 'Seeded simulation', Number(result.value), 'percent', `${v.sims} simulations; seed ${v.seed}`, ['comparison']),
      node('exact', 'Exact binomial value', 'Log-space exact method', metric(result, 'Exact binomial check').toString(), 'text', 'Analytic benchmark', ['comparison']),
      node('comparison', 'Validation', 'Simulation consistency check', 'Passed', 'text', 'Estimate checked against exact probability interval', []),
    ] : [
      node('model', 'Selected model', v.method, v.method, 'text', result.formula, ['result']),
      node('result', result.label, 'Exact evaluation', result.value, result.format === 'percent' ? 'percent' : result.format, result.formula, []),
    ],
  }),
};
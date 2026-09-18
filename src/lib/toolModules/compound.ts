import type { ToolModule } from './types';
import { formula, metric, node } from './helpers';

export const compoundModule: ToolModule = {
  id: 'compound', name: 'Time-value and real-return network', description: 'Separates deposit timing, growth convention, contribution cadence, fees, inflation, and purchasing power.',
  dataInputs: ['principal', 'contribution', 'contribution cadence', 'timing', 'rate', 'frequency', 'years', 'fees', 'inflation'], companionTools: ['tax', 'currency', 'mortgage'],
  build: (v, _ctx, result) => ({
    formulas: [
      formula('net-rate', 'Net annual return', 'r_net = expected return - annual expense ratio', 'Removes recurring fees from the growth assumption.'),
      formula('periodic-rate', 'Equivalent monthly rate', 'i = (1 + r_net / n)^(n/12) - 1', 'Converts the compounding convention to monthly simulation.', v.method === 'compound'),
      formula('compound', 'Compound future value', 'FV = P(1+i)^t + C((1+i)^t - 1)/i', 'Principal growth plus an ordinary annuity.', v.method === 'compound'),
      formula('annuity-due', 'Beginning-period contribution', 'FV_due = FV_ordinary x (1+i)', 'Applies when deposits occur at period start.', v.timing === 'beginning' && v.method !== 'simple'),
      formula('continuous', 'Continuous growth', 'FV = P e^(rt), with discrete contributions added by period', 'Uses continuous growth for balances.', v.method === 'continuous'),
      formula('simple', 'Simple interest', 'FV = P(1+rt) + contributions + simple interest by holding period', 'Does not compound earned interest.', v.method === 'simple'),
      formula('real', 'Inflation-adjusted value', 'Real FV = nominal FV / (1 + inflation)^years', 'Estimates purchasing power in today’s money.'),
    ],
    nodes: [
      node('principal', 'Starting principal', 'Initial capital', Number(v.principal), 'money', 'Opening balance', ['growth']),
      node('contributions', 'Total contributions', `${v.contribFreq} deposits`, Number(metric(result, 'Total invested')) - Number(v.principal), 'money', `${v.timing}-of-period deposits`, ['growth']),
      node('growth', 'Nominal future value', v.method, Number(result.value), 'money', result.formula, ['real']),
      node('real', 'Inflation-adjusted value', 'Purchasing-power transform', Number(metric(result, "In today's money")), 'money', `Deflated by ${v.inflation}% for ${v.years} years`, []),
    ],
  }),
};
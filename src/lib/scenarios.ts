import type { ToolId, Values } from './types';

export interface ScenarioPreset {
  id: string;
  label: string;
  hint: string;
  values: Values;
}

/**
 * Ready-made starting points for each tool. A preset is a set of inputs, not a
 * different formula: the same processing pipeline and validation apply after it
 * is loaded, so users can start quickly and then override any variable.
 */
export const scenarioPresets: Record<ToolId, ScenarioPreset[]> = {
  mortgage: [
    { id: 'standard', label: 'Standard 30-year', hint: 'Fully amortizing, monthly', values: { method: 'repayment', frequency: '12', years: '30', extra: '0' } },
    { id: 'fast', label: 'Pay off faster', hint: 'Adds $200 principal per period', values: { method: 'repayment', extra: '200' } },
    { id: 'biweekly', label: 'Biweekly savings', hint: '26 payments per year', values: { method: 'repayment', frequency: '26' } },
    { id: 'balloon', label: 'Balloon structure', hint: '50% due at term end', values: { method: 'balloon', balloonPct: '50' } },
    { id: 'interest-only', label: 'Interest only', hint: 'Principal due at maturity', values: { method: 'interest-only' } },
  ],
  tax: [
    { id: 'current', label: 'Current year', hint: 'Latest reference pack', values: {} },
    { id: 'previous', label: 'Previous year', hint: 'Recalculate a past return', values: {} },
    { id: 'joint', label: 'Married, jointly', hint: 'Combined income', values: { filing: 'joint' } },
    { id: 'high-earner', label: 'High income', hint: 'Top brackets & phase-outs', values: { income: '250000', otherIncome: '5000' } },
    { id: 'with-credits', label: 'With credits', hint: 'Adds manual credit allowance', values: { credits: '2000' } },
  ],
  car: [
    { id: 'standard', label: 'Standard 60-month', hint: 'Reducing balance', values: { method: 'repayment', months: '60' } },
    { id: 'long', label: 'Long 84-month', hint: 'Lower payment, more interest', values: { method: 'repayment', months: '84' } },
    { id: 'balloon', label: 'Balloon 60-month', hint: '50% balloon at term end', values: { method: 'balloon', balloon: '15000', months: '60' } },
    { id: 'flat', label: 'Flat interest', hint: 'Interest on original balance', values: { method: 'flat' } },
  ],
  compound: [
    { id: 'saver', label: 'Monthly saver', hint: 'Contribute each month', values: { method: 'compound', contribFreq: 'monthly' } },
    { id: 'annual', label: 'Annual contributions', hint: 'Contribute once a year', values: { method: 'compound', contribFreq: 'annual' } },
    { id: 'lump', label: 'Lump sum only', hint: 'No ongoing contributions', values: { contribution: '0' } },
    { id: 'retire', label: '30-year horizon', hint: 'Long-term compounding', values: { years: '30' } },
  ],
  transaction: [
    { id: 'single', label: 'Single sale', hint: 'One transaction', values: { method: 'net', count: '1' } },
    { id: 'monthly', label: 'Monthly recurring', hint: '12 transactions', values: { method: 'net', count: '12' } },
    { id: 'volume', label: 'High volume', hint: '1,000 transactions', values: { method: 'net', count: '1000' } },
    { id: 'gross', label: 'Work back to net', hint: 'Set a target net amount', values: { method: 'gross-up' } },
  ],
  currency: [
    { id: 'latest', label: 'Latest rate', hint: 'Today\u2019s ECB reference', values: { source: 'latest' } },
    { id: 'historical', label: 'Past date', hint: 'Look up an older rate', values: { source: 'historical' } },
    { id: 'custom', label: 'Custom quote', hint: 'Use your own rate', values: { source: 'manual' } },
  ],
  probability: [
    { id: 'two-events', label: 'Two events', hint: 'Independent A and B', values: { method: 'independent', event: 'and' } },
    { id: 'binomial', label: 'Binomial', hint: 'Exact repeated trials', values: { method: 'binomial', n: '10', k: '3', p: '50' } },
    { id: 'monte', label: 'Monte Carlo', hint: 'Seeded simulation check', values: { method: 'monte-carlo', n: '10', k: '3', p: '50', sims: '100000' } },
    { id: 'poker', label: 'Card hands', hint: 'Combinations of a deck', values: { method: 'combinations', n: '52', k: '5' } },
  ],
  scientific: [
    { id: 'pythagoras', label: 'Pythagoras', hint: 'sqrt(x^2 + y^2)', values: { method: 'expression', expression: 'sqrt(x^2 + y^2)', x: '3', y: '4' } },
    { id: 'quadratic', label: 'Quadratic', hint: 'Solve ax^2 + bx + c', values: { method: 'quadratic', a: '1', b: '-5', c: '6' } },
    { id: 'growth', label: 'Growth factor', hint: '(1 + r)^t', values: { method: 'expression', expression: '(1 + x/100)^y', x: '7', y: '10' } },
  ],
  units: [
    { id: 'metric', label: 'Metric to imperial', hint: 'Meters to feet', values: { category: 'length', from: 'm', to: 'ft' } },
    { id: 'temp', label: 'Temperature', hint: 'Celsius to Fahrenheit', values: { category: 'temperature', from: 'C', to: 'F' } },
    { id: 'weight', label: 'Weight', hint: 'Kilograms to pounds', values: { category: 'mass', from: 'kg', to: 'lb' } },
    { id: 'data', label: 'Data storage', hint: 'MB to GiB', values: { category: 'data', from: 'MB', to: 'GiB' } },
  ],
  bmi: [
    { id: 'metric', label: 'Metric', hint: 'cm and kg', values: { units: 'metric' } },
    { id: 'imperial', label: 'Imperial', hint: 'in and lb', values: { units: 'imperial' } },
  ],
};

/** The "previous year" tax preset resolves to the pack before the selected one. */
export function scenarioYearValue(years: { id: string }[], current: string, previous: boolean) {
  if (!previous) return current;
  const index = years.findIndex(year => year.id === current);
  return (index > 0 ? years[index - 1] : years[years.length - 1]).id;
}

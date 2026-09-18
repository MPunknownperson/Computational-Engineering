import type { ToolId } from './types';

export interface CalculationMethod { value: string; label: string; description: string; symbol: string }
export const methodSettings: Record<ToolId, { key: string; label: string; options: CalculationMethod[] }> = {
  mortgage: { key: 'method', label: 'Repayment type', options: [
    { value: 'repayment', label: 'Principal & interest', description: 'Pay down your loan over time', symbol: 'repay' },
    { value: 'interest-only', label: 'Interest only', description: 'Principal is due at the end', symbol: 'interest' },
    { value: 'balloon', label: 'Balloon loan', description: 'Amortize part, pay the rest at term end', symbol: 'balloon' },
  ] },
  tax: { key: 'method', label: 'Calculation method', options: [
    { value: 'progressive', label: 'Tax brackets', description: 'Use your country\'s official reference rules', symbol: 'steps' },
    { value: 'custom', label: 'Custom brackets', description: 'Build your own tax rate tiers', symbol: 'steps' },
    { value: 'flat', label: 'Flat rate', description: 'Apply one flat national rate', symbol: 'percent' },
  ] },
  car: { key: 'method', label: 'Loan method', options: [
    { value: 'repayment', label: 'Standard loan', description: 'Reducing-balance interest', symbol: 'repay' },
    { value: 'balloon', label: 'Balloon payment', description: 'A final lump-sum payment', symbol: 'balloon' },
    { value: 'flat', label: 'Flat interest', description: 'Interest on the initial balance', symbol: 'interest' },
  ] },
  compound: { key: 'method', label: 'Growth method', options: [
    { value: 'compound', label: 'Compound', description: 'Interest earns interest', symbol: 'growth' },
    { value: 'simple', label: 'Simple', description: 'No interest on interest', symbol: 'interest' },
    { value: 'continuous', label: 'Continuous', description: 'Continuous compounding', symbol: 'infinity' },
  ] },
  transaction: { key: 'method', label: 'What do you want to calculate?', options: [
    { value: 'net', label: 'What I receive', description: 'Deduct fees from a charge', symbol: 'receive' },
    { value: 'gross-up', label: 'What to charge', description: 'Work back from a target net', symbol: 'send' },
  ] },
  currency: { key: 'source', label: 'Exchange-rate source', options: [
    { value: 'latest', label: 'Latest rate', description: 'Daily ECB reference', symbol: 'globe' },
    { value: 'historical', label: 'Past date', description: 'Choose a reference date', symbol: 'calendar' },
    { value: 'manual', label: 'Custom rate', description: 'Use your own quote', symbol: 'edit' },
  ] },
  probability: { key: 'method', label: 'Probability model', options: [
    { value: 'independent', label: 'Independent', description: 'Two unrelated events', symbol: 'events' },
    { value: 'conditional', label: 'Conditional', description: 'Given another event', symbol: 'intersect' },
    { value: 'binomial', label: 'Binomial', description: 'Repeated success or failure', symbol: 'steps' },
    { value: 'combinations', label: 'Combinations', description: 'Order does not matter', symbol: 'grid' },
    { value: 'permutations', label: 'Permutations', description: 'Order matters', symbol: 'shuffle' },
    { value: 'monte-carlo', label: 'Monte Carlo', description: 'Simulate seeded trials', symbol: 'shuffle' },
  ] },
  scientific: { key: 'method', label: 'Calculation mode', options: [
    { value: 'expression', label: 'Expression', description: 'Functions, powers & variables', symbol: 'function' },
    { value: 'quadratic', label: 'Equation solver', description: 'Solve ax^2 + bx + c = 0', symbol: 'curve' },
  ] },
  units: { key: 'category', label: 'Measurement', options: [
    { value: 'length', label: 'Length', description: 'Meters, feet, miles', symbol: 'ruler' },
    { value: 'mass', label: 'Weight', description: 'Kilograms, pounds', symbol: 'weight' },
    { value: 'temperature', label: 'Temperature', description: 'Celsius, Fahrenheit, Kelvin', symbol: 'temperature' },
    { value: 'area', label: 'Area', description: 'Square units, acres', symbol: 'grid' },
    { value: 'volume', label: 'Volume', description: 'Liters, gallons, cups', symbol: 'volume' },
    { value: 'speed', label: 'Speed', description: 'km/h, mph, knots', symbol: 'speed' },
    { value: 'time', label: 'Time', description: 'Seconds to weeks', symbol: 'clock' },
    { value: 'data', label: 'Data', description: 'Decimal and binary units', symbol: 'data' },
  ] },
  bmi: { key: 'units', label: 'Measurement system', options: [
    { value: 'metric', label: 'Metric', description: 'Centimeters & kilograms', symbol: 'ruler' },
    { value: 'imperial', label: 'Imperial', description: 'Inches & pounds', symbol: 'weight' },
  ] },
};

export function methodName(tool: ToolId, values: Record<string, string>) {
  const config = methodSettings[tool];
  return config.options.find(option => option.value === values[config.key])?.label || 'Unknown method';
}
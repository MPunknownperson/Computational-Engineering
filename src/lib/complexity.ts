import type { ComplexityMode, ToolId } from './types';

export const complexityLevels: { value: ComplexityMode; label: string; desc: string }[] = [
  { value: 'simple', label: 'Simple', desc: 'Core inputs only' },
  { value: 'standard', label: 'Standard', desc: 'Common optional settings' },
  { value: 'advanced', label: 'Advanced', desc: 'Full control surface' },
];

/** Per-tool labels so the strip explains the right thing for each calculator. */
export const toolComplexityCopy: Record<ToolId, Record<ComplexityMode, string>> = {
  mortgage: {
    simple: 'Price, rate, term, and repayment type.',
    standard: 'Adds ownership costs, extra principal, and schedule basics.',
    advanced: 'All schedule, convention, balloon, PMI, and closing options.',
  },
  tax: {
    simple: 'Country and region income tax only. Local levies stay off.',
    standard: 'Optional local, sales, and property levies listed but off until enabled.',
    advanced: 'Every levy, payroll, demographic, and custom-bracket option.',
  },
  car: {
    simple: 'Price, rate, term, and down payment.',
    standard: 'Adds trade-in, tax, and fees.',
    advanced: 'Balloon, financed fees, rebates, and extra principal.',
  },
  compound: {
    simple: 'Principal, contribution, rate, and years.',
    standard: 'Adds inflation and fees.',
    advanced: 'Compounding frequency, timing, and contribution cadence.',
  },
  transaction: {
    simple: 'Amount, rate, and fixed fee.',
    standard: 'Adds platform and payout fees.',
    advanced: 'VAT mode, cross-border, and FX spread layers.',
  },
  currency: {
    simple: 'Amount and currency pair.',
    standard: 'Adds fee and spread.',
    advanced: 'Manual rate, historical date, and provider controls.',
  },
  probability: {
    simple: 'Core event inputs for the selected model.',
    standard: 'Adds event type and common options.',
    advanced: 'Simulation size, seed, and full model controls.',
  },
  scientific: {
    simple: 'Expression or equation inputs.',
    standard: 'Adds angle mode and variables.',
    advanced: 'Full solver options and coefficient set.',
  },
  units: {
    simple: 'Amount and unit pair.',
    standard: 'Category switching with common units.',
    advanced: 'Full unit catalog for the category.',
  },
  bmi: {
    simple: 'Height and weight.',
    standard: 'Metric or imperial system.',
    advanced: 'Same inputs with full guidance.',
  },
};

/** Which option-group / field clusters appear at each depth for non-tax tools. */
const toolTiers: Record<ToolId, Record<string, ComplexityMode>> = {
  mortgage: {
    core: 'simple',
    ownership: 'standard',
    extra: 'standard',
    schedule: 'advanced',
  },
  tax: {
    core: 'simple',
    levies: 'standard',
    personal: 'advanced',
    customBrackets: 'advanced',
  },
  car: {
    core: 'simple',
    purchase: 'standard',
    extra: 'advanced',
  },
  compound: {
    core: 'simple',
    fees: 'standard',
    timing: 'advanced',
  },
  transaction: {
    core: 'simple',
    platform: 'standard',
    crossBorder: 'advanced',
  },
  currency: {
    core: 'simple',
    costs: 'standard',
    source: 'advanced',
  },
  probability: {
    core: 'simple',
    event: 'standard',
    simulation: 'advanced',
  },
  scientific: {
    core: 'simple',
    variables: 'standard',
    solver: 'advanced',
  },
  units: {
    core: 'simple',
    category: 'standard',
    catalog: 'advanced',
  },
  bmi: {
    core: 'simple',
    system: 'standard',
    guidance: 'advanced',
  },
};

const rank: Record<ComplexityMode, number> = { simple: 0, standard: 1, advanced: 2 };

export function toolSectionVisible(tool: ToolId, section: string, mode: ComplexityMode = 'standard'): boolean {
  const need = toolTiers[tool]?.[section] || 'standard';
  return rank[mode] >= rank[need];
}

export function defaultToolComplexity(): Record<ToolId, ComplexityMode> {
  return {
    mortgage: 'standard', tax: 'standard', car: 'standard', compound: 'standard', transaction: 'standard',
    currency: 'standard', probability: 'standard', scientific: 'standard', units: 'standard', bmi: 'standard',
  };
}

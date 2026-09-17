import type { ToolModule } from './types';
import { formula, node, part } from './helpers';
import { countries, getRegion, getTaxYear } from '../regions';

export const taxModule: ToolModule = {
  id: 'tax',
  name: 'Multi-jurisdiction tax network',
  description: 'Selects a year pack, filing profile, national method, state/provincial method, local taxes, credits, payroll contributions, and period proration.',
  dataInputs: ['country', 'tax authority', 'reference year', 'region', 'county', 'filing status', 'income period', 'income', 'deductions', 'credits', 'payroll contributions'],
  companionTools: ['mortgage', 'transaction', 'currency'],
  build: (v, ctx, result) => {
    const country = countries[ctx.country], region = getRegion(ctx.country, ctx.region), pack = getTaxYear(ctx.country, v.year);
    const months = v.taxPeriod === 'monthly' ? 1 : v.taxPeriod === 'partial' ? Number(v.monthsCount) : 12;
    const annualMultiplier = 12 / months;
    const status: 'single' | 'joint' | 'head' = v.filing === 'joint' ? 'joint' : v.filing === 'head' ? 'head' : 'single';
    const gross = (Number(v.income) + Number(v.otherIncome)) * annualMultiplier;
    const deduction = v.deductionMode === 'custom' ? Number(v.deduction) * annualMultiplier : pack.deduction[status];
    const taxable = Math.max(0, gross - Number(v.pretax) * annualMultiplier - deduction);
    return {
      formulas: [
        formula('annualize', 'Period annualization', 'Annual income = entered income x 12 / months represented', 'Applies annual tax law to monthly and partial-year input.', v.taxPeriod !== 'annual'),
        formula('taxable', 'Taxable income', 'Taxable income = gross income - pre-tax adjustments - standard/custom deduction', 'Produces the national tax base.'),
        formula('progressive', 'Progressive bracket tax', 'Tax = Σ max(0, min(taxable, upper_i) - lower_i) x rate_i', `Uses the ${country.legalBody} ${pack.label} bracket pack.`, v.method === 'progressive'),
        formula('custom-brackets', 'Custom jurisdiction tiers', 'Tax = Σ max(0, min(taxable, customCap_i) - cap_(i-1)) x customRate_i', 'Applies user-defined cumulative tier thresholds and rates independently of national packs.', v.method === 'custom'),
        formula('flat', 'Custom flat tax', 'Tax = taxable income x custom rate', 'Alternative method when a statutory bracket pack is unsuitable.', v.method === 'flat'),
        formula('senior-add', 'Senior additional deduction (65+)', 'Deduction = standard deduction + senior increment (per filing status)', 'Automatically applies the larger age-65+ standard deduction for eligible filers.', ctx.country === 'US' && v.age65 === 'true'),
        formula('dependent-chip', 'Dependent child credit', 'Children x per-child credit (per reference year)', 'Applies the Child Tax Credit based on reference year amount and number of dependents.', ctx.country === 'US' && Number(v.dependents) > 0),
        formula('credits', 'Credits', 'Net national tax = max(0, bracket tax - personal credits - entered credits)', 'Credits reduce tax rather than taxable income.'),
        formula('regional', 'Regional income tax', region.flatTax !== undefined ? 'Regional tax = adjusted income x regional flat rate' : 'Regional tax = Σ regional brackets - regional personal credit', `${region.governingBody}; ${region.statuteCitation}`, v.includeRegional === 'true'),
        formula('local', 'County / municipal tax', 'Local tax = adjusted income x (county wage-tax rate + entered local rate)', 'Adds only a selected or entered local tax.', Number(part(result, 'Local & county tax')) > 0 || Number(part(result, 'Local tax estimate')) > 0),
        formula('payroll', 'Payroll contributions', 'Contributions = jurisdiction-specific capped wage contributions + entered contributions', 'Handles enabled FICA, CPP/EI, National Insurance, Medicare, or custom social contributions.', Number(part(result, 'Payroll / contributions')) > 0),
        formula('withholding-balance', 'Withholding / refund comparison', 'Refund or balance due = withholding paid - assessed tax', 'Compares the amount already withheld from your paycheck to your total income tax liability.', Number(v.withholding) > 0),
        formula('prorate', 'Displayed period result', `Displayed result = annual result x ${months} / 12`, 'Returns a monthly or partial-year result.', v.taxPeriod !== 'annual'),
      ],
      nodes: [
        node('annual-income', 'Annualized gross income', 'Period normalization', gross, 'money', `${v.taxPeriod || 'annual'} input annualization`, ['taxable']),
        node('taxable', 'National tax base', 'Deduction transformation', taxable, 'money', 'Annualized gross less selected adjustments and deduction', ['national-tax']),
        node('national-tax', 'National tax', `${pack.label} ${v.method}`, Number(part(result, 'National income tax')), 'money', result.formula, ['net']),
        node('regional-tax', 'Regional tax', region.taxStructure, Number(part(result, 'State / provincial tax')), 'money', region.statuteCitation, ['net']),
        node('local-tax', 'Local tax', 'County / municipal layer', Number(part(result, 'Local & county tax')) + Number(part(result, 'Local tax estimate')), 'money', v.county || 'Entered local rate', ['net']),
        ...(ctx.country === 'US' && v.age65 === 'true' ? [node('senior-add', 'Senior 65+ deduction add-on', 'Demographic entitlement', result.metrics.find(metric => metric.label === 'Senior 65+ deduction add-on')?.value || 0, 'money', 'Added to standard deduction automatically based on filing status', ['net'])] : []),
        ...(ctx.country === 'US' && Number(v.dependents) > 0 ? [node('dependent-chip', 'Dependent child credits', 'Minor dependents', Number(v.dependents) * (Number(v.year?.startsWith('202') ? Number(v.year?.slice(0, 4)) : 2025) >= 2025 ? 2200 : (Number(v.year?.slice(0, 4)) === 2021 ? 3600 : 2000)), 'money', `${v.dependents} children x per-child CTC based on ${v.year || '2025'} reference`, ['net'])] : []),
        ...(v.method === 'custom' ? [node('custom-brackets', 'Custom jurisdiction tiers', 'User-defined brackets', result.table?.rows.length || 0, 'number', 'Used instead of national reference packs', ['net'])] : []),
        ...(Number(v.withholding) > 0 ? [node('refund-balance', 'Withholding / refund balance', 'Estimated settlement', result.metrics.find(metric => metric.label.startsWith('Estimated refund') || metric.label.startsWith('Estimated balance'))?.value || 0, 'money', 'Withholding paid vs income tax liability', ['net'])] : []),
        node('net', 'Take-home result', 'Tax and contribution settlement', Number(result.value), 'money', 'Gross less taxes, contributions, and deductions', []),
      ],
    };
  },
};
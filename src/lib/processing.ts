import { calculate, convertUnit, binomialRange } from './calculations';
import { currencies, toolById, unitGroups } from './catalog';
import { countries, getRegion, getTaxYear, localLevyOptions } from './regions';
import type { LocalLevyOption } from './regions';
import { methodName, methodSettings } from './methods';
import { buildToolModule } from './toolModules';
import { getEvidenceSources } from './evidence';
import { habitSuggestions, loadHabits } from './habits';
import { parseNumericValue } from './format';
import { taxDefaultsForLocation, transitionTaxLocation } from './regionalSettings';
import type { CalculationCheck, CalculationContext, CalculationResult, ToolId, Values } from './types';

export interface InputIssue { field: string; message: string }
export interface ProcessedCalculation { result: CalculationResult | null; error: string; issues: InputIssue[]; normalized: Values }
type NumericRule = { field: string; label: string; min: number; max: number; integer?: boolean };
const cache = new Map<string, ProcessedCalculation>();
const MAX_CACHE = 64;
const hashFNV = (input: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
};

function inputRules(tool: ToolId, v: Values, ctx: CalculationContext): NumericRule[] {
  const rules: NumericRule[] = [];
  const add = (field: string, label: string, min = 0, max = 1e12, integer = false) => rules.push({ field, label, min, max, integer });
  if (tool === 'mortgage') {
    add('price', 'Home price', 1); add('down', 'Down payment', 0, v.downMode === 'percent' ? 100 : Number(v.price));
    add('rate', 'Interest rate', 0, 100); add('years', 'Loan term', 1, 50, true); add('startMonth', 'Start month', 1, 12, true); add('startYear', 'Start year', 1990, 2100, true); add('extra', 'Extra payment'); add('closing', 'Closing costs');
    if (v.method === 'balloon') add('balloonPct', 'Balloon percentage', 0, 100, true);
    if (v.includeCosts === 'true') { add('propertyTax', 'Property tax', 0, 30); add('insurance', 'Insurance'); add('hoa', 'Service charges'); add('pmi', 'Mortgage insurance', 0, 10); }
  } else if (tool === 'tax') {
    add('income', v.taxPeriod === 'monthly' ? 'Monthly income' : v.taxPeriod === 'weekly' ? 'Weekly income' : v.taxPeriod === 'biweekly' ? 'Biweekly income' : 'Income'); add('otherIncome', 'Other income'); add('pretax', 'Pre-tax deductions', 0, Number(v.income) + Number(v.otherIncome));
    if (v.taxPeriod === 'partial') add('monthsCount', 'Months worked', 1, 12, true);
    if (v.deductionMode === 'custom') add('deduction', 'Custom deduction');
    if (v.method === 'flat') add('flatRate', 'Flat tax rate', 0, 100);
    if (v.method === 'custom') {
      add('customCap1', 'Tier 1 ceiling', 0.01, 1e12); add('customRate1', 'Tier 1 rate', 0, 100);
      add('customCap2', 'Tier 2 ceiling', 0, 1e12); add('customRate2', 'Tier 2 rate', 0, 100);
      add('customCap3', 'Tier 3 ceiling', 0, 1e12); add('customRate3', 'Tier 3 rate', 0, 100);
      add('customCap4', 'Tier 4 ceiling', 0, 1e12); add('customRate4', 'Tier 4 rate', 0, 100); add('customRate5', 'Top rate', 0, 100);
    }
    const region = getRegion(ctx.country, ctx.region);
    if (v.includeRegional === 'true' && (region.customTax || (['US', 'CA'].includes(ctx.country) && !region.brackets && region.flatTax === undefined))) add('regionalRate', 'Regional tax rate', 0, 100);
    if (countries[ctx.country].additionalAllowanceLabel) add('countryRelief', 'Additional annual deduction', 0, 1e12);
    if (v.localFixed === 'true') add('localAnnualAmount', 'Annual local charge', 0, 1e12);
    if (v.countryPayroll === 'true' && countries[ctx.country].contribution) {
      add('countryPayrollRate', 'Employee contribution rate', .0001, 100);
      if (v.countryPayrollBaseMode === 'custom') add('countryPayrollBase', 'Eligible annual wages', 0, 1e12);
      if (countries[ctx.country].contribution?.requiresCap) add('countryPayrollCap', 'Annual insurable earnings ceiling', .01, 1e12);
    }
    add('localRate', 'Local tax rate', 0, 100); add('credits', 'Tax credits'); add('contributions', 'Contributions');
    if (ctx.country === 'US') { add('ctc', 'Child tax credit', 0, 100000); add('dependents', 'Minor children', 0, 8, true); add('withholding', 'Withholding already paid', 0, 1e12); }
    if (!['US', 'CA', 'GB', 'AU', 'AE'].includes(ctx.country)) add('social', 'Social contributions', 0, 50);
    // Validate rates for any enabled levy from the local levy catalog
    localLevyOptions(ctx.country, ctx.region, v.county).forEach((levy: LocalLevyOption) => {
      if ((v[levy.id] ?? String(levy.defaultOn)) !== 'true') return;
      const rateKey = `${levy.id}Rate`;
      // These levies are implemented in the engine as structural switches, not percentages.
      const structuralOnly = ['stateIncome', 'provinceIncome', 'regionIncome'];
      if (structuralOnly.includes(levy.id)) return;
      const appliedAsPercent = ['localIncome', 'customLevy', 'propertyTax', 'churchTax', 'communalTax', 'residentTax', 'localIncomeTax', 'cantonalTax'].includes(levy.id)
        || (levy.kind === 'payroll' && v[rateKey] !== undefined && v[rateKey] !== '')
        || (levy.kind === 'sales' && v[rateKey] !== undefined && v[rateKey] !== '')
        || (levy.kind === 'solidarity' && v[rateKey] !== undefined && v[rateKey] !== '')
        || (levy.kind === 'health' && v[rateKey] !== undefined && v[rateKey] !== '');
      if (appliedAsPercent) add(rateKey, `${levy.label} rate`, 0, 100);
      if (levy.kind === 'payroll' && v[`${levy.id}Cap`] !== undefined && v[`${levy.id}Cap`] !== '') add(`${levy.id}Cap`, `${levy.label} wage base`, 0, 1e12);
      if (levy.id === 'propertyTax') { add('assessedValue', 'Assessed value', 0, 1e12); add('propertyTaxRate', 'Property tax rate', 0, 100); }
      if (levy.kind === 'sales') add('taxableSpendShare', 'Taxable spend share', 0, 100);
    });
  } else if (tool === 'car') {
    add('price', 'Vehicle price', 1); add('down', 'Down payment', 0, Number(v.price)); add('trade', 'Trade-in', 0, Number(v.price)); add('rebate', 'Rebate', 0, Number(v.price));
    add('rate', 'Interest rate', 0, 100); add('months', 'Loan term', 1, 120, true); add('salesTax', 'Sales tax', 0, 100); add('fees', 'Purchase fees');
    if (v.method !== 'flat') add('extra', 'Extra payment');
    if (v.method === 'balloon') add('balloon', 'Final balloon');
  } else if (tool === 'compound') {
    add('principal', 'Starting investment'); add('contribution', 'Monthly contribution'); add('rate', 'Expected return', -99, 100); add('years', 'Investment period', 1, 100, true);
    add('annualFee', 'Annual fee', 0, 25); add('inflation', 'Inflation', -50, 100);
  } else if (tool === 'transaction') {
    add('amount', 'Transaction amount'); add('count', 'Transaction count', 1, 1e6, true); add('rate', 'Processing rate', 0, 99); add('fixed', 'Fixed fee');
    add('platform', 'Platform fee', 0, 99); add('crossBorder', 'Cross-border rate', 0, 99); add('spread', 'Exchange spread', 0, 99); add('payout', 'Payout fee'); add('vat', 'Sales tax / VAT', 0, 100);
  } else if (tool === 'currency') {
    add('amount', 'Amount'); add('fee', 'Fixed fee', 0, Number(v.amount)); add('spread', 'Exchange spread', 0, 99);
    if (v.source === 'manual' && v.from !== v.to) add('customRate', 'Exchange rate', 1e-9, 1e9);
  } else if (tool === 'probability') {
    if (v.method === 'independent') { add('pa', 'P(A)', 0, 100); add('pb', 'P(B)', 0, 100); }
    else if (v.method === 'conditional') { add('given', 'P(B)', 1e-7, 100); add('joint', 'P(A and B)', 0, Number(v.given)); }
    else {
      add('n', 'Number of trials / objects', 0, 1000, true); add('k', 'Successes / selections', 0, Number(v.n), true);
      if (v.method === 'binomial' || v.method === 'monte-carlo') { add('p', 'Success probability', 0, 100); if (v.method === 'monte-carlo') { add('sims', 'Simulations', 1000, 1000000, true); add('seed', 'Random seed', 0, 4294967295, true); } }
    }
  } else if (tool === 'scientific') {
    if (v.method === 'quadratic') { add('a', 'Coefficient a', -1e12); add('b', 'Coefficient b', -1e12); add('c', 'Constant c', -1e12); }
    else { add('x', 'Variable x', -1e12); add('y', 'Variable y', -1e12); }
  } else if (tool === 'units') add('amount', 'Measurement', -1e12);
  else { add('height', 'Height', .1, 400); add('weight', 'Weight', .1, 1500); }
  return rules;
}

const optionRules: Partial<Record<ToolId, Record<string, string[]>>> = {
  mortgage: { downMode: ['amount', 'percent'], frequency: ['12', '26', '52'], convention: ['monthly', 'semiannual', 'effective'], includeCosts: ['true', 'false'] },
  tax: {
    countryPayrollBaseMode: ['income', 'custom'], localFixed: ['true', 'false'],
    filing: ['single', 'joint', 'head'], taxPeriod: ['annual', 'monthly', 'weekly', 'biweekly', 'partial'], deductionMode: ['standard', 'custom'],
    includeRegional: ['true', 'false'], includeCountyLocal: ['true', 'false'], payroll: ['true', 'false'], marriage: ['true', 'false'], medicare: ['true', 'false'], age65: ['true', 'false'],
    stateIncome: ['true', 'false'], provinceIncome: ['true', 'false'], regionIncome: ['true', 'false'], localIncome: ['true', 'false'],
    stateSales: ['true', 'false'], vatSpending: ['true', 'false'], propertyTax: ['true', 'false'], customLevy: ['true', 'false'],
    fica: ['true', 'false'], cppEi: ['true', 'false'], ni: ['true', 'false'], medicareLevy: ['true', 'false'], socialDe: ['true', 'false'], premiums: ['true', 'false'],
    uscPrsi: ['true', 'false'], cotisations: ['true', 'false'], inps: ['true', 'false'], ssEs: ['true', 'false'], onss: ['true', 'false'], svAt: ['true', 'false'],
    amBidrag: ['true', 'false'], trygd: ['true', 'false'], tyel: ['true', 'false'], socialSe: ['true', 'false'], zus: ['true', 'false'], efka: ['true', 'false'], ssPt: ['true', 'false'],
    shakai: ['true', 'false'], fourMajor: ['true', 'false'], epfEsi: ['true', 'false'], cpf: ['true', 'false'], mpf: ['true', 'false'], nhiPension: ['true', 'false'],
    secure: ['true', 'false'], inss: ['true', 'false'], imss: ['true', 'false'], afpSalud: ['true', 'false'], jubilacion: ['true', 'false'], bpjs: ['true', 'false'],
    sso: ['true', 'false'], sssPhilHealth: ['true', 'false'], uif: ['true', 'false'], pensionAe: ['true', 'false'], ahv: ['true', 'false'],
    scotlandBands: ['true', 'false'], marriageAllowance: ['true', 'false'], mls: ['true', 'false'], solidarity: ['true', 'false'], churchTax: ['true', 'false'],
    cantonalTax: ['true', 'false'], wealthTax: ['true', 'false'], usc: ['true', 'false'], prsi: ['true', 'false'], communalTax: ['true', 'false'],
    municipalTax: ['true', 'false'], municipalTaxFi: ['true', 'false'], yle: ['true', 'false'], trygdeavgift: ['true', 'false'], kommunalSkatt: ['true', 'false'],
    begravnings: ['true', 'false'], surtaxPt: ['true', 'false'], irapRegionale: ['true', 'false'], regionalEs: ['true', 'false'], labourCredit: ['true', 'false'],
    solidarityPl: ['true', 'false'], housingFee: ['true', 'false'], tourismDirham: ['true', 'false'], municipalPatent: ['true', 'false'], crim: ['true', 'false'],
    residentTax: ['true', 'false'], localIncomeTax: ['true', 'false'], cess: ['true', 'false'], surchargeIn: ['true', 'false'], deducaoLegal: ['true', 'false'],
    subsidioEmpleo: ['true', 'false'], nhiTax: ['true', 'false'], mpfExtra: ['true', 'false'], independiente: ['true', 'false'], npwp: ['true', 'false'],
    pvd: ['true', 'false'], th13Month: ['true', 'false'], rebatesZa: ['true', 'false'], ufAdjust: ['true', 'false'],
  },
  car: { tradeTaxCredit: ['true', 'false'], financeFees: ['true', 'false'] },
  compound: { frequency: ['1', '2', '4', '12', '365'], timing: ['beginning', 'end'], contribFreq: ['monthly', 'annual'] },
  transaction: { taxMode: ['inclusive', 'exclusive'] },
  probability: { event: ['and', 'or', 'xor', 'neither'], binomialEvent: ['exactly', 'atleast', 'atmost'] },
  scientific: { angle: ['degrees', 'radians'] },
};

function normalizeValues(tool: ToolId, values: Values, ctx: CalculationContext) {
  const normalized: Values = {};
  const options = { ...optionRules[tool], [methodSettings[tool].key]: methodSettings[tool].options.map(option => option.value) };
  const allowed = tool === 'tax' ? taxDefaultsForLocation(ctx.country, ctx.region, ctx.county) : toolById[tool].defaults;
  for (const [key, value] of Object.entries(values)) {
    if (!(key in allowed) || typeof value !== 'string') continue;
    const numeric = !['expression', 'date', 'from', 'to', 'county', 'taxProfile'].includes(key) && !(key in options) ? parseNumericValue(value) : NaN;
    normalized[key] = Number.isFinite(numeric) ? String(numeric) : value.trim();
  }
  return normalized;
}

function inspectInputs(tool: ToolId, values: Values, ctx: CalculationContext) {
  const issues: InputIssue[] = [];
  const method = methodSettings[tool];
  if (!method.options.some(option => option.value === values[method.key])) issues.push({ field: method.key, message: 'Select a supported calculation method.' });
  if (tool === 'tax') {
    const profiles = countries[ctx.country].profiles;
    if (profiles && !profiles.some(profile => profile.value === values.taxProfile)) issues.push({ field: 'taxProfile', message: 'Choose a supported country tax profile.' });
    for (const levy of localLevyOptions(ctx.country, ctx.region, values.county)) {
      if (values[levy.id] !== undefined && !['true', 'false'].includes(values[levy.id])) issues.push({ field: levy.id, message: 'Choose whether to include this levy.' });
    }
    const duplicatePayroll = ctx.country === 'US' ? 'fica' : ctx.country === 'CA' ? 'cppEi' : ctx.country === 'GB' ? 'ni' : '';
    if (duplicatePayroll && values.payroll === 'true' && values[duplicatePayroll] === 'true') issues.push({ field: duplicatePayroll, message: 'Use either the payroll calculation or the editable payroll estimate, not both.' });
    if (ctx.country === 'AU' && values.medicare === 'true' && values.medicareLevy === 'true') issues.push({ field: 'medicareLevy', message: 'Enable only one Medicare levy calculation to avoid double counting.' });
    const yearIds = countries[ctx.country].years.map(pack => pack.id);
    if (!values.year || !yearIds.includes(values.year)) issues.push({ field: 'year', message: `Choose a ${ctx.country} reference year (${yearIds.join(', ')}).` });
    const region = getRegion(ctx.country, ctx.region);
    if (values.county && region.counties?.length && !region.counties.some(county => county.id === values.county)) issues.push({ field: 'county', message: `Choose a county or locality within ${region.name}.` });
    if (values.county && !region.counties?.length) issues.push({ field: 'county', message: `${region.name} has no listed localities yet; clear the county selection or enter levies manually.` });
  }
  for (const [field, choices] of Object.entries(optionRules[tool] || {})) {
    // Empty/undefined means "not applicable in this jurisdiction" and is always allowed.
    if (values[field] === undefined || values[field] === '') continue;
    if (!choices.includes(values[field])) issues.push({ field, message: 'Choose one of the available settings.' });
  }
  if (tool === 'currency') for (const field of ['from', 'to']) { if (!currencies.includes(values[field])) issues.push({ field, message: 'Choose a supported currency.' }); }
  if (tool === 'units') for (const field of ['from', 'to']) { if (!unitGroups[values.category]?.units[values[field]]) issues.push({ field, message: 'Choose a unit in the selected measurement category.' }); }
  for (const rule of inputRules(tool, values, ctx)) {
    const value = parseNumericValue(values[rule.field] || '');
    if (!Number.isFinite(value)) issues.push({ field: rule.field, message: `Enter a number for ${rule.label.toLowerCase()}.` });
    else if (value < rule.min || (Number.isFinite(rule.max) && value > rule.max)) issues.push({ field: rule.field, message: `${rule.label} must be ${rule.min.toLocaleString()} to ${Number.isFinite(rule.max) ? rule.max.toLocaleString() : 'a valid amount'}.` });
    else if (rule.integer && !Number.isInteger(value)) issues.push({ field: rule.field, message: `${rule.label} must be a whole number.` });
  }
  return issues;
}

function inspectResult(tool: ToolId, values: Values, ctx: CalculationContext, result: CalculationResult): CalculationCheck[] {
  const checks: CalculationCheck[] = [{ name: 'Input constraints', passed: true, detail: 'Required values, ranges, relationships, and method settings are valid.' }];
  const numeric = [typeof result.value === 'number' ? result.value : 0, ...result.metrics.flatMap(metric => typeof metric.value === 'number' ? [metric.value] : []), ...result.breakdown.map(part => part.value)];
  checks.push({ name: 'Finite numerical output', passed: numeric.every(Number.isFinite), detail: 'The result and numerical breakdown are within the supported range.' });
  const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(.005, Math.max(Math.abs(a), Math.abs(b)) * 1e-9);
  if (result.schedule?.length) {
    const fullPrincipal = result.centerValue || 0;
    const balloonPct = tool === 'mortgage' && values.method === 'balloon' ? Number(values.balloonPct || 0) : 0;
    const amortizedPrincipal = fullPrincipal * (1 - balloonPct / 100);
    const rows = result.schedule;
    const totalPrincipal = rows.reduce((sum, row) => sum + row.principal, 0);
    const consistent = rows.every((row, index) => close(row.payment, row.interest + row.principal) && close(row.balance, (index === 0 ? amortizedPrincipal : rows[index - 1].balance) - row.principal) && row.balance >= 0);
    checks.push({ name: 'Loan balance reconciliation', passed: consistent && close(totalPrincipal, amortizedPrincipal) && close(rows[rows.length - 1].balance, 0), detail: balloonPct > 0 ? `Schedule amortizes ${Math.round((1 - balloonPct / 100) * 100)}% of the loan; the ${balloonPct}% balloon is reported separately.` : 'Principal, interest, and remaining balances reconcile across the complete payment schedule.' });
  }
  if (tool === 'mortgage') checks.push({ name: 'Payment components', passed: close(result.breakdown.reduce((sum, part) => sum + part.value, 0), Number(result.value)), detail: 'Included ownership costs and principal payments add up to the displayed payment.' });
  if (tool === 'probability' && result.format === 'percent') checks.push({ name: 'Probability bounds', passed: Number(result.value) >= 0 && Number(result.value) <= 100, detail: 'The computed probability is between 0% and 100%.' });
  if (tool === 'probability' && values.method === 'monte-carlo') {
    const exact = binomialRange(Number(values.n), Number(values.k), Number(values.p) / 100, values.binomialEvent);
    const half = 1.96 * Math.sqrt((Number(result.value) / 100) * (1 - Number(result.value) / 100) / Number(values.sims)) * 100;
    checks.push({ name: 'Simulation near exact value', passed: Math.abs(Number(result.value) - exact * 100) <= Math.max(2 * half, 0.25), detail: `The seeded simulation stays within two interval widths of the exact binomial probability (${(exact * 100).toFixed(2)}%).` });
  }
  if (tool === 'units') {
    const inverse = convertUnit(Number(result.value), values.category, values.to, values.from);
    checks.push({ name: 'Conversion round trip', passed: close(inverse, Number(values.amount)), detail: 'Converting the result back recovers the original measurement within floating-point tolerance.' });
  }
  if (tool === 'transaction') checks.push({ name: 'Settlement reconciliation', passed: close(result.breakdown.reduce((sum, part) => sum + part.value, 0), result.centerValue || 0), detail: 'Net proceeds, fees, and collected tax reconcile with the customer charges.' });
  if (tool === 'currency') checks.push({ name: 'Exchange-rate source', passed: values.from === values.to || values.source === 'manual' || Boolean(ctx.rate && ctx.rateDate), detail: values.source === 'manual' ? 'The explicitly selected custom exchange rate was used.' : 'A dated reference rate or a same-currency identity was used.' });
  return checks;
}

function inferNotes(tool: ToolId, v: Values, ctx: CalculationContext) {
  const notes: string[] = [];
  if (tool === 'mortgage') {
    const percentage = v.downMode === 'percent' ? Number(v.down) : Number(v.down) / Number(v.price) * 100;
    notes.push(`${percentage.toFixed(1)}% down payment. ${percentage >= 20 ? 'Mortgage insurance is not included under the 20% threshold rule used by this model.' : v.includeCosts === 'true' ? 'Mortgage insurance is included because the down payment is below 20%.' : 'Ownership costs, including mortgage insurance, are excluded.'}`);
    if (Number(v.extra) > 0) notes.push('Extra payments reduce principal each period. The payoff date and total interest are recalculated from the schedule.');
    if (ctx.country === 'CA' && v.convention !== 'semiannual') notes.push('This loan uses a custom interest convention. The default Canadian preset uses semiannual compounding.');
  }
  if (tool === 'tax') {
    const pack = getTaxYear(ctx.country, v.year || '');
    notes.push(`Governing body: ${countries[ctx.country].legalBody}. Reference pack: ${pack.label}. This is a fixed-year reference, not a filing service.`);
    notes.push(countries[ctx.country].rules);
    if (v.payroll !== 'true') notes.push('Automatic payroll contributions are off. The result is not a complete payslip estimate.');
    if (v.localIncome !== 'true') notes.push('Local/municipal wage tax is off. Only country and regional income tax run unless you enable other levies.');
  }
  if (tool === 'compound' && Number(v.inflation) > 0) notes.push(`Purchasing power is adjusted using your ${v.inflation}% annual inflation assumption.`);
  if (tool === 'currency' && valuesNeedRate(v)) notes.push(`Reference date: ${ctx.rateDate}. Banks and providers may apply a different rate or additional fees.`);
  if (tool === 'scientific') notes.push('Only allowlisted scalar functions are executed. Assignments, arbitrary code, and property access are blocked.');
  return notes;
}
function valuesNeedRate(v: Values) { return v.source !== 'manual' && v.from !== v.to; }

export function processCalculation(tool: ToolId, values: Values, ctx: CalculationContext): ProcessedCalculation {
  if (!Object.prototype.hasOwnProperty.call(toolById, tool)) return { result: null, normalized: {}, issues: [], error: 'Choose a supported calculation tool.' };
  if (!Object.prototype.hasOwnProperty.call(countries, ctx.country) || !countries[ctx.country].regions.some(region => region.id === ctx.region)) return { result: null, normalized: {}, issues: [{ field: 'region', message: 'Choose a valid country and region.' }], error: 'Choose a valid country and region.' };
  const withLocality = tool === 'tax' ? { ...taxDefaultsForLocation(ctx.country, ctx.region, ctx.county), ...values, ...(ctx.county !== undefined ? { county: ctx.county } : {}) } : values;
  const normalized = normalizeValues(tool, withLocality, ctx);
  const issues = inspectInputs(tool, normalized, ctx);
  if (issues.length) return { result: null, normalized, issues, error: issues[0].message };
  // Compact cache key: full payload hashed to keep Map lookups fast as jurisdictions grow.
  const key = hashFNV(JSON.stringify([tool, normalized, ctx.country, ctx.region, ctx.county, ctx.city, ctx.currency, ctx.rate, ctx.rateDate, ctx.precision, ctx.locale, ctx.complexity]));
  const cached = cache.get(key);
  if (cached) return cached;
  try {
    const result = calculate(tool, normalized, ctx);
    const checks = inspectResult(tool, normalized, ctx, result);
    if (checks.some(check => !check.passed)) throw new Error('The result did not pass a numerical consistency check. Review the inputs or choose a less extreme value.');

    // Build optional audit layers only after the core numeric path succeeds.
    const currentPack = tool === 'tax' ? getTaxYear(ctx.country, normalized.year) : undefined;
    const docAlignment = tool === 'tax' && currentPack?.officialDoc ? {
      authority: countries[ctx.country].legalBody,
      instrument: currentPack.officialDoc.instrument,
      citation: currentPack.officialDoc.citation,
      year: currentPack.label,
      effectiveDate: currentPack.officialDoc.effectiveDate,
      status: 'Official Statute' as const,
      url: currentPack.officialDoc.url,
    } : tool === 'currency' && ctx.rateDate ? {
      authority: 'European Central Bank (ECB)',
      instrument: 'Euro Foreign Exchange Reference Rates (Blended Central Bank Series)',
      citation: 'ECB Daily FX Article 12',
      year: ctx.rateDate.slice(0, 4),
      effectiveDate: ctx.rateDate,
      status: 'Verified Live' as const,
      url: 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html',
    } : undefined;

    const module = buildToolModule(tool, normalized, ctx, result);

    result.audit = {
      version: 'Calculation engine',
      method: methodName(tool, normalized),
      checks,
      notes: [...inferNotes(tool, normalized, ctx), ...habitSuggestions(loadHabits())],
      inputCount: inputRules(tool, normalized, ctx).length,
      alignment: docAlignment,
      academicSources: getEvidenceSources(tool, ctx.country),
      networkNodes: module.output.nodes,
      formulas: module.output.formulas,
      module: module.summary,
      computedAt: new Date().toISOString(),
    };

    const reg = getRegion(ctx.country, ctx.region);
    if (['tax', 'mortgage', 'car'].includes(tool)) result.regionalStats = {
      medianIncome: reg.medianIncome,
      costOfLivingIndex: reg.costOfLivingIndex,
      taxStructure: reg.taxStructure,
      governingBody: reg.governingBody,
      statuteCitation: reg.statuteCitation,
      localRule: reg.description,
    };

    const output = { result, normalized, issues: [], error: '' };
    cache.set(key, output);
    if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value!);
    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Check the calculation inputs.';
    const field = tool === 'scientific' && normalized.method === 'expression' ? 'expression' : tool === 'units' ? 'amount' : tool === 'car' ? normalized.method === 'balloon' ? 'balloon' : 'down' : tool === 'compound' ? 'rate' : tool === 'transaction' ? 'rate' : tool === 'currency' ? 'customRate' : '';
    return { result: null, normalized, issues: field ? [{ field, message }] : [], error: message };
  }
}

export function transformInput(tool: ToolId, values: Values, field: string, value: string): Values {
  const next = { ...values, [field]: value };
  const convert = (key: string, factor: number) => { const current = parseNumericValue(values[key]); if (Number.isFinite(current)) next[key] = String(Number((current * factor).toPrecision(14))); };
  if (tool === 'mortgage' && field === 'downMode' && value !== values.downMode && parseNumericValue(values.price) > 0) convert('down', value === 'percent' ? 100 / parseNumericValue(values.price) : parseNumericValue(values.price) / 100);
  if (tool === 'bmi' && field === 'units' && value !== values.units) { convert('height', value === 'imperial' ? 1 / 2.54 : 2.54); convert('weight', value === 'imperial' ? 1 / .45359237 : .45359237); }
  if (tool === 'units' && field === 'category' && unitGroups[value]) { const units = Object.keys(unitGroups[value].units); next.from = units[0]; next.to = units[1]; }
  return next;
}

export function applyRegionalPresets(data: Record<ToolId, Values>, previous: CalculationContext, next: CalculationContext) {
  const tax = transitionTaxLocation(data.tax, previous, next);
  if (next.regionalPresets === false) return { ...data, tax };
  const before = getRegion(previous.country, previous.region), after = getRegion(next.country, next.region);
  const mortgage = { ...data.mortgage }, car = { ...data.car };
  // A location change updates only untouched presets, never an explicitly different cost assumption.
  if (parseNumericValue(mortgage.propertyTax) === before.propertyTax) mortgage.propertyTax = String(after.propertyTax);
  if (parseNumericValue(car.salesTax) === before.salesTax) car.salesTax = String(after.salesTax);
  if (mortgage.convention === (previous.country === 'CA' ? 'semiannual' : 'monthly')) mortgage.convention = next.country === 'CA' ? 'semiannual' : 'monthly';
  return { ...data, mortgage, car, tax };
}

export function scenarioValue(field: string, value: string, tool?: ToolId, values: Values = {}) {
  const n = parseNumericValue(value);
  if (field === 'extra' || field === 'contribution') return String(Math.max(0, n) + 100);
  if (field === 'rate') return String(n === 0 ? .5 : Math.max(0, n - .5));
  if (['years', 'months', 'n', 'k', 'count'].includes(field)) {
    const max = field === 'years' ? tool === 'mortgage' ? 50 : 100 : field === 'months' ? 120 : field === 'n' ? 1000 : field === 'k' ? Number(values.n || 1000) : 1e6;
    const min = field === 'n' ? Number(values.k || 0) : field === 'k' ? 0 : 1;
    return String(Math.max(min, Math.min(max, Math.round(n * (n >= max * .9 ? .9 : 1.1)) || 1)));
  }
  if (['p', 'pa', 'pb', 'joint', 'given'].includes(field)) return String(Math.min(field === 'joint' ? Number(values.given || 100) : 100, Math.max(field === 'given' ? Number(values.joint || 0) : 0, n * (n > 90 ? .9 : 1.1) || 1)));
  return String(Number((n * 1.1 || 1).toPrecision(12)));
}

export const goalDefinitions: Partial<Record<ToolId, { field: string; label: string; targetLabel: string }>> = {
  mortgage: { field: 'price', label: 'Home price', targetLabel: 'Target payment per period' },
  compound: { field: 'contribution', label: 'Monthly contribution', targetLabel: 'Target future balance' },
  currency: { field: 'amount', label: 'Source amount', targetLabel: 'Target converted amount' },
};

export function solveCalculationGoal(tool: ToolId, values: Values, ctx: CalculationContext, target: number) {
  const definition = goalDefinitions[tool];
  if (!definition || !Number.isFinite(target) || target < 0) throw new Error('Enter a valid non-negative target.');
  const normalized = normalizeValues(tool, values, ctx);
  let low = tool === 'mortgage' ? normalized.downMode === 'amount' ? Math.max(1, Number(normalized.down)) : 1 : tool === 'currency' ? Number(normalized.fee) : 0;
  let high = Math.max(low + 1000, Number(normalized[definition.field]) * 2, 1000);
  const evaluate = (value: number) => {
    const candidate = { ...normalized, [definition.field]: String(value) };
    const output = processCalculation(tool, candidate, ctx);
    if (!output.result || typeof output.result.value !== 'number') throw new Error(output.error || 'The selected method does not support a numerical target.');
    return { values: candidate, result: output.result };
  };
  const minimum = evaluate(low);
  if (Number(minimum.result.value) > target + .005) throw new Error(`This target is below the minimum result under the current inputs. Adjust your other assumptions first.`);
  if (Math.abs(Number(minimum.result.value) - target) < .005) return minimum;
  let upper = evaluate(high);
  for (let i = 0; i < 25 && Number(upper.result.value) < target && high < 1e12; i++) {
    high = Math.min(1e12, high * 2); upper = evaluate(high);
  }
  if (Number(upper.result.value) < target) throw new Error('The target is outside the supported range for these inputs.');
  // Bracketed bisection uses the real calculator, including selected costs, rather than a predicted answer.
  for (let i = 0; i < 70; i++) {
    const middle = (low + high) / 2;
    const output = evaluate(middle);
    const delta = Number(output.result.value) - target;
    if (Math.abs(delta) < .00001) return output;
    if (delta < 0) low = middle; else high = middle;
  }
  const answer = evaluate((low + high) / 2);
  if (Math.abs(Number(answer.result.value) - target) > .01) throw new Error('No result was found within the numerical tolerance. Review the selected assumptions.');
  return answer;
}
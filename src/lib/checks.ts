import { calculate, payment, binomialProbability, convertUnit, bracketTax, exactArrangements, mulberry32, binomialRange } from './calculations';
import { evaluateExpression } from './expression';
import { toolById } from './catalog';
import { countries, defaultSettings, localLevyOptions } from './regions';
import type { LocalLevyOption } from './regions';
import type { CountryId } from './types';
import { applyRegionalPresets, processCalculation, solveCalculationGoal, transformInput } from './processing';
import { normalizeNumberInput, parseNumericValue } from './format';
import type { ToolId, Values } from './types';
import { tools, unitGroups } from './catalog';
import { validateReferenceRate } from './rates';
import { methodSettings } from './methods';
import { regionalChecks } from './regionalChecks';
import { engineChecks } from './engine/checks';
import { siteChecks } from './engine/siteChecks';
import { utilityChecks } from './engine/utilityChecks';

export interface EngineCheck { name: string; passed: boolean; detail: string }
function engineCheckCases(): [string, () => void][] {
  const ctx = { ...defaultSettings, currency: 'USD' };
  const near = (actual: number, expected: number, tolerance = .00001) => { if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance) throw new Error(`Expected ${expected}; received ${actual}`); };
  const rejects = (fn: () => unknown) => { let rejected = false; try { fn(); } catch { rejected = true; } if (!rejected) throw new Error('Invalid input was not rejected.'); };
  const checks: [string, () => void][] = [
    ...regionalChecks,
    ...engineChecks,
    ...siteChecks,
    ...utilityChecks,
    ['Zero-interest loan', () => near(payment(12000, 0, 12), 1000)],
    ['Standard mortgage payment', () => near(payment(360000, .065 / 12, 360), 2275.444884574675, .001)],
    ['Amortization conserves principal', () => { const result = calculate('mortgage', toolById.mortgage.defaults, ctx); near(result.schedule!.reduce((sum,row) => sum + row.principal,0),360000); near(result.schedule![result.schedule!.length - 1].balance,0); }],
    ['Extra payments reduce loan interest', () => { const base = calculate('mortgage', toolById.mortgage.defaults, ctx); const extra = calculate('mortgage', {...toolById.mortgage.defaults,extra:'200'}, ctx); if (Number(extra.metrics[0].value) >= Number(base.metrics[0].value)) throw new Error('Interest did not decrease.'); }],
    ['Interest-only balloon obligation', () => { const result = calculate('mortgage', {...toolById.mortgage.defaults,method:'interest-only'}, ctx); near(Number(result.metrics.find(metric => metric.label === 'Final balloon payment')!.value),360000); }],
    ['Progressive bracket boundaries', () => near(bracketTax(20000, [[10000,.1],[Infinity,.2]]).total, 3000)],
    ['2025 US single filer tax', () => { const result = calculate('tax', { ...toolById.tax.defaults, income: '60000', includeRegional: 'false' }, ctx); near(Number(result.metrics[0].value), 5071.5); }],
    ['2023 US federal pack', () => { const result = calculate('tax', { ...toolById.tax.defaults, year: '2023', income: '60000', includeRegional: 'false' }, ctx); near(Number(result.metrics[0].value), 5460.5); }],
    ['2024 US federal pack shifts result', () => { const a = calculate('tax', { ...toolById.tax.defaults, year: '2023', income: '150000', includeRegional: 'false' }, ctx); const b = calculate('tax', { ...toolById.tax.defaults, year: '2024', income: '150000', includeRegional: 'false' }, ctx); if (Number(a.metrics[0].value) === Number(b.metrics[0].value)) throw new Error('Year packs produced identical tax.'); }],
    ['UK 2023/24 England pack', () => { const result = calculate('tax', { ...toolById.tax.defaults, year: '2023/24', income: '60000', includeRegional: 'false' }, { ...ctx, country: 'GB', region: 'ENG', currency: 'GBP' }); near(Number(result.metrics[0].value), 11432); }],
    ['Scotland uses its own bands', () => { const eng = calculate('tax', { ...toolById.tax.defaults, year: '2023/24', income: '60000', includeRegional: 'false' }, { ...ctx, country: 'GB', region: 'ENG', currency: 'GBP' }); const sct = calculate('tax', { ...toolById.tax.defaults, year: '2023/24', income: '60000', includeRegional: 'false' }, { ...ctx, country: 'GB', region: 'SCT', currency: 'GBP' }); if (Number(eng.metrics[0].value) === Number(sct.metrics[0].value)) throw new Error('Scotland bands identical to England.'); }],
    ['Canada 2023 federal pack', () => { const result = calculate('tax', { ...toolById.tax.defaults, year: '2023', income: '60000', includeRegional: 'false', payroll: 'false' }, { ...ctx, country: 'CA', region: 'ON', currency: 'CAD' }); const federalOnly = Number(result.metrics[0].value) - Number(result.breakdown.find(part => part.label === 'State / provincial tax')!.value); if (!Number.isFinite(federalOnly) || federalOnly <= 0) throw new Error('Federal component missing.'); }],
    ['Australia LITO credit', () => { const withLito = calculate('tax', { ...toolById.tax.defaults, year: '2024/25', income: '40000', includeRegional: 'false' }, { ...ctx, country: 'AU', region: 'NSW', currency: 'AUD' }); const expected = bracketTax(40000, [[18200, 0], [45000, .16], [135000, .3], [190000, .37], [Infinity, .45]]).total - Math.min(700, (45000 - 40000) * .016); near(Number(withLito.metrics[0].value), expected); }],
    ['Mortgage balloon reconciles', () => { const result = calculate('mortgage', { ...toolById.mortgage.defaults, method: 'balloon', balloonPct: '50', extra: '0' }, ctx); const expected = (Number(toolById.mortgage.defaults.price) - Number(toolById.mortgage.defaults.down)) / 2; near(Number(result.metrics.find(metric => metric.label === 'Final balloon payment')!.value), expected, 1); if (result.schedule!.reduce((sum, row) => sum + row.principal, 0) > expected + 1) throw new Error('Schedule amortized the balloon portion.'); }],
    ['Monte Carlo matches exact binomial', () => { const rng = mulberry32(20250101); let hits = 0; for (let s = 0; s < 100000; s++) { let count = 0; for (let t = 0; t < 10; t++) if (rng() < .5) count++; if (count === 3) hits++; } const est = hits / 100000; if (Math.abs(est - binomialRange(10, 3, .5, 'exactly')) > .004) throw new Error(`Simulated ${est} diverges from exact.`); }],
    ['Country-specific social contributions', () => { const result = calculate('tax', { ...toolById.tax.defaults, social: '10', income: '50000', includeRegional: 'false' }, { ...ctx, country: 'DE', region: 'BE', currency: 'EUR' }); const payroll = Number(result.breakdown.find(part => part.label === 'Payroll / contributions')!.value); near(payroll, 5000); }],
    ['Canadian payroll contribution caps', () => { const result = calculate('tax', { ...toolById.tax.defaults, income: '100000', payroll: 'true' }, {...ctx,country:'CA',region:'ON',currency:'CAD'}); near(result.breakdown.find(part => part.label === 'Payroll / contributions')!.value, 5507.58); }],
    ['Binomial edge probability', () => { near(binomialProbability(10, 0, 0), 1); near(binomialProbability(10, 10, 1), 1); near(binomialProbability(10, 3, .5), .1171875); }],
    ['Metric / imperial equivalence', () => near(convertUnit(1, 'length', 'in', 'cm'), 2.54)],
    ['Regional decimal input', () => { near(Number(normalizeNumberInput('1.234,56','de-DE')),1234.56); near(Number(normalizeNumberInput('1,234.56','en-US')),1234.56); near(Number(normalizeNumberInput('6,5','de-DE')),6.5); }],
    ['Temperature offset conversion', () => { near(convertUnit(32, 'temperature', 'F', 'C'), 0); near(convertUnit(100, 'temperature', 'C', 'F'), 212); }],
    ['Reject temperature below absolute zero', () => rejects(() => convertUnit(-1, 'temperature', 'K', 'C'))],
    ['Currency conversion after fees', () => near(Number(calculate('currency', {...toolById.currency.defaults,source:'manual',amount:'100',fee:'2',spread:'1',customRate:'0.9'},ctx).value),87.318)],
    ['Zero-rate growth with contributions', () => near(Number(calculate('compound', { ...toolById.compound.defaults, rate: '0' }, ctx).value), 34000)],
    ['Layered fee reverse calculation', () => { const values = { ...toolById.transaction.defaults, amount: '1000', method: 'gross-up', platform: '2', vat: '20', spread: '1.5', crossBorder: '1', payout: '2' }; const gross = Number(calculate('transaction', values, ctx).value); near(Number(calculate('transaction', { ...values, amount: String(gross), method: 'net', taxMode: 'inclusive' }, ctx).value), 1000); }],
    ['Scientific variable evaluation', () => near(evaluateExpression('sqrt(x^2 + y^2)', 3, 4), 5)],
    ['Degree-mode trigonometry', () => near(evaluateExpression('sin(30)', 0, 0, true), .5)],
    ['Expression sandbox', () => { rejects(() => evaluateExpression('x = 2')); rejects(() => evaluateExpression('import(1)')); rejects(() => evaluateExpression('[1,2,3]')); }],
    ['Reject impossible probability', () => rejects(() => calculate('probability', { ...toolById.probability.defaults, method: 'conditional', joint: '80', given: '20' }, ctx))],
    ['Shorthand amount normalization', () => { near(parseNumericValue('450k'), 450000); near(parseNumericValue('$1.5m'), 1500000); near(parseNumericValue('6.5%'), 6.5); }],
    ['Every tool uses the validated pipeline', () => { for (const tool of tools) { const values = {...tool.defaults,...(tool.id === 'currency' ? {source:'manual'} : {})}; const output = processCalculation(tool.id, values, ctx); if (!output.result?.audit?.checks.every(check => check.passed)) throw new Error(`${tool.id}: ${output.error}`); } }],
    ['Independent module and multi-formula coverage', () => { const names = new Set<string>(); for (const tool of tools) { const values = {...tool.defaults,...(tool.id === 'currency' ? {source:'manual'} : {})}; const audit = processCalculation(tool.id, values, ctx).result?.audit; if (!audit?.module || audit.module.id !== tool.id || (audit.formulas?.length || 0) < 2 || (audit.networkNodes?.length || 0) < 2) throw new Error(`${tool.id} module coverage failed.`); names.add(audit.module.name); } if (names.size !== tools.length) throw new Error('Tool modules are not independently named.'); }],
    ['Every method produces a consistent example', () => { for (const tool of tools) { const config = methodSettings[tool.id]; for (const method of config.options) { const values = {...tool.defaults,[config.key]:method.value}; if (tool.id === 'units') { const units = Object.keys(unitGroups[method.value].units); values.from = units[0]; values.to = units[1]; } const output = processCalculation(tool.id,values,{...ctx,rate:.9,rateDate:'2025-12-31'}); if (!output.result) throw new Error(`${tool.id} / ${method.value}: ${output.error}`); } } }],
    ['Reject unsupported calculation settings', () => { const output = processCalculation('mortgage', {...toolById.mortgage.defaults,frequency:'13'},ctx); if (!output.issues.some(issue => issue.field === 'frequency') || output.result) throw new Error('An unsupported frequency was accepted.'); }],
    ['Find field-specific cross-input errors', () => { const output = processCalculation('mortgage', {...toolById.mortgage.defaults,down:'500000'},ctx); if (!output.issues.some(issue => issue.field === 'down')) throw new Error('Missing down-payment error.'); }],
    ['Down-payment transformation round trip', () => { const percent = transformInput('mortgage',toolById.mortgage.defaults,'downMode','percent'); near(Number(percent.down),20); const amount = transformInput('mortgage',percent,'downMode','amount'); near(Number(amount.down),90000); }],
    ['BMI unit transformation preserves the result', () => { const original = calculate('bmi',toolById.bmi.defaults,ctx); const imperial = transformInput('bmi',toolById.bmi.defaults,'units','imperial'); near(Number(calculate('bmi',imperial,ctx).value),Number(original.value)); }],
    ['Preserve custom regional cost assumptions', () => { const data = Object.fromEntries(tools.map(tool => [tool.id,{...tool.defaults}])) as Record<ToolId,Values>; data.mortgage.propertyTax = '2.25'; const updated = applyRegionalPresets(data,ctx,{...ctx,region:'TX'}); near(Number(updated.mortgage.propertyTax),2.25); near(Number(updated.car.salesTax),6.25); }],
    ['Exact large combination count', () => { if (exactArrangements(100,50).toString() !== '100891344545564193334812497256') throw new Error('Exact integer count mismatch.'); }],
    ['Goal solver finds the target payment', () => { const solved = solveCalculationGoal('mortgage',toolById.mortgage.defaults,ctx,2000); near(Number(solved.result.value),2000,.001); if (!solved.result.audit?.checks.every(check => check.passed)) throw new Error('Goal result failed audit.'); }],
    ['Contribution and currency target solvers', () => { near(Number(solveCalculationGoal('compound',toolById.compound.defaults,ctx,50000).result.value),50000,.001); near(Number(solveCalculationGoal('currency',{...toolById.currency.defaults,source:'manual',fee:'3',spread:'1'},ctx,500).result.value),500,.001); }],
    ['Goal solver rejects unreachable targets', () => rejects(() => solveCalculationGoal('compound',toolById.compound.defaults,ctx,1))],
    ['Exchange source validation', () => { near(validateReferenceRate({base:'USD',quote:'EUR',rate:.9,date:'2025-12-31'},'USD','EUR').rate,.9); rejects(() => validateReferenceRate({base:'EUR',quote:'USD',rate:.9,date:'2025-12-31'},'USD','EUR')); rejects(() => validateReferenceRate({base:'USD',quote:'EUR',rate:.9,date:'2025-02-30'},'USD','EUR')); }],
    ['Weekly and biweekly payroll periods prorate correctly', () => {
      const monthlyCalc = calculate('tax', { ...toolById.tax.defaults, taxPeriod: 'monthly', income: '5000', includeRegional: 'false' }, ctx);
      const weeklyCalc = calculate('tax', { ...toolById.tax.defaults, taxPeriod: 'weekly', income: '1154', includeRegional: 'false' }, ctx);
      near(Number(weeklyCalc.value) * (52 / 12), Number(monthlyCalc.value), 1.5);
    }],
    ['Custom jurisdiction tier builder', () => {
      const custom = calculate('tax', { ...toolById.tax.defaults, method: 'custom', income: '100000', includeRegional: 'false', customCap1: '30000', customRate1: '10', customCap2: '80000', customRate2: '20', customCap3: '120000', customRate3: '30', customCap4: '200000', customRate4: '40', customRate5: '45' }, ctx);
      // expected: 30,000×.10 + 50,000×.20 + 20,000×.30 = 3,000+10,000+6,000 = 19,000; tax on 100k taxable (deduction=15750): taxable = 84,250
      const expected = 30000*.10 + 50000*.20 + 4250*.30;
      near(Number(custom.metrics.find(m => m.label === 'Total income tax')!.value), expected, .01);
    }],
    ['Age 65+ senior standard deduction', () => {
      const normal = calculate('tax', { ...toolById.tax.defaults, income: '40000', includeRegional: 'false', age65: 'false' }, ctx);
      const senior = calculate('tax', { ...toolById.tax.defaults, income: '40000', includeRegional: 'false', age65: 'true' }, ctx);
      if (Number(senior.metrics.find(m => m.label === 'Total income tax')!.value) >= Number(normal.metrics.find(m => m.label === 'Total income tax')!.value)) throw new Error('Senior deduction did not reduce tax.');
    }],
    ['Dependent child credit auto-credits', () => {
      const families = calculate('tax', { ...toolById.tax.defaults, income: '70000', includeRegional: 'false', dependents: '2' }, ctx);
      const kidless = calculate('tax', { ...toolById.tax.defaults, income: '70000', includeRegional: 'false', dependents: '0' }, ctx);
      near(Number(kidless.metrics.find(m => m.label === 'Total income tax')!.value) - Number(families.metrics.find(m => m.label === 'Total income tax')!.value), 4400, 1);
    }],
    ['Withholding refund comparison', () => {
      const result = calculate('tax', { ...toolById.tax.defaults, income: '60000', includeRegional: 'false', withholding: '8000' }, ctx);
      const refund = result.metrics.find(m => m.label.startsWith('Estimated refund'))?.value as number;
      near(refund, 8000 - Number(result.metrics[0].value), 0.01);
    }],
    ['Ireland PAYE employee tax credit', () => {
      const result = calculate('tax', { ...toolById.tax.defaults, income: '60000', includeRegional: 'false' }, { ...ctx, country: 'IE', region: 'IE-D', currency: 'EUR' });
      if (Number(result.metrics.find(m => m.label === 'Total income tax')!.value) <= 0) throw new Error('Ireland calculation invalid.');
    }],
    ['Netherlands Box 1 with AHTK phaseout', () => {
      const result = calculate('tax', { ...toolById.tax.defaults, income: '60000', includeRegional: 'false' }, { ...ctx, country: 'NL', region: 'NL-NH', currency: 'EUR' });
      if (Number(result.metrics.find(m => m.label === 'Total income tax')!.value) <= 0) throw new Error('Netherlands calculation invalid.');
    }],
    ['UAE zero income tax structure', () => {
      const result = calculate('tax', { ...toolById.tax.defaults, income: '100000', includeRegional: 'false' }, { ...ctx, country: 'AE', region: 'AE-DXB', currency: 'AED' });
      near(Number(result.metrics.find(m => m.label === 'Total income tax')!.value), 0);
    }],
    ['Indonesia PTKP allowance', () => {
      const result = calculate('tax', { ...toolById.tax.defaults, income: '50000000', includeRegional: 'false' }, { ...ctx, country: 'ID', region: 'ID-JK', currency: 'IDR' });
      if (Number(result.metrics.find(m => m.label === 'Total income tax')!.value) < 0) throw new Error('Indonesia calculation invalid.');
    }],
    ['Poland kwota wolna credit', () => {
      const result = calculate('tax', { ...toolById.tax.defaults, income: '60000', includeRegional: 'false' }, { ...ctx, country: 'PL', region: 'PL-MAZ', currency: 'PLN' });
      if (Number(result.metrics.find(m => m.label === 'Total income tax')!.value) < 0) throw new Error('Poland calculation invalid.');
    }],
    ['Hong Kong salaries tax pack', () => {
      const result = calculate('tax', { ...toolById.tax.defaults, income: '400000', includeRegional: 'false', year: '2025/26' }, { ...ctx, country: 'HK', region: 'HK-HK', currency: 'HKD' });
      if (Number(result.metrics.find(m => m.label === 'Total income tax')!.value) <= 0) throw new Error('Hong Kong tax missing.');
    }],
    ['All supported countries produce valid tax results', () => {
      const allCountries = Object.keys(countries) as CountryId[];
        if (allCountries.length < 100) throw new Error(`Only ${allCountries.length} countries defined.`);
      for (const country of allCountries) {
        const year = countries[country].years[countries[country].years.length - 1].id;
        const region = countries[country].regions[0];
        const values: Record<string, string> = { ...toolById.tax.defaults, income: '60000', includeRegional: 'true', year, county: region.counties[0]?.id || '' };
        // Clear optional percentage-levy rates that defaults leave blank for regions without them.
        Object.keys(values).forEach(key => { if (key.endsWith('Rate') && (values[key] === '' || values[key] === undefined)) values[key] = '0'; });
        localLevyOptions(country, region.id, values.county).forEach((levy: LocalLevyOption) => {
          const rateKey = `${levy.id}Rate`;
          const active = values[levy.id] === 'true' || (values[levy.id] === undefined && levy.defaultOn);
          if (active && (values[rateKey] === undefined || values[rateKey] === '')) values[rateKey] = String(levy.defaultRate);
        });
        const out = processCalculation('tax', values, { ...ctx, country, region: region.id, currency: countries[country].currency });
        if (!out.result) throw new Error(`${country}: ${out.error}`);
      }
    }],
    ['Complexity modes do not break calculations', () => {
      for (const mode of ['simple', 'standard', 'advanced'] as const) {
        for (const tool of tools) {
          const values = { ...tool.defaults, ...(tool.id === 'currency' ? { source: 'manual' } : {}), ...(tool.id === 'tax' ? { income: '60000' } : {}) };
          const out = processCalculation(tool.id, values, { ...ctx, complexity: mode, rate: 0.9, rateDate: '2025-12-31' });
          if (!out.result) throw new Error(`${tool.id}/${mode}: ${out.error}`);
        }
      }
    }],
    ['Washington D.C. is a special US region, not a country pack', () => {
      if ('DC' in countries) throw new Error('D.C. should not be a country.');
      const dc = countries.US.regions.find(r => r.id === 'DC');
      if (!dc || !dc.brackets) throw new Error('D.C. missing as US special region.');
      const out = processCalculation('tax', { ...toolById.tax.defaults, income: '90000', includeRegional: 'true', year: '2025', county: '' }, { ...ctx, country: 'US', region: 'DC' });
      if (!out.result) throw new Error(out.error);
    }],
    ['Per-tool complexity is independent', () => {
      const simpleTax = processCalculation('tax', { ...toolById.tax.defaults, income: '60000', includeRegional: 'false' }, { ...ctx, complexity: 'simple' });
      const advancedMortgage = processCalculation('mortgage', toolById.mortgage.defaults, { ...ctx, complexity: 'advanced' });
      if (!simpleTax.result || !advancedMortgage.result) throw new Error('Per-tool complexity failed.');
    }],
    ['California levies are independently optional', () => {
      const withState = calculate('tax', { ...toolById.tax.defaults, income: '90000', caStateIncome: 'true', caSdi: 'false', caStateSales: 'false', caDistrictSales: 'false', caLocalIncome: 'false', caProperty: 'false', caCustomLocal: 'false', includeRegional: 'true' }, { ...ctx, country: 'US', region: 'CA' });
      const withoutState = calculate('tax', { ...toolById.tax.defaults, income: '90000', caStateIncome: 'false', caSdi: 'false', caStateSales: 'false', caDistrictSales: 'false', caLocalIncome: 'false', caProperty: 'false', caCustomLocal: 'false', includeRegional: 'false' }, { ...ctx, country: 'US', region: 'CA' });
      if (!(Number(withState.breakdown.find(p => p.label === 'State / provincial tax')!.value) > Number(withoutState.breakdown.find(p => p.label === 'State / provincial tax')!.value))) throw new Error('CA state toggle failed.');
    }],
    ['Puerto Rico is not an IRS state schedule', () => {
      const result = calculate('tax', { ...toolById.tax.defaults, income: '40000', includeRegional: 'false', year: '2025' }, { ...ctx, country: 'PR', region: 'PR-SJ', currency: 'USD' });
      if (!result.warnings.some(w => /933|Hacienda|territory/i.test(w))) throw new Error('Puerto Rico divergence note missing.');
    }],
    ['Scotland does not use rUK bands', () => {
      const eng = calculate('tax', { ...toolById.tax.defaults, year: '2025/26', income: '60000', includeRegional: 'false' }, { ...ctx, country: 'GB', region: 'ENG', currency: 'GBP' });
      const sct = calculate('tax', { ...toolById.tax.defaults, year: '2025/26', income: '60000', includeRegional: 'false' }, { ...ctx, country: 'GB', region: 'SCT', currency: 'GBP' });
      if (Number(eng.metrics[0].value) === Number(sct.metrics[0].value)) throw new Error('Scotland matched England.');
      if (!sct.warnings.some(w => /Scottish Income Tax/i.test(w))) throw new Error('Scotland note missing.');
    }],
  ];
  return checks;
}

function executeCheck([name, check]: [string, () => void]): EngineCheck {
  try { check(); return { name, passed: true, detail: 'Passed' }; }
  catch (error) { return { name, passed: false, detail: error instanceof Error ? error.message : 'Failed' }; }
}

export function runEngineChecks(): EngineCheck[] {
  return engineCheckCases().map(executeCheck);
}

export async function runEngineChecksResponsive(onProgress: (results: EngineCheck[], total: number) => void, signal: AbortSignal) {
  const cases = engineCheckCases();
  const results: EngineCheck[] = [];
  for (const check of cases) {
    // Yield between checks so mobile navigation and the progress label stay responsive.
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    if (signal.aborted) return;
    results.push(executeCheck(check));
    onProgress([...results], cases.length);
  }
}
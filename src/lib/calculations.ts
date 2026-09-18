import type { CalculationContext, CalculationResult, PaymentRow, ToolId, Values } from './types';
import { countries, getRegion, getTaxYear, jurisdictionProfile, localLevyOptions } from './regions';
import type { LocalLevyOption } from './regions';
import type { Bracket } from './regions';
import { unitGroups } from './catalog';
import { evaluateExpression } from './expression';
import { formatMoney, formatNumber } from './format';
import { taxDefaultsForLocation } from './regionalSettings';
import { toSignificant } from './engine/optimizer';

const BLUE = '#4564ed', PINK = '#edacd3', PURPLE = '#aa8be7', GRAY = '#cbd1e8';
const fieldNames: Record<string, string> = { price: 'Price', down: 'Down payment', rate: 'Interest / fee rate', years: 'Term in years', months: 'Term in months', n: 'Trials / objects', k: 'Successes / selected objects', p: 'Success probability', pa: 'P(A)', pb: 'P(B)', joint: 'Joint probability', given: 'Condition probability', propertyTax: 'Property tax rate', customRate: 'Custom exchange rate', income: 'Annual income', extra: 'Extra payment' };
export function numberValue(values: Values, key: string, min = 0, max = 1e12, integer = false) {
  const raw = values[key];
  const value = Number(raw);
  const label = fieldNames[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, char => char.toUpperCase());
  if (raw === undefined || raw.trim() === '' || !Number.isFinite(value)) throw new Error(`Enter a valid ${label.toLowerCase()}.`);
  if (value < min || value > max) throw new Error(`${label} must be between ${min.toLocaleString()} and ${max.toLocaleString()}.`);
  if (integer && !Number.isInteger(value)) throw new Error(`${label} must be a whole number.`);
  return value;
}
export function payment(principal: number, periodicRate: number, periods: number) {
  if (periods <= 0) throw new Error('The loan term must be greater than zero.');
  if (principal === 0) return 0;
  if (periodicRate === 0) return principal / periods;
  return principal * periodicRate / -Math.expm1(-periods * Math.log1p(periodicRate));
}

export function solveActuarialApr(principal: number, closingCosts: number, periodicPayment: number, periods: number, frequency: number, nominalRate: number): number {
  const netProceeds = Math.max(1, principal - closingCosts);
  if (closingCosts <= 0 || principal <= 0 || periodicPayment <= 0) return nominalRate * 100;
  let r = nominalRate / frequency;
  for (let iter = 0; iter < 45; iter++) {
    if (r <= 1e-8) r = 1e-6;
    const pow = Math.pow(1 + r, -periods);
    const pv = periodicPayment * (1 - pow) / r;
    const f = pv - netProceeds;
    if (Math.abs(f) < 1e-6) break;
    const dpv = periodicPayment * (periods * pow / (r * (1 + r)) - (1 - pow) / (r * r));
    if (Math.abs(dpv) < 1e-12) break;
    r = Math.max(1e-7, r - f / dpv);
  }
  return r * frequency * 100;
}
export function amortize(principal: number, rate: number, periods: number, basePayment: number, extra = 0, interestOnly = false) {
  const rows: PaymentRow[] = [];
  let balance = principal;
  let balloon = 0;
  for (let period = 1; period <= periods && balance > .0000001; period++) {
    const interest = balance * rate;
    let paid = Math.min(balance + interest, (interestOnly ? interest : basePayment) + extra);
    if (period === periods) {
      balloon = balance + interest - paid > .005 ? balance + interest - paid : 0;
      paid = balance + interest;
    }
    const principalPaid = Math.max(0, paid - interest);
    balance = Math.max(0, balance - principalPaid);
    rows.push({ period, payment: paid, principal: principalPaid, interest, balance });
  }
  return { rows, interest: rows.reduce((sum, row) => sum + row.interest, 0), balloon };
}
export function bracketTax(income: number, brackets: Bracket[]) {
  let previous = 0, total = 0;
  const rows: { lower: number; upper: number; rate: number; amount: number; tax: number }[] = [];
  for (const [ceiling, rate] of brackets) {
    const amount = Math.max(0, Math.min(income, ceiling) - previous);
    if (amount > 0) rows.push({ lower: previous, upper: ceiling, rate, amount, tax: amount * rate });
    total += amount * rate;
    previous = ceiling;
    if (income <= ceiling) break;
  }
  return { total, rows, marginal: rows[rows.length - 1]?.rate || 0 };
}

function mortgage(v: Values, ctx: CalculationContext): CalculationResult {
  const price = numberValue(v, 'price', 1);
  const downInput = numberValue(v, 'down', 0, v.downMode === 'percent' ? 100 : price);
  const down = v.downMode === 'percent' ? price * downInput / 100 : downInput;
  const principal = price - down;
  const annualRate = numberValue(v, 'rate', 0, 100) / 100;
  const years = numberValue(v, 'years', 1, 50, true);
  const frequency = numberValue(v, 'frequency', 12, 52, true);
  const compounding = v.convention === 'semiannual' ? 2 : v.convention === 'effective' ? 1 : 12;
  const r = Math.expm1(Math.log1p(annualRate / compounding) * compounding / frequency);
  const periods = years * frequency;
  const interestOnly = v.method === 'interest-only';
  const balloonPct = v.method === 'balloon' ? numberValue(v, 'balloonPct', 0, 100, true) : 0;
  const balloon = principal * balloonPct / 100;
  const amortizingPrincipal = principal - balloon;
  const base = interestOnly ? principal * r : v.method === 'balloon' ? payment(amortizingPrincipal, r, periods) : payment(principal, r, periods);
  const extra = principal > 0 && !interestOnly ? numberValue(v, 'extra') : 0;
  const schedule = amortize(interestOnly ? principal : amortizingPrincipal, r, periods, base, interestOnly ? 0 : extra, interestOnly);

  // Month and calendar schedule support
  const startMonth = Math.max(1, Math.min(12, Number(v.startMonth) || 1));
  const startYear = Math.max(1990, Math.min(2100, Number(v.startYear) || 2025));
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const rowsWithDates: PaymentRow[] = schedule.rows.map((row, idx) => {
    const elapsedMonths = Math.floor(idx * 12 / frequency);
    const totalMonthIdx = (startMonth - 1) + elapsedMonths;
    const rowYear = startYear + Math.floor(totalMonthIdx / 12);
    const rowMonth = totalMonthIdx % 12;
    return {
      ...row,
      date: `${monthNames[rowMonth]} ${rowYear}`,
      yearNumber: rowYear,
      monthName: monthNames[rowMonth],
    };
  });
  const finalRow = rowsWithDates[rowsWithDates.length - 1];
  const payoffDateLabel = finalRow ? finalRow.date : `${startYear + years}`;

  const includeCosts = v.includeCosts === 'true';
  const tax = includeCosts ? price * numberValue(v, 'propertyTax', 0, 30) / 100 / frequency : 0;
  const insurance = includeCosts ? numberValue(v, 'insurance') / frequency : 0;
  const hoa = includeCosts ? numberValue(v, 'hoa') * 12 / frequency : 0;
  const pmi = includeCosts && down / price < .2 ? principal * numberValue(v, 'pmi', 0, 10) / 100 / frequency : 0;
  const closing = numberValue(v, 'closing');
  const unit = frequency === 12 ? 'month' : frequency === 26 ? '2 weeks' : 'week';
  const total = Math.min(principal + principal * r, base + extra) + tax + insurance + hoa + pmi;
  const aprValue = solveActuarialApr(principal, closing, base, periods, frequency, annualRate);
  const pmiDropRow = pmi > 0 ? rowsWithDates.find(row => row.balance <= price * 0.78) : undefined;
  return {
    label: `Your estimated ${frequency === 12 ? 'monthly' : frequency === 26 ? 'biweekly' : 'weekly'} payment`, value: total, format: 'money', suffix: `/ ${unit}`,
    description: `${v.method === 'balloon' ? `Balloon structure: ${balloonPct}% of the loan is due at term end.` : interestOnly ? 'Interest-only structure: principal is due at term end.' : 'Fully amortizing loan.'} Start date: ${monthNames[startMonth - 1]} ${startYear}. Estimated payoff: ${payoffDateLabel}.${pmiDropRow ? ` PMI drops in ${pmiDropRow.date} (at 78% LTV).` : ''}`,
    breakdown: [{ label: 'Principal & interest', value: base, color: BLUE }, { label: 'Property tax', value: tax, color: PINK }, { label: 'Home insurance', value: insurance, color: PURPLE }, ...(hoa ? [{ label: 'HOA / service charges', value: hoa, color: GRAY }] : []), ...(pmi ? [{ label: 'Mortgage insurance', value: pmi, color: '#8aa4ef' }] : []), ...(extra ? [{ label: 'Extra principal', value: Math.max(0, total - tax - insurance - hoa - pmi - base), color: '#67b6a4' }] : [])],
    metrics: [
      { label: 'Total interest', value: schedule.interest, format: 'money' },
      { label: 'Actuarial APR (with closing)', value: aprValue, format: 'percent' },
      { label: 'Estimated payoff date', value: principal === 0 ? 'No loan needed' : `${payoffDateLabel} (${formatNumber(schedule.rows.length / frequency, 1)} yrs)` },
      ...((interestOnly || v.method === 'balloon') ? [{ label: 'Final balloon payment', value: interestOnly ? schedule.balloon : balloon, format: 'money' as const }] : []),
    ],
    formula: interestOnly ? 'M = P x r; remaining principal is due at maturity' : v.method === 'balloon' ? 'M = (P - B) r / (1 - (1 + r)^(-n)); B due at maturity' : annualRate === 0 ? 'M = P / n' : 'M = P r / (1 - (1 + r)^(-n))',
    steps: [
      `Loan principal: ${formatMoney(price, ctx.currency)} - ${formatMoney(down, ctx.currency)} = ${formatMoney(principal, ctx.currency)}.`,
      `Periodic rate: (1 + ${(annualRate * 100).toFixed(2)}% / ${compounding})^(${compounding}/${frequency}) - 1 = ${(r * 100).toFixed(6)}%.`,
      `Schedule starts ${monthNames[startMonth - 1]} ${startYear} and reaches zero balance in ${payoffDateLabel}.`,
      `${periods} scheduled payments. ${interestOnly ? 'Interest-only payment is P x r; unpaid principal is due at maturity.' : v.method === 'balloon' ? `Payments amortize ${formatMoney(amortizingPrincipal, ctx.currency)}; ${balloonPct}% (${formatMoney(balloon, ctx.currency)}) is due as a balloon at term end.` : 'Apply the amortizing payment formula, then simulate extra principal payments.'}`,
      `Add ${formatMoney(tax + insurance + hoa + pmi, ctx.currency)} in ownership costs per payment period.`,
      `Upfront down payment plus closing costs: ${formatMoney(down + closing, ctx.currency)}. Closing costs are not financed.`,
      'Interest totals are accumulated without intermediate rounding. Displayed payment rows may differ by a cent when summed.'
    ],
    warnings: [...(pmi ? ['Mortgage insurance is held constant in this estimate; automatic cancellation is not modeled.'] : []), ...(interestOnly || v.method === 'balloon' ? ['The regular payment does not include the final balloon. A sale or refinance is needed to settle it at maturity.'] : []), ...(ctx.country === 'GB' || ctx.country === 'AU' ? ['Council charges, stamp duty, and land taxes are not preset. Add recurring charges under HOA / service charges.'] : [])],
    schedule: rowsWithDates, frequency, centerLabel: 'LOAN AMOUNT', centerValue: principal,
  };
}

function tax(v: Values, ctx: CalculationContext): CalculationResult {
  v = { ...taxDefaultsForLocation(ctx.country, ctx.region, ctx.county), ...v };
  const isMonthly = v.taxPeriod === 'monthly';
  const isWeekly = v.taxPeriod === 'weekly';
  const isBiweekly = v.taxPeriod === 'biweekly';
  const isPartial = v.taxPeriod === 'partial';
  const monthsCount = isPartial ? Math.max(1, Math.min(12, Number(v.monthsCount) || 12)) : 12;
  const rawIncome = numberValue(v, 'income');
  const rawOther = numberValue(v, 'otherIncome');
  const rawPretax = numberValue(v, 'pretax');

  // Unit: annual, monthly (x12), weekly (x52), biweekly (x26), or partial months
  const annualMultiplier = isMonthly ? 12 : isWeekly ? 52 : isBiweekly ? 26 : isPartial ? (12 / monthsCount) : 1;
  const income = rawIncome * annualMultiplier;
  const other = rawOther * annualMultiplier;
  const gross = income + other;

  const country = countries[ctx.country];
  const pack = getTaxYear(ctx.country, v.year || '');
  const profile = country.profiles?.find(item => item.value === v.taxProfile) || country.profiles?.[0];
  const canadianPayroll = ctx.country === 'CA' && v.payroll === 'true';
  const cppEarnings = Math.max(0, Math.min(income, 71300) - 3500);
  const cppBase = canadianPayroll ? cppEarnings * .0495 : 0;
  const cppEnhanced = canadianPayroll ? cppEarnings * .01 + Math.max(0, Math.min(income, 81200) - 71300) * .04 : 0;
  const ei = canadianPayroll ? Math.min(income, 65700) * .0164 : 0;
  const adjusted = Math.max(0, gross - (rawPretax * annualMultiplier) - cppEnhanced);
  const region = getRegion(ctx.country, ctx.region);
  const law = jurisdictionProfile(ctx.country, ctx.region);
  const joint = v.filing === 'joint';
  const status: 'single' | 'joint' | 'head' = joint ? 'joint' : v.filing === 'head' ? 'head' : 'single';
  let deduction = profile?.allowance ?? pack.deduction[status];
  let federalCredit = 0;
  let brackets: Bracket[];
  const packNotes: string[] = [];
  if (law.note) packNotes.push(law.note);
  // Age-based senior standard deduction addition (United States)
  let seniorDeductionAdd = 0;
  if (ctx.country === 'US' && v.age65 === 'true') {
    const seniorMap: Record<string, number> = {
      '2021': joint ? 1350 : 1700, '2022': joint ? 1400 : 1750, '2023': joint ? 1500 : 1850,
      '2024': joint ? 1550 : 1950, '2025': joint ? 1600 : 2000, '2026': joint ? 1650 : 2100,
    };
    seniorDeductionAdd = seniorMap[pack.label.split(' ')[0].replace(' (Projected / Rev. Proc. 2025-32)', '')] || 2000;
    packNotes.push(`Senior citizen / age 65+ standard deduction add-on of ${formatMoney(seniorDeductionAdd, ctx.currency)} is applied.`);
    deduction += seniorDeductionAdd;
  }

  // Number of minor children / dependents (United States Child Tax Credit)
  let dependentCreditAuto = 0;
  if (ctx.country === 'US') {
    const dependents = Math.max(0, Math.min(8, Math.round(Number(v.dependents) || 0)));
    if (dependents > 0) {
      const ctcMap: Record<string, number> = { '2021': 3600, '2022': 2000, '2023': 2000, '2024': 2000, '2025': 2200, '2026': 2200 };
      const perChild = ctcMap[pack.label.split(' ')[0]] || 2000;
      dependentCreditAuto = dependents * perChild;
      packNotes.push(`${dependents} child dependents: Child Tax Credit of ${formatMoney(perChild, ctx.currency)}/child applied (${formatMoney(dependentCreditAuto, ctx.currency)} total).`);
    }
  }

  if (ctx.country === 'US') {
    brackets = pack.federal[status];
    if (pack.label !== country.taxYear) packNotes.push(`Using the ${pack.label} federal pack: brackets and standard deduction are from that year's official revenue procedure.`);
  } else if (ctx.country === 'CA') {
    brackets = pack.federal.single;
    const taperStart = pack.federal.single[2][0], taperEnd = pack.federal.single[3][0];
    const allowance = pack.deduction.single - Math.min(1, Math.max(0, (adjusted - taperStart) / (taperEnd - taperStart))) * (16129 - 14538);
    federalCredit = (allowance + cppBase + ei) * pack.federal.single[0][1];
  } else if (ctx.country === 'GB') {
    deduction = Math.max(0, pack.deduction.single - Math.max(0, adjusted - 100000) / 2);
    brackets = ctx.region === 'SCT' ? pack.scotland! : pack.federal.single;
    if (v.marriage === 'true') { federalCredit += 75.6; packNotes.push('Marriage Allowance: up to £75.60 annual reduction, from 6% of the £1,260 transferred allowance.'); }
  } else if (ctx.country === 'AU') {
    brackets = pack.federal.single;
    const lito = pack.credit?.(income) || 0;
    if (lito > 0) { federalCredit += lito; packNotes.push(`${pack.creditLabel}: ${formatMoney(lito, ctx.currency)} credited for the ${pack.label} pack.`); }
  } else {
    brackets = profile?.brackets || pack.federal.single;
    packNotes.push(`${country.legalBody} reference, ${pack.label}: ${country.rules}`);
  }
  if (v.deductionMode === 'custom') deduction = numberValue(v, 'deduction') * annualMultiplier;
  if (country.additionalAllowanceLabel && v.method === 'progressive') deduction += numberValue(v, 'countryRelief');
  if (profile) packNotes.push(`${profile.label}: ${profile.description}${v.method !== 'progressive' ? ' The selected custom/flat method overrides this profile tariff.' : ''}`);
  const taxable = Math.max(0, adjusted - deduction);

  // Custom user-defined bracket tiers (independent of country reference packs)
  let nationalBrackets: Bracket[];
  if (v.method === 'custom') {
    nationalBrackets = [
      [numberValue(v, 'customCap1', .01, 1e12), numberValue(v, 'customRate1', 0, 100) / 100],
      [numberValue(v, 'customCap2', 0, 1e12), numberValue(v, 'customRate2', 0, 100) / 100],
      [numberValue(v, 'customCap3', 0, 1e12), numberValue(v, 'customRate3', 0, 100) / 100],
      [numberValue(v, 'customCap4', 0, 1e12), numberValue(v, 'customRate4', 0, 100) / 100],
      [Infinity, numberValue(v, 'customRate5', 0, 100) / 100],
    ];
    // Sort ascending so sequences are valid even if users swap rows
    nationalBrackets = nationalBrackets.map((row, idx) => idx === nationalBrackets.length - 1 ? row : row).sort((a, b) => a[0] - b[0]) as Bracket[];
    packNotes.unshift(`Custom jurisdiction: user-defined cumulative tiers [${nationalBrackets.map(([cap, rate]) => `${formatMoney(cap, ctx.currency, 0)} @ ${(rate * 100).toFixed(1)}%`).join(' → ')}].`);
  } else {
    nationalBrackets = brackets;
  }

  const national = bracketTax(taxable, v.method === 'flat'
    ? [[Infinity, numberValue(v, 'flatRate', 0, 100) / 100]]
    : nationalBrackets);
  const ctc = ctx.country === 'US' ? (numberValue(v, 'ctc') + dependentCreditAuto) * annualMultiplier : 0;
  const nationalTax = Math.max(0, national.total - federalCredit - (numberValue(v, 'credits') * annualMultiplier) - ctc);
  
  let regionalTax = 0;
  let localTax = 0;
  let caSalesEstimate = 0;
  let caPropertyEstimate = 0;
  let caSdi = 0;
  const warnings: string[] = ['Planning estimate for resident employment income, not a tax return. Specialized reliefs, capital gains, business income rules, and cross-border credits are not modeled.'];
  const on = (id: string, fallback = false) => (v[id] ?? String(fallback)) === 'true';
  const levy = localLevyOptions(ctx.country, ctx.region, v.county);
  const enabledLevy = (id: string, fallback = false) => on(id, fallback);

  // Regional / state income tax via generic toggle with legacy includeRegional support.
  const regionIncomeId = ctx.country === 'US' ? 'stateIncome' : ctx.country === 'CA' ? 'provinceIncome' : 'regionIncome';
  const regionIncomeOn = v.includeRegional === 'false' ? false : enabledLevy(regionIncomeId, true);

  if (regionIncomeOn && ['US', 'CA'].includes(ctx.country)) {
    if (ctx.country === 'US' && region.brackets) {
      const stateDeduction = (region.allowance || 0) * (joint || v.filing === 'head' ? 2 : 1);
      const stateCaps = region.brackets.map(([cap, rate]): Bracket => [cap * (joint ? 2 : 1), rate]);
      regionalTax = bracketTax(Math.max(0, adjusted - stateDeduction), stateCaps).total;
      if (region.id === 'CA') regionalTax += Math.max(0, adjusted - stateDeduction - 1e6) * .01;
    } else if (ctx.country === 'CA' && pack.regional?.[ctx.region]) {
      const province = pack.regional[ctx.region];
      regionalTax = Math.max(0, bracketTax(taxable, province.brackets).total - (province.allowance + cppBase + ei) * province.brackets[0][1]);
      if (ctx.region === 'ON') {
        const surtax = Math.max(0, regionalTax - 5710) * .2 + Math.max(0, regionalTax - 7307) * .36;
        const health = taxable <= 20000 ? 0 : taxable <= 36000 ? Math.min(300, (taxable - 20000) * .06) : taxable <= 48000 ? Math.min(450, 300 + (taxable - 36000) * .06) : taxable <= 72000 ? Math.min(600, 450 + (taxable - 48000) * .25) : taxable <= 200000 ? Math.min(750, 600 + (taxable - 72000) * .25) : Math.min(900, 750 + (taxable - 200000) * .25);
        regionalTax += surtax + health;
      }
    } else if (ctx.country === 'CA' && region.brackets) {
      regionalTax = Math.max(0, bracketTax(taxable, region.brackets).total - ((region.allowance || 0) + cppBase + ei) * region.brackets[0][1]);
    } else if (region.flatTax !== undefined) regionalTax = adjusted * region.flatTax;
    else regionalTax = adjusted * numberValue(v, 'regionalRate', 0, 100) / 100;
    packNotes.push(`${region.name} income tax enabled.`);
  } else if (regionIncomeOn && region.flatTax !== undefined) {
    regionalTax = adjusted * region.flatTax;
  } else if (regionIncomeOn && region.brackets) {
    regionalTax = bracketTax(taxable, region.brackets).total;
  } else if (regionIncomeOn) {
    regionalTax = adjusted * numberValue(v, 'regionalRate', 0, 100) / 100;
  }

  // Local income tax
  if (enabledLevy('localIncome', false)) {
    const rate = numberValue(v, 'localIncomeRate', 0, 100) / 100;
    localTax += adjusted * rate;
    packNotes.push(`Local income/wage levy at ${(rate * 100).toFixed(3)}%.`);
  }
  // Custom levy
  if (enabledLevy('customLevy', false)) {
    const rate = numberValue(v, 'customLevyRate', 0, 100) / 100;
    localTax += adjusted * rate;
    packNotes.push(`Custom levy at ${(rate * 100).toFixed(3)}% of adjusted income.`);
  }
  if (v.localFixed === 'true') {
    localTax += numberValue(v, 'localAnnualAmount');
    packNotes.push('The entered annual local charge is included and prorated to the selected display period. It is not an automatic jurisdiction lookup.');
  }

  let payroll = numberValue(v, 'contributions') * annualMultiplier + cppBase + cppEnhanced + ei + caSdi;
  if (v.payroll === 'true' && ctx.country === 'US') {
    const threshold = joint ? 250000 : 200000;
    payroll += Math.min(income, 176100) * .062 + income * .0145 + Math.max(0, income - threshold) * .009;
  }
  if (v.payroll === 'true' && ctx.country === 'GB') payroll += Math.max(0, Math.min(income, 50270) - 12570) * .08 + Math.max(0, income - 50270) * .02;
  if (ctx.country === 'AU' && v.medicare === 'true') payroll += income * .02;
  if (!['US', 'CA', 'GB', 'AU', 'AE'].includes(ctx.country)) {
    const socialRate = numberValue(v, 'social', 0, 50) / 100;
    if (socialRate > 0) payroll += income * socialRate;
  }

  // Generic payroll/social levy toggles from the local levy catalog
  levy.filter((l: LocalLevyOption) => l.kind === 'payroll' && l.id !== 'caSdi').forEach((l: LocalLevyOption) => {
    if (!enabledLevy(l.id, false)) return;
    const rate = numberValue(v, `${l.id}Rate`, 0, 100) / 100;
    const cap = numberValue(v, `${l.id}Cap`, 0, 1e12);
    const wages = l.id === 'countryPayroll' && v.countryPayrollBaseMode === 'custom' ? numberValue(v, 'countryPayrollBase') : income;
    const base = cap > 0 ? Math.min(wages, cap) : wages;
    payroll += base * rate;
    packNotes.push(`${l.label} enabled at ${(rate * 100).toFixed(2)}%${cap > 0 ? ` up to ${formatMoney(cap, ctx.currency)}` : ''}.`);
  });
  // Country-specific extras that are percentage levies
  const percentExtras = ['solidarity', 'churchTax', 'mls', 'usc', 'communalTax', 'surtaxPt', 'solidarityPl', 'residentTax', 'localIncomeTax', 'cess', 'surchargeIn', 'nhiTax', 'cantonalTax'];
  levy.filter((l: LocalLevyOption) => percentExtras.includes(l.id)).forEach((l: LocalLevyOption) => {
    if (!enabledLevy(l.id, l.defaultOn)) return;
    const rate = numberValue(v, `${l.id}Rate`, 0, 100) / 100;
    if (['solidarity', 'churchTax', 'cess', 'surchargeIn'].includes(l.id)) localTax += (regionalTax + nationalTax) * rate;
    else if (['localIncomeTax', 'communalTax'].includes(l.id)) localTax += nationalTax * rate;
    else if (l.id === 'solidarityPl') localTax += Math.max(0, taxable - 1000000) * rate;
    else if (['residentTax', 'cantonalTax'].includes(l.id)) localTax += taxable * rate;
    else localTax += adjusted * rate;
    packNotes.push(`${l.label} estimate applied at ${(rate * 100).toFixed(2)}%. Check the relevant exemption and contribution rules separately.`);
  });

  // Optional indirect/spending and property estimates use provisional net.
  const provisionalNet = Math.max(0, gross - (rawPretax * annualMultiplier) - nationalTax - regionalTax - localTax - payroll);
  const salesLevy = levy.find(l => l.kind === 'sales');
  if (salesLevy && enabledLevy(salesLevy.id, false)) {
    const rate = numberValue(v, `${salesLevy.id}Rate`, 0, 100) / 100;
    const share = numberValue(v, 'taxableSpendShare', 0, 100) / 100;
    caSalesEstimate = provisionalNet * share * rate;
    packNotes.push(`${salesLevy.label} estimated on ${(share * 100).toFixed(0)}% of after-tax income at ${(rate * 100).toFixed(2)}%.`);
  }
  const propertyLevy = levy.find(l => l.kind === 'property' && l.id === 'propertyTax');
  if (propertyLevy && enabledLevy('propertyTax', false)) {
    const rate = numberValue(v, 'propertyTaxRate', 0, 100) / 100;
    const assessed = numberValue(v, 'assessedValue', 0, 1e12);
    caPropertyEstimate = assessed * rate;
    packNotes.push(`Property tax estimate: ${formatMoney(assessed, ctx.currency)} at ${(rate * 100).toFixed(2)}%.`);
  }

  const allTaxAnnual = nationalTax + regionalTax + localTax + caSalesEstimate + caPropertyEstimate;
  const netAnnual = gross - (rawPretax * annualMultiplier) - allTaxAnnual - payroll;

  // Withholding comparison (refund / balance due)
  const withholding = numberValue(v, 'withholding', 0, 1e12) * annualMultiplier;
  const refundOrOwed = withholding - allTaxAnnual;

  // Prorate to period (monthly, weekly, biweekly, or partial months worked)
  const displayDivisor = isMonthly ? 12 : isWeekly ? 52 : isBiweekly ? 26 : isPartial ? (12 / monthsCount) : 1;
  const net = netAnnual / displayDivisor;
  const finalNational = nationalTax / displayDivisor;
  const finalRegional = regionalTax / displayDivisor;
  const finalLocal = localTax / displayDivisor;
  const finalPayroll = payroll / displayDivisor;
  const finalAllTax = allTaxAnnual / displayDivisor;
  const displayGross = gross / displayDivisor;

  // Multi-method economic & empirical incidence outputs
  const coliFactor = (region.costOfLivingIndex || 100) / 100;
  const realPppNet = net / coliFactor;

  if (net < 0) warnings.push('Your combined assumptions exceed your income. The negative cash-flow estimate is shown without clipping.');
  if (isMonthly) packNotes.unshift('Monthly calculation: input amounts are treated as monthly wages; annualized brackets split by 12.');
  if (isWeekly) packNotes.unshift('Weekly calculation: input amounts are treated as weekly wages; annualized brackets split by 52.');
  if (isBiweekly) packNotes.unshift('Biweekly calculation: input amounts are treated as pay for two weeks; annualized brackets split by 26.');
  if (isPartial) packNotes.unshift(`Partial-year calculation: prorated for ${monthsCount} months worked out of 12.`);
  packNotes.forEach(note => warnings.unshift(note));

  const periodSuffix = isMonthly ? '/ month' : isWeekly ? '/ week' : isBiweekly ? '/ 2 wks' : isPartial ? `/ ${monthsCount} mos` : '/ year';

  return {
    label: isMonthly ? 'Your estimated monthly take-home' : isWeekly ? 'Your estimated weekly take-home' : isBiweekly ? 'Your estimated biweekly take-home' : isPartial ? `Your estimated ${monthsCount}-month take-home` : 'Your estimated take-home income',
    value: net,
    format: 'money',
    suffix: periodSuffix,
    description: `${country.legalBody} · ${pack.label} · ${region.name.replace(' (custom tax)', '')}${ctx.city ? ` / ${ctx.city}` : ''}. ${region.taxStructure}.`,
    taxBasis: { annualGross: gross, annualTaxable: taxable, annualDeduction: deduction, annualMultiplier, displayDivisor, profile: profile?.label },
    breakdown: [
      { label: 'Take-home income', value: Math.max(0, net), color: BLUE },
      { label: 'National income tax', value: finalNational, color: PINK },
      { label: 'State / provincial tax', value: finalRegional, color: PURPLE },
      ...(finalLocal ? [{ label: 'Local tax estimate', value: finalLocal, color: GRAY }] : []),
      ...(caSalesEstimate ? [{ label: 'Sales/use tax estimate', value: caSalesEstimate / displayDivisor, color: '#8aa4ef' }] : []),
      ...(caPropertyEstimate ? [{ label: 'Property tax estimate', value: caPropertyEstimate / displayDivisor, color: '#b6c8ce' }] : []),
      ...(finalPayroll ? [{ label: 'Payroll / contributions', value: finalPayroll, color: '#8aa4ef' }] : []),
      ...(rawPretax ? [{ label: 'Pre-tax deductions', value: rawPretax, color: '#b6c8ce' }] : [])
    ],
    metrics: [
      { label: 'Total income tax', value: (nationalTax + regionalTax + localTax) / displayDivisor, format: 'money' },
      { label: 'Effective income tax rate', value: gross ? ((nationalTax + regionalTax + localTax) / gross * 100) : 0, format: 'percent' },
      ...(region.costOfLivingIndex > 0 ? [{ label: `Real PPP take-home (COLI ${region.costOfLivingIndex})`, value: realPppNet, format: 'money' as const }] : []),
      { label: 'Selected levies total', value: finalAllTax, format: 'money' },
      ...(withholding > 0 ? [{ label: refundOrOwed >= 0 ? 'Estimated refund (+)' : 'Estimated balance due (-)', value: Math.abs(refundOrOwed / displayDivisor), format: 'money' as const }] : []),
      ...(dependentCreditAuto > 0 ? [{ label: 'Dependent child credit', value: dependentCreditAuto / displayDivisor, format: 'money' as const }] : []),
      ...(seniorDeductionAdd > 0 ? [{ label: 'Senior 65+ deduction add-on', value: seniorDeductionAdd / displayDivisor, format: 'money' as const }] : []),
    ],
    formula: v.method === 'custom'
      ? 'Custom jurisdiction: Tax = Σ max(0, min(taxable income, cumulative ceiling_i) - ceiling_(i-1)) x user rate_i'
      : 'Tax = sum(income in band x band rate) - eligible credits',
    steps: [
      `Gross ${periodSuffix}: ${formatMoney(displayGross, ctx.currency)} (Annualized: ${formatMoney(gross, ctx.currency)}). Pre-tax adjustments: ${formatMoney(rawPretax, ctx.currency)}.`,
      ...(canadianPayroll ? [`Enhanced CPP deduction: ${formatMoney(cppEnhanced / displayDivisor, ctx.currency)}. Base CPP and EI are credited at the lowest bracket rates.`] : []),
      `Annualized national taxable income: ${formatMoney(adjusted, ctx.currency)} - ${formatMoney(deduction, ctx.currency)} = ${formatMoney(taxable, ctx.currency)}.`,
      `National tax before credits: ${formatMoney(national.total / displayDivisor, ctx.currency)}. Applied credits: ${formatMoney(Math.min(national.total, federalCredit + (numberValue(v, 'credits') * annualMultiplier) + ctc) / displayDivisor, ctx.currency)}.`,
      `National + regional + local income tax: ${formatMoney(finalAllTax, ctx.currency)}. Payroll contributions are tracked separately.`,
      `Reference pack: ${country.legalBody}, ${pack.label}. State legal statute: ${region.statuteCitation || 'State law'}.`,
      'Region comparisons treat each place as an alternative full-year residence, not as multi-jurisdiction filing or a tax treaty calculation.'
    ],
    warnings,
    centerLabel: isMonthly ? 'MONTHLY GROSS' : 'GROSS INCOME',
    centerValue: displayGross,
    table: {
      columns: ['National tax band', 'Annual taxable in band', 'Rate', `Tax before credits (${periodSuffix})`],
      rows: national.rows.map(row => [
        `${formatMoney(row.lower, ctx.currency, 0)} to ${row.upper === Infinity ? 'unlimited' : formatMoney(row.upper, ctx.currency, 0)}`,
        formatMoney(row.amount, ctx.currency),
        `${row.rate * 100}%`,
        formatMoney(row.tax / displayDivisor, ctx.currency)
      ])
    },
  };
}

function car(v: Values, ctx: CalculationContext): CalculationResult {
  const price = numberValue(v, 'price', 1);
  const down = numberValue(v, 'down', 0, price), trade = numberValue(v, 'trade', 0, price), rebate = numberValue(v, 'rebate', 0, price);
  const fees = numberValue(v, 'fees');
  const taxBase = Math.max(0, price - rebate - (v.tradeTaxCredit === 'true' ? trade : 0));
  const salesTax = taxBase * numberValue(v, 'salesTax', 0, 100) / 100;
  const principal = price - rebate + salesTax + (v.financeFees === 'true' ? fees : 0) - down - trade;
  if (principal < 0) throw new Error('Down payment, rebate, and trade-in exceed the total vehicle cost.');
  const rate = numberValue(v, 'rate', 0, 100) / 100;
  const periods = numberValue(v, 'months', 1, 120, true);
  const balloon = v.method === 'balloon' ? numberValue(v, 'balloon', 0, principal) : 0;
  const r = rate / 12;
  const flat = v.method === 'flat';
  const base = flat ? (principal + principal * rate * periods / 12) / periods : payment(principal - balloon / Math.pow(1 + r, periods), r, periods);
  const extra = flat ? 0 : numberValue(v, 'extra');
  const schedule = amortize(principal, r, periods, base, extra);
  const interest = flat ? principal * rate * periods / 12 : schedule.interest;
  return { label: 'Your estimated car payment', value: Math.min(principal * (1 + r), base + extra), format: 'money', suffix: '/ month', description: `${periods}-month loan with ${v.method === 'balloon' ? 'a final balloon payment' : flat ? 'flat add-on interest' : 'reducing-balance interest'}.`,
    breakdown: [{ label: 'Loan principal', value: principal, color: BLUE }, { label: 'Total interest', value: interest, color: PINK }],
    metrics: [{ label: 'Amount financed', value: principal, format: 'money' }, { label: 'Total interest', value: interest, format: 'money' }, { label: 'Sales tax', value: salesTax, format: 'money' }, ...(balloon ? [{ label: 'Final balloon', value: schedule.balloon, format: 'money' as const }] : [{ label: 'Upfront payment & fees', value: down + (v.financeFees === 'true' ? 0 : fees), format: 'money' as const }])],
    formula: flat ? 'M = (P + P x annual rate x years) / months' : 'M = (P - B / (1 + r)^n) r / (1 - (1 + r)^(-n))',
    steps: [`Taxable vehicle value: ${formatMoney(taxBase, ctx.currency)}. Sales tax: ${formatMoney(salesTax, ctx.currency)}.`, `Loan balance after rebate, down payment, trade-in, and ${v.financeFees === 'true' ? 'financed' : 'upfront'} fees: ${formatMoney(principal, ctx.currency)}.`, `Use ${flat ? 'flat interest on the original principal' : 'monthly amortization on the remaining balance'}.`, ...(balloon ? [`Unpaid principal at maturity: ${formatMoney(schedule.balloon, ctx.currency)} in addition to the regular payment.`] : [])],
    warnings: ['Sales tax and trade-in exemptions vary by jurisdiction. The selected percentage is an editable planning assumption.', ...(flat ? ['Flat add-on interest is not APR. Extra payments are disabled for this method because lender rebate rules vary.'] : [])],
    schedule: flat ? undefined : schedule.rows, frequency: 12, centerLabel: 'FINANCED', centerValue: principal,
  };
}

function compound(v: Values, ctx: CalculationContext): CalculationResult {
  const principal = numberValue(v, 'principal'), contribution = numberValue(v, 'contribution');
  const annual = (numberValue(v, 'rate', -99, 100) - numberValue(v, 'annualFee', 0, 25)) / 100;
  if (annual <= -1) throw new Error('Return after fees must be greater than -100%.');
  const years = numberValue(v, 'years', 1, 100, true), frequency = numberValue(v, 'frequency', 1, 365, true);
  const inflation = numberValue(v, 'inflation', -50, 100) / 100;
  const beginning = v.timing === 'beginning';
  const annualContributions = v.contribFreq === 'annual';
  const r = v.method === 'continuous' ? Math.expm1(annual / 12) : Math.expm1(Math.log1p(annual / frequency) * frequency / 12);
  let balance = principal;
  const series = [{ label: '0', value: principal }];
  const rows: (string | number)[][] = [];
  for (let month = 1; month <= years * 12; month++) {
    const depositsSoFar = annualContributions ? (beginning ? Math.floor((month + 11) / 12) : Math.floor(month / 12)) : month;
    const depositThisMonth = !annualContributions || (beginning ? month === 1 : month % 12 === 12);
    if (v.method === 'simple') {
      const held = beginning ? depositsSoFar * (depositsSoFar + 1) / 2 : depositsSoFar * (depositsSoFar - 1) / 2;
      balance = principal * (1 + annual * month / 12) + contribution * depositsSoFar + contribution * annual / 12 * held;
    } else {
      balance = (balance + (depositThisMonth && beginning ? contribution : 0)) * (1 + r) + (depositThisMonth && !beginning ? contribution : 0);
    }
    if (month % 12 === 0) {
      const invested = principal + contribution * depositsSoFar;
      series.push({ label: String(month / 12), value: balance });
      rows.push([`Year ${month / 12}`, formatMoney(invested, ctx.currency), formatMoney(balance - invested, ctx.currency), formatMoney(balance, ctx.currency)]);
    }
  }
  const invested = principal + contribution * (annualContributions ? years : years * 12);
  return { label: 'Your projected future balance', value: balance, format: 'money', suffix: `in ${years} years`, description: `A projection with ${annualContributions ? 'annual' : 'monthly'} contributions at a constant return — not a guaranteed outcome.`,
    breakdown: [{ label: 'Your contributions', value: invested, color: BLUE }, { label: 'Investment growth', value: Math.max(0, balance - invested), color: PURPLE }],
    metrics: [{ label: 'Total invested', value: invested, format: 'money' }, { label: 'Growth after fees', value: balance - invested, format: 'money' }, { label: "In today's money", value: balance / Math.pow(1 + inflation, years), format: 'money' }, { label: 'Net annual rate', value: annual * 100, format: 'percent' }],
    formula: v.method === 'simple' ? 'FV = P(1 + rt) + contributions + simple interest on contributions' : 'FV = P(1 + i)^n + C((1 + i)^n - 1) / i',
    steps: [`Start with ${formatMoney(principal, ctx.currency)} and contribute ${formatMoney(contribution, ctx.currency)} ${annualContributions ? 'once per year' : 'each month'}, at the ${beginning ? 'beginning' : 'end'} of the period.`, `Net annual return is ${(annual * 100).toFixed(2)}% after the expense-ratio assumption.`, `Apply ${v.method === 'simple' ? 'simple interest without interest-on-interest' : v.method === 'continuous' ? 'continuous compounding with discrete contributions' : `${frequency} compounding periods per year, converted to an equivalent monthly rate`}.`, `Divide the final balance by (1 + ${inflation * 100}%)^${years} to estimate current purchasing power.`],
    warnings: ['Market variability, taxes, and contribution limits are not modeled. Returns and inflation are constant assumptions.'], series, table: { columns: ['Period', 'Contributions', 'Growth', 'Balance'], rows },
  };
}

function transaction(v: Values, ctx: CalculationContext): CalculationResult {
  const amount = numberValue(v, 'amount'), count = numberValue(v, 'count', 1, 1000000, true);
  const rate = numberValue(v, 'rate', 0, 99) / 100, border = numberValue(v, 'crossBorder', 0, 99) / 100;
  const fixed = numberValue(v, 'fixed'), platform = numberValue(v, 'platform', 0, 99) / 100;
  const spread = numberValue(v, 'spread', 0, 99) / 100, payout = numberValue(v, 'payout');
  const vat = numberValue(v, 'vat', 0, 100) / 100;
  const coefficient = 1 - platform - (rate + border) * (1 + vat);
  if (coefficient <= 0) throw new Error('Percentage fees consume the entire sale. Reduce the rates to calculate a valid settlement.');
  const reverse = v.method === 'gross-up';
  const base = reverse ? ((amount + payout / count) / (1 - spread) + fixed) / coefficient : v.taxMode === 'inclusive' ? amount / (1 + vat) : amount;
  const gross = base * (1 + vat) * count, tax = base * vat * count;
  const processing = gross * rate, crossBorder = gross * border, platformFee = base * platform * count, fixedFee = fixed * count;
  const afterFees = gross - tax - processing - crossBorder - platformFee - fixedFee;
  const fx = afterFees * spread;
  const net = afterFees - fx - payout;
  if (net < 0) throw new Error('Fees exceed the available proceeds. Increase the amount or reduce fees.');
  const allFees = processing + crossBorder + platformFee + fixedFee + fx + payout;
  return { label: reverse ? 'Total amount to charge' : 'Your net settlement', value: reverse ? gross : net, format: 'money', suffix: count > 1 ? `/ ${count} transactions` : '/ transaction', description: reverse ? 'Reverse-calculated to preserve your target net after all selected fees.' : 'All selected fee layers applied in the correct order.',
    breakdown: [{ label: 'Net received', value: net, color: BLUE }, { label: 'Processing & fixed fees', value: processing + fixedFee, color: PINK }, { label: 'Platform & cross-border', value: platformFee + crossBorder, color: PURPLE }, { label: 'FX & payout fees', value: fx + payout, color: GRAY }, ...(tax ? [{ label: 'Tax collected', value: tax, color: '#8aa4ef' }] : [])],
    metrics: [{ label: 'Total fees', value: allFees, format: 'money' }, { label: 'Effective fee rate', value: gross ? allFees / gross * 100 : 0, format: 'percent' }, { label: reverse ? 'Net received' : 'Customer pays', value: reverse ? net : gross, format: 'money' }, { label: 'Tax to set aside', value: tax, format: 'money' }],
    formula: reverse ? 'Base = ((target net + payout/count)/(1 - spread) + fixed) / (1 - platform - processing(1 + tax))' : 'Net = (gross - tax - processing - platform - fixed)(1 - spread) - payout',
    steps: [`${count} transaction(s) at ${formatMoney(base, ctx.currency)} before tax. Customer charges total ${formatMoney(gross, ctx.currency)}.`, `Processing and cross-border percentages apply to gross charges; the platform percentage applies to pre-tax sales.`, `Subtract ${formatMoney(fixedFee, ctx.currency)} in per-transaction fixed fees. Apply the FX spread to remaining proceeds, then subtract the one-time payout fee.`, `Final net: ${formatMoney(net, ctx.currency)}. Tax collected is excluded from merchant proceeds.`],
    warnings: ['This is a configurable fee model, not a specific payment provider quote. No payments are initiated.'], centerLabel: 'GROSS CHARGES', centerValue: gross,
    table: { columns: ['Settlement item', 'Amount'], rows: [['Gross charged', formatMoney(gross, ctx.currency)], ['Tax reserve', formatMoney(tax, ctx.currency)], ['Processing', formatMoney(processing, ctx.currency)], ['Cross-border', formatMoney(crossBorder, ctx.currency)], ['Platform', formatMoney(platformFee, ctx.currency)], ['Fixed transaction fees', formatMoney(fixedFee, ctx.currency)], ['FX spread cost', formatMoney(fx, ctx.currency)], ['Payout fee', formatMoney(payout, ctx.currency)], ['Net settlement', formatMoney(net, ctx.currency)]] },
  };
}

function currency(v: Values, ctx: CalculationContext): CalculationResult {
  const amount = numberValue(v, 'amount'), fee = numberValue(v, 'fee', 0, amount), spread = numberValue(v, 'spread', 0, 99) / 100;
  const rate = v.from === v.to ? 1 : v.source === 'manual' ? numberValue(v, 'customRate', 0.000000001, 1e9) : ctx.rate;
  if (!rate || !Number.isFinite(rate)) throw new Error('Load a reference rate, or choose a custom exchange rate.');
  const netRate = rate * (1 - spread), value = (amount - fee) * netRate;
  return { label: 'Your converted amount', value, currency: v.to, format: 'money', description: v.source === 'manual' ? 'Using your custom rate, not a fetched market quote.' : `Daily ECB reference via Frankfurter. Source date: ${ctx.rateDate || 'same-currency conversion'}.`,
    breakdown: [], metrics: [{ label: 'Reference exchange rate', value: `1 ${v.from} = ${formatNumber(rate, 6)} ${v.to}` }, { label: 'Rate after spread', value: `1 ${v.from} = ${formatNumber(netRate, 6)} ${v.to}` }, { label: 'Fixed fee', value: `${formatNumber(fee, 2)} ${v.from}` }, { label: 'Total conversion cost', value: `${formatNumber(amount * rate - value, 2)} ${v.to}` }],
    formula: 'Converted = (amount - fixed fee) x reference rate x (1 - spread)',
    steps: [`Deduct ${fee} ${v.from} from ${amount} ${v.from}.`, `Reference rate: ${rate} ${v.to} per ${v.from}. Reduce by ${spread * 100}% spread.`, `Multiply ${amount - fee} by ${netRate} = ${formatNumber(value, 6)} ${v.to}.`], warnings: ['Reference rates are daily, not real-time trading or guaranteed bank quotes. Only the currency pair and optional date are sent to the rate provider, never your amount.'],
  };
}

function logCombination(n: number, k: number) {
  let result = 0;
  for (let i = 1; i <= Math.min(k, n - k); i++) result += Math.log(n - i + 1) - Math.log(i);
  return result;
}
export function exactArrangements(n: number, k: number, ordered = false) {
  if (!Number.isInteger(n) || !Number.isInteger(k) || k < 0 || k > n || n > 1000) throw new Error('Use whole-number selections between 0 and 1,000.');
  let result = 1n;
  const count = ordered ? k : Math.min(k, n - k);
  for (let i = 1; i <= count; i++) result = ordered ? result * BigInt(n - i + 1) : result * BigInt(n - i + 1) / BigInt(i);
  return result;
}
export function binomialProbability(n: number, k: number, p: number) {
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  return Math.exp(logCombination(n, k) + k * Math.log(p) + (n - k) * Math.log1p(-p));
}
export function binomialRange(n: number, k: number, p: number, condition: string) {
  const start = condition === 'atmost' ? 0 : k;
  const end = condition === 'atleast' ? n : k;
  let total = 0;
  for (let i = start; i <= end; i++) total += binomialProbability(n, i, p);
  return Math.min(1, Math.max(0, total));
}
/** Deterministic mulberry32 generator so Monte Carlo runs are reproducible for a seed. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function probability(v: Values): CalculationResult {
  let value = 0, description = '', formula = '', count = false;
  let exactValue = '';
  let mcExact: number | null = null;
  const steps: string[] = [];
  if (v.method === 'independent') {
    const a = numberValue(v, 'pa', 0, 100) / 100, b = numberValue(v, 'pb', 0, 100) / 100;
    value = v.event === 'or' ? a + b - a * b : v.event === 'xor' ? a * (1 - b) + b * (1 - a) : v.event === 'neither' ? (1 - a) * (1 - b) : a * b;
    formula = v.event === 'or' ? 'P(A or B) = P(A) + P(B) - P(A)P(B)' : v.event === 'xor' ? 'P(exactly one) = P(A)(1 - P(B)) + P(B)(1 - P(A))' : v.event === 'neither' ? 'P(neither) = (1 - P(A))(1 - P(B))' : 'P(A and B) = P(A)P(B)';
    description = `For independent events with P(A) = ${a * 100}% and P(B) = ${b * 100}%.`;
    steps.push('Independence means knowing one outcome does not change the other probability.', `Convert percentages to decimals: P(A) = ${a}; P(B) = ${b}.`, formula, `Evaluate to ${formatNumber(value, 8)}, or ${formatNumber(value * 100, 4)}%.`);
  } else if (v.method === 'conditional') {
    const joint = numberValue(v, 'joint', 0, 100) / 100, given = numberValue(v, 'given', .0000001, 100) / 100;
    if (joint > given) throw new Error('The joint probability P(A and B) cannot exceed P(B).');
    value = joint / given; formula = 'P(A | B) = P(A and B) / P(B)'; description = 'Probability of A, given that B has occurred.';
    steps.push('P(B) must be greater than zero, and the intersection cannot exceed P(B).', `${joint} / ${given} = ${formatNumber(value, 8)}.`);
  } else {
    const n = numberValue(v, 'n', 0, 1000, true), k = numberValue(v, 'k', 0, n, true);
    if (v.method === 'binomial' || v.method === 'monte-carlo') {
      const p = numberValue(v, 'p', 0, 100) / 100;
      const exact = binomialRange(n, k, p, v.binomialEvent);
      const rangeLabel = v.binomialEvent === 'atleast' ? 'At least' : v.binomialEvent === 'atmost' ? 'At most' : 'Exactly';
      if (v.method === 'binomial') {
        value = exact;
        formula = 'P(X = k) = C(n, k) p^k (1 - p)^(n - k)';
        description = `${rangeLabel} ${k} successes in ${n} independent trials.`;
        steps.push(`Use n = ${n}, k = ${k}, and a constant success probability p = ${p}.`, 'Evaluate combinations in log space to avoid factorial overflow.', ...(v.binomialEvent !== 'exactly' ? ['Sum the binomial probability across all outcomes in the requested range.'] : []));
      } else {
        const sims = numberValue(v, 'sims', 1000, 1000000, true);
        const seed = numberValue(v, 'seed', 0, 4294967295, true);
        const rng = mulberry32(seed);
        let hits = 0;
        for (let s = 0; s < sims; s++) {
          let successes = 0;
          for (let t = 0; t < n; t++) if (rng() < p) successes++;
          if (v.binomialEvent === 'atleast' ? successes >= k : v.binomialEvent === 'atmost' ? successes <= k : successes === k) hits++;
        }
        value = hits / sims;
        mcExact = exact;
        const halfWidth = 1.96 * Math.sqrt(value * (1 - value) / sims);
        formula = `est = hits / S, with 95% interval est +/- 1.96 sqrt(est(1-est)/S)`;
        description = `Monte Carlo estimate of ${rangeLabel.toLowerCase()} ${k} successes in ${n} trials, from ${sims.toLocaleString()} seeded simulations (seed ${seed}).`;
        steps.push(`Run ${sims.toLocaleString()} independent simulations with a deterministic random seed. Each simulation draws ${n} Bernoulli(p = ${p}) trials.`, `Count simulations whose success total satisfies "${rangeLabel.toLowerCase()} ${k}".`, `Simulated probability: ${formatNumber(value, 6)} (${(value * 100).toFixed(2)}%) with an approximate 95% interval of +/- ${formatNumber(halfWidth * 100, 2)} percentage points.`, `Exact binomial check: ${formatNumber(exact, 8)} (${(exact * 100).toFixed(4)}%). The simulation estimate should fall near the exact value; different seeds shift it slightly.`);
      }
    } else {
      count = true;
      const exact = exactArrangements(n, k, v.method === 'permutations');
      if (exact > BigInt(Number.MAX_SAFE_INTEGER)) exactValue = exact.toString();
      else value = Number(exact);
      formula = v.method === 'permutations' ? 'P(n, k) = n! / (n - k)!' : 'C(n, k) = n! / (k!(n - k)!)';
      description = `${v.method === 'permutations' ? 'Ordered' : 'Unordered'} selections of ${k} from ${n}, without replacement.`;
      steps.push(v.method === 'permutations' ? 'Order matters: AB and BA are different outcomes.' : 'Order does not matter: AB and BA count as the same selection.', `Apply ${formula} with n = ${n} and k = ${k}.`);
    }
  }
  return { label: count ? 'Number of possible arrangements' : 'Your calculated probability', value: exactValue || (count ? value : value * 100), format: exactValue ? 'text' : count ? 'number' : 'percent', description,
    breakdown: count ? [] : [{ label: 'Selected outcome', value, color: PURPLE }, { label: 'Other outcomes', value: 1 - value, color: '#e5e6f0' }],
    metrics: count ? [{ label: 'Selection model', value: v.method === 'permutations' ? 'Order matters' : 'Order independent' }, { label: 'Replacement', value: 'Without replacement' }] : v.method === 'monte-carlo' ? [{ label: 'Exact binomial check', value: mcExact === null ? '' : formatNumber(mcExact, 8) }, { label: 'Simulations (seed)', value: `${numberValue(v, 'sims', 1000, 1000000, true).toLocaleString()} (${numberValue(v, 'seed', 0, 4294967295, true).toLocaleString()})` }] : [{ label: 'Decimal probability', value: formatNumber(value, 8) }, { label: 'Complement', value: (1 - value) * 100, format: 'percent' }],
    formula, steps, warnings: count ? ['Arrangement counts use exact integer arithmetic without factorial rounding. Large counts are shown in full.'] : v.method === 'monte-carlo' ? ['Monte Carlo estimates are reproducible for a fixed seed but shift between seeds; the exact binomial value is shown for comparison.'] : ['Verify that the assumptions match your situation. Independent and binomial methods do not model correlated events.'],
  };
}

export function convertUnit(amount: number, category: string, from: string, to: string) {
  const group = unitGroups[category];
  if (!group || !group.units[from] || !group.units[to]) throw new Error('Choose compatible source and target units.');
  if (category === 'temperature') {
    const c = from === 'F' ? (amount - 32) * 5 / 9 : from === 'K' ? amount - 273.15 : amount;
    if (c < -273.150000001) throw new Error('Temperature cannot be below absolute zero.');
    return to === 'F' ? c * 9 / 5 + 32 : to === 'K' ? c + 273.15 : c;
  }
  return amount * group.units[from].factor / group.units[to].factor;
}
function units(v: Values): CalculationResult {
  const amount = numberValue(v, 'amount', -1e12);
  const exact = convertUnit(amount, v.category, v.from, v.to);
  // Significant figures are a presentation choice; the exact value still drives the round-trip check.
  const digits = Math.min(15, Math.max(1, Math.round(Number(v.sigFigs) || 8)));
  const value = v.sigFigs ? toSignificant(exact, digits) : exact;
  const group = unitGroups[v.category];
  const custom = group.units[v.from]?.name.endsWith('(custom)') || group.units[v.to]?.name.endsWith('(custom)');
  const relation = v.category === 'temperature' ? 'C = (F - 32) x 5/9; K = C + 273.15' : `1 ${v.from} = ${formatNumber(convertUnit(1, v.category, v.from, v.to), 8)} ${v.to}`;
  return { label: 'Your converted measurement', value, format: 'number', suffix: v.to, description: `${group.units[v.from].name} to ${group.units[v.to].name}.`, breakdown: [],
    metrics: [
      { label: 'Conversion relationship', value: relation },
      { label: 'Category', value: group.label },
      { label: 'Significant figures shown', value: `${digits} (exact value retained internally)` },
      ...(Math.abs(exact - value) > 0 ? [{ label: 'Display rounding', value: formatNumber(Math.abs(exact - value), 10) }] : []),
    ],
    formula: v.category === 'temperature' ? relation : 'Target = source x source factor / target factor',
    steps: [`Start with ${amount} ${v.from}.`, relation, `Exact result ${exact} ${v.to}, shown to ${digits} significant figures. Rounding is applied only to the display.`],
    warnings: [
      ...(v.category === 'data' ? ['kB/MB/GB are decimal (powers of 1000); KiB/MiB/GiB are binary (powers of 1024).'] : []),
      ...(custom ? ['This conversion uses a unit you defined. Its factor is applied exactly as entered and is not verified against a standards body.'] : []),
    ],
  };
}

function scientific(v: Values): CalculationResult {
  const metrics: CalculationResult['metrics'] = [], steps: string[] = [];
  let value: number | string, formula: string, description: string;
  if (v.method === 'quadratic') {
    const a = numberValue(v, 'a', -1e12), b = numberValue(v, 'b', -1e12), c = numberValue(v, 'c', -1e12);
    const d = b * b - 4 * a * c;
    formula = 'x = (-b +/- sqrt(b^2 - 4ac)) / (2a)';
    if (a === 0) {
      if (b === 0) throw new Error(c === 0 ? 'This equation has infinitely many solutions.' : 'This equation has no solution.');
      value = -c / b; description = 'Linear equation: a is zero, so bx + c = 0.';
    } else if (d < 0) {
      value = `${formatNumber(-b / (2 * a), 4)} +/- ${formatNumber(Math.sqrt(-d) / Math.abs(2 * a), 4)}i`;
      description = 'Two complex-conjugate roots. No real-valued roots.';
    } else {
      // Stable quadratic formula avoids subtracting nearly equal floating-point numbers.
      const q = -.5 * (b + (b >= 0 ? 1 : -1) * Math.sqrt(d));
      const root1 = q === 0 ? -b / (2 * a) : q / a, root2 = q === 0 ? root1 : c / q;
      value = d === 0 ? root1 : `${formatNumber(Math.min(root1, root2), 6)}, ${formatNumber(Math.max(root1, root2), 6)}`;
      description = d === 0 ? 'One repeated real root.' : 'Two distinct real roots.';
    }
    metrics.push({ label: 'Discriminant', value: d, format: 'number' }, { label: 'Equation', value: `${a}x^2 + (${b})x + (${c}) = 0` });
    steps.push(`Identify a = ${a}, b = ${b}, c = ${c}.`, `Discriminant b^2 - 4ac = ${d}.`, formula, `Solution: ${typeof value === 'number' ? value : value}.`);
  } else {
    const x = numberValue(v, 'x', -1e12), y = numberValue(v, 'y', -1e12);
    value = evaluateExpression(v.expression, x, y, v.angle === 'degrees');
    formula = v.expression; description = `Scalar evaluation with trigonometry in ${v.angle}.`;
    metrics.push({ label: 'Variable x', value: x, format: 'number' }, { label: 'Variable y', value: y, format: 'number' }, { label: 'Angle mode', value: v.angle });
    steps.push(`Parse: ${v.expression}`, `Substitute x = ${x}, y = ${y}. Use ${v.angle} for trigonometry.`, 'Evaluate parentheses, functions, and powers before multiplication, division, addition, and subtraction.', `Result: ${formatNumber(value, 10)}.`);
  }
  return { label: v.method === 'quadratic' ? 'Your equation solution' : 'Your calculated result', value, format: typeof value === 'string' ? 'text' : 'number', description, breakdown: [], metrics, formula, steps, warnings: ['Uses IEEE 754 floating-point arithmetic. Results are not symbolic proofs or arbitrary-precision computations.'] };
}

function bmi(v: Values): CalculationResult {
  const height = numberValue(v, 'height', .1, 400), weight = numberValue(v, 'weight', .1, 1500);
  const meters = v.units === 'imperial' ? height * .0254 : height / 100;
  const kg = v.units === 'imperial' ? weight * .45359237 : weight;
  const value = kg / (meters * meters);
  // Two documented adult band sets. The ratio never changes; only the label mapping does.
  const asiaPacific = v.standard === 'asia-pacific';
  const bands = asiaPacific
    ? { under: 18.5, healthyTop: 23, overweightTop: 27.5, source: 'WHO Western Pacific Region adult cut-offs' }
    : { under: 18.5, healthyTop: 25, overweightTop: 30, source: 'WHO international adult classification' };
  const category = value < bands.under ? 'Underweight range' : value < bands.healthyTop ? 'Healthy reference range' : value < bands.overweightTop ? 'Overweight / increased-risk range' : 'Obesity range';
  const weightFactor = v.units === 'imperial' ? 1 / .45359237 : 1, suffix = v.units === 'imperial' ? 'lb' : 'kg';
  const target = Math.min(60, Math.max(10, Number(v.targetBmi) || bands.healthyTop - 1));
  const targetWeight = target * meters * meters * weightFactor;
  const currentWeight = v.units === 'imperial' ? weight : kg;
  return { label: 'Your body mass index', value, format: 'number', suffix: 'BMI', description: `${category} under the ${bands.source}.`, breakdown: [],
    metrics: [
      { label: 'Reference band set', value: asiaPacific ? 'Asia-Pacific adult cut-offs' : 'WHO international adult' },
      { label: 'Healthy reference range', value: `${bands.under} to ${(bands.healthyTop - .1).toFixed(1)} BMI` },
      { label: 'Reference weight range', value: `${formatNumber(bands.under * meters * meters * weightFactor, 1)} to ${formatNumber((bands.healthyTop - .1) * meters * meters * weightFactor, 1)} ${suffix}` },
      { label: `Weight at target BMI ${target}`, value: `${formatNumber(targetWeight, 1)} ${suffix}` },
      { label: 'Difference from target weight', value: `${currentWeight - targetWeight >= 0 ? '+' : ''}${formatNumber(currentWeight - targetWeight, 1)} ${suffix}` },
    ],
    formula: 'BMI = weight (kg) / height (m)^2',
    steps: [`Convert to SI: ${formatNumber(kg, 4)} kg and ${formatNumber(meters, 4)} m.`, `Divide ${kg} by ${meters}^2.`, `Invert the ratio at BMI ${target} to obtain the target weight of ${formatNumber(targetWeight, 1)} ${suffix}.`, 'Compare with the selected adult reference bands. BMI does not measure body composition.'],
    warnings: [
      'For non-pregnant adults only. BMI is a screening reference, not a diagnosis; it may not reflect individual health, muscle mass, or ethnicity-related risk. Discuss health concerns with a qualified professional.',
      asiaPacific ? 'Asia-Pacific cut-offs are lower because cardiometabolic risk rises at a lower BMI in several Asian populations. Choose the band set deliberately.' : 'International bands are not adjusted for population, build or age.',
    ],
  };
}

export function calculate(tool: ToolId, values: Values, ctx: CalculationContext): CalculationResult {
  const calculators = { mortgage, tax, car, compound, transaction, currency, probability, scientific, units, bmi };
  const result = calculators[tool](values, ctx);
  if (typeof result.value === 'number' && !Number.isFinite(result.value)) throw new Error('The result is outside the supported numerical range. Use smaller inputs.');
  return result;
}
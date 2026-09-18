/**
 * Cross-tool collaboration graph.
 *
 * Each link runs real calculations through more than one independent tool
 * module and passes the output of one as the input of the next. Nothing is
 * mocked: every number below is produced by `processCalculation` or by the
 * bracketed solver, and a link is omitted when its prerequisites are missing.
 */
import { processCalculation } from '../processing';
import { countries, getRegion } from '../regions';
import { parseNumericValue } from '../format';
import { taxDefaultsForLocation } from '../regionalSettings';
import type { CalculationContext, ToolId, Values } from '../types';
import { evaluate, solveField } from './analysis';

export interface CollaborationLink {
  id: string;
  title: string;
  chain: ToolId[];
  value: number;
  format: 'money' | 'percent' | 'number';
  currency?: string;
  detail: string;
  method: string;
  caution?: string;
}

export interface CollaborationGraph {
  links: CollaborationLink[];
  unavailable: { title: string; reason: string }[];
}

const monthlyFactor = (values: Values) =>
  values.taxPeriod === 'monthly' ? 1 : values.taxPeriod === 'weekly' ? 52 / 12 : values.taxPeriod === 'biweekly' ? 26 / 12 : values.taxPeriod === 'partial' ? 1 / Math.max(1, Number(values.monthsCount) || 12) * (Number(values.monthsCount) || 12) / 12 : 1 / 12;

export function buildCollaboration(data: Record<ToolId, Values>, ctx: CalculationContext): CollaborationGraph {
  const links: CollaborationLink[] = [];
  const unavailable: { title: string; reason: string }[] = [];
  const currency = ctx.currency;
  const symbolCountry = countries[ctx.country];

  const taxValues = { ...taxDefaultsForLocation(ctx.country, ctx.region, ctx.county), ...data.tax };
  const taxRun = processCalculation('tax', taxValues, ctx);
  const netPerPeriod = taxRun.result && typeof taxRun.result.value === 'number' ? taxRun.result.value : null;
  const monthlyNet = netPerPeriod === null ? null : netPerPeriod * monthlyFactor(taxValues);

  if (monthlyNet === null) {
    unavailable.push({ title: 'Take-home linked estimates', reason: taxRun.error || 'The income tax inputs are incomplete.' });
  }

  // 1. Tax -> Mortgage: solve the price that keeps the payment at a chosen share of take-home.
  if (monthlyNet !== null && monthlyNet > 0) {
    const share = .28;
    const targetPayment = monthlyNet * share;
    const mortgageValues: Values = { ...data.mortgage, frequency: '12' };
    const solved = solveField('mortgage', mortgageValues, ctx, 'price', targetPayment, { min: Math.max(1, parseNumericValue(mortgageValues.down) || 1), max: Math.max(1000, parseNumericValue(mortgageValues.price) * 2) });
    if (solved.converged && Number.isFinite(solved.value)) {
      links.push({
        id: 'affordability',
        title: 'Affordable property price at 28% of take-home',
        chain: ['tax', 'mortgage'],
        value: solved.value,
        format: 'money',
        currency,
        detail: `Income tax produces ${symbolCountry.currency} ${monthlyNet.toFixed(0)} monthly take-home. The mortgage module was solved backwards until the full monthly payment equals ${(share * 100).toFixed(0)}% of it, keeping your current rate, term, down payment and ownership costs.`,
        method: `Bracketed secant/bisection solve in ${solved.iterations} iterations on the exact mortgage module.`,
        caution: 'A 28% guideline is a common budgeting convention, not a lending decision or an affordability assessment.',
      });
    } else {
      unavailable.push({ title: 'Affordable property price', reason: 'No price satisfies that payment with the current rate, term and costs.' });
    }
  }

  // 2. Mortgage + Tax: payment pressure on actual take-home.
  const mortgagePayment = evaluate('mortgage', data.mortgage, ctx);
  if (monthlyNet !== null && monthlyNet > 0 && mortgagePayment !== null) {
    links.push({
      id: 'payment-burden',
      title: 'Current mortgage payment as a share of take-home',
      chain: ['mortgage', 'tax'],
      value: (mortgagePayment / monthlyNet) * 100,
      format: 'percent',
      detail: `The mortgage module returns ${mortgagePayment.toFixed(0)} per period and the tax module returns ${monthlyNet.toFixed(0)} monthly take-home for ${getRegion(ctx.country, ctx.region).name}.`,
      method: 'Direct ratio of two independently calculated module outputs.',
    });
  }

  // 3. Tax -> Compound: invest the modelled monthly surplus.
  if (monthlyNet !== null && mortgagePayment !== null) {
    const surplus = monthlyNet - mortgagePayment;
    if (surplus > 0) {
      const compoundValues = { ...data.compound, contribution: String(Math.round(surplus)), contribFreq: 'monthly' };
      const future = evaluate('compound', compoundValues, ctx);
      if (future !== null) {
        links.push({
          id: 'surplus-growth',
          title: `Growth of the monthly surplus over ${data.compound.years} years`,
          chain: ['tax', 'mortgage', 'compound'],
          value: future,
          format: 'money',
          currency,
          detail: `Take-home minus the mortgage payment leaves ${surplus.toFixed(0)} per month. That exact amount was passed to the compound module at your current return, fee and inflation settings.`,
          method: 'Three modules chained: tax take-home, mortgage payment, then periodic-contribution growth.',
          caution: 'Other living costs are not deducted, and the return assumption is not a forecast.',
        });
      }
    } else {
      unavailable.push({ title: 'Surplus growth', reason: 'The modelled mortgage payment is at or above take-home, so there is no surplus to invest.' });
    }
  }

  // 4. Currency: restate the linked result only when a dated or explicit rate exists.
  const fx = data.currency;
  if (monthlyNet !== null && fx.from === currency && fx.to !== currency) {
    const converted = evaluate('currency', { ...fx, amount: String(monthlyNet) }, ctx);
    if (converted !== null) {
      links.push({
        id: 'net-in-second-currency',
        title: `Monthly take-home expressed in ${fx.to}`,
        chain: ['tax', 'currency'],
        value: converted,
        format: 'money',
        currency: fx.to,
        detail: `The take-home figure was converted with the rate currently loaded in the currency module${ctx.rateDate ? ` (reference date ${ctx.rateDate})` : ' (your custom rate)'}.`,
        method: 'Tax module output used as the currency module input; no separate rate request is made.',
      });
    }
  } else if (monthlyNet !== null && fx.to !== currency) {
    unavailable.push({ title: `Take-home in ${fx.to}`, reason: `Set the currency converter to convert from ${currency} to enable this link.` });
  }

  // 5. Transaction: cost of receiving the take-home as invoiced income.
  const transactionValues = { ...data.transaction, amount: monthlyNet !== null ? String(Math.max(1, monthlyNet)) : data.transaction.amount, count: '1', method: 'net' };
  const settled = monthlyNet !== null ? evaluate('transaction', transactionValues, ctx) : null;
  if (monthlyNet !== null && settled !== null) {
    links.push({
      id: 'settlement-cost',
      title: 'Processing cost if that amount were invoiced',
      chain: ['tax', 'transaction'],
      value: monthlyNet - settled,
      format: 'money',
      currency,
      detail: `Passing the monthly take-home through your current fee stack settles at ${settled.toFixed(2)}, so the fee layers cost ${(monthlyNet - settled).toFixed(2)}.`,
      method: 'Transaction module applied to the tax module output using your configured fee layers.',
    });
  }

  return { links, unavailable };
}

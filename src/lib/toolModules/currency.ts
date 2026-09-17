import type { ToolModule } from './types';
import { formula, metric, node } from './helpers';

export const currencyModule: ToolModule = {
  id: 'currency', name: 'Exchange-rate provenance network', description: 'Keeps source amount, reference-rate provenance, provider spread, fixed fees, and target-currency output separate.',
  dataInputs: ['source amount', 'base currency', 'quote currency', 'rate source', 'reference date', 'reference rate', 'provider spread', 'fixed fee'], companionTools: ['transaction', 'tax', 'units'],
  build: (v, ctx, result) => ({
    formulas: [
      formula('source-net', 'Amount after source fee', 'A_net = source amount - fixed source-currency fee', 'Deducts the fee before conversion.'),
      formula('rate', 'Reference conversion', 'Target reference value = A_net x reference rate', `Uses ${v.source === 'manual' ? 'the entered rate' : `a dated provider rate (${ctx.rateDate})`}.`),
      formula('spread', 'Spread-adjusted rate', 'Effective rate = reference rate x (1 - spread)', 'Models the provider’s percentage margin.'),
      formula('converted', 'Converted amount', 'Converted = (source amount - fixed fee) x reference rate x (1 - spread)', 'Produces the final quote-currency amount.'),
      formula('cost', 'Conversion cost', 'Cost in quote currency = source amount x reference rate - converted amount', 'Combines fixed fee and spread loss.'),
    ],
    nodes: [
      node('source', `${v.from} source amount`, 'Source currency', Number(v.amount), 'number', v.from, ['net']),
      node('net', 'Amount after fixed fee', 'Fee deduction', Number(v.amount) - Number(v.fee), 'number', `${v.amount} - ${v.fee} ${v.from}`, ['rate']),
      node('rate', 'Reference rate', `${v.source} rate`, Number(ctx.rate ?? v.customRate ?? 1), 'number', metric(result, 'Reference exchange rate').toString(), ['spread']),
      node('spread', 'Rate after spread', 'Provider-price transform', metric(result, 'Rate after spread').toString(), 'text', `${v.spread}% spread`, ['target']),
      node('target', `${v.to} converted amount`, 'Quote currency', Number(result.value), 'money', result.formula, []),
    ],
  }),
};
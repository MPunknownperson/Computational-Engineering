import type { ToolModule } from './types';
import { formula, metric, node, part } from './helpers';

export const transactionModule: ToolModule = {
  id: 'transaction', name: 'Ordered settlement network', description: 'Applies tax, percentage fees, per-transaction fees, platform charges, FX spread, and payout charges in their specified order.',
  dataInputs: ['amount', 'transaction count', 'tax mode', 'VAT/sales tax', 'processor percentage', 'fixed fee', 'platform percentage', 'cross-border percentage', 'FX spread', 'payout fee'], companionTools: ['currency', 'tax'],
  build: (v, _ctx, result) => ({
    formulas: [
      formula('gross', 'Gross customer charge', 'Gross = pre-tax sale x (1 + tax rate) x count', 'Establishes total customer payments.'),
      formula('processor', 'Processor fee', 'Processor fee = gross x processing rate + fixed fee x count', 'Applies percentage and fixed transaction charges.'),
      formula('platform', 'Platform and border fees', 'Other percentage fees = pre-tax sale x platform rate + gross x cross-border rate', 'Keeps fee bases distinct.'),
      formula('fx', 'FX spread cost', 'FX cost = proceeds before conversion x spread', 'Applies conversion loss after tax and processing deductions.'),
      formula('net', 'Net settlement', 'Net = (gross - tax - processor - platform - border) x (1-spread) - payout fee', 'Calculates proceeds from a known charge.', v.method === 'net'),
      formula('gross-up', 'Required charge', 'Base = ((target + payout/count)/(1-spread) + fixed)/(1-platform-processing(1+tax))', 'Solves backwards for a desired net amount.', v.method === 'gross-up'),
    ],
    nodes: [
      node('gross', 'Gross charges', 'Customer payment layer', Number(result.centerValue), 'money', 'Amount, count, and tax mode', ['fees']),
      node('tax', 'Tax reserve', 'Tax collection layer', Number(metric(result, 'Tax to set aside')), 'money', `${v.vat}% VAT/sales tax`, ['net']),
      node('fees', 'Total fees', 'Processor and platform layers', Number(metric(result, 'Total fees')), 'money', 'Percentage, fixed, platform, border, FX, payout', ['net']),
      node('net', 'Net settlement', v.method, Number(part(result, 'Net received')), 'money', result.formula, []),
    ],
  }),
};
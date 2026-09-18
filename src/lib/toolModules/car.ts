import type { ToolModule } from './types';
import { formula, metric, node } from './helpers';

export const carModule: ToolModule = {
  id: 'car', name: 'Vehicle finance network', description: 'Separates vehicle tax basis, trade-in treatment, financed fees, interest method, balloon value, and extra principal.',
  dataInputs: ['vehicle price', 'down payment', 'trade-in', 'rebate', 'sales tax', 'fees', 'interest rate', 'term', 'loan method', 'balloon', 'extra principal'], companionTools: ['tax', 'currency', 'transaction'],
  build: (v, _ctx, result) => ({
    formulas: [
      formula('tax-base', 'Sales-tax base', 'Tax base = vehicle price - rebate - eligible trade-in credit', 'Applies the selected trade-in tax rule.'),
      formula('financed', 'Amount financed', 'P = price - rebate + sales tax + financed fees - down payment - trade-in', 'Builds the opening loan balance.'),
      formula('repayment', 'Reducing-balance payment', 'M = P r / (1 - (1 + r)^(-n))', 'Standard amortizing vehicle loan.', v.method === 'repayment'),
      formula('balloon', 'Balloon payment loan', 'M = (P - B/(1+r)^n) r / (1 - (1+r)^(-n))', 'Discounts the final balloon and amortizes the remainder.', v.method === 'balloon'),
      formula('flat', 'Flat add-on interest', 'M = (P + P x annual rate x years) / months', 'Charges interest on original principal rather than remaining balance.', v.method === 'flat'),
      formula('interest', 'Total interest', 'Total interest = Σ periodic interest', 'Accumulated from the reducing-balance schedule.', v.method !== 'flat'),
    ],
    nodes: [
      node('price', 'Vehicle price', 'Purchase input', Number(v.price), 'money', 'Starting purchase value', ['tax', 'finance']),
      node('tax', 'Sales tax', 'Jurisdiction cost', Number(metric(result, 'Sales tax')), 'money', `${v.salesTax}% on selected tax base`, ['finance']),
      node('finance', 'Amount financed', 'Funding transformation', Number(metric(result, 'Amount financed')), 'money', 'Price, tax, fees, down payment, trade, rebate', ['payment']),
      node('payment', 'Monthly payment', v.method, Number(result.value), 'money', result.formula, ['interest']),
      node('interest', 'Total interest', 'Finance cost', Number(metric(result, 'Total interest')), 'money', v.method === 'flat' ? 'Add-on interest' : 'Schedule sum', []),
    ],
  }),
};
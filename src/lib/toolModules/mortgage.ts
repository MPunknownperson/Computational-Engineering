import type { ToolModule } from './types';
import { formula, metric, node } from './helpers';

export const mortgageModule: ToolModule = {
  id: 'mortgage',
  name: 'Actuarial mortgage network',
  description: 'Separates principal, rate conversion, amortization, balloon obligations, ownership costs, APR, and calendar scheduling.',
  dataInputs: ['price', 'down payment', 'nominal/effective rate', 'term', 'frequency', 'compounding convention', 'balloon', 'ownership costs', 'extra principal', 'start date'],
  companionTools: ['tax', 'compound', 'currency'],
  build: (v, _ctx, result) => {
    const price = Number(v.price), down = v.downMode === 'percent' ? price * Number(v.down) / 100 : Number(v.down);
    const principal = price - down, frequency = Number(v.frequency), convention = v.convention === 'semiannual' ? 2 : v.convention === 'effective' ? 1 : 12;
    const rate = Number(v.rate) / 100, periodic = Math.expm1(Math.log1p(rate / convention) * convention / frequency);
    const periods = Number(v.years) * frequency, balloon = v.method === 'balloon' ? principal * Number(v.balloonPct) / 100 : 0;
    return {
      formulas: [
        formula('loan', 'Loan principal', 'P = purchase price - down payment', 'Establishes the amount financed.'),
        formula('rate', 'Periodic interest rate', 'r = (1 + nominal rate / c)^(c / payment frequency) - 1', 'Converts the selected annual-rate convention to the payment period.'),
        formula('payment', 'Amortizing payment', 'M = P r / (1 - (1 + r)^(-n))', 'Pays principal and interest to zero over n periods.', v.method === 'repayment'),
        formula('zero', 'Zero-rate payment', 'M = P / n', 'Avoids division by zero when the interest rate is 0%.', rate === 0),
        formula('interest-only', 'Interest-only payment', 'M = P r; final principal = P', 'Pays interest while principal remains due at maturity.', v.method === 'interest-only'),
        formula('balloon', 'Balloon loan payment', 'M = (P - B) r / (1 - (1 + r)^(-n)); balloon B due at maturity', 'Amortizes only the non-balloon share.', v.method === 'balloon'),
        formula('ownership', 'Payment with ownership costs', 'Total = M + extra principal + property tax / f + insurance / f + HOA x 12 / f + PMI / f', 'Adds only the selected recurring costs.', v.includeCosts === 'true'),
        formula('apr', 'Actuarial APR', 'Net proceeds = Σ(payment_t / (1 + APR/f)^t)', 'Solves APR from net proceeds after closing costs using Newton-Raphson.'),
        formula('ltv', 'Loan-to-value', 'LTV = outstanding principal / original property price', 'Determines the estimated 78% PMI termination point.'),
      ],
      nodes: [
        node('principal', 'Amount financed', 'Principal transformation', principal, 'money', 'Price minus down payment', ['periodic-rate', 'payment']),
        node('periodic-rate', 'Periodic rate', 'Interest-convention transformation', periodic * 100, 'percent', `Converted from ${v.rate}% using ${convention} compounding periods`, ['payment']),
        node('payment', 'Scheduled payment', `${v.method} payment`, Number(result.value), 'money', result.formula, ['schedule', 'apr']),
        node('schedule', 'Total interest', 'Amortization simulation', Number(metric(result, 'Total interest')), 'money', `${result.schedule?.length ?? periods} balance iterations`, ['apr']),
        node('balloon', 'Final balloon', 'Maturity obligation', v.method === 'interest-only' ? principal : balloon, 'money', 'Excluded from the regular payment', ['payment']),
        node('apr', 'Actuarial APR', 'Net-proceeds root solve', Number(metric(result, 'Actuarial APR (with closing)')), 'percent', 'Newton-Raphson solve with closing costs', []),
      ].filter(item => item.id !== 'balloon' || v.method !== 'repayment'),
    };
  },
};
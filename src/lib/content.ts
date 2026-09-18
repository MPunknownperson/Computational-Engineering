import type { ToolId } from './types';

export interface Guide {
  slug: string;
  title: string;
  summary: string;
  readingMinutes: number;
  tool: ToolId;
  sections: { heading: string; body: string[] }[];
  takeaways: string[];
}

/** Editorial explanations of the mechanics behind each module. */
export const guides: Guide[] = [
  {
    slug: 'how-amortization-works',
    title: 'How loan amortization actually works',
    summary: 'Why an early mortgage payment is almost all interest, how extra principal changes the payoff date, and what a balloon structure really commits you to.',
    readingMinutes: 6,
    tool: 'mortgage',
    sections: [
      {
        heading: 'The payment is fixed, the split is not',
        body: [
          'An amortizing loan charges interest on the balance that is still outstanding. Because the balance is largest at the start, the first payments are mostly interest and repay very little principal.',
          'The periodic payment itself is the constant that makes the balance reach exactly zero on the final scheduled payment: M = P x r / (1 - (1 + r)^-n), where r is the periodic rate and n the number of payments.',
        ],
      },
      {
        heading: 'Why the rate convention matters',
        body: [
          'A nominal annual rate has to be converted to a periodic rate before it can be applied. Monthly compounding divides by twelve; Canadian mortgages conventionally use semiannual compounding, which produces a slightly different periodic rate for the same headline number.',
          'The calculator exposes this as an explicit setting rather than assuming one convention, because using the wrong one shifts the payment by a small but real amount over hundreds of periods.',
        ],
      },
      {
        heading: 'Extra principal compounds in your favour',
        body: [
          'Any amount paid above the scheduled payment reduces the balance immediately, so every future interest charge is calculated on a smaller number. This is why a modest recurring overpayment can remove years from a long loan.',
          'The schedule is recalculated payment by payment rather than approximated, so the payoff date and total interest reflect the actual sequence of balances.',
        ],
      },
      {
        heading: 'Interest-only and balloon structures',
        body: [
          'An interest-only payment does not reduce principal at all: the entire original amount is still owed at maturity. A balloon structure amortizes only part of the loan and leaves the remainder due as a lump sum.',
          'Both require a sale, refinance or cash settlement at the end of the term. The calculator reports the final obligation separately so it is never hidden inside the regular payment.',
        ],
      },
    ],
    takeaways: [
      'Interest is charged on the remaining balance, not the original amount.',
      'The compounding convention changes the periodic rate and therefore the payment.',
      'Extra principal reduces every future interest charge, not just the current one.',
      'Interest-only and balloon loans leave a real obligation at maturity.',
    ],
  },
  {
    slug: 'reading-tax-bands',
    title: 'Reading tax bands without getting caught out',
    summary: 'Marginal versus effective rates, why a raise never lowers take-home pay, and how allowances, credits and contributions differ.',
    readingMinutes: 7,
    tool: 'tax',
    sections: [
      {
        heading: 'Marginal is not average',
        body: [
          'A progressive system taxes each slice of income at the rate for that band. Entering a higher band only affects the income above the threshold, never the income below it.',
          'Your effective rate, total tax divided by gross income, is therefore always lower than your top marginal rate. The calculator reports both so the distinction is visible.',
        ],
      },
      {
        heading: 'Allowances reduce the base, credits reduce the tax',
        body: [
          'An allowance or deduction lowers the income the bands are applied to. Its value therefore depends on your marginal rate: a 1,000 deduction is worth 200 at a 20% rate and 400 at 40%.',
          'A credit is subtracted from the calculated tax itself, so its value is the same regardless of your band. Mixing these up is one of the most common estimation errors.',
        ],
      },
      {
        heading: 'Contributions are not income tax',
        body: [
          'Social insurance, pension and health contributions are usually calculated on a different base from income tax, often with their own ceilings. They reduce take-home pay but are not part of the income tax figure.',
          'Every contribution in the calculator is a separate, editable switch with its own rate and eligible-earnings ceiling. Nothing is enabled silently, because eligibility varies by residence and employment status.',
        ],
      },
      {
        heading: 'Regional and local layers',
        body: [
          'Some countries add a regional income tax with its own schedule, others add a surcharge on the national tax, and many add nothing at all. These bases are genuinely different and are modelled separately.',
          'Selecting a locality never enables a tax by itself. Where a verified local rate is not available, the field stays empty for you to fill in rather than being guessed from a place name.',
        ],
      },
    ],
    takeaways: [
      'A raise never reduces your take-home pay under a banded system.',
      'Deductions are worth your marginal rate; credits are worth their face value.',
      'Contributions use their own base and ceiling, separate from income tax.',
      'A locality label alone is never treated as a tax rate.',
    ],
  },
  {
    slug: 'compounding-and-real-returns',
    title: 'Compounding, fees and what a return is really worth',
    summary: 'How compounding frequency, contribution timing, expense ratios and inflation interact over a long horizon.',
    readingMinutes: 5,
    tool: 'compound',
    sections: [
      {
        heading: 'Frequency changes the effective rate',
        body: [
          'A 7% nominal rate compounded monthly is not the same as 7% compounded annually. The calculator converts your nominal rate and frequency into an equivalent periodic rate before projecting anything.',
          'Continuous compounding is the mathematical limit of that process and is offered as its own method rather than approximated.',
        ],
      },
      {
        heading: 'Timing is worth more than it looks',
        body: [
          'Contributing at the beginning of each period gives every deposit one extra period of growth. Over decades that ordering difference alone is a visible amount.',
        ],
      },
      {
        heading: 'Fees are subtracted before growth',
        body: [
          'An annual expense ratio reduces the rate that gets compounded, so its effect grows with time rather than staying fixed. A 1% fee is not 1% of the final balance; it is considerably more.',
        ],
      },
      {
        heading: 'Nominal balances overstate purchasing power',
        body: [
          'A projection in future currency is not comparable to money today. Dividing by cumulative inflation gives a real value, which is the number that actually describes what the balance can buy.',
          'Every projection here is a constant-rate assumption, not a forecast. Markets do not deliver a smooth rate, and the sequence of returns matters for withdrawals.',
        ],
      },
    ],
    takeaways: [
      'Convert nominal rates to the compounding frequency you actually receive.',
      'Depositing at the start of a period buys an extra period of growth.',
      'Fee drag compounds, so it grows with the horizon.',
      'Always read the inflation-adjusted figure alongside the nominal one.',
    ],
  },
  {
    slug: 'transaction-fee-stacking',
    title: 'Why transaction fees cost more than the headline rate',
    summary: 'Percentage fees, fixed fees, cross-border loading and FX spread apply to different bases and in a specific order.',
    readingMinutes: 4,
    tool: 'transaction',
    sections: [
      {
        heading: 'Different fees, different bases',
        body: [
          'A processing percentage usually applies to the gross charge including tax, a platform fee often applies to the pre-tax sale, and a fixed fee applies per transaction regardless of size. Adding the percentages together gives the wrong answer.',
        ],
      },
      {
        heading: 'Order of operations',
        body: [
          'Fees are applied in sequence, and an FX spread applies to what remains after the earlier deductions. The calculator applies each layer in its correct position instead of collapsing them into one rate.',
        ],
      },
      {
        heading: 'Small transactions are dominated by fixed fees',
        body: [
          'On a small sale, the per-transaction fixed fee can exceed the percentage component. This is why the effective fee rate reported by the calculator rises sharply as the amount falls.',
        ],
      },
      {
        heading: 'Charging to receive a target amount',
        body: [
          'Working backwards from a desired net is not the same as adding the fee percentage to the price. The gross-up method solves the algebra so the amount you actually receive matches your target.',
        ],
      },
    ],
    takeaways: [
      'Percentage fees apply to different bases and cannot simply be summed.',
      'FX spread applies after the earlier fee layers.',
      'Fixed fees dominate small transactions.',
      'Use gross-up to hit a target net, not a markup.',
    ],
  },
];

export const guideBySlug = Object.fromEntries(guides.map(guide => [guide.slug, guide]));

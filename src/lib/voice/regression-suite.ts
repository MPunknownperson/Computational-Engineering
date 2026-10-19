import type { TaskDomain } from "@/lib/voice/context";

/**
 * Golden cases for replay testing.
 *
 * Every case that previously mis-routed is pinned here. `expect` is the domain
 * the utterance must resolve to; `forbid` names domains that must never be
 * chosen — the linear-equation-as-currency-conversion defect is encoded as a
 * hard prohibition rather than only as a positive expectation.
 */
export interface RegressionCase {
  id: string;
  utterance: string;
  expect: TaskDomain | "clarify" | "rejected";
  forbid?: TaskDomain[];
  expectResult?: string;
  note: string;
}

export const REGRESSION_SUITE: RegressionCase[] = [
  {
    id: "linear-spoken",
    utterance: "solve three x plus five equals twenty",
    expect: "math",
    forbid: ["currency", "units"],
    expectResult: "x = 5",
    note: "Reported defect: dictated linear equation was answered as a currency conversion.",
  },
  {
    id: "linear-symbols",
    utterance: "solve 3x + 5 = 20",
    expect: "math",
    forbid: ["currency", "units"],
    expectResult: "x = 5",
    note: "Symbolic form; speech normalisation must not strip the operators.",
  },
  {
    id: "linear-phrase",
    utterance: "solve the linear equation 2x - 8 = 0",
    expect: "math",
    forbid: ["currency"],
    expectResult: "x = 4",
    note: "Explicit 'linear equation' phrase must dominate intent selection.",
  },
  {
    id: "quadratic",
    utterance: "solve x squared minus 5 x plus 6 equals 0",
    expect: "math",
    forbid: ["currency"],
    note: "Quadratic roots, not a conversion.",
  },
  {
    id: "arithmetic",
    utterance: "what is 12 times 7",
    expect: "math",
    forbid: ["currency", "units"],
    expectResult: "84",
    note: "Plain arithmetic must be evaluated, not converted.",
  },
  {
    id: "arithmetic-divide",
    utterance: "calculate 144 divided by 12",
    expect: "math",
    forbid: ["currency"],
    expectResult: "12",
    note: "Spoken division.",
  },
  {
    id: "currency-explicit",
    utterance: "convert 120 dollars to euros",
    expect: "currency",
    forbid: ["math"],
    note: "Genuine currency conversion must still work.",
  },
  {
    id: "currency-pair",
    utterance: "45 gbp in usd",
    expect: "currency",
    forbid: ["math"],
    note: "ISO code pair.",
  },
  {
    id: "units-length",
    utterance: "100 km to miles",
    expect: "units",
    forbid: ["currency", "math"],
    note: "Unit conversion must not be read as money.",
  },
  {
    id: "units-weight",
    utterance: "convert 80 kilograms to pounds",
    expect: "units",
    forbid: ["currency"],
    note: "'pounds' is a mass unit here, not GBP.",
  },
  {
    id: "bare-number",
    utterance: "eighty",
    expect: "rejected",
    forbid: ["currency", "units"],
    note: "A bare number with no context must never become a currency amount.",
  },
  {
    id: "composed-spoken-arithmetic",
    utterance: "what is one hundred and twenty divided by three",
    expect: "math",
    forbid: ["currency", "units"],
    expectResult: "40",
    note: "Composed spoken numbers must compile as one value rather than adjacent literals.",
  },
  {
    id: "bill-split-with-tip",
    utterance: "split a 120 dollar bill with 20 percent tip between 4 people",
    expect: "finance",
    forbid: ["currency", "units"],
    expectResult: "36",
    note: "A dollar-denominated restaurant bill is a split operation, not an FX conversion.",
  },
  {
    id: "percentage-of",
    utterance: "what is 15 percent of 80",
    expect: "math",
    forbid: ["currency"],
    expectResult: "12",
    note: "Natural percentage requests compile to restricted arithmetic.",
  },
  {
    id: "statistics-average",
    utterance: "find the average of 4 8 and 12",
    expect: "math",
    forbid: ["currency", "units"],
    expectResult: "8",
    note: "Statistical aggregation uses a generated, allow-listed math function.",
  },
  {
    id: "percentage-change",
    utterance: "percentage change from 80 to 100",
    expect: "math",
    forbid: ["currency"],
    expectResult: "25",
    note: "Percentage change preserves direction and uses the original value as denominator.",
  },
  {
    id: "compound-growth",
    utterance: "future value of 1000 at 5 percent for 10 years",
    expect: "finance",
    forbid: ["currency", "units"],
    expectResult: "1628.89",
    note: "A fully specified compound-growth request executes rather than only opening a preset.",
  },
  {
    id: "loan-payment-values",
    utterance: "monthly loan payment on 250000 at 4.8 percent for 30 years",
    expect: "finance",
    forbid: ["currency", "units"],
    expectResult: "1311.66",
    note: "Rate and term labels must not be confused with measurement units.",
  },
  {
    id: "circle-area-values",
    utterance: "area of a circle with radius 12",
    expect: "math",
    forbid: ["currency"],
    expectResult: "452.38",
    note: "Generated geometry code must preserve constants at the start of the expression.",
  },
  {
    id: "fuel-cost-values",
    utterance: "fuel cost for 340 kilometers at 7.4 liters per 100 and 1.68 per liter",
    expect: "finance",
    forbid: ["currency"],
    expectResult: "42.2688",
    note: "The per-100 consumption denominator is not the fuel price.",
  },
];

/** Multi-turn cases: context must not leak across task domains. */
export interface RegressionDialogue {
  id: string;
  turns: Array<{ utterance: string; expect: TaskDomain | "clarify" | "rejected"; forbid?: TaskDomain[] }>;
  note: string;
}

export const REGRESSION_DIALOGUES: RegressionDialogue[] = [
  {
    id: "math-after-currency",
    turns: [
      { utterance: "convert 120 dollars to euros", expect: "currency" },
      { utterance: "solve 3x + 5 = 20", expect: "math", forbid: ["currency"] },
    ],
    note: "A currency turn must not capture the following equation.",
  },
  {
    id: "ellipsis-blocked-after-math",
    turns: [
      { utterance: "convert 120 dollars to euros", expect: "currency" },
      { utterance: "solve 3x + 5 = 20", expect: "math", forbid: ["currency"] },
      { utterance: "and 80", expect: "rejected", forbid: ["currency"] },
    ],
    note: "Stale currency context must not be inherited once the task type changed.",
  },
  {
    id: "ellipsis-allowed-same-domain",
    turns: [
      { utterance: "convert 120 dollars to euros", expect: "currency" },
      { utterance: "and 80", expect: "currency", forbid: ["math"] },
    ],
    note: "Legitimate same-domain ellipsis must still work.",
  },
];

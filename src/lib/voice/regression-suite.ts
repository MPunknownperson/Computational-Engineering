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

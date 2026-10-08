import { CATEGORIES, FACTORS, TEMPERATURE_UNITS, type Category } from "./units";
import { internalHref } from "./urls";

export type ExpressionPreset = { id: string; name: string; expression: string; variables: string; description: string };
export const EXPRESSION_PRESETS: ExpressionPreset[] = [
  { id: "compound-interest", name: "Compound interest", expression: "P * (1 + r/n)^(n*t)", variables: "P = 1000; r = 0.05; n = 12; t = 10", description: "Illustrative fixed-rate growth with no fees or additional deposits." },
  { id: "loan-payment", name: "Loan payment", expression: "P * (r/12) / (1 - (1 + r/12)^(-12*n))", variables: "P = 250000; r = 0.048; n = 30", description: "Illustrative equal monthly payments at a fixed positive annual rate, excluding fees." },
  { id: "circle-area", name: "Circle area", expression: "pi * radius^2", variables: "radius = 12.5", description: "Area in square units for a radius expressed in the same length unit." },
  { id: "heat-change", name: "Heat change", expression: "mass * capacity * (T2 - T1)", variables: "mass = 2; capacity = 4.18; T2 = 80; T1 = 20", description: "Sensible heat at constant specific heat capacity; no phase change." },
  { id: "fuel-estimate", name: "Fuel estimate", expression: "distance * use / 100 * price", variables: "distance = 340; use = 7.4; price = 1.68", description: "Distance in km, consumption in L/100 km and price per litre." },
  { id: "tip-split", name: "Tip split", expression: "bill * (1 + tip) / people", variables: "bill = 184.5; tip = 0.12; people = 5", description: "Split a bill and proportional tip evenly." },
  { id: "pace", name: "Pace", expression: "minutes / distance", variables: "minutes = 225; distance = 42.195", description: "Average minutes per distance unit." },
  { id: "linear-system", name: "Two linear equations", expression: "lusolve([2, 1; 1, -1], [5; 1])", variables: "", description: "Solve 2x + y = 5 and x − y = 1." },
  { id: "determinant", name: "Matrix determinant", expression: "det([1, 2; 3, 4])", variables: "", description: "The determinant of a two-by-two matrix." },
  { id: "quadratic-root", name: "Quadratic positive root", expression: "(-b + sqrt(b^2 - 4*a*c)) / (2*a)", variables: "a = 1; b = -5; c = 6", description: "Positive branch of the quadratic formula; change + to − for the second root." },
  { id: "normal-density", name: "Normal density", expression: "exp(-((x-mu)^2)/(2*sigma^2))/(sigma*sqrt(2*pi))", variables: "x = 82; mu = 70; sigma = 12", description: "Normal probability density at x; this is a density, not the probability of one exact point." },

  // --- Markets & finance -------------------------------------------------
  { id: "mortgage-total-interest", name: "Mortgage total interest", expression: "(P * (r/12) / (1 - (1 + r/12)^(-12*n))) * 12 * n - P", variables: "P = 250000; r = 0.048; n = 30", description: "Total interest over the full term of an equal-payment loan at a fixed rate; excludes fees, insurance and overpayments." },
  { id: "savings-goal-monthly", name: "Savings goal — monthly deposit", expression: "goal * (r/12) / ((1 + r/12)^(12*t) - 1)", variables: "goal = 20000; r = 0.04; t = 5", description: "Equal end-of-month deposits needed to reach a target at a fixed annual rate, compounded monthly; no tax or fees." },
  { id: "future-value-deposits", name: "Future value of regular deposits", expression: "d * ((1 + r/12)^(12*t) - 1) / (r/12)", variables: "d = 300; r = 0.05; t = 10", description: "Value of equal monthly deposits after t years at a fixed annual rate, compounded monthly." },
  { id: "inflation-adjusted", name: "Inflation-adjusted value", expression: "amount / (1 + i)^t", variables: "amount = 10000; i = 0.03; t = 10", description: "Purchasing power of a future amount in today's money at a constant annual inflation rate." },
  { id: "real-return", name: "Real rate of return", expression: "(1 + nominal) / (1 + inflation) - 1", variables: "nominal = 0.07; inflation = 0.03", description: "Fisher relation: the return after removing inflation. Not an after-tax figure." },
  { id: "effective-annual-rate", name: "Effective annual rate", expression: "(1 + r/n)^n - 1", variables: "r = 0.06; n = 12", description: "Converts a nominal annual rate compounded n times a year into its effective annual equivalent." },
  { id: "currency-spread-cost", name: "Currency spread cost", expression: "amount * (mid - offered) + fee", variables: "amount = 1000; mid = 0.92; offered = 0.905; fee = 2", description: "Cost of a conversion against the mid-market rate: the rate gap on the amount plus any fixed fee. Illustrative; check the provider's quote." },
  { id: "percentage-change", name: "Percentage change", expression: "(current - previous) / previous * 100", variables: "current = 206; previous = 200", description: "Percentage change between two readings — a price, an index or a balance." },
  { id: "break-even-units", name: "Break-even units", expression: "fixed / (price - variable)", variables: "fixed = 12000; price = 45; variable = 27", description: "Units that must be sold for revenue to cover fixed and variable costs, assuming a constant unit margin." },
  { id: "position-size", name: "Position size by risk", expression: "capital * risk / (entry - stop)", variables: "capital = 10000; risk = 0.01; entry = 50; stop = 47.5", description: "Units to buy so that a stop-loss limits the loss to a chosen fraction of capital. Illustrative; ignores slippage and fees." },
];

export function findPreset(id: string | null | undefined) {
  return EXPRESSION_PRESETS.find((item) => item.id === id);
}

export function presetHref(id: string, tool: "formula" | "scientific" = "formula") {
  return internalHref(`/tools/${tool}`, { preset: id });
}

export type UnitInput = { category: Category; value: string; from: string; to: string };
export function unitInput(params: Pick<URLSearchParams, "get">): UnitInput {
  const rawCategory = params.get("category");
  const category: Category = rawCategory && Object.hasOwn(CATEGORIES, rawCategory) ? rawCategory as Category : "length";
  const available = category === "temperature" ? Object.keys(TEMPERATURE_UNITS) : Object.keys(FACTORS[category]);
  const defaultFrom = category === "length" ? "m" : available[0];
  const defaultTo = category === "length" ? "ft" : available[1];
  const from = available.includes(params.get("from") ?? "") ? params.get("from")! : defaultFrom;
  const to = available.includes(params.get("to") ?? "") ? params.get("to")! : defaultTo;
  const rawValue = params.get("value") ?? "1";
  const value = rawValue.length <= 80 && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(rawValue) && Number.isFinite(Number(rawValue)) ? rawValue : "1";
  return { category, value, from, to };
}

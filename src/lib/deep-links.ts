import { internalHref } from "./urls";
import { presetHref } from "./presets";
import { GUIDES, guidePath } from "./guides";

/**
 * Crawlable starting points, each linking to a real tool with its inputs
 * preloaded. These exist so that (a) visitors can jump straight to the
 * calculation they need, and (b) search engines see descriptive anchor text and
 * distinct destination URLs for the keyword intents the site actually serves.
 *
 * This is a link registry, not a search feature: there is no query box and
 * nothing is looked up at runtime.
 */
export type DeepLink = {
  title: string;
  description: string;
  href: string;
  formula?: string;
  group: string;
};

export const CONVERSION_LINKS: DeepLink[] = [
  { title: "Meters to feet", description: "Length conversion with every other length unit listed alongside.", href: internalHref("/tools/units", { category: "length", from: "m", to: "ft", value: "5" }), formula: "m ÷ 0.3048", group: "Length" },
  { title: "Miles to kilometers", description: "Distance conversion using the exact international mile definition.", href: internalHref("/tools/units", { category: "length", from: "mi", to: "km", value: "5" }), formula: "mi × 1.609344", group: "Length" },
  { title: "Inches to centimeters", description: "Small-measurement length conversion.", href: internalHref("/tools/units", { category: "length", from: "in", to: "cm", value: "10" }), formula: "in × 2.54", group: "Length" },
  { title: "Square feet to square meters", description: "Area conversion using the squared length factor.", href: internalHref("/tools/units", { category: "area", from: "ft2", to: "m2", value: "500" }), formula: "ft² × 0.09290304", group: "Area" },
  { title: "Pounds to kilograms", description: "Mass conversion using the exact avoirdupois pound definition.", href: internalHref("/tools/units", { category: "mass", from: "lb", to: "kg", value: "10" }), formula: "lb × 0.45359237", group: "Mass" },
  { title: "Kilograms to pounds", description: "Reverse mass conversion.", href: internalHref("/tools/units", { category: "mass", from: "kg", to: "lb", value: "70" }), formula: "kg ÷ 0.45359237", group: "Mass" },
  { title: "Celsius to Fahrenheit", description: "Temperature conversion including its offset, with absolute-zero checks.", href: internalHref("/tools/units", { category: "temperature", from: "C", to: "F", value: "20" }), formula: "°C × 9⁄5 + 32", group: "Temperature" },
  { title: "Fahrenheit to Celsius", description: "Reverse temperature conversion.", href: internalHref("/tools/units", { category: "temperature", from: "F", to: "C", value: "68" }), formula: "(°F − 32) × 5⁄9", group: "Temperature" },
  { title: "Liters to US gallons", description: "Volume conversion, with Imperial gallons labelled separately.", href: internalHref("/tools/units", { category: "volume", from: "l", to: "gal_us", value: "10" }), formula: "L ÷ 3.785411784", group: "Volume" },
  { title: "km/h to mph", description: "Speed conversion from the defined kilometre and mile.", href: internalHref("/tools/units", { category: "speed", from: "km/h", to: "mph", value: "100" }), formula: "km/h × 0.621371…", group: "Speed" },
  { title: "MB to MiB", description: "Decimal-to-binary data-size conversion.", href: internalHref("/tools/units", { category: "data", from: "MB", to: "MiB", value: "500" }), formula: "MB × 10⁶ ÷ 2²⁰", group: "Data" },
  { title: "GB to GiB", description: "Larger decimal-to-binary data-size conversion.", href: internalHref("/tools/units", { category: "data", from: "GB", to: "GiB", value: "1" }), formula: "GB × 10⁹ ÷ 2³⁰", group: "Data" },
];

export const FORMULA_LINKS: DeepLink[] = [
  { title: "Compound interest", description: "Fixed-rate growth with a chosen compounding frequency.", href: presetHref("compound-interest"), formula: "P × (1 + r/n)^(n×t)", group: "Growth" },
  { title: "Loan payment", description: "Illustrative equal monthly payments at a fixed annual rate.", href: presetHref("loan-payment"), formula: "P(r⁄12) ⁄ (1 − (1 + r⁄12)^(−12n))", group: "Finance" },
  { title: "Quadratic positive root", description: "One branch of the quadratic formula; change the sign for the other root.", href: presetHref("quadratic-root"), formula: "(−b + √(b² − 4ac)) ⁄ 2a", group: "Algebra" },
  { title: "Two linear equations", description: "Solve a small matrix system and check both residuals.", href: presetHref("linear-system", "scientific"), formula: "A·x = b", group: "Algebra" },
  { title: "Matrix determinant", description: "Determinant of a two-by-two matrix.", href: presetHref("determinant", "scientific"), formula: "det([1, 2; 3, 4])", group: "Algebra" },
  { title: "Circle area", description: "Area from a radius expressed in the same length unit.", href: presetHref("circle-area"), formula: "π × r²", group: "Geometry" },
  { title: "Heat change", description: "Sensible heat at constant specific heat capacity.", href: presetHref("heat-change"), formula: "m × c × ΔT", group: "Science" },
  { title: "Fuel estimate", description: "Distance, consumption and price per litre combined.", href: presetHref("fuel-estimate"), formula: "d × u ⁄ 100 × p", group: "Everyday" },
  { title: "Tip split", description: "Split a bill and a proportional tip evenly.", href: presetHref("tip-split"), formula: "bill × (1 + tip) ⁄ people", group: "Everyday" },
  { title: "Pace", description: "Average minutes per unit of distance.", href: presetHref("pace"), formula: "minutes ⁄ distance", group: "Everyday" },
];

export const REFERENCE_LINKS: DeepLink[] = [
  { title: "US inflation rate", description: "Consumer-price inflation for the United States, with history.", href: internalHref("/tools/economy", { country: "USA", indicator: "inflation" }), group: "Economy" },
  { title: "Japan GDP per person", description: "Gross domestic product per capita for Japan.", href: internalHref("/tools/economy", { country: "JPN", indicator: "gdp_per_capita" }), group: "Economy" },
  { title: "Germany unemployment", description: "Unemployment measure for Germany.", href: internalHref("/tools/economy", { country: "DEU", indicator: "unemployment" }), group: "Economy" },
  { title: "India population", description: "Total population for India.", href: internalHref("/tools/economy", { country: "IND", indicator: "population" }), group: "Economy" },
  { title: "US dollar to euro", description: "Indicative reference conversion with its rate date and recent trend.", href: internalHref("/tools/currency", { base: "USD", to: "EUR", amount: "100" }), group: "Currency" },
  { title: "Pound to US dollar", description: "Reference conversion for GBP to USD.", href: internalHref("/tools/currency", { base: "GBP", to: "USD", amount: "100" }), group: "Currency" },
  { title: "Digital-asset prices", description: "Selected prices and daily movement, filterable by name or symbol.", href: "/tools/crypto", group: "Digital assets" },
];

export const GUIDE_LINKS: DeepLink[] = GUIDES.map((guide) => ({
  title: guide.title.split(":")[0],
  description: guide.description,
  href: guidePath(guide),
  formula: guide.formula,
  group: guide.category,
}));

export const ALL_DEEP_LINKS: DeepLink[] = [...CONVERSION_LINKS, ...FORMULA_LINKS, ...REFERENCE_LINKS];

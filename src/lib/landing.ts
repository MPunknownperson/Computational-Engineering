
export type LandingKind = "convert" | "calculate" | "reference";

export type LandingPage = {
  slug: string;
  section: LandingKind;
  /** Full URL path, e.g. /convert/miles-to-kilometers */
  path: string;
  title: string;
  description: string;
  formula?: string;
  intro: string;
  /** What the embedded widget is preloaded with. */
  widget:
    | { type: "convert"; category: string; from: string; to: string; value: string; fromLabel: string; toLabel: string }
    | { type: "calculate"; preset: string; expression: string; variables: string; name?: string }
    | { type: "reference"; feed: "economy" | "currency" | "crypto"; params: Record<string, string>; blurb: string };
  method: { heading: string; paragraphs: string[] }[];
  assumptions: string[];
  /** Internal links to related tools, guides and sibling landing pages. */
  related: { href: string; label: string }[];
};

const convert = (
  slug: string,
  title: string,
  description: string,
  formula: string,
  intro: string,
  widget: Extract<LandingPage["widget"], { type: "convert" }>,
  method: LandingPage["method"],
  assumptions: string[],
  related: LandingPage["related"],
): LandingPage => ({ slug, section: "convert", path: `/convert/${slug}`, title, description, formula, intro, widget, method, assumptions, related });

const calculate = (
  slug: string,
  title: string,
  description: string,
  formula: string,
  intro: string,
  widget: Extract<LandingPage["widget"], { type: "calculate" }>,
  method: LandingPage["method"],
  assumptions: string[],
  related: LandingPage["related"],
): LandingPage => ({ slug, section: "calculate", path: `/calculate/${slug}`, title, description, formula, intro, widget, method, assumptions, related });

const reference = (
  slug: string,
  title: string,
  description: string,
  intro: string,
  widget: Extract<LandingPage["widget"], { type: "reference" }>,
  method: LandingPage["method"],
  assumptions: string[],
  related: LandingPage["related"],
): LandingPage => ({ slug, section: "reference", path: `/reference/${slug}`, title, description, intro, widget, method, assumptions, related });

export const LANDING_PAGES: LandingPage[] = [
  convert(
    "kilograms-to-pounds",
    "KG to LBS Converter: Kilograms to Pounds",
    "Convert any kilogram value to pounds instantly using the exact 0.45359237 kg definition. Prefilled at 70 kg — edit the number, press Convert, read the answer.",
    "lb = kg ÷ 0.45359237",
    "Kilograms belong to the metric system and pounds to the imperial system, so converting between them is one of the most searched everyday calculations — for luggage allowances, gym weights, recipes and shipping labels. One kilogram equals about 2.20462 pounds.",
    { type: "convert", category: "mass", from: "kg", to: "lb", value: "70", fromLabel: "kilograms (kg)", toLabel: "pounds (lb)" },
    [
      { heading: "How the conversion works", paragraphs: ["The international avoirdupois pound is defined as exactly 0.45359237 kilograms. To go from kilograms to pounds, divide by 0.45359237 — equivalently, multiply by about 2.20462262. The converter below is preloaded with 70 kg; edit the value and press Convert to reveal the answer."] },
      { heading: "Everyday uses", paragraphs: ["Airlines usually quote baggage limits in both units, gym plates are often labelled in one system only, and recipes cross between grams and ounces. Because the factor is exact, any rounding you see comes from display precision, not from the definition."] },
    ],
    ["This page converts mass. It does not convert pounds-force, fluid ounces or troy ounces.", "A bathroom scale's accuracy limits the meaningful precision — converting 70 kg to six decimals does not make the measurement that precise."],
    [
      { href: "/tools/units?category=mass&from=kg&to=lb&value=70", label: "Open in the full unit converter" },
      { href: "/guides/pounds-to-kilograms", label: "Guide: pounds to kilograms" },
      { href: "/convert/pounds-to-kilograms", label: "Reverse: pounds to kilograms" },
    ],
  ),
  convert(
    "pounds-to-kilograms",
    "LBS to KG Converter: Pounds to Kilograms",
    "Convert any pound value to kilograms instantly using the exact 0.45359237 factor. Prefilled at 10 lb — edit the number, press Convert, read the answer.",
    "kg = lb × 0.45359237",
    "Pounds to kilograms is the reverse of the classic luggage-and-gym conversion. Ten pounds is about four and a half kilograms. The factor is exact by definition, so the converter's answer is limited only by display rounding.",
    { type: "convert", category: "mass", from: "lb", to: "kg", value: "10", fromLabel: "pounds (lb)", toLabel: "kilograms (kg)" },
    [
      { heading: "How the conversion works", paragraphs: ["Multiply the pound value by exactly 0.45359237. The widget below starts at 10 lb; change it to anything — a suitcase, a parcel, a barbell — and press Convert."] },
      { heading: "Watch the direction", paragraphs: ["Multiplying converts pounds to kilograms; dividing converts kilograms to pounds. Mixing the two directions is the most common mistake, so the tile grid under the result shows every unit at once for comparison."] },
    ],
    ["Mass only — not force, and not fluid or troy ounces.", "Keep the precision of your input in mind: a scale reading of 10 lb supports about two or three significant figures."],
    [
      { href: "/tools/units?category=mass&from=lb&to=kg&value=10", label: "Open in the full unit converter" },
      { href: "/guides/pounds-to-kilograms", label: "Guide: pounds to kilograms" },
      { href: "/convert/kilograms-to-pounds", label: "Reverse: kilograms to pounds" },
    ],
  ),
  convert(
    "centimeters-to-inches",
    "CM to Inches Converter: Exact Factor & Examples",
    "Convert centimeters to inches with the exact 2.54 cm factor. Prefilled at 100 cm — edit the number, press Convert, and read the answer.",
    "in = cm ÷ 2.54",
    "Centimeters to inches is a daily need for clothing sizes, screen diagonals, furniture dimensions and craft projects. One inch is exactly 2.54 centimeters, so 100 cm is just over 39⅓ inches.",
    { type: "convert", category: "length", from: "cm", to: "in", value: "100", fromLabel: "centimeters (cm)", toLabel: "inches (in)" },
    [
      { heading: "How the conversion works", paragraphs: ["Divide centimeters by exactly 2.54. The widget starts at 100 cm; type your own measurement and press Convert. The full grid underneath shows the same length in every other length unit for instant comparison."] },
      { heading: "Fractions of an inch", paragraphs: ["Tape measures often read in fractions like ⅜″. A decimal answer such as 39.37 in can be read as 39 inches plus 0.37 × 16 ≈ six sixteenths. For woodworking, round only the final cut list, not each intermediate step."] },
    ],
    ["The inch here is the international inch of exactly 2.54 cm.", "Screen sizes are diagonals; furniture dimensions may mix nominal and actual sizes — the converter handles the arithmetic, not the product spec."],
    [
      { href: "/tools/units?category=length&from=cm&to=in&value=100", label: "Open in the full unit converter" },
      { href: "/guides/meters-to-feet", label: "Guide: meters to feet" },
      { href: "/convert/miles-to-kilometers", label: "Longer distances: miles to kilometers" },
    ],
  ),
  convert(
    "miles-to-kilometers",
    "Miles to Kilometers Converter: mi to km",
    "Convert any distance in miles to kilometers using the exact 1.609344 factor. Prefilled at 5 mi — edit the number, press Convert, read the answer.",
    "km = mi × 1.609344",
    "Road-trip planning, running distances and speed-limit comparisons all need miles and kilometers side by side. One international mile is exactly 1.609344 kilometers, so five miles is 8.04672 km.",
    { type: "convert", category: "length", from: "mi", to: "km", value: "5", fromLabel: "miles (mi)", toLabel: "kilometers (km)" },
    [
      { heading: "How the conversion works", paragraphs: ["Multiply miles by 1.609344. The embedded converter opens at 5 miles; change the distance — a marathon is 26.2 miles — and press Convert."] },
      { heading: "Statute miles, not nautical miles", paragraphs: ["This page uses the international statute mile. Nautical miles, used in aviation and shipping, are longer at 1,852 meters each and live in the same converter under “nmi”."] },
    ],
    ["A conversion changes units, not the accuracy of the original distance measurement.", "For area or fuel economy you need squared factors or combined units — see the kilometer and fuel guides."],
    [
      { href: "/tools/units?category=length&from=mi&to=km&value=5", label: "Open in the full unit converter" },
      { href: "/guides/miles-to-kilometers", label: "Guide: miles to kilometers" },
      { href: "/convert/kilometers-per-hour-to-mph", label: "Related: km/h to mph" },
    ],
  ),
  convert(
    "kilometers-per-hour-to-mph",
    "Km/h to MPH Converter: Speed Conversion",
    "Convert any speed from kilometers per hour to miles per hour. Prefilled at 100 km/h — edit the number, press Convert, and read the answer.",
    "mph = km/h × 0.621371…",
    "Speed-limit signs change at borders: 100 km/h is just over 62 mph. Because an hour is an hour in both systems, only the distance unit converts — multiply by about 0.621371.",
    { type: "convert", category: "speed", from: "km/h", to: "mph", value: "100", fromLabel: "kilometers per hour (km/h)", toLabel: "miles per hour (mph)" },
    [
      { heading: "How the conversion works", paragraphs: ["One kilometer is 1⁄1.609344 miles, so one km/h equals about 0.621371 mph. Enter your speed and press Convert. Reversing direction means dividing by the same ratio — or multiplying by 1.609344."] },
      { heading: "Dashboard readings differ", paragraphs: ["A converted number describes the same speed in different units; it says nothing about speedometer tolerance, tyre size or local limits. Always drive to the posted signs, not the converter."] },
    ],
    ["This converts a speed, not a distance or a travel time.", "Displayed decimals describe the ratio, not speedometer accuracy."],
    [
      { href: "/tools/units?category=speed&from=km%2Fh&to=mph&value=100", label: "Open in the full unit converter" },
      { href: "/convert/miles-to-kilometers", label: "Related: miles to kilometers" },
      { href: "/guides/meters-to-feet", label: "Guide: meters to feet" },
    ],
  ),
  convert(
    "liters-to-gallons",
    "Liters to Gallons (US) Converter",
    "Convert liters to US gallons using the exact 3.785411784 definition. Prefilled at 10 L — edit the number, press Convert, and read the answer.",
    "US gal = L ÷ 3.785411784",
    "Fuel economy, aquariums, paint coverage and recipes all cross between liters and gallons. One US liquid gallon is exactly 3.785411784 liters — noticeably smaller than the Imperial gallon, so always check which gallon a figure means.",
    { type: "convert", category: "volume", from: "l", to: "gal_us", value: "10", fromLabel: "liters (L)", toLabel: "US gallons (gal)" },
    [
      { heading: "How the conversion works", paragraphs: ["Divide liters by 3.785411784. The widget starts at 10 liters; adjust it and press Convert. The comparison grid shows US pints and cups alongside, which share the same US-gallon family."] },
      { heading: "US versus Imperial gallons", paragraphs: ["The Imperial gallon is 4.54609 liters — about 20% larger. A mileage figure in miles-per-Imperial-gallon cannot be compared directly with miles-per-US-gallon. This converter labels both explicitly."] },
    ],
    ["Volume only: a fluid ounce is not interchangeable with a mass ounce.", "Container brim capacity and usable capacity differ; the converter handles units, not packaging."],
    [
      { href: "/tools/units?category=volume&from=l&to=gal_us&value=10", label: "Open in the full unit converter" },
      { href: "/guides/liters-to-us-gallons", label: "Guide: liters to US gallons" },
      { href: "/convert/pounds-to-kilograms", label: "Related: pounds to kilograms" },
    ],
  ),
  convert(
    "celsius-to-fahrenheit",
    "Celsius to Fahrenheit Converter (°C to °F)",
    "Convert Celsius to Fahrenheit with the 9⁄5-plus-32 rule. Prefilled at 20 °C — edit the number, press Convert, and read the answer.",
    "°F = °C × 9⁄5 + 32",
    "Celsius to Fahrenheit is a daily need for weather, cooking and travel. Unlike most conversions it needs an offset as well as a scale factor, because the two scales start at different zeros.",
    { type: "convert", category: "temperature", from: "C", to: "F", value: "20", fromLabel: "Celsius (°C)", toLabel: "Fahrenheit (°F)" },
    [
      { heading: "How the conversion works", paragraphs: ["Multiply the Celsius value by 9⁄5 and add 32. The widget opens at 20 °C, which converts to 68 °F. Reverse the direction by subtracting 32 first and multiplying by 5⁄9."] },
      { heading: "Changes versus readings", paragraphs: ["The +32 offset applies to temperature readings only. A change of 10 Celsius degrees equals a change of 18 Fahrenheit degrees — no offset involved."] },
    ],
    ["Readings below absolute zero in Kelvin are rejected as invalid.", "Sensor calibration and display rounding still limit real-world precision."],
    [
      { href: "/tools/units?category=temperature&from=C&to=F&value=20", label: "Open in the full unit converter" },
      { href: "/guides/celsius-to-fahrenheit", label: "Guide: Celsius to Fahrenheit" },
      { href: "/convert/pounds-to-kilograms", label: "Related: pounds to kilograms" },
    ],
  ),
  convert(
    "square-feet-to-square-meters",
    "Square Feet to Square Meters Converter",
    "Convert square feet to square meters using the squared length factor. Prefilled at 500 ft² — edit the number, press Convert, and read the answer.",
    "m² = ft² × 0.09290304",
    "Property listings, floor plans and renovation quotes switch between square feet and square meters. Because area is two-dimensional, the conversion uses the length factor squared: 0.09290304.",
    { type: "convert", category: "area", from: "ft2", to: "m2", value: "500", fromLabel: "square feet (ft²)", toLabel: "square meters (m²)" },
    [
      { heading: "How the conversion works", paragraphs: ["Multiply square feet by 0.09290304. The widget opens at 500 ft², about 46.45 m². Multiplying by the length factor 0.3048 only once is the classic mistake — area needs it squared."] },
      { heading: "Area is not length", paragraphs: ["A 10 ft × 10 ft room is 100 ft². Convert the area figure itself rather than each side separately unless you recompute length × width afterwards."] },
    ],
    ["This converts area; lengths, volumes and room heights need their own conversions.", "Listing areas may use different measurement standards — the converter handles units, not definitions."],
    [
      { href: "/tools/units?category=area&from=ft2&to=m2&value=500", label: "Open in the full unit converter" },
      { href: "/convert/miles-to-kilometers", label: "Related: miles to kilometers" },
      { href: "/convert/liters-to-gallons", label: "Related: liters to gallons" },
    ],
  ),
  calculate(
    "loan-payment",
    "Loan Payment Calculator: Monthly Repayment",
    "Estimate a monthly loan payment from principal, annual rate and term in years. Prefilled example included — edit the values and press Evaluate.",
    "payment = P(r⁄12) ⁄ (1 − (1 + r⁄12)^(−12n))",
    "A fixed-rate loan splits every payment into interest and principal. This calculator estimates the level monthly payment for a given amount, nominal annual rate and term in years — the same arithmetic behind mortgage and auto-loan quotes.",
    { type: "calculate", preset: "loan-payment", expression: "P * (r/12) / (1 - (1 + r/12)^(-12*n))", variables: "P = 250000; r = 0.048; n = 30" },
    [
      { heading: "How the estimate works", paragraphs: ["Enter the principal P, the nominal annual rate r as a decimal, and the term n in years. The widget preloads a 250,000 loan at 4.8% over 30 years; change any value and press Evaluate. The formula assumes a fixed rate, monthly compounding and no extra payments."] },
      { heading: "What quotes add on top", paragraphs: ["Real offers add fees, insurance, taxes and sometimes rate changes — none of which this formula includes. Use the estimate to compare scenarios, then confirm the full cost with the lender's disclosure."] },
    ],
    ["Illustration only — not a loan offer, approval or advice.", "The rate must be positive and the term in whole years for the standard formula to apply."],
    [
      { href: "/tools/formula?preset=loan-payment", label: "Open in the formula engine" },
      { href: "/guides/compound-interest", label: "Guide: compound interest" },
      { href: "/calculate/tip-split", label: "Everyday math: split a bill" },
    ],
  ),
  calculate(
    "tip-split",
    "Tip & Bill Split Calculator",
    "Split a bill plus a percentage tip across any number of people. Prefilled at 184.50 with 12% for 5 — edit the values and press Evaluate.",
    "share = bill × (1 + tip) ÷ people",
    "Splitting the check fairly means applying the tip before dividing — otherwise the tip gets shared unevenly. This calculator adds the chosen tip rate to the bill, then divides by the number of people.",
    { type: "calculate", preset: "tip-split", expression: "bill * (1 + tip) / people", variables: "bill = 184.5; tip = 0.12; people = 5" },
    [
      { heading: "How the split works", paragraphs: ["The example uses a 184.50 bill, a 12% tip (entered as 0.12) and 5 people. Adjust any of the three values and press Evaluate. Rounding to cents happens only on display; keep full precision while comparing options."] },
      { heading: "Agree the method first", paragraphs: ["Groups differ on whether to tip on the pre-tax or post-tax amount, and how to round the leftover cent. Decide together, then let the calculator do the arithmetic."] },
    ],
    ["Enter the tip as a decimal: 15% is 0.15.", "The people count must be at least one; tax and service charges follow the receipt, not this formula."],
    [
      { href: "/tools/formula?preset=tip-split", label: "Open in the formula engine" },
      { href: "/calculate/loan-payment", label: "Bigger sums: loan payments" },
      { href: "/guides/compound-interest", label: "Guide: compound interest" },
    ],
  ),
  calculate(
    "quadratic-formula",
    "Quadratic Formula Calculator: Solved Step by Step",
    "Solve a quadratic equation step by step. Prefilled with x² − 5x + 6 — change the coefficients and press Evaluate.",
    "x = (−b ± √(b² − 4ac)) ⁄ 2a",
    "The quadratic formula solves any second-degree equation. The discriminant b² − 4ac tells you in advance whether to expect two real roots, one repeated root, or complex roots.",
    { type: "calculate", preset: "quadratic-root", expression: "(-b + sqrt(b^2 - 4*a*c)) / (2*a)", variables: "a = 1; b = -5; c = 6" },
    [
      { heading: "How the solution works", paragraphs: ["The widget evaluates the plus branch for a = 1, b = −5, c = 6, giving x = 3. Change the plus to a minus for the second root, x = 2. Always substitute each root back: 2² − 5(2) + 6 = 0."] },
      { heading: "Reading the discriminant", paragraphs: ["Positive means two distinct real roots; zero means one repeated root; negative means complex roots. If a is zero the equation is linear, not quadratic, and this formula does not apply."] },
    ],
    ["Coefficients must be numbers; a cannot be zero here.", "Substitution is the check — a plausible-looking decimal is not proof."],
    [
      { href: "/tools/formula?preset=quadratic-root", label: "Open in the formula engine" },
      { href: "/guides/quadratic-equation-positive-root", label: "Guide: the quadratic formula" },
      { href: "/guides/solve-linear-systems", label: "Guide: linear systems" },
    ],
  ),
  reference(
    "us-inflation-rate",
    "US Inflation Rate: Latest & Historical Data",
    "See the latest available US consumer-price inflation figure, its reference year and the historical series. Press Show to reveal the values.",
    "Consumer-price inflation for the United States moves with energy, housing, food and services. This page shows the latest published annual figure, its reference year, and the historical series behind it.",
    { type: "reference", feed: "economy", params: { country: "USA", indicator: "inflation" }, blurb: "Annual consumer-price inflation for the United States." },
    [
      { heading: "How to read the figure", paragraphs: ["The headline value is an annual percentage for a stated reference year — not today's price level and not a forecast. Choose the measure, press Show, and compare the year attached to the value before quoting it."] },
      { heading: "Why the year matters", paragraphs: ["Economic statistics are published with a lag and revised afterwards. The most recent available year may trail the current calendar year, and older values can change between releases."] },
    ],
    ["Informational reference only — not economic advice.", "A single national figure does not describe any household's cost of living."],
    [
      { href: "/tools/economy?country=USA&indicator=inflation", label: "Open in the economy tool" },
      { href: "/guides/exchange-rate-reference-values", label: "Guide: reading reference values" },
      { href: "/reference/usd-to-eur", label: "Related: dollar to euro" },
    ],
  ),
  reference(
    "usd-to-eur",
    "USD to EUR: Dollar to Euro Exchange Rate",
    "Convert dollars to euros with an indicative reference rate, its date and a recent trend. Prefilled at 100 USD — press Convert.",
    "The dollar–euro rate is the world's most watched currency pair. This page converts an amount at the current reference value, shows the rate's publication date, and plots the recent trend for context.",
    { type: "reference", feed: "currency", params: { base: "USD", to: "EUR", amount: "100" }, blurb: "Indicative USD → EUR reference conversion." },
    [
      { heading: "How the conversion works", paragraphs: ["Enter an amount, confirm the pair, and press Convert. The result, the per-unit rate and the reference date appear together — the date matters as much as the number, because reference rates are published periodically."] },
      { heading: "Reference rate versus your rate", paragraphs: ["Banks, cards and exchanges add spreads and fees, so a transaction lands below the reference conversion. Use this page for context and confirm any transfer with the provider's own quote."] },
    ],
    ["A reference value is not a dealing quote.", "Trends describe the past; they do not predict future rates."],
    [
      { href: "/tools/currency?base=USD&to=EUR&amount=100", label: "Open in the currency tool" },
      { href: "/guides/exchange-rate-reference-values", label: "Guide: reference vs transaction rates" },
      { href: "/reference/us-inflation-rate", label: "Related: US inflation" },
    ],
  ),
  reference(
    "bitcoin-price",
    "Bitcoin Price (BTC): Value & Daily Change",
    "See the current Bitcoin reference price and its 24-hour movement. Values refresh in the background and appear on demand.",
    "Bitcoin trades around the clock across hundreds of venues, so any single displayed price is a reference snapshot. This page shows the price alongside its daily change and market context.",
    { type: "reference", feed: "crypto", params: { id: "bitcoin" }, blurb: "Bitcoin reference price and daily movement." },
    [
      { heading: "How to read the board", paragraphs: ["The price is shown with the percentage move over the last day and the time the figures arrived. A green day and a red day of equal size do not cancel out in percentage terms — compounding is asymmetric."] },
      { heading: "Venues differ", paragraphs: ["Displayed values aggregate across sources and update on a schedule; an exchange order book at the same second can show something slightly different. For trading, always use the venue's own live quote."] },
    ],
    ["Informational only — not investment advice.", "Digital-asset prices are volatile and can move sharply in either direction."],
    [
      { href: "/tools/crypto", label: "Open the digital-asset table" },
      { href: "/guides/exchange-rate-reference-values", label: "Guide: reading reference values" },
      { href: "/reference/usd-to-eur", label: "Related: dollar to euro" },
    ],
  ),
];

export const landingPath = (page: Pick<LandingPage, "section" | "slug">) => `/${page.section}/${page.slug}`;
export function findLanding(section: string, slug: string) {
  return LANDING_PAGES.find((page) => page.section === section && page.slug === slug);
}
export const LANDING_SECTIONS: {
  section: LandingPage["section"];
  title: string;
  heading: string;
  description: string;
  blurb: string;
}[] = [
  {
    section: "convert",
    title: "Converters",
    heading: "Unit converters for everyday measurements",
    description:
      "Convert kg to lbs, meters to feet, Celsius to Fahrenheit, liters to gallons, square feet to m² and more. Exact factors, editable inputs, results shown on confirm.",
    blurb: "Exact-definition unit conversions with every alternative shown.",
  },
  {
    section: "calculate",
    title: "Calculators",
    heading: "Online calculators for loans, tips and equations",
    description:
      "Loan payments, bill splitting, quadratic equations and more. Each calculator shows its formula and assumptions, then reveals the result when you confirm — no sign-up.",
    blurb: "Named formulas with editable values and results on confirmation.",
  },
  {
    section: "reference",
    title: "Reference values",
    heading: "Reference figures for currencies, assets and economies",
    description:
      "Currency reference values, digital-asset prices and economic indicators with their dates and context. Use them as a starting point; quote the date alongside the number.",
    blurb: "Published figures with their dates, shown on demand.",
  },
];

import { SITE } from "./site";
import { mediaAssets } from "./media/assets";
import { GUIDES, guidePath } from "./guides";
import { LANDING_PAGES, LANDING_SECTIONS } from "./landing";
import { CURRENCIES, UNIT_COUNT, UNIT_CATEGORY_COUNT, TOOL_COUNT } from "./catalog";

export type SearchPage = {
  path: string;
  title: string;
  description: string;
  kind: "home" | "tool" | "directory" | "article" | "information";
  label: string;
  formula?: string;
};

/**
 * Search-facing copy. Titles lead with the phrase people actually type — the
 * brand is a coined word nobody searches, so it stays a short suffix. Each title
 * is distinct in wording and structure (no boilerplate suffix patterns), and
 * every description is a natural-language summary in the words a visitor would
 * use, per Google's title-link and Search Essentials guidance.
 */
const BASE_PAGES: SearchPage[] = [
  {
    path: "/",
    title: "Free Online Calculator & Unit Converter",
    label: "Home",
    description: SITE.description,
    kind: "home",
    formula: "kg→lbs · mi→km · °C→°F · formulas",
  },
  {
    path: "/calculators",
    title: "All Calculators & Unit Converters",
    label: "Tools",
    description: `Browse every free calculator and converter: scientific maths, ${UNIT_COUNT} units across ${UNIT_CATEGORY_COUNT} categories, currency, digital assets and economic data. All tools are free and need no sign-up.`,
    kind: "directory",
    formula: `${TOOL_COUNT} tools · ${UNIT_COUNT} units · ${CURRENCIES.length} currencies`,
  },
  {
    path: "/tools/calculator",
    title: "Calculator: Blackboard Workspace for Thinking Through Maths",
    label: "Calculator",
    description: "A blank blackboard for working a calculation by hand: sketch, type notes in chalk, then press Calculate. Functions, history and the board stay in this browser.",
    kind: "tool",
    formula: "think · sketch · calculate",
  },
  {
    path: "/tools/scientific",
    title: "Scientific Calculator Online — Free & No Sign-Up",
    label: "Scientific calculator",
    description: "Solve trigonometry, logarithms, matrices, roots and units with named variables. Work is prepared as you type and shown when you press Calculate. Try derivatives and roots.",
    kind: "tool",
    formula: "sqrt(a² + b²) · det([1,2;3,4])",
  },
  {
    path: "/tools/units",
    title: "Unit Converter: Length, Weight, Temperature, Volume",
    label: "Unit converter",
    description: `Convert between ${UNIT_COUNT} units across ${UNIT_CATEGORY_COUNT} categories: meters to feet, kg to lbs, Celsius to Fahrenheit, liters to gallons and more. Free, precise and fast.`,
    kind: "tool",
    formula: "m ÷ 0.3048 = ft",
  },
  {
    path: "/convert",
    title: "Unit Converters: kg, m, °C, L, ft² & More",
    label: "Converters",
    description: LANDING_SECTIONS[0].description,
    kind: "directory",
    formula: "12 exact-definition converters",
  },
  {
    path: "/calculate",
    title: "Online Calculators: Loans, Tips & Equations",
    label: "Calculators",
    description: LANDING_SECTIONS[1].description,
    kind: "directory",
    formula: "3 formula calculators",
  },
  {
    path: "/reference",
    title: "Reference Figures: Currencies, Assets & Economies",
    label: "Reference",
    description: LANDING_SECTIONS[2].description,
    kind: "directory",
    formula: "rates · prices · indicators",
  },
  {
    path: "/tools/formula",
    title: "Custom Formula Calculator with Saved Expressions",
    label: "Custom formulas",
    description: "Write your own formula, define its variables and press Evaluate to reveal the result. Simplify it, estimate derivatives, and save expressions to revisit later.",
    kind: "tool",
    formula: "P(1 + r/n)^(n·t)",
  },
  {
    path: "/tools/currency",
    title: "Currency Converter — USD, EUR, GBP & More",
    label: "Currency values",
    description: "Convert an amount across 20 currencies with indicative reference values, their date and a recent trend. Useful for travel and planning; not a dealing quote.",
    kind: "tool",
    formula: "amount × reference rate",
  },
  {
    path: "/tools/crypto",
    title: "Bitcoin & Crypto Prices — Live Market Data",
    label: "Digital-asset prices",
    description: "Track Bitcoin, Ethereum and other digital assets with price, daily change and market summary. Filter the table by name or symbol, then apply the filter.",
    kind: "tool",
    formula: "price · 24h change",
  },
  {
    path: "/tools/economy",
    title: "Inflation, GDP & Population by Country",
    label: "Economic indicators",
    description: "Compare inflation, GDP per person, unemployment and population across 31 economies. Press Show to reveal the latest available figure with its reference year and history.",
    kind: "tool",
    formula: "inflation % · GDP per capita",
  },
  {
    path: "/guides",
    title: "Math & Conversion Guides with Worked Examples",
    label: "Guides",
    description: "Step-by-step guides for unit conversion, the quadratic formula, matrices, compound interest, inflation and everyday bill splitting — each linking to a ready-to-use tool.",
    kind: "directory",
    formula: "formula · method · assumptions",
  },
  {
    path: "/guides/voice-coach",
    title: "Voice Learning Paths for Every Language",
    label: "Voice learning paths",
    description: "Five-unit voice command paths for English, Spanish, French, German and Chinese: real phrases, a clear goal per unit and the tool each one opens.",
    kind: "article",
    formula: "say it · hear it · open it",
  },
  {
    path: "/about",
    title: "About Our Calculator & Conversion Tools",
    label: "About",
    description: "What the scientific calculator, unit converter and reference tools can do, how results are computed, and the limitations worth knowing before you rely on a figure.",
    kind: "information",
    formula: "what we do · how results work",
  },
  {
    path: "/contact",
    title: "Contact — Feedback, Privacy & Accessibility",
    label: "Contact",
    description: "Send feedback, report an incorrect result, or make a privacy or accessibility request. Choose a topic and include the calculation or figure involved so we can look into it.",
    kind: "information",
    formula: "we reply to every message",
  },
  {
    path: "/terms",
    title: "Terms of Service for the Calculator Tools",
    label: "Terms of Service",
    description: "The terms covering use of the calculators, conversions and reference information, how saved formulas work, and the limits of what a result can be relied on for.",
    kind: "information",
    formula: "use · results · saved formulas",
  },
  {
    path: "/privacy",
    title: "Privacy Policy for the Calculator Tools",
    label: "Privacy Policy",
    description: "Read our privacy practices and consolidated GDPR and CCPA rights, use opt-out controls, and find location-restricted regional supplements that form part of this policy.",
    kind: "information",
    formula: "GDPR · CCPA · other laws · your choices",
  },
  {
    path: "/disclaimer",
    title: "Disclaimer & Limitation of Liability",
    label: "Disclaimer",
    description: "Rounding, unit conventions, measurement uncertainty and data timing mean a calculation result is not professional advice. Read what to check before relying on a figure.",
    kind: "information",
    formula: "rounding · timing · accuracy",
  },
  {
    path: "/accessibility",
    title: "Accessibility — Keyboard, Touch & Motion",
    label: "Accessibility",
    description: "What support exists for keyboard navigation, screen readers, touch devices and reduced-motion settings, what is still limited, and how to report a barrier.",
    kind: "information",
    formula: "keyboard · touch · screen readers",
  },

];

const LANDING_KIND: Record<string, SearchPage["kind"]> = { convert: "tool", calculate: "tool", reference: "tool" };

export const SEARCH_PAGES: SearchPage[] = [
  ...BASE_PAGES,
  ...GUIDES.map((guide): SearchPage => ({ path: guidePath(guide), title: guide.title, description: guide.description, label: guide.title.split(":")[0], kind: "article", formula: guide.formula })),
  ...LANDING_PAGES.map((page): SearchPage => ({
    path: page.path,
    title: page.title,
    description: page.description,
    label: page.title.split(":")[0],
    kind: LANDING_KIND[page.section] ?? "tool",
    formula: page.formula,
  })),
  {
    path: "/do-not-sell-or-share",
    title: "Do Not Sell or Share My Personal Information",
    label: "Do Not Sell or Share My Personal Information",
    description: "Record your sale and sharing opt-out, check Global Privacy Control, and read California privacy rights. No account or identity check is needed for this browser choice.",
    kind: "information",
    formula: "your choice · no account required",
  },
];
export function findSearchPage(path: string) { return SEARCH_PAGES.find((page) => page.path === path); }
export function imageId(page: SearchPage) { return page.path === "/" ? "home" : page.path.slice(1).replaceAll("/", "--"); }
export function imagePath(page: SearchPage) {
  return mediaAssets(imageId(page))?.png ?? `/media/${imageId(page)}.png`;
}

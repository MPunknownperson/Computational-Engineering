// Single source of truth for what the site actually offers and how its data
// pipeline behaves. API routes, tool pages, marketing copy and the legal pages
// all read from here, so a published number can never drift from the code.
import { FACTORS, TEMPERATURE_UNITS, CATEGORIES } from "./units";

/** Currencies offered in the FX converter (all published by the ECB via Frankfurter). */
export const CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD", "CNY", "INR",
  "BRL", "MXN", "KRW", "SGD", "HKD", "SEK", "NOK", "DKK", "ZAR", "TRY",
] as const;

/** Economies offered in the World Bank indicator tool (ISO 3166-1 alpha-3). */
export const COUNTRIES: { value: string; label: string }[] = [
  { value: "USA", label: "United States" },
  { value: "GBR", label: "United Kingdom" },
  { value: "DEU", label: "Germany" },
  { value: "FRA", label: "France" },
  { value: "JPN", label: "Japan" },
  { value: "CHN", label: "China" },
  { value: "IND", label: "India" },
  { value: "BRA", label: "Brazil" },
  { value: "CAN", label: "Canada" },
  { value: "AUS", label: "Australia" },
  { value: "ITA", label: "Italy" },
  { value: "ESP", label: "Spain" },
  { value: "NLD", label: "Netherlands" },
  { value: "CHE", label: "Switzerland" },
  { value: "SWE", label: "Sweden" },
  { value: "POL", label: "Poland" },
  { value: "TUR", label: "Türkiye" },
  { value: "KOR", label: "Korea, Rep." },
  { value: "IDN", label: "Indonesia" },
  { value: "MEX", label: "Mexico" },
  { value: "ARG", label: "Argentina" },
  { value: "ZAF", label: "South Africa" },
  { value: "NGA", label: "Nigeria" },
  { value: "EGY", label: "Egypt" },
  { value: "SAU", label: "Saudi Arabia" },
  { value: "ARE", label: "United Arab Emirates" },
  { value: "SGP", label: "Singapore" },
  { value: "VNM", label: "Viet Nam" },
  { value: "PHL", label: "Philippines" },
  { value: "NZL", label: "New Zealand" },
];

/** World Bank indicators exposed by /api/economy. */
export const INDICATORS = [
  { value: "inflation", label: "Inflation", name: "Inflation, consumer prices (annual %)", code: "FP.CPI.TOTL.ZG" },
  { value: "gdp_per_capita", label: "GDP / capita", name: "GDP per capita (current US$)", code: "NY.GDP.PCAP.CD" },
  { value: "unemployment", label: "Unemployment", name: "Unemployment, total (% of labour force, modelled ILO estimate)", code: "SL.UEM.TOTL.ZS" },
  { value: "population", label: "Population", name: "Population, total", code: "SP.POP.TOTL" },
] as const;

/** Coins requested from CoinGecko by default. */
export const CRYPTO_IDS = [
  "bitcoin", "ethereum", "tether", "binancecoin", "solana",
  "ripple", "cardano", "dogecoin", "polkadot", "chainlink",
] as const;

export const UNIT_CATEGORY_COUNT = Object.keys(CATEGORIES).length;
export const UNIT_COUNT =
  Object.values(FACTORS).reduce((n, table) => n + Object.keys(table).length, 0) +
  Object.keys(TEMPERATURE_UNITS).length;

/**
 * Refresh and cache timings. `*Client` values are how often an open page asks
 * our server again; `*Cache` values are how long our server reuses an upstream
 * response. Route-segment `revalidate` exports must be literals, so keep them
 * in sync with these numbers (they are referenced in comments there).
 */
export const TIMING = {
  fxClientSeconds: 60,
  fxCacheSeconds: 300,
  fxSeriesCacheSeconds: 3600,
  fxSeriesDays: 30,
  cryptoClientSeconds: 30,
  cryptoCacheSeconds: 60,
  tickerClientSeconds: 45,
  economyCacheSeconds: 3600,
  economyYears: 12,
} as const;

/** Server-side limits on what the formula engine stores. */
export const FORMULA_LIMITS = {
  name: 100,
  description: 500,
  tags: 200,
  expression: 2000,
  listed: 50,
} as const;

/** Server-side limits on contact messages. */
export const CONTACT_LIMITS = {
  name: 100,
  email: 200,
  message: 4000,
  minMessage: 10,
  perIpPerHour: 5,
} as const;

/** Topics offered by the contact form. */
export const CONTACT_TOPICS = [
  { value: "general", label: "General feedback" },
  { value: "bug", label: "Something looks wrong" },
  { value: "data", label: "A number or data feed" },
  { value: "privacy", label: "Privacy or my saved formulas" },
  { value: "accessibility", label: "Accessibility" },
  { value: "legal", label: "Legal notice" },
] as const;

export const TOOL_COUNT = 6;
export const SOURCE_COUNT = 3;

export function minutes(seconds: number) {
  if (seconds < 60) return `${seconds} seconds`;
  const m = Math.round(seconds / 60);
  return m === 60 ? "1 hour" : `${m} minute${m === 1 ? "" : "s"}`;
}

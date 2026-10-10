// Single source of truth for what the site actually offers and how its data
// pipeline behaves. API routes, tool pages, marketing copy and the legal pages
// all read from here, so a published number can never drift from the code.
import { FACTORS, TEMPERATURE_UNITS, CATEGORIES } from "./units";

/** Currencies offered in the FX converter — every currency the ECB publishes via Frankfurter. */
export const CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD", "CNY", "INR",
  "BRL", "MXN", "KRW", "SGD", "HKD", "SEK", "NOK", "DKK", "ZAR", "TRY",
  "PLN", "CZK", "HUF", "RON", "ISK", "ILS", "IDR", "MYR", "PHP", "THB",
] as const;

export type Currency = (typeof CURRENCIES)[number];

/** Display names and region grouping for the currency tool and voice packs. */
export const CURRENCY_INFO: Record<Currency, { name: string; region: "Americas" | "Europe" | "Asia-Pacific" | "Middle East & Africa" }> = {
  USD: { name: "US dollar", region: "Americas" }, CAD: { name: "Canadian dollar", region: "Americas" },
  MXN: { name: "Mexican peso", region: "Americas" }, BRL: { name: "Brazilian real", region: "Americas" },
  EUR: { name: "Euro", region: "Europe" }, GBP: { name: "British pound", region: "Europe" }, CHF: { name: "Swiss franc", region: "Europe" },
  SEK: { name: "Swedish krona", region: "Europe" }, NOK: { name: "Norwegian krone", region: "Europe" }, DKK: { name: "Danish krone", region: "Europe" },
  PLN: { name: "Polish złoty", region: "Europe" }, CZK: { name: "Czech koruna", region: "Europe" }, HUF: { name: "Hungarian forint", region: "Europe" },
  RON: { name: "Romanian leu", region: "Europe" }, ISK: { name: "Icelandic króna", region: "Europe" }, TRY: { name: "Turkish lira", region: "Europe" },
  JPY: { name: "Japanese yen", region: "Asia-Pacific" }, CNY: { name: "Chinese yuan", region: "Asia-Pacific" }, INR: { name: "Indian rupee", region: "Asia-Pacific" },
  KRW: { name: "South Korean won", region: "Asia-Pacific" }, SGD: { name: "Singapore dollar", region: "Asia-Pacific" }, HKD: { name: "Hong Kong dollar", region: "Asia-Pacific" },
  AUD: { name: "Australian dollar", region: "Asia-Pacific" }, NZD: { name: "New Zealand dollar", region: "Asia-Pacific" }, IDR: { name: "Indonesian rupiah", region: "Asia-Pacific" },
  MYR: { name: "Malaysian ringgit", region: "Asia-Pacific" }, PHP: { name: "Philippine peso", region: "Asia-Pacific" }, THB: { name: "Thai baht", region: "Asia-Pacific" },
  ILS: { name: "Israeli new shekel", region: "Middle East & Africa" }, ZAR: { name: "South African rand", region: "Middle East & Africa" },
};

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

/** World Bank indicators exposed by /api/economy, grouped by theme for the tool's selector. */
export const INDICATORS = [
  { value: "inflation", label: "Inflation", group: "Prices", name: "Inflation, consumer prices (annual %)", code: "FP.CPI.TOTL.ZG", unit: "%" },
  { value: "gdp_per_capita", label: "GDP / capita", group: "Output", name: "GDP per capita (current US$)", code: "NY.GDP.PCAP.CD", unit: "US$" },
  { value: "gdp_growth", label: "GDP growth", group: "Output", name: "GDP growth (annual %)", code: "NY.GDP.MKTP.KD.ZG", unit: "%" },
  { value: "unemployment", label: "Unemployment", group: "Labour", name: "Unemployment, total (% of labour force, modelled ILO estimate)", code: "SL.UEM.TOTL.ZS", unit: "%" },
  { value: "population", label: "Population", group: "People", name: "Population, total", code: "SP.POP.TOTL", unit: "" },
  { value: "lending_rate", label: "Lending rate", group: "Money", name: "Lending interest rate (%)", code: "FR.INR.LEND", unit: "%" },
  { value: "government_debt", label: "Gov. debt", group: "Public finance", name: "Central government debt, total (% of GDP)", code: "GC.DOD.TOTL.GD.ZS", unit: "% GDP" },
  { value: "current_account", label: "Current account", group: "Trade", name: "Current account balance (% of GDP)", code: "BN.CAB.XOKA.GD.ZS", unit: "% GDP" },
] as const;

export type IndicatorKey = (typeof INDICATORS)[number]["value"];
export const INDICATOR_GROUPS = Array.from(new Set(INDICATORS.map((i) => i.group)));

/** Coins requested from CoinGecko by default, with a category used for filtering. */
export const CRYPTO_IDS = [
  "bitcoin", "ethereum", "tether", "binancecoin", "solana",
  "ripple", "usd-coin", "cardano", "dogecoin", "tron",
  "avalanche-2", "polkadot", "chainlink", "polygon-ecosystem-token", "litecoin",
  "bitcoin-cash", "stellar", "uniswap", "monero", "cosmos",
] as const;

export type CryptoCategory = "Layer 1" | "Stablecoin" | "Smart-contract platform" | "Payments" | "DeFi" | "Oracle" | "Privacy";
export const CRYPTO_CATEGORY: Record<(typeof CRYPTO_IDS)[number], CryptoCategory> = {
  bitcoin: "Layer 1", ethereum: "Smart-contract platform", tether: "Stablecoin", binancecoin: "Smart-contract platform",
  solana: "Smart-contract platform", ripple: "Payments", "usd-coin": "Stablecoin", cardano: "Smart-contract platform",
  dogecoin: "Payments", tron: "Smart-contract platform", "avalanche-2": "Smart-contract platform", polkadot: "Layer 1",
  chainlink: "Oracle", "polygon-ecosystem-token": "Layer 1", litecoin: "Payments", "bitcoin-cash": "Payments",
  stellar: "Payments", uniswap: "DeFi", monero: "Privacy", cosmos: "Layer 1",
};

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

export const TOOL_COUNT = 7;
export const SOURCE_COUNT = 3;

export function minutes(seconds: number) {
  if (seconds < 60) return `${seconds} seconds`;
  const m = Math.round(seconds / 60);
  return m === 60 ? "1 hour" : `${m} minute${m === 1 ? "" : "s"}`;
}

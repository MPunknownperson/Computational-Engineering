/**
 * Market-data provider adapters. Each returns the same normalised shape so
 * the service layer can fail over between them transparently. A deterministic
 * seed provider is the final fallback: it is clearly labelled `seed` and is
 * never persisted as live data.
 */
import { CRYPTO_IDS } from "@/lib/catalog";
import { AppError } from "@/lib/core/errors";
import { fetchJson } from "@/lib/core/resilience";
import { prng } from "./engine";

export type MarketAsset = {
  id: string; symbol: string; name: string; rank: number | null;
  price: number; change24h: number | null; change7d: number | null;
  marketCap: number | null; volume24h: number | null; high24h: number | null; low24h: number | null;
  ath: number | null; athChangePct: number | null; circulatingSupply: number | null;
  sparkline7d: number[] | null; lastUpdated: string | null;
};

export type HistorySeries = { points: Array<[number, number]>; volumes: Array<[number, number]>; source: string; fetchedAt: number };

export const ASSET_META: Record<string, { symbol: string; name: string; base: number; vol: number }> = {
  bitcoin: { symbol: "btc", name: "Bitcoin", base: 67_450, vol: 0.55 },
  ethereum: { symbol: "eth", name: "Ethereum", base: 3_420, vol: 0.7 },
  tether: { symbol: "usdt", name: "Tether", base: 1.0, vol: 0.004 },
  binancecoin: { symbol: "bnb", name: "BNB", base: 592, vol: 0.65 },
  solana: { symbol: "sol", name: "Solana", base: 152, vol: 0.95 },
  ripple: { symbol: "xrp", name: "XRP", base: 0.58, vol: 0.8 },
  "usd-coin": { symbol: "usdc", name: "USDC", base: 1.0, vol: 0.003 },
  cardano: { symbol: "ada", name: "Cardano", base: 0.46, vol: 0.85 },
  dogecoin: { symbol: "doge", name: "Dogecoin", base: 0.145, vol: 1.1 },
  tron: { symbol: "trx", name: "TRON", base: 0.12, vol: 0.5 },
  "avalanche-2": { symbol: "avax", name: "Avalanche", base: 34, vol: 0.95 },
  polkadot: { symbol: "dot", name: "Polkadot", base: 6.8, vol: 0.85 },
  chainlink: { symbol: "link", name: "Chainlink", base: 14.6, vol: 0.9 },
  "polygon-ecosystem-token": { symbol: "pol", name: "POL (ex-MATIC)", base: 0.62, vol: 0.9 },
  litecoin: { symbol: "ltc", name: "Litecoin", base: 82, vol: 0.7 },
  "bitcoin-cash": { symbol: "bch", name: "Bitcoin Cash", base: 445, vol: 0.85 },
  stellar: { symbol: "xlm", name: "Stellar", base: 0.11, vol: 0.8 },
  uniswap: { symbol: "uni", name: "Uniswap", base: 9.4, vol: 0.95 },
  monero: { symbol: "xmr", name: "Monero", base: 158, vol: 0.6 },
  cosmos: { symbol: "atom", name: "Cosmos Hub", base: 8.2, vol: 0.85 },
};

export const SUPPORTED_VS = ["usd", "eur", "gbp", "jpy", "chf", "cad", "aud", "btc", "eth"] as const;
export type VsCurrency = (typeof SUPPORTED_VS)[number];
export function isVs(value: string): value is VsCurrency { return (SUPPORTED_VS as readonly string[]).includes(value); }
export function isAssetId(value: string): boolean { return value in ASSET_META; }

/* ------------------------------ CoinGecko ----------------------------- */

type GeckoMarket = { id: string; symbol: string; name: string; market_cap_rank: number | null; current_price: number; price_change_percentage_24h: number | null; price_change_percentage_7d_in_currency?: number | null; market_cap: number | null; total_volume: number | null; high_24h: number | null; low_24h: number | null; ath: number | null; ath_change_percentage: number | null; circulating_supply: number | null; sparkline_in_7d?: { price: number[] } | null; last_updated: string | null };

export async function coingeckoMarkets(vs: string, timeoutMs: number): Promise<MarketAsset[]> {
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${encodeURIComponent(vs)}&ids=${encodeURIComponent(CRYPTO_IDS.join(","))}&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h%2C7d&precision=full`;
  const data = await fetchJson<GeckoMarket[]>(url, { timeoutMs, label: "coingecko" });
  if (!Array.isArray(data) || data.length === 0) throw new AppError("malformed_payload", "coingecko returned an empty market list");
  return data.map((row) => ({
    id: row.id, symbol: row.symbol, name: row.name, rank: row.market_cap_rank,
    price: Number(row.current_price), change24h: row.price_change_percentage_24h ?? null, change7d: row.price_change_percentage_7d_in_currency ?? null,
    marketCap: row.market_cap ?? null, volume24h: row.total_volume ?? null, high24h: row.high_24h ?? null, low24h: row.low_24h ?? null,
    ath: row.ath ?? null, athChangePct: row.ath_change_percentage ?? null, circulatingSupply: row.circulating_supply ?? null,
    sparkline7d: row.sparkline_in_7d?.price?.length ? downsample(row.sparkline_in_7d.price, 56) : null, lastUpdated: row.last_updated,
  })).filter((asset) => Number.isFinite(asset.price) && asset.price > 0);
}

export async function coingeckoHistory(id: string, vs: string, days: number, timeoutMs: number): Promise<HistorySeries> {
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=${encodeURIComponent(vs)}&days=${days}&precision=full`;
  const data = await fetchJson<{ prices?: Array<[number, number]>; total_volumes?: Array<[number, number]> }>(url, { timeoutMs, label: "coingecko" });
  if (!Array.isArray(data.prices) || data.prices.length < 5) throw new AppError("malformed_payload", "coingecko returned no price history");
  return { points: data.prices.map(([t, p]) => [t, Number(p)] as [number, number]).filter(([, p]) => Number.isFinite(p) && p > 0), volumes: (data.total_volumes ?? []).map(([t, v]) => [t, Number(v)] as [number, number]), source: "coingecko", fetchedAt: Date.now() };
}

/* ------------------------------ Coinbase ------------------------------ */

/** Coinbase publishes spot exchange rates for every asset against one base currency. */
export async function coinbaseMarkets(vs: string, timeoutMs: number, previous?: Map<string, MarketAsset>): Promise<MarketAsset[]> {
  const data = await fetchJson<{ data?: { rates?: Record<string, string> } }>(`https://api.coinbase.com/v2/exchange-rates?currency=${encodeURIComponent(vs.toUpperCase())}`, { timeoutMs, label: "coinbase" });
  const rates = data.data?.rates;
  if (!rates) throw new AppError("malformed_payload", "coinbase returned no rates");
  const out: MarketAsset[] = [];
  for (const id of CRYPTO_IDS) {
    const meta = ASSET_META[id];
    const raw = rates[meta.symbol.toUpperCase()];
    const rate = raw ? Number(raw) : NaN;
    if (!Number.isFinite(rate) || rate <= 0) continue;
    const price = 1 / rate;
    const prev = previous?.get(id);
    out.push({ id, symbol: meta.symbol, name: prev?.name ?? meta.name, rank: prev?.rank ?? null, price, change24h: prev ? ((price - prev.price) / prev.price) * 100 + (prev.change24h ?? 0) : null, change7d: prev?.change7d ?? null, marketCap: prev?.marketCap ?? null, volume24h: prev?.volume24h ?? null, high24h: prev ? Math.max(prev.high24h ?? price, price) : null, low24h: prev ? Math.min(prev.low24h ?? price, price) : null, ath: prev?.ath ?? null, athChangePct: prev?.athChangePct ?? null, circulatingSupply: prev?.circulatingSupply ?? null, sparkline7d: prev?.sparkline7d ?? null, lastUpdated: new Date().toISOString() });
  }
  if (out.length < 5) throw new AppError("malformed_payload", "coinbase returned too few assets");
  return out;
}

/* -------------------------------- Seed -------------------------------- */

const FX_SEED: Record<string, number> = { usd: 1, eur: 0.92, gbp: 0.79, jpy: 151.2, chf: 0.88, cad: 1.36, aud: 1.51 };

function seedFactor(vs: string): number {
  if (vs === "btc") return 1 / ASSET_META.bitcoin.base;
  if (vs === "eth") return 1 / ASSET_META.ethereum.base;
  return FX_SEED[vs] ?? 1;
}

/** Deterministic GBM-style path anchored so that the last point equals `base`. */
export function seedHistory(id: string, vs: string, days: number): HistorySeries {
  const meta = ASSET_META[id] ?? { symbol: id, name: id, base: 1, vol: 0.8 };
  const perDay = days <= 1 ? 288 : days <= 90 ? 24 : 1;
  const count = Math.max(30, Math.round(days * perDay));
  const stepMs = (days * 86_400_000) / count;
  const rand = prng(hashSeed(`${id}:${days}`));
  const sigma = meta.vol / Math.sqrt(365 * perDay);
  const path: number[] = [1];
  for (let i = 1; i < count; i++) {
    let u = 0, v = 0; while (u === 0) u = rand(); while (v === 0) v = rand();
    const g = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    path.push(path[i - 1] * Math.exp(-0.5 * sigma * sigma + sigma * g + 0.00002));
  }
  const scale = (meta.base * seedFactor(vs)) / path[path.length - 1];
  const now = Date.now();
  const points = path.map((p, i) => [Math.round(now - (count - 1 - i) * stepMs), p * scale] as [number, number]);
  const volumes = points.map(([t, p], i) => [t, p * (meta.base > 100 ? 2_000 : 50_000_000) * (0.6 + 0.8 * Math.abs(Math.sin(i / 7)))] as [number, number]);
  return { points, volumes, source: "seed", fetchedAt: now };
}

export function seedMarkets(vs: string): MarketAsset[] {
  const factor = seedFactor(vs);
  return CRYPTO_IDS.map((id, index) => {
    const meta = ASSET_META[id];
    const series = seedHistory(id, vs, 7).points;
    const prices = series.map(([, p]) => p);
    const price = prices[prices.length - 1];
    const dayAgo = prices[Math.max(0, prices.length - 25)];
    const weekAgo = prices[0];
    const supply = meta.base > 1000 ? 19_700_000 : meta.base > 100 ? 120_000_000 : meta.base > 1 ? 1_500_000_000 : 45_000_000_000;
    return { id, symbol: meta.symbol, name: meta.name, rank: index + 1, price, change24h: ((price - dayAgo) / dayAgo) * 100, change7d: ((price - weekAgo) / weekAgo) * 100, marketCap: price * supply, volume24h: price * supply * 0.04, high24h: Math.max(...prices.slice(-25)), low24h: Math.min(...prices.slice(-25)), ath: price * (meta.vol < 0.01 ? 1.01 : 1.6), athChangePct: meta.vol < 0.01 ? -1 : -37.5, circulatingSupply: supply, sparkline7d: downsample(prices, 56), lastUpdated: new Date().toISOString() } as MarketAsset;
  }).map((a) => ({ ...a, marketCap: a.marketCap !== null ? a.marketCap * (factor === 1 ? 1 : 1) : null }));
}

export function downsample(values: number[], target: number): number[] {
  if (values.length <= target) return values;
  const step = values.length / target;
  const out: number[] = [];
  for (let i = 0; i < target; i++) out.push(values[Math.min(values.length - 1, Math.floor(i * step))]);
  out[out.length - 1] = values[values.length - 1];
  return out;
}

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

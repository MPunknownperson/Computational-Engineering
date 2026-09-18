/**
 * Live data layer.
 *
 * Everything the site fetches from the public internet goes through this file:
 * one hardened `fetchJson` (timeout, retry with backoff, abort propagation,
 * schema validation) plus a small stale-while-revalidate memory cache so a
 * route change never refires a request that is still warm.
 *
 * Browser compatibility notes:
 *  - `AbortSignal.timeout` and `AbortSignal.any` are recent additions, so they
 *    are feature-detected and emulated with plain `AbortController` timers.
 *  - No `structuredClone`, `Array.prototype.at`, `Object.groupBy` or other
 *    late-2023 syntax is used in the parsing helpers.
 */

export interface Cached<T> { value: T; fetchedAt: number }

const memory = new Map<string, Cached<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export class LiveDataError extends Error {
  readonly source: string;
  readonly status?: number;
  constructor(source: string, message: string, status?: number) {
    super(message);
    this.name = 'LiveDataError';
    this.source = source;
    this.status = status;
  }
}

/** Combines an external signal with an internal timeout without AbortSignal.any. */
function withTimeout(signal: AbortSignal | undefined, ms: number) {
  const controller = new AbortController();
  let settled = false;
  const timer = setTimeout(() => { if (!settled) controller.abort(new DOMException('Timeout', 'TimeoutError')); }, ms);
  const forward = () => { if (!settled) controller.abort(signal?.reason); };
  if (signal) {
    if (signal.aborted) forward();
    else signal.addEventListener('abort', forward, { once: true });
  }
  const done = () => {
    settled = true;
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', forward);
  };
  return { signal: controller.signal, done };
}

const sleep = (ms: number) => new Promise<void>(resolve => { setTimeout(resolve, ms); });

export interface FetchOptions {
  source: string;
  signal?: AbortSignal;
  timeout?: number;
  retries?: number;
}

export async function fetchJson<T>(url: string, options: FetchOptions): Promise<T> {
  const { source, signal, timeout = 9000, retries = 2 } = options;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (signal?.aborted) throw signal.reason instanceof Error ? signal.reason : new DOMException('Aborted', 'AbortError');
    const guard = withTimeout(signal, timeout);
    try {
      const response = await fetch(url, {
        signal: guard.signal,
        headers: { Accept: 'application/json' },
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
      });
      if (!response.ok) throw new LiveDataError(source, `${source} responded with HTTP ${response.status}.`, response.status);
      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      // A caller-initiated abort must never be retried or swallowed.
      if (signal?.aborted) throw error;
      const retryable = !(error instanceof LiveDataError) || (error.status !== undefined && error.status >= 500) || error.status === 429;
      if (attempt === retries || !retryable) break;
      await sleep(400 * Math.pow(2, attempt));
    } finally {
      guard.done();
    }
  }
  if (lastError instanceof LiveDataError) throw lastError;
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  throw new LiveDataError(source, offline ? 'You appear to be offline. Reconnect to refresh live data.' : `${source} could not be reached. It may be rate limiting or temporarily down.`);
}

/** Stale-while-revalidate cache: returns cached data instantly, refreshes behind it. */
export async function cachedJson<T>(key: string, ttl: number, loader: () => Promise<T>): Promise<T> {
  const hit = memory.get(key) as Cached<T> | undefined;
  if (hit && Date.now() - hit.fetchedAt < ttl) return hit.value;
  const running = inflight.get(key) as Promise<T> | undefined;
  if (running) return running;
  const task = loader()
    .then(value => { memory.set(key, { value, fetchedAt: Date.now() }); return value; })
    .catch(error => { if (hit) return hit.value; throw error; })
    .finally(() => { inflight.delete(key); });
  inflight.set(key, task);
  return task;
}

export function cacheAge(key: string): number | null {
  const hit = memory.get(key);
  return hit ? Date.now() - hit.fetchedAt : null;
}

export function clearLiveCache() { memory.clear(); }

/* ------------------------------------------------------------------ */
/* Sources                                                             */
/* ------------------------------------------------------------------ */

export interface LiveSource { id: string; label: string; host: string; docs: string; purpose: string }

export const liveSources: LiveSource[] = [
  { id: 'ecb', label: 'ECB reference rates (Frankfurter)', host: 'api.frankfurter.dev', docs: 'https://frankfurter.dev/', purpose: 'Daily foreign-exchange reference rates and historical series.' },
  { id: 'coingecko', label: 'CoinGecko public API', host: 'api.coingecko.com', docs: 'https://www.coingecko.com/en/api', purpose: 'Digital-asset spot prices and 24-hour movement.' },
  { id: 'worldbank', label: 'World Bank Open Data', host: 'api.worldbank.org', docs: 'https://datahelpdesk.worldbank.org/knowledgebase/topics/125589', purpose: 'Inflation, GDP per capita and population indicators by country.' },
];

/* ---- Foreign exchange ------------------------------------------- */

export interface FxSnapshot { base: string; date: string; rates: Record<string, number> }

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export async function fetchFx(base: string, symbols: string[], signal?: AbortSignal): Promise<FxSnapshot> {
  const key = `fx:${base}:${symbols.join(',')}`;
  return cachedJson(key, 60000, async () => {
    const url = `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(symbols.join(','))}`;
    const payload = await fetchJson<{ base?: string; date?: string; rates?: Record<string, unknown> }>(url, { source: 'Frankfurter (ECB)', signal });
    if (!payload || typeof payload !== 'object' || !payload.rates || typeof payload.date !== 'string') {
      throw new LiveDataError('Frankfurter (ECB)', 'The exchange-rate response was not in the expected shape.');
    }
    const rates: Record<string, number> = {};
    for (const code of Object.keys(payload.rates)) {
      const value = payload.rates[code];
      if (isFiniteNumber(value) && value > 0) rates[code] = value;
    }
    if (Object.keys(rates).length === 0) throw new LiveDataError('Frankfurter (ECB)', 'No usable rates were returned for this base currency.');
    return { base: payload.base || base, date: payload.date, rates };
  });
}

export interface SeriesPoint { date: string; value: number }

export async function fetchFxSeries(base: string, symbol: string, days = 30, signal?: AbortSignal): Promise<SeriesPoint[]> {
  const start = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const key = `fxseries:${base}:${symbol}:${start}`;
  return cachedJson(key, 900000, async () => {
    const url = `https://api.frankfurter.dev/v1/${start}..?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(symbol)}`;
    const payload = await fetchJson<{ rates?: Record<string, Record<string, unknown>> }>(url, { source: 'Frankfurter (ECB)', signal });
    const table = payload && payload.rates ? payload.rates : {};
    const points: SeriesPoint[] = [];
    const dates = Object.keys(table).sort();
    for (const date of dates) {
      const value = table[date] ? table[date][symbol] : undefined;
      if (isFiniteNumber(value)) points.push({ date, value });
    }
    if (points.length < 2) throw new LiveDataError('Frankfurter (ECB)', 'Not enough history was returned to draw a series.');
    return points;
  });
}

/* ---- Digital assets --------------------------------------------- */

export interface AssetQuote { id: string; symbol: string; name: string; price: number; change24h: number }

const assetMeta: { id: string; symbol: string; name: string }[] = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
];

export async function fetchAssets(vs = 'usd', signal?: AbortSignal): Promise<AssetQuote[]> {
  const ids = assetMeta.map(item => item.id).join(',');
  return cachedJson(`assets:${vs}`, 60000, async () => {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${encodeURIComponent(vs)}&include_24hr_change=true`;
    const payload = await fetchJson<Record<string, Record<string, unknown>>>(url, { source: 'CoinGecko', signal, timeout: 11000 });
    const quotes: AssetQuote[] = [];
    for (const meta of assetMeta) {
      const row = payload ? payload[meta.id] : undefined;
      const price = row ? row[vs] : undefined;
      const change = row ? row[`${vs}_24h_change`] : undefined;
      if (isFiniteNumber(price)) {
        quotes.push({ id: meta.id, symbol: meta.symbol, name: meta.name, price, change24h: isFiniteNumber(change) ? change : 0 });
      }
    }
    if (!quotes.length) throw new LiveDataError('CoinGecko', 'No digital-asset quotes were returned.');
    return quotes;
  });
}

/* ---- World Bank indicators --------------------------------------- */

export interface IndicatorPoint { year: string; value: number }
export interface IndicatorSeries { country: string; indicator: string; unit: string; points: IndicatorPoint[] }

export const indicators = [
  { id: 'FP.CPI.TOTL.ZG', label: 'Inflation, consumer prices', unit: '% per year' },
  { id: 'NY.GDP.PCAP.CD', label: 'GDP per capita', unit: 'current US$' },
  { id: 'SL.UEM.TOTL.ZS', label: 'Unemployment rate', unit: '% of labour force' },
  { id: 'SP.POP.TOTL', label: 'Population', unit: 'people' },
] as const;

export type IndicatorId = (typeof indicators)[number]['id'];

export async function fetchIndicator(country: string, indicator: IndicatorId, signal?: AbortSignal): Promise<IndicatorSeries> {
  const key = `wb:${country}:${indicator}`;
  return cachedJson(key, 3600000, async () => {
    const url = `https://api.worldbank.org/v2/country/${encodeURIComponent(country)}/indicator/${encodeURIComponent(indicator)}?format=json&per_page=60`;
    const payload = await fetchJson<unknown>(url, { source: 'World Bank', signal, timeout: 12000 });
    if (!Array.isArray(payload) || payload.length < 2 || !Array.isArray(payload[1])) {
      throw new LiveDataError('World Bank', 'No observations are published for this country and indicator.');
    }
    const rows = payload[1] as Array<Record<string, unknown>>;
    const points: IndicatorPoint[] = [];
    let countryName = country;
    for (const row of rows) {
      const countryField = row.country as { value?: string } | undefined;
      if (countryField && typeof countryField.value === 'string') countryName = countryField.value;
      if (isFiniteNumber(row.value) && typeof row.date === 'string') points.push({ year: row.date, value: row.value });
    }
    points.sort((a, b) => a.year.localeCompare(b.year));
    if (!points.length) throw new LiveDataError('World Bank', 'The indicator exists but has no numeric observations.');
    const meta = indicators.find(item => item.id === indicator);
    return { country: countryName, indicator: meta ? meta.label : indicator, unit: meta ? meta.unit : '', points };
  });
}

/* ---- Helpers used by the views ----------------------------------- */

export function formatMoney(value: number, currency = 'USD', maximumFractionDigits = 2) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits }).format(value);
  } catch {
    return `${value.toFixed(maximumFractionDigits)} ${currency}`;
  }
}

export function formatCompact(value: number) {
  try {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  } catch {
    return String(Math.round(value));
  }
}

export function relativeTime(timestamp: number) {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} d ago`;
}

/** Builds an SVG path for a sparkline without any charting dependency. */
export function sparklinePath(values: number[], width = 160, height = 44, padding = 3) {
  if (values.length < 2) return '';
  let min = values[0];
  let max = values[0];
  for (const value of values) { if (value < min) min = value; if (value > max) max = value; }
  const span = max - min || 1;
  const stepX = (width - padding * 2) / (values.length - 1);
  let path = '';
  for (let index = 0; index < values.length; index += 1) {
    const x = padding + index * stepX;
    const y = height - padding - ((values[index] - min) / span) * (height - padding * 2);
    path += `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return path;
}

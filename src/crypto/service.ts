import "server-only";
/**
 * Crypto engine service layer.
 *
 *  getMarkets()      cache → provider chain (primary/secondary) → DB snapshot → seed
 *  getHistory()      cache → CoinGecko → DB history cache → DB snapshots → seed
 *  getAnalysis()     history + live quote → full analytical report (engine.ts)
 *  getCorrelation()  aligned log-return correlation across assets
 *  ensureAutoUpdater()  self-scheduling refresh loop + alert evaluation
 *  engineStatus()    freshness, providers, breakers, caches, scheduler
 *
 * Every upstream call is bounded by a timeout, retried with jitter and guarded
 * by a per-provider circuit breaker. Failures feed the remediation engine,
 * which may swap the primary provider or slow the scheduler at runtime.
 */
import { store } from "@/lib/store";
import { CRYPTO_IDS } from "@/lib/catalog";
import { AppError, classifyError } from "@/lib/core/errors";
import { FastCache } from "@/lib/core/fast-cache";
import { allBreakers, breaker, fallbackChain, retry, type ProviderAttempt } from "@/lib/core/resilience";
import { captureAndRemediate, registerRemediationHooks } from "@/lib/remediation/engine";
import { getRuntime, loadRuntimePatches } from "@/lib/remediation/runtime-config";
import { annualisedVolatility, bollinger, compositeSignal, ema, historicalVaR, linearRegression, logReturns, macd, maxDrawdown, mean, monteCarloGBM, parametricVaR, rsi, sharpe, simpleReturns, sma, sortino, stddev, supportResistance, zScore, correlationMatrix, beta, kahanSum } from "./engine";
import { ASSET_META, coinbaseMarkets, coingeckoHistory, coingeckoMarkets, downsample, seedHistory, seedMarkets, type HistorySeries, type MarketAsset } from "./providers";

export type MarketsResult = { vs: string; items: MarketAsset[]; source: string; fetchedAt: number; age: number; state: "fresh" | "stale" | "miss"; attempts: ProviderAttempt[]; live: boolean };

const marketsCache = FastCache.named<Omit<MarketsResult, "age" | "state">>("crypto:markets", 32);
const historyCache = FastCache.named<HistorySeries>("crypto:history", 400);
const analysisCache = FastCache.named<AnalysisReport>("crypto:analysis", 200);
const correlationCache = FastCache.named<CorrelationReport>("crypto:correlation", 16);

type SchedulerState = { timer: ReturnType<typeof setTimeout> | null; ticks: number; lastTickAt: number | null; lastDurationMs: number; lastError: string | null; lastSource: string | null; alertsTriggered: number; lastPersistAt: number; startedAt: number };
const globalForScheduler = globalThis as typeof globalThis & { __radixCryptoScheduler?: SchedulerState };
const scheduler: SchedulerState = globalForScheduler.__radixCryptoScheduler ?? { timer: null, ticks: 0, lastTickAt: null, lastDurationMs: 0, lastError: null, lastSource: null, alertsTriggered: 0, lastPersistAt: 0, startedAt: Date.now() };
globalForScheduler.__radixCryptoScheduler = scheduler;

/* ------------------------------- markets ------------------------------ */

async function lastSnapshotMap(vs: string): Promise<Map<string, MarketAsset> | null> {
  try {
    const rows = store.cryptoSnapshots
      .list((row) => row.vs === vs && row.source !== "seed")
      .sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());
    if (!rows.length) return null;
    const map = new Map<string, MarketAsset>();
    for (const r of rows) {
      // Later rows overwrite earlier ones, leaving the newest per asset.
      map.set(r.assetId, { id: r.assetId, symbol: r.symbol, name: r.name, rank: r.rank, price: Number(r.price), change24h: r.change24h, change7d: r.change7d, marketCap: r.marketCap === null ? null : Number(r.marketCap), volume24h: r.volume24h === null ? null : Number(r.volume24h), high24h: r.high24h === null ? null : Number(r.high24h), low24h: r.low24h === null ? null : Number(r.low24h), ath: null, athChangePct: null, circulatingSupply: null, sparkline7d: null, lastUpdated: r.capturedAt.toISOString() });
    }
    return map;
  } catch {
    return null;
  }
}

async function persistSnapshots(vs: string, items: MarketAsset[], source: string): Promise<void> {
  if (!getRuntime("crypto.persistSnapshots") || source === "seed" || source === "snapshot") return;
  if (Date.now() - scheduler.lastPersistAt < 50_000) return; // at most ~once a minute
  scheduler.lastPersistAt = Date.now();
  try {
    const capturedAt = new Date();
    store.cryptoSnapshots.insertMany(items.map((a) => ({ id: store.cryptoSnapshots.nextSequence(), assetId: a.id, symbol: a.symbol, name: a.name, vs, price: a.price.toString(), change24h: a.change24h, change7d: a.change7d, marketCap: a.marketCap?.toString() ?? null, volume24h: a.volume24h?.toString() ?? null, high24h: a.high24h?.toString() ?? null, low24h: a.low24h?.toString() ?? null, rank: a.rank, source, capturedAt })));
    // Keep ~14 days of snapshots.
    if (scheduler.ticks % 40 === 0) {
      const cutoff = Date.now() - 14 * 86_400_000;
      store.cryptoSnapshots.remove((row) => row.capturedAt.getTime() < cutoff);
    }
  } catch (error) {
    void captureAndRemediate({ origin: "server", error, route: "crypto.persistSnapshots" });
  }
}

async function fetchMarketsLive(vs: string): Promise<{ items: MarketAsset[]; source: string; attempts: ProviderAttempt[] }> {
  const timeoutMs = getRuntime("crypto.timeoutMs");
  const primary = getRuntime("crypto.primaryProvider");
  const previous = await lastSnapshotMap(vs);
  const gecko = { name: "coingecko", run: () => breaker("coingecko", 3, 60_000).run(() => retry(() => coingeckoMarkets(vs, timeoutMs), { attempts: 2, baseMs: 250 })) };
  const coinbase = { name: "coinbase", run: () => breaker("coinbase", 3, 60_000).run(() => retry(() => coinbaseMarkets(vs, timeoutMs, previous ?? undefined), { attempts: 2, baseMs: 250 })) };
  const snapshot = { name: "snapshot", run: async () => { if (!previous || previous.size < 5) throw new AppError("upstream_unavailable", "no persisted snapshot"); return [...previous.values()].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)); } };
  const seed = { name: "seed", run: async () => seedMarkets(vs) };
  const chain = primary === "coinbase" ? [coinbase, gecko, snapshot, seed] : [gecko, coinbase, snapshot, seed];
  const result = await fallbackChain(chain);
  const failed = result.attempts.filter((a) => !a.ok);
  if (failed.length) {
    // Feed the remediation engine with the first real upstream failure (non-blocking).
    const first = failed[0];
    const category = /rate limited/i.test(first.error ?? "") ? "rate_limited" : /timed out/i.test(first.error ?? "") ? "upstream_timeout" : /malformed|empty|too few/i.test(first.error ?? "") ? "malformed_payload" : "upstream_unavailable";
    void captureAndRemediate({ origin: "server", category, message: `${first.provider}: ${first.error ?? "failed"}`, route: "crypto.markets", context: { attempts: result.attempts, vs } });
  }
  return { items: result.value, source: result.provider, attempts: result.attempts };
}

export async function getMarkets(vs: string, options: { force?: boolean } = {}): Promise<MarketsResult> {
  await loadRuntimePatches();
  if (options.force) marketsCache.delete(vs);
  const read = await marketsCache.read(vs, async () => {
    const live = await fetchMarketsLive(vs);
    void persistSnapshots(vs, live.items, live.source);
    return { value: { vs, items: live.items, source: live.source, fetchedAt: Date.now(), attempts: live.attempts, live: live.source === "coingecko" || live.source === "coinbase" }, source: live.source };
  }, { ttlMs: getRuntime("crypto.cacheTtlMs"), swrMs: 10 * 60_000 });
  return { ...read.value, age: read.age, state: read.state };
}

/* ------------------------------- history ------------------------------ */

async function historyFromSnapshots(id: string, vs: string, days: number): Promise<HistorySeries | null> {
  try {
    const since = new Date(Date.now() - days * 86_400_000);
    const rows = store.cryptoSnapshots
      .list((row) => row.assetId === id && row.vs === vs && row.capturedAt.getTime() >= since.getTime())
      .sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime())
      .slice(0, 5_000);
    if (rows.length < 12) return null;
    return { points: rows.map((r) => [r.capturedAt.getTime(), Number(r.price)] as [number, number]), volumes: rows.map((r) => [r.capturedAt.getTime(), Number(r.volume24h ?? 0)] as [number, number]), source: "snapshot", fetchedAt: Date.now() };
  } catch { return null; }
}

export async function getHistory(id: string, vs: string, days: number): Promise<HistorySeries & { age: number; state: string }> {
  await loadRuntimePatches();
  const key = `${id}:${vs}:${days}`;
  const read = await historyCache.read(key, async () => {
    const timeoutMs = getRuntime("crypto.timeoutMs");
    const chain = [
      { name: "coingecko", run: () => breaker("coingecko", 3, 60_000).run(() => retry(() => coingeckoHistory(id, vs, days, timeoutMs), { attempts: 2, baseMs: 300 })) },
      { name: "memory-cache", run: async () => {
        const row = store.cryptoHistory.find((entry) => entry.assetId === id && entry.vs === vs && entry.days === days);
        if (!row || row.source === "seed" || row.points.length < 5) throw new AppError("upstream_unavailable", "no cached history");
        return { points: row.points, volumes: row.volumes, source: `memory-cache(${row.source})`, fetchedAt: row.fetchedAt.getTime() } satisfies HistorySeries;
      } },
      { name: "snapshots", run: async () => { const s = await historyFromSnapshots(id, vs, days); if (!s) throw new AppError("upstream_unavailable", "insufficient snapshots"); return s; } },
      { name: "seed", run: async () => seedHistory(id, vs, days) },
    ];
    const result = await fallbackChain(chain);
    if (result.provider === "coingecko") {
      const entry = { points: result.value.points, volumes: result.value.volumes, source: "coingecko", fetchedAt: new Date() };
      store.cryptoHistory.upsert(
        (row) => row.assetId === id && row.vs === vs && row.days === days,
        () => ({ id: store.cryptoHistory.nextSequence(), assetId: id, vs, days, ...entry }),
        entry,
      );
    }
    const failed = result.attempts.filter((a) => !a.ok && a.provider === "coingecko");
    if (failed.length) void captureAndRemediate({ origin: "server", category: /rate limited/i.test(failed[0].error ?? "") ? "rate_limited" : /timed out/i.test(failed[0].error ?? "") ? "upstream_timeout" : "upstream_unavailable", message: `coingecko history: ${failed[0].error}`, route: "crypto.history", context: { id, days } });
    return { value: result.value, source: result.provider };
  }, { ttlMs: getRuntime("crypto.historyTtlMs"), swrMs: 6 * 60 * 60_000 });
  return { ...read.value, age: read.age, state: read.state };
}

/* ------------------------------ analysis ------------------------------ */

export type AnalysisReport = {
  id: string; symbol: string; name: string; vs: string; days: number; generatedAt: number; source: string; computeMs: number;
  quote: MarketAsset | null;
  series: { points: Array<[number, number]>; sma20: Array<number | null>; sma50: Array<number | null>; ema12: Array<number | null>; ema26: Array<number | null>; bbUpper: Array<number | null>; bbLower: Array<number | null>; rsi: Array<number | null>; macd: Array<number | null>; macdSignal: Array<number | null>; macdHist: Array<number | null>; volumes: Array<[number, number]> };
  stats: { last: number; first: number; periodReturnPct: number; high: number; low: number; meanPrice: number; stdPrice: number; periodsPerYear: number; observations: number; volAnnualPct: number; volDailyPct: number; sharpe: number; sortino: number; maxDrawdownPct: number; drawdownRecovered: boolean; var95Pct: number; cvar95Pct: number; parametricVar95Pct: number; var99Pct: number; skew: number; kurtosis: number; zScore20: number; rsi14: number | null; bbWidthPct: number | null; regression: { slopePct: number; r2: number; projected7: number } };
  levels: { support: number[]; resistance: number[]; pivot: number };
  monteCarlo: ReturnType<typeof monteCarloGBM>;
  signal: ReturnType<typeof compositeSignal>;
  precision: { method: string; note: string };
};

export async function getAnalysis(id: string, vs: string, days: number): Promise<AnalysisReport> {
  const key = `${id}:${vs}:${days}`;
  const read = await analysisCache.read(key, async () => {
    const started = Date.now();
    const [history, markets] = await Promise.all([getHistory(id, vs, days), getMarkets(vs).catch(() => null)]);
    const points = history.points.length > 720 ? downsamplePoints(history.points, 720) : history.points;
    const prices = points.map(([, p]) => p);
    const spanDays = Math.max(1 / 24, (points[points.length - 1][0] - points[0][0]) / 86_400_000);
    const periodsPerYear = Math.max(12, Math.round((prices.length / spanDays) * 365));
    const rets = simpleReturns(prices), lrets = logReturns(prices);
    const sma20 = sma(prices, 20), sma50 = sma(prices, 50), ema12 = ema(prices, 12), ema26 = ema(prices, 26);
    const bb = bollinger(prices, 20, 2), r = rsi(prices, 14), m = macd(prices);
    const reg = linearRegression(prices.slice(-Math.min(prices.length, 120)));
    const dd = maxDrawdown(prices), hv = historicalVaR(rets, 0.95), hv99 = historicalVaR(rets, 0.99);
    const volAnnual = annualisedVolatility(lrets, periodsPerYear);
    const sd = stddev(rets), mu = mean(rets);
    const skew = sd ? kahanSum(rets.map((x) => ((x - mu) / sd) ** 3)) / rets.length : 0;
    const kurt = sd ? kahanSum(rets.map((x) => ((x - mu) / sd) ** 4)) / rets.length - 3 : 0;
    const last = prices[prices.length - 1];
    const lastIdx = prices.length - 1;
    const muDaily = mean(lrets) * (periodsPerYear / 365), sigmaDaily = stddev(lrets) * Math.sqrt(periodsPerYear / 365);
    const mc = monteCarloGBM({ s0: last, muDaily, sigmaDaily, days: Math.min(90, Math.max(7, Math.round(days / 2))), paths: 2_000, seed: 1_337 });
    const signal = compositeSignal({ prices, rsi: r[lastIdx], macdHist: m.histogram[lastIdx], macdHistPrev: m.histogram[lastIdx - 1] ?? null, sma20: sma20[lastIdx], sma50: sma50[lastIdx], regression: reg, z: zScore(prices, 20), volAnnual });
    const quote = markets?.items.find((a) => a.id === id) ?? null;
    const report: AnalysisReport = {
      id, symbol: ASSET_META[id]?.symbol ?? id, name: quote?.name ?? ASSET_META[id]?.name ?? id, vs, days, generatedAt: Date.now(), source: history.source, computeMs: 0, quote,
      series: { points, sma20, sma50, ema12, ema26, bbUpper: bb.upper, bbLower: bb.lower, rsi: r, macd: m.macd, macdSignal: m.signal, macdHist: m.histogram, volumes: history.volumes.length > 240 ? downsamplePoints(history.volumes, 240) : history.volumes },
      stats: { last, first: prices[0], periodReturnPct: (last / prices[0] - 1) * 100, high: Math.max(...prices), low: Math.min(...prices), meanPrice: mean(prices), stdPrice: stddev(prices), periodsPerYear, observations: prices.length, volAnnualPct: volAnnual * 100, volDailyPct: sigmaDaily * 100, sharpe: sharpe(lrets, periodsPerYear), sortino: sortino(lrets, periodsPerYear), maxDrawdownPct: dd.depth * 100, drawdownRecovered: dd.recovered, var95Pct: hv.var * 100, cvar95Pct: hv.cvar * 100, parametricVar95Pct: parametricVaR(rets, 0.95) * 100, var99Pct: hv99.var * 100, skew, kurtosis: kurt, zScore20: zScore(prices, 20), rsi14: r[lastIdx], bbWidthPct: bb.bandwidth[lastIdx] === null ? null : (bb.bandwidth[lastIdx] as number) * 100, regression: { slopePct: reg.slopePct * 100, r2: reg.r2, projected7: reg.intercept + reg.slope * (Math.min(prices.length, 120) - 1 + Math.round(7 * (prices.length / spanDays))) } },
      levels: supportResistance(prices, Math.min(prices.length, 120)),
      monteCarlo: mc, signal,
      precision: { method: "Kahan–Babuška compensated sums; Wilder RSI; GBM Monte Carlo (2,000 seeded paths); Acklam inverse-normal for parametric VaR; exact decimal arithmetic for money values.", note: "Statistical estimates describe the sampled history only. They are not forecasts or advice." },
    };
    report.computeMs = Date.now() - started;
    return { value: report, source: history.source };
  }, { ttlMs: 60_000, swrMs: 10 * 60_000 });
  return read.value;
}

function downsamplePoints(points: Array<[number, number]>, target: number): Array<[number, number]> {
  const idx = downsample(points.map((_, i) => i), target);
  return idx.map((i) => points[i]);
}

/* ----------------------------- correlation ---------------------------- */

export type CorrelationReport = { vs: string; days: number; ids: string[]; symbols: string[]; matrix: number[][]; observations: number; betaVsBtc: Record<string, number>; generatedAt: number; sources: Record<string, string> };

export async function getCorrelation(ids: string[], vs: string, days: number): Promise<CorrelationReport> {
  const key = `${ids.join(",")}:${vs}:${days}`;
  const read = await correlationCache.read(key, async () => {
    const histories = await Promise.all(ids.map((id) => getHistory(id, vs, days)));
    const series: Record<string, Array<[number, number]>> = {};
    const sources: Record<string, string> = {};
    ids.forEach((id, i) => { series[id] = histories[i].points; sources[id] = histories[i].source; });
    const { matrix, observations } = correlationMatrix(series);
    const dailyReturns = (points: Array<[number, number]>) => { const byDay = new Map<number, number>(); for (const [t, p] of points) byDay.set(Math.floor(t / 86_400_000), p); return logReturns([...byDay.keys()].sort((a, b) => a - b).map((d) => byDay.get(d) as number)); };
    const btc = series.bitcoin ? dailyReturns(series.bitcoin) : null;
    const betaVsBtc: Record<string, number> = {};
    if (btc) for (const id of ids) betaVsBtc[id] = beta(dailyReturns(series[id]).slice(-btc.length), btc.slice(-dailyReturns(series[id]).length));
    return { value: { vs, days, ids, symbols: ids.map((id) => ASSET_META[id]?.symbol.toUpperCase() ?? id), matrix, observations, betaVsBtc, generatedAt: Date.now(), sources } };
  }, { ttlMs: 10 * 60_000, swrMs: 60 * 60_000 });
  return read.value;
}

/* -------------------------------- alerts ------------------------------ */

export async function evaluateAlerts(items: MarketAsset[], vs: string): Promise<number> {
  try {
    const ids = new Set(items.map((a) => a.id));
    const armed = store.cryptoAlerts.list((row) => row.status === "armed" && row.vs === vs && ids.has(row.assetId)).slice(0, 2_000);
    let triggered = 0;
    for (const alert of armed) {
      const asset = items.find((a) => a.id === alert.assetId);
      if (!asset) continue;
      const threshold = Number(alert.threshold);
      const hit = alert.condition === "above" ? asset.price >= threshold : alert.condition === "below" ? asset.price <= threshold : alert.condition === "change_up" ? (asset.change24h ?? 0) >= threshold : alert.condition === "change_down" ? (asset.change24h ?? 0) <= -Math.abs(threshold) : false;
      if (!hit) continue;
      store.cryptoAlerts.update((row) => row.id === alert.id, { status: "triggered", triggeredAt: new Date(), triggeredPrice: asset.price.toString() });
      triggered++;
    }
    scheduler.alertsTriggered += triggered;
    return triggered;
  } catch (error) {
    void captureAndRemediate({ origin: "server", error, route: "crypto.evaluateAlerts" });
    return 0;
  }
}

/* ------------------------------- scheduler ---------------------------- */

async function tick(): Promise<void> {
  const started = Date.now();
  try {
    const result = await getMarkets("usd", { force: true });
    scheduler.lastSource = result.source;
    scheduler.lastError = null;
    await evaluateAlerts(result.items, "usd");
    // Keep the secondary quote currencies warm without forcing a refetch storm.
    for (const vs of ["eur", "btc"]) { const cached = marketsCache.peek(vs); if (cached && cached.state === "stale") void getMarkets(vs).catch(() => undefined); }
  } catch (error) {
    scheduler.lastError = classifyError(error).message;
    void captureAndRemediate({ origin: "server", error, route: "crypto.scheduler" });
  } finally {
    scheduler.ticks++;
    scheduler.lastTickAt = Date.now();
    scheduler.lastDurationMs = Date.now() - started;
    schedule();
  }
}

function schedule(): void {
  if (scheduler.timer) clearTimeout(scheduler.timer);
  const delay = getRuntime("crypto.autoUpdater") ? getRuntime("crypto.pollMs") : 5 * 60_000;
  scheduler.timer = setTimeout(() => void tick(), delay);
  // Never keep the process alive just for the scheduler.
  (scheduler.timer as { unref?: () => void }).unref?.();
}

/** Idempotent: starts the automated refresh loop once per process. */
export function ensureAutoUpdater(): void {
  if (scheduler.timer) return;
  scheduler.startedAt = Date.now();
  scheduler.timer = setTimeout(() => void tick(), 1_500);
  (scheduler.timer as { unref?: () => void }).unref?.();
}

/* -------------------------------- status ------------------------------ */

export async function engineStatus() {
  await loadRuntimePatches();
  const cached = marketsCache.peek("usd");
  let snapshotCount = 0, oldestSnapshot: string | null = null, historyRows = 0;
  try {
    const snapshots = store.cryptoSnapshots.all();
    snapshotCount = snapshots.length;
    const oldest = snapshots.reduce<number | null>((min, row) => (min === null || row.capturedAt.getTime() < min ? row.capturedAt.getTime() : min), null);
    oldestSnapshot = oldest === null ? null : new Date(oldest).toISOString();
    historyRows = store.cryptoHistory.size;
  } catch { /* status must never fail */ }
  return {
    now: Date.now(),
    feed: cached ? { source: cached.value.source, fetchedAt: cached.value.fetchedAt, ageMs: cached.age, state: cached.state, live: cached.value.live, assets: cached.value.items.length, attempts: cached.value.attempts } : null,
    scheduler: { running: scheduler.timer !== null, ticks: scheduler.ticks, lastTickAt: scheduler.lastTickAt, lastDurationMs: scheduler.lastDurationMs, lastError: scheduler.lastError, lastSource: scheduler.lastSource, alertsTriggered: scheduler.alertsTriggered, intervalMs: getRuntime("crypto.pollMs"), startedAt: scheduler.startedAt },
    runtime: { primaryProvider: getRuntime("crypto.primaryProvider"), cacheTtlMs: getRuntime("crypto.cacheTtlMs"), timeoutMs: getRuntime("crypto.timeoutMs"), historyTtlMs: getRuntime("crypto.historyTtlMs"), clientPollMs: getRuntime("client.pollMs"), transport: getRuntime("client.transport"), streamPushMs: getRuntime("client.streamPushMs") },
    breakers: allBreakers(),
    caches: FastCache.all().filter((c) => c.name.startsWith("crypto:")),
    persistence: { snapshots: snapshotCount, oldestSnapshot, historySeries: historyRows },
    assets: CRYPTO_IDS.length,
  };
}

export async function latestQuotes(vs: string): Promise<Map<string, MarketAsset>> {
  const result = await getMarkets(vs);
  return new Map(result.items.map((a) => [a.id, a]));
}

export async function recentSnapshotsFor(id: string, hours: number) {
  const since = Date.now() - hours * 3_600_000;
  return store.cryptoSnapshots
    .list((row) => row.assetId === id && row.capturedAt.getTime() >= since)
    .sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime())
    .slice(0, 500);
}

/* Register with the remediation engine so playbooks can warm and verify this subsystem. */
registerRemediationHooks({
  warmCrypto: () => getMarkets("usd", { force: true }),
  verifyCrypto: async () => { const r = await getMarkets("usd"); return r.items.length >= 5 && r.age < 15 * 60_000; },
});

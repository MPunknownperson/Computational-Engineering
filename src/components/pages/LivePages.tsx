import { useCallback, useMemo, useState } from 'react';
import { Activity, ArrowRight, Check, Globe2, RefreshCw, TrendingDown, TrendingUp, TriangleAlert, Wifi, WifiOff } from 'lucide-react';
import {
  fetchAssets, fetchFx, fetchFxSeries, fetchIndicator, formatCompact, formatMoney,
  indicators, liveSources, relativeTime, sparklinePath,
} from '../../lib/live';
import type { IndicatorId } from '../../lib/live';
import { useLiveData, useOnlineStatus, useTicker } from '../../hooks/useLiveData';
import { MascotLoader, MascotReaction } from '../mascot/Scene';
import { Nova } from '../mascot/Nova';
import { AnimatedNumber, Reveal } from '../motion';

const FX_BASES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'SEK'];
const FX_SYMBOLS = ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'CNY', 'INR', 'BRL', 'ZAR', 'SEK'];

function LiveBadge({ updatedAt, refreshing, error }: { updatedAt: number | null; refreshing: boolean; error: string | null }) {
  useTicker(10000);
  const state = error ? 'error' : refreshing ? 'busy' : 'ok';
  return (
    <span className={`live-badge live-${state}`}>
      <i className="live-dot" aria-hidden="true" />
      {error ? 'Stale' : refreshing ? 'Updating' : 'Live'}
      {updatedAt && <small>· {relativeTime(updatedAt)}</small>}
    </span>
  );
}

function ErrorNote({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="live-error" role="alert">
      <TriangleAlert size={17} />
      <p>{message}</p>
      <button type="button" className="secondary-button" onClick={onRetry}><RefreshCw size={14} />Try again</button>
    </div>
  );
}

function Sparkline({ values, up }: { values: number[]; up: boolean }) {
  const path = useMemo(() => sparklinePath(values, 170, 46), [values]);
  if (!path) return null;
  return (
    <svg className="sparkline" viewBox="0 0 170 46" width="170" height="46" aria-hidden="true">
      <path d={path} fill="none" stroke={up ? '#1f9d63' : '#d1445a'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="sparkline-path" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* #markets                                                            */
/* ------------------------------------------------------------------ */

export function MarketsPage({ onNavigate }: { onNavigate: (hash: string) => void }) {
  const online = useOnlineStatus();
  const [base, setBase] = useState('USD');
  const [pair, setPair] = useState('EUR');
  const [amount, setAmount] = useState('100');

  const symbols = useMemo(() => FX_SYMBOLS.filter(code => code !== base), [base]);
  const fxLoader = useCallback((signal: AbortSignal) => fetchFx(base, symbols, signal), [base, symbols]);
  const fx = useLiveData(`fx:${base}`, fxLoader, { interval: 60000 });

  const seriesLoader = useCallback((signal: AbortSignal) => fetchFxSeries(base, pair, 30, signal), [base, pair]);
  const series = useLiveData(`series:${base}:${pair}`, seriesLoader, { interval: 300000, enabled: pair !== base });

  const assets = useLiveData('assets', useCallback((signal: AbortSignal) => fetchAssets('usd', signal), []), { interval: 60000 });

  const values = series.data ? series.data.map(point => point.value) : [];
  const trendUp = values.length > 1 ? values[values.length - 1] >= values[0] : true;
  const currentRate = fx.data ? fx.data.rates[pair] : undefined;
  const numericAmount = Number(amount.replace(/[^0-9.\-]/g, ''));
  const converted = currentRate && Number.isFinite(numericAmount) ? numericAmount * currentRate : null;

  return (
    <div className="route-enter live-page">
      <header className="page-intro live-intro">
        <div>
          <h1>Live markets</h1>
          <p>Reference exchange rates published by the European Central Bank and digital-asset spot prices, fetched directly by your browser and refreshed every minute while this tab is visible.</p>
        </div>
        <div className="live-intro-art"><Nova mood={trendUp ? 'cheer' : 'think'} size={132} /></div>
      </header>

      {!online && <div className="live-error" role="status"><WifiOff size={17} /><p>You are offline. The figures below are the last values this browser received.</p></div>}

      <section className="live-section">
        <header className="live-head">
          <h2><Globe2 size={18} />Foreign exchange</h2>
          <div className="live-head-tools">
            <LiveBadge updatedAt={fx.updatedAt} refreshing={fx.refreshing} error={fx.error} />
            <label className="live-select">
              <span>Base</span>
              <select value={base} onChange={event => { const next = event.target.value; setBase(next); if (next === pair) setPair(next === 'EUR' ? 'USD' : 'EUR'); }}>
                {FX_BASES.map(code => <option key={code} value={code}>{code}</option>)}
              </select>
            </label>
            <button type="button" className="secondary-button" onClick={fx.refresh}><RefreshCw size={14} />Refresh</button>
          </div>
        </header>

        {fx.error && !fx.data && <ErrorNote message={fx.error} onRetry={fx.refresh} />}
        {fx.loading && !fx.data && <MascotLoader title="Contacting the ECB feed" detail="Requesting today's reference rates." />}

        {fx.data && (
          <>
            <p className="live-note">Reference date {fx.data.date}. One {fx.data.base} buys:</p>
            <ul className="rate-grid">
              {Object.keys(fx.data.rates).map((code, index) => (
                <Reveal as="li" key={code} delay={index * 25}>
                  <button type="button" className={`rate-card ${pair === code ? 'active' : ''}`} onClick={() => setPair(code)}>
                    <span className="rate-code">{code}</span>
                    <strong><AnimatedNumber value={fx.data!.rates[code]} format={value => value.toFixed(value > 50 ? 2 : 4)} /></strong>
                    <span className="rate-cta">30-day trend<ArrowRight size={13} /></span>
                  </button>
                </Reveal>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="live-section live-split">
        <article className="live-card">
          <header className="live-head">
            <h2>{base} → {pair}</h2>
            <LiveBadge updatedAt={series.updatedAt} refreshing={series.refreshing} error={series.error} />
          </header>
          {series.error && !series.data && <ErrorNote message={series.error} onRetry={series.refresh} />}
          {series.data && (
            <>
              <div className="trend-row">
                <Sparkline values={values} up={trendUp} />
                <div className={`trend-figure ${trendUp ? 'up' : 'down'}`}>
                  {trendUp ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  <strong>{(((values[values.length - 1] - values[0]) / values[0]) * 100).toFixed(2)}%</strong>
                  <small>30 days</small>
                </div>
              </div>
              <p className="live-note">{series.data.length} published reference points between {series.data[0].date} and {series.data[series.data.length - 1].date}.</p>
            </>
          )}
        </article>

        <article className="live-card">
          <h2>Convert with the live rate</h2>
          <div className="convert-row">
            <label className="live-field">
              <span>Amount in {base}</span>
              <input inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} />
            </label>
            <div className="convert-result">
              <span>{pair}</span>
              <strong>{converted === null ? '—' : formatMoney(converted, pair)}</strong>
            </div>
          </div>
          <p className="live-note">Reference rates only — banks and card networks add a spread. For a fee-aware comparison open the <button type="button" className="inline-link" onClick={() => onNavigate('currency')}>currency converter</button>.</p>
        </article>
      </section>

      <section className="live-section">
        <header className="live-head">
          <h2><Activity size={18} />Digital assets</h2>
          <div className="live-head-tools">
            <LiveBadge updatedAt={assets.updatedAt} refreshing={assets.refreshing} error={assets.error} />
            <button type="button" className="secondary-button" onClick={assets.refresh}><RefreshCw size={14} />Refresh</button>
          </div>
        </header>
        {assets.error && !assets.data && <ErrorNote message={assets.error} onRetry={assets.refresh} />}
        {assets.loading && !assets.data && <MascotLoader title="Loading spot prices" detail="Public CoinGecko endpoint, no key required." />}
        {assets.data && (
          <ul className="asset-grid">
            {assets.data.map((asset, index) => (
              <Reveal as="li" key={asset.id} delay={index * 30} className="asset-card">
                <div className="asset-head">
                  <span className="asset-symbol">{asset.symbol}</span>
                  <MascotReaction direction={asset.change24h > 0.3 ? 'up' : asset.change24h < -0.3 ? 'down' : 'flat'} />
                </div>
                <strong className="asset-price"><AnimatedNumber value={asset.price} format={value => formatMoney(value, 'USD', value > 100 ? 0 : 2)} /></strong>
                <span className={`asset-change ${asset.change24h >= 0 ? 'up' : 'down'}`}>
                  {asset.change24h >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {asset.change24h.toFixed(2)}% · 24h
                </span>
                <span className="asset-name">{asset.name}</span>
              </Reveal>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* #economy                                                            */
/* ------------------------------------------------------------------ */

const COUNTRIES = [
  { code: 'US', name: 'United States' }, { code: 'GB', name: 'United Kingdom' }, { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' }, { code: 'JP', name: 'Japan' }, { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' }, { code: 'BR', name: 'Brazil' }, { code: 'ZA', name: 'South Africa' },
  { code: 'AU', name: 'Australia' }, { code: 'CA', name: 'Canada' }, { code: 'NG', name: 'Nigeria' },
  { code: 'MX', name: 'Mexico' }, { code: 'ID', name: 'Indonesia' }, { code: 'EG', name: 'Egypt' },
];

export function EconomyPage({ onNavigate }: { onNavigate: (hash: string) => void }) {
  const [country, setCountry] = useState('US');
  const [indicator, setIndicator] = useState<IndicatorId>('FP.CPI.TOTL.ZG');
  const loader = useCallback((signal: AbortSignal) => fetchIndicator(country, indicator, signal), [country, indicator]);
  const series = useLiveData(`wb:${country}:${indicator}`, loader, { interval: 0 });

  const points = series.data ? series.data.points.slice(-14) : [];
  const max = points.reduce((peak, point) => Math.max(peak, Math.abs(point.value)), 0) || 1;
  const latest = points.length ? points[points.length - 1] : null;
  const previous = points.length > 1 ? points[points.length - 2] : null;
  const direction = latest && previous ? (latest.value > previous.value ? 'up' : latest.value < previous.value ? 'down' : 'flat') : 'flat';
  const meta = indicators.find(item => item.id === indicator);

  return (
    <div className="route-enter live-page">
      <header className="page-intro live-intro">
        <div>
          <h1>Economy tracker</h1>
          <p>Official indicators pulled live from the World Bank Open Data API. Change the country or the series and the chart re-fetches; nothing here is bundled with the page.</p>
        </div>
        <div className="live-intro-art"><MascotReaction direction={direction as 'up' | 'down' | 'flat'} /></div>
      </header>

      <div className="live-controls">
        <label className="live-select">
          <span>Country</span>
          <select value={country} onChange={event => setCountry(event.target.value)}>
            {COUNTRIES.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
          </select>
        </label>
        <label className="live-select">
          <span>Indicator</span>
          <select value={indicator} onChange={event => setIndicator(event.target.value as IndicatorId)}>
            {indicators.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <LiveBadge updatedAt={series.updatedAt} refreshing={series.refreshing} error={series.error} />
        <button type="button" className="secondary-button" onClick={series.refresh}><RefreshCw size={14} />Refresh</button>
      </div>

      {series.error && !series.data && <ErrorNote message={series.error} onRetry={series.refresh} />}
      {series.loading && !series.data && <MascotLoader title="Querying the World Bank" detail="Up to 60 annual observations for this series." />}

      {series.data && latest && (
        <section className="live-section">
          <div className="indicator-headline">
            <div>
              <p className="indicator-label">{series.data.country} · {series.data.indicator}</p>
              <strong className="indicator-value">
                <AnimatedNumber value={latest.value} format={value => (indicator === 'SP.POP.TOTL' ? formatCompact(value) : value.toFixed(2))} />
                <small>{meta ? meta.unit : ''}</small>
              </strong>
              <p className="live-note">Latest published year: {latest.year}.</p>
            </div>
          </div>

          <div className="bar-chart" role="img" aria-label={`${series.data.indicator} for ${series.data.country}`}>
            {points.map((point, index) => (
              <div key={point.year} className="bar-column" style={{ ['--bar-index' as string]: index }}>
                <span className="bar-value">{indicator === 'SP.POP.TOTL' ? formatCompact(point.value) : point.value.toFixed(1)}</span>
                <div className="bar" style={{ height: `${Math.max(3, (Math.abs(point.value) / max) * 100)}%` }} />
                <span className="bar-year">{point.year}</span>
              </div>
            ))}
          </div>
          <p className="live-note">Source: World Bank Open Data, indicator <code>{indicator}</code>. Annual series; the most recent year may be provisional or absent for some economies. Compare with the dated national references in <button type="button" className="inline-link" onClick={() => onNavigate('coverage')}>coverage</button>.</p>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* #status                                                             */
/* ------------------------------------------------------------------ */

function SourceRow({ source }: { source: (typeof liveSources)[number] }) {
  const loader = useCallback(async (signal: AbortSignal) => {
    const started = Date.now();
    if (source.id === 'ecb') await fetchFx('EUR', ['USD'], signal);
    else if (source.id === 'coingecko') await fetchAssets('usd', signal);
    else await fetchIndicator('US', 'FP.CPI.TOTL.ZG', signal);
    return Date.now() - started;
  }, [source.id]);
  const probe = useLiveData(`status:${source.id}`, loader, { interval: 120000 });

  return (
    <tr>
      <th scope="row">
        <span className={`status-dot ${probe.error ? 'down' : probe.loading ? 'busy' : 'up'}`} aria-hidden="true" />
        {source.label}
      </th>
      <td><code>{source.host}</code></td>
      <td>{source.purpose}</td>
      <td>{probe.loading ? 'checking…' : probe.error ? 'unreachable' : `${probe.data} ms`}</td>
      <td><a href={source.docs} target="_blank" rel="noreferrer noopener">Docs</a></td>
    </tr>
  );
}

export function StatusPage() {
  const online = useOnlineStatus();
  return (
    <div className="route-enter live-page">
      <header className="page-intro">
        <h1>Live data status</h1>
        <p>This page re-checks every upstream feed from your own browser. A red dot means the request failed here, on your connection — the site itself has no server to fall over.</p>
      </header>

      <p className={`connection-pill ${online ? 'up' : 'down'}`}>{online ? <Wifi size={16} /> : <WifiOff size={16} />}{online ? 'Browser reports an active connection' : 'Browser reports no connection'}</p>

      <div className="table-wrap">
        <table className="status-table">
          <thead><tr><th>Source</th><th>Host</th><th>Used for</th><th>Round trip</th><th>Reference</th></tr></thead>
          <tbody>{liveSources.map(source => <SourceRow key={source.id} source={source} />)}</tbody>
        </table>
      </div>

      <ul className="status-notes">
        <li><Check size={15} />Requests are made straight from your browser; no proxy, no analytics, no cookies.</li>
        <li><Check size={15} />Every call has a timeout, two backoff retries and an abort on navigation.</li>
        <li><Check size={15} />Successful responses are cached in memory and re-served while a refresh runs.</li>
      </ul>
    </div>
  );
}

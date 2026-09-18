import { useCallback } from 'react';
import { Activity, ArrowRight, BookOpen, ChartLine, CircuitBoard, Clapperboard, Globe2, ShieldCheck, Sparkles, Wand2 } from 'lucide-react';
import { tools, toolById } from '../../lib/catalog';
import { countries } from '../../lib/regions';
import { guides } from '../../lib/content';
import { ToolGlyph } from '../ToolGlyph';
import { AnimatedNumber, AuroraBackdrop, Reveal, useStagger } from '../motion';
import { MascotScene } from '../mascot/Scene';
import { fetchAssets, fetchFx, formatMoney } from '../../lib/live';
import { useLiveData } from '../../hooks/useLiveData';
import { brand } from '../../lib/legal';
import type { ToolId } from '../../lib/types';

const compact = (value: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

/** Three live tiles on the home page, so the front door is never stale. */
function LiveStrip({ onNavigate }: { onNavigate: (hash: string) => void }) {
  const fx = useLiveData('home-fx', useCallback((signal: AbortSignal) => fetchFx('EUR', ['USD', 'GBP'], signal), []), { interval: 120000 });
  const assets = useLiveData('home-assets', useCallback((signal: AbortSignal) => fetchAssets('usd', signal), []), { interval: 120000 });
  const bitcoin = assets.data ? assets.data[0] : null;

  return <section className="home-section">
    <header className="home-section-head">
      <h2><Activity size={18} />Live right now</h2>
      <button className="text-button" onClick={() => onNavigate('markets')}>Open live markets<ArrowRight size={15} /></button>
    </header>
    <div className="home-live">
      <div className="home-live-card">
        <span>EUR → USD</span>
        <strong>{fx.data ? fx.data.rates.USD.toFixed(4) : fx.error ? '—' : '···'}</strong>
        <small>{fx.data ? `ECB reference, ${fx.data.date}` : fx.error ? 'Feed unavailable' : 'Contacting the ECB feed'}</small>
      </div>
      <div className="home-live-card">
        <span>EUR → GBP</span>
        <strong>{fx.data ? fx.data.rates.GBP.toFixed(4) : fx.error ? '—' : '···'}</strong>
        <small>{fx.data ? 'Updated every two minutes' : 'Waiting for data'}</small>
      </div>
      <div className="home-live-card">
        <span>Bitcoin</span>
        <strong>{bitcoin ? formatMoney(bitcoin.price, 'USD', 0) : assets.error ? '—' : '···'}</strong>
        <small className={bitcoin && bitcoin.change24h >= 0 ? 'up' : 'down'}>{bitcoin ? `${bitcoin.change24h.toFixed(2)}% · 24h` : 'Spot price, CoinGecko'}</small>
      </div>
    </div>
  </section>;
}

export default function HomePage({ onNavigate }: { onNavigate: (hash: string) => void }) {
  const countryCount = Object.keys(countries).length;
  const regionCount = Object.values(countries).reduce((sum, country) => sum + country.regions.length, 0);
  const featured: ToolId[] = ['mortgage', 'tax', 'compound', 'currency'];
  const delays = useStagger(tools.length);

  return <div className="home-page route-enter">
    <section className="hero">
      <AuroraBackdrop />
      <div className="hero-inner">
        <p className="hero-eyebrow"><Sparkles size={14} />No account. No tracking. No paywall.</p>
        <h1>Live numbers, drawn out in full.</h1>
        <p className="hero-lede">
          Mortgages, income tax, investments, fees and conversions, with dated regional references
          for {countryCount} countries and territories — now wired to live exchange rates, market
          prices and official indicators. Every result comes with its formula, its assumptions and
          its sources, and {brand.mascot} walks you through them.
        </p>
        <div className="hero-actions">
          <button className="primary-button" onClick={() => onNavigate('mortgage')}>Open a calculator<ArrowRight size={17} /></button>
          <button className="secondary-button" onClick={() => onNavigate('markets')}><Activity size={16} />See live markets</button>
          <button className="secondary-button" onClick={() => onNavigate('coverage')}><Globe2 size={16} />Browse coverage</button>
        </div>
        <dl className="hero-stats">
          <div><dt>Countries &amp; territories</dt><dd><AnimatedNumber value={countryCount} format={value => String(Math.round(value))} /></dd></div>
          <div><dt>Regional choices</dt><dd><AnimatedNumber value={regionCount} format={value => compact(Math.round(value))} /></dd></div>
          <div><dt>Calculation tools</dt><dd><AnimatedNumber value={tools.length} format={value => String(Math.round(value))} /></dd></div>
        </dl>
      </div>
    </section>

    <section className="home-section home-scene-section">
      <MascotScene mood="wave" />
    </section>

    <LiveStrip onNavigate={onNavigate} />

    <section className="home-section">
      <header className="home-section-head">
        <h2>Start with a tool</h2>
        <button className="text-button" onClick={() => onNavigate('calculators')}>All tools<ArrowRight size={15} /></button>
      </header>
      <div className="feature-grid">
        {featured.map((id, index) => {
          const tool = toolById[id];
          return <Reveal key={id} as="article" delay={delays[index]} className={`feature-card tone-${tool.accent}`}>
            <button onClick={() => onNavigate(id)}>
              <span className="feature-glyph"><ToolGlyph tool={id} size={40} /></span>
              <h3>{tool.title}</h3>
              <p>{tool.description}</p>
              <span className="feature-cta">Open<ArrowRight size={15} /></span>
            </button>
          </Reveal>;
        })}
      </div>
    </section>

    <section className="home-section">
      <header className="home-section-head"><h2>Every calculator</h2></header>
      <ul className="tool-chip-grid">
        {tools.map((tool, index) => <Reveal key={tool.id} as="li" delay={delays[index]}>
          <button className="tool-chip" onClick={() => onNavigate(tool.id)}>
            <ToolGlyph tool={tool.id} size={26} />
            <span>{tool.short}</span>
          </button>
        </Reveal>)}
      </ul>
    </section>

    <section className="home-section home-split">
      <Reveal as="article" className="pitch-card">
        <span className="pitch-icon"><CircuitBoard size={20} /></span>
        <h3>A real computation layer</h3>
        <p>
          Beyond the formulas there is a shared numerical engine: memoized evaluation, sensitivity
          analysis, a bracketed solver for target seeking, and a surrogate model trained in your
          browser on the exact engine and reported with its measured error.
        </p>
        <button className="text-button" onClick={() => onNavigate('methodology')}>How it works<ArrowRight size={15} /></button>
      </Reveal>
      <Reveal as="article" className="pitch-card" delay={70}>
        <span className="pitch-icon"><ShieldCheck size={20} /></span>
        <h3>Honest about limits</h3>
        <p>
          Reference tables are dated and sourced, estimates are labelled as estimates, and a
          jurisdiction without a verified rate leaves the field empty instead of guessing. Nothing
          here is filing advice.
        </p>
        <button className="text-button" onClick={() => onNavigate('about')}>What this is not<ArrowRight size={15} /></button>
      </Reveal>
      <Reveal as="article" className="pitch-card pitch-card-studio" delay={140}>
        <span className="pitch-icon"><Wand2 size={20} /></span>
        <h3>Make the tools your own</h3>
        <p>
          The converters and everyday calculators have a studio: define your own units and
          constants, save expressions, currency pairs, probability scenarios and measurement
          profiles. Everything is validated, stays on your device, and reorders itself around
          how you actually work.
        </p>
        <button className="text-button" onClick={() => onNavigate('units')}>Open the unit converter<ArrowRight size={15} /></button>
      </Reveal>
    </section>

    <section className="home-section home-split">
      <Reveal as="article" className="pitch-card">
        <span className="pitch-icon"><ChartLine size={20} /></span>
        <h3>Data that arrives while you read</h3>
        <p>
          Exchange rates come from the European Central Bank, spot prices from a public market API
          and macro indicators from the World Bank. Requests are made by your browser, cached in
          memory, retried with backoff and aborted the moment you navigate away.
        </p>
        <button className="text-button" onClick={() => onNavigate('status')}>Check feed status<ArrowRight size={15} /></button>
      </Reveal>
      <Reveal as="article" className="pitch-card" delay={70}>
        <span className="pitch-icon"><Clapperboard size={20} /></span>
        <h3>Drawn, not decorated</h3>
        <p>
          {brand.mascot} and Pip are cel-style characters built from SVG paths with named joints.
          They blink, wave, think and celebrate through keyframed poses — and they stop entirely if
          your system asks for reduced motion.
        </p>
        <button className="text-button" onClick={() => onNavigate('animation')}>Visit the animation studio<ArrowRight size={15} /></button>
      </Reveal>
    </section>

    <section className="home-section">
      <header className="home-section-head">
        <h2><BookOpen size={18} />Guides</h2>
        <button className="text-button" onClick={() => onNavigate('guides')}>All guides<ArrowRight size={15} /></button>
      </header>
      <div className="guide-grid">
        {guides.slice(0, 3).map((guide, index) => <Reveal key={guide.slug} as="article" delay={delays[index]} className="guide-card">
          <button onClick={() => onNavigate(`guides/${guide.slug}`)}>
            <span className="guide-meta">{guide.readingMinutes} min read</span>
            <h3>{guide.title}</h3>
            <p>{guide.summary}</p>
          </button>
        </Reveal>)}
      </div>
    </section>
  </div>;
}

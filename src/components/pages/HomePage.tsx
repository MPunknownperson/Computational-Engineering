import { ArrowRight, BookOpen, CircuitBoard, Globe2, ShieldCheck, Sparkles, Wand2 } from 'lucide-react';
import { tools, toolById } from '../../lib/catalog';
import { countries } from '../../lib/regions';
import { guides } from '../../lib/content';
import { ToolGlyph } from '../ToolGlyph';
import { AnimatedNumber, AuroraBackdrop, Reveal, useStagger } from '../motion';
import type { ToolId } from '../../lib/types';

const compact = (value: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

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
        <h1>Calculators that show their working.</h1>
        <p className="hero-lede">
          Mortgages, income tax, investments, fees and conversions, with dated regional references
          for {countryCount} countries and territories. Every result comes with its formula, its
          assumptions and its sources.
        </p>
        <div className="hero-actions">
          <button className="primary-button" onClick={() => onNavigate('mortgage')}>Open a calculator<ArrowRight size={17} /></button>
          <button className="secondary-button" onClick={() => onNavigate('coverage')}><Globe2 size={16} />Browse coverage</button>
        </div>
        <dl className="hero-stats">
          <div><dt>Countries &amp; territories</dt><dd><AnimatedNumber value={countryCount} format={value => String(Math.round(value))} /></dd></div>
          <div><dt>Regional choices</dt><dd><AnimatedNumber value={regionCount} format={value => compact(Math.round(value))} /></dd></div>
          <div><dt>Calculation tools</dt><dd><AnimatedNumber value={tools.length} format={value => String(Math.round(value))} /></dd></div>
        </dl>
      </div>
    </section>

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

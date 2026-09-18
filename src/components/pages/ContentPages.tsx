import { ArrowLeft, ArrowRight, BookOpen, Check, CircuitBoard, Cpu, GitBranch, Info, Network, ShieldCheck, TriangleAlert } from 'lucide-react';
import { guides, guideBySlug } from '../../lib/content';
import { toolById } from '../../lib/catalog';
import { Reveal, useStagger } from '../motion';

export function GuidesPage({ onNavigate }: { onNavigate: (hash: string) => void }) {
  const delays = useStagger(guides.length);
  return <div className="content-page route-enter">
    <header className="page-intro">
      <h1><BookOpen size={25} />Guides</h1>
      <p>Short explanations of the mechanics behind each calculator, written so the numbers on screen make sense.</p>
    </header>
    <div className="guide-grid wide">
      {guides.map((guide, index) => <Reveal key={guide.slug} as="article" delay={delays[index]} className="guide-card">
        <button onClick={() => onNavigate(`guides/${guide.slug}`)}>
          <span className="guide-meta">{guide.readingMinutes} min read &middot; {toolById[guide.tool].short}</span>
          <h2>{guide.title}</h2>
          <p>{guide.summary}</p>
          <span className="feature-cta">Read<ArrowRight size={15} /></span>
        </button>
      </Reveal>)}
    </div>
  </div>;
}

export function GuidePage({ slug, onNavigate }: { slug: string; onNavigate: (hash: string) => void }) {
  const guide = guideBySlug[slug];
  if (!guide) return <NotFoundPage onNavigate={onNavigate} />;
  const tool = toolById[guide.tool];
  return <article className="content-page article route-enter">
    <button className="back-link" onClick={() => onNavigate('guides')}><ArrowLeft size={15} />All guides</button>
    <header className="page-intro">
      <span className="article-meta">{guide.readingMinutes} min read</span>
      <h1>{guide.title}</h1>
      <p>{guide.summary}</p>
    </header>
    {guide.sections.map(section => <section key={section.heading} className="article-section">
      <h2>{section.heading}</h2>
      {section.body.map(paragraph => <p key={paragraph.slice(0, 32)}>{paragraph}</p>)}
    </section>)}
    <aside className="takeaway-box">
      <h2>Key points</h2>
      <ul>{guide.takeaways.map(item => <li key={item}><Check size={15} />{item}</li>)}</ul>
    </aside>
    <div className="article-cta">
      <div><strong>Try it with your own numbers</strong><small>{tool.description}</small></div>
      <button className="primary-button" onClick={() => onNavigate(guide.tool)}>Open {tool.short}<ArrowRight size={16} /></button>
    </div>
  </article>;
}

export function MethodologyPage({ onNavigate }: { onNavigate: (hash: string) => void }) {
  const layers = [
    { icon: <Cpu size={19} />, title: 'Deterministic modules', body: 'Each tool owns its formula library, validation rules and processing stages. Confirmed results come only from these modules, evaluated with explicit formulas and checked for numerical consistency before they are displayed.' },
    { icon: <GitBranch size={19} />, title: 'Numerical services', body: 'A shared layer adds memoized evaluation, central-difference sensitivity with elasticity ranking, and a bracketed secant/bisection solver for target seeking. The solver reports failure rather than returning an unverified answer.' },
    { icon: <CircuitBoard size={19} />, title: 'Local surrogate model', body: 'A small neural network is trained in your browser on samples drawn from the exact engine using a low-discrepancy sequence. It reports held-out R-squared, mean, mean-percentage and worst-case error, and previews are suppressed when accuracy falls outside the threshold.' },
    { icon: <Network size={19} />, title: 'Cross-module collaboration', body: 'Modules feed each other: take-home income drives a solved affordability figure, the surplus drives a growth projection, and results can be restated through the currency and fee modules. A link is omitted with a stated reason when its inputs are missing.' },
  ];
  return <div className="content-page route-enter">
    <header className="page-intro">
      <h1><CircuitBoard size={25} />Methodology</h1>
      <p>How a number on this site is produced, and what each layer is allowed to claim.</p>
    </header>

    <div className="layer-stack">
      {layers.map((layer, index) => <Reveal key={layer.title} as="section" delay={index * 60} className="layer-card">
        <span className="layer-icon">{layer.icon}</span>
        <div><h2>{layer.title}</h2><p>{layer.body}</p></div>
      </Reveal>)}
    </div>

    <section className="article-section">
      <h2>What the model is and is not</h2>
      <p>
        The surrogate network is a measured approximation of the deterministic engine, used to make
        exploration responsive. It is not a language model, it is not consulted for a confirmed
        result, and it never overrides a formula. There is no external service and no upload: the
        network is created, trained and discarded inside the page.
      </p>
      <p>
        Training runs in time-sliced frames so typing and scrolling stay responsive, and it can be
        cancelled at any time. Accuracy figures shown next to a prediction are computed on samples
        the network never saw during training.
      </p>
    </section>

    <section className="article-section">
      <h2>Reference data</h2>
      <p>
        Tax tables are versioned reference packs labelled with their year and source. Where a
        jurisdiction has no verified rate for a given levy, the field stays empty rather than being
        inferred. A locality selection is a location label; it never enables a tax on its own.
      </p>
      <p className="callout"><TriangleAlert size={16} />Reference packs are planning tools. They are not a filing service, and they do not model every relief, exemption or cross-border rule.</p>
    </section>

    <section className="article-section">
      <h2>Verification</h2>
      <p>
        A deterministic check suite runs in your browser on request. It covers loan edge cases,
        amortization reconciliation, historical tax packs, probability exactness, unit round trips,
        regional isolation, solver convergence, surrogate accuracy and animation behaviour.
      </p>
      <button className="secondary-button" onClick={() => onNavigate('about')}>Read the limitations<ArrowRight size={15} /></button>
    </section>
  </div>;
}

export function AboutPage({ onNavigate }: { onNavigate: (hash: string) => void }) {
  return <div className="content-page route-enter">
    <header className="page-intro">
      <h1><Info size={25} />About</h1>
      <p>A public calculation reference with no account system, no search box, no chat interface and no advertising.</p>
    </header>

    <section className="article-section">
      <h2>How it behaves</h2>
      <p>
        Results appear only after you press Calculate. Editing an input keeps the previous result on
        screen and marks it as needing an update, so a number never changes silently underneath you.
        Inputs, history and saved calculations stay in your browser.
      </p>
    </section>

    <div className="principle-grid">
      <Reveal as="article" className="principle-card ok">
        <h2><Check size={17} />What it does</h2>
        <ul>
          <li>Shows the formula, intermediate steps and assumptions behind every result.</li>
          <li>Keeps every optional levy and contribution as an explicit, editable choice.</li>
          <li>Labels estimates, dates its reference packs and links their sources.</li>
          <li>Works offline after first load, on phones, tablets and desktops.</li>
        </ul>
      </Reveal>
      <Reveal as="article" className="principle-card warn" delay={70}>
        <h2><ShieldCheck size={17} />What it does not do</h2>
        <ul>
          <li>It is not tax, legal, lending or investment advice.</li>
          <li>It does not file returns, move money or execute trades.</li>
          <li>It does not model every relief, exemption or cross-border rule.</li>
          <li>It does not send your amounts anywhere; only a currency pair and date are requested for rates.</li>
        </ul>
      </Reveal>
    </div>

    <section className="article-section">
      <h2>Data honesty</h2>
      <p>
        Several reference packs are secondary summaries rather than primary statute text, and rates
        change during a year. Where a figure is unknown it is left blank rather than filled with a
        plausible-looking number. Review any jurisdiction against its official source before relying
        on it for a decision.
      </p>
      <button className="secondary-button" onClick={() => onNavigate('coverage')}>See every source<ArrowRight size={15} /></button>
    </section>
  </div>;
}

export function NotFoundPage({ onNavigate }: { onNavigate: (hash: string) => void }) {
  return <div className="content-page route-enter">
    <header className="page-intro">
      <h1>Page not found</h1>
      <p>That address does not match a calculator, guide or reference page.</p>
    </header>
    <div className="hero-actions">
      <button className="primary-button" onClick={() => onNavigate('')}>Go to the home page<ArrowRight size={16} /></button>
      <button className="secondary-button" onClick={() => onNavigate('calculators')}>Browse calculators</button>
    </div>
  </div>;
}

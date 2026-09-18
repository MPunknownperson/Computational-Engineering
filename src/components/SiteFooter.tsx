import { useCallback } from 'react';
import type { MouseEvent } from 'react';
import { ArrowUp, Activity, ChartLine, Globe2, Mail, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react';
import { brand, legal } from '../lib/legal';
import { tools } from '../lib/catalog';
import { fetchAssets, formatMoney, relativeTime } from '../lib/live';
import { useLiveData, useTicker } from '../hooks/useLiveData';
import { BrandGlyph, BrandWordmark } from './ToolGlyph';
import { Pip } from './mascot/Nova';

export interface FooterProps {
  linkProps: (hash: string) => { href: string; onClick: (event: MouseEvent<HTMLAnchorElement>) => void };
  onReference: () => void;
  onSettings: () => void;
}

/** Live strip: a marquee of real digital-asset quotes, paused on hover/focus. */
function FooterTicker() {
  useTicker(20000);
  const loader = useCallback((signal: AbortSignal) => fetchAssets('usd', signal), []);
  const { data, error, updatedAt } = useLiveData('footer-assets', loader, { interval: 90000 });

  if (error && !data) {
    return <div className="footer-ticker footer-ticker-idle"><Activity size={14} />Live quotes unavailable right now — the calculators work offline.</div>;
  }
  if (!data) {
    return <div className="footer-ticker footer-ticker-idle"><Activity size={14} />Connecting to the live market feed…</div>;
  }
  const row = data.concat(data);
  return (
    <div className="footer-ticker" aria-label="Live market ticker">
      <span className="footer-ticker-label"><Activity size={14} />Live</span>
      <div className="footer-ticker-viewport">
        <div className="footer-ticker-track">
          {row.map((asset, index) => (
            <span className="footer-tick" key={`${asset.id}-${index}`}>
              <strong>{asset.symbol}</strong>
              <em>{formatMoney(asset.price, 'USD', asset.price > 100 ? 0 : 2)}</em>
              <i className={asset.change24h >= 0 ? 'up' : 'down'}>
                {asset.change24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {asset.change24h.toFixed(2)}%
              </i>
            </span>
          ))}
        </div>
      </div>
      {updatedAt && <span className="footer-ticker-time">updated {relativeTime(updatedAt)}</span>}
    </div>
  );
}

export default function SiteFooter({ linkProps, onReference, onSettings }: FooterProps) {
  const year = new Date().getFullYear();
  const toTop = () => {
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); }
    catch { window.scrollTo(0, 0); }
  };

  return (
    <footer className="site-footer-2">
      <FooterTicker />

      <div className="footer-main">
        <div className="footer-identity">
          <a className="site-brand footer-brand-link" {...linkProps('')} aria-label={`${brand.name} home`}>
            <BrandGlyph size={38} /><BrandWordmark />
          </a>
          <p className="footer-pitch">
            {brand.tagline} Calculators and converters that publish their formula, their assumptions
            and their sources, wired to live reference data for 190+ countries and territories.
          </p>
          <div className="footer-assurance">
            <span><ShieldCheck size={14} />No account</span>
            <span><Globe2 size={14} />No tracking</span>
            <span><ChartLine size={14} />Live sources</span>
          </div>
          <div className="footer-mascot"><Pip size={72} /><p>Pip keeps an eye on the feeds.</p></div>
        </div>

        <div className="footer-columns">
          <nav aria-label="Calculate">
            <h2>Calculate</h2>
            {tools.slice(0, 5).map(tool => <a key={tool.id} {...linkProps(tool.id)}>{tool.short}</a>)}
            <a {...linkProps('calculators')}>All tools</a>
          </nav>
          <nav aria-label="Live data">
            <h2>Live data</h2>
            <a {...linkProps('markets')}>Markets</a>
            <a {...linkProps('economy')}>Economy tracker</a>
            <a {...linkProps('status')}>Feed status</a>
            <a {...linkProps('coverage')}>Coverage</a>
          </nav>
          <nav aria-label="Explore">
            <h2>Explore</h2>
            <a {...linkProps('guides')}>Guides</a>
            <a {...linkProps('methodology')}>Methodology</a>
            <a {...linkProps('animation')}>Animation studio</a>
            <a {...linkProps('history')}>History</a>
            <a {...linkProps('saved')}>Saved</a>
          </nav>
          <nav aria-label="Company">
            <h2>Company</h2>
            <a {...linkProps('about')}>About</a>
            <a {...linkProps('contact')}>Contact</a>
            <a {...linkProps('accessibility')}>Accessibility</a>
            <button type="button" onClick={onReference}>Formulas &amp; sources</button>
            <button type="button" onClick={onSettings}>Preferences</button>
          </nav>
          <nav aria-label="Legal">
            <h2>Legal</h2>
            <a {...linkProps('terms')}>Terms</a>
            <a {...linkProps('privacy')}>Privacy</a>
            <a {...linkProps('disclaimer')}>Disclaimer</a>
            <a href={`mailto:${legal.contactEmail}`} className="footer-mail"><Mail size={13} />{legal.contactEmail}</a>
          </nav>
        </div>
      </div>

      <p className="footer-disclaimer">
        Planning estimates only — not tax, legal, lending, investment or medical advice. Reference
        packs are dated and may lag the latest amendments. Exchange rates are ECB reference rates and
        digital-asset prices are third-party spot quotes; neither is a dealable price. See the{' '}
        <a {...linkProps('disclaimer')}>Disclaimer</a> and <a {...linkProps('terms')}>Terms</a>.
      </p>

      <div className="footer-base">
        <span>&copy; {year} {legal.operatorName}. All rights reserved.</span>
        <span className="footer-base-mid">Built as a single static file · characters drawn in-house</span>
        <button type="button" className="footer-top" onClick={toTop}><ArrowUp size={14} />Back to top</button>
      </div>
    </footer>
  );
}

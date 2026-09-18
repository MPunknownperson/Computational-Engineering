import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { Activity, ArrowRight, Bookmark, BookOpen, ChartLine, Check, ChevronRight, CircuitBoard, Clapperboard, Globe2, History, Home, Info, Landmark, ListOrdered, Mail, Menu, Radio, Scale, Settings2, ShieldCheck, X } from 'lucide-react';
import { brand } from './lib/legal';
import { useCalculators } from './hooks/useCalculators';
import { tools, toolById } from './lib/catalog';
import type { Snapshot, ToolId, Values } from './lib/types';
import { copyText } from './lib/export';
import { formatResult } from './lib/format';
import { getRegion } from './lib/regions';
import { breadcrumbs, parseRoute, routeDescription, routeTitle, useRoute } from './lib/router';
import Dialog from './components/Dialog';
import { ExportDialog, ReferenceDialog, SettingsDialog } from './components/UtilityDialogs';
import { HistoryView, ToolDirectory, toolGroup } from './components/ToolDirectory';
import type { ToolGroup } from './components/ToolDirectory';
import { BrandGlyph, BrandWordmark, ToolGlyph } from './components/ToolGlyph';
import RegionalExplorer from './components/RegionalExplorer';
import CalculatorPage, { calculatorTabs } from './components/CalculatorPage';
import type { CalculatorTab } from './components/CalculatorPage';
import { useDeviceEnvironment } from './hooks/useDeviceEnvironment';
import SiteFooter from './components/SiteFooter';
import ErrorBoundary from './components/ErrorBoundary';
import { MascotLoader } from './components/mascot/Scene';
import { stopAllAnimations } from './lib/engine/animation';

// Secondary pages are split out so the calculator remains the fastest path.
const HomePage = lazy(() => import('./components/pages/HomePage'));
const CoveragePage = lazy(() => import('./components/pages/CoveragePage'));
const GuidesPage = lazy(() => import('./components/pages/ContentPages').then(m => ({ default: m.GuidesPage })));
const GuidePage = lazy(() => import('./components/pages/ContentPages').then(m => ({ default: m.GuidePage })));
const MethodologyPage = lazy(() => import('./components/pages/ContentPages').then(m => ({ default: m.MethodologyPage })));
const AboutPage = lazy(() => import('./components/pages/ContentPages').then(m => ({ default: m.AboutPage })));
const NotFoundPage = lazy(() => import('./components/pages/ContentPages').then(m => ({ default: m.NotFoundPage })));
const TermsPage = lazy(() => import('./components/pages/LegalPages').then(m => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('./components/pages/LegalPages').then(m => ({ default: m.PrivacyPage })));
const DisclaimerPage = lazy(() => import('./components/pages/LegalPages').then(m => ({ default: m.DisclaimerPage })));
const AccessibilityPage = lazy(() => import('./components/pages/LegalPages').then(m => ({ default: m.AccessibilityPage })));
const ContactPage = lazy(() => import('./components/pages/LegalPages').then(m => ({ default: m.ContactPage })));
const MarketsPage = lazy(() => import('./components/pages/LivePages').then(m => ({ default: m.MarketsPage })));
const EconomyPage = lazy(() => import('./components/pages/LivePages').then(m => ({ default: m.EconomyPage })));
const StatusPage = lazy(() => import('./components/pages/LivePages').then(m => ({ default: m.StatusPage })));
const AnimationPage = lazy(() => import('./components/pages/AnimationPage'));

type Modal = 'save' | 'export' | 'settings' | 'reference' | 'explorer' | 'navigation' | null;

// `priority` decides which links collapse into the menu first on narrow headers.
const primaryLinks: { hash: string; label: string; priority: 'primary' | 'secondary' | 'tertiary' }[] = [
  { hash: 'home', label: 'Home', priority: 'primary' },
  { hash: 'calculators', label: 'Calculators', priority: 'primary' },
  { hash: 'markets', label: 'Markets', priority: 'primary' },
  { hash: 'economy', label: 'Economy', priority: 'secondary' },
  { hash: 'converters', label: 'Converters', priority: 'tertiary' },
  { hash: 'guides', label: 'Guides', priority: 'secondary' },
  { hash: 'coverage', label: 'Coverage', priority: 'secondary' },
  { hash: 'animation', label: 'Studio', priority: 'tertiary' },
  { hash: 'about', label: 'About', priority: 'primary' },
];

export default function App() {
  const [route, go] = useRoute();
  const store = useCalculators(parseRoute(typeof window === 'undefined' ? '' : window.location.hash).tool || 'mortgage');
  const device = useDeviceEnvironment();
  const [tab, setTab] = useState<CalculatorTab>('calculator');
  const [modal, setModal] = useState<Modal>(null);
  const [group, setGroup] = useState<ToolGroup>('All');
  const [saveName, setSaveName] = useState('');
  const mainRef = useRef<HTMLElement>(null);
  const current = toolById[store.active];
  const resultReady = store.result && !store.dirty;

  // Route changes own the active tool, the document metadata and scroll position.
  const setActive = store.setActive;
  useEffect(() => {
    if (route.tool) setActive(route.tool);
    if (route.name === 'directory') setGroup((route.category as ToolGroup) || 'All');
    setTab('calculator');
    setModal(null);
    stopAllAnimations();
    // `requestAnimationFrame` is not guaranteed in every embedded webview.
    const scroll = () => { try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch { window.scrollTo(0, 0); } };
    if (typeof window.requestAnimationFrame === 'function') {
      const frame = window.requestAnimationFrame(scroll);
      return () => window.cancelAnimationFrame(frame);
    }
    scroll();
  }, [route.hash, route.name, route.tool, route.category, setActive]);

  useEffect(() => {
    document.title = routeTitle(route, current.title);
    const description = route.name === 'calculator' ? current.description : routeDescription(route);
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = description;
  }, [route, current.title, current.description]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !document.querySelector('dialog[open]')) {
        event.preventDefault();
        document.querySelector<HTMLFormElement>('.calculation-form')?.requestSubmit();
      }
      if (event.target instanceof HTMLElement && event.target.getAttribute('role') === 'tab' && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        const tablist = event.target.closest('[role="tablist"]');
        if (!tablist) return;
        const list = Array.from(tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
        const index = list.indexOf(event.target as HTMLButtonElement);
        if (!list.length) return;
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? list.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length;
        event.preventDefault();
        const target = list[next];
        if (!target) return;
        target.focus();
        target.click();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const navigate = useCallback((hash: string) => { setModal(null); go(hash); }, [go]);

  function linkProps(hash: string) {
    return {
      href: `#${hash}`,
      onClick: (event: MouseEvent<HTMLAnchorElement>) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        navigate(hash);
      },
    };
  }

  function requestSave() {
    if (!resultReady) { store.notify('Calculate with the current inputs before saving.'); return; }
    setSaveName(`${current.short} - ${store.region.name.replace(' (custom tax)', '')}`);
    setModal('save');
  }

  function restore(entry: Snapshot) { store.restore(entry); navigate(entry.tool); }
  function applyScenario(tool: ToolId, values: Values) { store.apply(tool, values); navigate(tool); }

  async function copyResult() {
    if (!store.result) return;
    const success = await copyText(`${formatResult(store.result, store.displayContext)} ${store.result.suffix || ''}`);
    store.notify(success ? 'Result copied.' : 'Clipboard access is blocked. Export the calculation instead.');
  }

  const crumbs = useMemo(() => breadcrumbs(route, current.short, toolGroup(store.active)), [route, current.short, store.active]);
  const activeTop = route.name === 'directory' ? (group === 'Converters' ? 'converters' : 'calculators') : route.name === 'calculator' ? 'calculators' : route.name;

  return <div className="site">
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); mainRef.current?.focus(); mainRef.current?.scrollIntoView(); }}>Skip to content</a>

    <header className="site-header">
      <div className="header-inner">
        <a className="site-brand" {...linkProps('')} aria-label={`${brand.name} home`}><BrandGlyph /><BrandWordmark /></a>
        <nav className="primary-nav" aria-label="Main navigation">
          {primaryLinks.map(link => <a key={link.hash} {...linkProps(link.hash === 'home' ? '' : link.hash)} className={`nav-link nav-${link.priority} ${activeTop === link.hash ? 'active' : ''}`} aria-current={activeTop === link.hash ? 'page' : undefined}>{link.label}</a>)}
        </nav>
        <div className="header-utilities">
          <a {...linkProps('history')} aria-label="Calculation history" className={`history-header-link ${route.name === 'history' || route.name === 'saved' ? 'active' : ''}`}><History size={18} /><span>History</span></a>
          <button className="header-settings" onClick={() => setModal('settings')} aria-label="Preferences"><Settings2 size={17} /><span>Preferences</span></button>
          <button className="mobile-menu-button icon-button" onClick={() => setModal('navigation')} aria-label="Open navigation" aria-haspopup="dialog"><Menu size={22} /></button>
        </div>
      </div>
      {(route.name === 'calculator' || route.name === 'directory') && <nav className="tools-nav" aria-label="Calculator tools">
        <div className="tools-nav-inner">
          {tools.map(tool => <a key={tool.id} {...linkProps(tool.id)} className={`tool-nav-link ${route.name === 'calculator' && store.active === tool.id ? 'active' : ''}`} aria-current={route.name === 'calculator' && store.active === tool.id ? 'page' : undefined}>
            <ToolGlyph tool={tool.id} size={38} /><span>{tool.short}</span>
          </a>)}
        </div>
      </nav>}
    </header>

    <main className="page-container" id="main-content" ref={mainRef} tabIndex={-1}>
      {crumbs.length > 1 && <nav className="breadcrumbs" aria-label="Breadcrumb">
        {crumbs.map((crumb, index) => <span key={`${crumb.label}-${index}`}>
          {crumb.hash !== undefined ? <a {...linkProps(crumb.hash)}>{crumb.label}</a> : <span aria-current="page">{crumb.label}</span>}
          {index < crumbs.length - 1 && <ChevronRight size={13} />}
        </span>)}
      </nav>}

      <ErrorBoundary onReset={() => go('')}>
      <Suspense fallback={<div className="page-suspense"><MascotLoader title="Loading page" detail="Nova is fetching this section of the site." /></div>}>
        {route.name === 'home' ? <HomePage onNavigate={navigate} />
          : route.name === 'calculator' ? <CalculatorPage
            store={store}
            tab={tab}
            onTab={setTab}
            onExport={() => setModal('export')}
            onSave={requestSave}
            onExplorer={() => setModal('explorer')}
            onCopy={copyResult}
            onApplyScenario={applyScenario}
            modalOpen={modal !== null}
          />
          : route.name === 'directory' ? <div className="route-enter">
            <header className="page-intro"><h1>{group === 'Converters' ? 'Converters' : 'Calculators and converters'}</h1><p>Choose a tool. Set your values. Get the complete picture, including the formula behind it.</p></header>
            <ToolDirectory group={group} onGroup={category => navigate(category === 'All' ? 'calculators' : `calculators/${category}`)} onOpen={navigate} />
          </div>
          : route.name === 'coverage' ? <CoveragePage onSelect={(country, region) => { store.changeLocation(country, region); navigate('tax'); store.notify(`${getRegion(country, region).name} selected. Review the reference year before calculating.`); }} />
          : route.name === 'markets' ? <MarketsPage onNavigate={navigate} />
          : route.name === 'economy' ? <EconomyPage onNavigate={navigate} />
          : route.name === 'status' ? <StatusPage />
          : route.name === 'animation' ? <AnimationPage onNavigate={navigate} />
          : route.name === 'guides' ? <GuidesPage onNavigate={navigate} />
          : route.name === 'guide' ? <GuidePage slug={route.slug || ''} onNavigate={navigate} />
          : route.name === 'methodology' ? <MethodologyPage onNavigate={navigate} />
          : route.name === 'about' ? <AboutPage onNavigate={navigate} />
          : route.name === 'terms' ? <TermsPage onNavigate={navigate} />
          : route.name === 'privacy' ? <PrivacyPage onNavigate={navigate} />
          : route.name === 'disclaimer' ? <DisclaimerPage onNavigate={navigate} />
          : route.name === 'accessibility' ? <AccessibilityPage onNavigate={navigate} />
          : route.name === 'contact' ? <ContactPage onNavigate={navigate} />
          : route.name === 'history' || route.name === 'saved' ? <div className="route-enter">
            <header className="page-intro"><h1>{route.name === 'saved' ? 'Saved calculations' : 'Calculation history'}</h1><p>Reopen a calculation with its original inputs and regional settings.</p></header>
            <HistoryView store={store} savedOnly={route.name === 'saved'} onView={saved => navigate(saved ? 'saved' : 'history')} onRestore={restore} />
          </div>
          : <NotFoundPage onNavigate={navigate} />}
      </Suspense>
      </ErrorBoundary>

      <SiteFooter linkProps={linkProps} onReference={() => setModal('reference')} onSettings={() => setModal('settings')} />
    </main>

    {store.notice && <div className="toast" role="status"><Check size={17} /><p>{store.notice}</p><button className="icon-button" onClick={store.dismissNotice} aria-label="Dismiss notification"><X size={17} /></button></div>}

    {modal === 'save' && <Dialog title="Save calculation" onClose={() => setModal(null)}>
      <form onSubmit={event => { event.preventDefault(); if (store.save(saveName)) setModal(null); }}>
        <p className="dialog-description">Save these inputs and results on this device. No account is required.</p>
        <label className="standalone-label" htmlFor="save-name">Calculation name</label>
        <input className="standalone-input" id="save-name" autoFocus required maxLength={80} value={saveName} onChange={event => setSaveName(event.target.value)} />
        {store.result && <div className="save-summary"><span>{current.title}</span><strong>{formatResult(store.result, store.displayContext)} <small>{store.result.suffix}</small></strong></div>}
        <div className="dialog-buttons"><button type="button" className="secondary-button" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="primary-button" disabled={!saveName.trim() || store.dirty}><Bookmark size={16} />Save</button></div>
      </form>
    </Dialog>}
    {modal === 'settings' && <SettingsDialog store={store} device={device} onClose={() => setModal(null)} />}
    {modal === 'export' && <ExportDialog store={store} onClose={() => setModal(null)} />}
    {modal === 'reference' && <ReferenceDialog onClose={() => setModal(null)} />}
    {modal === 'explorer' && <RegionalExplorer country={store.settings.country} selectedRegionId={store.settings.region} onApply={(countryId, regionId) => {
      if (countryId !== store.settings.country || regionId !== store.settings.region) store.changeLocation(countryId, regionId);
      setModal(null);
      store.notify(`${getRegion(countryId, regionId).name} selected. Review the reference year and currency before calculating.`);
    }} onClose={() => setModal(null)} />}
    {modal === 'navigation' && <Dialog title={`Explore ${brand.name}`} className="navigation-dialog" onClose={() => setModal(null)}>
      <nav className="mobile-navigation" aria-label="Mobile navigation">
        <button onClick={() => navigate('')}><Home size={20} /><span>Home</span><ChevronRight size={17} /></button>
        <button onClick={() => navigate('calculators')}><ListOrdered size={20} /><span>All calculators &amp; converters</span><ChevronRight size={17} /></button>
        <button onClick={() => navigate('markets')}><Activity size={20} /><span>Live markets</span><ChevronRight size={17} /></button>
        <button onClick={() => navigate('economy')}><ChartLine size={20} /><span>Economy tracker</span><ChevronRight size={17} /></button>
        <button onClick={() => navigate('status')}><Radio size={20} /><span>Live feed status</span><ChevronRight size={17} /></button>
        <button onClick={() => navigate('animation')}><Clapperboard size={20} /><span>Animation studio</span><ChevronRight size={17} /></button>
        <button onClick={() => navigate('coverage')}><Globe2 size={20} /><span>Country &amp; region coverage</span><ChevronRight size={17} /></button>
        <button onClick={() => navigate('guides')}><BookOpen size={20} /><span>Guides</span><ChevronRight size={17} /></button>
        <button onClick={() => navigate('methodology')}><CircuitBoard size={20} /><span>Methodology</span><ChevronRight size={17} /></button>
        <button onClick={() => setModal('explorer')}><Landmark size={20} /><span>Regional rules explorer</span><ChevronRight size={17} /></button>
        <button onClick={() => navigate('history')}><History size={20} /><span>Calculation history</span><ChevronRight size={17} /></button>
        <button onClick={() => navigate('saved')}><Bookmark size={20} /><span>Saved calculations</span><ChevronRight size={17} /></button>
        <button onClick={() => navigate('about')}><Info size={20} /><span>About</span><ChevronRight size={17} /></button>
        <button onClick={() => navigate('contact')}><Mail size={20} /><span>Contact</span><ChevronRight size={17} /></button>
        <button onClick={() => setModal('settings')}><Settings2 size={20} /><span>Preferences</span><ChevronRight size={17} /></button>
        <p className="mobile-navigation-group">Legal</p>
        <button onClick={() => navigate('terms')}><Scale size={20} /><span>Terms and Conditions</span><ChevronRight size={17} /></button>
        <button onClick={() => navigate('privacy')}><ShieldCheck size={20} /><span>Privacy Policy</span><ChevronRight size={17} /></button>
        <button onClick={() => navigate('disclaimer')}><ArrowRight size={20} /><span>Disclaimer &amp; accessibility</span><ChevronRight size={17} /></button>
      </nav>
    </Dialog>}
  </div>;
}

export { calculatorTabs };

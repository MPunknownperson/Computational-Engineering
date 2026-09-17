import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { ArrowRight, Bookmark, Calculator, Check, ChevronDown, ChevronRight, GitCompareArrows, History, Landmark, ListOrdered, RotateCcw, Settings2, X } from 'lucide-react';
import { useCalculators } from './hooks/useCalculators';
import { tools, toolById } from './lib/catalog';
import type { CountryId, Snapshot, ToolId, Values } from './lib/types';
import { complexityLevels, toolComplexityCopy } from './lib/complexity';
import { copyText } from './lib/export';
import { formatResult } from './lib/format';
import { countries, getRegion } from './lib/regions';
import ToolFields from './components/ToolFields';
import ResultPanel from './components/ResultPanel';
import { ComparisonView, DetailView } from './components/DetailViews';
import { SelectField } from './components/Fields';
import Dialog from './components/Dialog';
import { ExportDialog, ReferenceDialog, SettingsDialog } from './components/UtilityDialogs';
import { HistoryView, ToolDirectory, toolGroup } from './components/ToolDirectory';
import type { ToolGroup } from './components/ToolDirectory';
import { BrandGlyph, ToolGlyph } from './components/ToolGlyph';
import FlagIcon from './components/FlagIcon';
import RegionalExplorer from './components/RegionalExplorer';

type Page = 'calculator' | 'directory' | 'history' | 'saved';
type Modal = 'save' | 'export' | 'settings' | 'reference' | 'explorer' | null;
type Tab = 'calculator' | 'details' | 'compare';
function hashTool(): ToolId {
  const id = window.location.hash.slice(1);
  return isTool(id) ? id : 'mortgage';
}
function isTool(id: string): id is ToolId { return tools.some(tool => tool.id === id); }

export default function App() {
  const store = useCalculators(hashTool());
  const [page, setPage] = useState<Page>('calculator');
  const [tab, setTab] = useState<Tab>('calculator');
  const [modal, setModal] = useState<Modal>(null);
  const [group, setGroup] = useState<ToolGroup>('All');
  const [saveName, setSaveName] = useState('');
  const [locationOpen, setLocationOpen] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const current = toolById[store.active];
  const regionalTool = ['mortgage', 'tax', 'car', 'compound', 'transaction'].includes(store.active);
  const resultReady = store.result && !store.dirty;

  useEffect(() => {
    const syncRoute = () => {
      const hash = window.location.hash.slice(1);
      if (hash === 'calculators' || hash === 'converters' || hash.startsWith('calculators/')) {
        const category = hash.split('/')[1];
        setPage('directory');
        setGroup(hash === 'converters' ? 'Converters' : ['Financial', 'Math', 'Converters', 'Health'].includes(category) ? category as ToolGroup : 'All');
      }
      else if (hash === 'history' || hash === 'saved') setPage(hash);
      else { store.setActive(isTool(hash) ? hash : 'mortgage'); setPage('calculator'); }
      setTab('calculator');
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
    };
    syncRoute();
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, [store.setActive]);

  useEffect(() => {
    document.title = `${page === 'calculator' ? current.title : page === 'directory' ? 'Calculators and Converters' : page === 'saved' ? 'Saved Calculations' : 'Calculation History'} - CalcVault`;
  }, [page, current.title]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !document.querySelector('dialog[open]')) { event.preventDefault(); form.current?.requestSubmit(); }
      if (event.target instanceof HTMLElement && event.target.getAttribute('role') === 'tab' && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        const tabs = Array.from(event.target.closest('[role="tablist"]')!.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
        const index = tabs.indexOf(event.target as HTMLButtonElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        event.preventDefault(); tabs[next].focus(); tabs[next].click();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function navigate(destination: ToolId | 'calculators' | 'converters' | 'history' | 'saved') {
    setModal(null);
    if (isTool(destination)) { store.setActive(destination); setPage('calculator'); }
    else if (destination === 'calculators' || destination === 'converters') { setPage('directory'); setGroup(destination === 'converters' ? 'Converters' : 'All'); }
    else setPage(destination as 'history' | 'saved');
    setTab('calculator');
    window.location.hash = destination;
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
  }

  function navigateGroup(category: ToolGroup) {
    setPage('directory'); setGroup(category);
    window.location.hash = category === 'All' ? 'calculators' : `calculators/${category}`;
  }

  function openToolLink(event: MouseEvent<HTMLAnchorElement>, tool: ToolId) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    navigate(tool);
  }

  function requestSave() {
    if (!resultReady) { store.notify('Calculate with the current inputs before saving.'); return; }
    setSaveName(`${current.short}${regionalTool ? ` - ${store.region.name.replace(' (custom tax)', '')}` : ''}`);
    setModal('save');
  }

  function restore(entry: Snapshot) {
    store.restore(entry);
    navigate(entry.tool);
  }

  function applyScenario(tool: ToolId, values: Values) {
    store.apply(tool, values);
    navigate(tool);
  }

  async function copyResult() {
    if (!store.result) return;
    const success = await copyText(`${formatResult(store.result, store.displayContext)} ${store.result.suffix || ''}`);
    store.notify(success ? 'Result copied.' : 'Clipboard access is blocked. Export the calculation instead.');
  }

  const tabs = [
    { id: 'calculator' as Tab, label: 'Calculator', Icon: Calculator },
    { id: 'details' as Tab, label: ['mortgage', 'car'].includes(store.active) ? 'Payment schedule' : store.active === 'tax' ? 'Tax breakdown' : store.active === 'compound' ? 'Growth schedule' : 'Calculation details', Icon: ListOrdered },
    { id: 'compare' as Tab, label: store.active === 'tax' ? 'Compare regions' : 'Compare scenarios', Icon: GitCompareArrows },
  ];

  return <div className="site">
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus(); document.getElementById('main-content')?.scrollIntoView(); }}>Skip to calculator</a>
    <header className="site-header">
      <div className="header-inner">
        <a href="#mortgage" className="site-brand" onClick={event => { event.preventDefault(); navigate('mortgage'); }} aria-label="CalcVault home"><BrandGlyph /><span>calc<span className="brand-blue">vault</span><span className="brand-period">.</span></span></a>
        <nav className="primary-nav" aria-label="Main navigation">
          <a href="#calculators" className={page === 'directory' && group !== 'Converters' ? 'active' : ''} onClick={event => { event.preventDefault(); navigate('calculators'); }}>All calculators</a>
          <a href="#converters" className={page === 'directory' && group === 'Converters' ? 'active' : ''} onClick={event => { event.preventDefault(); navigate('converters'); }}>Conversions</a>
          <button onClick={() => setModal('explorer')}>State & regional laws</button>
          <button onClick={() => setModal('reference')}>Formulas & help</button>
        </nav>
        <div className="header-utilities">
          <a href="#history" aria-label="Calculation history" className={`history-header-link ${page === 'history' || page === 'saved' ? 'active' : ''}`} onClick={event => { event.preventDefault(); navigate('history'); }}><History size={18} /><span>History</span></a>
          <button className="header-settings" onClick={() => setModal('settings')} aria-label="Calculator settings"><Settings2 size={17} /><span>Preferences</span></button>
        </div>
      </div>
      <nav className="tools-nav" aria-label="Calculator tools"><div className="tools-nav-inner">{tools.map(tool => <a href={`#${tool.id}`} key={tool.id} className={`tool-nav-link ${page === 'calculator' && store.active === tool.id ? 'active' : ''}`} aria-current={page === 'calculator' && store.active === tool.id ? 'page' : undefined} onClick={event => openToolLink(event, tool.id)}><ToolGlyph tool={tool.id} size={38} /><span>{tool.short}</span></a>)}</div></nav>
    </header>

    <main className="page-container" id="main-content" tabIndex={-1}>
      <nav className="breadcrumbs" aria-label="Breadcrumb"><a href="#calculators" onClick={event => { event.preventDefault(); navigate('calculators'); }}>Calculators</a><ChevronRight size={13} />{page === 'calculator' ? <><button onClick={() => navigateGroup(toolGroup(store.active))}>{toolGroup(store.active)}</button><ChevronRight size={13} /><span>{current.short}</span></> : <span>{page === 'directory' ? group === 'Converters' ? 'Conversions' : 'All tools' : page === 'saved' ? 'Saved calculations' : 'History'}</span>}</nav>
      <div className="page-heading">
        <div className="page-title-wrap">{page === 'calculator' && <span className={`page-tool-symbol tone-${current.accent}`}><ToolGlyph tool={store.active} size={49} /></span>}<div><h1>{page === 'calculator' ? current.title : page === 'directory' ? group === 'Converters' ? 'Conversion tools' : 'Calculators & converters' : page === 'saved' ? 'Saved calculations' : 'Calculation history'}</h1><p>{page === 'calculator' ? current.description : page === 'directory' ? 'Choose a tool. Set your values. Get the complete picture.' : 'Reopen a calculation with its original inputs and settings.'}</p></div></div>
        {page === 'calculator' && regionalTool && <button className="page-location" onClick={() => setLocationOpen(!locationOpen)} aria-expanded={locationOpen} aria-controls="location-fields"><FlagIcon code={store.settings.country} size={22} /><FlagIcon code={store.settings.region} country={store.settings.country} region size={21} /><span><small>Location & currency</small><strong>{store.country.name}<span> / {store.region.name.replace(' (custom tax)', '')}</span>{store.settings.county && store.region.counties.find(c => c.id === store.settings.county) ? <span> / {store.region.counties.find(c => c.id === store.settings.county)!.name}</span> : null}</strong></span><ChevronDown size={15} /></button>}
      </div>
      {page === 'calculator' && regionalTool && locationOpen && <section className="location-editor" id="location-fields"><div className="location-fields-grid"><div className="flag-select"><FlagIcon code={store.settings.country} size={20} /><SelectField label="Country" value={store.settings.country} onChange={id => store.changeCountry(id as CountryId)} options={Object.entries(countries).map(([value, item]) => ({ value, label: item.name }))} /></div><div className="flag-select"><FlagIcon code={store.settings.region} country={store.settings.country} region size={20} /><SelectField label={store.country.regionLabel} value={store.settings.region} onChange={store.changeRegion} options={store.country.regions.map(region => ({ value: region.id, label: region.name }))} /></div>{store.region.counties.length > 0 && <div className="flag-select"><SelectField label="Locality (optional)" value={store.settings.county || ''} onChange={id => store.changeRegion(store.settings.region, id)} options={[{ value: '', label: 'Not specified' }, ...store.region.counties.map(c => ({ value: c.id, label: c.name }))]} /></div>}</div><div className="location-editor-actions"><p>Country and region set the tax pack. Locality is optional and starts unspecified. Local levies stay off until you enable them.</p><div className="location-btn-row"><button type="button" className="explorer-launcher" onClick={() => setModal('explorer')}><Landmark size={14} />Research {store.country.name} laws</button><button type="button" onClick={() => setModal('settings')}>{store.settings.city || 'Set a city label'}<ArrowRight size={14} /></button></div></div></section>}

      {page === 'calculator' && (
        <div className="complexity-strip" role="group" aria-label={`${current.short} detail level`}>
          <span className="complexity-strip-label">{current.short} detail</span>
          {complexityLevels.map(level => (
            <button
              key={level.value}
              type="button"
              className={store.toolComplexity() === level.value ? 'selected' : ''}
              title={level.desc}
              onClick={() => store.setToolComplexity(level.value)}
            >
              {level.label}
            </button>
          ))}
          <small>{toolComplexityCopy[store.active][store.toolComplexity()]}</small>
        </div>
      )}

      {store.storageError && <p className="inline-warning">Browser storage is unavailable. Changes last for this session only. Export a copy to keep your results.</p>}

      {page === 'calculator' ? <div className="calculator-page" key={store.active}>
        <div className="calculator-tabs" role="tablist" aria-label="Calculator views">{tabs.map(item => <button key={item.id} id={`tab-${item.id}`} role="tab" aria-selected={tab === item.id} aria-controls="calculator-content" tabIndex={tab === item.id ? 0 : -1} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}><item.Icon size={16} />{item.label}</button>)}<span className="calculator-tab-note">No sign-up. Just the numbers.</span></div>

        <div
          id="calculator-content"
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
          className="calculator-content"
          onTouchStart={event => {
            const target = event.target as HTMLElement;
            if (target.closest('input, select, textarea, button, a, .table-scroll, .tools-nav')) return;
            swipe.current = { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
          }}
          onTouchEnd={event => {
            if (!swipe.current) return;
            const dx = event.changedTouches[0].clientX - swipe.current.x;
            const dy = event.changedTouches[0].clientY - swipe.current.y;
            swipe.current = null;
            if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
            const order: Tab[] = ['calculator', 'details', 'compare'];
            const index = order.indexOf(tab);
            const next = order[index + (dx < 0 ? 1 : -1)];
            if (next) setTab(next);
          }}
        >
          {tab === 'calculator' ? <div className="calculation-layout">
            <form className="calculation-form" ref={form} noValidate onSubmit={event => { event.preventDefault(); store.calculate(); }}>
              <div className="section-heading"><h2><span className="section-number">01</span>{store.active === 'mortgage' ? 'Your loan details' : store.active === 'car' ? 'Your vehicle & loan' : store.active === 'tax' ? 'Your income details' : store.active === 'compound' ? 'Your investment' : store.active === 'transaction' ? 'Your transaction' : 'Your inputs'}</h2>{regionalTool && <span className="currency-note">{store.country.currency}</span>}</div>
              <ToolFields tool={store.active} values={store.values} ctx={store.context} onChange={store.updateValue} onApplyPreset={partial => { store.applyValues(partial); store.notify('Scenario loaded. Adjust any value, then Calculate.'); }} onSwap={store.swapValues} onRefresh={store.refreshRate} rateStatus={store.rateStatus} issues={store.draft.issues} />
              <div className="form-actions"><button type="submit" className="primary-button calculate-button" disabled={store.loading}>{store.active === 'currency' || store.active === 'units' ? 'Convert now' : 'Calculate'}<ArrowRight size={18} /></button><button type="button" className="reset-button" onClick={store.reset}><RotateCcw size={15} />Reset values</button></div>
              <p className="input-footnote">Press Calculate to update the result. Editing inputs does not replace the displayed result.</p>
            </form>
            <ResultPanel result={store.result} error={store.error} loading={store.loading} context={store.displayContext} tool={store.active} saved={store.isSaved} dirty={store.dirty} revision={store.revision} onSave={requestSave} onExport={() => setModal('export')} onDetails={() => setTab('details')} onCopy={copyResult} />
          </div> : tab === 'compare' && store.draft.result ? <ComparisonView key={`${store.active}-${store.values.method}-${store.settings.country}`} tool={store.active} values={store.values} ctx={store.context} result={store.draft.result} onApply={next => applyScenario(store.active, next)} onRegion={id => { store.changeRegion(id); setTab('calculator'); }} /> : tab === 'details' && store.result ? <>
            {store.dirty && <p className="inline-warning">The inputs have changed. This breakdown reflects the previous calculation.</p>}
            <DetailView key={`${store.active}-${store.result.value}`} result={store.result} ctx={store.displayContext} onExport={() => setModal('export')} />
          </> : <div className="empty-state"><h2>Calculate a result first</h2><p>{store.error || store.draft.error || 'Complete the required inputs to view calculation details.'}</p><button className="primary-button" onClick={() => setTab('calculator')}>Return to calculator<ArrowRight size={17} /></button></div>}
        </div>

      </div> : page === 'directory' ? <ToolDirectory group={group} onGroup={setGroup} onOpen={navigate} /> : <HistoryView store={store} savedOnly={page === 'saved'} onView={saved => navigate(saved ? 'saved' : 'history')} onRestore={restore} />}

      <footer className="site-footer"><div><strong>CalcVault</strong><span>Free calculators. No registration required.</span></div><nav aria-label="Footer navigation"><a href="#calculators" onClick={event => { event.preventDefault(); navigate('calculators'); }}>All tools</a><button onClick={() => setModal('reference')}>Sources & help</button><a href="#saved" onClick={event => { event.preventDefault(); navigate('saved'); }}>Saved calculations</a></nav></footer>
    </main>

    {store.notice && <div className="toast" role="status"><Check size={17} /><p>{store.notice}</p><button className="icon-button" onClick={store.dismissNotice} aria-label="Dismiss notification"><X size={17} /></button></div>}
    {modal === 'save' && <Dialog title="Save calculation" onClose={() => setModal(null)}>
      <form onSubmit={event => { event.preventDefault(); if (store.save(saveName)) setModal(null); }}><p className="dialog-description">Save these inputs and results on this device. No account is required.</p><label className="standalone-label" htmlFor="save-name">Calculation name</label><input className="standalone-input" id="save-name" autoFocus required maxLength={80} value={saveName} onChange={event => setSaveName(event.target.value)} />{store.result && <div className="save-summary"><span>{current.title}</span><strong>{formatResult(store.result, store.displayContext)} <small>{store.result.suffix}</small></strong></div>}<div className="dialog-buttons"><button type="button" className="secondary-button" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="primary-button" disabled={!saveName.trim() || store.dirty}><Bookmark size={16} />Save</button></div></form>
    </Dialog>}
    {modal === 'settings' && <SettingsDialog store={store} onClose={() => setModal(null)} />}
    {modal === 'export' && <ExportDialog store={store} onClose={() => setModal(null)} />}
    {modal === 'reference' && <ReferenceDialog onClose={() => setModal(null)} />}
    {modal === 'explorer' && (
      <Dialog title="Regional Laws, Statutes & Local Statistics" onClose={() => setModal(null)} className="explorer-dialog">
        <RegionalExplorer
          country={store.settings.country}
          selectedRegionId={store.settings.region}
          onSelectRegion={(regionId, countyId) => {
            store.changeRegion(regionId, countyId);
            setModal(null);
            store.notify(`Loaded ${getRegion(store.settings.country, regionId).name}${countyId ? ' and county rules' : ''}.`);
          }}
          onClose={() => setModal(null)}
        />
      </Dialog>
    )}
  </div>;
}
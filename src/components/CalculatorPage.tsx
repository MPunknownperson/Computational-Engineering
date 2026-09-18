import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUp, Calculator, Check, ChevronDown, CircuitBoard, GitCompareArrows, Landmark, ListOrdered, RotateCcw } from 'lucide-react';
import type { CalculatorStore } from '../hooks/useCalculators';
import { toolById } from '../lib/catalog';
import { complexityLevels, toolComplexityCopy } from '../lib/complexity';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import type { ToolId, Values } from '../lib/types';
import ToolFields from './ToolFields';
import ResultPanel from './ResultPanel';
import { ComparisonView, DetailView } from './DetailViews';
import InsightsView from './InsightsView';
import LocationFields, { LocationSummary } from './LocationFields';
import FlagIcon from './FlagIcon';
import { ToolGlyph } from './ToolGlyph';
import { PanelLoader } from './motion';

export type CalculatorTab = 'calculator' | 'details' | 'compare' | 'insights';
export const calculatorTabs: CalculatorTab[] = ['calculator', 'details', 'compare', 'insights'];

const shortLabel: Record<CalculatorTab, string> = { calculator: 'Calculator', details: 'Details', compare: 'Compare', insights: 'Insights' };

interface Props {
  store: CalculatorStore;
  tab: CalculatorTab;
  onTab: (tab: CalculatorTab) => void;
  onExport: () => void;
  onSave: () => void;
  onExplorer: () => void;
  onCopy: () => void;
  onApplyScenario: (tool: ToolId, values: Values) => void;
  modalOpen: boolean;
}

export default function CalculatorPage({ store, tab, onTab, onExport, onSave, onExplorer, onCopy, onApplyScenario, modalOpen }: Props) {
  const current = toolById[store.active];
  const regionalTool = ['mortgage', 'tax', 'car', 'compound', 'transaction'].includes(store.active);
  const [locationOpen, setLocationOpen] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const resultRegion = useRef<HTMLDivElement>(null);
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipe = useSwipeNavigation(store.settings.swipeNavigation !== false && !modalOpen, calculatorTabs.indexOf(tab), calculatorTabs.length, index => onTab(calculatorTabs[index]));

  useEffect(() => () => { if (resultTimer.current) clearTimeout(resultTimer.current); }, []);
  useEffect(() => { if (resultTimer.current) clearTimeout(resultTimer.current); }, [store.active, tab]);

  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>('.calculator-tabs');
    const active = scroller?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (scroller && active && scroller.scrollWidth > scroller.clientWidth) {
      scroller.scrollTo({ left: active.offsetLeft - scroller.offsetLeft - 12, behavior: 'auto' });
    }
  }, [tab]);

  function submitCalculation() {
    if (!store.calculate()) return;
    if (store.settings.showResultAfterCalculate !== false && (window.innerWidth < 1024 || store.settings.layout === 'stacked')) {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      if (resultTimer.current) clearTimeout(resultTimer.current);
      resultTimer.current = setTimeout(() => {
        resultRegion.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        resultRegion.current?.focus({ preventScroll: true });
      }, 250);
    }
  }

  const tabs = [
    { id: 'calculator' as CalculatorTab, label: 'Calculator', Icon: Calculator },
    { id: 'details' as CalculatorTab, label: ['mortgage', 'car'].includes(store.active) ? 'Payment schedule' : store.active === 'tax' ? 'Tax breakdown' : store.active === 'compound' ? 'Growth schedule' : 'Calculation details', Icon: ListOrdered },
    { id: 'compare' as CalculatorTab, label: store.active === 'tax' ? 'Compare regions' : 'Compare scenarios', Icon: GitCompareArrows },
    { id: 'insights' as CalculatorTab, label: 'Computation insights', Icon: CircuitBoard },
  ];

  return <div className="calculator-shell route-enter">
    <div className="page-heading">
      <div className="page-title-wrap">
        <span className={`page-tool-symbol tone-${current.accent}`}><ToolGlyph tool={store.active} size={49} /></span>
        <div><h1>{current.title}</h1><p>{current.description}</p></div>
      </div>
      {regionalTool && <button className="page-location" onClick={() => setLocationOpen(!locationOpen)} aria-expanded={locationOpen} aria-controls="location-fields">
        <FlagIcon code={store.settings.country} size={22} />
        <span><small>Location &amp; currency &middot; {store.country.currency}</small><strong><LocationSummary {...store.settings} /></strong></span>
        <ChevronDown size={16} />
      </button>}
    </div>

    {regionalTool && locationOpen && <section className="location-editor" id="location-fields" aria-label="Location settings">
      <LocationFields store={store} />
      <div className="location-editor-actions">
        <button type="button" className="explorer-launcher" onClick={onExplorer}><Landmark size={15} />Explore regional rules</button>
        <button type="button" className="location-done" onClick={() => setLocationOpen(false)}><Check size={16} />Done</button>
      </div>
    </section>}

    <div className="complexity-strip" role="group" aria-label={`${current.short} detail level`}>
      <span className="complexity-strip-label">{current.short} detail</span>
      {complexityLevels.map(level => <button
        key={level.value}
        type="button"
        className={store.toolComplexity() === level.value ? 'selected' : ''}
        aria-pressed={store.toolComplexity() === level.value}
        title={level.desc}
        onClick={() => store.setToolComplexity(level.value)}
      >{level.label}</button>)}
      <small>{toolComplexityCopy[store.active][store.toolComplexity()]}</small>
    </div>

    {store.storageError && <p className="inline-warning">Browser storage is unavailable. Changes last for this session only. Export a copy to keep your results.</p>}

    <div className="calculator-page" key={store.active}>
      <div className="calculator-tabs" role="tablist" aria-label="Calculator views">
        {tabs.map(item => <button
          key={item.id}
          id={`tab-${item.id}`}
          role="tab"
          aria-selected={tab === item.id}
          aria-controls="calculator-content"
          tabIndex={tab === item.id ? 0 : -1}
          className={tab === item.id ? 'active' : ''}
          onClick={() => onTab(item.id)}
        ><item.Icon size={16} /><span className="tab-full-label">{item.label}</span><span className="tab-short-label">{shortLabel[item.id]}</span></button>)}
        <span className="calculator-tab-note">No sign-up. Just the numbers.</span>
      </div>
      {store.settings.swipeNavigation !== false && <p className="swipe-guidance">Swipe the content to switch views, or tap a tab.</p>}

      <div id="calculator-content" role="tabpanel" aria-labelledby={`tab-${tab}`} className="calculator-content" tabIndex={0} {...swipe}>
        {tab === 'calculator' ? <div className="calculation-layout">
          <form className="calculation-form" ref={form} noValidate onSubmit={event => { event.preventDefault(); submitCalculation(); }}>
            <div className="section-heading">
              <h2><span className="section-number">01</span>{store.active === 'mortgage' ? 'Your loan details' : store.active === 'car' ? 'Your vehicle & loan' : store.active === 'tax' ? 'Your income details' : store.active === 'compound' ? 'Your investment' : store.active === 'transaction' ? 'Your transaction' : 'Your inputs'}</h2>
              {regionalTool && <span className="currency-note">{store.country.currency}</span>}
            </div>
            <ToolFields
              tool={store.active}
              values={store.values}
              ctx={store.context}
              onChange={store.updateValue}
              onApplyPreset={partial => { store.applyValues(partial); store.notify('Scenario loaded. Adjust any value, then Calculate.'); }}
              onSwap={store.swapValues}
              onRefresh={store.refreshRate}
              rateStatus={store.rateStatus}
              issues={store.draft.issues}
            />
            <div className="form-actions">
              <button type="submit" className="primary-button calculate-button" disabled={store.loading}>{store.active === 'currency' || store.active === 'units' ? 'Convert now' : 'Calculate'}<ArrowRight size={18} /></button>
              <button type="button" className="reset-button" onClick={store.reset}><RotateCcw size={15} />Reset values</button>
            </div>
            <p className="input-footnote">Press Calculate to update the result. Editing inputs does not replace the displayed result.</p>
          </form>
          <div ref={resultRegion} className="result-column" id="calculation-result" tabIndex={-1} aria-label="Calculation result">
            {store.loading
              ? <div className="result-pane"><PanelLoader title="Loading reference rate" detail="Only the currency pair and date are requested. Your amount stays on this device." /></div>
              : <ResultPanel result={store.result} error={store.error} loading={false} context={store.displayContext} tool={store.active} saved={store.isSaved} dirty={store.dirty} revision={store.revision} onSave={onSave} onExport={onExport} onDetails={() => onTab('details')} onCopy={onCopy} />}
            {store.result && <button type="button" className="result-return" onClick={() => {
              form.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
              form.current?.querySelector<HTMLElement>('input, select')?.focus({ preventScroll: true });
            }}><ArrowUp size={16} />Back to inputs</button>}
          </div>
        </div> : tab === 'compare' && store.draft.result ? <ComparisonView
          key={`${store.active}-${store.values.method}-${store.settings.country}`}
          tool={store.active}
          values={store.values}
          ctx={store.context}
          result={store.draft.result}
          onApply={next => onApplyScenario(store.active, next)}
          onRegion={id => { store.changeRegion(id); onTab('calculator'); }}
        /> : tab === 'details' && store.result ? <>
          {store.dirty && <p className="inline-warning">The inputs have changed. This breakdown reflects the previous calculation.</p>}
          <DetailView key={`${store.active}-${store.result.value}`} result={store.result} ctx={store.displayContext} onExport={onExport} />
        </> : tab === 'insights' ? <InsightsView
          key={`${store.active}-${store.settings.country}-${store.settings.region}`}
          tool={store.active}
          values={store.values}
          ctx={store.context}
          data={store.data}
          onApply={partial => { store.applyValues(partial); store.notify('Value moved into the calculator. Press Calculate to confirm it.'); onTab('calculator'); }}
        /> : <div className="empty-state">
          <h2>Calculate a result first</h2>
          <p>{store.error || store.draft.error || 'Complete the required inputs to view calculation details.'}</p>
          <button className="primary-button" onClick={() => onTab('calculator')}>Return to calculator<ArrowRight size={17} /></button>
        </div>}
      </div>
    </div>
  </div>;
}

import { useMemo, useState } from 'react';
import { ArrowUpRight, Check, Download, Globe2, Palette, Printer, ShieldCheck, X } from 'lucide-react';
import Dialog from './Dialog';
import { SelectField, Toggle } from './Fields';
import type { CalculatorStore } from '../hooks/useCalculators';
import type { CountryId } from '../lib/types';
import { countries, referenceSources } from '../lib/regions';
import FlagIcon, { mappedRegionalFlagCount } from './FlagIcon';
import { exportCalculation } from '../lib/export';
import { runEngineChecks } from '../lib/checks';
import { toolById, tools } from '../lib/catalog';
import { defaultSettings } from '../lib/regions';
import { processCalculation } from '../lib/processing';

export function SettingsDialog({ store, onClose }: { store: CalculatorStore; onClose: () => void }) {
  const { settings, setSettings, country, region } = store;
  return <Dialog title="Calculator settings" onClose={onClose} className="settings-dialog" footer={<button className="primary-button" onClick={onClose}>Done</button>}>
    <p className="dialog-description">Settings apply to all tools and are saved on this device.</p>
    <h3 className="settings-heading"><span className="setting-section-icon tone-blue"><Globe2 size={18} /></span>Default detail level for new tools</h3>
    <div className="complexity-picker">
      {[
        { value: 'simple', label: 'Simple', desc: 'Core inputs only' },
        { value: 'standard', label: 'Standard', desc: 'Common optional settings' },
        { value: 'advanced', label: 'Advanced', desc: 'Full control surface' },
      ].map(level => (
        <button key={level.value} type="button" className={(settings.complexity || 'standard') === level.value ? 'selected' : ''} onClick={() => setSettings(previous => ({ ...previous, complexity: level.value as 'simple' | 'standard' | 'advanced' }))}>
          <strong>{level.label}</strong>
          <small>{level.desc}</small>
        </button>
      ))}
    </div>
    <p className="field-help">Each calculator also has its own Simple/Standard/Advanced control on the page. This setting is only the default starting point.</p>
    <h3 className="settings-heading"><span className="setting-section-icon tone-blue"><Globe2 size={18} /></span>Location & regional rules</h3>
    <div className="fields-grid">
      <div className="flag-select"><FlagIcon code={settings.country} size={20} /><SelectField label="Country" value={settings.country} onChange={value => store.changeCountry(value as CountryId)} options={Object.entries(countries).map(([value, item]) => ({ value, label: item.name }))} /></div>
      <div className="flag-select"><FlagIcon code={settings.region} country={settings.country} region size={20} /><SelectField label={country.regionLabel} value={settings.region} onChange={store.changeRegion} options={country.regions.map(item => ({ value: item.id, label: item.name }))} /></div>
    </div>
    <div className="section-gap"><label className="standalone-label" htmlFor="local-area">City, district, or local area</label><input className="standalone-input" id="local-area" list="local-areas" value={settings.city} onChange={event => setSettings(previous => ({ ...previous, city: event.target.value.slice(0, 100) }))} placeholder="Optional" maxLength={100} /><datalist id="local-areas">{region.cities.map(city => <option key={city} value={city} />)}</datalist></div>
    <p className="field-help">Local areas are labels, not automatic tax lookups. Enter municipal taxes or other local costs in the calculator's additional options.</p>
    <Toggle label="Follow regional presets" checked={settings.regionalPresets !== false} onChange={value => setSettings(previous => ({ ...previous, regionalPresets: value }))} description="When location changes, update untouched cost estimates and interest conventions. Custom values are preserved." />
    <h3 className="settings-heading"><span className="setting-section-icon tone-purple"><Palette size={18} /></span>Display & input guidance</h3>
    <div className="fields-grid">
      <SelectField label="Decimal places" value={String(settings.precision)} onChange={value => setSettings(previous => ({ ...previous, precision: Number(value) }))} options={[0, 2, 4, 6].map(number => ({ value: String(number), label: `${number} decimal places` }))} />
      <SelectField label="Number format" value={settings.locale} onChange={value => setSettings(previous => ({ ...previous, locale: value }))} options={[{ value: 'en-US', label: '1,234.56 (US)' }, { value: 'en-GB', label: '1,234.56 (UK)' }, { value: 'de-DE', label: '1.234,56 (German)' }, { value: 'fr-FR', label: '1 234,56 (French)' }]} />
      <SelectField label="Appearance" value={settings.appearance} onChange={value => setSettings(previous => ({ ...previous, appearance: value === 'ink' ? 'ink' : 'light' }))} options={[{ value: 'light', label: 'Light' }, { value: 'ink', label: 'Dark' }]} />
    </div>
    <div className="manual-mode-note"><span className="setting-section-icon tone-blue"><Check size={17} /></span><span><strong>Manual result updates</strong><small>Results change only after you press Calculate. Editing an input never changes the displayed result until you confirm it.</small></span></div>
    <Toggle label="Show helpful input notes" checked={settings.showHints !== false} onChange={value => setSettings(previous => ({ ...previous, showHints: value }))} description="Explain methods, units, and assumptions next to the relevant controls." />
    <h3 className="settings-heading"><span className="setting-section-icon tone-pink"><ShieldCheck size={18} /></span>Privacy & calculation safety</h3>
    <Toggle label="Remember inputs between visits" checked={settings.rememberInputs !== false} onChange={value => setSettings(previous => ({ ...previous, rememberInputs: value }))} description="Keep current inputs in this browser. Turning this off removes the automatic input draft; explicitly saved results and history are kept." />
    <p className="safety-note"><ShieldCheck size={16} />Range validation, safe expression evaluation, and numerical consistency checks are always enabled.</p>
    <p className="data-notice">No account is used. Inputs and saved calculations stay in your browser. Currency requests send only the currency pair and optional date to the rate provider.</p>
  </Dialog>;
}

export function ExportDialog({ store, onClose }: { store: CalculatorStore; onClose: () => void }) {
  const [type, setType] = useState<'summary' | 'schedule' | 'json'>('summary');
  const options = [
    { value: 'summary' as const, label: 'CSV summary', description: 'Inputs, results, and calculation assumptions. Opens in spreadsheet applications.' },
    ...(store.result?.schedule ? [{ value: 'schedule' as const, label: 'CSV payment schedule', description: `All ${store.result.schedule.length} payments, including principal, interest, and balance.` }] : []),
    { value: 'json' as const, label: 'JSON data', description: 'Full structured calculation data for use in other tools.' },
  ];
  return <Dialog title="Export calculation" onClose={onClose} footer={<><button className="secondary-button" onClick={() => { onClose(); setTimeout(() => window.print(), 150); }}><Printer size={16} />Print page</button><button className="primary-button" disabled={store.dirty || !store.result} onClick={() => { exportCalculation(store, type); onClose(); }}><Download size={17} />Download</button></>}>
    <p className="dialog-description">Choose a format. Exports include the assumptions behind the result.</p>
    <div className="export-options">{options.map(option => <label key={option.value}><input type="radio" name="export-format" value={option.value} checked={type === option.value} onChange={() => setType(option.value)} /><span><strong>{option.label}</strong><small>{option.description}</small></span></label>)}</div>
  </Dialog>;
}

export function ReferenceDialog({ onClose }: { onClose: () => void }) {
  const checks = useMemo(runEngineChecks, []);
  const modules = useMemo(() => tools.map(tool => {
    const values = { ...tool.defaults, ...(tool.id === 'currency' ? { source: 'manual' } : {}) };
    const output = processCalculation(tool.id, values, { ...defaultSettings, currency: 'USD' });
    return { tool, audit: output.result?.audit };
  }), []);
  return <Dialog title="Formulas and references" onClose={onClose} className="reference-dialog">
    <p className="source-summary">{mappedRegionalFlagCount} mapped regional flags use referenced Wikimedia Commons files. Jurisdictions without a current mapped official flag use a text identifier.</p>
    <div className="reference-formulas">{modules.map(({tool, audit}) => <details key={tool.id}><summary>{tool.title}<span>{audit?.formulas?.length || 0} formulas</span></summary><div className="reference-method-list">{audit?.formulas?.map(item => <div key={item.id}><strong>{item.title}</strong><code>{item.expression}</code></div>) || <code>{toolById[tool.id].formula}</code>}</div></details>)}</div>
    <h3 className="settings-heading">Tax and exchange-rate sources</h3>
    <p className="field-help">Exchange-rate data refreshes automatically when the Currency Converter requests a pair and is validated with its returned date. Tax tables are versioned reference packs with source-year labels; source links are kept visible so updated tables can replace the pack without changing the calculation method. Unsupported regions use explicitly labeled custom estimates. Property-tax presets are planning assumptions, not assessed property bills.</p>
    <div className="source-links">{referenceSources.map(source => <a href={source.url} target="_blank" rel="noreferrer" key={source.url}>{source.name}<ArrowUpRight size={16} /></a>)}</div>
    <details className="engine-diagnostics"><summary>Calculation engine checks <span>{checks.filter(check => check.passed).length} / {checks.length} passed</span></summary><p>These checks run in this browser. They cover representative numerical cases, not every tax rule or financial situation.</p>{checks.map(check => <div key={check.name} className={check.passed ? 'check-passed' : 'check-failed'}>{check.passed ? <Check size={15} /> : <X size={15} />}<span>{check.name}</span><small>{check.detail}</small></div>)}</details>
    <h3 className="settings-heading">Privacy and usage</h3>
    <p className="field-help">No login or registration is required. Calculations use a local rule-based processing system for input validation, transformations, numerical checks, and target solving. Numerical answers come from explicit formulas, not a language model. No tax returns, payments, or trades are submitted.</p>
    <p className="field-help">Press <kbd>Ctrl / Cmd + Enter</kbd> to calculate. Use arrow keys to move between calculation tabs.</p>
  </Dialog>;
}
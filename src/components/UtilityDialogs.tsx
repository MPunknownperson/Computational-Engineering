import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Check, Download, Globe2, Palette, Printer, ShieldCheck, Smartphone, X } from 'lucide-react';
import Dialog from './Dialog';
import { SelectField, Toggle } from './Fields';
import type { CalculatorStore } from '../hooks/useCalculators';
import { referenceSources } from '../lib/regions';
import { mappedRegionalFlagCount } from './FlagIcon';
import { exportCalculation } from '../lib/export';
import { runEngineChecksResponsive } from '../lib/checks';
import type { EngineCheck } from '../lib/checks';
import { toolById, tools } from '../lib/catalog';
import { defaultSettings } from '../lib/regions';
import { processCalculation } from '../lib/processing';
import LocationFields from './LocationFields';
import { countryLocale, numberFormats } from '../lib/regionalSettings';
import type { DeviceEnvironment } from '../hooks/useDeviceEnvironment';
import { ProgressBar } from './motion';

export function SettingsDialog({ store, device, onClose }: { store: CalculatorStore; device: DeviceEnvironment; onClose: () => void }) {
  const { settings, setSettings } = store;
  const platform = { ios: 'iOS', ipados: 'iPadOS', android: 'Android', other: 'Browser' }[device.platform];
  return <Dialog title="Calculator settings" onClose={onClose} className="settings-dialog" footer={<button className="primary-button" onClick={onClose}>Done</button>}>
    <p className="dialog-description">Changes apply immediately and are saved on this device.</p>
    <h3 className="settings-heading"><span className="setting-section-icon tone-blue"><Globe2 size={18} /></span>Default detail level for new tools</h3>
    <div className="complexity-picker">
      {[
        { value: 'simple', label: 'Simple', desc: 'Core inputs only' },
        { value: 'standard', label: 'Standard', desc: 'Common optional settings' },
        { value: 'advanced', label: 'Advanced', desc: 'Full control surface' },
      ].map(level => (
        <button key={level.value} type="button" aria-pressed={(settings.complexity || 'standard') === level.value} className={(settings.complexity || 'standard') === level.value ? 'selected' : ''} onClick={() => setSettings(previous => ({ ...previous, complexity: level.value as 'simple' | 'standard' | 'advanced' }))}>
          <strong>{level.label}</strong>
          <small>{level.desc}</small>
        </button>
      ))}
    </div>
    <p className="field-help">Each calculator also has its own Simple/Standard/Advanced control on the page. This setting is only the default starting point.</p>
    <h3 className="settings-heading"><span className="setting-section-icon tone-blue"><Globe2 size={18} /></span>Location & regional rules</h3>
    <LocationFields store={store} />
    <Toggle label="Follow regional presets" checked={settings.regionalPresets !== false} onChange={value => setSettings(previous => ({ ...previous, regionalPresets: value }))} description="When location changes, update untouched cost estimates and interest conventions. Custom values are preserved." />
    <h3 className="settings-heading"><span className="setting-section-icon tone-purple"><Palette size={18} /></span>Display & input guidance</h3>
    <div className="fields-grid">
      <SelectField label="Decimal places" value={String(settings.precision)} onChange={value => setSettings(previous => ({ ...previous, precision: Number(value) }))} options={[0, 2, 4, 6].map(number => ({ value: String(number), label: `${number} decimal places` }))} />
      <SelectField label="Number format" value={settings.locale} onChange={value => setSettings(previous => ({ ...previous, locale: value, followCountryFormat: false }))} options={numberFormats} />
      <SelectField label="Appearance" value={settings.appearance} onChange={value => setSettings(previous => ({ ...previous, appearance: value === 'ink' ? 'ink' : 'light' }))} options={[{ value: 'light', label: 'Light' }, { value: 'ink', label: 'Dark' }]} />
    </div>
    <Toggle label="Follow the country's number format" checked={settings.followCountryFormat === true} onChange={value => setSettings(previous => ({ ...previous, followCountryFormat: value, locale: value ? countryLocale(previous.country) : previous.locale }))} description="Change separators and grouping when you choose a country. This does not translate the interface or convert currency amounts." />
    <h3 className="settings-heading"><span className="setting-section-icon tone-blue"><Smartphone size={18} /></span>Screen & touch</h3>
    <p className="device-context">{platform} &middot; {device.width} x {device.height} viewport &middot; {device.touch ? 'Touch-capable' : 'Pointer input'}</p>
    <SelectField label="Calculator layout" value={settings.layout || 'auto'} onChange={value => setSettings(previous => ({ ...previous, layout: value === 'stacked' ? 'stacked' : 'auto' }))} options={[{ value: 'auto', label: 'Responsive (recommended)' }, { value: 'stacked', label: 'Always put results below inputs' }]} />
    <Toggle label="Swipe between calculator views" checked={settings.swipeNavigation !== false} onChange={value => setSettings(previous => ({ ...previous, swipeNavigation: value }))} description="Horizontal swipes switch tabs. Fields, scrolling tables, pinch zoom and browser-edge gestures are left alone." />
    <Toggle label="Always use larger controls" checked={settings.comfortableControls === true} onChange={value => setSettings(previous => ({ ...previous, comfortableControls: value }))} description="Use comfortable 48-pixel targets with a mouse too. Touch devices receive them automatically." />
    <Toggle label="Move to the result after calculating" checked={settings.showResultAfterCalculate !== false} onChange={value => setSettings(previous => ({ ...previous, showResultAfterCalculate: value }))} description="When the layout is stacked, close the keyboard and move to your confirmed result. Invalid inputs stay in view." />
    <p className="field-help">Layout follows available space, including tablet split view and rotation. Safe-area insets and on-screen keyboards are handled where the browser exposes them. Motion follows your system's reduced-motion preference.</p>
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
  const [checks, setChecks] = useState<EngineCheck[]>([]);
  const [running, setRunning] = useState(false);
  const [total, setTotal] = useState(0);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function runChecks() {
    controller.current?.abort();
    const run = new AbortController();
    controller.current = run;
    setRunning(true);
    setChecks([]);
    await runEngineChecksResponsive((results, count) => { setChecks(results); setTotal(count); }, run.signal);
    if (!run.signal.aborted) setRunning(false);
  }
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
    <details className="engine-diagnostics">
      <summary>Calculation engine checks <span>{running ? `${checks.length} / ${total || '...'} checked` : checks.length ? `${checks.filter(check => check.passed).length} / ${checks.length} passed` : 'Not run'}</span></summary>
      <p>Run the checks on this device. They cover numerical examples, regional settings and gesture thresholds, not every tax rule or browser interaction.</p>
      <button type="button" className="secondary-button" disabled={running} onClick={runChecks}>{running ? 'Checking...' : checks.length ? 'Run checks again' : 'Run checks on this device'}</button>
      {running && <div className="check-progress"><ProgressBar progress={total ? checks.length / total : 0} label="Running verification checks" /><span className="shimmer-text">Verifying calculations, regions, solvers and animation…</span></div>}
      <p role="status" aria-live="polite">{running ? 'Verification is running. You can close this dialog to cancel.' : checks.length ? `Finished: ${checks.filter(check => check.passed).length} of ${checks.length} checks passed.` : 'No calculation inputs leave your device.'}</p>
      {checks.map(check => <div key={check.name} className={check.passed ? 'check-passed' : 'check-failed'}>{check.passed ? <Check size={15} /> : <X size={15} />}<span>{check.name}</span><small>{check.detail}</small></div>)}
    </details>
    <h3 className="settings-heading">Computation and modelling layer</h3>
    <p className="field-help">Confirmed results always come from the deterministic tool modules. On top of them the app runs a shared numerical layer: a memoized evaluation cache, central-difference sensitivity analysis, a bracketed secant/bisection solver for target seeking, and a cross-module graph that feeds one module's output into another. Computation insights shows each of these for your current inputs.</p>
    <p className="field-help">The response model in Computation insights is a small neural network trained in your browser on samples generated by the exact engine. It is a measured approximation used for interactive exploration, reported with held-out R&sup2;, mean and worst-case error, and it never replaces a confirmed result. There is no external AI service, no model download and no data upload; training runs in time-sliced frames so the interface stays responsive and can be cancelled.</p>
    <h3 className="settings-heading">Privacy and usage</h3>
    <p className="field-help">No login or registration is required. Calculations use a local rule-based processing system for input validation, transformations, numerical checks, and target solving. Numerical answers come from explicit formulas, not a language model. No tax returns, payments, or trades are submitted.</p>
    <p className="field-help">Press <kbd>Ctrl / Cmd + Enter</kbd> to calculate. Use arrow keys to move between calculation tabs.</p>
  </Dialog>;
}
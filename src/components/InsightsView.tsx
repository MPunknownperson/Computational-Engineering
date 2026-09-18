import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivitySquare, ArrowRight, BrainCircuit, CircuitBoard, Gauge, Network, ShieldCheck, TriangleAlert } from 'lucide-react';
import { AnimatedNumber, ProgressBar, Reveal, useStagger } from './motion';
import { formatMoney, formatNumber, parseNumericValue } from '../lib/format';
import { toolById } from '../lib/catalog';
import { sensitivity, trainSurrogate } from '../lib/engine/analysis';
import type { SensitivityEntry, SurrogateModel } from '../lib/engine/analysis';
import { buildCollaboration } from '../lib/engine/collaboration';
import { ComputationAborted } from '../lib/engine/scheduler';
import type { CalculationContext, ToolId, Values } from '../lib/types';

interface Props {
  tool: ToolId;
  values: Values;
  ctx: CalculationContext;
  data: Record<ToolId, Values>;
  onApply: (values: Values) => void;
}

export default function InsightsView({ tool, values, ctx, data, onApply }: Props) {
  const drivers = useMemo(() => sensitivity(tool, values, ctx), [tool, values, ctx]);
  const collaboration = useMemo(() => buildCollaboration(data, ctx), [data, ctx]);
  const money = (value: number, currency = ctx.currency) => formatMoney(value, currency, ctx.precision, ctx.locale);
  const driverDelays = useStagger(drivers.length);
  const linkDelays = useStagger(collaboration.links.length);

  return <div className="insights-view content-enter">
    <header className="insights-intro">
      <span className="insights-icon"><CircuitBoard size={22} /></span>
      <div>
        <h2>Computation insights</h2>
        <p>Every figure here is produced by the same deterministic modules as your confirmed result. The response model below is trained on this device and is reported with its measured error.</p>
      </div>
    </header>

    <section className="insights-section">
      <h3><Gauge size={17} />Input sensitivity</h3>
      <p className="insights-note">Central-difference response of the exact engine: the effect on the result of increasing each input by 1%.</p>
      {drivers.length ? <ul className="driver-list">
        {drivers.map((driver, index) => <Reveal key={driver.key} as="li" delay={driverDelays[index]}><DriverRow driver={driver} format={money} /></Reveal>)}
      </ul> : <p className="insights-empty">This tool has no comparable numeric drivers for the current method.</p>}
    </section>

    <SurrogateSection tool={tool} values={values} ctx={ctx} onApply={onApply} />

    <section className="insights-section">
      <h3><Network size={17} />Cross-module collaboration</h3>
      <p className="insights-note">Each item runs several independent modules in sequence, passing one module's output into the next.</p>
      {collaboration.links.length ? <div className="collaboration-grid">
        {collaboration.links.map((link, index) => <Reveal key={link.id} as="article" delay={linkDelays[index]} className="collaboration-card">
          <div className="collaboration-chain">{link.chain.map(id => <span key={id}>{toolById[id].short}</span>)}</div>
          <h4>{link.title}</h4>
          <strong>{link.format === 'money' ? money(link.value, link.currency) : link.format === 'percent' ? `${formatNumber(link.value, 1, ctx.locale)}%` : formatNumber(link.value, ctx.precision, ctx.locale)}</strong>
          <p>{link.detail}</p>
          <small>{link.method}</small>
          {link.caution && <p className="collaboration-caution"><TriangleAlert size={13} />{link.caution}</p>}
        </Reveal>)}
      </div> : <p className="insights-empty">Complete the income tax inputs to link modules together.</p>}
      {collaboration.unavailable.length > 0 && <ul className="collaboration-missing">
        {collaboration.unavailable.map(item => <li key={item.title}><strong>{item.title}:</strong> {item.reason}</li>)}
      </ul>}
    </section>
  </div>;
}

function DriverRow({ driver, format }: { driver: SensitivityEntry; format: (value: number) => string }) {
  return <li>
    <div className="driver-head">
      <span>{driver.label}</span>
      <strong className={driver.delta > 0 ? 'delta-up' : driver.delta < 0 ? 'delta-down' : ''}>{driver.delta > 0 ? '+' : ''}{format(driver.delta)}</strong>
    </div>
    <div className="driver-bar"><span style={{ width: `${Math.max(3, driver.share * 100)}%` }} /></div>
    <small>Elasticity {driver.elasticity.toFixed(2)} &middot; {(driver.share * 100).toFixed(0)}% of the combined movement</small>
  </li>;
}

function SurrogateSection({ tool, values, ctx, onApply }: { tool: ToolId; values: Values; ctx: CalculationContext; onApply: (values: Values) => void }) {
  const [model, setModel] = useState<SurrogateModel | null>(null);
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<'idle' | 'training' | 'ready' | 'failed'>('idle');
  const [field, setField] = useState('');
  const [probe, setProbe] = useState('');
  const [verified, setVerified] = useState(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    controller.current?.abort();
    setModel(null); setState('idle'); setProgress(0); setField(''); setProbe(''); setVerified(false);
  }, [tool, ctx.country, ctx.region, values.method]);
  useEffect(() => () => controller.current?.abort(), []);

  async function train() {
    controller.current?.abort();
    const run = new AbortController();
    controller.current = run;
    setState('training');
    setProgress(0);
    try {
      const trained = await trainSurrogate(tool, values, ctx, { signal: run.signal, onProgress: (done, total) => setProgress(done / total) });
      if (run.signal.aborted) return;
      setModel(trained);
      setState(trained ? 'ready' : 'failed');
      if (trained) { setField(trained.fields[0].key); setProbe(values[trained.fields[0].key] ?? ''); }
    } catch (error) {
      if (!(error instanceof ComputationAborted)) setState('failed');
    }
  }

  const active = model?.fields.find(item => item.key === field);
  const candidate = active ? { ...values, [active.key]: probe } : values;
  const predicted = model && active ? model.predict(candidate) : null;
  const exact = model && active && verified ? model.verify(candidate) : null;
  const drift = predicted && exact !== null ? Math.abs(predicted.value - exact) : null;

  return <section className="insights-section">
    <h3><BrainCircuit size={17} />Trained response model</h3>
    <p className="insights-note">An ensemble of small neural networks is trained here, in your browser, on samples generated by the exact engine. Members are seeded independently, so their disagreement is a genuine uncertainty signal. It never replaces a confirmed result.</p>
    {state === 'idle' && <button type="button" className="secondary-button" onClick={train}>Train on this calculation</button>}
    {state === 'training' && <div className="training-progress">
      <ProgressBar progress={progress} label="Training the response model" />
      <span className="shimmer-text">Sampling the exact engine and fitting {3} networks: {Math.round(progress * 100)}%</span>
    </div>}
    {state === 'failed' && <p className="insights-empty">The model could not reach a usable accuracy for these inputs. The exact engine remains available and unchanged.</p>}
    {state === 'ready' && model && <>
      <dl className="model-metrics">
        <div><dt>Held-out R&sup2;</dt><dd>{model.report.r2.toFixed(4)}</dd></div>
        <div><dt>Mean absolute error</dt><dd>{formatNumber(model.report.mae, 2, ctx.locale)}</dd></div>
        <div><dt>Worst member error</dt><dd>{model.report.mape.toFixed(2)}%</dd></div>
        <div><dt>Worst case</dt><dd>{formatNumber(model.report.worst, 2, ctx.locale)}</dd></div>
        <div><dt>Ensemble members</dt><dd>{model.members}</dd></div>
        <div><dt>Samples</dt><dd>{model.report.samples}</dd></div>
      </dl>
      <p className={model.usable ? 'model-verdict is-usable' : 'model-verdict'}>{model.usable
        ? 'Every member is within 5% on held-out samples, so previews are shown. Press Calculate for the exact figure.'
        : 'At least one member is outside the 5% threshold, so this model is reported but should not be relied on. Use the exact engine.'}</p>
      <div className="probe-row">
        <label>
          <span>Explore input</span>
          <select value={field} onChange={event => { setField(event.target.value); setProbe(values[event.target.value] ?? ''); setVerified(false); }}>
            {model.fields.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
        </label>
        {active && <label>
          <span>Value between {formatNumber(active.min, 0, ctx.locale)} and {formatNumber(active.max, 0, ctx.locale)}</span>
          <input type="range" min={active.min} max={active.max} step={active.integer ? 1 : (active.max - active.min) / 100} value={parseNumericValue(probe) || active.min} onChange={event => { setProbe(event.target.value); setVerified(false); }} />
        </label>}
      </div>
      <div className="probe-result">
        <span>Predicted result</span>
        <strong>{predicted === null ? 'Outside the trained range' : <AnimatedNumber value={predicted.value} format={value => formatNumber(value, ctx.precision, ctx.locale)} />}</strong>
        {predicted && <span className="probe-interval">95% ensemble interval {formatNumber(predicted.interval[0], ctx.precision, ctx.locale)} to {formatNumber(predicted.interval[1], ctx.precision, ctx.locale)}</span>}
        <small><ActivitySquare size={13} />Estimated by the local ensemble, not a confirmed calculation.</small>
      </div>
      <div className="probe-actions">
        <button type="button" className="secondary-button" onClick={() => setVerified(true)} disabled={!predicted}><ShieldCheck size={15} />Check against the exact engine</button>
        {active && <button type="button" className="primary-button" onClick={() => onApply({ [active.key]: String(parseNumericValue(probe) || active.min) })}>
          Use this value<ArrowRight size={16} />
        </button>}
      </div>
      {verified && exact !== null && drift !== null && <p className="verify-result">
        Exact engine returns <strong>{formatNumber(exact, ctx.precision, ctx.locale)}</strong>. The prediction is off by {formatNumber(drift, ctx.precision, ctx.locale)}
        {Math.abs(exact) > 1e-9 ? ` (${((drift / Math.abs(exact)) * 100).toFixed(2)}%)` : ''}.
      </p>}
      {verified && exact === null && <p className="verify-result">The exact engine rejected that combination of inputs, so there is nothing to compare against.</p>}
    </>}
  </section>;
}

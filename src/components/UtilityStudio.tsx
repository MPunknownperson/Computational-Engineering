import { brand } from '../lib/legal';
import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { ArrowRight, Check, Cpu, Download, Gauge, Plus, Ruler, Sigma, Sparkles, Star, Trash2, Upload, Wand2 } from 'lucide-react';
import { currencies, unitGroups } from '../lib/catalog';
import { convertUnit } from '../lib/calculations';
import { formatNumber, parseNumericValue } from '../lib/format';
import { processCalculation } from '../lib/processing';
import {
  applyConstants, createId, exportWorkspace, importWorkspace, installCustomUnits, loadWorkspace,
  rankUsage, saveWorkspace, uninstallCustomUnit, validateConstant, validateCustomUnit, workspaceCounts,
} from '../lib/utilityWorkspace';
import type { UtilityWorkspace } from '../lib/utilityWorkspace';
import { adaptivePrecision, analyseSweep, sweep, toSignificant, utilityProbe, utilityRanker, DeltaTracker } from '../lib/engine/optimizer';
import type { CalculationContext, ToolId, Values } from '../lib/types';
import { NumberField, SelectField, TextField } from './Fields';
import { Reveal } from './motion';

export const utilityTools: ToolId[] = ['currency', 'probability', 'scientific', 'units', 'bmi'];
export const isUtilityTool = (tool: ToolId) => utilityTools.includes(tool);

interface Props {
  tool: ToolId;
  values: Values;
  ctx: CalculationContext;
  onApply: (partial: Values) => void;
  onNotify: (message: string) => void;
}

export default function UtilityStudio({ tool, values, ctx, onApply, onNotify }: Props) {
  const [workspace, setWorkspace] = useState<UtilityWorkspace>(() => {
    const loaded = loadWorkspace();
    installCustomUnits(loaded);
    return loaded;
  });
  const delta = useRef(new DeltaTracker());
  const [report, setReport] = useState(() => utilityProbe.report());

  const commit = (next: UtilityWorkspace) => setWorkspace(saveWorkspace(next));
  const counts = workspaceCounts(workspace);

  useEffect(() => {
    utilityRanker.seed([
      ...workspace.pairs.map(item => ({ id: item.id, uses: item.uses, createdAt: item.createdAt })),
      ...workspace.formulas.map(item => ({ id: item.id, uses: item.uses, createdAt: item.createdAt })),
    ]);
  }, [workspace.pairs, workspace.formulas]);

  // Live sweep preview: the optimizer evaluates the exact engine across a range.
  const preview = useMemo(() => {
    const field = sweepField(tool, values);
    if (!field) return null;
    const base = parseNumericValue(values[field.key] ?? '');
    if (!Number.isFinite(base)) return null;
    const span = Math.abs(base) || field.fallbackSpan;
    const from = Math.max(field.min, base - span * 0.5);
    const to = Math.min(field.max, base + span * 0.5);
    const changes = delta.current.compare(values);
    if (changes.singleField && changes.singleField !== field.key) utilityProbe.reused++;
    return utilityProbe.measure(() => {
      const result = sweep(from, to, 96, candidate => {
        const run = processCalculation(tool, { ...values, [field.key]: String(candidate) }, ctx);
        return run.result && typeof run.result.value === 'number' ? run.result.value : NaN;
      });
      utilityProbe.lastSweepPoints = result.inputs.length;
      const clean = result.outputs.filter(Number.isFinite);
      return { field, inputs: result.inputs, outputs: result.outputs, stats: clean.length > 2 ? analyseSweep(Float64Array.from(clean)) : null };
    });
  }, [tool, values, ctx]);

  useEffect(() => { setReport(utilityProbe.report()); }, [preview]);

  return <div className="studio content-enter">
    <header className="studio-head">
      <span className="studio-icon"><Wand2 size={22} /></span>
      <div>
        <h2>Utility studio</h2>
        <p>Build your own units, constants, expressions, pairs and profiles. Everything you save here stays on this device and feeds directly into the deterministic engine.</p>
      </div>
      <dl className="studio-counts">
        <div><dt>Saved items</dt><dd>{counts.total}</dd></div>
        <div><dt>Cache hit rate</dt><dd>{(report.cacheHitRate * 100).toFixed(0)}%</dd></div>
        <div><dt>Avg evaluation</dt><dd>{report.averageMicroseconds.toFixed(0)}µs</dd></div>
      </dl>
    </header>

    {preview && <Reveal as="section" className="studio-card">
      <h3><Gauge size={16} />Live range preview &mdash; {preview.field.label}</h3>
      <p className="studio-note">The optimizer sweeps {preview.inputs.length} points through the exact engine using an unrolled typed-array loop, then reports the shape of the response.</p>
      <SweepChart inputs={preview.inputs} outputs={preview.outputs} current={parseNumericValue(values[preview.field.key] ?? '')} locale={ctx.locale} />
      {preview.stats && <dl className="studio-metrics">
        <div><dt>Minimum</dt><dd>{formatNumber(preview.stats.min, adaptivePrecision(preview.stats.min, ctx.precision), ctx.locale)}</dd></div>
        <div><dt>Maximum</dt><dd>{formatNumber(preview.stats.max, adaptivePrecision(preview.stats.max, ctx.precision), ctx.locale)}</dd></div>
        <div><dt>Mean</dt><dd>{formatNumber(preview.stats.mean, adaptivePrecision(preview.stats.mean, ctx.precision), ctx.locale)}</dd></div>
        <div><dt>Shape</dt><dd>{preview.stats.monotonic}</dd></div>
        <div><dt>Inflections</dt><dd>{preview.stats.inflections.length}</dd></div>
        <div><dt>Frames reused</dt><dd>{report.reusedFrames}</dd></div>
      </dl>}
    </Reveal>}

    {tool === 'units' && <UnitsPanel workspace={workspace} commit={commit} ctx={ctx} values={values} onApply={onApply} onNotify={onNotify} />}
    {tool === 'scientific' && <SciencePanel workspace={workspace} commit={commit} values={values} onApply={onApply} onNotify={onNotify} />}
    {tool === 'currency' && <CurrencyPanel workspace={workspace} commit={commit} values={values} onApply={onApply} onNotify={onNotify} />}
    {tool === 'probability' && <ProbabilityPanel workspace={workspace} commit={commit} values={values} onApply={onApply} onNotify={onNotify} />}
    {tool === 'bmi' && <BodyPanel workspace={workspace} commit={commit} values={values} onApply={onApply} onNotify={onNotify} />}

    <TransferPanel workspace={workspace} setWorkspace={setWorkspace} onNotify={onNotify} />
  </div>;
}

function sweepField(tool: ToolId, values: Values) {
  if (tool === 'currency') return { key: 'amount', label: 'Source amount', min: 0, max: 1e9, fallbackSpan: 1000 };
  if (tool === 'bmi') return { key: 'weight', label: values.units === 'imperial' ? 'Weight (lb)' : 'Weight (kg)', min: 1, max: 600, fallbackSpan: 30 };
  if (tool === 'units') return { key: 'amount', label: 'Measurement', min: -1e9, max: 1e9, fallbackSpan: 100 };
  if (tool === 'scientific' && values.method === 'expression') return { key: 'x', label: 'Variable x', min: -1e6, max: 1e6, fallbackSpan: 10 };
  if (tool === 'probability' && (values.method === 'binomial' || values.method === 'monte-carlo')) return { key: 'p', label: 'Success probability (%)', min: 0, max: 100, fallbackSpan: 40 };
  if (tool === 'probability' && values.method === 'independent') return { key: 'pa', label: 'P(A) (%)', min: 0, max: 100, fallbackSpan: 40 };
  return null;
}

function SweepChart({ inputs, outputs, current, locale }: { inputs: Float64Array; outputs: Float64Array; current?: number; locale: string }) {
  const points: string[] = [];
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < outputs.length; i++) {
    if (!Number.isFinite(outputs[i])) continue;
    if (outputs[i] < min) min = outputs[i];
    if (outputs[i] > max) max = outputs[i];
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  const range = max - min || 1;
  const first = inputs[0], last = inputs[inputs.length - 1];
  const xFor = (i: number) => 44 + (i / (outputs.length - 1)) * 350;
  const yFor = (value: number) => 100 - ((value - min) / range) * 80;
  for (let i = 0; i < outputs.length; i++) {
    if (!Number.isFinite(outputs[i])) continue;
    points.push(`${xFor(i).toFixed(2)},${yFor(outputs[i]).toFixed(2)}`);
  }
  const compact = (value: number) => new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 2 }).format(value);
  const markerIndex = current === undefined ? -1 : Math.round(((current - first) / ((last - first) || 1)) * (outputs.length - 1));
  const marker = markerIndex >= 0 && markerIndex < outputs.length && Number.isFinite(outputs[markerIndex]) ? { x: xFor(markerIndex), y: yFor(outputs[markerIndex]) } : null;
  return <svg className="sweep-chart" viewBox="0 0 400 124" role="img" aria-label={`Response curve across ${inputs.length} sampled inputs from ${compact(first)} to ${compact(last)}`}>
    <defs>
      <linearGradient id="sweep-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--blue)" stopOpacity=".22" />
        <stop offset="100%" stopColor="var(--blue)" stopOpacity="0" />
      </linearGradient>
    </defs>
    {[0, .5, 1].map(factor => <g key={factor}>
      <line x1="44" x2="394" y1={100 - factor * 80} y2={100 - factor * 80} stroke="var(--border)" strokeDasharray="3 3" />
      <text x="2" y={104 - factor * 80} fontSize="9" fill="var(--muted)">{compact(min + range * factor)}</text>
    </g>)}
    <path d={`M ${points[0]} L ${points.join(' L ')} L 394,100 L 44,100 Z`} fill="url(#sweep-fill)" stroke="none" />
    <polyline points={points.join(' ')} fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinejoin="round" />
    {marker && <g>
      <line x1={marker.x} x2={marker.x} y1={20} y2={100} stroke="var(--purple)" strokeDasharray="2 3" />
      <circle cx={marker.x} cy={marker.y} r="4" fill="var(--surface)" stroke="var(--purple)" strokeWidth="2" />
    </g>}
    <text x="44" y="118" fontSize="9" fill="var(--muted)">{compact(first)}</text>
    <text x="394" y="118" fontSize="9" fill="var(--muted)" textAnchor="end">{compact(last)}</text>
  </svg>;
}

function UnitsPanel({ workspace, commit, ctx, values, onApply, onNotify }: PanelProps & { ctx: CalculationContext }) {
  const [draft, setDraft] = useState({ category: values.category || 'length', code: '', name: '', factor: '1', note: '' });
  const check = validateCustomUnit(workspace, draft);
  const categories = Object.entries(unitGroups).filter(([key]) => key !== 'temperature').map(([value, group]) => ({ value, label: group.label }));

  function add() {
    if (!check.ok) { onNotify(check.message); return; }
    const unit = { id: createId(), category: draft.category, code: draft.code, name: draft.name || draft.code, factor: Number(draft.factor), note: draft.note, createdAt: new Date().toISOString() };
    const next = { ...workspace, units: [unit, ...workspace.units] };
    installCustomUnits(next);
    commit(next);
    setDraft({ ...draft, code: '', name: '', factor: '1', note: '' });
    onNotify(`Custom unit ${unit.code} is now available in ${unitGroups[unit.category].label}.`);
  }

  return <Reveal as="section" className="studio-card">
    <h3><Ruler size={16} />Custom units</h3>
    <p className="studio-note">Define a unit by its factor into the category base unit. Custom units join the standard catalog, pass the same dimensional round-trip check, and appear in exports.</p>
    <div className="studio-form">
      <SelectField label="Category" value={draft.category} onChange={value => setDraft({ ...draft, category: value })} options={categories} />
      <TextField label="Unit code" value={draft.code} onChange={value => setDraft({ ...draft, code: value })} placeholder="e.g. furlong" />
      <TextField label="Display name" value={draft.name} onChange={value => setDraft({ ...draft, name: value })} placeholder="Furlong" />
      <NumberField label="Factor into base unit" value={draft.factor} onChange={value => setDraft({ ...draft, factor: value })} locale={ctx.locale} />
    </div>
    <p className={check.ok ? 'studio-valid' : 'studio-invalid'}>{draft.code ? check.message : 'Enter a code and factor to validate the definition.'}</p>
    <button type="button" className="primary-button" onClick={add} disabled={!check.ok}><Plus size={15} />Add unit</button>

    {workspace.units.length === 0 && <EmptyHint>No custom units yet. Try a furlong (201.168 m), a nautical mile (1852 m) or a light-second (299 792 458 m).</EmptyHint>}
    {workspace.units.length > 0 && <ul className="studio-list">
      {workspace.units.map(unit => {
        let sample = '';
        try { sample = `1 ${unit.code} = ${formatNumber(convertUnit(1, unit.category, unit.code, Object.keys(unitGroups[unit.category].units)[0]), 6, ctx.locale)} ${Object.keys(unitGroups[unit.category].units)[0]}`; } catch { sample = 'Pending validation'; }
        return <li key={unit.id}>
          <div><strong>{unit.name}</strong><small>{unitGroups[unit.category]?.label} &middot; {sample}</small></div>
          <div className="studio-actions">
            <button type="button" className="text-button" onClick={() => onApply({ category: unit.category, from: unit.code, to: Object.keys(unitGroups[unit.category].units)[0] })}>Use<ArrowRight size={13} /></button>
            <button type="button" className="icon-button delete-button" aria-label={`Delete ${unit.name}`} onClick={() => { uninstallCustomUnit(unit); commit({ ...workspace, units: workspace.units.filter(item => item.id !== unit.id) }); }}><Trash2 size={15} /></button>
          </div>
        </li>;
      })}
    </ul>}
  </Reveal>;
}

function SciencePanel({ workspace, commit, values, onApply, onNotify }: PanelProps) {
  const [constant, setConstant] = useState({ symbol: '', value: '', note: '' });
  const [formulaName, setFormulaName] = useState('');
  const check = validateConstant(workspace, constant);
  const substitution = applyConstants(values.expression || '', workspace.constants);

  return <>
    <Reveal as="section" className="studio-card">
      <h3><Sigma size={16} />Named constants</h3>
      <p className="studio-note">Constants are substituted into the expression before the allowlisted parser runs, so the sandbox remains unchanged. Reserved names are rejected.</p>
      <div className="studio-form">
        <TextField label="Symbol" value={constant.symbol} onChange={value => setConstant({ ...constant, symbol: value })} placeholder="g0" />
        <TextField label="Value" value={constant.value} onChange={value => setConstant({ ...constant, value })} placeholder="9.80665" />
        <TextField label="Note" value={constant.note} onChange={value => setConstant({ ...constant, note: value })} placeholder="Standard gravity" />
      </div>
      <p className={check.ok ? 'studio-valid' : 'studio-invalid'}>{constant.symbol ? check.message : 'Enter a symbol and value to validate.'}</p>
      <button type="button" className="primary-button" disabled={!check.ok} onClick={() => {
        if (!check.ok) return;
        commit({ ...workspace, constants: [{ id: createId(), symbol: constant.symbol, value: Number(constant.value), note: constant.note, createdAt: new Date().toISOString() }, ...workspace.constants] });
        setConstant({ symbol: '', value: '', note: '' });
        onNotify('Constant saved. Use its symbol inside any expression.');
      }}><Plus size={15} />Save constant</button>
      {workspace.constants.length === 0 && <EmptyHint>No constants yet. Common starting points: g0 = 9.80665, c = 299792458, R = 8.314462618.</EmptyHint>}
      {workspace.constants.length > 0 && <ul className="studio-list">
        {workspace.constants.map(item => <li key={item.id}>
          <div><strong>{item.symbol} = {item.value}</strong><small>{item.note || 'No note'}</small></div>
          <div className="studio-actions">
            <button type="button" className="text-button" onClick={() => onApply({ expression: `${values.expression || ''}${values.expression ? ' + ' : ''}${item.symbol}` })}>Insert</button>
            <button type="button" className="icon-button delete-button" aria-label={`Delete ${item.symbol}`} onClick={() => commit({ ...workspace, constants: workspace.constants.filter(row => row.id !== item.id) })}><Trash2 size={15} /></button>
          </div>
        </li>)}
      </ul>}
      {substitution.applied.length > 0 && <p className="studio-valid">Applied in the current expression: {substitution.applied.join(', ')} &rarr; <code>{substitution.expression}</code></p>}
    </Reveal>

    <Reveal as="section" className="studio-card" delay={70}>
      <h3><Star size={16} />Saved expressions</h3>
      <p className="studio-note">Keep the expressions you reuse, with their variables and angle mode. The ranker surfaces the ones you actually return to.</p>
      <div className="studio-form">
        <TextField label="Name this expression" value={formulaName} onChange={setFormulaName} placeholder="Hypotenuse" />
      </div>
      <button type="button" className="secondary-button" onClick={() => {
        if (!values.expression?.trim()) { onNotify('Enter an expression in the calculator first.'); return; }
        commit({ ...workspace, formulas: [{ id: createId(), name: formulaName || 'Saved expression', expression: values.expression, variables: { x: Number(values.x) || 0, y: Number(values.y) || 0 }, angle: values.angle === 'degrees' ? 'degrees' : 'radians', uses: 0, createdAt: new Date().toISOString() }, ...workspace.formulas] });
        setFormulaName('');
        onNotify('Expression saved to your workspace.');
      }}><Plus size={15} />Save current expression</button>
      {workspace.formulas.length === 0 && <EmptyHint>Nothing saved yet. Build an expression in the calculator, name it here, and it will appear as a one-tap chip.</EmptyHint>}
      {workspace.formulas.length > 0 && <ul className="studio-list">
        {rankUsage(workspace.formulas, 8).map(item => <li key={item.id}>
          <div><strong>{item.name}</strong><small><code>{item.expression}</code> &middot; x={item.variables.x}, y={item.variables.y} &middot; {item.angle}</small></div>
          <div className="studio-actions">
            <button type="button" className="text-button" onClick={() => {
              utilityRanker.observe(item.id, 'scientific');
              commit({ ...workspace, formulas: workspace.formulas.map(row => row.id === item.id ? { ...row, uses: row.uses + 1 } : row) });
              onApply({ method: 'expression', expression: item.expression, x: String(item.variables.x), y: String(item.variables.y), angle: item.angle });
            }}>Load<ArrowRight size={13} /></button>
            <button type="button" className="icon-button delete-button" aria-label={`Delete ${item.name}`} onClick={() => commit({ ...workspace, formulas: workspace.formulas.filter(row => row.id !== item.id) })}><Trash2 size={15} /></button>
          </div>
        </li>)}
      </ul>}
    </Reveal>
  </>;
}

function CurrencyPanel({ workspace, commit, values, onApply, onNotify }: PanelProps) {
  const [pair, setPair] = useState({ from: values.from || 'USD', to: values.to || 'EUR', label: '', spread: values.spread || '0', fee: values.fee || '0' });
  const ranked = useMemo(() => utilityRanker.rank(workspace.pairs.map(item => ({ id: item.id, label: item.label })), 'currency'), [workspace.pairs]);

  return <Reveal as="section" className="studio-card">
    <h3><Sparkles size={16} />Saved conversion pairs</h3>
    <p className="studio-note">Store the pairs you use with their provider spread and fixed fee. The list reorders itself by how often and how recently you use each one.</p>
    <div className="studio-form">
      <SelectField label="From" value={pair.from} onChange={value => setPair({ ...pair, from: value })} options={currencies.map(code => ({ value: code, label: code }))} />
      <SelectField label="To" value={pair.to} onChange={value => setPair({ ...pair, to: value })} options={currencies.map(code => ({ value: code, label: code }))} />
      <TextField label="Label" value={pair.label} onChange={value => setPair({ ...pair, label: value })} placeholder="Payroll transfer" />
      <TextField label="Spread %" value={pair.spread} onChange={value => setPair({ ...pair, spread: value })} />
      <TextField label="Fixed fee" value={pair.fee} onChange={value => setPair({ ...pair, fee: value })} />
    </div>
    <button type="button" className="primary-button" onClick={() => {
      if (pair.from === pair.to) { onNotify('Choose two different currencies.'); return; }
      commit({ ...workspace, pairs: [{ id: createId(), from: pair.from, to: pair.to, label: pair.label || `${pair.from} to ${pair.to}`, spread: Number(pair.spread) || 0, fee: Number(pair.fee) || 0, uses: 0, createdAt: new Date().toISOString() }, ...workspace.pairs] });
      onNotify('Conversion pair saved.');
    }}><Plus size={15} />Save pair</button>
    {workspace.pairs.length === 0 && <EmptyHint>No saved pairs yet. Pairs remember their spread and fee, so a recurring transfer is one tap away.</EmptyHint>}
    {workspace.pairs.length > 0 && <ul className="studio-list">
      {workspace.pairs
        .slice()
        .sort((a, b) => (ranked.find(r => r.id === b.id)?.score || 0) - (ranked.find(r => r.id === a.id)?.score || 0))
        .map(item => <li key={item.id}>
          <div><strong>{item.label}</strong><small>{item.from} &rarr; {item.to} &middot; spread {item.spread}% &middot; fee {item.fee} &middot; {ranked.find(r => r.id === item.id)?.reason}</small></div>
          <div className="studio-actions">
            <button type="button" className="text-button" onClick={() => {
              utilityRanker.observe(item.id, 'currency');
              commit({ ...workspace, pairs: workspace.pairs.map(row => row.id === item.id ? { ...row, uses: row.uses + 1 } : row) });
              onApply({ from: item.from, to: item.to, spread: String(item.spread), fee: String(item.fee) });
            }}>Use<ArrowRight size={13} /></button>
            <button type="button" className="icon-button delete-button" aria-label={`Delete ${item.label}`} onClick={() => commit({ ...workspace, pairs: workspace.pairs.filter(row => row.id !== item.id) })}><Trash2 size={15} /></button>
          </div>
        </li>)}
    </ul>}
  </Reveal>;
}

function ProbabilityPanel({ workspace, commit, values, onApply, onNotify }: PanelProps) {
  const [name, setName] = useState('');
  return <Reveal as="section" className="studio-card">
    <h3><Cpu size={16} />Probability scenarios</h3>
    <p className="studio-note">Save a complete model setup — method, trial counts, probabilities and seed — so a simulation can be reproduced exactly later.</p>
    <div className="studio-form">
      <TextField label="Scenario name" value={name} onChange={setName} placeholder="Batch defect check" />
    </div>
    <button type="button" className="secondary-button" onClick={() => {
      commit({ ...workspace, scenarios: [{ id: createId(), name: name || 'Saved scenario', method: values.method, values: { ...values }, note: `Captured from the ${values.method} model`, createdAt: new Date().toISOString() }, ...workspace.scenarios] });
      setName('');
      onNotify('Scenario saved with its full input set.');
    }}><Plus size={15} />Save current scenario</button>
    {workspace.scenarios.length === 0 && <EmptyHint>No scenarios yet. A saved scenario restores the model, every input and the random seed exactly.</EmptyHint>}
    {workspace.scenarios.length > 0 && <ul className="studio-list">
      {workspace.scenarios.map(item => <li key={item.id}>
        <div><strong>{item.name}</strong><small>{item.method} &middot; {new Date(item.createdAt).toLocaleDateString()}</small></div>
        <div className="studio-actions">
          <button type="button" className="text-button" onClick={() => onApply(item.values)}>Restore<ArrowRight size={13} /></button>
          <button type="button" className="icon-button delete-button" aria-label={`Delete ${item.name}`} onClick={() => commit({ ...workspace, scenarios: workspace.scenarios.filter(row => row.id !== item.id) })}><Trash2 size={15} /></button>
        </div>
      </li>)}
    </ul>}
  </Reveal>;
}

function BodyPanel({ workspace, commit, values, onApply, onNotify }: PanelProps) {
  const [name, setName] = useState('');
  return <Reveal as="section" className="studio-card">
    <h3><Star size={16} />Measurement profiles</h3>
    <p className="studio-note">Keep separate profiles for different people or tracking dates. BMI remains a screening ratio; frame and age context are stored as notes, never folded into the number.</p>
    <div className="studio-form">
      <TextField label="Profile name" value={name} onChange={setName} placeholder="Annual check" />
    </div>
    <button type="button" className="secondary-button" onClick={() => {
      const height = Number(values.height), weight = Number(values.weight);
      if (!(height > 0) || !(weight > 0)) { onNotify('Enter a valid height and weight first.'); return; }
      commit({ ...workspace, profiles: [{ id: createId(), name: name || 'Saved profile', units: values.units === 'imperial' ? 'imperial' : 'metric', height, weight, ageBand: 'adult', frame: 'medium', note: '', createdAt: new Date().toISOString() }, ...workspace.profiles] });
      setName('');
      onNotify('Profile saved on this device.');
    }}><Plus size={15} />Save current measurements</button>
    {workspace.profiles.length === 0 && <EmptyHint>No profiles yet. Save measurements for different people or dates to compare them over time.</EmptyHint>}
    {workspace.profiles.length > 0 && <ul className="studio-list">
      {workspace.profiles.map(item => <li key={item.id}>
        <div><strong>{item.name}</strong><small>{item.height} {item.units === 'imperial' ? 'in' : 'cm'} &middot; {item.weight} {item.units === 'imperial' ? 'lb' : 'kg'} &middot; {new Date(item.createdAt).toLocaleDateString()}</small></div>
        <div className="studio-actions">
          <button type="button" className="text-button" onClick={() => onApply({ units: item.units, height: String(item.height), weight: String(item.weight) })}>Load<ArrowRight size={13} /></button>
          <button type="button" className="icon-button delete-button" aria-label={`Delete ${item.name}`} onClick={() => commit({ ...workspace, profiles: workspace.profiles.filter(row => row.id !== item.id) })}><Trash2 size={15} /></button>
        </div>
      </li>)}
    </ul>}
  </Reveal>;
}

function TransferPanel({ workspace, setWorkspace, onNotify }: { workspace: UtilityWorkspace; setWorkspace: (value: UtilityWorkspace) => void; onNotify: (message: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return <Reveal as="section" className="studio-card" delay={90}>
    <h3><Download size={16} />Workspace transfer</h3>
    <p className="studio-note">Your definitions are stored in this browser only. Export them to move to another device or to keep a backup; import validates every entry before accepting it.</p>
    <div className="studio-actions wide">
      <button type="button" className="secondary-button" onClick={() => {
        const blob = new Blob([exportWorkspace(workspace)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url; anchor.download = `${brand.slug}-workspace-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(anchor); anchor.click(); anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        onNotify('Workspace exported.');
      }}><Download size={15} />Export workspace</button>
      <button type="button" className="secondary-button" onClick={() => input.current?.click()}><Upload size={15} />Import workspace</button>
      <input ref={input} type="file" accept="application/json" hidden onChange={async event => {
        const file = event.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        const outcome = importWorkspace(text);
        if (outcome.workspace) {
          const merged = saveWorkspace(outcome.workspace);
          installCustomUnits(merged);
          setWorkspace(merged);
        }
        onNotify(outcome.message);
        event.target.value = '';
      }} />
    </div>
    <p className="studio-valid"><Check size={14} />Significant-figure guard active: displayed conversions round to {toSignificant(1 / 3, 6)} style precision only at the display layer.</p>
  </Reveal>;
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <div className="studio-empty"><Sparkles size={15} /><p>{children}</p></div>;
}

interface PanelProps {
  workspace: UtilityWorkspace;
  commit: (next: UtilityWorkspace) => void;
  values: Values;
  onApply: (partial: Values) => void;
  onNotify: (message: string) => void;
}

import { ArrowRight, Bookmark, Check, Copy, Download, LoaderCircle, ShieldCheck, TriangleAlert } from 'lucide-react';
import type { CalculationContext, CalculationResult, Part, ToolId } from '../lib/types';
import { formatMoney, formatNumber, formatResult } from '../lib/format';
import { AnimatedNumber } from './motion';

const palette = ['#2855b5', '#9675bf', '#d492b6', '#72869e', '#559587', '#a19bc3'];

function Breakdown({ parts, percent, context, title }: { parts: Part[]; percent: boolean; context: CalculationContext; title: string }) {
  const total = parts.reduce((sum, part) => sum + Math.max(0, part.value), 0);
  return <div className="result-breakdown">
    <h3>{title}</h3>
    <div className="composition-bar" role="img" aria-label={parts.map(part => `${part.label}: ${percent ? formatNumber(part.value * 100) + '%' : formatMoney(part.value, context.currency)}`).join(', ')}>
      {parts.filter(part => part.value > 0).map(part => <span key={part.label} style={{ width: `${part.value / (total || 1) * 100}%`, background: palette[parts.indexOf(part) % palette.length] }} />)}
    </div>
    <dl className="breakdown-list">{parts.map((part, index) => <div key={part.label}><dt><i style={{ background: palette[index % palette.length] }} />{part.label}</dt><dd>{percent ? `${formatNumber(part.value * 100, context.precision, context.locale)}%` : formatMoney(part.value, context.currency, context.precision, context.locale)}</dd></div>)}</dl>
  </div>;
}

function GrowthChart({ result, context }: { result: CalculationResult; context: CalculationContext }) {
  const series = result.series!;
  const min = Math.min(0, ...series.map(point => point.value));
  const max = Math.max(1, ...series.map(point => point.value));
  const points = series.map((point, index) => `${48 + index / Math.max(1, series.length - 1) * 332},${144 - (point.value - min) / (max - min) * 114}`);
  return <div className="growth-chart"><h3>Projected balance</h3><svg viewBox="0 0 410 178" role="img" aria-label={`Balance grows from ${formatMoney(series[0].value, context.currency)} to ${formatMoney(series[series.length - 1].value, context.currency)}`}>
    {[0, .5, 1].map(factor => <g key={factor}><line x1="48" x2="380" y1={144 - factor * 114} y2={144 - factor * 114} stroke="var(--border)" strokeDasharray="3 3" /><text x="1" y={148 - factor * 114}>{new Intl.NumberFormat(context.locale, { notation: 'compact', maximumFractionDigits: 0 }).format(min + (max - min) * factor)}</text></g>)}
    <path d={`M ${points[0]} L ${points.join(' L ')} L 380,144 L 48,144 Z`} fill="var(--blue)" opacity=".07" />
    <polyline points={points.join(' ')} fill="none" stroke="var(--blue)" strokeWidth="2.5" strokeLinejoin="round" className="growth-line" />
    <text x="48" y="169">Year 0</text><text x="329" y="169">Year {series[series.length - 1].label}</text>
  </svg></div>;
}

interface Props {
  result: CalculationResult | null;
  error: string;
  loading: boolean;
  context: CalculationContext;
  tool: ToolId;
  saved: boolean;
  dirty: boolean;
  revision: number;
  onSave: () => void;
  onExport: () => void;
  onDetails: () => void;
  onCopy: () => void;
}

export default function ResultPanel({ result, error, loading, context, tool, saved, dirty, revision, onSave, onExport, onDetails, onCopy }: Props) {
  if (!result || loading) return <aside className="result-pane"><div className="section-heading"><h2><span className="section-number">02</span>Your results</h2></div><div className="result-empty" role={error && !loading ? 'alert' : 'status'}>
    {loading ? <LoaderCircle className="spin" size={26} /> : error ? <TriangleAlert size={26} /> : null}
    <h3>{loading ? 'Loading reference rate' : error ? 'Check your inputs' : 'Ready to calculate'}</h3>
    <p>{loading ? 'Retrieving the daily exchange rate. Your amount is not sent to the provider.' : error || 'Enter your values, then press Calculate. Your result will appear here.'}</p>
  </div></aside>;

  const currency = result.currency || context.currency;
  const value = formatResult(result, context);
  const label = result.label.replace(/^Your /i, '').replace(/^./, char => char.toUpperCase());
  const metricFormat = (number: number | string, format?: string) => typeof number === 'string' ? number : format === 'money' ? formatMoney(number, currency, context.precision, context.locale) : `${formatNumber(number, context.precision, context.locale)}${format === 'percent' ? '%' : ''}`;

  return <aside className={`result-pane ${dirty ? 'is-stale' : ''}`} aria-label="Calculation results">
    <div className="section-heading"><h2><span className="section-number">02</span>Your results</h2><span className={dirty ? 'stale-label' : 'result-mode'}>{dirty ? 'Update required' : context.live ? 'Live calculation' : 'Calculated'}</span></div>
    <div className="result-highlight" key={`${tool}-${revision}`}>
      <div className="result-label-row"><h3>{label}</h3><button type="button" className="icon-button" onClick={onCopy} title="Copy result" aria-label="Copy result"><Copy size={17} /></button></div>
      <div className={`result-value ${value.length > 17 ? 'long-value' : ''}`} role="status" aria-live="polite" aria-atomic="true">
        <strong>{typeof result.value === 'number' && result.format !== 'text'
          ? <AnimatedNumber value={result.value} format={live => formatResult({ ...result, value: live }, context)} />
          : value}</strong>
        {result.suffix && <span>{result.suffix}</span>}
      </div>
      <p>{result.description}</p>

      {result.audit?.module && <div className="module-status"><ShieldCheck size={14} /><span>{result.audit.module.name}</span></div>}
    </div>
    {dirty && <p className="inline-warning">Inputs have changed. Press Calculate to update this result.</p>}
    {result.series ? <GrowthChart result={result} context={{ ...context, currency }} /> : result.breakdown.length > 0 ? <Breakdown parts={result.breakdown} percent={tool === 'probability'} context={{ ...context, currency }} title={tool === 'tax' ? 'Income breakdown' : tool === 'transaction' ? 'Settlement breakdown' : tool === 'car' ? 'Total loan cost' : tool === 'probability' ? 'Outcome probability' : 'Payment breakdown'} /> : tool === 'bmi' ? <div className="bmi-reference"><h3>Adult BMI reference</h3><div className="bmi-scale"><span /><span /><span /><span /><i style={{ left: `${Math.min(98, Math.max(2, (Number(result.value) - 10) / 30 * 100))}%` }} /></div><div className="bmi-scale-labels"><span>18.5</span><span>25</span><span>30</span></div></div> : <div className="result-equation"><h3>Formula</h3><code>{result.formula}</code></div>}
    <dl className="result-metrics">
      {result.centerValue !== undefined && ['mortgage', 'car'].includes(tool) && <div><dt>Loan amount</dt><dd>{formatMoney(result.centerValue, currency, context.precision, context.locale)}</dd></div>}
      {result.metrics.map(metric => <div key={metric.label}><dt>{metric.label}</dt><dd>{metricFormat(metric.value, metric.format)}</dd></div>)}
    </dl>
    <button className="detail-link" onClick={onDetails}>{result.schedule ? 'View repayment schedule' : 'View calculation details'}<ArrowRight size={16} /></button>
    <div className="result-actions"><button className="secondary-button" onClick={onSave} disabled={dirty}>{saved ? <Check size={16} /> : <Bookmark size={16} />}{saved ? 'Save a copy' : 'Save result'}</button><button className="secondary-button" onClick={onExport} disabled={dirty}><Download size={16} />Export</button></div>
    {result.audit && <button className="result-checks" onClick={onDetails}><ShieldCheck size={15} /><span>View input and numerical checks</span><ArrowRight size={13} /></button>}
  </aside>;
}
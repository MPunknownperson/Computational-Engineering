import { brand } from '../lib/legal';
import { useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Download, GitCompareArrows, Info, Target } from 'lucide-react';
import type { CalculationContext, CalculationResult, NetworkNode, ToolId, Values } from '../lib/types';
import { formatMoney, formatNumber, formatResult, parseNumericValue } from '../lib/format';
import { toolById } from '../lib/catalog';
import { countries, getRegion, jurisdictionProfile } from '../lib/regions';
import { goalDefinitions, processCalculation, scenarioValue, solveCalculationGoal } from '../lib/processing';
import { NumberField, SelectField } from './Fields';
import { methodSettings } from '../lib/methods';
import FlagIcon from './FlagIcon';
import ScrollableTable from './ScrollableTable';

export function DetailView({ result, ctx, onExport }: { result: CalculationResult; ctx: CalculationContext; onExport: () => void }) {
  const [group, setGroup] = useState('annual');
  const [page, setPage] = useState(0);
  const currency = result.currency || ctx.currency;
  const table = useMemo(() => {
    if (!result.schedule) return result.table;
    const rows = result.schedule;
    const frequency = result.frequency || 12;
    if (group === 'payments') {
      return {
        columns: ['Payment #', 'Calendar Date', 'Principal Paid', 'Interest Paid', 'Payment Total', 'Remaining Balance'],
        rows: rows.map(row => [
          String(row.period),
          row.date || `Period ${row.period}`,
          formatMoney(row.principal, currency),
          formatMoney(row.interest, currency),
          formatMoney(row.payment, currency),
          formatMoney(row.balance, currency),
        ]),
      };
    }
    const annual: { principal: number; interest: number; payment: number; balance: number; yearCalendar?: number }[] = [];
    rows.forEach(row => {
      const year = Math.floor((row.period - 1) / frequency);
      if (!annual[year]) annual[year] = { principal: 0, interest: 0, payment: 0, balance: 0, yearCalendar: row.yearNumber };
      annual[year].principal += row.principal;
      annual[year].interest += row.interest;
      annual[year].payment += row.payment;
      annual[year].balance = row.balance;
    });
    return {
      columns: ['Year #', 'Calendar Year', 'Annual Principal', 'Annual Interest', 'Year Payments', 'Ending Balance'],
      rows: annual.map((row, index) => [
        `Year ${index + 1}`,
        row.yearCalendar ? String(row.yearCalendar) : `Year ${index + 1}`,
        formatMoney(row.principal, currency),
        formatMoney(row.interest, currency),
        formatMoney(row.payment, currency),
        formatMoney(row.balance, currency),
      ]),
    };
  },[result,group,currency]);
  const pageSize = 12, pages = table ? Math.ceil(table.rows.length / pageSize) : 0;
  const formatNode = (node: NetworkNode) => typeof node.value === 'string' ? node.value : node.format === 'money' ? formatMoney(node.value, currency, ctx.precision, ctx.locale) : `${formatNumber(node.value, ctx.precision, ctx.locale)}${node.format === 'percent' ? '%' : ''}`;
  return <div className="detail-view content-enter"><div className="detail-intro"><div><h2>Calculation details</h2><p>Applied formulas, intermediate values, and numerical checks for this result.</p></div><button className="secondary-button" onClick={onExport}><Download size={16}/>Export calculation</button></div>
    {result.audit?.formulas ? <section className="formula-set"><div className="formula-set-header"><div><span>Calculation module</span><h3>{result.audit.module?.name}</h3></div><strong>{result.audit.formulas.filter(item => item.active).length} active formulas</strong></div><div className="formula-grid">{result.audit.formulas.map(item => <article key={item.id} className={item.active ? 'formula-active' : 'formula-inactive'}><div><span>{item.active ? 'Applied' : 'Alternative'}</span><h4>{item.title}</h4></div><code>{item.expression}</code><p>{item.purpose}</p></article>)}</div>{result.audit.module && <div className="module-links"><span>Works with:</span>{result.audit.module.companionTools.map(tool => <a href={`#${tool}`} key={tool}>{toolById[tool].short}<ArrowRight size={12}/></a>)}</div>}</section> : <div className="formula-reference"><span>Applied formula</span><code>{result.formula}</code></div>}
    {table && <>
      <div className="table-top"><h4>{result.schedule ? 'Your amortization schedule' : 'Calculation breakdown'}</h4>{result.schedule && <select aria-label="Schedule grouping" value={group} onChange={event => { setGroup(event.target.value); setPage(0); }}><option value="annual">By year</option><option value="payments">Every payment</option></select>}</div>
      {result.schedule && <p className="table-note">Loan principal and interest only. Ownership costs are excluded from this schedule.</p>}
      <ScrollableTable label={result.schedule ? 'Amortization schedule' : 'Calculation breakdown'}>
        <table><thead><tr>{table.columns.map(column => <th scope="col" key={column}>{column}</th>)}</tr></thead><tbody>{table.rows.slice(page * pageSize, (page + 1) * pageSize).map((row, index) => <tr key={`${group}-${page}-${index}`}>{row.map((value, i) => <td key={i}>{value}</td>)}</tr>)}</tbody></table>
        {table.rows.length === 0 && <p className="empty-table">No payments are needed for a fully funded purchase.</p>}
      </ScrollableTable>
      {pages > 1 && <div className="table-pagination"><span>Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, table.rows.length)} of {table.rows.length}</span><div><button type="button" className="icon-button" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft size={17} /></button><span aria-live="polite">{page + 1} / {pages}</span><button type="button" className="icon-button" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight size={17} /></button></div></div>}
    </>}
    {result.audit && (
      <section className="calculation-audit">
        <div className="audit-header-row">
          <h3>Calculation checks</h3>
          <span className="audit-badge">{result.audit.version}</span>
        </div>
        <p>{result.audit.method} · {result.audit.inputCount} validated numerical inputs · {new Date(result.audit.computedAt).toLocaleTimeString()}.</p>

        {result.audit.alignment && (
          <div className="official-alignment-card">
            <div className="alignment-badge-row">
              <span className="alignment-status">{result.audit.alignment.status}</span>
              <span className="alignment-year">Reference: {result.audit.alignment.year}</span>
            </div>
            <h4>{result.audit.alignment.authority}: {result.audit.alignment.instrument}</h4>
            <div className="alignment-details">
              <span><strong>Statute Citation:</strong> {result.audit.alignment.citation}</span>
              <span><strong>Effective Date:</strong> {result.audit.alignment.effectiveDate}</span>
            </div>
            <a href={result.audit.alignment.url} target="_blank" rel="noreferrer" className="text-button">
              View official document source <ArrowUpRight size={14} />
            </a>
          </div>
        )}

        {result.regionalStats && <div className="regional-stats-row"><span>{countries[ctx.country].name} / {getRegion(ctx.country, ctx.region).name}</span><span>{result.regionalStats.taxStructure}</span><span>{result.regionalStats.statuteCitation}</span></div>}

        {result.audit.networkNodes && result.audit.networkNodes.length > 0 && (
          <div className="ensemble-matrix-box">
            <h4>{result.audit.module?.name || 'Calculation network'}</h4>
            <ScrollableTable label="Calculation stages and formulas">
              <table>
                <thead>
                  <tr>
                    <th>Stage</th>
                    <th>Purpose</th>
                    <th>Value</th>
                    <th>Applied rule</th>
                  </tr>
                </thead>
                <tbody>
                  {result.audit.networkNodes.map(node => (
                    <tr key={node.id}>
                      <td><strong>{node.label}</strong></td>
                      <td>{node.role}</td>
                      <td><strong>{formatNode(node)}</strong></td>
                      <td className="insight-cell">{node.formulaNote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableTable>
          </div>
        )}

        <div>
          {result.audit.checks.map(check => (
            <div key={check.name}>
              <Check size={17} />
              <span><strong>{check.name}</strong><small>{check.detail}</small></span>
            </div>
          ))}
        </div>
        {result.audit.academicSources?.length ? <div className="evidence-links"><span>Supplementary evidence:</span>{result.audit.academicSources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.institution}<ArrowUpRight size={12}/></a>)}</div> : null}
      </section>
    )}
  </div>;
}

export function ComparisonView({ tool, values, ctx, result, onApply, onRegion }: { tool: ToolId; values: Values; ctx: CalculationContext; result: CalculationResult; onApply: (values: Values) => void; onRegion: (region: string) => void }) {
  return <ScenarioLab tool={tool} values={values} ctx={ctx} result={result} onApply={onApply} onRegion={onRegion} />;
}

interface ScenarioItem {
  id: string;
  kind: 'base' | 'region' | 'year' | 'method' | 'variable' | 'custom';
  label: string;
  values: Values;
  result: CalculationResult | null;
  error: string;
  headline: string;
  context: CalculationContext;
  lawNote?: string;
}

function ScenarioLab({ tool, values, ctx, result, onApply, onRegion }: { tool: ToolId; values: Values; ctx: CalculationContext; result: CalculationResult; onApply: (values: Values) => void; onRegion: (region: string) => void }) {
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [pickRegion, setPickRegion] = useState(countries[ctx.country].regions.find(r => r.id !== ctx.region)?.id || ctx.region);
  const [pickYear, setPickYear] = useState(countries[ctx.country].years.find(y => y.id !== values.year)?.id || values.year || '');
  const [pickMethod, setPickMethod] = useState(methodSettings[tool].options.find(o => o.value !== values[methodSettings[tool].key])?.value || values[methodSettings[tool].key]);
  const [pickField, setPickField] = useState('');
  const regions = countries[ctx.country].regions;
  const fields = tool === 'probability' ? values.method === 'independent' ? [{key:'pa',label:'P(A) (%)'},{key:'pb',label:'P(B) (%)'}] : values.method === 'conditional' ? [{key:'joint',label:'P(A and B) (%)'},{key:'given',label:'P(B) (%)'}] : [{key:'n',label:'Trials / objects'},{key:'k',label:'Successes / selected objects'},...(values.method === 'binomial' ? [{key:'p',label:'Success probability (%)'}] : [])] : tool === 'scientific' ? values.method === 'quadratic' ? [{key:'a',label:'Coefficient a'},{key:'b',label:'Coefficient b'},{key:'c',label:'Constant c'}] : [{key:'x',label:'Variable x'},{key:'y',label:'Variable y'}] : toolById[tool].compareFields;
  const activeField = pickField || fields[0]?.key || 'income';
  const baseLaw = jurisdictionProfile(ctx.country, ctx.region);

  const baseItem: ScenarioItem = {
    id: 'base', kind: 'base', label: 'Current input', values, result, error: '',
    headline: tool === 'tax' ? getRegion(ctx.country, ctx.region).name : 'Current setup',
    context: ctx,
    lawNote: baseLaw.note,
  };

  function run(nextValues: Values, nextCtx: CalculationContext) {
    return processCalculation(tool, nextValues, nextCtx);
  }

  function addRegionScenario() {
    if (scenarios.length >= 4) return;
    const alt = getRegion(ctx.country, pickRegion);
    const nextCtx = { ...ctx, region: alt.id, city: '', county: '' };
    const nextValues = { ...values, county: '', localIncome: 'false', localFixed: 'false' };
    const law = jurisdictionProfile(ctx.country, alt.id);
    const calc = run(nextValues, nextCtx);
    setScenarios(prev => [...prev, {
      id: `region-${alt.id}-${Date.now()}`, kind: 'region', label: `${getRegion(ctx.country, ctx.region).name} → ${alt.name}`,
      values: nextValues, result: calc.result, error: calc.error, headline: alt.name, context: nextCtx, lawNote: law.note,
    }]);
  }

  function addYearScenario() {
    if (scenarios.length >= 4 || tool !== 'tax') return;
    const pack = countries[ctx.country].years.find(y => y.id === pickYear);
    if (!pack) return;
    const nextValues = { ...values, year: pack.id };
    const calc = run(nextValues, ctx);
    setScenarios(prev => [...prev, {
      id: `year-${pack.id}-${Date.now()}`, kind: 'year', label: `${values.year || ctx.taxYear} → ${pack.id}`,
      values: nextValues, result: calc.result, error: calc.error, headline: pack.label, context: ctx, lawNote: `${countries[ctx.country].legalBody} ${pack.label} pack`,
    }]);
  }

  function addMethodScenario() {
    if (scenarios.length >= 4) return;
    const key = methodSettings[tool].key;
    const nextValues = { ...values, [key]: pickMethod };
    const calc = run(nextValues, ctx);
    const name = methodSettings[tool].options.find(o => o.value === pickMethod)?.label || pickMethod;
    setScenarios(prev => [...prev, {
      id: `method-${pickMethod}-${Date.now()}`, kind: 'method', label: `${values[key]} → ${pickMethod}`,
      values: nextValues, result: calc.result, error: calc.error, headline: name, context: ctx,
    }]);
  }

  function addVariableScenario() {
    if (scenarios.length >= 4) return;
    const nextValues = { ...values, [activeField]: scenarioValue(activeField, values[activeField], tool, values) };
    const calc = run(nextValues, ctx);
    const name = fields.find(f => f.key === activeField)?.label || activeField;
    setScenarios(prev => [...prev, {
      id: `var-${activeField}-${Date.now()}`, kind: 'variable', label: `Sweep ${name}`,
      values: nextValues, result: calc.result, error: calc.error, headline: `${name}: ${nextValues[activeField]}`, context: ctx,
    }]);
  }

  function removeScenario(id: string) {
    setScenarios(prev => prev.filter(item => item.id !== id));
  }

  function exportComparison() {
    const rows = [
      ['Scenario', 'Headline', 'Result', 'Suffix', 'Total Income Tax', 'Effective Rate', 'Difference vs Current'],
      [baseItem.label, baseItem.headline, Number(result.value), result.suffix || '', (result.metrics.find(m => m.label === 'Total income tax')?.value || ''), (result.metrics.find(m => m.label === 'Effective income tax rate')?.value || ''), '-'],
      ...scenarios.map(s => [
        s.label,
        s.headline,
        s.result && typeof s.result.value === 'number' ? s.result.value : '',
        s.result?.suffix || '',
        (s.result?.metrics.find(m => m.label === 'Total income tax')?.value || ''),
        (s.result?.metrics.find(m => m.label === 'Effective income tax rate')?.value || ''),
        s.result && typeof s.result.value === 'number' && typeof result.value === 'number' ? s.result.value - result.value : '',
      ]),
    ];
    const csv = rows.map(row => row.map(String).map(s => `"${s.replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${brand.slug}-scenario-comparison-${tool}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const allItems = [baseItem, ...scenarios];
  const validItems = allItems.filter(item => item.result && typeof item.result.value === 'number' && Number.isFinite(item.result.value));
  const metricKeys = result.metrics.map(m => m.label);
  const isTax = tool === 'tax';
  // winner: tax → highest net take-home (most negative tax liability); others → lowest (cheapest) result
  const objectiveFn = (item: ScenarioItem) => isTax ? Number(item.result!.value) : -Number(item.result!.value);
  const winner = validItems.length > 1 ? validItems.reduce((best, item) => objectiveFn(item) > objectiveFn(best) ? item : best, validItems[0]) : undefined;

  return (
    <div className="comparison-view content-enter">
      <div className="detail-intro">
        <div><h2>Scenario Analysis Lab</h2><p>Model and evaluate up to four alternative scenarios against your current inputs. Select a comparison type, view them side-by-side, identify the best outcome, or export to a spreadsheet.</p></div>
        <GitCompareArrows size={25}/>
      </div>

      {/* Current inputs hero row */}
      <div className="scenario-hero-cards">
        {allItems.map((item) => {
          const isWinner = item.result && winner && item.id === winner.id;
          return (
            <div key={item.id} className={`scenario-card ${item.kind === 'base' ? 'is-base' : ''} ${isWinner ? 'is-winner' : ''}`}>
              <div className="scenario-card-topline">
                <span className="scenario-kind">{item.kind === 'base' ? 'Current input' : item.label}</span>
                {item.kind !== 'base' && <button type="button" className="scenario-remove-btn" onClick={() => removeScenario(item.id)} title="Remove scenario"><svg width="10" height="10" viewBox="0 0 10 10"><line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.6"/><line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.6"/></svg></button>}
              </div>
              <strong className="scenario-headline-text">{item.kind === 'region' ? <span className="scenario-flag-title"><FlagIcon code={item.context.region} country={item.context.country} region size={16} />{item.headline}</span> : item.headline}</strong>
              {item.lawNote && <p className="scenario-law">{item.lawNote}</p>}
              <div className="scenario-value-block">
                {item.result ? (
                  <>
                    <strong className="scenario-main-val">{formatResult(item.result, ctx)}</strong>
                    <span className="scenario-suffix">{item.result.suffix}</span>
                  </>
                ) : (
                  <span className="scenario-error-text">{item.error}</span>
                )}
              </div>
              {item.result && typeof result.value === 'number' && typeof item.result.value === 'number' && item.id !== 'base' && (
                <div className={`scenario-delta-chip ${item.result.value > result.value ? 'delta-up' : item.result.value < result.value ? 'delta-down' : 'delta-zero'}`}>
                  {item.result.value > result.value ? '▲' : item.result.value < result.value ? '▼' : '='} {formatMoney(Math.abs(item.result.value - result.value), ctx.currency, ctx.precision, ctx.locale)}
                </div>
              )}
              {isWinner && <span className="winner-badge">{isTax ? 'Highest take-home' : 'Lowest calculated amount'}</span>}
            </div>
          );
        })}
        {scenarios.length < 4 && (
          <button type="button" className="scenario-add-card" onClick={() => {}} disabled>
            <span>Add a comparison</span>
            <small>Choose type below, or add up to 4</small>
          </button>
        )}
      </div>

      <div className="scenario-build-panel">
        <h3>Build a comparison</h3>
        <p>Each card is a full recalculation. Region comparisons use that region’s own tax method, not the national tariff copied onto another place.</p>
        <div className="scenario-build-grid">
          <div className="scenario-build-row">
            <SelectField label="Jurisdiction" value={pickRegion} onChange={setPickRegion} options={regions.filter(r => r.id !== 'OTHER').map(r => ({ value: r.id, label: r.name }))} />
            <button type="button" className="create-btn" disabled={scenarios.length >= 4} onClick={addRegionScenario}>Add region</button>
          </div>
          {tool === 'tax' && countries[ctx.country].years.length > 1 && (
            <div className="scenario-build-row">
              <SelectField label="Reference year" value={pickYear} onChange={setPickYear} options={countries[ctx.country].years.map(y => ({ value: y.id, label: y.label }))} />
              <button type="button" className="create-btn" disabled={scenarios.length >= 4} onClick={addYearScenario}>Add year</button>
            </div>
          )}
          <div className="scenario-build-row">
            <SelectField label="Method" value={pickMethod} onChange={setPickMethod} options={methodSettings[tool].options.map(o => ({ value: o.value, label: o.label }))} />
            <button type="button" className="create-btn" disabled={scenarios.length >= 4} onClick={addMethodScenario}>Add method</button>
          </div>
          <div className="scenario-build-row">
            <SelectField label="Sweep input" value={activeField} onChange={setPickField} options={fields.map(f => ({ value: f.key, label: f.label }))} />
            <button type="button" className="create-btn" disabled={scenarios.length >= 4} onClick={addVariableScenario}>Add sweep</button>
          </div>
        </div>
        {scenarios.length > 0 && <button type="button" className="text-button" onClick={() => setScenarios([])}>Clear comparisons</button>}
        {baseLaw.note && <p className="law-note">{baseLaw.note}</p>}
      </div>

      {/* Metrics comparison table */}
      {scenarios.length > 0 && (
        <div className="scenario-metrics-comparison">
          <div className="table-top">
            <h4>Metric Comparison</h4>
            <button type="button" className="secondary-button mini-btn" onClick={exportComparison}><Download size={13}/> Export CSV</button>
          </div>
          <ScrollableTable label="Scenario comparison metrics">
            <table>
              <thead>
                <tr>
                  <th>Metric / Detail</th>
                  {allItems.map(item => (
                    <th key={item.id} className={winner && item.id === winner.id ? 'winner-col' : ''}>{item.headline}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Calculated Result</strong></td>
                  {allItems.map(item => <td key={item.id}>{item.result ? <strong>{formatResult(item.result, ctx)}</strong> : <span>-</span>}</td>)}
                </tr>
                {metricKeys.map(key => (
                  <tr key={key}>
                    <td>{key}</td>
                    {allItems.map(item => {
                      const m = item.result?.metrics.find(m2 => m2.label === key);
                      const v = m?.value;
                      const formatted = v === undefined ? <span className="muted-dash">-</span> : typeof v === 'number' ? (m?.format === 'money' ? formatMoney(v, ctx.currency, ctx.precision, ctx.locale) : `${formatNumber(v, ctx.precision, ctx.locale)}${m?.format === 'percent' ? '%' : ''}`) : v;
                      return <td key={item.id}>{formatted}</td>;
                    })}
                  </tr>
                ))}
                <tr>
                  <td><strong>Difference vs Current</strong></td>
                  {allItems.map(item => {
                    if (item.id === 'base') return <td key={item.id}>-</td>;
                    if (!item.result || typeof item.result.value !== 'number' || typeof result.value !== 'number') return <td key={item.id}>-</td>;
                    const diff = item.result.value - result.value;
                    return (
                      <td key={item.id} className={diff > 0 ? 'delta-neg' : diff < 0 ? 'delta-pos' : ''}>
                        {diff > 0 ? '+' : ''}{formatMoney(diff, ctx.currency, ctx.precision, ctx.locale)}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </ScrollableTable>
        </div>
      )}

      {scenarios.length === 0 && (
        <div className="scenario-empty-box">
          <p>Select one of the comparison types above to build side-by-side scenarios. Differences, optimality highlights, comparison tables, and CSV exports appear here.</p>
        </div>
      )}

      {/* Apply winner scenario */}
      {winner && winner.id !== 'base' && (
        <div className="comparison-footer">
          <p><Info size={15}/>Recommended scenario based on your current inputs: <strong>{winner.headline} ({scenarios.find(s => s.id === winner.id)?.label})</strong>.</p>
          <button className="primary-button" onClick={() => {
            const winnerItem = scenarios.find(s => s.id === winner.id);
            if (winnerItem) {
              if (isTax) { onApply(winnerItem.values); onRegion(winnerItem.context.region); }
              else onApply(winnerItem.values);
            }
          }}>
            Use the optimal scenario <ArrowRight size={16}/>
          </button>
        </div>
      )}

      {tool === 'tax' && countries[ctx.country]?.years?.length > 1 && (
        <div className="multi-year-matrix section-gap">
          <div className="matrix-heading">
            <h3>Multi-Year Historical Law & Inflation Comparison ({countries[ctx.country].name})</h3>
            <p>Examine how inflation adjustments, standard deduction shifts, and statutory rate brackets across past years impact your exact income.</p>
          </div>
          <ScrollableTable label="Historical tax year comparison">
            <table>
              <thead>
                <tr>
                  <th>Reference Pack</th>
                  <th>Standard Allowance</th>
                  <th>Estimated Total Tax</th>
                  <th>Effective Rate</th>
                  <th>Net Take-Home</th>
                  <th>Switch Year</th>
                </tr>
              </thead>
              <tbody>
                {countries[ctx.country].years.map(pack => {
                  const yearCalc = processCalculation('tax', { ...values, year: pack.id }, ctx);
                  const yr = yearCalc.result;
                  const yrTax = yr?.metrics.find(m => m.label === 'Total income tax')?.value;
                  const effRate = yr?.metrics.find(m => m.label === 'Effective income tax rate')?.value;
                  const isSelected = (values.year || countries[ctx.country].taxYear) === pack.id;
                  const statusKey = values.filing === 'joint' ? 'joint' : values.filing === 'head' ? 'head' : 'single';
                  return (
                    <tr key={pack.id} className={isSelected ? 'is-selected-year' : ''}>
                      <td>
                        <strong>{pack.label}</strong>
                        {isSelected && <span className="current-year-pill">Active</span>}
                      </td>
                      <td>{formatMoney(pack.deduction[statusKey], ctx.currency)}</td>
                      <td>{typeof yrTax === 'number' ? formatMoney(yrTax, ctx.currency) : '-'}</td>
                      <td>{typeof effRate === 'number' ? `${effRate.toFixed(2)}%` : '-'}</td>
                      <td><strong>{yr ? formatResult(yr, ctx) : '-'}</strong></td>
                      <td>
                        <button
                          type="button"
                          className={`secondary-button mini-btn ${isSelected ? 'active-year-btn' : ''}`}
                          onClick={() => onApply({ ...values, year: pack.id })}
                          disabled={isSelected}
                        >
                          {isSelected ? 'Loaded' : `Calculate ${pack.label}`}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollableTable>
        </div>
      )}

      {goalDefinitions[tool] && <GoalSolver key={`${tool}-${JSON.stringify(values)}-${ctx.country}-${ctx.region}`} tool={tool} values={values} ctx={ctx} result={result} onApply={onApply} />}
    </div>
  );
}

function GoalSolver({ tool, values, ctx, result, onApply }: { tool: ToolId; values: Values; ctx: CalculationContext; result: CalculationResult; onApply: (values: Values) => void }) {
  const definition = goalDefinitions[tool]!;
  const [target, setTarget] = useState(typeof result.value === 'number' ? String(Math.round(result.value)) : '1000');
  const [answer, setAnswer] = useState<ReturnType<typeof solveCalculationGoal> | null>(null);
  const [error, setError] = useState('');
  return <details className="goal-solver"><summary><Target size={20} /><span>Solve for a target result<small>Find the {definition.label.toLowerCase()} needed to reach a specific amount.</small></span><span className="goal-open-label">Open solver</span></summary><div className="goal-body"><p>All other inputs stay unchanged. The solver uses the selected method and costs.</p><form onSubmit={event => { event.preventDefault(); try { setAnswer(solveCalculationGoal(tool, values, ctx, parseNumericValue(target))); setError(''); } catch (err) { setAnswer(null); setError(err instanceof Error ? err.message : 'Could not solve the target.'); } }}><NumberField label={definition.targetLabel} value={target} onChange={value => { setTarget(value); setAnswer(null); setError(''); }} locale={ctx.locale} suffix={tool === 'currency' ? values.to : ctx.currency} /><button className="primary-button" type="submit">Find {definition.label.toLowerCase()}<ArrowRight size={16} /></button></form>{error && <p className="field-error" role="alert">{error}</p>}{answer && <div className="goal-answer" role="status"><div><span>{definition.label}</span><strong>{formatMoney(Number(answer.values[definition.field]), tool === 'currency' ? values.from : ctx.currency, ctx.precision, ctx.locale)}</strong><small>Calculated result: {formatResult(answer.result, ctx)} {answer.result.suffix}</small></div><button className="secondary-button" onClick={() => onApply(answer.values)}>Use this value<ArrowRight size={15} /></button></div>}</div></details>;
}
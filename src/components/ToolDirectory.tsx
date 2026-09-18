import { ArrowRight, Bookmark, ChevronRight, Trash2 } from 'lucide-react';
import { tools, toolById } from '../lib/catalog';
import type { Snapshot, ToolId } from '../lib/types';
import { countries, getRegion } from '../lib/regions';
import { formatResult } from '../lib/format';
import type { CalculatorStore } from '../hooks/useCalculators';
import { ToolGlyph } from './ToolGlyph';
import { Reveal } from './motion';

export type ToolGroup = 'All' | 'Financial' | 'Math' | 'Converters' | 'Health';
export function toolGroup(id: ToolId): ToolGroup {
  if (['currency', 'units'].includes(id)) return 'Converters';
  if (['probability', 'scientific'].includes(id)) return 'Math';
  if (id === 'bmi') return 'Health';
  return 'Financial';
}

export function ToolDirectory({ group, onGroup, onOpen }: { group: ToolGroup; onGroup: (group: ToolGroup) => void; onOpen: (tool: ToolId) => void }) {
  const filtered = tools.filter(tool => group === 'All' || toolGroup(tool.id) === group);
  return <section className="directory-section">
    <nav className="directory-filters" aria-label="Calculator categories">{(['All', 'Financial', 'Math', 'Converters', 'Health'] as ToolGroup[]).map(item => <button key={item} onClick={() => onGroup(item)} className={group === item ? 'active' : ''} aria-pressed={group === item}>{item}</button>)}</nav>
    <div className="directory-list">{filtered.map((tool, index) => <Reveal key={tool.id} delay={index * 40}><button className={`directory-tool tone-${tool.accent}`} onClick={() => onOpen(tool.id)}><span className="directory-glyph"><ToolGlyph tool={tool.id} size={48} /></span><div><span className="directory-category">{toolGroup(tool.id)}</span><h2>{tool.title}</h2><p>{tool.description}</p></div><ArrowRight size={20} /></button></Reveal>)}</div>
    {filtered.length === 0 && <div className="empty-state"><h2>No calculators in this category</h2><p>Choose a different category to see the available tools.</p><button className="secondary-button" onClick={() => onGroup('All')}>Show all calculators</button></div>}
  </section>;
}

export function HistoryView({ store, savedOnly, onView, onRestore }: { store: CalculatorStore; savedOnly: boolean; onView: (saved: boolean) => void; onRestore: (entry: Snapshot) => void }) {
  const entries = store.snapshots.filter(entry => !savedOnly || entry.saved);
  return <section>
    <div className="history-toolbar"><div className="directory-filters"><button className={!savedOnly ? 'active' : ''} onClick={() => onView(false)}>Recent calculations</button><button className={savedOnly ? 'active' : ''} onClick={() => onView(true)}>Saved on this device</button></div>{!savedOnly && store.snapshots.some(entry => !entry.saved) && <button className="text-button" onClick={() => { store.setSnapshots(previous => previous.filter(entry => entry.saved)); store.notify('Recent history cleared. Saved calculations were kept.'); }}><Trash2 size={15} />Clear recent</button>}</div>
    <p className="history-note">Stored only in this browser. No account or cloud storage is used.</p>
    {entries.length ? <div className="history-list">{entries.map(entry => <div className="history-row" key={entry.id}>
      <button className="history-open" onClick={() => onRestore(entry)}><strong>{entry.name}</strong><span>{toolById[entry.tool].short} / {getRegion(entry.settings.country, entry.settings.region).name}<span className="history-date">{new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span></span></button>
      <div className="history-value"><strong>{formatResult(entry.result, { ...entry.settings, currency: countries[entry.settings.country].currency })}</strong><small>{entry.result.suffix || entry.result.label}</small></div>
      <button className={`icon-button ${entry.saved ? 'saved-icon' : ''}`} title={entry.saved ? 'Remove from saved' : 'Save calculation'} aria-label={entry.saved ? `Unsave ${entry.name}` : `Save ${entry.name}`} onClick={() => store.setSnapshots(previous => previous.map(item => item.id === entry.id ? { ...item, saved: !item.saved } : item))}><Bookmark size={18} fill={entry.saved ? 'currentColor' : 'none'} /></button>
      <button className="icon-button delete-button" title="Delete calculation" aria-label={`Delete ${entry.name}`} onClick={() => { store.setSnapshots(previous => previous.filter(item => item.id !== entry.id)); store.notify('Calculation deleted.'); }}><Trash2 size={17} /></button>
      <button className="icon-button" onClick={() => onRestore(entry)} aria-label={`Open ${entry.name}`}><ChevronRight size={20} /></button>
    </div>)}</div> : <div className="empty-state"><h2>{savedOnly ? 'No saved calculations' : 'No calculation history'}</h2><p>{savedOnly ? 'Use Save result on a calculator to keep its inputs and results.' : 'Press Calculate in any tool to add a result here.'}</p><button className="primary-button" onClick={() => { window.location.hash = store.active; }}>Open calculator<ArrowRight size={17} /></button></div>}
  </section>;
}

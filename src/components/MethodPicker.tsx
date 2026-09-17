import { ArrowDownRight, ArrowLeftRight, ArrowUpRight, Banknote, CalendarDays, Check, Clock3, Database, Gauge, Globe2, Grid2X2, Infinity, Layers2, MoveUpRight, PencilLine, Percent, Ruler, Scale, Shuffle, Sigma, Thermometer, TrendingUp, Waves } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { methodSettings } from '../lib/methods';
import type { ToolId, Values } from '../lib/types';

const symbols: Record<string, LucideIcon> = { repay: Layers2, interest: Percent, steps: TrendingUp, percent: Percent, balloon: Banknote, growth: TrendingUp, infinity: Infinity, receive: ArrowDownRight, send: ArrowUpRight, globe: Globe2, calendar: CalendarDays, edit: PencilLine, events: Layers2, intersect: ArrowLeftRight, grid: Grid2X2, shuffle: Shuffle, function: Sigma, curve: TrendingUp, ruler: Ruler, weight: Scale, temperature: Thermometer, volume: Waves, speed: Gauge, clock: Clock3, data: Database };

export default function MethodPicker({ tool, values, onChange, hints = true }: { tool: ToolId; values: Values; onChange: (field: string, value: string) => void; hints?: boolean }) {
  const config = methodSettings[tool];
  return <fieldset className={`method-picker ${config.options.length > 3 ? 'many-methods' : ''}`} data-field={config.key}>
    <legend>{config.label}</legend>
    <div className="method-options">{config.options.map(option => {
      const Icon = symbols[option.symbol] || MoveUpRight;
      const selected = values[config.key] === option.value;
      return <label key={option.value} className={`method-option ${selected ? 'selected' : ''}`}>
        <input type="radio" name={`${tool}-method`} value={option.value} checked={selected} onChange={() => onChange(config.key, option.value)} />
        <span className="method-icon"><Icon size={19} strokeWidth={1.8} /></span>
        <span className="method-copy"><strong>{option.label}</strong>{hints && <small>{option.description}</small>}</span>
        <span className="method-check">{selected && <Check size={11} strokeWidth={3} />}</span>
      </label>;
    })}</div>
  </fieldset>;
}
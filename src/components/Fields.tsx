import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { normalizeNumberInput, parseNumericValue } from '../lib/format';

export function NumberField({ label, value, onChange, prefix, suffix, hint, labelAction, className = '', locale = 'en-US', field, error, showHint = false, allowNegative = false }: { label: string; value: string; onChange: (value: string) => void; prefix?: string; suffix?: ReactNode; hint?: string; labelAction?: ReactNode; className?: string; locale?: string; field?: string; error?: string; showHint?: boolean; allowNegative?: boolean }) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const numeric = parseNumericValue(value);
  const invalid = Boolean(error) || value.trim() === '' || !Number.isFinite(numeric);
  const decimal = new Intl.NumberFormat(locale).formatToParts(1.5).find(part => part.type === 'decimal')?.value || '.';
  const display = !focused && value.trim() && Number.isFinite(numeric) ? new Intl.NumberFormat(locale, { maximumFractionDigits: 12 }).format(numeric) : value.replace('.', decimal);
  return <div className={`field ${className}`} data-field={field}>
    <div className="field-label-row"><label htmlFor={id}>{label}{hint && <span title={hint}><Info size={12} /></span>}</label>{labelAction}</div>
    <div className={`input-wrap ${focused ? 'is-focused' : ''} ${invalid ? 'is-invalid' : ''}`}>
      {prefix && <span className="input-prefix">{prefix}</span>}
      {allowNegative && <button type="button" className="input-sign" aria-label={`Change sign of ${label.toLowerCase()}`} onPointerDown={event => event.preventDefault()} onClick={() => onChange(value.startsWith('-') ? value.slice(1) : `-${value || '0'}`)}>+/-</button>}
      <input id={id} type="text" inputMode="decimal" enterKeyHint="done" value={display} onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); if (Number.isFinite(numeric) && value !== String(numeric)) onChange(String(numeric)); }} onChange={event => onChange(normalizeNumberInput(event.target.value,locale))} autoComplete="off" autoCapitalize="off" spellCheck={false} aria-invalid={invalid} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} />
      {suffix && <span className="input-suffix">{suffix}</span>}
    </div>
    {error ? <span id={`${id}-error`} className="field-error">{error}</span> : hint && <span id={`${id}-hint`} className={showHint ? 'field-hint' : 'sr-only'}>{hint}</span>}
  </div>;
}
export function SelectField({ label, value, onChange, options, className = '', children, field, error }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; className?: string; children?: ReactNode; field?: string; error?: string }) {
  const id = useId();
  return <div className={`field ${className}`} data-field={field}><div className="field-label-row"><label htmlFor={id}>{label}</label>{children}</div><div className="select-wrap"><select id={id} value={value} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={event => onChange(event.target.value)}>{!options.some(option => option.value === value) && <option value={value}>{value} (custom)</option>}{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={15} /></div>{error && <span id={`${id}-error`} className="field-error">{error}</span>}</div>;
}
export function TextField({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  const id = useId();
  return <div className="field"><div className="field-label-row"><label htmlFor={id}>{label}</label></div><div className="input-wrap"><input type={type} id={id} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} maxLength={160} /></div></div>;
}
export function Toggle({ label, checked, onChange, description, field }: { label: string; checked: boolean; onChange: (value: boolean) => void; description?: string; field?: string }) {
  return <label className="toggle-row" data-field={field}><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} /><span><span className="toggle-label">{label}</span>{description && <span className="toggle-description">{description}</span>}</span></label>;
}
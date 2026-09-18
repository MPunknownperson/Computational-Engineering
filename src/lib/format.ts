import type { CalculationResult, CalculationContext } from './types';

export function parseNumericValue(value: string): number {
  const match = value.trim().replace(/[$\u00a3\u20ac]/g, '').match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*([kmb])?\s*%?$/i);
  if (!match) return NaN;
  const multipliers: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 };
  return Number(match[1]) * (multipliers[match[2]?.toLowerCase() || ''] || 1);
}

export function normalizeNumberInput(text: string, locale = 'en-US') {
  const raw = text.normalize('NFKC')
    .replace(/[\u0660-\u0669]/g, digit => String(digit.charCodeAt(0) - 0x660))
    .replace(/[\u06f0-\u06f9]/g, digit => String(digit.charCodeAt(0) - 0x6f0))
    .replace(/[\u0966-\u096f]/g, digit => String(digit.charCodeAt(0) - 0x966))
    .replace(/[\s\u061c\u200e\u200f\u202a-\u202e]/g, '').replace(/\u2212/g, '-')
    .replace(/\u066c/g, '').replace(/\u066b/g, '.').replace(/\u066a/g, '%');
  const decimal = new Intl.NumberFormat(locale).formatToParts(1.5).find(part => part.type === 'decimal')?.value || '.';
  if (decimal === ',') {
    if (raw.includes(',')) return raw.replace(/\./g, '').replace(',', '.');
    return /^[+-]?\d{1,3}(\.\d{3})+$/.test(raw) ? raw.replace(/\./g, '') : raw;
  }
  const grouped = /^[+-]?\d{1,3}(,\d{3})+$/.test(raw) || (locale === 'en-IN' && /^[+-]?\d{1,2}(,\d{2})*,\d{3}$/.test(raw));
  if (raw.includes(',') && !raw.includes('.') && !grouped && raw.split(',').length === 2) return raw.replace(',', '.');
  return raw.replace(/,/g, '');
}

export function formatNumber(value: number, precision = 2, locale = 'en-US') {
  if (!Number.isFinite(value)) return 'Not available';
  if (Math.abs(value) >= 1e13 || (value !== 0 && Math.abs(value) < Math.pow(10, -precision))) return value.toExponential(Math.max(2, precision));
  return new Intl.NumberFormat(locale, { minimumFractionDigits: precision, maximumFractionDigits: precision }).format(value);
}
export function formatMoney(value: number, currency = 'USD', precision = 2, locale = 'en-US') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: precision, maximumFractionDigits: precision }).format(value);
}
export function formatResult(result: CalculationResult, ctx: CalculationContext) {
  if (typeof result.value === 'string') return result.value;
  if (result.format === 'money') return formatMoney(result.value, result.currency || ctx.currency, ctx.precision, ctx.locale);
  return `${formatNumber(result.value, ctx.precision, ctx.locale)}${result.format === 'percent' ? '%' : ''}`;
}
export function shortMoney(value: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(value);
}
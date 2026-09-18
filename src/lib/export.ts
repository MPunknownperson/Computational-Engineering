import { brand } from './legal';
import type { CalculatorStore } from '../hooks/useCalculators';

function download(content: string, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function csvCell(value: string | number) {
  const text = typeof value === 'string' && (/^[=+@-]/.test(value) || /^\d{16,}$/.test(value)) ? `'${value}` : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function exportCalculation(store: CalculatorStore, type: 'summary' | 'schedule' | 'json') {
  const { result, dirty, active, values, settings, context, country, region, displayContext } = store;
  if (!result || dirty) return;
  const filename = `${brand.slug}-${active}-${new Date().toISOString().slice(0, 10)}`;
  const metadata: (string | number)[][] = [
    ['Calculator', active], ['Country', country.name], ['Region', region.name],
    ['Local area', settings.city || 'Not specified'], ['Currency', result.currency || context.currency],
    ['Result', result.value], ['Result label', result.label], ['Period / unit', result.suffix || ''], ['Formula', result.formula],
    ...(result.audit ? [['Processing engine', result.audit.version], ['Selected method', result.audit.method], ['Checked numeric inputs', result.audit.inputCount], ...result.audit.checks.map(check => [`Check: ${check.name}`, check.passed ? 'Passed' : 'Failed']), ...result.audit.notes.map(note => ['Processing note', note])] : []),
    ...(context.rateDate ? [['Exchange rate date', context.rateDate], ['Exchange rate', context.rate || '']] : []),
  ];
  if (type === 'json') {
    download(JSON.stringify({ calculator: active, inputs: store.recordValues(), context: displayContext, result, exportedAt: new Date().toISOString() }, null, 2), `${filename}.json`, 'application/json');
  } else {
    const rows: (string | number)[][] = type === 'schedule' && result.schedule
      ? [...metadata, ['', ''], ['Payment', 'Principal', 'Interest', 'Payment amount', 'Remaining balance'], ...result.schedule.map(row => [row.period, row.principal.toFixed(6), row.interest.toFixed(6), row.payment.toFixed(6), row.balance.toFixed(6)]), ['', ''], ...result.warnings.map(warning => ['Assumption', warning])]
      : [...metadata, ['', ''], ['Input', 'Value'], ...Object.entries(values), ['', ''], ['Metric', 'Value'], ...result.metrics.map(metric => [metric.label, metric.value]), ['', ''], ...result.warnings.map(warning => ['Assumption', warning])];
    download('\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n'), `${filename}${type === 'schedule' ? '-schedule' : ''}.csv`, 'text/csv;charset=utf-8');
  }
  store.notify('Export ready. Check your browser downloads.');
}

export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const field = document.createElement('textarea');
    field.value = text; field.style.position = 'fixed'; field.style.opacity = '0';
    document.body.appendChild(field); field.select();
    const success = document.execCommand('copy'); field.remove();
    return success;
  }
}
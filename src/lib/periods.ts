/**
 * Temporal engine.
 *
 * Adds precise period handling on top of the existing annual reference packs:
 * calendar years, fiscal years, months, quarters, pay cycles and specific dates.
 * Every function is pure and deterministic so results can be reproduced exactly.
 */

export type PeriodKind = 'annual' | 'fiscal' | 'quarter' | 'month' | 'biweekly' | 'weekly' | 'daily' | 'custom-range';
export type DayCount = 'actual/actual' | 'actual/365' | 'actual/360' | '30/360';

export interface PeriodSelection {
  kind: PeriodKind;
  year: number;
  month?: number;      // 1-12
  quarter?: number;    // 1-4
  start?: string;      // ISO yyyy-mm-dd for custom ranges
  end?: string;        // ISO yyyy-mm-dd for custom ranges
  fiscalStartMonth?: number; // 1-12, April = 4 for UK/IN/JP conventions
}

export interface ResolvedPeriod {
  label: string;
  start: Date;
  end: Date;
  days: number;
  /** Multiplier converting a period figure into an annual figure. */
  annualMultiplier: number;
  /** Divisor converting an annual figure back into the displayed period. */
  displayDivisor: number;
  fractionOfYear: number;
  businessDays: number;
  note: string;
}

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Fiscal-year start month by jurisdiction. Everything unlisted uses January. */
export const fiscalStarts: Record<string, number> = {
  GB: 4, IN: 4, JP: 4, NZ: 4, ZA: 3, AU: 7, PK: 7, BD: 7, EG: 7, MM: 4, HK: 4, CA: 1, US: 1, SG: 1,
};

const isLeap = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
export const daysInMonth = (year: number, month: number) => [31, isLeap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
export const daysInYear = (year: number) => (isLeap(year) ? 366 : 365);

export function toISO(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function parseISO(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && toISO(date) === value ? date : null;
}

/** Whole days between two dates, inclusive of the start and exclusive of the end. */
export function dayDifference(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

/** Weekday count, excluding Saturday and Sunday. Public holidays are not assumed. */
export function countBusinessDays(start: Date, end: Date) {
  let count = 0;
  const cursor = new Date(start.getTime());
  while (cursor < end) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

/** Year fraction under the selected day-count convention. */
export function yearFraction(start: Date, end: Date, convention: DayCount = 'actual/actual') {
  if (convention === 'actual/365') return dayDifference(start, end) / 365;
  if (convention === 'actual/360') return dayDifference(start, end) / 360;
  if (convention === '30/360') {
    const d1 = Math.min(30, start.getUTCDate()), d2 = Math.min(30, end.getUTCDate());
    return ((end.getUTCFullYear() - start.getUTCFullYear()) * 360 + (end.getUTCMonth() - start.getUTCMonth()) * 30 + (d2 - d1)) / 360;
  }
  // actual/actual splits the range across calendar years so leap years are exact.
  let total = 0;
  let cursor = new Date(start.getTime());
  while (cursor < end) {
    const yearEnd = new Date(Date.UTC(cursor.getUTCFullYear() + 1, 0, 1));
    const segmentEnd = yearEnd < end ? yearEnd : end;
    total += dayDifference(cursor, segmentEnd) / daysInYear(cursor.getUTCFullYear());
    cursor = segmentEnd;
  }
  return total;
}

export function resolvePeriod(selection: PeriodSelection, convention: DayCount = 'actual/actual'): ResolvedPeriod {
  const year = Math.trunc(selection.year);
  const fiscalStart = Math.min(12, Math.max(1, selection.fiscalStartMonth || 1));
  let start: Date;
  let end: Date;
  let label: string;
  let note = '';

  switch (selection.kind) {
    case 'month': {
      const month = Math.min(12, Math.max(1, selection.month || 1));
      start = new Date(Date.UTC(year, month - 1, 1));
      end = new Date(Date.UTC(year, month, 1));
      label = `${MONTH_NAMES[month - 1]} ${year}`;
      note = `Calendar month with ${daysInMonth(year, month)} days.`;
      break;
    }
    case 'quarter': {
      const quarter = Math.min(4, Math.max(1, selection.quarter || 1));
      start = new Date(Date.UTC(year, (quarter - 1) * 3, 1));
      end = new Date(Date.UTC(year, quarter * 3, 1));
      label = `Q${quarter} ${year}`;
      note = 'Calendar quarter of three whole months.';
      break;
    }
    case 'fiscal': {
      start = new Date(Date.UTC(year, fiscalStart - 1, fiscalStart === 4 ? 6 : 1));
      end = new Date(Date.UTC(year + 1, fiscalStart - 1, fiscalStart === 4 ? 6 : 1));
      label = fiscalStart === 1 ? `Fiscal ${year}` : `${year}/${String((year + 1) % 100).padStart(2, '0')} fiscal year`;
      note = `Fiscal year beginning in ${MONTH_NAMES[fiscalStart - 1]}.`;
      break;
    }
    case 'weekly':
    case 'biweekly':
    case 'daily': {
      const anchor = parseISO(selection.start || '') || new Date(Date.UTC(year, (selection.month || 1) - 1, 1));
      const span = selection.kind === 'daily' ? 1 : selection.kind === 'weekly' ? 7 : 14;
      start = anchor;
      end = new Date(anchor.getTime() + span * 86400000);
      label = selection.kind === 'daily' ? `Day of ${toISO(anchor)}` : `${span}-day pay cycle from ${toISO(anchor)}`;
      note = 'Pay-cycle window anchored to the selected start date.';
      break;
    }
    case 'custom-range': {
      const parsedStart = parseISO(selection.start || '') || new Date(Date.UTC(year, 0, 1));
      const parsedEnd = parseISO(selection.end || '') || new Date(Date.UTC(year + 1, 0, 1));
      start = parsedStart <= parsedEnd ? parsedStart : parsedEnd;
      end = parsedStart <= parsedEnd ? parsedEnd : parsedStart;
      if (dayDifference(start, end) === 0) end = new Date(start.getTime() + 86400000);
      label = `${toISO(start)} to ${toISO(end)}`;
      note = 'Exact date range measured in whole days.';
      break;
    }
    default: {
      start = new Date(Date.UTC(year, 0, 1));
      end = new Date(Date.UTC(year + 1, 0, 1));
      label = `Calendar ${year}`;
      note = `Calendar year with ${daysInYear(year)} days.`;
    }
  }

  const days = Math.max(1, dayDifference(start, end));
  const fraction = Math.max(1e-9, yearFraction(start, end, convention));
  return {
    label,
    start,
    end,
    days,
    annualMultiplier: 1 / fraction,
    displayDivisor: 1 / fraction,
    fractionOfYear: fraction,
    businessDays: countBusinessDays(start, end),
    note: `${note} Day count: ${convention}.`,
  };
}

/** Selectable reference years for a jurisdiction, widened around the packs it ships with. */
export function selectableYears(packYears: string[], span = 12): string[] {
  const numeric = packYears.map(id => Number(id.slice(0, 4))).filter(Number.isFinite);
  const latest = numeric.length ? Math.max(...numeric) : new Date().getUTCFullYear();
  const earliest = numeric.length ? Math.min(...numeric) : latest;
  const out = new Set(packYears);
  for (let year = earliest - span; year <= latest + 2; year++) out.add(String(year));
  return [...out].sort();
}

/** Human-readable month options for a given year, newest first when requested. */
export function monthOptions(year: number, descending = false) {
  const items = MONTH_NAMES.map((name, index) => ({ value: String(index + 1), label: `${name} ${year} (${daysInMonth(year, index + 1)} days)` }));
  return descending ? items.reverse() : items;
}

export function describeSelection(period: ResolvedPeriod) {
  return `${period.label} · ${period.days} days · ${period.businessDays} business days · ${(period.fractionOfYear * 100).toFixed(2)}% of a year`;
}

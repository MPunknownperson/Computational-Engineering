export interface ReferenceRate { rate: number; date: string; base: string; quote: string }
const rates = new Map<string, { value: ReferenceRate; fetchedAt: number }>();

export function validateReferenceRate(payload: unknown, base: string, quote: string, requestedDate?: string): ReferenceRate {
  if (!payload || typeof payload !== 'object') throw new Error('The rate provider returned an invalid response.');
  const row = payload as Partial<ReferenceRate>;
  if (typeof row.rate !== 'number' || !Number.isFinite(row.rate) || row.rate <= 0 || row.base !== base || row.quote !== quote) throw new Error('The reference rate does not match the requested currency pair.');
  const date = new Date(`${row.date}T00:00:00Z`);
  if (typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== row.date || (requestedDate && row.date > requestedDate)) throw new Error('The provider did not return a valid reference date.');
  return { rate: row.rate, date: row.date, base, quote };
}

export async function fetchReferenceRate(base: string, quote: string, signal: AbortSignal, date?: string, force = false) {
  const key = `${base}:${quote}:${date || 'latest'}`;
  const stored = rates.get(key);
  const ttl = date ? 86400000 : 300000;
  if (!force && stored && Date.now() - stored.fetchedAt < ttl) return stored.value;
  const url = new URL(`https://api.frankfurter.dev/v2/rate/${base}/${quote}`);
  url.searchParams.set('providers', 'ECB');
  if (date) url.searchParams.set('date', date);
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('No reference rate is available for this pair or date.');
  const value = validateReferenceRate(await response.json(), base, quote, date);
  rates.set(key, { value, fetchedAt: Date.now() });
  if (rates.size > 80) rates.delete(rates.keys().next().value!);
  return value;
}
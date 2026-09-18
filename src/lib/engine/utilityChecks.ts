import { countBusinessDays, daysInMonth, parseISO, resolvePeriod, selectableYears, yearFraction } from '../periods';
import { adaptivePrecision, AdaptiveRanker, analyseSweep, DeltaTracker, hashNumbers, kahanSum, RingCache, sweep, toSignificant } from './optimizer';
import { applyConstants, emptyWorkspace, validateConstant, validateCustomUnit } from '../utilityWorkspace';
import { countries, latestTaxYearId } from '../regions';
import { toolById } from '../catalog';
import { processCalculation } from '../processing';
import { defaultSettings } from '../regions';
import type { CountryId } from '../types';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function near(actual: number, expected: number, tolerance: number) {
  assert(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance, `Expected ${expected} within ${tolerance}, received ${actual}.`);
}

const ctx = { ...defaultSettings, currency: 'USD' };

export const utilityChecks: [string, () => void][] = [
  ['Leap years and month lengths are exact', () => {
    near(daysInMonth(2024, 2), 29, 0);
    near(daysInMonth(2023, 2), 28, 0);
    near(daysInMonth(2000, 2), 29, 0);
    near(daysInMonth(1900, 2), 28, 0);
  }],
  ['Calendar, month and quarter periods resolve to whole days', () => {
    near(resolvePeriod({ kind: 'annual', year: 2024 }).days, 366, 0);
    near(resolvePeriod({ kind: 'annual', year: 2023 }).days, 365, 0);
    near(resolvePeriod({ kind: 'month', year: 2025, month: 2 }).days, 28, 0);
    near(resolvePeriod({ kind: 'quarter', year: 2025, quarter: 1 }).days, 90, 0);
  }],
  ['A full year is exactly one year fraction under actual/actual', () => {
    near(resolvePeriod({ kind: 'annual', year: 2024 }).fractionOfYear, 1, 1e-12);
    near(resolvePeriod({ kind: 'annual', year: 2025 }).fractionOfYear, 1, 1e-12);
  }],
  ['Day-count conventions differ as documented', () => {
    const start = parseISO('2025-01-01')!, end = parseISO('2025-07-01')!;
    near(yearFraction(start, end, 'actual/365'), 181 / 365, 1e-9);
    near(yearFraction(start, end, 'actual/360'), 181 / 360, 1e-9);
    near(yearFraction(start, end, '30/360'), .5, 1e-9);
  }],
  ['Custom date ranges are inclusive of whole days and ordered', () => {
    const forward = resolvePeriod({ kind: 'custom-range', year: 2025, start: '2025-03-01', end: '2025-03-31' });
    const reversed = resolvePeriod({ kind: 'custom-range', year: 2025, start: '2025-03-31', end: '2025-03-01' });
    near(forward.days, 30, 0);
    near(reversed.days, forward.days, 0);
  }],
  ['Business-day counting excludes weekends', () => {
    // 2025-03-03 is a Monday; one full week contains five business days.
    near(countBusinessDays(parseISO('2025-03-03')!, parseISO('2025-03-10')!), 5, 0);
  }],
  ['Invalid dates are rejected rather than coerced', () => {
    assert(parseISO('2025-02-30') === null, 'An impossible date was accepted.');
    assert(parseISO('not-a-date') === null, 'A malformed date was accepted.');
    assert(parseISO('2025-02-28') !== null, 'A valid date was rejected.');
  }],
  ['Year selection widens without replacing verified packs', () => {
    for (const id of ['US', 'GB', 'CA', 'AU'] as CountryId[]) {
      const packs = countries[id].years;
      assert(packs.length >= 6, `${id} did not gain additional reference years.`);
      const latest = packs.find(pack => pack.id === latestTaxYearId(id))!;
      assert(!latest.label.includes('indexed estimate'), `${id} defaults to an indexed estimate instead of a verified pack.`);
    }
    assert(selectableYears(['2025']).length > 10, 'Selectable years did not widen.');
  }],
  ['Indexed year packs stay ordered and cumulative', () => {
    for (const country of Object.values(countries)) {
      for (const pack of country.years) {
        let previous = 0;
        for (const [cap, rate] of pack.federal.single) {
          assert(cap > previous, `${country.name} ${pack.id}: bracket ceilings are not ascending.`);
          assert(rate >= 0 && rate <= 1, `${country.name} ${pack.id}: rate out of range.`);
          previous = cap;
        }
        assert(previous === Infinity, `${country.name} ${pack.id}: missing a final open band.`);
      }
    }
  }],
  ['Expanded jurisdictions all produce a finite result', () => {
    const ids = ['SS', 'SOM', 'GN', 'GW', 'CG', 'CF', 'ER', 'DJ', 'BI', 'KM', 'ST', 'GQ', 'TM', 'AF', 'YE', 'SY', 'LY', 'MR', 'BQ', 'SX', 'TC', 'VG', 'AI', 'MS', 'FK', 'PM'] as CountryId[];
    for (const id of ids) {
      const country = countries[id];
      assert(Boolean(country), `${id} is missing from the catalog.`);
      const region = country.regions[0];
      const run = processCalculation('tax', { ...toolById.tax.defaults, income: '40000', year: latestTaxYearId(id) }, { ...ctx, country: id, region: region.id, currency: country.currency });
      assert(Boolean(run.result), `${id}: ${run.error}`);
      assert(Number.isFinite(Number(run.result!.value)), `${id} produced a non-finite result.`);
    }
  }],
  ['Ring cache returns stored values and reports a hit rate', () => {
    const cache = new RingCache(16);
    const key = hashNumbers([1, 2, 3]);
    cache.set(key, 42);
    near(cache.get(key)!, 42, 0);
    assert(cache.get(hashNumbers([9, 9, 9])) === undefined, 'An unstored key returned a value.');
    assert(cache.hitRate > 0 && cache.hitRate < 1, 'Hit rate was not tracked.');
  }],
  ['Numeric hashing is stable and order-sensitive', () => {
    assert(hashNumbers([1, 2, 3]) === hashNumbers([1, 2, 3]), 'Identical vectors produced different hashes.');
    assert(hashNumbers([1, 2, 3]) !== hashNumbers([3, 2, 1]), 'Order was ignored by the hash.');
  }],
  ['Compensated summation beats naive accumulation', () => {
    const values = new Float64Array(10000).fill(0.1);
    near(kahanSum(values), 1000, 1e-9);
  }],
  ['Unrolled sweeps cover the range exactly', () => {
    const { inputs, outputs } = sweep(0, 10, 97, value => value * 2);
    near(inputs[0], 0, 1e-12);
    near(inputs[inputs.length - 1], 10, 1e-12);
    near(outputs[outputs.length - 1], 20, 1e-12);
    assert(inputs.length === 97, 'The sweep returned the wrong number of points.');
  }],
  ['Sweep analysis detects monotonicity and curvature', () => {
    const rising = analyseSweep(sweep(0, 10, 64, value => value * 3).outputs);
    assert(rising.monotonic === 'increasing', 'A rising line was not reported as increasing.');
    const falling = analyseSweep(sweep(0, 10, 64, value => -value).outputs);
    assert(falling.monotonic === 'decreasing', 'A falling line was not reported as decreasing.');
  }],
  ['Delta tracking isolates a single changed field', () => {
    const tracker = new DeltaTracker();
    tracker.compare({ a: '1', b: '2' });
    const second = tracker.compare({ a: '1', b: '3' });
    assert(second.singleField === 'b', 'The changed field was not isolated.');
    const third = tracker.compare({ a: '9', b: '8' });
    assert(third.singleField === null && third.changed.length === 2, 'Multiple changes were misreported.');
  }],
  ['Adaptive precision keeps small magnitudes readable', () => {
    assert(adaptivePrecision(0.00042, 2) > 2, 'Small values did not gain precision.');
    assert(adaptivePrecision(5_000_000, 6) <= 2, 'Very large values did not reduce precision.');
    near(adaptivePrecision(12.5, 2), 2, 0);
  }],
  ['Significant-figure rounding is symmetric and lossless at the exact value', () => {
    near(toSignificant(123456, 3), 123000, 0);
    near(toSignificant(0.00123456, 3), 0.00123, 1e-9);
    near(toSignificant(0, 5), 0, 0);
  }],
  ['Adaptive ranker prefers frequent and recent actions', () => {
    const ranker = new AdaptiveRanker();
    const now = Date.now();
    for (let i = 0; i < 5; i++) ranker.observe('frequent', 'units', now);
    ranker.observe('stale', 'units', now - 1000 * 60 * 60 * 24 * 120);
    const ranked = ranker.rank([{ id: 'stale', label: 'Stale' }, { id: 'frequent', label: 'Frequent' }], 'units', now);
    assert(ranked[0].id === 'frequent', 'The ranker did not prefer the frequently used action.');
    assert(ranked.every(item => item.reason.length > 0), 'The ranker did not explain its ordering.');
  }],
  ['Custom units are validated before they can be used', () => {
    const workspace = emptyWorkspace();
    assert(validateCustomUnit(workspace, { category: 'length', code: 'm', factor: '1' }).ok === false, 'A standard unit code was allowed to be overwritten.');
    assert(validateCustomUnit(workspace, { category: 'temperature', code: 'zz', factor: '2' }).ok === false, 'A temperature scale was accepted as a linear factor.');
    assert(validateCustomUnit(workspace, { category: 'length', code: 'furlong', factor: '0' }).ok === false, 'A zero factor was accepted.');
    assert(validateCustomUnit(workspace, { category: 'length', code: 'furlong', factor: '201.168' }).ok === true, 'A valid custom unit was rejected.');
  }],
  ['Custom constants cannot shadow reserved parser names', () => {
    const workspace = emptyWorkspace();
    assert(validateConstant(workspace, { symbol: 'pi', value: '3' }).ok === false, 'A reserved symbol was accepted.');
    assert(validateConstant(workspace, { symbol: 'x', value: '3' }).ok === false, 'A reserved variable was accepted.');
    assert(validateConstant(workspace, { symbol: '2bad', value: '3' }).ok === false, 'An invalid identifier was accepted.');
    assert(validateConstant(workspace, { symbol: 'g0', value: '9.80665' }).ok === true, 'A valid constant was rejected.');
  }],
  ['Constant substitution only replaces whole symbols', () => {
    const constants = [{ id: '1', symbol: 'g', value: 9.8, note: '', createdAt: '' }];
    const result = applyConstants('g * mass + range', constants);
    assert(result.expression.includes('(9.8)'), 'The constant was not substituted.');
    assert(result.expression.includes('range'), 'A substring match corrupted another identifier.');
  }],
  ['Unit conversions honour significant figures without breaking the round trip', () => {
    const coarse = processCalculation('units', { ...toolById.units.defaults, amount: '1', from: 'm', to: 'ft', sigFigs: '3' }, ctx);
    assert(Boolean(coarse.result), coarse.error);
    near(Number(coarse.result!.value), 3.28, .01);
    const fine = processCalculation('units', { ...toolById.units.defaults, amount: '1', from: 'm', to: 'ft', sigFigs: '12' }, ctx);
    near(Number(fine.result!.value), 3.280839895013, 1e-9);
  }],
  ['BMI band sets change the label, never the ratio', () => {
    const who = processCalculation('bmi', { ...toolById.bmi.defaults, height: '170', weight: '68', standard: 'who' }, ctx);
    const asia = processCalculation('bmi', { ...toolById.bmi.defaults, height: '170', weight: '68', standard: 'asia-pacific' }, ctx);
    assert(Boolean(who.result && asia.result), 'A BMI band set failed to calculate.');
    near(Number(who.result!.value), Number(asia.result!.value), 1e-12);
    assert(who.result!.description !== asia.result!.description, 'The band sets produced identical guidance.');
  }],
  ['BMI target weight inverts the ratio exactly', () => {
    const run = processCalculation('bmi', { ...toolById.bmi.defaults, units: 'metric', height: '180', weight: '80', targetBmi: '22' }, ctx);
    assert(Boolean(run.result), run.error);
    const metric = run.result!.metrics.find(item => String(item.label).startsWith('Weight at target BMI'));
    assert(Boolean(metric), 'The target weight metric is missing.');
    near(parseFloat(String(metric!.value)), 22 * 1.8 * 1.8, .05);
  }],
];

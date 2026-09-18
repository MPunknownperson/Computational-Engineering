import { countries, defaultSettings, localLevyOptions } from './regions';
import { additionalCountries } from './countryExpansion';
import { countryLocale, normalizeLocation, taxDefaultsForLocation, transitionTaxLocation } from './regionalSettings';
import { processCalculation } from './processing';
import { normalizeNumberInput } from './format';
import { adjacentTab, swipeStep } from './gestures';
import { currencies } from './catalog';
import type { CountryId, Values } from './types';

function near(actual: number, expected: number, tolerance = .00001) {
  if (!Number.isFinite(actual) || Math.abs(actual - expected) > tolerance) throw new Error(`Expected ${expected}, received ${actual}.`);
}

function tax(country: CountryId, overrides: Values = {}, region = countries[country].regions[0].id) {
  const county = overrides.county || '';
  const result = processCalculation('tax', { ...taxDefaultsForLocation(country, region, county), ...overrides }, { ...defaultSettings, country, region, county, currency: countries[country].currency });
  if (!result.result) throw new Error(`${country}/${region}: ${result.error}`);
  return result.result;
}

function taxAmount(country: CountryId, values: Values) {
  return Number(tax(country, values).metrics.find(metric => metric.label === 'Total income tax')?.value);
}

export const regionalChecks: [string, () => void][] = [
  ['Added countries have complete, unique regional catalogs', () => {
    const expected: Partial<Record<CountryId, number>> = { CN: 31, BN: 4, BS: 8, SC: 4, ZM: 10, PG: 22, DE: 16, JP: 47, IN: 36, NZ: 16 };
    for (const [countryId, count] of Object.entries(expected)) {
      const regions = countries[countryId as CountryId].regions.filter(region => region.id !== 'OTHER');
      near(regions.length, count!);
      if (new Set(regions.map(region => region.id)).size !== regions.length) throw new Error(`${countryId}: duplicate region identifiers.`);
      for (const region of regions) if (new Set(region.counties.map(locality => locality.id)).size !== region.counties.length) throw new Error(`${countryId}/${region.id}: duplicate localities.`);
    }
  }],
  ['Every country offers an explicit other-region fallback', () => {
    for (const country of Object.values(countries)) if (!country.regions.some(region => region.id === 'OTHER' && region.customTax)) throw new Error(`${country.name}: missing custom region.`);
  }],
  ['Every added country region produces a finite planning result', () => {
    for (const country of Object.keys(additionalCountries) as CountryId[]) for (const region of countries[country].regions) {
      const result = tax(country, {}, region.id);
      if (!Number.isFinite(result.value)) throw new Error(`${country}/${region.id}: non-finite result.`);
    }
  }],
  ['New country brackets are cumulative and ordered', () => {
    for (const country of Object.values(additionalCountries)) {
      const schedules = [...country.years.map(pack => pack.federal.single), ...(country.profiles || []).flatMap(profile => profile.brackets ? [profile.brackets] : [])];
      for (const brackets of schedules) {
        let previous = 0;
        for (const [cap, rate] of brackets) { if (!(cap > previous) || rate < 0 || rate > 1) throw new Error(`${country.name}: invalid tax band.`); previous = cap; }
        if (previous !== Infinity) throw new Error(`${country.name}: missing final tax band.`);
      }
    }
  }],
  ['China resident basic allowance and marginal bands', () => near(taxAmount('CN', { income: '120000' }), 3480)],
  ['China additional relief reduces the tax base, not cash twice', () => {
    const result = tax('CN', { income: '120000', countryRelief: '12000' });
    near(Number(result.value), 117720);
    near(result.taxBasis!.annualTaxable, 48000);
    near(Number(result.audit!.networkNodes!.find(node => node.id === 'taxable')!.value), 48000);
  }],
  ['Zambia 2026 monthly PAYE example', () => near(taxAmount('ZM', { income: '10000', taxPeriod: 'monthly' }), 1326)],
  ['Seychelles citizen and non-citizen profiles differ', () => {
    near(taxAmount('SC', { income: '10000', taxPeriod: 'monthly', taxProfile: 'resident' }), 216.675);
    near(taxAmount('SC', { income: '10000', taxPeriod: 'monthly', taxProfile: 'nonresident' }), 1500);
  }],
  ['Seychelles qualifying project and stevedore profiles', () => {
    near(taxAmount('SC', { income: '10000', taxPeriod: 'monthly', taxProfile: 'project' }), 300);
    near(taxAmount('SC', { income: '10000', taxPeriod: 'monthly', taxProfile: 'stevedore' }), 1000);
  }],
  ['PNG resident and non-resident reference bands', () => {
    near(taxAmount('PG', { income: '50000', taxProfile: 'resident' }), 9850);
    near(taxAmount('PG', { income: '50000', taxProfile: 'nonresident' }), 14250);
  }],
  ['Brunei SPK uses the employee basic salary base', () => {
    near(Number(tax('BN', { income: '12000', otherIncome: '1000', countryPayroll: 'true' }).value), 11980);
    near(Number(tax('BN', { income: '24000', countryPayroll: 'true', countryPayrollBaseMode: 'custom', countryPayrollBase: '12000' }).value), 22980);
  }],
  ['Bahamas personal wages have no automatic income tax', () => near(Number(tax('BS', { income: '60000' }).value), 60000)],
  ['Contribution ceilings are annual wage bases', () => {
    const result = tax('ZM', { income: '200000', countryPayroll: 'true', countryPayrollCap: '100000' });
    near(Number(result.breakdown.find(part => part.label === 'Payroll / contributions')!.value), 5000);
  }],
  ['Unspecified insurable ceilings are rejected when required', () => {
    const country = 'BS'; const region = countries.BS.regions[0].id;
    const result = processCalculation('tax', { ...taxDefaultsForLocation(country, region), countryPayroll: 'true', countryPayrollRate: '5' }, { ...defaultSettings, country, region, currency: 'BSD' });
    if (result.result || !result.issues.some(issue => issue.field === 'countryPayrollCap')) throw new Error('A required ceiling was accepted without input.');
  }],
  ['Custom local charges prorate without becoming wage rates', () => {
    near(Number(tax('BN', { income: '2000', taxPeriod: 'monthly', localFixed: 'true', localAnnualAmount: '1200' }).value), 1900);
  }],
  ['New location labels do not change tax or enable levies', () => {
    for (const country of Object.keys(additionalCountries) as CountryId[]) {
      const region = countries[country].regions[0];
      const locality = region.counties[0];
      if (!locality) continue;
      near(Number(tax(country, { county: locality.id }).value), Number(tax(country).value));
      const defaults = taxDefaultsForLocation(country, region.id, locality.id);
      for (const key of ['localIncome', 'countryPayroll', 'vatSpending', 'propertyTax', 'localFixed']) if (defaults[key] === 'true') throw new Error(`${country}: ${key} automatically enabled.`);
    }
  }],
  ['California locality is preserved independently of its removed reference block', () => {
    const location = normalizeLocation('US', 'CA', 'CA-LA');
    if (location.county !== 'CA-LA') throw new Error('California locality was removed.');
    if (normalizeLocation('US', 'TX', 'CA-LA').county) throw new Error('A locality leaked into another state.');
  }],
  ['Custom locality names do not inherit a listed locality', () => {
    const location = normalizeLocation('US', 'CA', 'CA-LA', 'My district', true);
    if (location.county || location.city !== 'My district' || !location.customLocality) throw new Error('Custom locality state is inconsistent.');
  }],
  ['Country transitions preserve amounts but reset enrollment and local levies', () => {
    const before = { ...defaultSettings, country: 'BN' as CountryId, region: 'BM' };
    const after = { ...before, country: 'SC' as CountryId, region: 'MA', county: '' };
    const values = transitionTaxLocation({ ...taxDefaultsForLocation('BN', 'BM'), income: '123456', countryPayroll: 'true', localIncome: 'true', countryPayrollRate: '9' }, before, after);
    near(Number(values.income), 123456);
    if (values.countryPayroll !== 'false' || values.localIncome !== 'false' || values.taxProfile !== 'resident') throw new Error('Country-specific selections leaked.');
  }],
  ['Named country levy inputs survive validation', () => {
    const result = tax('SG', { income: '30000', cpf: 'true', cpfRate: '10', cpfCap: '20000' });
    near(Number(result.breakdown.find(part => part.label === 'Payroll / contributions')!.value), 2000);
  }],
  ['Korean local income surcharge uses national tax, not wages', () => {
    const values = { income: '50000000', includeRegional: 'false' };
    const basic = taxAmount('KR', values);
    near(taxAmount('KR', { ...values, localIncomeTax: 'true', localIncomeTaxRate: '10' }), basic * 1.1);
  }],
  ['Country profiles reject unsupported choices', () => {
    const result = processCalculation('tax', { ...taxDefaultsForLocation('SC', 'MA'), taxProfile: 'invalid' }, { ...defaultSettings, country: 'SC', region: 'MA', currency: 'SCR' });
    if (result.result || !result.issues.some(issue => issue.field === 'taxProfile')) throw new Error('Unknown taxpayer profile accepted.');
  }],
  ['Country currencies are available for manual conversion', () => {
    for (const country of Object.values(additionalCountries)) if (!currencies.includes(country.currency)) throw new Error(`Missing ${country.currency}.`);
  }],
  ['No unsupported structural levy switches are offered', () => {
    for (const country of Object.keys(countries) as CountryId[]) {
      if (localLevyOptions(country, countries[country].regions[0].id).some(levy => ['wealthTax', 'scotlandBands', 'tourismDirham'].includes(levy.id))) throw new Error('An unimplemented control is exposed.');
    }
  }],
  ['Indian, Arabic and full-width numeric input', () => {
    near(Number(normalizeNumberInput('1,23,456.78', 'en-IN')), 123456.78);
    near(Number(normalizeNumberInput('12,34,567', 'en-IN')), 1234567);
    near(Number(normalizeNumberInput('\u0661\u066c\u0662\u0663\u0664\u066b\u0665\u0666', 'ar-EG')), 1234.56);
    near(Number(normalizeNumberInput('\uff11\uff12\uff13\uff0e\uff14\uff15', 'zh-CN')), 123.45);
    if (countryLocale('IN') !== 'en-IN' || countryLocale('CN') !== 'zh-CN') throw new Error('Country number format mismatch.');
  }],
  ['Swipe thresholds distinguish deliberate horizontal movement', () => {
    near(swipeStep(-75, 5, 230, 375), 1);
    near(swipeStep(110, 8, 300, 1024), -1);
    near(swipeStep(-20, 0, 100, 375), 0);
    near(swipeStep(-90, 80, 200, 375), 0);
    near(swipeStep(-120, 0, 1200, 375), 0);
  }],
  ['Swipe navigation stops at the first and last tabs', () => {
    near(adjacentTab(0, -1, 3), 0);
    near(adjacentTab(2, 1, 3), 2);
    near(adjacentTab(0, 1, 3), 1);
  }],
];
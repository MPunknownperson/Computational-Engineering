import { toolById } from './catalog';
import { countries, getRegion, latestTaxYearId, localLevyOptions } from './regions';
import type { CountryId, Values, WorkspaceSettings } from './types';

export const numberFormats = [
  { value: 'en-US', label: '1,234.56 - United States' }, { value: 'en-GB', label: '1,234.56 - United Kingdom' },
  { value: 'en-IN', label: '1,23,456.78 - India' }, { value: 'de-DE', label: '1.234,56 - Germany' },
  { value: 'fr-FR', label: '1 234,56 - France' }, { value: 'es-ES', label: '1.234,56 - Spain' },
  { value: 'pt-BR', label: '1.234,56 - Brazil' }, { value: 'en-CA', label: '1,234.56 - Canada' },
  { value: 'en-AU', label: '1,234.56 - Australia' }, { value: 'en-NZ', label: '1,234.56 - New Zealand' },
  { value: 'zh-CN', label: '1,234.56 - China' }, { value: 'ja-JP', label: '1,234.56 - Japan' },
  { value: 'en-BN', label: '1,234.56 - Brunei' }, { value: 'en-BS', label: '1,234.56 - Bahamas' },
  { value: 'en-SC', label: '1,234.56 - Seychelles' }, { value: 'en-ZM', label: '1,234.56 - Zambia' },
  { value: 'en-PG', label: '1,234.56 - Papua New Guinea' }, { value: 'ar-EG', label: 'Arabic digits and separators' },
];

export function countryLocale(country: CountryId): string {
  return countries[country].locale || ({ US: 'en-US', CA: 'en-CA', GB: 'en-GB', AU: 'en-AU', NZ: 'en-NZ',
    DE: 'de-DE', AT: 'de-DE', FR: 'fr-FR', IN: 'en-IN', JP: 'ja-JP', ES: 'es-ES', BR: 'pt-BR', EG: 'ar-EG' } as Partial<Record<CountryId, string>>)[country] || 'en-US';
}

export function normalizeLocation(countryId: CountryId, regionId: string, countyId = '', city = '', custom = false) {
  const country = Object.prototype.hasOwnProperty.call(countries, countryId) ? countryId : 'US';
  const region = getRegion(country, regionId);
  const county = region.counties.some(item => item.id === countyId) ? countyId : '';
  return { country, region: region.id, county: custom ? '' : county, city: typeof city === 'string' ? city.slice(0, 100) : '', customLocality: custom };
}

export function taxDefaultsForLocation(country: CountryId, regionId: string, county = ''): Values {
  const values: Values = {
    ...toolById.tax.defaults, year: latestTaxYearId(country), county,
    taxProfile: countries[country].profiles?.[0]?.value || 'resident', countryRelief: '0',
    countryPayrollBaseMode: 'income', countryPayrollBase: '0', localFixed: 'false', localAnnualAmount: '0',
  };
  for (const levy of localLevyOptions(country, regionId, county)) {
    values[levy.id] = String(levy.defaultOn);
    values[`${levy.id}Rate`] = String(levy.defaultRate);
    if (levy.kind === 'payroll') values[`${levy.id}Cap`] = String(levy.defaultCap || 0);
  }
  if (getRegion(country, regionId).customTax) values.regionalRate = '0';
  return values;
}

export function transitionTaxLocation(values: Values, previous: WorkspaceSettings, next: WorkspaceSettings): Values {
  const before = taxDefaultsForLocation(previous.country, previous.region, previous.county);
  const after = taxDefaultsForLocation(next.country, next.region, next.county);
  const changedCountry = previous.country !== next.country;
  const result = { ...after };
  for (const key of Object.keys(after)) {
    if (values[key] !== undefined && (next.regionalPresets === false || values[key] !== before[key])) result[key] = values[key];
  }
  if (changedCountry) {
    // Never carry enrollment, tax relief, or a named country's levy into another jurisdiction.
    for (const levy of localLevyOptions(next.country, next.region, next.county)) {
      result[levy.id] = after[levy.id];
      result[`${levy.id}Rate`] = after[`${levy.id}Rate`];
      if (levy.kind === 'payroll') result[`${levy.id}Cap`] = after[`${levy.id}Cap`];
    }
    for (const key of ['taxProfile', 'countryRelief', 'countryPayrollBaseMode', 'countryPayrollBase', 'social', 'payroll', 'medicare', 'marriage', 'localAnnualAmount']) result[key] = after[key];
  }
  result.localIncome = 'false';
  result.localFixed = 'false';
  result.year = changedCountry ? after.year : values.year;
  result.county = next.county || '';
  return result;
}
import { useId } from 'react';
import { Globe2, MapPin } from 'lucide-react';
import { SelectField } from './Fields';
import FlagIcon from './FlagIcon';
import { countries, countryOptions, getRegion } from '../lib/regions';
import type { CalculatorStore } from '../hooks/useCalculators';
import type { CountryId } from '../lib/types';

export default function LocationFields({ store }: { store: CalculatorStore }) {
  const { settings, setSettings, country, region } = store;
  const id = useId();
  const selected = region.counties.find(locality => locality.id === settings.county);
  const localityValue = settings.customLocality ? '__custom' : selected?.id || '';
  return <div className="location-controls">
    <div className="location-fields-grid">
      <div className="flag-select"><FlagIcon code={settings.country} size={20} /><SelectField label="Country / territory" value={settings.country} onChange={value => store.changeCountry(value as CountryId)} options={countryOptions} /></div>
      <div className="flag-select"><FlagIcon code={settings.region} country={settings.country} region size={20} /><SelectField label={country.regionLabel} value={settings.region} onChange={store.changeRegion} options={country.regions.map(item => ({ value: item.id, label: item.name }))} /></div>
      <div className="flag-select"><MapPin size={19} aria-hidden="true" /><SelectField label={`${country.localityLabel || 'Locality'} (optional)`} value={localityValue} onChange={store.changeLocality} options={[{ value: '', label: 'Not specified' }, ...region.counties.map(item => ({ value: item.id, label: item.name })), { value: '__custom', label: 'Other locality (enter a name)' }]} /></div>
    </div>
    {settings.customLocality && <div className="custom-locality-field">
      <label className="standalone-label" htmlFor={id}>Local area name</label>
      <input className="standalone-input" id={id} value={settings.city} onChange={event => setSettings(previous => ({ ...previous, city: event.target.value.slice(0, 100) }))} placeholder="Enter your city, district or municipality" maxLength={100} autoComplete="address-level2" enterKeyHint="done" />
    </div>}
    <p className="location-help"><Globe2 size={14} aria-hidden="true" /><span>{country.currency} &middot; {country.regions.filter(item => item.id !== 'OTHER').length} regional choices. {settings.customLocality || selected?.labelOnly ? 'This locality is a label only. Enter any applicable local charges in the calculator.' : 'Locality selection does not enable additional levies. Review and include them only when applicable.'}</span></p>
  </div>;
}

export function LocationSummary({ country, region, county, city }: { country: CountryId; region: string; county?: string; city?: string }) {
  const selectedRegion = getRegion(country, region);
  const localName = selectedRegion.counties.find(item => item.id === county)?.name || city;
  return <>{countries[country].name}<span> / {selectedRegion.name.replace(' (custom tax)', '')}</span>{localName && <span> / {localName}</span>}</>;
}
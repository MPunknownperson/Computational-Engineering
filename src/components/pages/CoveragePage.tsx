import { useDeferredValue, useMemo, useState } from 'react';
import { ArrowUpRight, Globe2, MapPin, Search } from 'lucide-react';
import { countries } from '../../lib/regions';
import type { CountryId } from '../../lib/types';
import FlagIcon, { resolveFlag } from '../FlagIcon';
import { Reveal } from '../motion';

type Filter = 'all' | 'regional' | 'noWageTax' | 'profiles';

export default function CoveragePage({ onSelect }: { onSelect: (country: CountryId, region: string) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<CountryId | null>(null);
  const deferred = useDeferredValue(query);

  const entries = useMemo(() => Object.entries(countries) as [CountryId, typeof countries[CountryId]][], []);
  const stats = useMemo(() => {
    let regions = 0; let localities = 0; let regionalFlags = 0;
    for (const [id, country] of entries) {
      regions += country.regions.length;
      for (const region of country.regions) {
        localities += region.counties.length;
        if (resolveFlag(region.id, id, true).source === 'regional') regionalFlags++;
      }
    }
    return { regions, localities, regionalFlags };
  }, [entries]);

  const visible = useMemo(() => {
    const needle = deferred.trim().toLowerCase();
    return entries
      .filter(([id, country]) => {
        if (filter === 'regional' && country.regions.length < 6) return false;
        if (filter === 'noWageTax' && !country.regions.some(region => /no wage/i.test(region.taxStructure))) return false;
        if (filter === 'profiles' && !country.profiles) return false;
        if (!needle) return true;
        return country.name.toLowerCase().includes(needle)
          || id.toLowerCase() === needle
          || country.currency.toLowerCase() === needle
          || country.regions.some(region => region.name.toLowerCase().includes(needle))
          || country.regions.some(region => region.counties.some(locality => locality.name.toLowerCase().includes(needle)));
      })
      .sort((a, b) => a[1].name.localeCompare(b[1].name, 'en'));
  }, [entries, deferred, filter]);

  return <div className="coverage-page route-enter">
    <header className="page-intro">
      <h1><Globe2 size={26} />Coverage</h1>
      <p>
        Every supported jurisdiction, with its governing authority, currency, reference year and
        source. Regional flags are shown where the jurisdiction has its own official flag; otherwise
        the national flag of the sovereign state is used.
      </p>
      <dl className="coverage-stats">
        <div><dt>Countries &amp; territories</dt><dd>{entries.length}</dd></div>
        <div><dt>Regional choices</dt><dd>{stats.regions.toLocaleString()}</dd></div>
        <div><dt>Locality labels</dt><dd>{stats.localities.toLocaleString()}</dd></div>
        <div><dt>Distinct regional flags</dt><dd>{stats.regionalFlags.toLocaleString()}</dd></div>
      </dl>
    </header>

    <div className="coverage-controls">
      <label className="coverage-search">
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search a country, region, city or currency"
          aria-label="Search coverage"
          enterKeyHint="search"
        />
      </label>
      <div className="coverage-filters" role="group" aria-label="Filter jurisdictions">
        {([['all', 'All'], ['regional', 'Many regions'], ['noWageTax', 'No wage tax'], ['profiles', 'Taxpayer profiles']] as [Filter, string][]).map(([value, label]) =>
          <button key={value} type="button" aria-pressed={filter === value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>)}
      </div>
    </div>

    <p className="coverage-count" role="status">{visible.length} of {entries.length} jurisdictions</p>

    <ul className="coverage-list">
      {visible.map(([id, country], index) => {
        const expanded = open === id;
        return <Reveal key={id} as="li" delay={Math.min(index, 12) * 22} className={`coverage-item ${expanded ? 'is-open' : ''}`}>
          <button className="coverage-head" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : id)}>
            <FlagIcon code={id} size={26} />
            <span className="coverage-name">
              <strong>{country.name}</strong>
              <small>{country.legalBody}</small>
            </span>
            <span className="coverage-tags">
              <span className="coverage-tag">{country.currency}</span>
              <span className="coverage-tag">{country.regions.length} regions</span>
              <span className="coverage-tag">{country.taxYear}</span>
            </span>
          </button>
          {expanded && <div className="coverage-body">
            <p className="coverage-rules">{country.rules}</p>
            <ul className="coverage-regions">
              {country.regions.map(region => {
                const flag = resolveFlag(region.id, id, true);
                return <li key={region.id}>
                  <button onClick={() => onSelect(id, region.id)}>
                    <FlagIcon code={region.id} country={id} region size={17} />
                    <span>{region.name}</span>
                    {region.counties.length > 0 && <small><MapPin size={11} />{region.counties.length}</small>}
                    {flag.source === 'national' && <em title="This region has no distinct official flag, so the national flag is shown.">national flag</em>}
                  </button>
                </li>;
              })}
            </ul>
            <a className="coverage-source" href={country.source.url} target="_blank" rel="noreferrer">{country.source.name}<ArrowUpRight size={14} /></a>
          </div>}
        </Reveal>;
      })}
    </ul>

    {visible.length === 0 && <div className="empty-state">
      <h2>No jurisdiction matches that search</h2>
      <p>Try a country name, a region, a major city or a three-letter currency code.</p>
      <button className="secondary-button" onClick={() => { setQuery(''); setFilter('all'); }}>Clear search</button>
    </div>}
  </div>;
}

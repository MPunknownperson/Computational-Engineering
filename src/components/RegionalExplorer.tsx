import { useState } from 'react';
import { ArrowUpRight, Check, Globe2, Landmark, Scale } from 'lucide-react';
import { countries, countryOptions } from '../lib/regions';
import type { CountryId } from '../lib/types';
import Dialog from './Dialog';
import FlagIcon from './FlagIcon';
import { SelectField } from './Fields';

interface Props {
  country: CountryId;
  selectedRegionId: string;
  onApply: (country: CountryId, region: string) => void;
  onClose: () => void;
}

export default function RegionalExplorer({ country, selectedRegionId, onApply, onClose }: Props) {
  const [draftCountry, setDraftCountry] = useState(country);
  const [regionId, setRegionId] = useState(selectedRegionId);
  const [structure, setStructure] = useState('All');
  const selectedCountry = countries[draftCountry];
  const region = selectedCountry.regions.find(item => item.id === regionId) || selectedCountry.regions[0];
  const structures = ['All', ...new Set(selectedCountry.regions.filter(item => item.id !== 'OTHER').map(item => item.taxStructure))];
  const visible = selectedCountry.regions.filter(item => structure === 'All' || item.taxStructure === structure);
  const packs = selectedCountry.years;

  function chooseCountry(value: string) {
    const id = value as CountryId;
    setDraftCountry(id);
    setRegionId(countries[id].regions[0].id);
    setStructure('All');
  }

  return <Dialog title="Countries & regional rules" className="explorer-dialog" onClose={onClose} footer={<>
    <button className="secondary-button" onClick={onClose}>Cancel</button>
    <button className="primary-button" onClick={() => onApply(draftCountry, region.id)}><Check size={17} />Use this region</button>
  </>}>
    <div className="regional-explorer">
      <p className="dialog-description">Explore a jurisdiction before you apply it. Your calculator location stays unchanged until you confirm.</p>
      <div className="explorer-selectors">
        <SelectField label="Country / territory" value={draftCountry} onChange={chooseCountry} options={countryOptions} />
        <SelectField label={selectedCountry.regionLabel} value={region.id} onChange={value => { setRegionId(value); setStructure('All'); }} options={selectedCountry.regions.map(item => ({ value: item.id, label: item.name }))} />
      </div>
      <div className="explorer-layout">
        <div className="regions-grid-sidebar" data-no-swipe>
          {structures.length > 2 && <SelectField label="Filter tax structure" value={structure} onChange={setStructure} options={structures.map(value => ({ value, label: value === 'All' ? 'All structures' : value }))} />}
          <p className="region-list-label">{visible.length} regional choices</p>
          <div className="region-card-list" aria-label="Regional choices">
            {visible.map(item => <button key={item.id} type="button" className={`region-select-card ${region.id === item.id ? 'is-selected' : ''}`} aria-pressed={region.id === item.id} onClick={() => setRegionId(item.id)}>
              <FlagIcon code={item.id} country={draftCountry} region size={19} />
              <span className="card-info"><strong>{item.name}</strong></span>
              {region.id === item.id && <Check size={15} />}
            </button>)}
          </div>
        </div>
        <section className="region-dossier" key={`${draftCountry}-${region.id}`} aria-label={`${region.name} reference`}>
          <div className="dossier-title"><FlagIcon code={draftCountry} size={29} /><div><span>{selectedCountry.name}</span><h3>{region.name}</h3></div></div>
          <p className="dossier-desc">{region.description}</p>
          <dl className="jurisdiction-facts">
            <div><dt><Landmark size={15} />Authority</dt><dd>{region.governingBody}</dd></div>
            <div><dt><Scale size={15} />Reference</dt><dd>{region.statuteCitation}</dd></div>
            <div><dt><Globe2 size={15} />Currency</dt><dd>{selectedCountry.currency}</dd></div>
            <div><dt>Available tax years</dt><dd>{packs.map(pack => pack.label).join(', ')}</dd></div>
          </dl>
          {selectedCountry.profiles && <div className="explorer-profiles"><h4>Dedicated taxpayer settings</h4><ul>{selectedCountry.profiles.map(profile => <li key={profile.value}>{profile.label}</li>)}</ul></div>}
          <details className="country-law-detail"><summary>National rules & scope</summary><p>{selectedCountry.rules}</p></details>
          <p className="coverage-note">{selectedCountry.coverageNote || 'Fixed-year reference for planning, not a filing service. Regional cost assumptions and historical tables need review for your circumstances. Unlisted rules require custom inputs.'}</p>
          <a className="jurisdiction-source" href={selectedCountry.source.url} target="_blank" rel="noreferrer">{selectedCountry.source.name}<ArrowUpRight size={16} /></a>
        </section>
      </div>
    </div>
  </Dialog>;
}
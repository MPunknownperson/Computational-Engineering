import { useState } from 'react';
import { ArrowRight, Check, ExternalLink, Landmark, MapPin, Scale, ShieldCheck } from 'lucide-react';
import { countries, type Region } from '../lib/regions';
import FlagIcon from './FlagIcon';
import type { CountryId } from '../lib/types';

interface Props {
  country: CountryId;
  selectedRegionId: string;
  onSelectRegion: (regionId: string, countyId?: string) => void;
  onClose?: () => void;
}

export default function RegionalExplorer({ country, selectedRegionId, onSelectRegion }: Props) {
  const currentCountry = countries[country] || countries.US;
  const [activeRegionId, setActiveRegionId] = useState(selectedRegionId || currentCountry.regions[0].id);
  const [filterStructure, setFilterStructure] = useState<string>('All');

  const activeRegion: Region = currentCountry.regions.find(r => r.id === activeRegionId) || currentCountry.regions[0];

  const structures = ['All', 'Progressive', 'Flat', 'No wage income tax', 'Graduated with local rates'];

  const filteredRegions = currentCountry.regions.filter(r => {
    if (r.id === 'OTHER') return false;
    if (filterStructure === 'All') return true;
    return r.taxStructure.toLowerCase().includes(filterStructure.toLowerCase());
  });

  return (
    <div className="regional-explorer">
      <div className="explorer-header">
        <div className="explorer-title-row">
          <div className="explorer-icon-box">
            <Landmark size={24} />
          </div>
          <div>
            <h2>{currentCountry.name} Regional Law & Economic Data Explorer</h2>
            <p>Research statutory tax codes, official governing bodies, county millages, local earned income taxes, and median household income statistics.</p>
          </div>
        </div>

        {country === 'US' && (
          <div className="explorer-filter-bar">
            <span>Filter Tax Structure:</span>
            <div className="filter-pills">
              {structures.map(s => (
                <button
                  key={s}
                  type="button"
                  className={filterStructure === s ? 'active' : ''}
                  onClick={() => setFilterStructure(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="explorer-layout">
        {/* Regions Grid List with Flags */}
        <div className="regions-grid-sidebar">
          <h3>{currentCountry.regionLabel} Jurisdictions ({filteredRegions.length})</h3>
          <div className="region-card-list">
            {filteredRegions.map(r => {
              const isSelected = r.id === activeRegion.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  className={`region-select-card ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => setActiveRegionId(r.id)}
                >
                  <FlagIcon code={r.id} country={country} region size={24} />
                  <div className="card-info">
                    <strong>{r.name}</strong>
                    <span className="card-sub">{r.taxStructure} · Sales: {r.salesTax}%</span>
                  </div>
                  {isSelected && <span className="active-dot" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detailed Region Dossier */}
        <div className="region-dossier">
          <div className="dossier-top">
            <div className="dossier-flag-title">
              <FlagIcon code={activeRegion.id} country={country} region size={44} />
              <div>
                <div className="dossier-code-row">
                  <span className="state-code-pill">{activeRegion.code}</span>
                  <span className="structure-pill">{activeRegion.taxStructure}</span>
                </div>
                <h3>{activeRegion.name}</h3>
              </div>
            </div>

            <button
              type="button"
              className="primary-button apply-region-btn"
              onClick={() => onSelectRegion(activeRegion.id)}
            >
              <Check size={16} /> Apply {activeRegion.name} to Calculator
            </button>
          </div>

          {/* Key Stat Cards */}
          <div className="dossier-stats-cards">
            <div className="dossier-stat">
              <span>Median Household Income</span>
              <strong>${activeRegion.medianIncome ? activeRegion.medianIncome.toLocaleString() : 'N/A'}</strong>
              <small>{activeRegion.medianIncome > 75000 ? 'Above US National Average' : 'Moderate Income Bracket'}</small>
            </div>
            <div className="dossier-stat">
              <span>Cost of Living Index (COLI)</span>
              <strong>{activeRegion.costOfLivingIndex}</strong>
              <small>{activeRegion.costOfLivingIndex > 100 ? `${(activeRegion.costOfLivingIndex - 100).toFixed(1)}% above base` : `${(100 - activeRegion.costOfLivingIndex).toFixed(1)}% below base`} (Base: 100)</small>
            </div>
            <div className="dossier-stat">
              <span>State / Base Sales Tax</span>
              <strong>{activeRegion.salesTax}%</strong>
              <small>Local counties may assess surtaxes</small>
            </div>
            <div className="dossier-stat">
              <span>Avg Property Tax</span>
              <strong>{activeRegion.propertyTax}%</strong>
              <small>Millage varies by school district</small>
            </div>
          </div>

          {/* Legal & Statutory Citations */}
          <div className="dossier-legal-box">
            <h4><Scale size={17} /> Governing Law & Official Authority</h4>
            <div className="legal-detail-grid">
              <div>
                <strong>Statutory Authority:</strong>
                <span>{activeRegion.governingBody}</span>
              </div>
              <div>
                <strong>Legal Statute Citation:</strong>
                <code>{activeRegion.statuteCitation}</code>
              </div>
            </div>
            <p className="dossier-desc">{activeRegion.description}</p>
          </div>

          {/* Counties & Municipalities Table */}
          {activeRegion.counties && activeRegion.counties.length > 0 && (
            <div className="dossier-counties-section">
              <h4><MapPin size={17} /> County & Local Jurisdiction Breakdown</h4>
              <p className="section-sub">Specific county populations, median income, local sales tax add-ons, and local wage/income taxes.</p>
              
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>County / Jurisdiction</th>
                      <th>County Seat</th>
                      <th>Population</th>
                      <th>Median Income</th>
                      <th>Local Sales Surtax</th>
                      <th>Local Wage / Income Tax</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRegion.counties.map(c => (
                      <tr key={c.id}>
                        <td>
                          <strong>{c.name}</strong>
                          <div className="county-rule-preview">{c.rules}</div>
                        </td>
                        <td>{c.seat}</td>
                        <td>{c.population.toLocaleString()}</td>
                        <td>${c.medianIncome.toLocaleString()}</td>
                        <td>+{c.localSalesTaxRate}% (Total: {(activeRegion.salesTax + c.localSalesTaxRate).toFixed(2)}%)</td>
                        <td>
                          {c.localIncomeTaxRate > 0 ? (
                            <span className="local-tax-badge">{c.localIncomeTaxRate}% local</span>
                          ) : (
                            <span className="no-local-tax">None</span>
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="secondary-button mini-btn"
                            onClick={() => onSelectRegion(activeRegion.id, c.id)}
                          >
                            Use this County <ArrowRight size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Representative Cities */}
          {activeRegion.cities && activeRegion.cities.length > 0 && (
            <div className="dossier-cities-bar">
              <span>Major Economic Centers:</span>
              <div className="cities-tags">
                {activeRegion.cities.map(city => (
                  <span key={city} className="city-pill">{city}</span>
                ))}
              </div>
            </div>
          )}

          <div className="dossier-footer">
            <span className="verified-note"><ShieldCheck size={14} /> Statutory references loaded for this jurisdiction</span>
            <a
              href={currentCountry.source.url}
              target="_blank"
              rel="noreferrer"
              className="text-button"
            >
              Official Department Portal <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

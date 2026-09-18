/**
 * Coverage expansion layer.
 *
 * Two jobs, both explicit about provenance:
 *  1. Widen the selectable reference years for every jurisdiction by indexing the
 *     nearest verified pack. Generated packs are labelled as indexed estimates so
 *     they are never confused with a published statutory table.
 *  2. Add further sovereign states and territories using the same reference shape.
 */
import type { Bracket, Country, CountyData, Region, TaxYearPack } from './regions';
import type { CountryId } from './types';

const INDEXATION = 0.025;

function localities(regionId: string, names: string[]): CountyData[] {
  return names.map((name, index) => ({
    id: `${regionId}-LOCAL-${index + 1}`, name, seat: name, population: 0, medianIncome: 0,
    propertyTaxRate: 0, localSalesTaxRate: 0, localIncomeTaxRate: 0, labelOnly: true,
    rules: 'Location label only. No additional tax or property rate is applied automatically.',
  }));
}

function regionsFrom(entries: [string, string, string[]?][], authority: string, citation: string, salesTax: number, description: string): Region[] {
  return entries.map(([id, name, cities = [name]]) => ({
    id, name, code: id, cities, counties: localities(id, cities), propertyTax: 0, salesTax, flatTax: 0,
    medianIncome: 0, costOfLivingIndex: 0, referenceOnly: true,
    taxStructure: 'National reference; local costs entered separately',
    statuteCitation: citation, governingBody: authority, description, taxRegime: 'national',
  }));
}

/** Rescale bracket ceilings by a compounding index factor; rates are never altered. */
function indexBrackets(brackets: Bracket[], factor: number): Bracket[] {
  return brackets.map(([cap, rate]) => [Number.isFinite(cap) ? Math.round(cap * factor) : cap, rate] as Bracket);
}

function indexPack(base: TaxYearPack, targetYear: number, baseYear: number): TaxYearPack {
  const factor = Math.pow(1 + INDEXATION, targetYear - baseYear);
  const scale = (value: number) => Math.round(value * factor);
  return {
    id: String(targetYear),
    label: `${targetYear} (indexed estimate)`,
    deduction: { single: scale(base.deduction.single), joint: scale(base.deduction.joint), head: scale(base.deduction.head) },
    federal: {
      single: indexBrackets(base.federal.single, factor),
      joint: indexBrackets(base.federal.joint, factor),
      head: indexBrackets(base.federal.head, factor),
    },
    scotland: base.scotland ? indexBrackets(base.scotland, factor) : undefined,
    regional: base.regional ? Object.fromEntries(Object.entries(base.regional).map(([key, value]) => [key, {
      brackets: indexBrackets(value.brackets, factor),
      allowance: scale(value.allowance),
      flatRate: value.flatRate,
    }])) : undefined,
    credit: base.credit,
    creditLabel: base.creditLabel,
    officialDoc: undefined,
  };
}

/**
 * Widens every country to a continuous band of reference years.
 * Verified packs are preserved untouched; only gaps are filled.
 */
export function expandYearCoverage(countries: Record<CountryId, Country>, from = 2016, to = 2027) {
  for (const country of Object.values(countries)) {
    const verified = new Map<number, TaxYearPack>();
    for (const pack of country.years) {
      const numeric = Number(pack.id.slice(0, 4));
      if (Number.isFinite(numeric)) verified.set(numeric, pack);
    }
    if (!verified.size) continue;
    const knownYears = [...verified.keys()].sort((a, b) => a - b);
    const nearest = (year: number) => knownYears.reduce((best, candidate) => Math.abs(candidate - year) < Math.abs(best - year) ? candidate : best, knownYears[0]);

    const generated: TaxYearPack[] = [];
    for (let year = from; year <= to; year++) {
      if (verified.has(year)) continue;
      if (country.years.some(pack => pack.id.startsWith(String(year)))) continue;
      const baseYear = nearest(year);
      generated.push(indexPack(verified.get(baseYear)!, year, baseYear));
    }
    country.years = [...country.years, ...generated].sort((a, b) => a.id.localeCompare(b.id, 'en'));
  }
}

type Seed = {
  id: string; name: string; authority: string; currency: string; symbol: string;
  regionLabel?: string; localityLabel?: string; vat: number; allowance?: number;
  brackets: Bracket[]; rules: string; citation: string; sourceName: string; sourceUrl: string;
  regions: [string, string, string[]?][];
};

const seeds: Seed[] = [
  {
    id: 'SS', name: 'South Sudan', authority: 'National Revenue Authority', currency: 'SSP', symbol: 'SSP', vat: 18,
    brackets: [[24000, 0], [120000, .1], [240000, .15], [Infinity, .2]],
    rules: 'Personal income tax bands on employment income; social insurance is separate.',
    citation: 'Taxation Act 2009 (as amended)', sourceName: 'National Revenue Authority South Sudan', sourceUrl: 'https://nra.gov.ss/',
    regions: [['CE', 'Central Equatoria', ['Juba']], ['WE', 'Western Equatoria', ['Yambio']], ['EE', 'Eastern Equatoria', ['Torit']], ['JO', 'Jonglei', ['Bor']], ['UN', 'Unity', ['Bentiu']], ['UNS', 'Upper Nile', ['Malakal']], ['WBG', 'Western Bahr el Ghazal', ['Wau']], ['NBG', 'Northern Bahr el Ghazal', ['Aweil']], ['WR', 'Warrap', ['Kuajok']], ['LK', 'Lakes', ['Rumbek']]],
  },
  {
    id: 'SOM', name: 'Somalia', authority: 'Ministry of Finance', currency: 'USD', symbol: '$', vat: 5,
    brackets: [[2400, 0], [12000, .06], [Infinity, .12]],
    rules: 'Federal payroll withholding reference for formal employment income.',
    citation: 'Income Tax Law No. 5 (as applied federally)', sourceName: 'Federal Ministry of Finance Somalia', sourceUrl: 'https://mof.gov.so/',
    regions: [['BN', 'Banaadir', ['Mogadishu']], ['WG', 'Woqooyi Galbeed', ['Hargeisa']], ['BR', 'Bari', ['Bosaso']], ['NG', 'Nugaal', ['Garowe']], ['MU', 'Mudug', ['Galkayo']], ['LA', 'Lower Shabelle', ['Merca']]],
  },
  {
    id: 'GN', name: 'Guinea', authority: 'Direction Nationale des Impots', currency: 'GNF', symbol: 'FG', vat: 18,
    brackets: [[1000000, 0], [3000000, .05], [5000000, .1], [10000000, .15], [Infinity, .2]],
    rules: 'Salary tax (RTS) bands annualized from the monthly schedule.',
    citation: 'Code General des Impots, RTS', sourceName: 'Direction Nationale des Impots Guinee', sourceUrl: 'https://dni.gov.gn/',
    regions: [['CNK', 'Conakry', ['Conakry']], ['KND', 'Kindia', ['Kindia']], ['BOK', 'Boke', ['Boke']], ['LAB', 'Labe', ['Labe']], ['KAN', 'Kankan', ['Kankan']], ['NZE', 'Nzerekore', ['Nzerekore']], ['FAR', 'Faranah', ['Faranah']], ['MAM', 'Mamou', ['Mamou']]],
  },
  {
    id: 'GW', name: 'Guinea-Bissau', authority: 'Direccao Geral das Contribuicoes e Impostos', currency: 'XOF', symbol: 'CFA', vat: 15,
    brackets: [[600000, 0], [1500000, .1], [3000000, .15], [Infinity, .2]],
    rules: 'Employment income reference bands; social security contributions are separate.',
    citation: 'Codigo do Imposto Profissional', sourceName: 'Ministerio das Financas Guine-Bissau', sourceUrl: 'https://www.mf.gov.gw/',
    regions: [['BS', 'Bissau', ['Bissau']], ['BA', 'Bafata', ['Bafata']], ['GA', 'Gabu', ['Gabu']], ['OI', 'Oio', ['Farim']], ['CA', 'Cacheu', ['Cacheu']], ['QU', 'Quinara', ['Buba']], ['TO', 'Tombali', ['Catio']], ['BL', 'Bolama', ['Bolama']]],
  },
  {
    id: 'CG', name: 'Republic of the Congo', authority: 'Direction Generale des Impots et des Domaines', currency: 'XAF', symbol: 'CFA', vat: 18,
    brackets: [[464000, .01], [1000000, .1], [3000000, .25], [Infinity, .4]],
    rules: 'Progressive IRPP bands on employment income after statutory abatement.',
    citation: 'Code General des Impots, IRPP', sourceName: 'Direction Generale des Impots Congo', sourceUrl: 'https://www.impots.cg/',
    regions: [['BZV', 'Brazzaville', ['Brazzaville']], ['PNR', 'Pointe-Noire', ['Pointe-Noire']], ['NIA', 'Niari', ['Dolisie']], ['CUV', 'Cuvette', ['Owando']], ['SGH', 'Sangha', ['Ouesso']], ['POO', 'Pool', ['Kinkala']]],
  },
  {
    id: 'CF', name: 'Central African Republic', authority: 'Direction Generale des Impots', currency: 'XAF', symbol: 'CFA', vat: 19,
    brackets: [[240000, 0], [1200000, .1], [3000000, .2], [Infinity, .35]],
    rules: 'Employment income schedule reference. Family quotient rules are not modeled.',
    citation: 'Code General des Impots RCA', sourceName: 'Ministere des Finances RCA', sourceUrl: 'https://www.finances.gouv.cf/',
    regions: [['BGF', 'Bangui', ['Bangui']], ['OMB', 'Ombella-MPoko', ['Bimbo']], ['LOB', 'Lobaye', ['Mbaiki']], ['OUK', 'Ouaka', ['Bambari']], ['NAN', 'Nana-Mambere', ['Bouar']], ['HTK', 'Haute-Kotto', ['Bria']]],
  },
  {
    id: 'ER', name: 'Eritrea', authority: 'Inland Revenue Department', currency: 'ERN', symbol: 'Nfk', vat: 5,
    brackets: [[6000, .02], [18000, .05], [36000, .1], [72000, .15], [Infinity, .3]],
    rules: 'Employment income tax reference schedule.',
    citation: 'Proclamation No. 164/2011', sourceName: 'Ministry of Finance Eritrea', sourceUrl: 'https://www.eritrea.be/',
    regions: [['MA', 'Maekel', ['Asmara']], ['AN', 'Anseba', ['Keren']], ['DU', 'Debub', ['Mendefera']], ['GB', 'Gash-Barka', ['Barentu']], ['SK', 'Northern Red Sea', ['Massawa']], ['DK', 'Southern Red Sea', ['Assab']]],
  },
  {
    id: 'DJ', name: 'Djibouti', authority: 'Direction Generale des Impots', currency: 'DJF', symbol: 'Fdj', vat: 10,
    brackets: [[360000, 0], [720000, .15], [1500000, .18], [Infinity, .3]],
    rules: 'ITS employment schedule reference annualized from monthly bands.',
    citation: 'Code General des Impots, ITS', sourceName: 'Ministere du Budget Djibouti', sourceUrl: 'https://www.ministere-budget.dj/',
    regions: [['DJ', 'Djibouti City', ['Djibouti']], ['AS', 'Ali Sabieh', ['Ali Sabieh']], ['TA', 'Tadjourah', ['Tadjourah']], ['OB', 'Obock', ['Obock']], ['DK', 'Dikhil', ['Dikhil']], ['AR', 'Arta', ['Arta']]],
  },
  {
    id: 'BI', name: 'Burundi', authority: 'Office Burundais des Recettes (OBR)', currency: 'BIF', symbol: 'FBu', vat: 18,
    brackets: [[1800000, 0], [3600000, .2], [Infinity, .3]],
    rules: 'PAYE bands on employment income; INSS contributions are separate.',
    citation: 'Loi relative a l impot sur les revenus', sourceName: 'Office Burundais des Recettes', sourceUrl: 'https://www.obr.bi/',
    regions: [['BJM', 'Bujumbura Mairie', ['Bujumbura']], ['GIT', 'Gitega', ['Gitega']], ['NGO', 'Ngozi', ['Ngozi']], ['RUY', 'Ruyigi', ['Ruyigi']], ['MAK', 'Makamba', ['Makamba']], ['KAY', 'Kayanza', ['Kayanza']]],
  },
  {
    id: 'KM', name: 'Comoros', authority: 'Direction Generale des Impots', currency: 'KMF', symbol: 'CF', vat: 10,
    brackets: [[150000, 0], [500000, .1], [1000000, .15], [Infinity, .3]],
    rules: 'Employment income reference bands.',
    citation: 'Code General des Impots Comores', sourceName: 'Ministere des Finances Comores', sourceUrl: 'https://www.finances.gov.km/',
    regions: [['G', 'Grande Comore', ['Moroni']], ['A', 'Anjouan', ['Mutsamudu']], ['M', 'Moheli', ['Fomboni']]],
  },
  {
    id: 'ST', name: 'Sao Tome and Principe', authority: 'Direccao dos Impostos', currency: 'STN', symbol: 'Db', vat: 15,
    brackets: [[12000, 0], [30000, .1], [60000, .15], [Infinity, .25]],
    rules: 'IRS employment income reference bands.',
    citation: 'Codigo do IRS STP', sourceName: 'Ministerio das Financas STP', sourceUrl: 'https://www.mf.gov.st/',
    regions: [['S', 'Sao Tome', ['Sao Tome']], ['P', 'Principe', ['Santo Antonio']]],
  },
  {
    id: 'GQ', name: 'Equatorial Guinea', authority: 'Ministerio de Hacienda', currency: 'XAF', symbol: 'CFA', vat: 15,
    brackets: [[1000000, 0], [3000000, .1], [5000000, .15], [10000000, .2], [Infinity, .35]],
    rules: 'Employment income reference bands after statutory deduction.',
    citation: 'Ley de Regimen Tributario', sourceName: 'Ministerio de Hacienda Guinea Ecuatorial', sourceUrl: 'https://minhacienda-gob.com/',
    regions: [['BN', 'Bioko Norte', ['Malabo']], ['BS', 'Bioko Sur', ['Luba']], ['LI', 'Litoral', ['Bata']], ['KN', 'Kie-Ntem', ['Ebebiyin']], ['WN', 'Wele-Nzas', ['Mongomo']], ['CS', 'Centro Sur', ['Evinayong']]],
  },
  {
    id: 'TM', name: 'Turkmenistan', authority: 'Main State Tax Service', currency: 'TMT', symbol: 'm', vat: 15,
    brackets: [[Infinity, .1]],
    rules: 'Flat personal income tax on employment earnings.',
    citation: 'Tax Code of Turkmenistan', sourceName: 'Main State Tax Service Turkmenistan', sourceUrl: 'https://tax.gov.tm/',
    regions: [['AS', 'Ashgabat', ['Ashgabat']], ['AH', 'Ahal', ['Anau']], ['BA', 'Balkan', ['Balkanabat']], ['DA', 'Dashoguz', ['Dashoguz']], ['LE', 'Lebap', ['Turkmenabat']], ['MA', 'Mary', ['Mary']]],
  },
  {
    id: 'AF', name: 'Afghanistan', authority: 'Afghanistan Revenue Department', currency: 'AFN', symbol: '؋', vat: 0,
    brackets: [[60000, 0], [150000, .02], [1200000, .1], [Infinity, .2]],
    rules: 'Annualized wage withholding bands from the monthly salary schedule.',
    citation: 'Income Tax Law 2009', sourceName: 'Afghanistan Revenue Department', sourceUrl: 'https://ard.gov.af/',
    regions: [['KAB', 'Kabul', ['Kabul']], ['HER', 'Herat', ['Herat']], ['BAL', 'Balkh', ['Mazar-i-Sharif']], ['KAN', 'Kandahar', ['Kandahar']], ['NAN', 'Nangarhar', ['Jalalabad']], ['KUN', 'Kunduz', ['Kunduz']]],
  },
  {
    id: 'YE', name: 'Yemen', authority: 'Yemen Tax Authority', currency: 'YER', symbol: '﷼', vat: 5,
    brackets: [[120000, 0], [600000, .1], [1500000, .15], [Infinity, .2]],
    rules: 'Employment income withholding reference bands.',
    citation: 'Income Tax Law No. 17 of 2010', sourceName: 'Yemen Ministry of Finance', sourceUrl: 'https://mof.gov.ye/',
    regions: [['SAA', 'Sanaa', ['Sanaa']], ['ADE', 'Aden', ['Aden']], ['TAI', 'Taiz', ['Taiz']], ['HDH', 'Hadhramaut', ['Mukalla']], ['HOD', 'Al Hudaydah', ['Al Hudaydah']], ['IBB', 'Ibb', ['Ibb']]],
  },
  {
    id: 'SY', name: 'Syria', authority: 'General Commission for Taxes and Fees', currency: 'SYP', symbol: '£S', vat: 0,
    brackets: [[60000, 0], [180000, .05], [600000, .1], [1800000, .15], [Infinity, .22]],
    rules: 'Payroll tax bands on employment income.',
    citation: 'Legislative Decree No. 24 of 2003', sourceName: 'Syrian Ministry of Finance', sourceUrl: 'http://www.syrianfinance.gov.sy/',
    regions: [['DI', 'Damascus', ['Damascus']], ['AL', 'Aleppo', ['Aleppo']], ['HM', 'Homs', ['Homs']], ['LA', 'Latakia', ['Latakia']], ['HA', 'Hama', ['Hama']], ['TA', 'Tartus', ['Tartus']]],
  },
  {
    id: 'LY', name: 'Libya', authority: 'Tax Authority of Libya', currency: 'LYD', symbol: 'LD', vat: 0,
    brackets: [[12000, .05], [Infinity, .1]],
    rules: 'Two-band employment income tax plus a separate jihad levy not modeled here.',
    citation: 'Income Tax Law No. 7 of 2010', sourceName: 'Libyan Ministry of Finance', sourceUrl: 'https://finance.gov.ly/',
    regions: [['TB', 'Tripoli', ['Tripoli']], ['BA', 'Benghazi', ['Benghazi']], ['MI', 'Misrata', ['Misrata']], ['ZA', 'Zawiya', ['Zawiya']], ['SB', 'Sabha', ['Sabha']], ['TO', 'Tobruk', ['Tobruk']]],
  },
  {
    id: 'MR', name: 'Mauritania', authority: 'Direction Generale des Impots', currency: 'MRU', symbol: 'UM', vat: 16,
    brackets: [[9000, .15], [21000, .25], [Infinity, .4]],
    rules: 'ITS employment schedule reference annualized from monthly bands.',
    citation: 'Code General des Impots, ITS', sourceName: 'Direction Generale des Impots Mauritanie', sourceUrl: 'https://www.impots.gov.mr/',
    regions: [['NKC', 'Nouakchott', ['Nouakchott']], ['DAK', 'Dakhlet Nouadhibou', ['Nouadhibou']], ['TRZ', 'Trarza', ['Rosso']], ['ADR', 'Adrar', ['Atar']], ['HEC', 'Hodh Ech Chargui', ['Nema']], ['GOR', 'Gorgol', ['Kaedi']]],
  },
  {
    id: 'BQ', name: 'Caribbean Netherlands', authority: 'Belastingdienst Caribisch Nederland', currency: 'USD', symbol: '$', vat: 8,
    brackets: [[32538, .308], [Infinity, .356]], allowance: 13542,
    rules: 'Income tax with a tax-free allowance, applied across Bonaire, Sint Eustatius and Saba.',
    citation: 'Wet inkomstenbelasting BES', sourceName: 'Belastingdienst Caribisch Nederland', sourceUrl: 'https://www.belastingdienst-cn.nl/',
    regions: [['BO', 'Bonaire', ['Kralendijk']], ['SE', 'Sint Eustatius', ['Oranjestad']], ['SA', 'Saba', ['The Bottom']]],
  },
  {
    id: 'SX', name: 'Sint Maarten', authority: 'Belastingdienst Sint Maarten', currency: 'ANG', symbol: 'ƒ', vat: 5,
    brackets: [[32619, .129], [48606, .198], [92220, .265], [131280, .331], [Infinity, .475]],
    rules: 'Progressive wage tax bands on employment income.',
    citation: 'Landsverordening op de inkomstenbelasting', sourceName: 'Government of Sint Maarten', sourceUrl: 'https://www.sintmaartengov.org/',
    regions: [['PP', 'Philipsburg', ['Philipsburg']], ['CB', 'Cul de Sac', ['Cul de Sac']], ['SL', 'Simpson Bay', ['Simpson Bay']]],
  },
  {
    id: 'TC', name: 'Turks and Caicos Islands', authority: 'Revenue Department', currency: 'USD', symbol: '$', vat: 0,
    brackets: [[Infinity, 0]],
    rules: 'No personal income tax. Revenue comes from duties, stamp duty and accommodation tax.',
    citation: 'No personal income tax statute', sourceName: 'TCI Revenue Department', sourceUrl: 'https://www.gov.tc/revenue/',
    regions: [['PR', 'Providenciales', ['Providenciales']], ['GT', 'Grand Turk', ['Cockburn Town']], ['NC', 'North Caicos', ['Bottle Creek']], ['MC', 'Middle Caicos', ['Conch Bar']], ['SC', 'South Caicos', ['Cockburn Harbour']]],
  },
  {
    id: 'VG', name: 'British Virgin Islands', authority: 'Inland Revenue Department', currency: 'USD', symbol: '$', vat: 0,
    brackets: [[Infinity, 0]],
    rules: 'No personal income tax; a payroll tax applies to employers and employees.',
    citation: 'Payroll Taxes Act 2004', sourceName: 'BVI Inland Revenue Department', sourceUrl: 'https://bvi.gov.vg/',
    regions: [['TO', 'Tortola', ['Road Town']], ['VG', 'Virgin Gorda', ['Spanish Town']], ['AN', 'Anegada', ['The Settlement']], ['JV', 'Jost Van Dyke', ['Great Harbour']]],
  },
  {
    id: 'AI', name: 'Anguilla', authority: 'Inland Revenue Department', currency: 'XCD', symbol: 'EC$', vat: 13,
    brackets: [[Infinity, 0]],
    rules: 'No personal income tax; an interim stabilisation levy applies to wages.',
    citation: 'Interim Stabilisation Levy Act', sourceName: 'Government of Anguilla', sourceUrl: 'https://www.gov.ai/',
    regions: [['VA', 'The Valley', ['The Valley']], ['SH', 'Sandy Hill', ['Sandy Hill']], ['WE', 'West End', ['West End']]],
  },
  {
    id: 'MS', name: 'Montserrat', authority: 'Inland Revenue Department', currency: 'XCD', symbol: 'EC$', vat: 0,
    brackets: [[15000, .05], [30000, .15], [Infinity, .3]], allowance: 15000,
    rules: 'Progressive income tax with a personal allowance.',
    citation: 'Income and Corporation Tax Act', sourceName: 'Government of Montserrat', sourceUrl: 'https://www.gov.ms/',
    regions: [['BR', 'Brades', ['Brades']], ['SP', 'Saint Peter', ['Salem']], ['SJ', 'Saint John', ['Saint Johns']]],
  },
  {
    id: 'FK', name: 'Falkland Islands', authority: 'Falkland Islands Taxation Office', currency: 'FKP', symbol: '£', vat: 0,
    brackets: [[12000, .21], [Infinity, .26]], allowance: 18000,
    rules: 'Two-band income tax with a personal allowance.',
    citation: 'Taxes Ordinance 1997', sourceName: 'Falkland Islands Government', sourceUrl: 'https://www.falklands.gov.fk/',
    regions: [['ST', 'Stanley', ['Stanley']], ['CA', 'Camp', ['Goose Green']]],
  },
  {
    id: 'PM', name: 'Saint Pierre and Miquelon', authority: 'Service des Impots', currency: 'EUR', symbol: '€', vat: 0,
    brackets: [[11294, 0], [28797, .11], [82341, .3], [Infinity, .41]],
    rules: 'French overseas collectivity applying a locally adapted income tax schedule.',
    citation: 'Code local des impots', sourceName: 'Collectivite de Saint-Pierre-et-Miquelon', sourceUrl: 'https://www.spm-ct975.fr/',
    regions: [['SP', 'Saint-Pierre', ['Saint-Pierre']], ['MQ', 'Miquelon-Langlade', ['Miquelon']]],
  },
];

export const extraSovereigns = Object.fromEntries(seeds.map(seed => [seed.id, {
  name: seed.name,
  legalBody: seed.authority,
  rules: seed.rules,
  currency: seed.currency,
  symbol: seed.symbol,
  regionLabel: seed.regionLabel || 'Region / province',
  localityLabel: seed.localityLabel || 'City / district',
  taxYear: '2025',
  coverageNote: 'Dated employment-income reference. Localities identify your location; local charges require your own inputs.',
  source: { name: seed.sourceName, url: seed.sourceUrl },
  years: [{
    id: '2025',
    label: '2025 reference',
    deduction: { single: seed.allowance || 0, joint: seed.allowance || 0, head: seed.allowance || 0 },
    federal: { single: seed.brackets, joint: seed.brackets, head: seed.brackets },
  }],
  regions: regionsFrom(seed.regions, seed.authority, seed.citation, seed.vat, seed.rules),
} as Country])) as Record<string, Country>;

export const extraSovereignIds = seeds.map(seed => seed.id);

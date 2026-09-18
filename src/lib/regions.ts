import type { CountryId, TaxRegime, WorkspaceSettings } from './types';
import { additionalCountries, expandRegionalCoverage } from './countryExpansion';

export type Bracket = [number, number];

export interface TaxYearPack {
  id: string;
  label: string;
  deduction: { single: number; joint: number; head: number };
  federal: { single: Bracket[]; joint: Bracket[]; head: Bracket[] };
  scotland?: Bracket[];
  regional?: Record<string, { brackets: Bracket[]; allowance: number; flatRate?: number }>;
  credit?: (income: number) => number;
  creditLabel?: string;
  officialDoc?: { title: string; instrument: string; citation: string; effectiveDate: string; url: string };
}

export interface CountyData {
  id: string;
  name: string;
  seat: string;
  population: number;
  medianIncome: number;
  propertyTaxRate: number; // in %
  localSalesTaxRate: number; // local add-on in %
  localIncomeTaxRate: number; // local wage/income tax in %
  rules: string;
  labelOnly?: boolean;
}

export interface Region {
  id: string;
  name: string;
  code: string;
  cities: string[];
  counties: CountyData[];
  propertyTax: number;
  salesTax: number;
  brackets?: Bracket[];
  flatTax?: number;
  allowance?: number;
  medianIncome: number;
  costOfLivingIndex: number; // 100 = national average
  taxStructure: string;
  statuteCitation: string;
  governingBody: string;
  description: string;
  taxRegime?: TaxRegime;
  divergenceNote?: string;
  customTax?: boolean;
  referenceOnly?: boolean;
}

export interface TaxProfile {
  value: string;
  label: string;
  description: string;
  brackets?: Bracket[];
  allowance?: number;
}

export interface Country {
  name: string;
  legalBody: string;
  rules: string;
  currency: string;
  symbol: string;
  regionLabel: string;
  taxYear: string;
  regions: Region[];
  source: { name: string; url: string };
  years: TaxYearPack[];
  locale?: string;
  localityLabel?: string;
  coverageNote?: string;
  profiles?: TaxProfile[];
  additionalAllowanceLabel?: string;
  contribution?: { label: string; rate: number; annualCap: number; description: string; source: { name: string; url: string }; requiresCap?: boolean };
}

const US_RATES = [.1, .12, .22, .24, .32, .35, .37];
const US_CA_RATES = [.01, .02, .04, .06, .08, .093, .103, .113, .123];
const US_NY_RATES = [.04, .045, .0525, .0585, .0597, .0633, .0685, .0965, .103, .109];

const usYear = (
  id: string,
  label: string,
  single: number[],
  joint: number[],
  head: number[],
  deduction: [number, number, number],
  caCaps: number[],
  caAllowance: number,
  nyCaps: number[],
  nyAllowance: number,
  officialDoc: { title: string; instrument: string; citation: string; effectiveDate: string; url: string }
): TaxYearPack => ({
  id,
  label,
  deduction: { single: deduction[0], joint: deduction[1], head: deduction[2] },
  federal: {
    single: single.map((cap, i) => [cap, US_RATES[i]] as Bracket),
    joint: joint.map((cap, i) => [cap, US_RATES[i]] as Bracket),
    head: head.map((cap, i) => [cap, US_RATES[i]] as Bracket),
  },
  regional: {
    CA: { brackets: caCaps.map((cap, i) => [cap, US_CA_RATES[i]] as Bracket), allowance: caAllowance },
    NY: { brackets: nyCaps.map((cap, i) => [cap, US_NY_RATES[i]] as Bracket), allowance: nyAllowance },
  },
  officialDoc,
});

export const countries: Record<CountryId, Country> = {
  ...additionalCountries,
  US: {
    name: 'United States',
    legalBody: 'Internal Revenue Service (IRS)',
    rules: 'Federal income tax applies nationwide across 7 progressive statutory brackets (26 U.S.C. § 1). States levy separate income taxes ranging from graduated brackets to flat rates and constitutionally barred wage taxes. Local counties and municipalities may assess local income taxes, millage rates, and sales surtaxes.',
    currency: 'USD',
    symbol: '$',
    regionLabel: 'State or special region',
    taxYear: '2025',
    source: { name: 'IRS Revenue Procedures (Rev. Proc. 2021-45 to 2025-32)', url: 'https://www.irs.gov/filing/federal-income-tax-rates-and-brackets' },
    years: [
      usYear('2021', '2021',
        [9950, 40525, 86375, 164925, 209425, 523600, Infinity],
        [19900, 81050, 172750, 329850, 418850, 628300, Infinity],
        [14200, 54200, 86350, 164900, 209400, 523600, Infinity],
        [12550, 25100, 18800],
        [9325, 22107, 34892, 48435, 61214, 312686, 375221, 625369, Infinity], 4644,
        [8500, 11700, 13900, 21400, 80650, 215400, 1077550, 5000000, 25000000, Infinity], 8000,
        { title: 'IRS Revenue Procedure 2020-45', instrument: 'Treasury Inflation Adjustments for Tax Year 2021', citation: '26 U.S.C. § 1(f)', effectiveDate: '2021-01-01', url: 'https://www.irs.gov/pub/irs-drop/rp-20-45.pdf' }
      ),
      usYear('2022', '2022',
        [10275, 41775, 89075, 170050, 215950, 539900, Infinity],
        [20550, 83550, 178150, 340100, 431900, 647850, Infinity],
        [14650, 55900, 89050, 170050, 215950, 539900, Infinity],
        [12950, 25900, 19400],
        [10099, 23942, 37788, 52455, 66295, 338639, 406364, 677275, Infinity], 5202,
        [8500, 11700, 13900, 21400, 80650, 215400, 1077550, 5000000, 25000000, Infinity], 8000,
        { title: 'IRS Revenue Procedure 2021-45', instrument: 'Treasury Inflation Adjustments for Tax Year 2022', citation: '26 U.S.C. § 1(f)', effectiveDate: '2022-01-01', url: 'https://www.irs.gov/pub/irs-drop/rp-21-45.pdf' }
      ),
      usYear('2023', '2023',
        [11000, 44725, 95375, 182100, 231250, 578125, Infinity],
        [22000, 89450, 190750, 364200, 462500, 693750, Infinity],
        [15700, 59850, 95350, 182100, 231250, 578100, Infinity],
        [13850, 27700, 20800],
        [10701, 24809, 39838, 54801, 69323, 360201, 431779, 722979, Infinity], 5292,
        [8500, 11700, 13900, 21400, 80650, 215400, 1077550, 5000000, 25000000, Infinity], 8000,
        { title: 'IRS Revenue Procedure 2022-38', instrument: 'Treasury Inflation Adjustments for Tax Year 2023', citation: '26 U.S.C. § 1(f)', effectiveDate: '2023-01-01', url: 'https://www.irs.gov/pub/irs-drop/rp-22-38.pdf' }
      ),
      usYear('2024', '2024',
        [11600, 47150, 100525, 191950, 243725, 609350, Infinity],
        [23200, 94300, 201050, 383900, 487450, 731200, Infinity],
        [16550, 63100, 100500, 191950, 243700, 609350, Infinity],
        [14600, 29200, 21900],
        [10701, 24809, 39838, 54801, 69323, 360201, 431779, 722979, Infinity], 5540,
        [8500, 11700, 13900, 21400, 80650, 215400, 1077550, 5000000, 25000000, Infinity], 8000,
        { title: 'IRS Revenue Procedure 2023-34', instrument: 'Treasury Inflation Adjustments for Tax Year 2024', citation: '26 U.S.C. § 1(f)', effectiveDate: '2024-01-01', url: 'https://www.irs.gov/pub/irs-drop/rp-23-34.pdf' }
      ),
      usYear('2025', '2025',
        [11925, 48475, 103350, 197300, 250525, 626350, Infinity],
        [23850, 96950, 206700, 394600, 501050, 751600, Infinity],
        [17000, 64850, 103350, 197300, 250500, 626350, Infinity],
        [15750, 31500, 23625],
        [11079, 26264, 41452, 57542, 72724, 371479, 445771, 742953, Infinity], 5706,
        [8500, 11700, 13900, 21400, 80650, 215400, 1077550, 5000000, 25000000, Infinity], 8000,
        { title: 'IRS Revenue Procedure 2024-40 & One Big Beautiful Bill', instrument: 'Treasury Annual Indexing for Tax Year 2025', citation: '26 U.S.C. § 1(f) & OBBBA', effectiveDate: '2025-01-01', url: 'https://www.irs.gov/filing/federal-income-tax-rates-and-brackets' }
      ),
      usYear('2026', '2026 (Projected / Rev. Proc. 2025-32)',
        [12250, 49800, 106150, 202600, 257300, 643250, Infinity],
        [24500, 99600, 212300, 405200, 514600, 771900, Infinity],
        [17450, 66600, 106150, 202600, 257300, 643250, Infinity],
        [16100, 32200, 24150],
        [11356, 26920, 42488, 58980, 74542, 380766, 456915, 761527, Infinity], 5849,
        [8500, 11700, 13900, 21400, 80650, 215400, 1077550, 5000000, 25000000, Infinity], 8000,
        { title: 'IRS Revenue Procedure 2025-32', instrument: '2026 Tax Inflation Adjustments', citation: 'Rev. Proc. 2025-32', effectiveDate: '2026-01-01', url: 'https://www.irs.gov/pub/irs-drop/rp-25-32.pdf' }
      ),
    ],
    regions: [
      {
        id: 'CA',
        name: 'California',
        code: 'CA',
        cities: ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento', 'Oakland'],
        propertyTax: 1.1,
        salesTax: 7.25,
        allowance: 5706,
        brackets: [[11079, .01], [26264, .02], [41452, .04], [57542, .06], [72724, .08], [371479, .093], [445771, .103], [742953, .113], [Infinity, .123]],
        medianIncome: 91905,
        costOfLivingIndex: 134.5,
        taxStructure: 'Progressive',
        statuteCitation: 'Cal. Rev. & Tax. Code § 17041',
        governingBody: 'California Franchise Tax Board (FTB)',
        description: '9 graduated brackets ranging from 1% to 12.3%, plus an additional 1% Mental Health Services Tax surcharge on taxable income exceeding $1,000,000 (total top rate 13.3%). Statewide base sales tax is 7.25% with district taxes adding up to 3% in cities like San Francisco and Los Angeles.',
        counties: [
          { id: 'CA-LA', name: 'Los Angeles County', seat: 'Los Angeles', population: 9721138, medianIncome: 83411, propertyTaxRate: 1.15, localSalesTaxRate: 2.25, localIncomeTaxRate: 0, rules: 'Base 7.25% + 2.25% county district taxes = 9.50% total sales tax. Proposition 13 restricts property tax assessment increases to 2% annually.' },
          { id: 'CA-SF', name: 'San Francisco County', seat: 'San Francisco', population: 808437, medianIncome: 136689, propertyTaxRate: 1.18, localSalesTaxRate: 1.375, localIncomeTaxRate: 0, rules: 'Consolidated city-county with 8.625% sales tax. Employs a gross receipts business tax rather than personal wage withholding.' },
          { id: 'CA-SD', name: 'San Diego County', seat: 'San Diego', population: 3276208, medianIncome: 96974, propertyTaxRate: 1.12, localSalesTaxRate: 0.5, localIncomeTaxRate: 0, rules: 'Base 7.25% + 0.50% TransNet county tax = 7.75% base sales tax (cities like Chula Vista assess 8.25%).' },
          { id: 'CA-SC', name: 'Santa Clara County (Silicon Valley)', seat: 'San Jose', population: 1877592, medianIncome: 153792, propertyTaxRate: 1.16, localSalesTaxRate: 1.875, localIncomeTaxRate: 0, rules: 'Total sales tax 9.125% in San Jose. High concentration of high-bracket wage earners and equity compensation subject to the 13.3% top marginal bracket.' },
          { id: 'CA-ORA', name: 'Orange County', seat: 'Santa Ana', population: 3151184, medianIncome: 109361, propertyTaxRate: 1.08, localSalesTaxRate: 0.5, localIncomeTaxRate: 0, rules: '7.75% base sales tax. Moderate property millage rates with Mello-Roos special assessment bonds in newer suburban master developments.' },
        ],
      },
      {
        id: 'TX',
        name: 'Texas',
        code: 'TX',
        cities: ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth', 'El Paso'],
        propertyTax: 1.74,
        salesTax: 6.25,
        flatTax: 0,
        allowance: 0,
        medianIncome: 73035,
        costOfLivingIndex: 93.0,
        taxStructure: 'No wage income tax',
        statuteCitation: 'Tex. Const. art. VIII, § 24-a; Tex. Tax Code Ann. § 151',
        governingBody: 'Texas Comptroller of Public Accounts',
        description: 'Texas has no state personal income tax (permanently protected by constitutional amendment Proposition 4 in 2019). Revenue relies heavily on local property taxes (among the highest in the US, averaging 1.6%–2.2%) and state/local sales tax (6.25% state + up to 2% local = 8.25%).',
        counties: [
          { id: 'TX-HAR', name: 'Harris County (Houston)', seat: 'Houston', population: 4780913, medianIncome: 70040, propertyTaxRate: 2.03, localSalesTaxRate: 2.0, localIncomeTaxRate: 0, rules: 'Effective property tax ~2.03% with school districts (HISD), hospital district, and Port of Houston levies. Sales tax is capped at the 8.25% constitutional ceiling.' },
          { id: 'TX-DAL', name: 'Dallas County', seat: 'Dallas', population: 2600079, medianIncome: 72882, propertyTaxRate: 1.93, localSalesTaxRate: 2.0, localIncomeTaxRate: 0, rules: 'City of Dallas + Dallas County + DISD combine for ~1.93% effective property tax rate. Total sales tax 8.25%.' },
          { id: 'TX-TRA', name: 'Travis County (Austin)', seat: 'Austin', population: 1326437, medianIncome: 92832, propertyTaxRate: 1.81, localSalesTaxRate: 2.0, localIncomeTaxRate: 0, rules: 'Highest median household income in Texas. Homestead exemption provides 20% appraisal reduction for primary residences.' },
          { id: 'TX-BEX', name: 'Bexar County (San Antonio)', seat: 'San Antonio', population: 2059530, medianIncome: 67332, propertyTaxRate: 1.98, localSalesTaxRate: 2.0, localIncomeTaxRate: 0, rules: 'Combined city, county, and school tax rates average nearly 2.0%. High military and healthcare economic bases.' },
        ],
      },
      {
        id: 'NY',
        name: 'New York',
        code: 'NY',
        cities: ['New York City', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse', 'Albany'],
        propertyTax: 1.72,
        salesTax: 4.0,
        allowance: 8000,
        brackets: [[8500, .04], [11700, .045], [13900, .0525], [21400, .0585], [80650, .0597], [215400, .0633], [1077550, .0685], [5000000, .0965], [25000000, .103], [Infinity, .109]],
        medianIncome: 81386,
        costOfLivingIndex: 130.2,
        taxStructure: 'Graduated with local rates',
        statuteCitation: 'N.Y. Tax Law Art. 22 § 601; NYC Admin. Code § 11-1701',
        governingBody: 'New York State Department of Taxation and Finance (NY DTF)',
        description: 'New York state rates run from 4% to 10.9% across 10 progressive brackets. Importantly, residents of New York City pay an additional graduated city income tax (3.078% to 3.876%), while Yonkers assesses a 16.75% surcharge on state net tax. Sales tax combines 4.0% state plus 3.0%–5.0% county/city add-on.',
        counties: [
          { id: 'NY-NYC', name: 'New York City (5 Boroughs)', seat: 'New York', population: 8258035, medianIncome: 79728, propertyTaxRate: 0.9, localSalesTaxRate: 4.875, localIncomeTaxRate: 3.876, rules: 'New York City residents pay local city personal income tax up to 3.876% directly via Form IT-201. Combined NYC sales tax is 8.875% (4% state + 4.5% city + 0.375% MCTD).' },
          { id: 'NY-WES', name: 'Westchester County', seat: 'White Plains', population: 990427, medianIncome: 114650, propertyTaxRate: 2.45, localSalesTaxRate: 4.375, localIncomeTaxRate: 0, rules: 'Highest effective property tax rates in the nation (often exceeding $10,000/year). Yonkers residents within Westchester pay a 16.75% local surcharge on state tax.' },
          { id: 'NY-ERI', name: 'Erie County (Buffalo)', seat: 'Buffalo', population: 950319, medianIncome: 65112, propertyTaxRate: 2.58, localSalesTaxRate: 4.75, localIncomeTaxRate: 0, rules: 'Combined county and state sales tax of 8.75%. High property tax millage with relatively lower residential valuations.' },
          { id: 'NY-NAS', name: 'Nassau County (Long Island)', seat: 'Mineola', population: 1383726, medianIncome: 131920, propertyTaxRate: 2.24, localSalesTaxRate: 4.625, localIncomeTaxRate: 0, rules: 'Part of the Metropolitan Commuter Transportation District (MCTD) with 8.625% sales tax. Heavily impacted by the federal $10,000 SALT deduction limit.' },
        ],
      },
      {
        id: 'FL',
        name: 'Florida',
        code: 'FL',
        cities: ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale', 'St. Petersburg'],
        propertyTax: 0.91,
        salesTax: 6.0,
        flatTax: 0,
        allowance: 0,
        medianIncome: 67917,
        costOfLivingIndex: 102.8,
        taxStructure: 'No wage income tax',
        statuteCitation: 'Fla. Const. art. VII, § 5; Fla. Stat. § 212',
        governingBody: 'Florida Department of Revenue',
        description: 'Florida constitutionally prohibits a personal state income tax. State revenue is anchored by a 6.0% sales tax (with discretionary county surtaxes up to 1.5%) and property taxes. The Save Our Homes constitutional amendment caps annual primary residence assessed value growth at 3% or CPI.',
        counties: [
          { id: 'FL-MIA', name: 'Miami-Dade County', seat: 'Miami', population: 2673837, medianIncome: 64750, propertyTaxRate: 1.02, localSalesTaxRate: 1.0, localIncomeTaxRate: 0, rules: '7.0% total sales tax (6% state + 1% county transit surtax). High tourist spending provides significant sales tax export.' },
          { id: 'FL-BRO', name: 'Broward County', seat: 'Fort Lauderdale', population: 1944375, medianIncome: 70331, propertyTaxRate: 1.08, localSalesTaxRate: 1.0, localIncomeTaxRate: 0, rules: '7.0% combined sales tax. Florida $50,000 Homestead Exemption exempts $25,000 from all taxes plus another $25,000 from non-school taxes.' },
          { id: 'FL-HIL', name: 'Hillsborough County (Tampa)', seat: 'Tampa', population: 1513301, medianIncome: 70612, propertyTaxRate: 1.01, localSalesTaxRate: 1.5, localIncomeTaxRate: 0, rules: '7.5% total sales tax. Growing tech and financial services cluster benefiting from no state wage tax.' },
          { id: 'FL-ORA', name: 'Orange County (Orlando)', seat: 'Orlando', population: 1452726, medianIncome: 71298, propertyTaxRate: 0.98, localSalesTaxRate: 0.5, localIncomeTaxRate: 0, rules: '6.5% sales tax. Resort and theme park tax collections support municipal infrastructure.' },
        ],
      },
      {
        id: 'WA',
        name: 'Washington',
        code: 'WA',
        cities: ['Seattle', 'Spokane', 'Tacoma', 'Bellevue', 'Vancouver', 'Olympia'],
        propertyTax: 0.98,
        salesTax: 6.5,
        flatTax: 0,
        allowance: 0,
        medianIncome: 90325,
        costOfLivingIndex: 115.1,
        taxStructure: 'No wage income tax',
        statuteCitation: 'Wash. Const. art. VII, § 1; RCW 82.08; RCW 82.87',
        governingBody: 'Washington State Department of Revenue',
        description: 'Washington state constitutionally treats personal income as property, barring a progressive income tax. There is no wage income tax, but a 7.0% capital gains tax applies to long-term gains exceeding $250,000. Combined sales taxes in King County reach 10.35% (the highest in the US).',
        counties: [
          { id: 'WA-KIN', name: 'King County (Seattle/Bellevue)', seat: 'Seattle', population: 2269675, medianIncome: 110586, propertyTaxRate: 1.01, localSalesTaxRate: 3.85, localIncomeTaxRate: 0, rules: 'Combined sales tax in Seattle is 10.35% (6.5% state + 3.85% local/transit). High concentration of software and cloud engineers with equity compensation exempt from state wage withholding.' },
          { id: 'WA-PIE', name: 'Pierce County (Tacoma)', seat: 'Tacoma', population: 927204, medianIncome: 85859, propertyTaxRate: 1.09, localSalesTaxRate: 3.5, localIncomeTaxRate: 0, rules: 'Combined sales tax 10.0%. Property taxes support local school and emergency services bonds.' },
          { id: 'WA-SPO', name: 'Spokane County', seat: 'Spokane', population: 539339, medianIncome: 68612, propertyTaxRate: 0.95, localSalesTaxRate: 2.5, localIncomeTaxRate: 0, rules: 'Combined sales tax 9.0%. Border city economy with cross-border commerce into Idaho.' },
        ],
      },
      {
        id: 'IL',
        name: 'Illinois',
        code: 'IL',
        cities: ['Chicago', 'Aurora', 'Naperville', 'Rockford', 'Springfield', 'Peoria'],
        propertyTax: 2.23,
        salesTax: 6.25,
        flatTax: 0.0495,
        allowance: 2425,
        medianIncome: 78433,
        costOfLivingIndex: 94.6,
        taxStructure: 'Flat',
        statuteCitation: '35 ILCS 5/201 (Illinois Income Tax Act)',
        governingBody: 'Illinois Department of Revenue',
        description: 'Illinois is constitutionally mandated to use a flat personal income tax rate (currently 4.95% on net income). Property taxes are the 2nd highest in the United States, averaging over 2.2% of market value. Cook County and Chicago add local sales taxes reaching 10.25%.',
        counties: [
          { id: 'IL-COO', name: 'Cook County (Chicago)', seat: 'Chicago', population: 5115230, medianIncome: 78000, propertyTaxRate: 2.19, localSalesTaxRate: 4.0, localIncomeTaxRate: 0, rules: 'Chicago combined sales tax is 10.25% (6.25% state + 1.75% Cook Co + 1.25% Chicago + 1% RTA). Assessment classification taxes commercial property at 25% and residential at 10%.' },
          { id: 'IL-DUP', name: 'DuPage County', seat: 'Wheaton', population: 922921, medianIncome: 107304, propertyTaxRate: 2.15, localSalesTaxRate: 2.25, localIncomeTaxRate: 0, rules: 'Combined sales tax 8.5%. Heavy property tax levies funding suburban school districts.' },
          { id: 'IL-LAK', name: 'Lake County', seat: 'Waukegan', population: 711239, medianIncome: 99403, propertyTaxRate: 2.55, localSalesTaxRate: 1.75, localIncomeTaxRate: 0, rules: 'Among the highest effective property tax rates in the nation (often 2.5% to 3.0% of fair market value).' },
        ],
      },
      {
        id: 'CO',
        name: 'Colorado',
        code: 'CO',
        cities: ['Denver', 'Colorado Springs', 'Aurora', 'Fort Collins', 'Boulder'],
        propertyTax: 0.51,
        salesTax: 2.9,
        flatTax: 0.044,
        allowance: 0,
        medianIncome: 87598,
        costOfLivingIndex: 105.3,
        taxStructure: 'Flat',
        statuteCitation: 'Colo. Rev. Stat. § 39-22-104 (Taxpayer Bill of Rights TABOR)',
        governingBody: 'Colorado Department of Revenue',
        description: 'Colorado levies a flat 4.40% income tax on federal taxable income (reduced by state voter initiatives from 4.55%). Statewide base sales tax is low at 2.9%, but home-rule cities and special districts (RTD) add up to 6% in Denver and Boulder. Property taxes are among the lowest in the nation (~0.51%).',
        counties: [
          { id: 'CO-DEN', name: 'Denver County', seat: 'Denver', population: 713252, medianIncome: 86450, propertyTaxRate: 0.55, localSalesTaxRate: 5.91, localIncomeTaxRate: 0, rules: 'Combined sales tax in Denver is 8.81% (2.9% state + 4.81% city + 1% RTD/cultural). Denver assesses an Occupational Privilege Tax ($5.75/mo employee, $4/mo employer).' },
          { id: 'CO-BOU', name: 'Boulder County', seat: 'Boulder', population: 330758, medianIncome: 99770, propertyTaxRate: 0.53, localSalesTaxRate: 6.185, localIncomeTaxRate: 0, rules: 'Combined city/county sales tax in Boulder reaches 9.085%. High home values offset low effective millage rates.' },
          { id: 'CO-ELP', name: 'El Paso County (Colorado Springs)', seat: 'Colorado Springs', population: 740567, medianIncome: 81845, propertyTaxRate: 0.48, localSalesTaxRate: 5.3, localIncomeTaxRate: 0, rules: 'Conservative fiscal climate with low municipal property millages and sales tax of 8.2% in Colorado Springs.' },
        ],
      },
      {
        id: 'PA',
        name: 'Pennsylvania',
        code: 'PA',
        cities: ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Reading', 'Harrisburg'],
        propertyTax: 1.58,
        salesTax: 6.0,
        flatTax: 0.0307,
        allowance: 0,
        medianIncome: 73170,
        costOfLivingIndex: 97.4,
        taxStructure: 'Flat with local earned income taxes',
        statuteCitation: '72 P.S. § 7301; Local Tax Enabling Act (Act 511); 53 P.S. § 16101',
        governingBody: 'Pennsylvania Department of Revenue',
        description: 'Pennsylvania imposes a flat 3.07% state income tax without standard deductions. However, almost all municipalities and school districts levy a local Earned Income Tax (EIT, Act 511) typically 1% to 2%. Most critically, Philadelphia residents pay a mandatory City Wage Tax of 3.75% (resident) or 3.44% (nonresident), making Philadelphia one of the highest total wage tax jurisdictions in the nation.',
        counties: [
          { id: 'PA-PHI', name: 'Philadelphia County', seat: 'Philadelphia', population: 1567258, medianIncome: 57537, propertyTaxRate: 1.0, localSalesTaxRate: 2.0, localIncomeTaxRate: 3.75, rules: 'Philadelphia City Wage Tax is 3.75% for residents on all gross wages (3.44% for nonresidents). Total sales tax is 8.0% (6% state + 2% city). Combined state + city wage tax equals 6.82%.' },
          { id: 'PA-ALL', name: 'Allegheny County (Pittsburgh)', seat: 'Pittsburgh', population: 1250578, medianIncome: 73385, propertyTaxRate: 2.1, localSalesTaxRate: 1.0, localIncomeTaxRate: 3.0, rules: 'City of Pittsburgh levies a 3.0% combined city/school Earned Income Tax (1% city + 2% Pittsburgh Public Schools). Total sales tax is 7.0% (6% state + 1% county).' },
          { id: 'PA-MON', name: 'Montgomery County', seat: 'Norristown', population: 860578, medianIncome: 107441, propertyTaxRate: 1.6, localSalesTaxRate: 0.0, localIncomeTaxRate: 1.0, rules: 'Suburban Philadelphia county with 6.0% state sales tax. Most townships assess 1% local EIT split between municipality and school district.' },
        ],
      },
      {
        id: 'OH',
        name: 'Ohio',
        code: 'OH',
        cities: ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton'],
        propertyTax: 1.57,
        salesTax: 5.75,
        allowance: 0,
        brackets: [[26050, 0], [100000, .0275], [Infinity, .035]],
        medianIncome: 65720,
        costOfLivingIndex: 91.3,
        taxStructure: 'Graduated with local rates',
        statuteCitation: 'Ohio Rev. Code Ann. § 5747.02; Chapter 718 (Municipal Income Tax)',
        governingBody: 'Ohio Department of Taxation & Regional Income Tax Agency (RITA)',
        description: 'Ohio state rates range from 0% (under $26,050) up to 3.50%. Crucially, over 650 Ohio cities and villages assess their own municipal income taxes (typically 1.5% to 2.5%, administered by RITA or CCA), meaning total income tax includes city of residence and city of workplace.',
        counties: [
          { id: 'OH-FRA', name: 'Franklin County (Columbus)', seat: 'Columbus', population: 1326063, medianIncome: 73994, propertyTaxRate: 1.58, localSalesTaxRate: 1.75, localIncomeTaxRate: 2.5, rules: 'City of Columbus municipal income tax is 2.50% on all qualifying wages. Combined sales tax is 7.50% (5.75% state + 1.25% county + 0.5% COTA transit).' },
          { id: 'OH-CUY', name: 'Cuyahoga County (Cleveland)', seat: 'Cleveland', population: 1236041, medianIncome: 58850, propertyTaxRate: 2.45, localSalesTaxRate: 2.25, localIncomeTaxRate: 2.5, rules: 'Cleveland city income tax is 2.50%. County sales tax is 8.00% (highest in Ohio). Highest effective property millage rates in Ohio.' },
          { id: 'OH-HAM', name: 'Hamilton County (Cincinnati)', seat: 'Cincinnati', population: 826139, medianIncome: 69276, propertyTaxRate: 1.62, localSalesTaxRate: 2.0, localIncomeTaxRate: 1.8, rules: 'Cincinnati municipal earnings tax is 1.80%. Total sales tax 7.80%.' },
        ],
      },
      {
        id: 'GA',
        name: 'Georgia',
        code: 'GA',
        cities: ['Atlanta', 'Augusta', 'Savannah', 'Columbus', 'Macon', 'Athens'],
        propertyTax: 0.9,
        salesTax: 4.0,
        flatTax: 0.0539,
        allowance: 12000,
        medianIncome: 71355,
        costOfLivingIndex: 91.0,
        taxStructure: 'Flat',
        statuteCitation: 'O.C.G.A. § 48-7-20 (HB 1437 / HB 1015)',
        governingBody: 'Georgia Department of Revenue',
        description: 'Georgia transitioned from 6 graduated brackets to a flat 5.39% rate (stepping down to 4.99% by 2029). Standard deduction is $12,000 single and $24,000 joint. Counties levy local sales taxes (LOST, SPLOST, TSPLOST) making total sales tax 7% to 8.9% in Atlanta.',
        counties: [
          { id: 'GA-FUL', name: 'Fulton County (Atlanta)', seat: 'Atlanta', population: 1074634, medianIncome: 86267, propertyTaxRate: 1.05, localSalesTaxRate: 4.9, localIncomeTaxRate: 0, rules: 'City of Atlanta sales tax is 8.90% (4% state + 3% Fulton/City + 1% MARTA + 0.9% TSPLOST). City of Atlanta Homestead exemption reduces municipal assessments.' },
          { id: 'GA-GWI', name: 'Gwinnett County', seat: 'Lawrenceville', population: 975353, medianIncome: 82296, propertyTaxRate: 1.02, localSalesTaxRate: 2.0, localIncomeTaxRate: 0, rules: 'Combined sales tax 6.0%. Rapidly expanding suburban county in metro Atlanta.' },
          { id: 'GA-COB', name: 'Cobb County (Marietta)', seat: 'Marietta', population: 771952, medianIncome: 91924, propertyTaxRate: 0.96, localSalesTaxRate: 2.0, localIncomeTaxRate: 0, rules: 'Combined sales tax 6.0%. Cobb county senior school tax exemption provides 100% relief from school taxes for residents aged 62+.' },
        ],
      },
      {
        id: 'NC',
        name: 'North Carolina',
        code: 'NC',
        cities: ['Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem', 'Cary'],
        propertyTax: 0.82,
        salesTax: 4.75,
        flatTax: 0.045,
        allowance: 12750,
        medianIncome: 66186,
        costOfLivingIndex: 95.7,
        taxStructure: 'Flat',
        statuteCitation: 'N.C. Gen. Stat. § 105-153.7',
        governingBody: 'North Carolina Department of Revenue (NCDOR)',
        description: 'North Carolina levies a flat 4.50% individual income tax rate (scheduled to step down to 3.99% by 2026). Generous standard deduction of $12,750 single and $25,500 married filing jointly. Local county sales tax adds 2.0%–2.75% for a combined rate of 6.75%–7.5%.',
        counties: [
          { id: 'NC-MEC', name: 'Mecklenburg County (Charlotte)', seat: 'Charlotte', population: 1145239, medianIncome: 79265, propertyTaxRate: 0.98, localSalesTaxRate: 2.5, localIncomeTaxRate: 0, rules: 'Charlotte combined sales tax 7.25% (4.75% state + 2.0% county + 0.5% transit). Major national banking center.' },
          { id: 'NC-WAK', name: 'Wake County (Raleigh)', seat: 'Raleigh', population: 1175339, medianIncome: 96734, propertyTaxRate: 0.89, localSalesTaxRate: 2.5, localIncomeTaxRate: 0, rules: 'Research Triangle hub with combined sales tax 7.25%. High research and biotechnology employment.' },
          { id: 'NC-DUR', name: 'Durham County', seat: 'Durham', population: 332493, medianIncome: 74211, propertyTaxRate: 1.15, localSalesTaxRate: 2.75, localIncomeTaxRate: 0, rules: 'Combined sales tax 7.50% (includes 0.5% dedicated transit tax).' },
        ],
      },
      {
        id: 'MA',
        name: 'Massachusetts',
        code: 'MA',
        cities: ['Boston', 'Worcester', 'Springfield', 'Cambridge', 'Lowell', 'Brockton'],
        propertyTax: 1.17,
        salesTax: 6.25,
        flatTax: 0.05,
        allowance: 4400,
        medianIncome: 96505,
        costOfLivingIndex: 127.5,
        taxStructure: 'Flat with surtax over $1M',
        statuteCitation: 'Mass. Gen. Laws ch. 62, § 4; Mass. Const. amend. art. XLIV',
        governingBody: 'Massachusetts Department of Revenue (DOR)',
        description: 'Massachusetts levies a baseline flat 5.0% income tax. Under the Fair Share Amendment (Question 1, "Millionaires Tax"), taxable income exceeding $1,053,750 is subject to an additional 4.0% state surtax, yielding a top marginal rate of 9.0%. Sales tax is a uniform 6.25% with no municipal additions.',
        counties: [
          { id: 'MA-SUF', name: 'Suffolk County (Boston)', seat: 'Boston', population: 766383, medianIncome: 85589, propertyTaxRate: 0.88, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Boston residential exemption provides a property tax reduction of up to ~$3,456 for owner-occupied primary residences. Uniform 6.25% sales tax.' },
          { id: 'MA-MID', name: 'Middlesex County (Cambridge/Lowell)', seat: 'Lowell/Cambridge', population: 1623952, medianIncome: 119853, propertyTaxRate: 1.25, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Highest concentration of biotech, Harvard, and MIT research commercialization. Substantial equity vesting subject to the 9.0% combined top bracket.' },
        ],
      },
      {
        id: 'MI',
        name: 'Michigan',
        code: 'MI',
        cities: ['Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Ann Arbor', 'Lansing'],
        propertyTax: 1.44,
        salesTax: 6.0,
        flatTax: 0.0425,
        allowance: 5400,
        medianIncome: 66986,
        costOfLivingIndex: 91.8,
        taxStructure: 'Flat with municipal wage taxes',
        statuteCitation: 'Mich. Comp. Laws § 206.51; City Income Tax Act (Act 284)',
        governingBody: 'Michigan Department of Treasury',
        description: 'Michigan levies a flat 4.25% individual income tax rate. 24 Michigan cities levy municipal income taxes: Detroit charges 2.40% for residents (1.20% nonresidents), Grand Rapids and Highland Park charge 1.50%, and others charge 1.0%. Statewide sales tax is a uniform 6.0%.',
        counties: [
          { id: 'MI-WAY', name: 'Wayne County (Detroit)', seat: 'Detroit', population: 1751389, medianIncome: 55431, propertyTaxRate: 1.85, localSalesTaxRate: 0, localIncomeTaxRate: 2.4, rules: 'City of Detroit income tax is 2.40% for residents and 1.20% for nonresidents working in the city. Combined state + city tax rate equals 6.65%.' },
          { id: 'MI-OAK', name: 'Oakland County', seat: 'Pontiac', population: 1270425, medianIncome: 92620, propertyTaxRate: 1.42, localSalesTaxRate: 0, localIncomeTaxRate: 1.0, rules: 'Affluent suburban Detroit county; cities like Pontiac assess 1.0% local income tax.' },
        ],
      },
      {
        id: 'NJ',
        name: 'New Jersey',
        code: 'NJ',
        cities: ['Newark', 'Jersey City', 'Paterson', 'Elizabeth', 'Trenton', 'Hoboken'],
        propertyTax: 2.26,
        salesTax: 6.625,
        allowance: 1000,
        brackets: [[20000, .014], [35000, .0175], [40000, .035], [75000, .05525], [500000, .0637], [1000000, .0897], [Infinity, .1075]],
        medianIncome: 96346,
        costOfLivingIndex: 114.3,
        taxStructure: 'Progressive',
        statuteCitation: 'N.J. Stat. Ann. § 54A:2-1 (New Jersey Gross Income Tax Act)',
        governingBody: 'New Jersey Division of Taxation',
        description: 'New Jersey has 7 progressive brackets starting at 1.4% and rising to 10.75% for taxable income over $1,000,000. Property taxes in New Jersey are the highest in the entire nation, averaging 2.26% ($9,500+ per household). Sales tax is 6.625% with 3.3125% in Urban Enterprise Zones.',
        counties: [
          { id: 'NJ-BER', name: 'Bergen County', seat: 'Hackensack', population: 955732, medianIncome: 115200, propertyTaxRate: 2.28, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Average property tax bill exceeds $13,000/year. New Jersey–New York reciprocal commuter rules apply with NY non-resident tax credits.' },
          { id: 'NJ-HUD', name: 'Hudson County (Jersey City/Hoboken)', seat: 'Jersey City', population: 703366, medianIncome: 86450, propertyTaxRate: 1.95, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'High density transit hub to Manhattan. Jersey City employs a 1% municipal payroll tax on employers to fund public schools.' },
        ],
      },
      {
        id: 'VA',
        name: 'Virginia',
        code: 'VA',
        cities: ['Virginia Beach', 'Norfolk', 'Chesapeake', 'Richmond', 'Arlington', 'Alexandria'],
        propertyTax: 0.82,
        salesTax: 5.3,
        allowance: 8000,
        brackets: [[3000, .02], [5000, .03], [17000, .05], [Infinity, .0575]],
        medianIncome: 87249,
        costOfLivingIndex: 101.4,
        taxStructure: 'Progressive',
        statuteCitation: 'Va. Code Ann. § 58.1-320',
        governingBody: 'Virginia Department of Taxation',
        description: 'Virginia income tax rates range from 2.0% to 5.75% across 4 brackets, hitting the top 5.75% bracket at just $17,000 of taxable income. Standard deduction is $8,000 single and $16,000 married. Northern Virginia (NoVA) counties charge a 6.0% combined sales tax.',
        counties: [
          { id: 'VA-FAI', name: 'Fairfax County', seat: 'Fairfax', population: 1150309, medianIncome: 133974, propertyTaxRate: 1.12, localSalesTaxRate: 0.7, localIncomeTaxRate: 0, rules: 'Northern Virginia regional sales tax is 6.0% (5.3% base + 0.7% regional transportation). High defense and federal contractor income base.' },
          { id: 'VA-ARL', name: 'Arlington County', seat: 'Arlington', population: 238659, medianIncome: 137387, propertyTaxRate: 1.03, localSalesTaxRate: 0.7, localIncomeTaxRate: 0, rules: 'Combined sales tax 6.0%. High density urban county adjacent to Washington D.C.' },
        ],
      },
      {
        id: 'AZ',
        name: 'Arizona',
        code: 'AZ',
        cities: ['Phoenix', 'Tucson', 'Mesa', 'Chandler', 'Scottsdale', 'Glendale'],
        propertyTax: 0.62,
        salesTax: 5.6,
        flatTax: 0.025,
        allowance: 14600,
        medianIncome: 74568,
        costOfLivingIndex: 104.2,
        taxStructure: 'Flat',
        statuteCitation: 'Ariz. Rev. Stat. Ann. § 43-1011 (SB 1828)',
        governingBody: 'Arizona Department of Revenue (ADOR)',
        description: 'Arizona transitioned to a flat 2.50% individual income tax rate for all income levels (the lowest flat tax in the country). Standard deduction conforms to federal ($14,600 single / $29,200 joint in 2024). Property taxes are relatively low at ~0.62%, while city transaction privilege taxes (TPT) push combined sales tax to 7.8%–9.1%.',
        counties: [
          { id: 'AZ-MAR', name: 'Maricopa County (Phoenix/Scottsdale)', seat: 'Phoenix', population: 4585871, medianIncome: 80779, propertyTaxRate: 0.63, localSalesTaxRate: 3.0, localIncomeTaxRate: 0, rules: 'Combined sales tax in Phoenix is 8.60% (5.6% state + 0.7% county + 2.3% city TPT). Property assessment capped by state constitution.' },
          { id: 'AZ-PIM', name: 'Pima County (Tucson)', seat: 'Tucson', population: 1058318, medianIncome: 63650, propertyTaxRate: 0.88, localSalesTaxRate: 3.1, localIncomeTaxRate: 0, rules: 'Combined sales tax in Tucson is 8.70% (5.6% state + 0.5% county + 2.6% city).' },
        ],
      },
      {
        id: 'MN',
        name: 'Minnesota',
        code: 'MN',
        cities: ['Minneapolis', 'Saint Paul', 'Rochester', 'Duluth', 'Bloomington'],
        propertyTax: 1.12,
        salesTax: 6.875,
        allowance: 14575,
        brackets: [[31690, .0535], [104090, .068], [193240, .0785], [Infinity, .0985]],
        medianIncome: 84313,
        costOfLivingIndex: 97.2,
        taxStructure: 'Progressive',
        statuteCitation: 'Minn. Stat. § 290.06',
        governingBody: 'Minnesota Department of Revenue',
        description: 'Minnesota features 4 progressive income tax brackets from 5.35% to 9.85% (one of the highest top state brackets in the Midwest). Clothing and groceries are exempt from state sales tax.',
        counties: [
          { id: 'MN-HEN', name: 'Hennepin County (Minneapolis)', seat: 'Minneapolis', population: 1258713, medianIncome: 89650, propertyTaxRate: 1.18, localSalesTaxRate: 2.15, localIncomeTaxRate: 0, rules: 'Minneapolis combined sales tax is 9.025% (6.875% state + 0.15% county + 2.0% transit/city).' },
        ],
      },
      {
        id: 'OR',
        name: 'Oregon',
        code: 'OR',
        cities: ['Portland', 'Eugene', 'Salem', 'Gresham', 'Hillsboro', 'Bend'],
        propertyTax: 0.93,
        salesTax: 0.0,
        allowance: 2745,
        brackets: [[4300, .0475], [10750, .0675], [125000, .0875], [Infinity, .099]],
        medianIncome: 76632,
        costOfLivingIndex: 113.8,
        taxStructure: 'Progressive with no sales tax',
        statuteCitation: 'Or. Rev. Stat. § 316.037; Metro SHS & Multnomah PFA',
        governingBody: 'Oregon Department of Revenue',
        description: 'Oregon has zero general sales tax, relying heavily on a steep progressive personal income tax (up to 9.9%). Portland Metro residents with high incomes also pay Metro Supportive Housing Services (1%) and Multnomah County Preschool for All (1.5%–3%) income surtaxes.',
        counties: [
          { id: 'OR-MUL', name: 'Multnomah County (Portland)', seat: 'Portland', population: 789698, medianIncome: 83668, propertyTaxRate: 1.04, localSalesTaxRate: 0, localIncomeTaxRate: 2.5, rules: 'No sales tax. High-income earners pay up to 2.5%–4.0% combined Metro SHS and Preschool for All local income taxes.' },
        ],
      },
      {
        id: 'UT',
        name: 'Utah',
        code: 'UT',
        cities: ['Salt Lake City', 'West Valley City', 'Provo', 'West Jordan', 'Orem'],
        propertyTax: 0.58,
        salesTax: 6.1,
        flatTax: 0.0455,
        allowance: 0,
        medianIncome: 89168,
        costOfLivingIndex: 101.9,
        taxStructure: 'Flat',
        statuteCitation: 'Utah Code Ann. § 59-10-104',
        governingBody: 'Utah State Tax Commission',
        description: 'Utah levies a flat 4.55% individual income tax rate with a nonrefundable taxpayer tax credit that phases out for higher earners. Primary residences receive a 45% residential property tax exemption.',
        counties: [
          { id: 'UT-SLC', name: 'Salt Lake County', seat: 'Salt Lake City', population: 1185813, medianIncome: 91230, propertyTaxRate: 0.61, localSalesTaxRate: 1.65, localIncomeTaxRate: 0, rules: 'Combined sales tax in Salt Lake City is 7.75%. Primary residences taxed on 55% of fair market value.' },
        ],
      },
      {
        id: 'NV',
        name: 'Nevada',
        code: 'NV',
        cities: ['Las Vegas', 'Henderson', 'Reno', 'North Las Vegas', 'Sparks'],
        propertyTax: 0.55,
        salesTax: 6.85,
        flatTax: 0,
        allowance: 0,
        medianIncome: 72333,
        costOfLivingIndex: 101.2,
        taxStructure: 'No wage income tax',
        statuteCitation: 'Nev. Const. art. X, § 1',
        governingBody: 'Nevada Department of Taxation',
        description: 'Nevada constitutionally prohibits personal and corporate income taxes. State revenue is funded by gaming taxes, sales taxes (8.375% in Clark County), and a Commerce Tax on business gross revenue over $4M.',
        counties: [
          { id: 'NV-CLA', name: 'Clark County (Las Vegas)', seat: 'Las Vegas', population: 2336573, medianIncome: 70132, propertyTaxRate: 0.59, localSalesTaxRate: 1.525, localIncomeTaxRate: 0, rules: 'Combined sales tax 8.375%. Property tax abatement caps annual tax bill increases at 3% for owner-occupied primary residences.' },
        ],
      },
      {
        id: 'MD',
        name: 'Maryland',
        code: 'MD',
        cities: ['Baltimore', 'Columbia', 'Germantown', 'Silver Spring', 'Annapolis'],
        propertyTax: 1.07,
        salesTax: 6.0,
        allowance: 2550,
        brackets: [[1000, .02], [2000, .03], [3000, .04], [100000, .0475], [125000, .05], [150000, .0525], [250000, .055], [Infinity, .0575]],
        medianIncome: 98678,
        costOfLivingIndex: 115.6,
        taxStructure: 'Graduated with mandatory county income tax',
        statuteCitation: 'Md. Code, Tax-Gen. § 10-105; § 10-106',
        governingBody: 'Comptroller of Maryland',
        description: 'Maryland state income tax ranges from 2% to 5.75%. Critically, every Maryland county and Baltimore City levies a mandatory local "piggyback" income tax between 2.25% and 3.20% collected directly on the state return.',
        counties: [
          { id: 'MD-MON', name: 'Montgomery County (Bethesda/Silver Spring)', seat: 'Rockville', population: 1058474, medianIncome: 125583, propertyTaxRate: 1.04, localSalesTaxRate: 0, localIncomeTaxRate: 3.2, rules: 'Montgomery County levies the statutory maximum 3.20% local income tax, bringing top combined state + county marginal rate to 8.95%.' },
          { id: 'MD-BAL', name: 'Baltimore City', seat: 'Baltimore', population: 565239, medianIncome: 58349, propertyTaxRate: 2.248, localSalesTaxRate: 0, localIncomeTaxRate: 3.2, rules: 'Baltimore City levies a 3.20% local income tax plus the highest municipal property tax rate in Maryland.' },
        ],
      },
      {
        id: 'TN',
        name: 'Tennessee',
        code: 'TN',
        cities: ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga'],
        propertyTax: 0.66,
        salesTax: 7.0,
        flatTax: 0,
        allowance: 0,
        medianIncome: 68221,
        costOfLivingIndex: 90.4,
        taxStructure: 'No wage income tax',
        statuteCitation: 'Tenn. Code Ann. § 67-4-101 (Hall Income Tax fully repealed 2021)',
        governingBody: 'Tennessee Department of Revenue',
        description: 'No personal income tax (the Hall Tax on interest/dividends was fully repealed effective 2021). State and local sales taxes are the highest combined rates in the US (7% state + up to 2.75% local = 9.75% in Nashville/Memphis).',
        counties: [
          { id: 'TN-DAV', name: 'Davidson County (Nashville)', seat: 'Nashville', population: 715068, medianIncome: 78000, propertyTaxRate: 0.93, localSalesTaxRate: 2.25, localIncomeTaxRate: 0, rules: 'Combined sales tax 9.25%. "Music City" economy; high tourism export of sales tax.' },
        ],
      },
      {
        id: 'CT',
        name: 'Connecticut',
        code: 'CT',
        cities: ['Bridgeport', 'Hartford', 'New Haven', 'Stamford', 'Norwalk'],
        propertyTax: 1.78,
        salesTax: 6.35,
        allowance: 15000,
        brackets: [[10000, .02], [50000, .045], [100000, .055], [200000, .06], [250000, .065], [500000, .069], [Infinity, .0699]],
        medianIncome: 93000,
        costOfLivingIndex: 115.2,
        taxStructure: 'Progressive',
        statuteCitation: 'Conn. Gen. Stat. § 12-700',
        governingBody: 'Connecticut Department of Revenue Services (DRS)',
        description: '7 progressive brackets from 2% to 6.99%. Connecticut has no county government; property tax is levied directly at stratospheric municipal mill rates (average effective rates approach 1.8%).',
        counties: [
          { id: 'CT-FAI', name: 'Fairfield County (Stamford/Norwalk)', seat: 'N/A (County government abolished 1960)', population: 957419, medianIncome: 108000, propertyTaxRate: 1.94, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'High-income NYC commuter towns. Property tax is assessed at town/city level with no county administration.' },
        ],
      },
      {
        id: 'KY',
        name: 'Kentucky',
        code: 'KY',
        cities: ['Louisville', 'Lexington', 'Bowling Green', 'Owensboro'],
        propertyTax: 0.83,
        salesTax: 6.0,
        flatTax: 0.04,
        allowance: 3160,
        medianIncome: 61620,
        costOfLivingIndex: 88.9,
        taxStructure: 'Flat with local occupational taxes',
        statuteCitation: 'Ky. Rev. Stat. § 141.020; Local Occupational License Tax (KRS Ch. 68)',
        governingBody: 'Kentucky Department of Revenue',
        description: 'Kentucky levies a flat 4.0% income tax. Crucially, almost all KY counties and many cities levy a local Occupational License Tax on wages (typically 1%–2.35%), including Louisville/Jefferson County (1.45% resident / 1.25% nonresident).',
        counties: [
          { id: 'KY-JEF', name: 'Jefferson County (Louisville)', seat: 'Louisville', population: 772144, medianIncome: 65421, propertyTaxRate: 0.91, localSalesTaxRate: 0, localIncomeTaxRate: 1.45, rules: 'Louisville Metro Occupational License Tax is 1.45% for residents and 1.25% for nonresidents. Combined state + local wage tax equals 5.45%.' },
        ],
      },
      {
        id: 'MO',
        name: 'Missouri',
        code: 'MO',
        cities: ['Kansas City', 'St. Louis', 'Springfield', 'Columbia'],
        propertyTax: 0.97,
        salesTax: 4.225,
        flatTax: 0.048,
        allowance: 14600,
        medianIncome: 71900,
        costOfLivingIndex: 89.5,
        taxStructure: 'Flat with 1% local earnings taxes',
        statuteCitation: 'Mo. Rev. Stat. § 144.010; § 92.110 (Kansas City & St. Louis Local Earnings Tax)',
        governingBody: 'Missouri Department of Revenue',
        description: 'Missouri levies a 4.8% flat income tax on federal adjusted gross income. Critically, both Kansas City and St. Louis City levy a mandatory 1.0% Local Earnings Tax on all wages earned by residents and by nonresidents working within city limits.',
        counties: [
          { id: 'MO-JAC', name: 'Jackson County (Kansas City)', seat: 'Independence', population: 717204, medianIncome: 78000, propertyTaxRate: 1.08, localSalesTaxRate: 4.27, localIncomeTaxRate: 1.0, rules: 'Kansas City assesses a 1.0% Local Earnings Tax. Combined state + city wage tax equals 5.8%.' },
          { id: 'MO-STL', name: 'St. Louis City', seat: 'St. Louis', population: 300782, medianIncome: 55000, propertyTaxRate: 1.15, localSalesTaxRate: 5.679, localIncomeTaxRate: 1.0, rules: 'St. Louis City assesses a 1.0% Local Earnings Tax. City employs a "30-minute rule" where full-time remote work by residents also incurs the tax.' },
        ],
      },
      {
        id: 'HI',
        name: 'Hawaii',
        code: 'HI',
        cities: ['Honolulu', 'Hilo', 'Kailua'],
        propertyTax: 0.28,
        salesTax: 4.0,
        brackets: [[9600, .014], [14400, .032], [19200, .055], [24000, .064], [36000, .068], [48000, .072], [36000, .076], [Infinity, .11]],
        allowance: 4400,
        medianIncome: 94800,
        costOfLivingIndex: 179,
        taxStructure: 'Progressive',
        statuteCitation: 'Haw. Rev. Stat. § 235-51',
        governingBody: 'Hawaii Department of Taxation',
        description: 'GET (general excise tax) of 4.0% statewide plus 0.5% county surcharge in Honolulu. High COLI; national IRS brackets still apply to federal tax.',
        taxRegime: 'national',
        counties: [{ id: 'HI-HON', name: 'Honolulu County', seat: 'Honolulu', population: 1000000, medianIncome: 95000, propertyTaxRate: 0.35, localSalesTaxRate: 0.5, localIncomeTaxRate: 0, rules: 'County GET surcharge 0.5%. No local wage tax.' }],
      },
      {
        id: 'AK',
        name: 'Alaska',
        code: 'AK',
        cities: ['Anchorage', 'Fairbanks', 'Juneau'],
        propertyTax: 1.04,
        salesTax: 0,
        flatTax: 0,
        allowance: 0,
        medianIncome: 86370,
        costOfLivingIndex: 125,
        taxStructure: 'No wage income tax',
        statuteCitation: 'Alaska Const. art. IX',
        governingBody: 'Alaska Department of Revenue',
        description: 'No state personal income tax and no statewide sales tax. Some municipalities levy local sales tax. Permanent Fund Dividend is separate from wage tax.',
        taxRegime: 'no-wage-tax',
        divergenceNote: 'Alaska does not apply a state wage income tax. Federal IRS brackets still apply. Local sales taxes are municipal, not statewide.',
        counties: [{ id: 'AK-ANC', name: 'Municipality of Anchorage', seat: 'Anchorage', population: 291000, medianIncome: 88000, propertyTaxRate: 1.2, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'No municipal sales tax in Anchorage. Property millage funds local services.' }],
      },
      {
        id: 'WI',
        name: 'Wisconsin',
        code: 'WI',
        cities: ['Milwaukee', 'Madison', 'Green Bay'],
        propertyTax: 1.73,
        salesTax: 5.0,
        brackets: [[14320, .0354], [28640, .0465], [315310, .053], [Infinity, .0765]],
        allowance: 12760,
        medianIncome: 72458,
        costOfLivingIndex: 97,
        taxStructure: 'Progressive',
        statuteCitation: 'Wis. Stat. § 71.06',
        governingBody: 'Wisconsin Department of Revenue',
        description: 'Four state brackets. Counties may add 0.5% sales tax. Milwaukee imposes a city sales tax overlay.',
        counties: [{ id: 'WI-MIL', name: 'Milwaukee County', seat: 'Milwaukee', population: 928000, medianIncome: 58000, propertyTaxRate: 2.1, localSalesTaxRate: 1.0, localIncomeTaxRate: 0, rules: 'Combined sales tax 6.0%+ in the city. No local wage tax.' }],
      },
      {
        id: 'SC',
        name: 'South Carolina',
        code: 'SC',
        cities: ['Charleston', 'Columbia', 'Greenville'],
        propertyTax: 0.57,
        salesTax: 6.0,
        brackets: [[3460, .0], [17330, .03], [Infinity, .062]],
        allowance: 14600,
        medianIncome: 63500,
        costOfLivingIndex: 96,
        taxStructure: 'Progressive',
        statuteCitation: 'S.C. Code Ann. § 12-6-510',
        governingBody: 'South Carolina Department of Revenue',
        description: 'Three-band individual income tax. Local option sales taxes vary by county and are optional in this calculator.',
        counties: [{ id: 'SC-CHA', name: 'Charleston County', seat: 'Charleston', population: 408000, medianIncome: 76000, propertyTaxRate: 0.57, localSalesTaxRate: 1.0, localIncomeTaxRate: 0, rules: 'Local option sales tax; no local wage tax. Off by default.' }],
      },
      {
        id: 'LA',
        name: 'Louisiana',
        code: 'LA',
        cities: ['New Orleans', 'Baton Rouge', 'Shreveport'],
        propertyTax: 0.55,
        salesTax: 4.45,
        brackets: [[12500, .0185], [50000, .035], [Infinity, .0425]],
        allowance: 4500,
        medianIncome: 57900,
        costOfLivingIndex: 93,
        taxStructure: 'Progressive',
        statuteCitation: 'La. R.S. 47:32',
        governingBody: 'Louisiana Department of Revenue',
        description: 'State income tax plus parish sales taxes. Parish wage taxes are not generally levied.',
        counties: [{ id: 'LA-ORL', name: 'Orleans Parish', seat: 'New Orleans', population: 384000, medianIncome: 55000, propertyTaxRate: 0.9, localSalesTaxRate: 5.0, localIncomeTaxRate: 0, rules: 'Combined local sales tax is high; no local wage tax. Off by default.' }],
      },
      {
        id: 'DC',
        name: 'Washington, D.C. (District of Columbia)',
        code: 'DC',
        cities: ['Northwest', 'Northeast', 'Southeast', 'Southwest'],
        propertyTax: 0.85,
        salesTax: 6.0,
        brackets: [[10000, .04], [40000, .06], [60000, .065], [250000, .085], [500000, .0925], [1000000, .0975], [Infinity, .1075]],
        allowance: 15000,
        medianIncome: 101000,
        costOfLivingIndex: 148,
        taxStructure: 'District income tax (not a US state)',
        statuteCitation: 'D.C. Code § 47-1806.03',
        governingBody: 'Office of Tax and Revenue (OTR)',
        description: 'Special US jurisdiction: not a state. Federal IRS tax still applies. District income tax is levied under D.C. law as the regional layer. Choose a ward/quadrant as the third location.',
        taxRegime: 'devolved',
        divergenceNote: 'Washington, D.C. is a special region of the United States, not a state and not a separate country. Federal tax uses IRS rules; the District layer uses D.C. Code Title 47.',
        counties: [
          { id: 'DC-NW', name: 'Northwest', seat: 'Washington', population: 250000, medianIncome: 125000, propertyTaxRate: 0.85, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'District-wide income tax. No separate ward wage tax. Local levies off by default.' },
          { id: 'DC-NE', name: 'Northeast', seat: 'Washington', population: 180000, medianIncome: 85000, propertyTaxRate: 0.85, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Same District income-tax schedule. Local levies off by default.' },
          { id: 'DC-SE', name: 'Southeast', seat: 'Washington', population: 150000, medianIncome: 62000, propertyTaxRate: 0.85, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Same District income-tax schedule. Local levies off by default.' },
          { id: 'DC-SW', name: 'Southwest', seat: 'Washington', population: 45000, medianIncome: 98000, propertyTaxRate: 0.85, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Same District income-tax schedule. Local levies off by default.' },
        ],
      },
    ],
  },
  CA: {
    name: 'Canada',
    legalBody: 'Canada Revenue Agency (CRA)',
    rules: 'Federal and provincial taxes stack on the same net taxable income. Basic Personal Amounts (BPA) operate as non-refundable tax credits calculated at the lowest bracket rate. Quebec levies its own separate provincial tax through Revenu Québec.',
    currency: 'CAD',
    symbol: 'C$',
    regionLabel: 'Province',
    taxYear: '2025',
    source: { name: 'CRA 2021-2026 federal & provincial schedules', url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/tax-rates-brackets/last-year.html' },
    years: [
      { id: '2021', label: '2021', deduction: { single: 13808, joint: 13808, head: 13808 }, federal: { single: [[49020, .15], [98040, .205], [151978, .26], [216511, .29], [Infinity, .33]], joint: [], head: [] }, regional: { ON: { brackets: [[45142, .0505], [90287, .0915], [150000, .1116], [220000, .1216], [Infinity, .1316]], allowance: 10887 }, BC: { brackets: [[42184, .0506], [84369, .077], [96868, .105], [117623, .1229], [159483, .147], [222420, .168], [Infinity, .205]], allowance: 11070 }, AB: { brackets: [[131220, .10], [157464, .12], [209952, .13], [314928, .14], [Infinity, .15]], allowance: 19369 } } },
      { id: '2022', label: '2022', deduction: { single: 14398, joint: 14398, head: 14398 }, federal: { single: [[50197, .15], [100392, .205], [155625, .26], [221708, .29], [Infinity, .33]], joint: [], head: [] }, regional: { ON: { brackets: [[46226, .0505], [92454, .0915], [150000, .1116], [220000, .1216], [Infinity, .1316]], allowance: 11141 }, BC: { brackets: [[43070, .0506], [86141, .077], [98901, .105], [120094, .1229], [162832, .147], [227091, .168], [Infinity, .205]], allowance: 11302 }, AB: { brackets: [[131220, .10], [157464, .12], [209952, .13], [314928, .14], [Infinity, .15]], allowance: 19369 } } },
      { id: '2023', label: '2023', deduction: { single: 15000, joint: 15000, head: 15000 }, federal: { single: [[55867, .15], [111733, .205], [177882, .26], [259297, .29], [Infinity, .33]], joint: [], head: [] }, regional: { ON: { brackets: [[50464, .0505], [100926, .0915], [150000, .1116], [220000, .1216], [Infinity, .1316]], allowance: 11984 }, BC: { brackets: [[46713, .0506], [93425, .077], [106706, .105], [124337, .1229], [173527, .147], [239455, .168], [Infinity, .205]], allowance: 12312 }, AB: { brackets: [[60000, .08], [143437, .1], [170925, .12], [227900, .13], [341850, .14], [Infinity, .15]], allowance: 19657 } } },
      { id: '2024', label: '2024', deduction: { single: 15705, joint: 15705, head: 15705 }, federal: { single: [[57375, .15], [114750, .205], [177882, .26], [253414, .29], [Infinity, .33]], joint: [], head: [] }, regional: { ON: { brackets: [[53891, .0505], [107785, .0915], [150000, .1116], [220000, .1216], [Infinity, .1316]], allowance: 12445 }, BC: { brackets: [[48135, .0506], [96271, .077], [110295, .105], [128352, .1229], [179198, .147], [247751, .168], [Infinity, .205]], allowance: 12620 }, AB: { brackets: [[59013, .08], [147530, .1], [175836, .12], [234448, .13], [351672, .14], [Infinity, .15]], allowance: 20184 } } },
      { id: '2025', label: '2025', deduction: { single: 16129, joint: 16129, head: 16129 }, federal: { single: [[57375, .145], [114750, .205], [177882, .26], [253414, .29], [Infinity, .33]], joint: [], head: [] }, regional: { ON: { brackets: [[52886, .0505], [105775, .0915], [150000, .1116], [220000, .1216], [Infinity, .1316]], allowance: 12747 }, BC: { brackets: [[49279, .0506], [98560, .077], [113158, .105], [137407, .1229], [186306, .147], [259829, .168], [Infinity, .205]], allowance: 12932 }, AB: { brackets: [[60000, .08], [151234, .1], [181481, .12], [241974, .13], [362961, .14], [Infinity, .15]], allowance: 22323 } } },
      { id: '2026', label: '2026', deduction: { single: 16452, joint: 16452, head: 16452 }, federal: { single: [[58523, .14], [117045, .205], [181440, .26], [258482, .29], [Infinity, .33]], joint: [], head: [] }, regional: { ON: { brackets: [[53886, .0505], [107775, .0915], [150000, .1116], [220000, .1216], [Infinity, .1316]], allowance: 12989 }, BC: { brackets: [[50363, .056], [100728, .077], [115648, .105], [140430, .1229], [190405, .147], [265545, .168], [Infinity, .205]], allowance: 13216 }, AB: { brackets: [[60000, .08], [151234, .1], [181481, .12], [241974, .13], [362961, .14], [Infinity, .15]], allowance: 22769 } } },
    ],
    regions: [
      {
        id: 'ON',
        name: 'Ontario',
        code: 'ON',
        cities: ['Toronto', 'Ottawa', 'Hamilton', 'London', 'Kitchener', 'Mississauga'],
        counties: [],
        propertyTax: 0.85,
        salesTax: 13.0,
        allowance: 12747,
        medianIncome: 87000,
        costOfLivingIndex: 110.5,
        taxStructure: 'Graduated with local rates',
        statuteCitation: 'Taxation Act, 2007 (S.O. 2007, c. 11)',
        governingBody: 'Ministry of Finance (Ontario) / CRA',
        description: 'Ontario provincial tax includes a two-tier surtax (20% on basic provincial tax over $5,710, plus 36% over $7,307) and the Ontario Health Premium (up to $900). Combined HST is 13% (5% federal GST + 8% provincial).',
        brackets: [[52886, .0505], [105775, .0915], [150000, .1116], [220000, .1216], [Infinity, .1316]],
      },
      {
        id: 'BC',
        name: 'British Columbia',
        code: 'BC',
        cities: ['Vancouver', 'Victoria', 'Kelowna', 'Surrey', 'Burnaby', 'Richmond'],
        counties: [],
        propertyTax: 0.48,
        salesTax: 12.0,
        allowance: 12932,
        medianIncome: 85000,
        costOfLivingIndex: 115.0,
        taxStructure: 'Progressive',
        statuteCitation: 'Income Tax Act (RSBC 1996, c. 215)',
        governingBody: 'British Columbia Ministry of Finance',
        description: '7 progressive brackets ranging from 5.06% to 20.50%. Sales tax is 5% federal GST + 7% provincial PST (12% combined). Low effective property millage rates with high home valuations.',
        brackets: [[49279, .0506], [98560, .077], [113158, .105], [137407, .1229], [186306, .147], [259829, .168], [Infinity, .205]],
      },
      {
        id: 'AB',
        name: 'Alberta',
        code: 'AB',
        cities: ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge'],
        counties: [],
        propertyTax: 0.72,
        salesTax: 5.0,
        allowance: 22323,
        medianIncome: 95000,
        costOfLivingIndex: 98.0,
        taxStructure: 'Progressive',
        statuteCitation: 'Alberta Corporate and Personal Tax Act',
        governingBody: 'Alberta Treasury Board and Finance / CRA',
        description: 'No provincial sales tax (only 5% federal GST applies). Highest basic personal allowance in Canada ($22,323 in 2025). Graduated provincial rates start at 8% on the first $60,000.',
        brackets: [[60000, .08], [151234, .1], [181481, .12], [241974, .13], [362961, .14], [Infinity, .15]],
      },
      {
        id: 'QC',
        name: 'Quebec',
        code: 'QC',
        cities: ['Montreal', 'Quebec City', 'Laval', 'Gatineau'],
        counties: [],
        propertyTax: 1.05,
        salesTax: 14.975,
        allowance: 18571,
        medianIncome: 75000,
        costOfLivingIndex: 96.0,
        taxStructure: 'Progressive',
        statuteCitation: 'Taxation Act (CQLR c I-3)',
        governingBody: 'Revenu Québec',
        description: 'Separate provincial tax return with Revenu Québec. Combined QST + GST is 14.975%. Federal abatement of 16.5% of basic federal tax applies for Quebec residents.',
        taxRegime: 'separate-return',
        divergenceNote: 'Quebec is not a CRA-only province. Residents file a federal return and a separate Revenu Québec return. Ontario/BC schedules are not Quebec tax.',
        brackets: [[51780, .14], [103545, .19], [126000, .24], [Infinity, .2575]],
      },
      {
        id: 'OTHER',
        name: 'Other Province / Territory',
        code: 'CA',
        cities: [],
        counties: [],
        propertyTax: 1.0,
        salesTax: 15.0,
        medianIncome: 80000,
        costOfLivingIndex: 100.0,
        taxStructure: 'Flat',
        statuteCitation: 'Income Tax Act',
        governingBody: 'Canada Revenue Agency',
        description: 'Custom Canadian provincial profile.',
      },
    ],
  },
  GB: {
    name: 'United Kingdom',
    legalBody: 'HM Revenue & Customs (HMRC)',
    rules: 'England, Wales, and Northern Ireland share standard UK income tax bands. Scotland sets separate Scottish Income Tax rates and thresholds under the Scotland Act 2016. Personal Allowance is £12,570, tapering by £1 for every £2 of income above £100,000.',
    currency: 'GBP',
    symbol: '\u00a3',
    regionLabel: 'Nation',
    taxYear: '2025/26',
    source: { name: 'HMRC rates and allowances, 2021-2026', url: 'https://www.gov.uk/income-tax-rates' },
    years: [
      { id: '2021/22', label: '2021 / 22', deduction: { single: 12570, joint: 12570, head: 12570 }, federal: { single: [[37700, .2], [112570, .4], [Infinity, .45]], joint: [], head: [] }, scotland: [[2097, .19], [12726, .2], [31092, .21], [112570, .41], [Infinity, .46]] },
      { id: '2022/23', label: '2022 / 23', deduction: { single: 12570, joint: 12570, head: 12570 }, federal: { single: [[37700, .2], [112570, .4], [Infinity, .45]], joint: [], head: [] }, scotland: [[2162, .19], [13118, .2], [31092, .21], [112570, .41], [Infinity, .46]] },
      { id: '2023/24', label: '2023 / 24', deduction: { single: 12570, joint: 12570, head: 12570 }, federal: { single: [[37700, .2], [112570, .4], [Infinity, .45]], joint: [], head: [] }, scotland: [[2162, .19], [13118, .2], [31092, .21], [112570, .42], [Infinity, .47]] },
      { id: '2024/25', label: '2024 / 25', deduction: { single: 12570, joint: 12570, head: 12570 }, federal: { single: [[37700, .2], [112570, .4], [Infinity, .45]], joint: [], head: [] }, scotland: [[2827, .19], [14921, .2], [31092, .21], [112570, .42], [Infinity, .45]] },
      { id: '2025/26', label: '2025 / 26', deduction: { single: 12570, joint: 12570, head: 12570 }, federal: { single: [[37700, .2], [112570, .4], [Infinity, .45]], joint: [], head: [] }, scotland: [[2827, .19], [14921, .2], [31092, .21], [112570, .42], [Infinity, .48]] },
      { id: '2026/27', label: '2026 / 27', deduction: { single: 12570, joint: 12570, head: 12570 }, federal: { single: [[37700, .2], [112570, .4], [Infinity, .45]], joint: [], head: [] }, scotland: [[3967, .19], [12959, .2], [14136, .21], [112570, .42], [Infinity, .48]] },
    ],
    regions: [
      { id: 'ENG', name: 'England', code: 'ENG', cities: ['London', 'Manchester', 'Birmingham', 'Bristol', 'Leeds'], counties: [], propertyTax: 0, salesTax: 20, flatTax: 0, medianIncome: 35000, costOfLivingIndex: 105, taxStructure: 'Progressive', statuteCitation: 'Income Tax Act 2007', governingBody: 'HM Revenue & Customs', description: 'Standard UK bands: Basic 20%, Higher 40%, Additional 45%.' },
      { id: 'SCT', name: 'Scotland', code: 'SCT', cities: ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee'], counties: [], propertyTax: 0, salesTax: 20, flatTax: 0, medianIncome: 33500, costOfLivingIndex: 94, taxStructure: 'Devolved Scottish Income Tax', statuteCitation: 'Scotland Act 2016; Scottish Rate Resolution', governingBody: 'Revenue Scotland / HMRC', description: 'Scotland sets its own non-savings, non-dividend Income Tax bands. UK Personal Allowance still applies. England/Wales/NI bands are not used.', taxRegime: 'devolved', divergenceNote: 'Scottish Income Tax is not the UK rUK schedule. Savings and dividend income still use UK rates; employment income uses Scottish bands.' },
      { id: 'WLS', name: 'Wales', code: 'WLS', cities: ['Cardiff', 'Swansea', 'Newport'], counties: [], propertyTax: 0, salesTax: 20, flatTax: 0, medianIncome: 30500, costOfLivingIndex: 91, taxStructure: 'Progressive', statuteCitation: 'Wales Act 2014 (Welsh Rates of Income Tax)', governingBody: 'Welsh Revenue Authority / HMRC', description: 'Welsh Rates of Income Tax conform to standard UK rates.' },
      { id: 'NIR', name: 'Northern Ireland', code: 'NIR', cities: ['Belfast', 'Derry', 'Lisburn'], counties: [], propertyTax: 0, salesTax: 20, flatTax: 0, medianIncome: 31000, costOfLivingIndex: 89, taxStructure: 'Progressive', statuteCitation: 'Income Tax Act 2007', governingBody: 'HM Revenue & Customs', description: 'UK national bands apply. Domestic rates apply for property.' },
    ],
  },
  AU: {
    name: 'Australia',
    legalBody: 'Australian Taxation Office (ATO)',
    rules: 'Resident income tax rates apply nationally. Stage 3 tax cuts took effect 1 July 2024, lowering the 19% rate to 16% and expanding the 30% bracket to $135,000. Medicare levy is 2.0%.',
    currency: 'AUD',
    symbol: 'A$',
    regionLabel: 'State / territory',
    taxYear: '2025/26',
    source: { name: 'ATO resident tax rates, 2021-2026', url: 'https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents' },
    years: [
      { id: '2021/22', label: '2021 / 22', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[18200, 0], [45000, .19], [120000, .325], [180000, .37], [Infinity, .45]], joint: [], head: [] }, credit: income => income < 37500 ? 700 : income < 45000 ? 700 - (income - 37500) * .05 : 0, creditLabel: 'Low Income Tax Offset' },
      { id: '2022/23', label: '2022 / 23', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[18200, 0], [45000, .19], [120000, .325], [180000, .37], [Infinity, .45]], joint: [], head: [] }, credit: income => income < 37500 ? 700 : income < 45000 ? 700 - (income - 37500) * .05 : 0, creditLabel: 'Low Income Tax Offset' },
      { id: '2023/24', label: '2023 / 24', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[18200, 0], [45000, .19], [120000, .325], [180000, .37], [Infinity, .45]], joint: [], head: [] }, credit: income => income < 45000 ? Math.min(700, (45000 - income) * .019) : 0, creditLabel: 'Low Income Tax Offset' },
      { id: '2024/25', label: '2024 / 25', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[18200, 0], [45000, .16], [135000, .3], [190000, .37], [Infinity, .45]], joint: [], head: [] }, credit: income => income < 45000 ? Math.min(700, (45000 - income) * .016) : 0, creditLabel: 'Low Income Tax Offset (Stage 3)' },
      { id: '2025/26', label: '2025 / 26', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[18200, 0], [45000, .16], [135000, .3], [190000, .37], [Infinity, .45]], joint: [], head: [] }, credit: income => income < 45000 ? Math.min(700, (45000 - income) * .016) : 0, creditLabel: 'Low Income Tax Offset' },
      { id: '2026/27', label: '2026 / 27', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[18200, 0], [45000, .15], [135000, .3], [190000, .37], [Infinity, .45]], joint: [], head: [] }, credit: income => income < 45000 ? Math.min(700, (45000 - income) * .015) : 0, creditLabel: 'Low Income Tax Offset (from July 1, 2026 cuts)' },
    ],
    regions: [
      { id: 'NSW', name: 'New South Wales', code: 'NSW', cities: ['Sydney', 'Newcastle', 'Wollongong'], counties: [], propertyTax: 0, salesTax: 10, flatTax: 0, medianIncome: 82000, costOfLivingIndex: 112, taxStructure: 'Progressive', statuteCitation: 'ITAA 1997; Duties Act 1997 (NSW)', governingBody: 'Revenue NSW / ATO', description: 'National income tax rates apply. Stamp duty on residential conveyance is levied by Revenue NSW.' },
      { id: 'VIC', name: 'Victoria', code: 'VIC', cities: ['Melbourne', 'Geelong', 'Ballarat'], counties: [], propertyTax: 0, salesTax: 10, flatTax: 0, medianIncome: 79000, costOfLivingIndex: 105, taxStructure: 'Progressive', statuteCitation: 'ITAA 1997; Duties Act 2000 (Vic)', governingBody: 'State Revenue Office Victoria / ATO', description: 'National income tax rates apply. Victoria levies a COVID debt repayment surcharge on land tax.' },
      { id: 'QLD', name: 'Queensland', code: 'QLD', cities: ['Brisbane', 'Gold Coast', 'Cairns'], counties: [], propertyTax: 0, salesTax: 10, flatTax: 0, medianIncome: 75000, costOfLivingIndex: 98, taxStructure: 'Progressive', statuteCitation: 'ITAA 1997; Duties Act 2001 (Qld)', governingBody: 'Queensland Revenue Office / ATO', description: 'National resident rates apply. Lower stamp duty on primary residences.' },
      { id: 'WA', name: 'Western Australia', code: 'WA', cities: ['Perth', 'Bunbury'], counties: [], propertyTax: 0, salesTax: 10, flatTax: 0, medianIncome: 88000, costOfLivingIndex: 101, taxStructure: 'Progressive', statuteCitation: 'ITAA 1997', governingBody: 'RevenueWA / ATO', description: 'Highest mining median income in Australia.' },
      { id: 'SA', name: 'South Australia', code: 'SA', cities: ['Adelaide'], counties: [], propertyTax: 0, salesTax: 10, flatTax: 0, medianIncome: 70000, costOfLivingIndex: 92, taxStructure: 'Progressive', statuteCitation: 'ITAA 1997', governingBody: 'RevenueSA / ATO', description: 'National resident rates apply.' },
      { id: 'TAS', name: 'Tasmania', code: 'TAS', cities: ['Hobart', 'Launceston'], counties: [], propertyTax: 0, salesTax: 10, flatTax: 0, medianIncome: 65000, costOfLivingIndex: 89, taxStructure: 'Progressive', statuteCitation: 'ITAA 1997', governingBody: 'State Revenue Office of Tasmania', description: 'National resident rates apply.' },
      { id: 'ACT', name: 'Australian Capital Territory', code: 'ACT', cities: ['Canberra'], counties: [], propertyTax: 0, salesTax: 10, flatTax: 0, medianIncome: 105000, costOfLivingIndex: 108, taxStructure: 'Progressive', statuteCitation: 'ITAA 1997', governingBody: 'ACT Revenue Office', description: 'High public sector median income.' },
      { id: 'NT', name: 'Northern Territory', code: 'NT', cities: ['Darwin', 'Alice Springs'], counties: [], propertyTax: 0, salesTax: 10, flatTax: 0, medianIncome: 83000, costOfLivingIndex: 97, taxStructure: 'Progressive', statuteCitation: 'ITAA 1997', governingBody: 'Territory Revenue Office', description: 'Zone tax offsets may apply for remote residents.' },
    ],
  },
  DE: {
    name: 'Germany',
    legalBody: 'Federal Ministry of Finance (Bundesfinanzministerium)',
    rules: 'Income tax (Einkommensteuer) uses mathematical linear-progressive tariff formulas (§ 32a EStG) with a basic tax-free allowance (Grundfreibetrag). Solidarity surcharge (Solidaritätszuschlag) applies above high-income thresholds.',
    currency: 'EUR',
    symbol: '\u20ac',
    regionLabel: 'State',
    taxYear: '2025',
    source: { name: 'German Federal Ministry of Finance § 32a EStG', url: 'https://www.bundesfinanzministerium.de/' },
    years: [
      { id: '2023', label: '2023', deduction: { single: 10908, joint: 21816, head: 10908 }, federal: { single: [[15999, .14], [62809, .24], [277825, .42], [Infinity, .45]], joint: [], head: [] } },
      { id: '2024', label: '2024', deduction: { single: 11604, joint: 23208, head: 11604 }, federal: { single: [[17005, .14], [66760, .24], [277825, .42], [Infinity, .45]], joint: [], head: [] } },
      { id: '2025', label: '2025', deduction: { single: 12096, joint: 24192, head: 12096 }, federal: { single: [[17443, .14], [68480, .24], [277825, .42], [Infinity, .45]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'BE', name: 'Berlin', code: 'BE', cities: ['Berlin'], counties: [], propertyTax: 0, salesTax: 19, flatTax: 0, medianIncome: 44000, costOfLivingIndex: 97, taxStructure: 'Progressive', statuteCitation: 'EStG § 32a', governingBody: 'Senatsverwaltung für Finanzen Berlin', description: 'Real estate transfer tax (Grunderwerbsteuer) is 6.0%.' },
      { id: 'BY', name: 'Bavaria (Bayern)', code: 'BY', cities: ['Munich', 'Nuremberg', 'Augsburg'], counties: [], propertyTax: 0, salesTax: 19, flatTax: 0, medianIncome: 52000, costOfLivingIndex: 112, taxStructure: 'Progressive', statuteCitation: 'EStG § 32a', governingBody: 'Bayerisches Landesamt für Steuern', description: 'Lowest real estate transfer tax in Germany at 3.5%.' },
      { id: 'NW', name: 'North Rhine-Westphalia (NRW)', code: 'NW', cities: ['Cologne', 'Dusseldorf', 'Dortmund', 'Essen'], counties: [], propertyTax: 0, salesTax: 19, flatTax: 0, medianIncome: 47000, costOfLivingIndex: 99, taxStructure: 'Progressive', statuteCitation: 'EStG § 32a', governingBody: 'Finanzverwaltung NRW', description: 'Grunderwerbsteuer is 6.5%.' },
      { id: 'HH', name: 'Hamburg (Free & Hanseatic City)', code: 'HH', cities: ['Hamburg'], counties: [], propertyTax: 0, salesTax: 19, flatTax: 0, medianIncome: 50000, costOfLivingIndex: 108, taxStructure: 'Progressive', statuteCitation: 'EStG § 32a; HmbGrEStG', governingBody: 'Finanzbehörde Hamburg', description: 'Major maritime port city-state. Grunderwerbsteuer is 5.5%.' },
    ],
  },
  FR: {
    name: 'France',
    legalBody: 'Direction Générale des Finances Publiques (DGFiP)',
    rules: 'Impôt sur le revenu is calculated by tax household (foyer fiscal) using the family quotient (quotient familial). 5 progressive brackets apply with a 10% standard deduction for professional expenses.',
    currency: 'EUR',
    symbol: '\u20ac',
    regionLabel: 'Region',
    taxYear: '2025',
    source: { name: 'Code général des impôts (CGI Art. 197)', url: 'https://www.impots.gouv.fr/' },
    years: [
      { id: '2023', label: '2023', deduction: { single: 10777, joint: 21554, head: 10777 }, federal: { single: [[27478, .11], [78570, .3], [168994, .41], [Infinity, .45]], joint: [], head: [] } },
      { id: '2024', label: '2024', deduction: { single: 11294, joint: 22588, head: 11294 }, federal: { single: [[28797, .11], [82341, .3], [177106, .41], [Infinity, .45]], joint: [], head: [] } },
      { id: '2025', label: '2025', deduction: { single: 11497, joint: 22994, head: 11497 }, federal: { single: [[29315, .11], [83823, .3], [180294, .41], [Infinity, .45]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'IDF', name: 'Île-de-France (Paris)', code: 'IDF', cities: ['Paris', 'Boulogne-Billancourt', 'Versailles'], counties: [], propertyTax: 0, salesTax: 20, flatTax: 0, medianIncome: 42000, costOfLivingIndex: 118, taxStructure: 'Progressive', statuteCitation: 'CGI Art. 197', governingBody: 'DGFiP Île-de-France', description: 'National progressive barème applies. High local taxe foncière.' },
      { id: 'ARA', name: 'Auvergne-Rhône-Alpes (Lyon)', code: 'ARA', cities: ['Lyon', 'Grenoble', 'Saint-Étienne'], counties: [], propertyTax: 0, salesTax: 20, flatTax: 0, medianIncome: 35000, costOfLivingIndex: 98, taxStructure: 'Progressive', statuteCitation: 'CGI Art. 197', governingBody: 'DGFiP', description: 'National progressive rates apply.' },
      { id: 'PAC', name: 'Provence-Alpes-Côte d\'Azur (Marseille/Nice)', code: 'PAC', cities: ['Marseille', 'Nice', 'Cannes', 'Toulon'], counties: [], propertyTax: 0, salesTax: 20, flatTax: 0, medianIncome: 34000, costOfLivingIndex: 103, taxStructure: 'Progressive', statuteCitation: 'CGI Art. 197', governingBody: 'DGFiP PACA', description: 'Mediterranean economic region with tourism and tech hubs (Sophia Antipolis).' },
    ],
  },
  JP: {
    name: 'Japan',
    legalBody: 'National Tax Agency Japan (Kokuzeichō)',
    rules: 'Shotokuzei (income tax) ranges from 5% to 45% across 7 brackets. In addition, municipalities levy local Inhabitant Tax (Jūminzei) at a flat 10% (4% prefectural + 6% municipal), plus a 2.1% Special Reconstruction Income Tax.',
    currency: 'JPY',
    symbol: '\u00a5',
    regionLabel: 'Prefecture',
    taxYear: '2025',
    source: { name: 'National Tax Agency Income Tax Act', url: 'https://www.nta.go.jp/english/' },
    years: [
      { id: '2024', label: '2024', deduction: { single: 480000, joint: 480000, head: 480000 }, federal: { single: [[1950000, .05], [3300000, .1], [6950000, .2], [9000000, .23], [18000000, .33], [40000000, .4], [Infinity, .45]], joint: [], head: [] } },
      { id: '2025', label: '2025', deduction: { single: 480000, joint: 480000, head: 480000 }, federal: { single: [[1950000, .05], [3300000, .1], [6950000, .2], [9000000, .23], [18000000, .33], [40000000, .4], [Infinity, .45]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'TK', name: 'Tokyo Metropolis', code: 'TK', cities: ['Tokyo 23 Wards', 'Hachioji', 'Tachikawa'], counties: [], propertyTax: 0, salesTax: 10, flatTax: 0, medianIncome: 6200000, costOfLivingIndex: 120, taxStructure: 'Progressive', statuteCitation: 'Income Tax Act § 89; Local Tax Act', governingBody: 'Tokyo Metropolitan Government Bureau of Taxation / NTA', description: 'National income tax 5%–45% + 10% Jūminzei inhabitant tax.' },
      { id: 'OS', name: 'Osaka Prefecture', code: 'OS', cities: ['Osaka City', 'Sakai'], counties: [], propertyTax: 0, salesTax: 10, flatTax: 0, medianIncome: 5400000, costOfLivingIndex: 104, taxStructure: 'Progressive', statuteCitation: 'Local Tax Act', governingBody: 'Osaka Regional Taxation Bureau', description: 'Standard prefectural and municipal inhabitant taxes apply.' },
      { id: 'KY', name: 'Kyoto Prefecture', code: 'KY', cities: ['Kyoto City', 'Uji', 'Maizuru'], counties: [], propertyTax: 0, salesTax: 10, flatTax: 0, medianIncome: 5100000, costOfLivingIndex: 101, taxStructure: 'Progressive', statuteCitation: 'Local Tax Act', governingBody: 'Kyoto Prefectural Tax Office', description: 'Cultural and precision manufacturing center. Municipal accommodation tax applies.' },
    ],
  },
  IN: {
    name: 'India',
    legalBody: 'Income Tax Department (Central Board of Direct Taxes)',
    rules: 'India operates both a Default New Tax Regime (Section 115BAC) with progressive slabs from 5% to 30% and an optional Old Tax Regime with chapter VI-A deductions. Health and Education Cess is 4% on tax.',
    currency: 'INR',
    symbol: '\u20b9',
    regionLabel: 'State',
    taxYear: '2025/26',
    source: { name: 'Finance Act 2024 / Sec. 115BAC Income-tax Act, 1961', url: 'https://www.incometax.gov.in/' },
    years: [
      { id: '2023/24', label: 'FY 2023-24 (AY 2024-25)', deduction: { single: 50000, joint: 50000, head: 50000 }, federal: { single: [[300000, 0], [600000, .05], [900000, .1], [1200000, .15], [1500000, .2], [Infinity, .3]], joint: [], head: [] } },
      { id: '2024/25', label: 'FY 2024-25 (New Regime)', deduction: { single: 75000, joint: 75000, head: 75000 }, federal: { single: [[300000, 0], [700000, .05], [1000000, .1], [1200000, .15], [1500000, .2], [Infinity, .3]], joint: [], head: [] } },
      { id: '2025/26', label: 'FY 2025-26', deduction: { single: 75000, joint: 75000, head: 75000 }, federal: { single: [[400000, 0], [800000, .05], [1200000, .1], [1600000, .15], [2000000, .2], [2400000, .25], [Infinity, .3]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'DL', name: 'National Capital Territory of Delhi', code: 'DL', cities: ['New Delhi', 'North Delhi'], counties: [], propertyTax: 0, salesTax: 18, flatTax: 0, medianIncome: 450000, costOfLivingIndex: 108, taxStructure: 'Progressive', statuteCitation: 'Income-tax Act, 1961 § 115BAC', governingBody: 'Income Tax Department (CBDT)', description: 'GST is 18% standard rate. Income tax has zero state deduction.' },
      { id: 'MH', name: 'Maharashtra (Mumbai)', code: 'MH', cities: ['Mumbai', 'Pune', 'Nagpur', 'Thane'], counties: [], propertyTax: 0, salesTax: 18, flatTax: 0, medianIncome: 520000, costOfLivingIndex: 115, taxStructure: 'Progressive', statuteCitation: 'Maharashtra State Tax on Professions Act, 1975', governingBody: 'Department of Goods and Services Tax, Maharashtra / CBDT', description: 'Financial capital of India. Professional tax is ₹2,500/year.' },
      { id: 'KA', name: 'Karnataka (Bengaluru)', code: 'KA', cities: ['Bengaluru', 'Mysuru', 'Mangaluru'], counties: [], propertyTax: 0, salesTax: 18, flatTax: 0, medianIncome: 510000, costOfLivingIndex: 104, taxStructure: 'Progressive', statuteCitation: 'Karnataka Tax on Professions Act', governingBody: 'Commercial Taxes Department, Karnataka / CBDT', description: 'Information technology hub. Professional tax of ₹200/month.' },
    ],
  },
  NZ: {
    name: 'New Zealand',
    legalBody: 'Inland Revenue Department (Te Tari Taake)',
    rules: 'Personal income tax applies across 5 progressive brackets without a general tax-free threshold. Budget 2024 adjusted bracket thresholds upward from 31 July 2024. ACC Earner Levy applies to salary.',
    currency: 'NZD',
    symbol: 'NZ$',
    regionLabel: 'Region',
    taxYear: '2025/26',
    source: { name: 'Inland Revenue Income Tax Act 2007', url: 'https://www.ird.govt.nz/income-tax/income-tax-for-individuals' },
    years: [
      { id: '2023/24', label: '2023 / 24', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[14000, .105], [48000, .175], [70000, .3], [180000, .33], [Infinity, .39]], joint: [], head: [] } },
      { id: '2024/25', label: '2024 / 25', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[15600, .105], [53500, .175], [78100, .3], [180000, .33], [Infinity, .39]], joint: [], head: [] } },
      { id: '2025/26', label: '2025 / 26', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[15600, .105], [53500, .175], [78100, .3], [180000, .33], [Infinity, .39]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'AUK', name: 'Auckland Region', code: 'AUK', cities: ['Auckland', 'Manukau', 'North Shore'], counties: [], propertyTax: 0, salesTax: 15, flatTax: 0, medianIncome: 78000, costOfLivingIndex: 110, taxStructure: 'Progressive', statuteCitation: 'Income Tax Act 2007 (NZ)', governingBody: 'Inland Revenue (IRD)', description: 'GST is 15%. Local council rates apply for residential property.' },
      { id: 'WGN', name: 'Wellington Region', code: 'WGN', cities: ['Wellington', 'Lower Hutt', 'Porirua'], counties: [], propertyTax: 0, salesTax: 15, flatTax: 0, medianIncome: 82000, costOfLivingIndex: 104, taxStructure: 'Progressive', statuteCitation: 'Income Tax Act 2007 (NZ)', governingBody: 'Inland Revenue (IRD)', description: 'National rates apply. Public sector employment base.' },
    ],
  },
  CH: {
    name: 'Switzerland',
    legalBody: 'Federal Tax Administration (ESTV / AFC)',
    rules: 'Swiss income taxation is three-tiered: Federal direct tax (progressive up to 11.5%), Cantonal tax, and Communal multiplier tax. Wealth tax (Vermögenssteuer) is levied at the cantonal level.',
    currency: 'CHF',
    symbol: 'CHF ',
    regionLabel: 'Canton',
    taxYear: '2025',
    source: { name: 'Swiss Federal Tax Administration (DBG / LIFD)', url: 'https://www.estv.admin.ch/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 17800, joint: 30800, head: 17800 }, federal: { single: [[31600, .0077], [41400, .0088], [55200, .0264], [72500, .0297], [103600, .0594], [134600, .066], [176000, .088], [755200, .11], [Infinity, .115]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'ZH', name: 'Canton of Zurich', code: 'ZH', cities: ['Zurich', 'Winterthur'], counties: [], propertyTax: 0.1, salesTax: 8.1, flatTax: 0, medianIncome: 98000, costOfLivingIndex: 142, taxStructure: 'Progressive with municipal multiplier', statuteCitation: 'StG ZH (Steuergesetz Zürich)', governingBody: 'Kantonales Steueramt Zürich', description: 'Global banking & wealth management hub. Standard VAT is 8.1%.' },
      { id: 'GE', name: 'Canton of Geneva', code: 'GE', cities: ['Geneva', 'Carouge'], counties: [], propertyTax: 0.15, salesTax: 8.1, flatTax: 0, medianIncome: 95000, costOfLivingIndex: 145, taxStructure: 'Progressive with centimes additionnels', statuteCitation: 'LIPP Geneva', governingBody: 'Administration Fiscale Cantonale Genève', description: 'International diplomatic and private banking center.' },
    ],
  },
  SG: {
    name: 'Singapore',
    legalBody: 'Inland Revenue Authority of Singapore (IRAS)',
    rules: 'Singapore operates a territorial, highly progressive resident income tax system from 0% up to 24% (for income above S$1,000,000). There is no capital gains tax or estate duty. GST is 9%.',
    currency: 'SGD',
    symbol: 'S$',
    regionLabel: 'Planning Region',
    taxYear: '2025',
    source: { name: 'IRAS Income Tax Act 1947', url: 'https://www.iras.gov.sg/' },
    years: [
      { id: '2025', label: 'YA 2025', deduction: { single: 20000, joint: 20000, head: 20000 }, federal: { single: [[30000, .02], [40000, .035], [80000, .07], [120000, .115], [160000, .15], [200000, .18], [240000, .19], [280000, .195], [320000, .20], [500000, .22], [1000000, .23], [Infinity, .24]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'SG-CR', name: 'Central Region (Singapore)', code: 'SG-CR', cities: ['Marina Bay', 'Orchard', 'Raffles Place'], counties: [], propertyTax: 0.4, salesTax: 9, flatTax: 0, medianIncome: 84000, costOfLivingIndex: 128, taxStructure: 'Progressive', statuteCitation: 'Income Tax Act 1947 (Singapore)', governingBody: 'Inland Revenue Authority of Singapore (IRAS)', description: 'Zero capital gains tax. CPF contributions apply for citizens and PRs.' },
    ],
  },
  BR: {
    name: 'Brazil',
    legalBody: 'Receita Federal do Brasil (RFB)',
    rules: 'Imposto de Renda Pessoa Física (IRPF) applies across 5 progressive brackets up to 27.5%. Employees also contribute INSS social security up to statutory ceilings.',
    currency: 'BRL',
    symbol: 'R$',
    regionLabel: 'State',
    taxYear: '2025',
    source: { name: 'Receita Federal IRPF Progressive Table', url: 'https://www.gov.br/receitafederal/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 26963, joint: 26963, head: 26963 }, federal: { single: [[33919, .075], [45012, .15], [55976, .225], [Infinity, .275]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'BR-SP', name: 'São Paulo State', code: 'BR-SP', cities: ['São Paulo', 'Campinas', 'Santos'], counties: [], propertyTax: 1.0, salesTax: 18, flatTax: 0, medianIncome: 62000, costOfLivingIndex: 72, taxStructure: 'Progressive', statuteCitation: 'Regulamento do Imposto de Renda (RIR/2018)', governingBody: 'Secretaria da Fazenda e Planejamento SP / RFB', description: 'Economic heart of South America. ICMS state value-added tax is 18%.' },
    ],
  },
  KR: {
    name: 'South Korea',
    legalBody: 'National Tax Service (NTS / Guksecheong)',
    rules: 'Global income tax applies across 8 progressive brackets from 6% to 45%. In addition, a 10% Local Income Tax surcharge is assessed on top of the national income tax liability.',
    currency: 'KRW',
    symbol: '₩',
    regionLabel: 'Metropolitan Area',
    taxYear: '2025',
    source: { name: 'Korean Income Tax Act (National Tax Service)', url: 'https://www.nts.go.kr/english/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 1500000, joint: 1500000, head: 1500000 }, federal: { single: [[14000000, .06], [50000000, .15], [88000000, .24], [150000000, .35], [300000000, .38], [500000000, .40], [1000000000, .42], [Infinity, .45]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'KR-SE', name: 'Seoul Special City', code: 'KR-SE', cities: ['Seoul (Gangnam/Yeouido)', 'Incheon'], counties: [], propertyTax: 0.3, salesTax: 10, flatTax: 0, medianIncome: 54000000, costOfLivingIndex: 103, taxStructure: 'Progressive + 10% local surcharge', statuteCitation: 'Income Tax Act § 55; Local Tax Act', governingBody: 'Seoul Metropolitan Government Tax Division / NTS', description: 'National tax plus 10% local inhabitant income tax.' },
    ],
  },
  IE: {
    name: 'Ireland',
    legalBody: 'Office of the Revenue Commissioners (Revenue.ie)',
    rules: 'Irish progressive taxation comprises two bands (20% standard rate band and 40% higher rate). Key non-refundable credits include the Personal Tax Credit and the PAYE Employee Tax Credit. USC (Universal Social Charge) is separately levied using staggered bands (0.5% to 8% surtax above €100k).',
    currency: 'EUR',
    symbol: '€',
    regionLabel: 'County',
    taxYear: '2025',
    source: { name: 'Office of the Revenue Commissioners PAYE Tables 2023-2026', url: 'https://www.revenue.ie/en/jobs-and-pensions/taxing-employee-income/what-tax-and-universal-social-charge-do-i-pay.aspx' },
    years: [
      { id: '2023', label: '2023', deduction: { single: 40000, joint: 40000, head: 40000 }, federal: { single: [[40000, .20], [Infinity, .40]], joint: [], head: [] }, credit: () => 3550, creditLabel: 'Personal + Employee Tax Credits' },
      { id: '2024', label: '2024', deduction: { single: 42000, joint: 42000, head: 42000 }, federal: { single: [[42000, .20], [Infinity, .40]], joint: [], head: [] }, credit: () => 3750, creditLabel: 'Personal + Employee Tax Credits' },
      { id: '2025', label: '2025', deduction: { single: 44000, joint: 44000, head: 44000 }, federal: { single: [[44000, .20], [Infinity, .40]], joint: [], head: [] }, credit: () => 3900, creditLabel: 'Personal + Employee Tax Credits' },
    ],
    regions: [
      { id: 'IE-D', name: 'Dublin', code: 'IE-D', cities: ['Dublin', 'Sandyford', 'Ballsbridge'], counties: [], propertyTax: 0.2, salesTax: 23, flatTax: 0, medianIncome: 56000, costOfLivingIndex: 121, taxStructure: 'Progressive', statuteCitation: 'Taxes Consolidation Act 1997 (TCA 1997)', governingBody: 'Revenue Commissioners of Ireland', description: 'Standard rate bands apply. Local Property Tax varies by county.' },
      { id: 'IE-C', name: 'Cork', code: 'IE-C', cities: ['Cork City', 'Mallow', 'Youghal'], counties: [], propertyTax: 0.2, salesTax: 23, flatTax: 0, medianIncome: 48000, costOfLivingIndex: 104, taxStructure: 'Progressive', statuteCitation: 'TCA 1997', governingBody: 'Revenue Commissioners', description: 'Cork city is a growing biotech and pharma hub.' },
    ],
  },
  NL: {
    name: 'Netherlands',
    legalBody: 'Belastingdienst (Dutch Tax and Customs Administration)',
    rules: 'Box 1 wage income is taxed using a combined system of income tax and national insurance premium (premie volksverzekeringen). The bottom bracket covers both components (approx. 36.97% / 35.82%). High-income earners move into two tax-only tiers (37.07% and 49.50%). Deductions include General Tax Credit (AHTK) and Labour Tax Credit (AK) that phase out above approx. €28k/€60k of income.',
    currency: 'EUR',
    symbol: '€',
    regionLabel: 'Province',
    taxYear: '2025',
    source: { name: 'Belastingdienst Box 1 rates 2023-2026', url: 'https://www.belastingdienst.nl/wps/wcm/connect/en/individuals/individuals' },
    years: [
      { id: '2023', label: '2023', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[75518, .3697], [Infinity, .495]], joint: [], head: [] }, credit: income => Math.max(311, 3030 - Math.max(0, income - 24812) * .06532), creditLabel: 'General Tax Credit (AHTK phase-out)' },
      { id: '2024', label: '2024', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[75518, .3697], [Infinity, .495]], joint: [], head: [] }, credit: income => Math.max(311, 3068 - Math.max(0, income - 24812) * .06532), creditLabel: 'General Tax Credit (AHTK phase-out)' },
      { id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[75518, .3582], [106087, .3707], [Infinity, .495]], joint: [], head: [] }, credit: income => Math.max(315, 2958 - Math.max(0, income - 29406) * .06512), creditLabel: 'General Tax Credit (AHTK phase-out)' },
    ],
    regions: [
      { id: 'NL-NH', name: 'North Holland (Amsterdam)', code: 'NL-NH', cities: ['Amsterdam', 'Haarlem', 'Zaandam'], counties: [], propertyTax: 0.1, salesTax: 21, flatTax: 0, medianIncome: 55000, costOfLivingIndex: 118, taxStructure: 'Progressive', statuteCitation: 'Wet IB 2001 Ch. II Box 1', governingBody: 'Belastingdienst', description: 'Box 1 rates apply nationally; the Water Board tax is levied separately.' },
      { id: 'NL-ZH', name: 'South Holland (Rotterdam/The Hague)', code: 'NL-ZH', cities: ['Rotterdam', 'The Hague', 'Leiden'], counties: [], propertyTax: 0.1, salesTax: 21, flatTax: 0, medianIncome: 52000, costOfLivingIndex: 111, taxStructure: 'Progressive', statuteCitation: 'Wet IB 2001', governingBody: 'Belastingdienst', description: 'Logistics and government employment center.' },
    ],
  },
  ES: {
    name: 'Spain',
    legalBody: 'Agencia Estatal de Administración Tributaria (AEAT)',
    rules: 'The Impuesto sobre la Renta de las Personas Físicas (IRPF) consists of half General State brackets (approx. 4.75% to 12.25%) and half Regional Autonomous brackets. Madrid autonomous rates run 4.5% to 12.25%, while Catalonia runs 4.5% to 12.5%, with a personal threshold allowance of €5,550. Deducciones y desgravaciones apply at both levels.',
    currency: 'EUR',
    symbol: '€',
    regionLabel: 'Autonomous Community',
    taxYear: '2025',
    source: { name: 'AEAT IRPF 2023-2026 rates', url: 'https://sede.agenciatributaria.gob.es/' },
    years: [
      { id: '2024', label: '2024', deduction: { single: 5550, joint: 5550, head: 5550 }, federal: { single: [[12450, .095], [20200, .12], [35200, .15], [60000, .185], [300000, .225], [Infinity, .245]], joint: [], head: [] } },
      { id: '2025', label: '2025', deduction: { single: 5550, joint: 5550, head: 5550 }, federal: { single: [[12450, .095], [20200, .12], [35200, .15], [60000, .185], [300000, .225], [Infinity, .245]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'ES-MD', name: 'Comunidad de Madrid', code: 'ES-MD', cities: ['Madrid', 'Alcobendas', 'Getafe'], counties: [], propertyTax: 0.6, salesTax: 21, flatTax: 0, medianIncome: 41000, costOfLivingIndex: 106, taxStructure: 'Progressive', statuteCitation: 'Ley 24/2013 de la Comunidad de Madrid IRPF', governingBody: 'Consejería de Hacienda Madrid / AEAT', description: 'One of the lowest autonomous marginal brackets in Spain.' },
      { id: 'ES-CT', name: 'Catalonia (Catalunya)', code: 'ES-CT', cities: ['Barcelona', 'Girona', 'Tarragona'], counties: [], propertyTax: 0.7, salesTax: 21, flatTax: 0, medianIncome: 39000, costOfLivingIndex: 107, taxStructure: 'Progressive', statuteCitation: 'Llei 5/2023 IRPF Catalunya', governingBody: 'Departament d\'Economia i Hisenda Catalunya / AEAT', description: 'Catalan top autonomous marginal rate is 12.5% over €175k.' },
    ],
  },
  IT: {
    name: 'Italy',
    legalBody: 'Agenzia delle Entrate (Italian Revenue Agency)',
    rules: 'L\'Imposta sul Reddito delle Persone Fisiche (IRPEF) is a progressive 3-band national tax (23% / 35% / 43%). A 10% standard deduction applies to employee income (max €1,955/yr as a credit). Regional surtaxes run 0.7% to 3.33% (Lombardy/Lazio), while municipal surtaxes run 0% to 0.9%.',
    currency: 'EUR',
    symbol: '€',
    regionLabel: 'Region',
    taxYear: '2025',
    source: { name: 'Agenzia delle Entrate IRPEF 2023-2026', url: 'https://www.agenziaentrate.gov.it/portale/web/english/' },
    years: [
      { id: '2024', label: '2024', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[28000, .23], [50000, .35], [Infinity, .43]], joint: [], head: [] }, credit: income => Math.min(1955, Math.max(690, 1955 - Math.max(0, income - 15000) * .0001)), creditLabel: 'Employment income credit' },
      { id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[28000, .23], [50000, .35], [Infinity, .43]], joint: [], head: [] }, credit: income => Math.min(1955, Math.max(690, 1955 - Math.max(0, income - 15000) * .0001)), creditLabel: 'Employment income credit' },
    ],
    regions: [
      { id: 'IT-LAZ', name: 'Lazio (Rome)', code: 'IT-LAZ', cities: ['Rome', 'Frosinone', 'Latina'], counties: [], propertyTax: 0.86, salesTax: 22, flatTax: 0.0173, medianIncome: 36000, costOfLivingIndex: 103, taxStructure: 'Progressive + regional surtax', statuteCitation: 'TUIR DPR 917/1986', governingBody: 'Agenzia delle Entrate (Roma)', description: 'Regional surtax in Lazio is 1.73% (max 3.33%).' },
      { id: 'IT-LOM', name: 'Lombardy (Milan)', code: 'IT-LOM', cities: ['Milan', 'Bergamo', 'Brescia'], counties: [], propertyTax: 0.86, salesTax: 22, flatTax: 0.0173, medianIncome: 42000, costOfLivingIndex: 110, taxStructure: 'Progressive + regional surtax', statuteCitation: 'TUIR DPR 917/1986', governingBody: 'Agenzia delle Entrate (Milano)', description: 'Financial hub of Italy. Regional surtax is 1.73%.' },
    ],
  },
  MX: {
    name: 'Mexico',
    legalBody: 'Servicio de Administración Tributaria (SAT)',
    rules: 'Impuesto Sobre la Renta (ISR) de personas físicas has 11 progressive brackets from 1.92% to 35%. Annual ISR is calculated on Mexican-source and resident foreign income. State and municipal add-ons are generally integrated into the single federal system, but Mexico City applies very modest property tax adjustments.',
    currency: 'MXN',
    symbol: '$',
    regionLabel: 'State',
    taxYear: '2025',
    source: { name: 'LISR Article 96 & 152 Annual Tables', url: 'https://www.sat.gob.mx/' },
    years: [
      { id: '2024', label: '2024', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[8952, .0192], [75984, .064], [133536, .1088], [155229, .16], [185852, .1792], [374837, .2136], [590795, .2352], [1127926, .30], [1503845, .32], [4510707, .34], [Infinity, .35]], joint: [], head: [] } },
      { id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[8952, .0192], [75984, .064], [133536, .1088], [155229, .16], [185852, .1792], [374837, .2136], [590795, .2352], [1127926, .30], [1503845, .32], [4510707, .34], [Infinity, .35]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'MX-CDMX', name: 'Mexico City (CDMX)', code: 'MX-CDMX', cities: ['Benito Juárez', 'Coyoacán', 'Iztapalapa'], counties: [], propertyTax: 0.2, salesTax: 16, flatTax: 0, medianIncome: 380000, costOfLivingIndex: 68, taxStructure: 'Progressive', statuteCitation: 'Código Fiscal de la Ciudad de México; LISR', governingBody: 'Secretaría de Finanzas CDMX / SAT', description: 'Federal progressive ISR applies in the capital.' },
      { id: 'MX-NL', name: 'Nuevo León (Monterrey)', code: 'MX-NL', cities: ['Monterrey', 'San Pedro Garza'], counties: [], propertyTax: 0.4, salesTax: 16, flatTax: 0, medianIncome: 520000, costOfLivingIndex: 74, taxStructure: 'Progressive', statuteCitation: 'LISR; Ley de Patrimonio Territorial NL', governingBody: 'Secretaría de Hacienda Nuevo León', description: 'Industrial engine of northern Mexico.' },
    ],
  },
  AR: {
    name: 'Argentina',
    legalBody: 'Administración Federal de Ingresos Públicos (AFIP/ARCA)',
    rules: 'Impuesto a las Ganancias for wage earners applies via a graduated salary exemption (deducción especial) plus a progressive annual bracket table ranging from 5% to 35%. The non-taxable minimum (MNI) and special pensioners/employee deductions are adjusted for inflation twice yearly and often indexed quarterly.',
    currency: 'ARS',
    symbol: '$',
    regionLabel: 'Province',
    taxYear: '2025',
    source: { name: 'AFIP Ganancias Trabajador en Relación de Dependencia 2025', url: 'https://www.afip.gob.ar/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 26400000, joint: 26400000, head: 26400000 }, federal: { single: [[134664, .05], [269328, .09], [403992, .12], [538656, .15], [807984, .19], [1077312, .23], [4309248, .31], [6463872, .35], [Infinity, .35]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'AR-CABA', name: 'Buenos Aires Autonomous City (CABA)', code: 'AR-CABA', cities: ['Buenos Aires'], counties: [], propertyTax: 0.75, salesTax: 21, flatTax: 0, medianIncome: 1500000, costOfLivingIndex: 62, taxStructure: 'Progressive', statuteCitation: 'Ley de Impuesto a las Ganancias N. 20.628; Res. Gral. ARCA N. 5590', governingBody: 'Administración de Ingresos Públicos CABA / AFIP', description: 'Wage earners benefit from special deductions, but real ARS figuress shift with inflation adjustments.' },
      { id: 'AR-BA', name: 'Buenos Aires Province', code: 'AR-BA', cities: ['La Plata', 'Mar del Plata'], counties: [], propertyTax: 0.8, salesTax: 21, flatTax: 0, medianIncome: 1200000, costOfLivingIndex: 55, taxStructure: 'Progressive', statuteCitation: 'Ley 20.628; IMGR Provincial Tax', governingBody: 'ARBA / AFIP', description: 'Provincial stamp tax and property tax apply in addition to federal IRA.' },
    ],
  },
  ID: {
    name: 'Indonesia',
    legalBody: 'Direktorat Jenderal Pajak (DJP / Directorate General of Taxes)',
    rules: 'Pajak Penghasilan (PPh) Orang Pribadi is based on progressive rates (5%, 15%, 25%, 30%, 35%) applied to PKP (Taxable Income). PTKP (Penghasilan Tidak Kena Pajak), or non-taxable income floor, is IDR 54 million for single individuals and IDR 4.5m per dependent. 2024 inflation adjustment applied to PTKP.',
    currency: 'IDR',
    symbol: 'Rp',
    regionLabel: 'Province',
    taxYear: '2025',
    source: { name: 'DJP PMK-101/2016 & Law 7/2021 Integrated PTKP', url: 'https://www.pajak.go.id/en' },
    years: [
      { id: '2024', label: '2024', deduction: { single: 54000000, joint: 54000000, head: 54000000 }, federal: { single: [[60000000, .05], [250000000, .15], [500000000, .25], [5000000000, .30], [Infinity, .35]], joint: [], head: [] } },
      { id: '2025', label: '2025', deduction: { single: 54000000, joint: 54000000, head: 54000000 }, federal: { single: [[60000000, .05], [250000000, .15], [500000000, .25], [5000000000, .30], [Infinity, .35]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'ID-JK', name: 'DKI Jakarta', code: 'ID-JK', cities: ['Jakarta', 'Depok', 'Bekasi'], counties: [], propertyTax: 0.2, salesTax: 11, flatTax: 0, medianIncome: 120000000, costOfLivingIndex: 45, taxStructure: 'Progressive', statuteCitation: 'UU PPh No. 36/2008 jo. UU Ciptaker No. 6/2023', governingBody: 'DJP Kanwil Jakarta / Kemenkeu', description: 'Jakarta employees contribute BPJS Kesehatan and Ketenagakerjaan separately.' },
      { id: 'ID-JB', name: 'West Java (Bandung)', code: 'ID-JB', cities: ['Bandung', 'Cimahi'], counties: [], propertyTax: 0.1, salesTax: 11, flatTax: 0, medianIncome: 80000000, costOfLivingIndex: 38, taxStructure: 'Progressive', statuteCitation: 'UU PPh No. 36/2008', governingBody: 'DJP Kanwil Jawa Barat', description: 'National progressive tiers apply with local property (PBB-P2) fees.' },
    ],
  },
  TH: {
    name: 'Thailand',
    legalBody: 'Revenue Department of Thailand (Graemor)',
    rules: 'Personal Income Tax for resident employees includes a 50% professional expense deduction (max THB 100k) plus basic personal allowance and optional deductions. Progressive rates run from 5% to 35%.',
    currency: 'THB',
    symbol: '฿',
    regionLabel: 'Province',
    taxYear: '2025',
    source: { name: 'Thailand RD Personal Income Tax Schedule 2023-2026', url: 'https://www.rd.go.th/english/' },
    years: [
      { id: '2024', label: '2024', deduction: { single: 160000, joint: 160000, head: 160000 }, federal: { single: [[150000, .05], [300000, .1], [500000, .15], [750000, .2], [1000000, .25], [2000000, .3], [5000000, .35], [Infinity, .35]], joint: [], head: [] } },
      { id: '2025', label: '2025', deduction: { single: 160000, joint: 160000, head: 160000 }, federal: { single: [[150000, .05], [300000, .1], [500000, .15], [750000, .2], [1000000, .25], [2000000, .3], [5000000, .35], [Infinity, .35]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'TH-BKK', name: 'Bangkok Metropolitan Area', code: 'TH-BKK', cities: ['Bangkok CBD', 'Sukhumvit', 'Silom'], counties: [], propertyTax: 0.05, salesTax: 7, flatTax: 0, medianIncome: 2400000, costOfLivingIndex: 53, taxStructure: 'Progressive', statuteCitation: 'Revenue Code of Thailand Ch. III', governingBody: 'Revenue Department (Graemor)', description: 'Residential real estate and land tax rates are chosen by local municipality in Thailand.' },
    ],
  },
  PH: {
    name: 'Philippines',
    legalBody: 'Bureau of Internal Revenue (BIR)',
    rules: 'Under the TRAIN Law (RA 10963 / RA 11534 CREATE, effective 2023-2027), individual graduated rates are simplified: ₱250,000 exempt, 15% on the excess, 20% at ₱400k, 25% at ₱800k, 30% at ₱2m, and 35% over ₱8m.',
    currency: 'PHP',
    symbol: '₱',
    regionLabel: 'Region',
    taxYear: '2025',
    source: { name: 'BIR Income Tax Rates 2023-2027 (TRAIN Law)', url: 'https://www.bir.gov.ph/index.php/income-tax.html' },
    years: [
      { id: '2023', label: '2023-2027 (TRAIN transition)', deduction: { single: 250000, joint: 250000, head: 250000 }, federal: { single: [[250000, 0], [400000, .15], [800000, .20], [2000000, .25], [8000000, .30], [Infinity, .35]], joint: [], head: [] } },
      { id: '2024', label: '2024', deduction: { single: 250000, joint: 250000, head: 250000 }, federal: { single: [[250000, 0], [400000, .15], [800000, .20], [2000000, .25], [8000000, .30], [Infinity, .35]], joint: [], head: [] } },
      { id: '2025', label: '2025', deduction: { single: 250000, joint: 250000, head: 250000 }, federal: { single: [[250000, 0], [400000, .15], [800000, .20], [2000000, .25], [8000000, .30], [Infinity, .35]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'PH-NCR', name: 'National Capital Region (NCR / Manila)', code: 'PH-NCR', cities: ['Makati', 'Quezon City', 'Pasig'], counties: [], propertyTax: 1.5, salesTax: 12, flatTax: 0, medianIncome: 380000, costOfLivingIndex: 39, taxStructure: 'Progressive', statuteCitation: 'RA 10963 TRAIN; NIRC Sec. 24(A)(2)', governingBody: 'BIR NCR / Makati City Operating Office', description: 'Business Process Outsourcing (BPO) and services industries center.' },
    ],
  },
  ZA: {
    name: 'South Africa',
    legalBody: 'South African Revenue Service (SARS)',
    rules: 'Personal Income Tax is progressive from 18% to 45%. The Primary Rebates (R17,235) automatically reduce assessed tax. The Top marginal rate of 45% hits over R1,817,000.',
    currency: 'ZAR',
    symbol: 'R',
    regionLabel: 'Province',
    taxYear: '2025/26',
    source: { name: 'SARS Budget 2025 Tax Guide', url: 'https://www.sars.gov.za/tax-rates/income-tax-rates/' },
    years: [
      { id: '2024/25', label: '2024/25', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[237100, .18], [370500, .26], [512800, .31], [673000, .36], [857900, .39], [1817000, .41], [Infinity, .45]], joint: [], head: [] }, credit: () => 17235, creditLabel: 'Primary Rebate' },
      { id: '2025/26', label: '2025/26', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[237100, .18], [370500, .26], [512800, .31], [673000, .36], [857900, .39], [1817000, .41], [Infinity, .45]], joint: [], head: [] }, credit: () => 17235, creditLabel: 'Primary Rebate' },
    ],
    regions: [
      { id: 'ZA-GP', name: 'Gauteng (Johannesburg / Pretoria)', code: 'ZA-GP', cities: ['Johannesburg', 'Sandton', 'Pretoria'], counties: [], propertyTax: 0.7, salesTax: 15, flatTax: 0, medianIncome: 450000, costOfLivingIndex: 55, taxStructure: 'Progressive with primary rebate', statuteCitation: 'Income Tax Act No. 58 of 1962', governingBody: 'SARS Gauteng / National Treasury', description: 'Economic heart of South Africa with financial and industrial centers.' },
      { id: 'ZA-WC', name: 'Western Cape (Cape Town)', code: 'ZA-WC', cities: ['Cape Town', 'Stellenbosch'], counties: [], propertyTax: 0.6, salesTax: 15, flatTax: 0, medianIncome: 420000, costOfLivingIndex: 58, taxStructure: 'Progressive with primary rebate', statuteCitation: 'Income Tax Act No. 58 of 1962', governingBody: 'Western Cape Provincial Government / SARS', description: 'Wine, tourism, and technology industries center.' },
    ],
  },
  AE: {
    name: 'United Arab Emirates',
    legalBody: 'Federal Tax Authority (FTA)',
    rules: 'The UAE levies no personal income tax on wages or professional income. A 5% VAT applies to goods and services (introduced in 2018, hike from 4% to 5%). A 9% Federal Corporate Tax applies to companies with taxable income above AED 375,000 (introduced in 2023). Certain free zones apply 0% corporate tax.',
    currency: 'AED',
    symbol: 'د.إ',
    regionLabel: 'Emirate',
    taxYear: '2025',
    source: { name: 'UAE Ministry of Finance / FTA 2023-2026', url: 'https://tax.gov.ae/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[Infinity, 0]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'AE-DXB', name: 'Emirate of Dubai', code: 'AE-DXB', cities: ['Dubai (DIFC)', 'Jumeirah'], counties: [], propertyTax: 5.0, salesTax: 5, flatTax: 0, medianIncome: 220000, costOfLivingIndex: 72, taxStructure: 'No wage income tax', statuteCitation: 'Cabinet Decision No. 49 of 2021', governingBody: 'Dubai Department of Economy & Tourism / FTA', description: 'No individual income tax attracts a high concentration of expatriate professionals. Dubai Tourism Fee 7% applies to hotel stays.' },
      { id: 'AE-AUH', name: 'Emirate of Abu Dhabi', code: 'AE-AUH', cities: ['Abu Dhabi City', 'Khalifa City'], counties: [], propertyTax: 0, salesTax: 5, flatTax: 0, medianIncome: 240000, costOfLivingIndex: 75, taxStructure: 'No wage income tax', statuteCitation: 'FTA Federal Corporate Tax Decree Law 47/2022', governingBody: 'Abu Dhabi Department of Finance / FTA', description: 'Oil, sovereign wealth, and government employment hub.' },
    ],
  },
  PL: {
    name: 'Poland',
    legalBody: 'Ministry of Finance / KAS (National Revenue Administration)',
    rules: 'Polski Ład reform (2022) streamlined PIT to just two brackets (12% and 32%), abolishing the middle class tax relief and introducing a tax-free allowance (kwota wolna) combined with auto-credit (Auto 30k deduction + excess x 12% scaling). Taxpayers above PLN 1,000,000 pay a 4% Solidarity Tax.Dodatkowa jest ulga dla rodziców wychowujących czworo i więcej dzieci.',
    currency: 'PLN',
    symbol: 'zł',
    regionLabel: 'Voivodeship',
    taxYear: '2025',
    source: { name: 'Ministry of Finance PIT Tables 2023-2026', url: 'https://www.gov.pl/web/finanse/' },
    years: [
      { id: '2024', label: '2024', deduction: { single: 30000, joint: 30000, head: 30000 }, federal: { single: [[120000, .12], [Infinity, .32]], joint: [], head: [] }, credit: income => Math.min(3600, 3600 + Math.max(0, 30000 - income) * .12), creditLabel: 'Tax-free allowance credit (Kwota wolna)' },
      { id: '2025', label: '2025 Supreme Court evaluation', deduction: { single: 30000, joint: 30000, head: 30000 }, federal: { single: [[120000, .12], [Infinity, .32]], joint: [], head: [] }, credit: income => Math.min(3600, 3600 + Math.max(0, 30000 - income) * .12), creditLabel: 'Tax-free allowance credit (Kwota wolna)' },
    ],
    regions: [
      { id: 'PL-MAZ', name: 'Mazowieckie (Warsaw)', code: 'PL-MAZ', cities: ['Warsaw (Warszawa)', 'Radom'], counties: [], propertyTax: 0.85, salesTax: 23, flatTax: 0, medianIncome: 120000, costOfLivingIndex: 55, taxStructure: 'Simplified two-band', statuteCitation: 'Ustawa o podatku dochodowym PIT z 1992; Polski Ład Dziennik Ustaw', governingBody: 'Urząd Skarbowy Warszawa', description: '12% PIT and 4% solidarity for millionaires in capital city.' },
    ],
  },
  SE: {
    name: 'Sweden',
    legalBody: 'Skatteverket (Swedish Tax Agency)',
    rules: 'Swedish personal income tax consists of Kommunalskatt (municipality income tax) distinct by locality (typically 28-37%), combined with Statsskatt (national proportional tax above annual threshold). Communal rates are so localized that even adjacent municipalities have different tax outcomes.',
    currency: 'SEK',
    symbol: 'kr',
    regionLabel: 'Kommun',
    taxYear: '2025',
    source: { name: 'Skatteverket Kommunalskatter & Indkomstskatter 2023-2026', url: 'https://www.skatteverket.se/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 16100, joint: 16100, head: 16100 }, federal: { single: [[615700, .105], [Infinity, .30]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'SE-STH', name: 'Stockholm Kommun', code: 'SE-STH', cities: ['Stockholm', 'Järfälla'], counties: [], propertyTax: 0.35, salesTax: 25, flatTax: 0, medianIncome: 380000, costOfLivingIndex: 106, taxStructure: 'Kommunalskatt 28.98% + Statsskatt', statuteCitation: 'Lag om allmän pensionsavgift 1991:586', governingBody: 'Skatteverket Stockholm', description: 'Kommunal kvariet rate is 28.98% in Stockholm kommun.' },
      { id: 'SE-GBG', name: 'Göteborgs Stad (Gothenburg Kommun)', code: 'SE-GBG', cities: ['Gothenburg', 'Mölndal'], counties: [], propertyTax: 0.35, salesTax: 25, flatTax: 0, medianIncome: 350000, costOfLivingIndex: 96, taxStructure: 'Kommunalskatt 31.20% + Statsskatt', statuteCitation: 'Lag 1991:586; Kommunal skattesats', governingBody: 'Skatteverket Göteborg', description: 'Kommunal rate is 31.20% in Gothenburg kommun.' },
    ],
  },
  GR: {
    name: 'Greece',
    legalBody: 'ΑΑΔΕ Independent Authority for Public Revenue (AADE)',
    rules: 'Greek personal income tax (φόρος εισοδήματος) applies 5 progressive tiers ranging from 9% to 44% on taxable income. An employment income tax credit of €777 is applied to reduce assessed tax (automatically available for 2023-2026).',
    currency: 'EUR',
    symbol: '€',
    regionLabel: 'Region',
    taxYear: '2025',
    source: { name: 'AADE Tax Guide 2023-2026', url: 'https://www.aade.gr/en' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[10000, .09], [20000, .22], [30000, .28], [40000, .36], [Infinity, .44]], joint: [], head: [] }, credit: () => 777, creditLabel: 'Employment income credit' },
    ],
    regions: [
      { id: 'GR-ATT', name: 'Attica (Athens)', code: 'GR-ATT', cities: ['Athens', 'Piraeus', 'Patras'], counties: [], propertyTax: 0.35, salesTax: 24, flatTax: 0, medianIncome: 28000, costOfLivingIndex: 71, taxStructure: 'Progressive with job credit', statuteCitation: 'Ν. 4172/2013 ΦΕΚ 167 FEK', governingBody: 'ΑΑΔΕ Διαίρεση Φορολογίας Αθήνας', description: 'Main financial center of Greece.' },
    ],
  },
  HK: {
    name: 'Hong Kong SAR',
    legalBody: 'Inland Revenue Department (IRD Hong Kong)',
    rules: 'Salaries tax is territorial: only Hong Kong-source employment income. Taxpayers pay the lower of progressive rates (2%–17%) or the standard rate (15%/16% above a high-income threshold). No VAT/GST; no capital-gains tax on ordinary investments.',
    currency: 'HKD',
    symbol: 'HK$',
    regionLabel: 'Area',
    taxYear: '2025/26',
    source: { name: 'IRD Hong Kong salaries tax rates', url: 'https://www.ird.gov.hk/eng/tax/ind_stp.htm' },
    years: [
      { id: '2024/25', label: '2024/25', deduction: { single: 132000, joint: 264000, head: 132000 }, federal: { single: [[50000, .02], [50000, .06], [50000, .1], [50000, .14], [Infinity, .17]], joint: [], head: [] } },
      { id: '2025/26', label: '2025/26', deduction: { single: 132000, joint: 264000, head: 132000 }, federal: { single: [[50000, .02], [50000, .06], [50000, .1], [50000, .14], [Infinity, .17]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'HK-HK', name: 'Hong Kong Island / Kowloon / New Territories', code: 'HK-HK', cities: ['Central', 'Tsim Sha Tsui', 'Sha Tin'], counties: [], propertyTax: 0.15, salesTax: 0, flatTax: 0, medianIncome: 360000, costOfLivingIndex: 134, taxStructure: 'Territorial salaries tax', statuteCitation: 'Inland Revenue Ordinance Cap. 112', governingBody: 'IRD Hong Kong', description: 'One salaries-tax system for the whole SAR under the Inland Revenue Ordinance.', taxRegime: 'territorial', divergenceNote: 'Hong Kong salaries tax uses IRD progressive or standard-rate assessment on Hong Kong-source employment income.' },
    ],
  },
  TW: {
    name: 'Taiwan',
    legalBody: 'Ministry of Finance, National Taxation Bureau',
    rules: 'Individual income tax uses progressive brackets of 5%–40% on consolidated income after exemptions and deductions. A national health insurance surcharge may apply separately.',
    currency: 'TWD',
    symbol: 'NT$',
    regionLabel: 'City / county',
    taxYear: '2025',
    source: { name: 'National Taxation Bureau individual income tax', url: 'https://www.ntb.gov.tw/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 97000, joint: 194000, head: 97000 }, federal: { single: [[560000, .05], [1260000, .12], [2520000, .2], [4720000, .3], [Infinity, .4]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'TW-TPE', name: 'Taipei City', code: 'TW-TPE', cities: ['Taipei', 'Xinyi', 'Neihu'], counties: [], propertyTax: 1.2, salesTax: 5, flatTax: 0, medianIncome: 900000, costOfLivingIndex: 85, taxStructure: 'Progressive individual income tax', statuteCitation: 'Income Tax Act', governingBody: 'National Taxation Bureau of Taipei', description: 'National individual income tax applies. Local house tax is municipal.', taxRegime: 'national' },
    ],
  },
  PR: {
    name: 'Puerto Rico',
    legalBody: 'Departamento de Hacienda de Puerto Rico',
    rules: 'Puerto Rico is a US territory with its own income-tax code. Bona fide residents generally pay Puerto Rico income tax on PR-source wages and are excluded from US federal income tax on that PR-source income (IRC §933). US federal tax can still apply to US-source or non-PR income. Do not treat PR as a US state using IRS brackets alone.',
    currency: 'USD',
    symbol: '$',
    regionLabel: 'Municipality',
    taxYear: '2025',
    source: { name: 'Hacienda Puerto Rico individual income tax', url: 'https://hacienda.pr.gov/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 3500, joint: 7000, head: 3500 }, federal: { single: [[9000, 0], [25000, .07], [41500, .14], [61500, .25], [Infinity, .33]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'PR-SJ', name: 'San Juan', code: 'PR-SJ', cities: ['San Juan', 'Bayamón', 'Carolina'], counties: [], propertyTax: 0.8, salesTax: 11.5, flatTax: 0, medianIncome: 25000, costOfLivingIndex: 92, taxStructure: 'Territory income tax (not IRS state)', statuteCitation: 'Código de Rentas Internas de Puerto Rico; IRC §933', governingBody: 'Departamento de Hacienda', description: 'IVU combined 11.5%. Hacienda return is not a US state return.', taxRegime: 'territorial', divergenceNote: 'Puerto Rico does not use IRS state schedules. Bona fide residents file Hacienda returns; US federal tax on PR-source wage income is generally excluded under IRC §933, not computed as a 50th state.' },
    ],
  },
  PT: {
    name: 'Portugal',
    legalBody: 'Autoridade Tributária e Aduaneira (AT)',
    rules: 'IRS is national and progressive. Autonomous regions of Azores and Madeira apply reduced IRS rates (about 80% of mainland rates for Azores). Do not apply mainland IRS unchanged to Azores/Madeira.',
    currency: 'EUR',
    symbol: '€',
    regionLabel: 'Region',
    taxYear: '2025',
    source: { name: 'AT Portugal IRS tables', url: 'https://www.portaldasfinancas.gov.pt/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 4104, joint: 4104, head: 4104 }, federal: { single: [[7703, .13], [11623, .165], [15725, .22], [20036, .253], [25075, .32], [36757, .355], [44987, .3872], [Infinity, .48]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'PT-LIS', name: 'Lisbon (mainland)', code: 'PT-LIS', cities: ['Lisbon', 'Cascais', 'Sintra'], counties: [], propertyTax: 0.3, salesTax: 23, flatTax: 0, medianIncome: 18000, costOfLivingIndex: 78, taxStructure: 'Mainland IRS', statuteCitation: 'CIRS', governingBody: 'AT Lisboa', description: 'Mainland IRS brackets and 23% VAT.', taxRegime: 'national' },
      { id: 'PT-AZO', name: 'Azores', code: 'PT-AZO', cities: ['Ponta Delgada', 'Angra do Heroísmo'], counties: [], propertyTax: 0.3, salesTax: 16, flatTax: 0, medianIncome: 14000, costOfLivingIndex: 72, taxStructure: 'Autonomous reduced IRS', statuteCitation: 'Estatuto Político-Administrativo dos Açores; CIRS regional reduction', governingBody: 'Finanças dos Açores / AT', description: 'Azores applies reduced IRS (generally 80% of mainland rates) and lower VAT. Mainland tables are not used unchanged.', taxRegime: 'devolved', divergenceNote: 'Azores does not use mainland Portugal IRS rates or 23% VAT. Regional reductions apply.' },
    ],
  },
  BE: {
    name: 'Belgium',
    legalBody: 'FPS Finance (SPF Finances / FOD Financiën)',
    rules: 'Federal personal income tax is national, but Flanders, Wallonia, and Brussels each set regional surcharges and some deductions. Communal tax is a percentage of the federal tax. Do not treat Belgium as one uniform local rate.',
    currency: 'EUR',
    symbol: '€',
    regionLabel: 'Region',
    taxYear: '2025',
    source: { name: 'FPS Finance personal income tax', url: 'https://finances.belgium.be/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 10310, joint: 10310, head: 10310 }, federal: { single: [[15200, .25], [26830, .4], [46440, .45], [Infinity, .5]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'BE-VLG', name: 'Flemish Region', code: 'BE-VLG', cities: ['Antwerp', 'Ghent', 'Bruges'], counties: [], propertyTax: 0, salesTax: 21, flatTax: 0, medianIncome: 42000, costOfLivingIndex: 102, taxStructure: 'Federal PIT + Flemish regional surcharge', statuteCitation: 'WIB 92; Flemish Tax Code', governingBody: 'Flanders Department of Finance / FPS Finance', description: 'Federal brackets plus Flemish regional additional tax. Communal tax varies by municipality.', taxRegime: 'devolved', divergenceNote: 'Flanders sets its own regional additional personal income tax and some deductions. Walloon and Brussels surcharges are different.' },
      { id: 'BE-WAL', name: 'Walloon Region', code: 'BE-WAL', cities: ['Liège', 'Namur', 'Charleroi'], counties: [], propertyTax: 0, salesTax: 21, flatTax: 0, medianIncome: 35000, costOfLivingIndex: 95, taxStructure: 'Federal PIT + Walloon surcharge', statuteCitation: 'WIB 92; Walloon regional tax', governingBody: 'SPW Fiscalité / FPS Finance', description: 'Walloon regional additional tax differs from Flanders.', taxRegime: 'devolved', divergenceNote: 'Wallonia does not use the Flemish regional surcharge schedule.' },
      { id: 'BE-BRU', name: 'Brussels-Capital Region', code: 'BE-BRU', cities: ['Brussels', 'Schaerbeek', 'Anderlecht'], counties: [], propertyTax: 0, salesTax: 21, flatTax: 0, medianIncome: 38000, costOfLivingIndex: 108, taxStructure: 'Federal PIT + Brussels surcharge', statuteCitation: 'WIB 92; Brussels regional tax', governingBody: 'Brussels Fiscality / FPS Finance', description: 'Separate Brussels regional additional tax and municipal extras.', taxRegime: 'devolved', divergenceNote: 'Brussels is not taxed as Flanders or Wallonia for the regional surcharge layer.' },
    ],
  },
  AT: {
    name: 'Austria',
    legalBody: 'Bundesministerium für Finanzen',
    rules: 'Einkommensteuer is federal. Vienna and other Länder do not set separate wage-tax brackets. Municipal payroll tax (Kommunalsteuer) is an employer levy, not an employee wage tax.',
    currency: 'EUR',
    symbol: '€',
    regionLabel: 'State',
    taxYear: '2025',
    source: { name: 'BMF Einkommensteuertarif', url: 'https://www.bmf.gv.at/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[13308, 0], [21617, .2], [35836, .3], [69166, .4], [103072, .48], [1000000, .5], [Infinity, .55]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'AT-W', name: 'Vienna', code: 'AT-W', cities: ['Vienna'], counties: [], propertyTax: 0.2, salesTax: 20, flatTax: 0, medianIncome: 38000, costOfLivingIndex: 98, taxStructure: 'Federal ESt; no Land wage brackets', statuteCitation: 'EStG 1988', governingBody: 'Finanzamt Österreich', description: 'Federal tariff applies. Kommunalsteuer is employer-side.', taxRegime: 'national' },
    ],
  },
  DK: {
    name: 'Denmark',
    legalBody: 'Skattestyrelsen',
    rules: 'Bottom tax is national; municipal tax (kommuneskat) varies by kommune and is a large share of the total. Church tax is optional. Do not apply a single national percentage as the full Danish rate.',
    currency: 'DKK',
    symbol: 'kr',
    regionLabel: 'Region',
    taxYear: '2025',
    source: { name: 'Skattestyrelsen tax rates', url: 'https://skat.dk/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 49800, joint: 49800, head: 49800 }, federal: { single: [[588900, .12], [Infinity, .15]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'DK-84', name: 'Capital Region (Copenhagen)', code: 'DK-84', cities: ['Copenhagen', 'Frederiksberg'], counties: [], propertyTax: 0, salesTax: 25, flatTax: 0.238, medianIncome: 380000, costOfLivingIndex: 118, taxStructure: 'National bottom/top tax + municipal tax', statuteCitation: 'Personskatteloven', governingBody: 'Skattestyrelsen', description: 'Copenhagen municipal tax is separate from national bottom tax. AM-bidrag 8% is a labour-market contribution on gross pay.', taxRegime: 'local-surtax', divergenceNote: 'Danish municipal tax is not the national bottom-tax rate. Each kommune sets kommuneskat; AM-bidrag is withheld on gross wages before income tax.' },
    ],
  },
  NO: {
    name: 'Norway',
    legalBody: 'Skatteetaten',
    rules: 'Ordinary income is taxed at a flat national/municipal combined rate; bracket tax (trinnskatt) is additional and national. The northern action zone (Finnmark/selected Troms) has lower rates. Do not apply Oslo rates to the action zone.',
    currency: 'NOK',
    symbol: 'kr',
    regionLabel: 'County',
    taxYear: '2025',
    source: { name: 'Skatteetaten tax rates', url: 'https://www.skatteetaten.no/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 79600, joint: 79600, head: 79600 }, federal: { single: [[208050, .017], [292850, .04], [670000, .137], [937900, .167], [Infinity, .177]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'NO-03', name: 'Oslo', code: 'NO-03', cities: ['Oslo'], counties: [], propertyTax: 0.3, salesTax: 25, flatTax: 0.22, medianIncome: 620000, costOfLivingIndex: 118, taxStructure: 'Ordinary income + national bracket tax', statuteCitation: 'Skatteloven', governingBody: 'Skatteetaten', description: 'Ordinary income ~22% plus trinnskatt. Not the action-zone schedule.', taxRegime: 'national' },
    ],
  },
  FI: {
    name: 'Finland',
    legalBody: 'Finnish Tax Administration (Vero)',
    rules: 'State income tax is progressive; municipal tax is a flat rate set by each municipality (about 4%–11%). Church tax is optional. Do not treat municipal tax as the state tariff.',
    currency: 'EUR',
    symbol: '€',
    regionLabel: 'Region',
    taxYear: '2025',
    source: { name: 'Vero.fi income tax card', url: 'https://www.vero.fi/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[20500, .1264], [30500, .19], [50400, .3025], [88200, .3425], [150000, .4425], [Infinity, .4425]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'FI-18', name: 'Uusimaa (Helsinki)', code: 'FI-18', cities: ['Helsinki', 'Espoo', 'Vantaa'], counties: [], propertyTax: 0.4, salesTax: 25.5, flatTax: 0.053, medianIncome: 40000, costOfLivingIndex: 104, taxStructure: 'State progressive + municipal flat', statuteCitation: 'Tuloverolaki', governingBody: 'Vero', description: 'Helsinki municipal tax is a separate flat rate on top of state tax.', taxRegime: 'local-surtax', divergenceNote: 'Finnish municipal tax is set by the municipality and is not the national progressive state tax.' },
    ],
  },
  CL: {
    name: 'Chile',
    legalBody: 'Servicio de Impuestos Internos (SII)',
    rules: 'Impuesto Único de Segunda Categoría applies to employment income with UTM-based brackets. Regional governments do not set separate wage brackets. IVA is 19% nationally.',
    currency: 'CLP',
    symbol: '$',
    regionLabel: 'Region',
    taxYear: '2025',
    source: { name: 'SII Impuesto Único', url: 'https://www.sii.cl/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[13500000, 0], [30000000, .04], [50000000, .08], [70000000, .135], [90000000, .23], [120000000, .304], [Infinity, .4]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'CL-RM', name: 'Santiago Metropolitan Region', code: 'CL-RM', cities: ['Santiago', 'Providencia', 'Las Condes'], counties: [], propertyTax: 1.0, salesTax: 19, flatTax: 0, medianIncome: 12000000, costOfLivingIndex: 64, taxStructure: 'National employment tax (UTM brackets)', statuteCitation: 'LIR', governingBody: 'SII', description: 'National Impuesto Único. No regional wage-tax overlay.', taxRegime: 'national' },
      { id: 'CL-VS', name: 'Valparaíso Region', code: 'CL-VS', cities: ['Valparaíso', 'Viña del Mar'], counties: [], propertyTax: 0.9, salesTax: 19, flatTax: 0, medianIncome: 9500000, costOfLivingIndex: 58, taxStructure: 'National employment tax', statuteCitation: 'LIR', governingBody: 'SII Valparaíso', description: 'Coastal region; national tariff applies.', taxRegime: 'national' },
    ],
  },
  CZ: {
    name: 'Czech Republic',
    legalBody: 'Financial Administration (Finanční správa)',
    rules: 'Personal income tax uses a flat 15% rate on an inflated "superbase" (gross salary × 1.2) plus a 23% progressive band above roughly 1.58 million CZK, plus social/health insurance.',
    currency: 'CZK', symbol: 'Kč', regionLabel: 'Region', taxYear: '2025',
    source: { name: 'Czech Financial Administration income tax', url: 'https://www.financnisprava.cz/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 30840, joint: 61680, head: 30840 }, federal: { single: [[1968552, .15], [Infinity, .23]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'CZ-PR', name: 'Prague', code: 'CZ-PR', cities: ['Prague 1', 'Prague 5', 'Prague 8'], counties: [{ id: 'CZ-PR-1', name: 'Prague 1 (Centre)', seat: 'Prague', population: 25000, medianIncome: 720000, propertyTaxRate: 0.2, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'No local wage tax; property tax varies by zone.' }], propertyTax: 0.2, salesTax: 21, flatTax: 0, medianIncome: 700000, costOfLivingIndex: 66, taxStructure: 'Flat + progressive band', statuteCitation: 'Act No. 586/1992 Coll.', governingBody: 'Financial Directorate of Prague', description: 'National flat/banded tariff applies across the country.', taxRegime: 'national' },
      { id: 'CZ-SM', name: 'South Moravian (Brno)', code: 'CZ-SM', cities: ['Brno'], counties: [], propertyTax: 0.18, salesTax: 21, flatTax: 0, medianIncome: 580000, costOfLivingIndex: 58, taxStructure: 'Flat + progressive band', statuteCitation: 'Act No. 586/1992 Coll.', governingBody: 'Financial Directorate Brno', description: 'Lower costs than the capital; national tariff applies.', taxRegime: 'national' },
    ],
  },
  RO: {
    name: 'Romania',
    legalBody: 'Agenția Națională de Administrare Fiscală (ANAF)',
    rules: 'Employment income is taxed at a flat 10% plus social contributions (25% employee health/pension on gross). Income from other sources follows different rules.',
    currency: 'RON', symbol: 'lei', regionLabel: 'County', taxYear: '2025',
    source: { name: 'ANAF Romanian Fiscal Code', url: 'https://mfinante.gov.ro/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[Infinity, .10]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'RO-B', name: 'Bucharest (Ilfov)', code: 'RO-B', cities: ['Bucharest', 'Voluntari'], counties: [{ id: 'RO-B-1', name: 'Sector 1', seat: 'Bucharest', population: 230000, medianIncome: 96000, propertyTaxRate: 0.1, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Local tax on buildings and vehicles is set by the local council.' }], propertyTax: 0.1, salesTax: 19, flatTax: 0.10, medianIncome: 92000, costOfLivingIndex: 48, taxStructure: 'Flat 10% income tax', statuteCitation: 'Fiscal Code Law 227/2015', governingBody: 'ANAF Bucharest', description: 'Flat income tax with capped social contributions.', taxRegime: 'national' },
      { id: 'RO-CJ', name: 'Cluj County', code: 'RO-CJ', cities: ['Cluj-Napoca'], counties: [], propertyTax: 0.1, salesTax: 19, flatTax: 0.10, medianIncome: 78000, costOfLivingIndex: 43, taxStructure: 'Flat 10% income tax', statuteCitation: 'Law 227/2015', governingBody: 'ANAF Cluj', description: 'IT sector hub; national flat rate applies.', taxRegime: 'national' },
    ],
  },
  HU: {
    name: 'Hungary',
    legalBody: 'Nemzeti Adó- és Vámhivatal (NAV)',
    rules: 'Employment income is taxed at a flat 15% plus a 13% social contribution tax (szochó) above a minimum wage threshold. Families receive substantial tax allowances.',
    currency: 'HUF', symbol: 'Ft', regionLabel: 'County', taxYear: '2025',
    source: { name: 'NAV Personal Income Tax', url: 'https://nav.gov.hu/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[Infinity, .15]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'HU-BU', name: 'Budapest', code: 'HU-BU', cities: ['District V', 'District XI', 'District XIII'], counties: [{ id: 'HU-BU-5', name: 'District V (Belváros)', seat: 'Budapest', population: 28000, medianIncome: 7800000, propertyTaxRate: 0.3, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Municipal local business tax (HIPA) applies to companies; personal income tax is national.' }], propertyTax: 0.3, salesTax: 27, flatTax: 0.15, medianIncome: 7500000, costOfLivingIndex: 52, taxStructure: 'Flat 15% + szochó', statuteCitation: 'Act CXVII of 1995', governingBody: 'NAV Budapest', description: 'National flat rate plus municipal business taxes.', taxRegime: 'national' },
      { id: 'HU-PE', name: 'Pest County', code: 'HU-PE', cities: ['Érd', 'Szigetszentmiklós'], counties: [], propertyTax: 0.25, salesTax: 27, flatTax: 0.15, medianIncome: 6200000, costOfLivingIndex: 46, taxStructure: 'Flat 15% + szochó', statuteCitation: 'Act CXVII of 1995', governingBody: 'NAV Pest County', description: 'Commuter belt around the capital.', taxRegime: 'national' },
    ],
  },
  CO: {
    name: 'Colombia',
    legalBody: 'Dirección de Impuestos y Aduanas Nacionales (DIAN)',
    rules: 'Employment income uses progressive tariff tables (UVT-based). A 19% IVA applies to most goods. Employees may deduct health/pension contributions and mortgage interest.',
    currency: 'COP', symbol: '$', regionLabel: 'Department', taxYear: '2025',
    source: { name: 'DIAN Estatuto Tributario', url: 'https://www.dian.gov.co/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[1090, 0], [1700, .19], [4100, .28], [8670, .33], [18970, .35], [31020, .37], [Infinity, .39]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'CO-DC', name: 'Bogotá D.C.', code: 'CO-DC', cities: ['Chapinero', 'Usaquén', 'Teusaquillo'], counties: [{ id: 'CO-DC-1', name: 'Locality of Chapinero', seat: 'Bogotá', population: 140000, medianIncome: 72000000, propertyTaxRate: 0.9, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Predial property tax and ICA industry/commerce tax are local; income tax is national.' }], propertyTax: 0.9, salesTax: 19, flatTax: 0, medianIncome: 68000000, costOfLivingIndex: 38, taxStructure: 'Progressive UVT tariff', statuteCitation: 'Estatuto Tributario art. 241', governingBody: 'DIAN Bogotá', description: 'National progressive tariff on UVT units.', taxRegime: 'national' },
      { id: 'CO-ANT', name: 'Antioquia (Medellín)', code: 'CO-ANT', cities: ['Medellín', 'Envigado'], counties: [], propertyTax: 0.8, salesTax: 19, flatTax: 0, medianIncome: 55000000, costOfLivingIndex: 34, taxStructure: 'Progressive UVT tariff', statuteCitation: 'Estatuto Tributario', governingBody: 'DIAN Antioquia', description: 'Second-largest metro; same national tariff.', taxRegime: 'national' },
    ],
  },
  PE: {
    name: 'Peru',
    legalBody: 'Superintendencia Nacional de Aduanas y de Administración Tributaria (SUNAT)',
    rules: 'Employment income uses progressive annual brackets (8%, 14%, 17%, 20%, 30%) with a 7.5 UIT deduction plus 20% of remaining income as an employment deduction.',
    currency: 'PEN', symbol: 'S/', regionLabel: 'Region', taxYear: '2025',
    source: { name: 'SUNAT Impuesto a la Renta', url: 'https://www.sunat.gob.pe/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 43500, joint: 43500, head: 43500 }, federal: { single: [[21700, .08], [43400, .14], [65100, .17], [86700, .20], [Infinity, .30]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'PE-LIM', name: 'Lima Metropolitan', code: 'PE-LIM', cities: ['Miraflores', 'San Isidro', 'Surco'], counties: [{ id: 'PE-LIM-MI', name: 'Miraflores', seat: 'Lima', population: 100000, medianIncome: 42000, propertyTaxRate: 0.2, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Municipal property tax (impuesto predial) and vehicle tax; no local wage tax.' }], propertyTax: 0.2, salesTax: 18, flatTax: 0, medianIncome: 38000, costOfLivingIndex: 35, taxStructure: 'Progressive annual tariff', statuteCitation: 'Impuesto a la Renta', governingBody: 'SUNAT Lima', description: 'National progressive tariff with UIT-based deductions.', taxRegime: 'national' },
      { id: 'PE-ARE', name: 'Arequipa', code: 'PE-ARE', cities: ['Arequipa', 'Yanahuara'], counties: [], propertyTax: 0.18, salesTax: 18, flatTax: 0, medianIncome: 28000, costOfLivingIndex: 30, taxStructure: 'Progressive annual tariff', statuteCitation: 'Impuesto a la Renta', governingBody: 'SUNAT Arequipa', description: 'Southern commercial hub.', taxRegime: 'national' },
    ],
  },
  MY: {
    name: 'Malaysia',
    legalBody: 'Lembaga Hasil Dalam Negeri (LHDN)',
    rules: 'Progressive resident rates from 0% to 30% with individual reliefs (personal, EPF, lifestyle, education). Sabah and Sarawak follow the same national tariff.',
    currency: 'MYR', symbol: 'RM', regionLabel: 'State', taxYear: '2025',
    source: { name: 'LHDN Income Tax', url: 'https://www.hasil.gov.my/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 9000, joint: 9000, head: 9000 }, federal: { single: [[5000, 0], [20000, .01], [35000, .03], [50000, .06], [70000, .11], [100000, .19], [400000, .25], [Infinity, .30]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'MY-KL', name: 'Kuala Lumpur (FT)', code: 'MY-KL', cities: ['Bukit Bintang', 'Bangsar', 'Mont Kiara'], counties: [{ id: 'MY-KL-BB', name: 'Bukit Bintang', seat: 'Kuala Lumpur', population: 40000, medianIncome: 96000, propertyTaxRate: 0.1, localSalesTaxRate: 6, localIncomeTaxRate: 0, rules: 'Assessment tax (cukai pintu) on properties and business premises; income tax is federal.' }], propertyTax: 0.1, salesTax: 6, flatTax: 0, medianIncome: 92000, costOfLivingIndex: 42, taxStructure: 'Progressive resident rates', statuteCitation: 'Income Tax Act 1967', governingBody: 'LHDN Kuala Lumpur', description: 'Federal income tax with local assessment tax.', taxRegime: 'national' },
      { id: 'MY-SG', name: 'Johor', code: 'MY-SG', cities: ['Johor Bahru', 'Iskandar Puteri'], counties: [], propertyTax: 0.09, salesTax: 6, flatTax: 0, medianIncome: 60000, costOfLivingIndex: 34, taxStructure: 'Progressive resident rates', statuteCitation: 'Income Tax Act 1967', governingBody: 'LHDN Johor', description: 'Cross-border commuters to Singapore; national tariff applies.', taxRegime: 'national' },
    ],
  },
  VN: {
    name: 'Vietnam',
    legalBody: 'Tổng Cục Thuế (General Department of Taxation)',
    rules: 'Progressive rates 5%–35% on assessable income after personal deduction of 11 million VND/month plus 4.4 million per dependent.',
    currency: 'VND', symbol: '₫', regionLabel: 'City / province', taxYear: '2025',
    source: { name: 'GDT Personal Income Tax', url: 'https://gdt.gov.vn/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 132000000, joint: 132000000, head: 132000000 }, federal: { single: [[60000000, .05], [144000000, .10], [324000000, .15], [588000000, .20], [960000000, .25], [1680000000, .30], [Infinity, .35]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'VN-HN', name: 'Hanoi', code: 'VN-HN', cities: ['Hoan Kiem', 'Cau Giay', 'Tay Ho'], counties: [{ id: 'VN-HN-HK', name: 'Hoan Kiem District', seat: 'Hanoi', population: 160000, medianIncome: 190000000, propertyTaxRate: 0.1, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'No local wage tax; land-use fees vary by zone.' }], propertyTax: 0.1, salesTax: 10, flatTax: 0, medianIncome: 180000000, costOfLivingIndex: 36, taxStructure: 'Progressive PIT', statuteCitation: 'Law on Personal Income Tax 2007', governingBody: 'Hanoi Tax Department', description: 'National PIT with monthly equivalent deductions.', taxRegime: 'national' },
      { id: 'VN-SG', name: 'Ho Chi Minh City', code: 'VN-SG', cities: ['District 1', 'District 7', 'Thu Duc'], counties: [], propertyTax: 0.1, salesTax: 10, flatTax: 0, medianIncome: 210000000, costOfLivingIndex: 38, taxStructure: 'Progressive PIT', statuteCitation: 'Law on Personal Income Tax 2007', governingBody: 'HCMC Tax Department', description: 'Commercial capital; national PIT applies.', taxRegime: 'national' },
    ],
  },
  EG: {
    name: 'Egypt',
    legalBody: 'Egyptian Tax Authority (ETA)',
    rules: 'Progressive annual brackets from 0% to 27.5% on net taxable income after personal exemption of EGP 20,000.',
    currency: 'EGP', symbol: 'E£', regionLabel: 'Governorate', taxYear: '2025',
    source: { name: 'Egyptian Tax Authority', url: 'https://www.eta.gov.eg/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 20000, joint: 20000, head: 20000 }, federal: { single: [[40000, 0], [55000, .10], [70000, .15], [200000, .20], [400000, .225], [1200000, .25], [Infinity, .275]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'EG-C', name: 'Cairo', code: 'EG-C', cities: ['Nasr City', 'Maadi', 'New Cairo'], counties: [{ id: 'EG-C-NC', name: 'New Cairo', seat: 'Cairo', population: 200000, medianIncome: 300000, propertyTaxRate: 0.1, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Real estate tax on residential property applies at the national level.' }], propertyTax: 0.1, salesTax: 14, flatTax: 0, medianIncome: 280000, costOfLivingIndex: 28, taxStructure: 'Progressive annual brackets', statuteCitation: 'Income Tax Law 91/2005', governingBody: 'ETA Cairo', description: 'National brackets with personal exemption.', taxRegime: 'national' },
      { id: 'EG-ALX', name: 'Alexandria', code: 'EG-ALX', cities: ['Alexandria', 'Borg El Arab'], counties: [], propertyTax: 0.1, salesTax: 14, flatTax: 0, medianIncome: 220000, costOfLivingIndex: 25, taxStructure: 'Progressive annual brackets', statuteCitation: 'Law 91/2005', governingBody: 'ETA Alexandria', description: 'Mediterranean port city; national brackets.', taxRegime: 'national' },
    ],
  },
  SA: {
    name: 'Saudi Arabia',
    legalBody: 'Zakat, Tax and Customs Authority (ZATCA)',
    rules: 'There is no personal income tax on employment wages for Saudi nationals or residents. VAT is 15%. Social insurance applies to Saudi nationals and GOSI-registered workers.',
    currency: 'SAR', symbol: '﷼', regionLabel: 'Region', taxYear: '2025',
    source: { name: 'ZATCA', url: 'https://zatca.gov.sa/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[Infinity, 0]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'SA-01', name: 'Riyadh Region', code: 'SA-01', cities: ['Riyadh', 'Diriyah', 'Al Kharj'], counties: [{ id: 'SA-01-RU', name: 'Riyadh City', seat: 'Riyadh', population: 7700000, medianIncome: 220000, propertyTaxRate: 0, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'No property tax on owned residential property; VAT 15% applies to purchases.' }], propertyTax: 0, salesTax: 15, flatTax: 0, medianIncome: 220000, costOfLivingIndex: 52, taxStructure: 'No wage income tax', statuteCitation: 'No personal income tax statute', governingBody: 'ZATCA Riyadh', description: 'No wage income tax; VAT and social insurance only.', taxRegime: 'no-wage-tax', divergenceNote: 'Saudi Arabia does not levy personal income tax on wages. Only VAT and social insurance apply.' },
      { id: 'SA-02', name: 'Makkah Region (Jeddah)', code: 'SA-02', cities: ['Jeddah', 'Mecca', 'Taif'], counties: [], propertyTax: 0, salesTax: 15, flatTax: 0, medianIncome: 200000, costOfLivingIndex: 48, taxStructure: 'No wage income tax', statuteCitation: 'No personal income tax', governingBody: 'ZATCA Makkah', description: 'Same treatment as the rest of the Kingdom.', taxRegime: 'no-wage-tax' },
    ],
  },
  IL: {
    name: 'Israel',
    legalBody: 'Israel Tax Authority',
    rules: 'Progressive income tax plus national insurance (Bituach Leumi) and health tax contributions, both tiered on monthly income.',
    currency: 'ILS', symbol: '₪', regionLabel: 'District', taxYear: '2025',
    source: { name: 'Israel Tax Authority', url: 'https://www.gov.il/en/departments/tax_authority' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 91740, joint: 183480, head: 91740 }, federal: { single: [[81560, .10], [116760, .14], [187440, .20], [260520, .31], [542160, .35], [698280, .47], [Infinity, .50]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'IL-TA', name: 'Tel Aviv District', code: 'IL-TA', cities: ['Tel Aviv', 'Ramat Gan', 'Herzliya'], counties: [{ id: 'IL-TA-TA', name: 'Tel Aviv-Yafo', seat: 'Tel Aviv', population: 470000, medianIncome: 190000, propertyTaxRate: 0.6, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Arnona municipal property tax varies by property size and zone; income tax is national.' }], propertyTax: 0.6, salesTax: 18, flatTax: 0, medianIncome: 185000, costOfLivingIndex: 108, taxStructure: 'Progressive + national insurance', statuteCitation: 'Income Tax Ordinance', governingBody: 'Israel Tax Authority', description: 'National income tax plus Arnona municipal tax.', taxRegime: 'national' },
      { id: 'IL-JM', name: 'Jerusalem District', code: 'IL-JM', cities: ['Jerusalem', 'Beit Shemesh'], counties: [], propertyTax: 0.55, salesTax: 18, flatTax: 0, medianIncome: 130000, costOfLivingIndex: 92, taxStructure: 'Progressive + national insurance', statuteCitation: 'Income Tax Ordinance', governingBody: 'Israel Tax Authority', description: 'Same national rules; lower Arnona on average.', taxRegime: 'national' },
    ],
  },
  TR: {
    name: 'Türkiye',
    legalBody: 'Gelir İdaresi Başkanlığı (GİB)',
    rules: 'Employment income uses progressive brackets revalued annually, with a cumulative tax credit for lower earners. Minimum living allowance further reduces tax.',
    currency: 'TRY', symbol: '₺', regionLabel: 'Province', taxYear: '2025',
    source: { name: 'GİB Income Tax', url: 'https://www.gib.gov.tr/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 158000, joint: 158000, head: 158000 }, federal: { single: [[158000, .15], [330000, .20], [1200000, .27], [4300000, .35], [Infinity, .40]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'TR-34', name: 'Istanbul', code: 'TR-34', cities: ['Şişli', 'Beşiktaş', 'Kadıköy'], counties: [{ id: 'TR-34-SI', name: 'Şişli', seat: 'Istanbul', population: 320000, medianIncome: 480000, propertyTaxRate: 0.2, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Emlak Vergisi property tax varies by municipality; income tax is national.' }], propertyTax: 0.2, salesTax: 20, flatTax: 0, medianIncome: 450000, costOfLivingIndex: 42, taxStructure: 'Progressive employment tariff', statuteCitation: 'Income Tax Law 193', governingBody: 'GİB Istanbul', description: 'National brackets with municipal property tax.', taxRegime: 'national' },
      { id: 'TR-06', name: 'Ankara', code: 'TR-06', cities: ['Çankaya', 'Keçiören'], counties: [], propertyTax: 0.18, salesTax: 20, flatTax: 0, medianIncome: 380000, costOfLivingIndex: 35, taxStructure: 'Progressive employment tariff', statuteCitation: 'Law 193', governingBody: 'GİB Ankara', description: 'Capital region; national tariff.', taxRegime: 'national' },
    ],
  },
  UA: {
    name: 'Ukraine',
    legalBody: 'State Tax Service of Ukraine',
    rules: 'Most employment income is taxed at a flat 18% plus a 1.5% military levy. Social contribution tax is withheld up to a maximum wage base.',
    currency: 'UAH', symbol: '₴', regionLabel: 'Oblast', taxYear: '2025',
    source: { name: 'State Tax Service of Ukraine', url: 'https://tax.gov.ua/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[Infinity, .18]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'UA-30', name: 'Kyiv City', code: 'UA-30', cities: ['Shevchenkivskyi', 'Pecherskyi', 'Podilskyi'], counties: [{ id: 'UA-30-SH', name: 'Shevchenkivskyi District', seat: 'Kyiv', population: 230000, medianIncome: 360000, propertyTaxRate: 0.03, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Local property tax and tourist tax exist; income tax is national.' }], propertyTax: 0.03, salesTax: 20, flatTax: 0.18, medianIncome: 340000, costOfLivingIndex: 32, taxStructure: 'Flat 18% + military levy', statuteCitation: 'Tax Code of Ukraine', governingBody: 'State Tax Service Kyiv', description: 'Flat tax plus 1.5% military levy and social contributions.', taxRegime: 'national' },
      { id: 'UA-46', name: 'Lviv Oblast', code: 'UA-46', cities: ['Lviv', 'Drohobych'], counties: [], propertyTax: 0.03, salesTax: 20, flatTax: 0.18, medianIncome: 260000, costOfLivingIndex: 27, taxStructure: 'Flat 18% + military levy', statuteCitation: 'Tax Code of Ukraine', governingBody: 'State Tax Service Lviv', description: 'Western region; same national rules.', taxRegime: 'national' },
    ],
  },
  SK: {
    name: 'Slovakia', legalBody: 'Finančná správa SR', rules: '19% on the tax base up to 176.8 × subsistence minimum, 25% above. Employee social insurance is separate.',
    currency: 'EUR', symbol: '€', regionLabel: 'Region', taxYear: '2025',
    source: { name: 'Finančná správa SR', url: 'https://www.financnasprava.sk/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 5648, joint: 5648, head: 5648 }, federal: { single: [[41445, .19], [Infinity, .25]], joint: [], head: [] } }],
    regions: [
      { id: 'SK-BL', name: 'Bratislava Region', code: 'SK-BL', cities: ['Bratislava'], counties: [{ id: 'SK-BL-1', name: 'Bratislava I', seat: 'Bratislava', population: 40000, medianIncome: 22000, propertyTaxRate: 0.25, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Local real-estate tax is municipal; income tax is national.' }], propertyTax: 0.25, salesTax: 23, flatTax: 0, medianIncome: 21000, costOfLivingIndex: 58, taxStructure: 'Two-band national PIT', statuteCitation: 'Income Tax Act 595/2003', governingBody: 'Finančná správa Bratislava', description: 'National 19%/25% bands.', taxRegime: 'national' },
      { id: 'SK-TA', name: 'Trnava Region', code: 'SK-TA', cities: ['Trnava'], counties: [], propertyTax: 0.2, salesTax: 23, flatTax: 0, medianIncome: 17000, costOfLivingIndex: 50, taxStructure: 'Two-band national PIT', statuteCitation: 'Act 595/2003', governingBody: 'Finančná správa Trnava', description: 'Same national bands.', taxRegime: 'national' },
    ],
  },
  BG: {
    name: 'Bulgaria', legalBody: 'National Revenue Agency (NRA)', rules: 'Flat 10% personal income tax plus social and health insurance on employment income.',
    currency: 'BGN', symbol: 'лв', regionLabel: 'Province', taxYear: '2025',
    source: { name: 'NRA Bulgaria', url: 'https://nra.bg/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[Infinity, .10]], joint: [], head: [] } }],
    regions: [
      { id: 'BG-22', name: 'Sofia-City', code: 'BG-22', cities: ['Sofia'], counties: [{ id: 'BG-22-S', name: 'Sofia municipality', seat: 'Sofia', population: 1300000, medianIncome: 28000, propertyTaxRate: 0.15, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Municipal property tax; income tax is national 10%.' }], propertyTax: 0.15, salesTax: 20, flatTax: 0.10, medianIncome: 27000, costOfLivingIndex: 42, taxStructure: 'Flat 10%', statuteCitation: 'Personal Income Tax Act', governingBody: 'NRA Sofia', description: 'National flat rate.', taxRegime: 'national' },
      { id: 'BG-15', name: 'Plovdiv', code: 'BG-15', cities: ['Plovdiv'], counties: [], propertyTax: 0.12, salesTax: 20, flatTax: 0.10, medianIncome: 20000, costOfLivingIndex: 36, taxStructure: 'Flat 10%', statuteCitation: 'PITA', governingBody: 'NRA Plovdiv', description: 'Second city; same national rate.', taxRegime: 'national' },
    ],
  },
  HR: {
    name: 'Croatia', legalBody: 'Porezna uprava', rules: 'National brackets plus a municipal surtax (prirez) set by each city. Zagreb prirez is among the highest.',
    currency: 'EUR', symbol: '€', regionLabel: 'County', taxYear: '2025',
    source: { name: 'Porezna uprava', url: 'https://www.porezna-uprava.hr/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 560, joint: 560, head: 560 }, federal: { single: [[50400, .20], [Infinity, .30]], joint: [], head: [] } }],
    regions: [
      { id: 'HR-01', name: 'City of Zagreb', code: 'HR-01', cities: ['Zagreb'], counties: [{ id: 'HR-01-ZG', name: 'Zagreb', seat: 'Zagreb', population: 770000, medianIncome: 18000, propertyTaxRate: 0, localSalesTaxRate: 0, localIncomeTaxRate: 18, rules: 'Zagreb prirez (surtax) is 18% of national income tax. Optional in this calculator.' }], propertyTax: 0, salesTax: 25, flatTax: 0, medianIncome: 17500, costOfLivingIndex: 55, taxStructure: 'National brackets + municipal prirez', statuteCitation: 'Income Tax Act', governingBody: 'Porezna uprava Zagreb', description: 'National 20%/30% plus optional Zagreb surtax.', taxRegime: 'local-surtax', divergenceNote: 'Croatian cities set prirez on national income tax. Zagreb’s rate is not the national tariff.' },
      { id: 'HR-17', name: 'Split-Dalmatia', code: 'HR-17', cities: ['Split'], counties: [], propertyTax: 0, salesTax: 25, flatTax: 0, medianIncome: 14000, costOfLivingIndex: 50, taxStructure: 'National brackets + lower prirez', statuteCitation: 'Income Tax Act', governingBody: 'Porezna uprava Split', description: 'Coastal county; prirez is lower than Zagreb.', taxRegime: 'local-surtax' },
    ],
  },
  EE: {
    name: 'Estonia', legalBody: 'Maksu- ja Tolliamet', rules: 'Flat personal income tax (22% from 2025) with a basic exemption that tapers with income. No municipal wage tax.',
    currency: 'EUR', symbol: '€', regionLabel: 'County', taxYear: '2025',
    source: { name: 'Estonian Tax and Customs Board', url: 'https://www.emta.ee/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 654, joint: 654, head: 654 }, federal: { single: [[Infinity, .22]], joint: [], head: [] } }],
    regions: [
      { id: 'EE-37', name: 'Harju (Tallinn)', code: 'EE-37', cities: ['Tallinn', 'Maardu'], counties: [{ id: 'EE-37-TL', name: 'Tallinn', seat: 'Tallinn', population: 450000, medianIncome: 22000, propertyTaxRate: 0.5, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Land tax is municipal; income tax is national.' }], propertyTax: 0.5, salesTax: 24, flatTax: 0.22, medianIncome: 21000, costOfLivingIndex: 62, taxStructure: 'National flat PIT', statuteCitation: 'Income Tax Act', governingBody: 'MTA', description: 'National 22% with tapered basic exemption.', taxRegime: 'national' },
      { id: 'EE-51', name: 'Tartu County', code: 'EE-51', cities: ['Tartu'], counties: [], propertyTax: 0.4, salesTax: 24, flatTax: 0.22, medianIncome: 18000, costOfLivingIndex: 54, taxStructure: 'National flat PIT', statuteCitation: 'Income Tax Act', governingBody: 'MTA Tartu', description: 'University city; same national rate.', taxRegime: 'national' },
    ],
  },
  LT: {
    name: 'Lithuania', legalBody: 'Valstybinė mokesčių inspekcija (VMI)', rules: 'Employment income 20% up to the ceiling, 32% above. Sodra social contributions are separate.',
    currency: 'EUR', symbol: '€', regionLabel: 'County', taxYear: '2025',
    source: { name: 'VMI Lithuania', url: 'https://www.vmi.lt/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 747, joint: 747, head: 747 }, federal: { single: [[126532, .20], [Infinity, .32]], joint: [], head: [] } }],
    regions: [
      { id: 'LT-VL', name: 'Vilnius County', code: 'LT-VL', cities: ['Vilnius'], counties: [{ id: 'LT-VL-VI', name: 'Vilnius city', seat: 'Vilnius', population: 580000, medianIncome: 22000, propertyTaxRate: 0.5, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Real estate tax is municipal; PIT is national.' }], propertyTax: 0.5, salesTax: 21, flatTax: 0, medianIncome: 21000, costOfLivingIndex: 52, taxStructure: '20%/32% employment PIT', statuteCitation: 'Law on Personal Income Tax', governingBody: 'VMI Vilnius', description: 'National two-rate PIT.', taxRegime: 'national' },
      { id: 'LT-KU', name: 'Kaunas County', code: 'LT-KU', cities: ['Kaunas'], counties: [], propertyTax: 0.4, salesTax: 21, flatTax: 0, medianIncome: 17000, costOfLivingIndex: 46, taxStructure: '20%/32% employment PIT', statuteCitation: 'Law on PIT', governingBody: 'VMI Kaunas', description: 'Same national rates.', taxRegime: 'national' },
    ],
  },
  LV: {
    name: 'Latvia', legalBody: 'Valsts ieņēmumu dienests (VID)', rules: 'Progressive 20%/23%/31% bands on annual income. Solidarity tax may apply on very high earnings.',
    currency: 'EUR', symbol: '€', regionLabel: 'Municipality', taxYear: '2025',
    source: { name: 'VID Latvia', url: 'https://www.vid.gov.lv/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 510, joint: 510, head: 510 }, federal: { single: [[20004, .20], [78100, .23], [Infinity, .31]], joint: [], head: [] } }],
    regions: [
      { id: 'LV-RIX', name: 'Riga', code: 'LV-RIX', cities: ['Riga'], counties: [{ id: 'LV-RIX-C', name: 'Riga city', seat: 'Riga', population: 605000, medianIncome: 18000, propertyTaxRate: 0.2, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Real estate tax is municipal; PIT is national.' }], propertyTax: 0.2, salesTax: 21, flatTax: 0, medianIncome: 17500, costOfLivingIndex: 54, taxStructure: 'Three-band PIT', statuteCitation: 'Law on Personal Income Tax', governingBody: 'VID', description: 'National 20/23/31 bands.', taxRegime: 'national' },
    ],
  },
  LU: {
    name: 'Luxembourg', legalBody: 'Administration des contributions directes (ACD)', rules: 'Highly progressive classes (1, 1a, 2) with many brackets. Municipal business tax is not a wage tax.',
    currency: 'EUR', symbol: '€', regionLabel: 'Canton', taxYear: '2025',
    source: { name: 'ACD Luxembourg', url: 'https://impotsdirects.public.lu/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[11265, 0], [13137, .08], [15009, .09], [16881, .1], [18753, .11], [20625, .12], [22569, .14], [24513, .16], [26457, .18], [28329, .2], [30201, .22], [32073, .24], [33945, .26], [35817, .28], [37689, .3], [39561, .32], [41433, .34], [43305, .36], [45177, .38], [200004, .39], [Infinity, .42]], joint: [], head: [] } }],
    regions: [
      { id: 'LU-LU', name: 'Luxembourg Canton', code: 'LU-LU', cities: ['Luxembourg City', 'Hesperange'], counties: [{ id: 'LU-LU-C', name: 'Luxembourg City', seat: 'Luxembourg', population: 130000, medianIncome: 65000, propertyTaxRate: 0.1, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'No municipal wage tax; fonds pour l’emploi applies nationally.' }], propertyTax: 0.1, salesTax: 17, flatTax: 0, medianIncome: 62000, costOfLivingIndex: 112, taxStructure: 'Progressive class system', statuteCitation: 'LIR', governingBody: 'ACD', description: 'National progressive classes.', taxRegime: 'national' },
    ],
  },
  IS: {
    name: 'Iceland', legalBody: 'Skatturinn', rules: 'National income tax plus municipal tax (útsvar) set by each municipality. Combined rates are high.',
    currency: 'ISK', symbol: 'kr', regionLabel: 'Municipality', taxYear: '2025',
    source: { name: 'Skatturinn', url: 'https://www.skatturinn.is/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 64997, joint: 64997, head: 64997 }, federal: { single: [[4461369, .3145], [12511044, .3795], [Infinity, .4625]], joint: [], head: [] } }],
    regions: [
      { id: 'IS-REY', name: 'Reykjavík', code: 'IS-REY', cities: ['Reykjavík'], counties: [{ id: 'IS-REY-C', name: 'Reykjavíkurborg', seat: 'Reykjavík', population: 140000, medianIncome: 9000000, propertyTaxRate: 0.3, localSalesTaxRate: 0, localIncomeTaxRate: 14.48, rules: 'Municipal útsvar is a large share of total tax. Optional in this calculator.' }], propertyTax: 0.3, salesTax: 24, flatTax: 0, medianIncome: 8800000, costOfLivingIndex: 118, taxStructure: 'National brackets + municipal útsvar', statuteCitation: 'Income Tax Act', governingBody: 'Skatturinn', description: 'National bands plus Reykjavík municipal tax if enabled.', taxRegime: 'local-surtax', divergenceNote: 'Icelandic municipal tax (útsvar) is set locally and is not the national income-tax tariff.' },
    ],
  },
  QA: {
    name: 'Qatar', legalBody: 'General Tax Authority', rules: 'No personal income tax on employment wages. VAT 5%. Corporate tax applies to certain activities.',
    currency: 'QAR', symbol: 'QR', regionLabel: 'Municipality', taxYear: '2025',
    source: { name: 'Qatar General Tax Authority', url: 'https://www.gta.gov.qa/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[Infinity, 0]], joint: [], head: [] } }],
    regions: [
      { id: 'QA-DA', name: 'Doha', code: 'QA-DA', cities: ['West Bay', 'The Pearl'], counties: [{ id: 'QA-DA-C', name: 'Doha municipality', seat: 'Doha', population: 1186000, medianIncome: 250000, propertyTaxRate: 0, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'No wage income tax. VAT 5% on taxable supplies.' }], propertyTax: 0, salesTax: 5, flatTax: 0, medianIncome: 240000, costOfLivingIndex: 64, taxStructure: 'No wage income tax', statuteCitation: 'No personal income tax on wages', governingBody: 'GTA', description: 'No employment income tax.', taxRegime: 'no-wage-tax', divergenceNote: 'Qatar does not tax employment wages. Only VAT and, where relevant, corporate tax apply.' },
    ],
  },
  KW: {
    name: 'Kuwait', legalBody: 'Ministry of Finance', rules: 'No personal income tax on employment wages. VAT not yet generally applied at GCC 5% for all supplies.',
    currency: 'KWD', symbol: 'KD', regionLabel: 'Governorate', taxYear: '2025',
    source: { name: 'Kuwait Ministry of Finance', url: 'https://www.mof.gov.kw/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[Infinity, 0]], joint: [], head: [] } }],
    regions: [
      { id: 'KW-AS', name: 'Al Asimah (Kuwait City)', code: 'KW-AS', cities: ['Kuwait City', 'Sharq'], counties: [], propertyTax: 0, salesTax: 0, flatTax: 0, medianIncome: 18000, costOfLivingIndex: 58, taxStructure: 'No wage income tax', statuteCitation: 'No personal income tax on wages', governingBody: 'Ministry of Finance', description: 'No employment income tax.', taxRegime: 'no-wage-tax' },
    ],
  },
  PK: {
    name: 'Pakistan', legalBody: 'Federal Board of Revenue (FBR)', rules: 'Progressive salaried slabs with a 0% band, then 5%–35%. Provincial sales tax on services differs by province.',
    currency: 'PKR', symbol: 'Rs', regionLabel: 'Province', taxYear: '2025/26',
    source: { name: 'FBR Pakistan', url: 'https://www.fbr.gov.pk/' },
    years: [{ id: '2025/26', label: '2025/26', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[600000, 0], [1200000, .05], [2200000, .15], [3200000, .25], [4100000, .30], [Infinity, .35]], joint: [], head: [] } }],
    regions: [
      { id: 'PK-SD', name: 'Sindh (Karachi)', code: 'PK-SD', cities: ['Karachi', 'Hyderabad'], counties: [{ id: 'PK-SD-KHI', name: 'Karachi Division', seat: 'Karachi', population: 16000000, medianIncome: 720000, propertyTaxRate: 0.2, localSalesTaxRate: 13, localIncomeTaxRate: 0, rules: 'Sindh sales tax on services 13%. Income tax is federal FBR.' }], propertyTax: 0.2, salesTax: 18, flatTax: 0, medianIncome: 700000, costOfLivingIndex: 28, taxStructure: 'Federal progressive slabs', statuteCitation: 'Income Tax Ordinance 2001', governingBody: 'FBR / SRB', description: 'Federal income tax; Sindh service tax is local and optional here.', taxRegime: 'national' },
      { id: 'PK-PB', name: 'Punjab (Lahore)', code: 'PK-PB', cities: ['Lahore', 'Faisalabad'], counties: [], propertyTax: 0.18, salesTax: 16, flatTax: 0, medianIncome: 650000, costOfLivingIndex: 26, taxStructure: 'Federal progressive slabs', statuteCitation: 'ITO 2001', governingBody: 'FBR / PRA', description: 'Punjab sales tax on services differs from Sindh.', taxRegime: 'national' },
    ],
  },
  BD: {
    name: 'Bangladesh', legalBody: 'National Board of Revenue (NBR)', rules: 'Progressive individual tax with a tax-free threshold that differs for women, seniors, and persons with disabilities.',
    currency: 'BDT', symbol: '৳', regionLabel: 'Division', taxYear: '2025/26',
    source: { name: 'NBR Bangladesh', url: 'https://nbr.gov.bd/' },
    years: [{ id: '2025/26', label: '2025/26', deduction: { single: 350000, joint: 350000, head: 350000 }, federal: { single: [[100000, .05], [400000, .10], [500000, .15], [500000, .20], [Infinity, .25]], joint: [], head: [] } }],
    regions: [
      { id: 'BD-C', name: 'Dhaka Division', code: 'BD-C', cities: ['Dhaka', 'Gazipur'], counties: [{ id: 'BD-C-DH', name: 'Dhaka City', seat: 'Dhaka', population: 8900000, medianIncome: 480000, propertyTaxRate: 0.12, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Holding tax is municipal; income tax is NBR.' }], propertyTax: 0.12, salesTax: 15, flatTax: 0, medianIncome: 450000, costOfLivingIndex: 30, taxStructure: 'Progressive with tax-free threshold', statuteCitation: 'Income Tax Act 2023', governingBody: 'NBR', description: 'National progressive rates.', taxRegime: 'national' },
      { id: 'BD-B', name: 'Chattogram Division', code: 'BD-B', cities: ['Chattogram'], counties: [], propertyTax: 0.1, salesTax: 15, flatTax: 0, medianIncome: 380000, costOfLivingIndex: 27, taxStructure: 'Progressive with tax-free threshold', statuteCitation: 'Income Tax Act 2023', governingBody: 'NBR Chattogram', description: 'Port city; same national rates.', taxRegime: 'national' },
    ],
  },
  KE: {
    name: 'Kenya', legalBody: 'Kenya Revenue Authority (KRA)', rules: 'PAYE uses progressive bands plus a personal relief. NHIF/SHIF and NSSF are separate payroll items.',
    currency: 'KES', symbol: 'KSh', regionLabel: 'County', taxYear: '2025',
    source: { name: 'KRA PAYE', url: 'https://www.kra.go.ke/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 28800, joint: 28800, head: 28800 }, federal: { single: [[288000, .1], [388000, .25], [6000000, .3], [9600000, .325], [Infinity, .35]], joint: [], head: [] } }],
    regions: [
      { id: 'KE-30', name: 'Nairobi City County', code: 'KE-30', cities: ['Nairobi', 'Westlands'], counties: [{ id: 'KE-30-NBO', name: 'Nairobi', seat: 'Nairobi', population: 4400000, medianIncome: 720000, propertyTaxRate: 0.1, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'County land rates; PAYE is national KRA.' }], propertyTax: 0.1, salesTax: 16, flatTax: 0, medianIncome: 700000, costOfLivingIndex: 38, taxStructure: 'Progressive PAYE', statuteCitation: 'Income Tax Act Cap. 470', governingBody: 'KRA', description: 'National PAYE bands plus optional SHIF/NSSF.', taxRegime: 'national' },
      { id: 'KE-01', name: 'Mombasa County', code: 'KE-01', cities: ['Mombasa'], counties: [], propertyTax: 0.09, salesTax: 16, flatTax: 0, medianIncome: 520000, costOfLivingIndex: 34, taxStructure: 'Progressive PAYE', statuteCitation: 'Cap. 470', governingBody: 'KRA Mombasa', description: 'Coastal county; same PAYE.', taxRegime: 'national' },
    ],
  },
  NG: {
    name: 'Nigeria', legalBody: 'Federal Inland Revenue Service (FIRS) / State IRS', rules: 'PIT is collected by states using the national progressive tariff (Pay-As-You-Earn). VAT 7.5% is federal.',
    currency: 'NGN', symbol: '₦', regionLabel: 'State', taxYear: '2025',
    source: { name: 'FIRS / PITA', url: 'https://www.firs.gov.ng/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[300000, .07], [300000, .11], [500000, .15], [500000, .19], [1600000, .21], [Infinity, .24]], joint: [], head: [] } }],
    regions: [
      { id: 'NG-LA', name: 'Lagos State', code: 'NG-LA', cities: ['Ikeja', 'Victoria Island', 'Lekki'], counties: [{ id: 'NG-LA-ET', name: 'Eti-Osa', seat: 'Ikoyi', population: 400000, medianIncome: 2400000, propertyTaxRate: 0.5, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Lagos Internal Revenue Service administers PAYE. Land use charge is local and optional here.' }], propertyTax: 0.5, salesTax: 7.5, flatTax: 0, medianIncome: 2200000, costOfLivingIndex: 32, taxStructure: 'National PITA via state IRS', statuteCitation: 'Personal Income Tax Act', governingBody: 'LIRS / FIRS', description: 'State-administered national PAYE.', taxRegime: 'national' },
      { id: 'NG-FC', name: 'FCT Abuja', code: 'NG-FC', cities: ['Abuja', 'Garki'], counties: [], propertyTax: 0.4, salesTax: 7.5, flatTax: 0, medianIncome: 1800000, costOfLivingIndex: 30, taxStructure: 'National PITA', statuteCitation: 'PITA', governingBody: 'FCT IRS', description: 'Federal capital; same PITA bands.', taxRegime: 'national' },
    ],
  },
  MA: {
    name: 'Morocco', legalBody: 'Direction Générale des Impôts (DGI)', rules: 'Progressive IR on net employment income after professional expenses. CNSS social contributions are separate.',
    currency: 'MAD', symbol: 'DH', regionLabel: 'Region', taxYear: '2025',
    source: { name: 'DGI Morocco', url: 'https://www.tax.gov.ma/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[40000, 0], [60000, .1], [80000, .2], [100000, .3], [180000, .34], [Infinity, .38]], joint: [], head: [] } }],
    regions: [
      { id: 'MA-CASA', name: 'Casablanca-Settat', code: 'MA-CASA', cities: ['Casablanca', 'Mohammedia'], counties: [{ id: 'MA-CASA-AN', name: 'Anfa', seat: 'Casablanca', population: 95000, medianIncome: 120000, propertyTaxRate: 0.3, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Taxe d’habitation and taxe professionnelle are local; IR is national.' }], propertyTax: 0.3, salesTax: 20, flatTax: 0, medianIncome: 110000, costOfLivingIndex: 36, taxStructure: 'Progressive IR', statuteCitation: 'CGI', governingBody: 'DGI Casablanca', description: 'National IR brackets.', taxRegime: 'national' },
      { id: 'MA-RAB', name: 'Rabat-Salé-Kénitra', code: 'MA-RAB', cities: ['Rabat', 'Salé'], counties: [], propertyTax: 0.28, salesTax: 20, flatTax: 0, medianIncome: 95000, costOfLivingIndex: 34, taxStructure: 'Progressive IR', statuteCitation: 'CGI', governingBody: 'DGI Rabat', description: 'Capital region; same IR.', taxRegime: 'national' },
    ],
  },
  JO: {
    name: 'Jordan', legalBody: 'Income and Sales Tax Department (ISTD)', rules: 'Progressive personal income tax with personal and family exemptions. General sales tax 16%.',
    currency: 'JOD', symbol: 'JD', regionLabel: 'Governorate', taxYear: '2025',
    source: { name: 'ISTD Jordan', url: 'https://www.istd.gov.jo/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 9000, joint: 18000, head: 9000 }, federal: { single: [[5000, .05], [5000, .1], [5000, .15], [5000, .2], [Infinity, .25]], joint: [], head: [] } }],
    regions: [
      { id: 'JO-AM', name: 'Amman', code: 'JO-AM', cities: ['Amman', 'Abdali'], counties: [{ id: 'JO-AM-C', name: 'Greater Amman', seat: 'Amman', population: 4000000, medianIncome: 8000, propertyTaxRate: 0.15, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Building and land tax is municipal; income tax is ISTD.' }], propertyTax: 0.15, salesTax: 16, flatTax: 0, medianIncome: 7500, costOfLivingIndex: 44, taxStructure: 'Progressive with exemptions', statuteCitation: 'Income Tax Law', governingBody: 'ISTD', description: 'National progressive rates after exemptions.', taxRegime: 'national' },
    ],
  },
  RS: {
    name: 'Serbia', legalBody: 'Poreska uprava', rules: 'Progressive employment tax with non-taxable threshold; municipal surtax may apply in Belgrade and other cities.',
    currency: 'RSD', symbol: 'дин', regionLabel: 'District', taxYear: '2025',
    source: { name: 'Serbian Tax Administration', url: 'https://www.purs.gov.rs/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 25000, joint: 25000, head: 25000 }, federal: { single: [[1176000, .10], [Infinity, .15]], joint: [], head: [] } }],
    regions: [
      { id: 'RS-00', name: 'Belgrade', code: 'RS-00', cities: ['Belgrade'], counties: [{ id: 'RS-00-BG', name: 'City of Belgrade', seat: 'Belgrade', population: 1400000, medianIncome: 1400000, propertyTaxRate: 0.4, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Municipal surtax possible; income tax is national. Local wage tax off by default.' }], propertyTax: 0.4, salesTax: 20, flatTax: 0, medianIncome: 1350000, costOfLivingIndex: 40, taxStructure: 'Progressive + optional municipal surtax', statuteCitation: 'Personal Income Tax Law', governingBody: 'Poreska uprava', description: 'National progressive rates; local surtax optional.', taxRegime: 'local-surtax' },
      { id: 'RS-21', name: 'Nišava', code: 'RS-21', cities: ['Niš'], counties: [], propertyTax: 0.3, salesTax: 20, flatTax: 0, medianIncome: 1000000, costOfLivingIndex: 34, taxStructure: 'Progressive national PIT', statuteCitation: 'Personal Income Tax Law', governingBody: 'Poreska uprava Niš', description: 'Same national rates.', taxRegime: 'national' },
    ],
  },
  SI: {
    name: 'Slovenia', legalBody: 'Finančna uprava RS (FURS)', rules: 'Progressive personal income tax with five brackets and a general allowance. Social contributions are separate.',
    currency: 'EUR', symbol: '€', regionLabel: 'Statistical region', taxYear: '2025',
    source: { name: 'FURS Slovenia', url: 'https://www.fu.gov.si/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 5000, joint: 5000, head: 5000 }, federal: { single: [[8750, .16], [25750, .26], [50750, .33], [74050, .39], [Infinity, .50]], joint: [], head: [] } }],
    regions: [
      { id: 'SI-OS', name: 'Osrednjeslovenska (Ljubljana)', code: 'SI-OS', cities: ['Ljubljana'], counties: [{ id: 'SI-OS-LJ', name: 'Ljubljana', seat: 'Ljubljana', population: 295000, medianIncome: 22000, propertyTaxRate: 0.2, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'No municipal wage tax; property tax is local and optional here.' }], propertyTax: 0.2, salesTax: 22, flatTax: 0, medianIncome: 21000, costOfLivingIndex: 62, taxStructure: 'Five-band progressive PIT', statuteCitation: 'ZDoh-2', governingBody: 'FURS', description: 'National progressive brackets.', taxRegime: 'national' },
    ],
  },
  CY: {
    name: 'Cyprus', legalBody: 'Tax Department Cyprus', rules: 'Progressive personal income tax with a tax-free threshold. Special Defence Contribution may apply to certain passive income, not ordinary wages.',
    currency: 'EUR', symbol: '€', regionLabel: 'District', taxYear: '2025',
    source: { name: 'Cyprus Tax Department', url: 'https://www.mof.gov.cy/mof/tax/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 19500, joint: 19500, head: 19500 }, federal: { single: [[8500, .2], [8000, .25], [14400, .3], [Infinity, .35]], joint: [], head: [] } }],
    regions: [
      { id: 'CY-NI', name: 'Nicosia', code: 'CY-NI', cities: ['Nicosia'], counties: [], propertyTax: 0.1, salesTax: 19, flatTax: 0, medianIncome: 22000, costOfLivingIndex: 68, taxStructure: 'Progressive with tax-free band', statuteCitation: 'Income Tax Law', governingBody: 'Tax Department', description: 'National progressive rates.', taxRegime: 'national' },
      { id: 'CY-LI', name: 'Limassol', code: 'CY-LI', cities: ['Limassol'], counties: [], propertyTax: 0.1, salesTax: 19, flatTax: 0, medianIncome: 23000, costOfLivingIndex: 70, taxStructure: 'Progressive with tax-free band', statuteCitation: 'Income Tax Law', governingBody: 'Tax Department Limassol', description: 'Commercial hub; same national rates.', taxRegime: 'national' },
    ],
  },
  MT: {
    name: 'Malta', legalBody: 'Commissioner for Revenue', rules: 'Progressive tax by filing status (single, married, parent). Social security contributions are separate.',
    currency: 'EUR', symbol: '€', regionLabel: 'Region', taxYear: '2025',
    source: { name: 'CFR Malta', url: 'https://cfr.gov.mt/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 9100, joint: 12700, head: 10500 }, federal: { single: [[5400, .15], [7500, .25], [Infinity, .35]], joint: [[11200, .15], [21300, .25], [Infinity, .35]], head: [] } }],
    regions: [
      { id: 'MT-S', name: 'Southern Harbour / Valletta', code: 'MT-S', cities: ['Valletta', 'Sliema'], counties: [], propertyTax: 0, salesTax: 18, flatTax: 0, medianIncome: 20000, costOfLivingIndex: 72, taxStructure: 'Status-based progressive PIT', statuteCitation: 'Income Tax Act', governingBody: 'CFR', description: 'National progressive rates by status.', taxRegime: 'national' },
    ],
  },
  UY: {
    name: 'Uruguay', legalBody: 'Dirección General Impositiva (DGI)', rules: 'IRPF progressive bands on labor income. BPS social security is separate. IVA 22%.',
    currency: 'UYU', symbol: '$U', regionLabel: 'Department', taxYear: '2025',
    source: { name: 'DGI Uruguay', url: 'https://www.gub.uy/direccion-general-impositiva/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[451656, 0], [645216, .1], [968000, .15], [1800000, .24], [3000000, .25], [Infinity, .36]], joint: [], head: [] } }],
    regions: [
      { id: 'UY-MO', name: 'Montevideo', code: 'UY-MO', cities: ['Montevideo'], counties: [{ id: 'UY-MO-C', name: 'Montevideo capital', seat: 'Montevideo', population: 1300000, medianIncome: 900000, propertyTaxRate: 0.5, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Contribution inmobiliaria is municipal; IRPF is national. Local wage tax off by default.' }], propertyTax: 0.5, salesTax: 22, flatTax: 0, medianIncome: 850000, costOfLivingIndex: 48, taxStructure: 'Progressive IRPF', statuteCitation: 'IRPF Law', governingBody: 'DGI', description: 'National progressive labor IRPF.', taxRegime: 'national' },
    ],
  },
  EC: {
    name: 'Ecuador', legalBody: 'Servicio de Rentas Internas (SRI)', rules: 'Progressive annual table with personal exemption. IESS contributions are separate.',
    currency: 'USD', symbol: '$', regionLabel: 'Province', taxYear: '2025',
    source: { name: 'SRI Ecuador', url: 'https://www.sri.gob.ec/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 11722, joint: 11722, head: 11722 }, federal: { single: [[11282, 0], [14364, .05], [17946, .1], [21648, .12], [32346, .15], [42990, .2], [57254, .25], [76126, .3], [Infinity, .35]], joint: [], head: [] } }],
    regions: [
      { id: 'EC-P', name: 'Pichincha (Quito)', code: 'EC-P', cities: ['Quito'], counties: [], propertyTax: 0.25, salesTax: 15, flatTax: 0, medianIncome: 12000, costOfLivingIndex: 34, taxStructure: 'Progressive annual IR', statuteCitation: 'LORTI', governingBody: 'SRI', description: 'National progressive IR.', taxRegime: 'national' },
      { id: 'EC-G', name: 'Guayas (Guayaquil)', code: 'EC-G', cities: ['Guayaquil'], counties: [], propertyTax: 0.25, salesTax: 15, flatTax: 0, medianIncome: 11000, costOfLivingIndex: 33, taxStructure: 'Progressive annual IR', statuteCitation: 'LORTI', governingBody: 'SRI Guayas', description: 'Coastal commercial hub; same IR.', taxRegime: 'national' },
    ],
  },
  LK: {
    name: 'Sri Lanka', legalBody: 'Inland Revenue Department', rules: 'Progressive personal income tax with a tax-free threshold. APIT is withheld from employment income.',
    currency: 'LKR', symbol: 'Rs', regionLabel: 'Province', taxYear: '2025',
    source: { name: 'IRD Sri Lanka', url: 'https://www.ird.gov.lk/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 1200000, joint: 1200000, head: 1200000 }, federal: { single: [[500000, .06], [500000, .12], [500000, .18], [500000, .24], [500000, .3], [Infinity, .36]], joint: [], head: [] } }],
    regions: [
      { id: 'LK-1', name: 'Western Province (Colombo)', code: 'LK-1', cities: ['Colombo', 'Dehiwala'], counties: [], propertyTax: 0.2, salesTax: 18, flatTax: 0, medianIncome: 900000, costOfLivingIndex: 32, taxStructure: 'Progressive APIT/PIT', statuteCitation: 'Inland Revenue Act', governingBody: 'IRD', description: 'National progressive rates.', taxRegime: 'national' },
    ],
  },
  NP: {
    name: 'Nepal', legalBody: 'Inland Revenue Department Nepal', rules: 'Progressive individual tax with a basic exemption and marital status differences.',
    currency: 'NPR', symbol: 'Rs', regionLabel: 'Province', taxYear: '2025/26',
    source: { name: 'IRD Nepal', url: 'https://ird.gov.np/' },
    years: [{ id: '2025/26', label: '2025/26', deduction: { single: 500000, joint: 600000, head: 500000 }, federal: { single: [[200000, .1], [300000, .2], [500000, .3], [1000000, .36], [Infinity, .39]], joint: [], head: [] } }],
    regions: [
      { id: 'NP-BA', name: 'Bagmati (Kathmandu)', code: 'NP-BA', cities: ['Kathmandu', 'Lalitpur'], counties: [], propertyTax: 0.1, salesTax: 13, flatTax: 0, medianIncome: 500000, costOfLivingIndex: 28, taxStructure: 'Progressive individual tax', statuteCitation: 'Income Tax Act 2058', governingBody: 'IRD', description: 'National progressive rates.', taxRegime: 'national' },
    ],
  },
  GH: {
    name: 'Ghana', legalBody: 'Ghana Revenue Authority (GRA)', rules: 'PAYE progressive bands on employment income. SSNIT contributions are separate.',
    currency: 'GHS', symbol: 'GH₵', regionLabel: 'Region', taxYear: '2025',
    source: { name: 'GRA Ghana', url: 'https://gra.gov.gh/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[490, 0], [110, .05], [130, .1], [3000, .175], [16395, .25], [50417, .3], [Infinity, .35]], joint: [], head: [] } }],
    regions: [
      { id: 'GH-AA', name: 'Greater Accra', code: 'GH-AA', cities: ['Accra', 'Tema'], counties: [{ id: 'GH-AA-AC', name: 'Accra Metropolitan', seat: 'Accra', population: 2000000, medianIncome: 36000, propertyTaxRate: 0.1, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Property rate is local; PAYE is national GRA.' }], propertyTax: 0.1, salesTax: 15, flatTax: 0, medianIncome: 34000, costOfLivingIndex: 36, taxStructure: 'Progressive PAYE', statuteCitation: 'Income Tax Act 2015 (Act 896)', governingBody: 'GRA', description: 'National PAYE bands.', taxRegime: 'national' },
    ],
  },
  TZ: {
    name: 'Tanzania', legalBody: 'Tanzania Revenue Authority (TRA)', rules: 'PAYE progressive monthly bands. Skills Development Levy is employer-side.',
    currency: 'TZS', symbol: 'TSh', regionLabel: 'Region', taxYear: '2025',
    source: { name: 'TRA Tanzania', url: 'https://www.tra.go.tz/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[270000, 0], [250000, .08], [230000, .2], [250000, .25], [Infinity, .3]], joint: [], head: [] } }],
    regions: [
      { id: 'TZ-02', name: 'Dar es Salaam', code: 'TZ-02', cities: ['Dar es Salaam'], counties: [], propertyTax: 0.15, salesTax: 18, flatTax: 0, medianIncome: 9000000, costOfLivingIndex: 34, taxStructure: 'Progressive PAYE', statuteCitation: 'Income Tax Act', governingBody: 'TRA', description: 'National PAYE.', taxRegime: 'national' },
    ],
  },
  UG: {
    name: 'Uganda', legalBody: 'Uganda Revenue Authority (URA)', rules: 'PAYE progressive bands with a zero-rated threshold. NSSF is separate.',
    currency: 'UGX', symbol: 'USh', regionLabel: 'District', taxYear: '2025',
    source: { name: 'URA Uganda', url: 'https://www.ura.go.ug/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[235000, 0], [100000, .1], [165000, .2], [Infinity, .3]], joint: [], head: [] } }],
    regions: [
      { id: 'UG-C', name: 'Kampala', code: 'UG-C', cities: ['Kampala'], counties: [], propertyTax: 0.1, salesTax: 18, flatTax: 0, medianIncome: 12000000, costOfLivingIndex: 33, taxStructure: 'Progressive PAYE', statuteCitation: 'Income Tax Act Cap. 340', governingBody: 'URA', description: 'National PAYE.', taxRegime: 'national' },
    ],
  },
  SN: {
    name: 'Senegal', legalBody: 'Direction Générale des Impôts et des Domaines (DGID)', rules: 'Progressive IR with family quotient elements. CSS and IPM contributions are separate.',
    currency: 'XOF', symbol: 'CFA', regionLabel: 'Region', taxYear: '2025',
    source: { name: 'DGID Senegal', url: 'https://www.dgid.sn/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[630000, 0], [870000, .2], [1000000, .3], [1000000, .35], [1700000, .37], [Infinity, .4]], joint: [], head: [] } }],
    regions: [
      { id: 'SN-DK', name: 'Dakar', code: 'SN-DK', cities: ['Dakar', 'Pikine'], counties: [], propertyTax: 0.2, salesTax: 18, flatTax: 0, medianIncome: 2500000, costOfLivingIndex: 38, taxStructure: 'Progressive IR', statuteCitation: 'CGI Sénégal', governingBody: 'DGID', description: 'National progressive IR.', taxRegime: 'national' },
    ],
  },
  TN: {
    name: 'Tunisia', legalBody: 'Direction Générale des Impôts', rules: 'Progressive IRPP with multiple brackets. CNSS is separate.',
    currency: 'TND', symbol: 'د.ت', regionLabel: 'Governorate', taxYear: '2025',
    source: { name: 'DGI Tunisia', url: 'https://www.impots.finances.gov.tn/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[5000, 0], [5000, .26], [10000, .28], [30000, .32], [Infinity, .35]], joint: [], head: [] } }],
    regions: [
      { id: 'TN-11', name: 'Tunis', code: 'TN-11', cities: ['Tunis', 'La Marsa'], counties: [], propertyTax: 0.2, salesTax: 19, flatTax: 0, medianIncome: 18000, costOfLivingIndex: 36, taxStructure: 'Progressive IRPP', statuteCitation: 'Code de l’IRPP', governingBody: 'DGI', description: 'National progressive IRPP.', taxRegime: 'national' },
    ],
  },
  LB: {
    name: 'Lebanon', legalBody: 'Ministry of Finance / Revenue Directorate', rules: 'Progressive personal income tax on employment. Municipal tax and NSSF are separate and optional here.',
    currency: 'LBP', symbol: 'ل.ل', regionLabel: 'Governorate', taxYear: '2025',
    source: { name: 'Lebanon Ministry of Finance', url: 'https://www.finance.gov.lb/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 37500000, joint: 75000000, head: 37500000 }, federal: { single: [[18000000, .02], [27000000, .04], [45000000, .07], [90000000, .11], [150000000, .15], [Infinity, .2]], joint: [], head: [] } }],
    regions: [
      { id: 'LB-BA', name: 'Beirut', code: 'LB-BA', cities: ['Beirut'], counties: [], propertyTax: 0.2, salesTax: 11, flatTax: 0, medianIncome: 200000000, costOfLivingIndex: 45, taxStructure: 'Progressive employment tax', statuteCitation: 'Income Tax Law', governingBody: 'Ministry of Finance', description: 'National progressive rates.', taxRegime: 'national' },
    ],
  },
  OM: {
    name: 'Oman', legalBody: 'Tax Authority Oman', rules: 'No personal income tax on employment wages. VAT 5%. Social security applies to Omani nationals.',
    currency: 'OMR', symbol: 'ر.ع.', regionLabel: 'Governorate', taxYear: '2025',
    source: { name: 'Oman Tax Authority', url: 'https://tms.taxoman.gov.om/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[Infinity, 0]], joint: [], head: [] } }],
    regions: [
      { id: 'OM-MA', name: 'Muscat', code: 'OM-MA', cities: ['Muscat', 'Muttrah'], counties: [], propertyTax: 0, salesTax: 5, flatTax: 0, medianIncome: 15000, costOfLivingIndex: 52, taxStructure: 'No wage income tax', statuteCitation: 'No personal income tax on wages', governingBody: 'Tax Authority', description: 'No employment income tax.', taxRegime: 'no-wage-tax', divergenceNote: 'Oman does not tax employment wages. VAT and national social security may still apply.' },
    ],
  },
  BH: {
    name: 'Bahrain', legalBody: 'National Bureau for Revenue (NBR)', rules: 'No personal income tax on employment wages. VAT 10%. Social insurance applies to Bahraini nationals.',
    currency: 'BHD', symbol: 'BD', regionLabel: 'Governorate', taxYear: '2025',
    source: { name: 'NBR Bahrain', url: 'https://www.nbr.gov.bh/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[Infinity, 0]], joint: [], head: [] } }],
    regions: [
      { id: 'BH-13', name: 'Capital (Manama)', code: 'BH-13', cities: ['Manama'], counties: [], propertyTax: 0, salesTax: 10, flatTax: 0, medianIncome: 12000, costOfLivingIndex: 58, taxStructure: 'No wage income tax', statuteCitation: 'No personal income tax on wages', governingBody: 'NBR', description: 'No employment income tax.', taxRegime: 'no-wage-tax', divergenceNote: 'Bahrain does not tax employment wages. VAT 10% may apply to spending estimates if enabled.' },
    ],
  },

  GU: {
    name: 'Guam',
    legalBody: 'Department of Revenue and Taxation (DRT Guam)',
    rules: 'Guam is an unincorporated US territory with a mirrored territorial income tax (GIT) administered locally. It is not a US state and not a municipal overlay on a state return. Bona fide residents generally file with DRT, not as a 50th state.',
    currency: 'USD', symbol: '$', regionLabel: 'Village', taxYear: '2025',
    source: { name: 'Guam DRT', url: 'https://www.guamtax.com/' },
    years: [
      { id: '2024', label: '2024', deduction: { single: 14600, joint: 29200, head: 21900 }, federal: { single: [[11600, .1], [47150, .12], [100525, .22], [191950, .24], [243725, .32], [609350, .35], [Infinity, .37]], joint: [], head: [] } },
      { id: '2025', label: '2025', deduction: { single: 15000, joint: 30000, head: 22500 }, federal: { single: [[11925, .1], [48475, .12], [103350, .22], [197300, .24], [250525, .32], [626350, .35], [Infinity, .37]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'GU-HA', name: 'Hagåtña / Tamuning', code: 'GU-HA', cities: ['Hagåtña', 'Tamuning', 'Tumon'], counties: [], propertyTax: 0.25, salesTax: 4, flatTax: 0, medianIncome: 58000, costOfLivingIndex: 118, taxStructure: 'Territorial GIT (mirrored IRC)', statuteCitation: '48 U.S.C. § 1421i; Guam Territorial Income Tax', governingBody: 'DRT Guam', description: 'Territory-administered income tax. Not a US state.', taxRegime: 'territorial', divergenceNote: 'Guam is not a US state. Income tax is the Guam Territorial Income Tax administered by DRT.' },
    ],
  },
  VI: {
    name: 'U.S. Virgin Islands',
    legalBody: 'Virgin Islands Bureau of Internal Revenue (VIBIR)',
    rules: 'The USVI is an unincorporated territory with a mirrored territorial income tax administered by VIBIR. It is not a US state and not a city of a state.',
    currency: 'USD', symbol: '$', regionLabel: 'Island', taxYear: '2025',
    source: { name: 'VIBIR', url: 'https://bir.vi.gov/' },
    years: [
      { id: '2024', label: '2024', deduction: { single: 14600, joint: 29200, head: 21900 }, federal: { single: [[11600, .1], [47150, .12], [100525, .22], [191950, .24], [243725, .32], [609350, .35], [Infinity, .37]], joint: [], head: [] } },
      { id: '2025', label: '2025', deduction: { single: 15000, joint: 30000, head: 22500 }, federal: { single: [[11925, .1], [48475, .12], [103350, .22], [197300, .24], [250525, .32], [626350, .35], [Infinity, .37]], joint: [], head: [] } },
      { id: '2026', label: '2026', deduction: { single: 15750, joint: 31500, head: 23625 }, federal: { single: [[12400, .1], [50400, .12], [107550, .22], [205350, .24], [260750, .32], [651050, .35], [Infinity, .37]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'VI-STT', name: 'St. Thomas', code: 'VI-STT', cities: ['Charlotte Amalie'], counties: [], propertyTax: 0.75, salesTax: 0, flatTax: 0, medianIncome: 42000, costOfLivingIndex: 122, taxStructure: 'Territorial income tax', statuteCitation: '33 V.I.C.; IRC mirror', governingBody: 'VIBIR', description: 'Territory tax administered locally. Gross receipts tax may apply to businesses, not wages.', taxRegime: 'territorial', divergenceNote: 'The US Virgin Islands is not a US state. File with VIBIR, not as a state overlay.' },
      { id: 'VI-STX', name: 'St. Croix', code: 'VI-STX', cities: ['Christiansted', 'Frederiksted'], counties: [], propertyTax: 0.75, salesTax: 0, flatTax: 0, medianIncome: 40000, costOfLivingIndex: 115, taxStructure: 'Territorial income tax', statuteCitation: '33 V.I.C.', governingBody: 'VIBIR St. Croix', description: 'Same territorial system as St. Thomas.', taxRegime: 'territorial' },
    ],
  },
  AS: {
    name: 'American Samoa',
    legalBody: 'American Samoa Tax Office',
    rules: 'American Samoa is an unincorporated US territory with its own territorial income tax. It does not use a US state schedule and is not a municipal overlay.',
    currency: 'USD', symbol: '$', regionLabel: 'District', taxYear: '2025',
    source: { name: 'American Samoa Tax Office', url: 'https://www.americansamoa.gov/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 3000, joint: 6000, head: 3000 }, federal: { single: [[3000, .04], [9000, .08], [18000, .12], [27000, .16], [Infinity, .18]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'AS-EA', name: 'Eastern District (Pago Pago)', code: 'AS-EA', cities: ['Pago Pago', 'Fagatogo'], counties: [], propertyTax: 0, salesTax: 0, flatTax: 0, medianIncome: 28000, costOfLivingIndex: 110, taxStructure: 'Territorial income tax', statuteCitation: 'American Samoa Income Tax', governingBody: 'AS Tax Office', description: 'Independent territorial income tax.', taxRegime: 'territorial', divergenceNote: 'American Samoa is not a US state. Its income tax is territorial.' },
    ],
  },
  MP: {
    name: 'Northern Mariana Islands',
    legalBody: 'CNMI Division of Revenue and Taxation',
    rules: 'The CNMI is a US commonwealth territory with a territorial income tax and a wage-withholding system distinct from any US state.',
    currency: 'USD', symbol: '$', regionLabel: 'Island', taxYear: '2025',
    source: { name: 'CNMI DRT', url: 'https://www.cnmidrt.gov.mp/' },
    years: [
      { id: '2025', label: '2025', deduction: { single: 15000, joint: 30000, head: 22500 }, federal: { single: [[11925, .1], [48475, .12], [103350, .22], [197300, .24], [250525, .32], [626350, .35], [Infinity, .37]], joint: [], head: [] } },
    ],
    regions: [
      { id: 'MP-SA', name: 'Saipan', code: 'MP-SA', cities: ['Saipan', 'Garapan'], counties: [], propertyTax: 0, salesTax: 0, flatTax: 0, medianIncome: 32000, costOfLivingIndex: 112, taxStructure: 'Territorial income tax / NMTIT', statuteCitation: '4 CMC; NMTIT', governingBody: 'CNMI DRT', description: 'Commonwealth territorial tax. Not a US state.', taxRegime: 'territorial', divergenceNote: 'The Northern Mariana Islands is not a US state. Tax is administered by CNMI DRT.' },
    ],
  },
  GE: {
    name: 'Georgia', legalBody: 'Revenue Service of Georgia', rules: 'Flat 20% personal income tax on most employment income. Social contributions are separate.',
    currency: 'GEL', symbol: '₾', regionLabel: 'Region', taxYear: '2025',
    source: { name: 'RS.ge', url: 'https://www.rs.ge/' },
    years: [{ id: '2024', label: '2024', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[Infinity, .20]], joint: [], head: [] } }, { id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[Infinity, .20]], joint: [], head: [] } }],
    regions: [
      { id: 'GE-TB', name: 'Tbilisi', code: 'GE-TB', cities: ['Tbilisi'], counties: [], propertyTax: 1.0, salesTax: 18, flatTax: 0.20, medianIncome: 18000, costOfLivingIndex: 38, taxStructure: 'Flat 20% PIT', statuteCitation: 'Tax Code of Georgia', governingBody: 'Revenue Service', description: 'National flat employment tax.', taxRegime: 'national' },
      { id: 'GE-AJ', name: 'Adjara (Batumi)', code: 'GE-AJ', cities: ['Batumi'], counties: [], propertyTax: 1.0, salesTax: 18, flatTax: 0.20, medianIncome: 15000, costOfLivingIndex: 36, taxStructure: 'Flat 20% PIT', statuteCitation: 'Tax Code of Georgia', governingBody: 'Revenue Service Adjara', description: 'Autonomous republic uses the national PIT tariff on wages.', taxRegime: 'national' },
    ],
  },
  AM: {
    name: 'Armenia', legalBody: 'State Revenue Committee', rules: 'Flat 20% income tax on employment. Social contributions are separate.',
    currency: 'AMD', symbol: '֏', regionLabel: 'Marz', taxYear: '2025',
    source: { name: 'SRC Armenia', url: 'https://www.src.am/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[Infinity, .20]], joint: [], head: [] } }],
    regions: [
      { id: 'AM-ER', name: 'Yerevan', code: 'AM-ER', cities: ['Yerevan'], counties: [], propertyTax: 0.3, salesTax: 20, flatTax: 0.20, medianIncome: 2400000, costOfLivingIndex: 36, taxStructure: 'Flat 20%', statuteCitation: 'Tax Code of Armenia', governingBody: 'SRC', description: 'National flat rate.', taxRegime: 'national' },
    ],
  },
  AZ: {
    name: 'Azerbaijan', legalBody: 'State Tax Service', rules: 'Employment income 14% up to a threshold, 25% above, with a monthly exemption. Social insurance is separate.',
    currency: 'AZN', symbol: '₼', regionLabel: 'City / rayon', taxYear: '2025',
    source: { name: 'taxes.gov.az', url: 'https://www.taxes.gov.az/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 2400, joint: 2400, head: 2400 }, federal: { single: [[8000, .14], [Infinity, .25]], joint: [], head: [] } }],
    regions: [
      { id: 'AZ-BA', name: 'Baku', code: 'AZ-BA', cities: ['Baku'], counties: [], propertyTax: 0.1, salesTax: 18, flatTax: 0, medianIncome: 12000, costOfLivingIndex: 40, taxStructure: 'Two-rate employment tax', statuteCitation: 'Tax Code of Azerbaijan', governingBody: 'State Tax Service', description: 'National two-rate PIT.', taxRegime: 'national' },
    ],
  },
  KZ: {
    name: 'Kazakhstan', legalBody: 'State Revenue Committee', rules: 'Flat 10% individual income tax on employment. Social tax and pension contributions are separate.',
    currency: 'KZT', symbol: '₸', regionLabel: 'Region', taxYear: '2025',
    source: { name: 'kgd.gov.kz', url: 'https://kgd.gov.kz/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 168000, joint: 168000, head: 168000 }, federal: { single: [[Infinity, .10]], joint: [], head: [] } }],
    regions: [
      { id: 'KZ-AST', name: 'Astana', code: 'KZ-AST', cities: ['Astana'], counties: [], propertyTax: 0.5, salesTax: 12, flatTax: 0.10, medianIncome: 2800000, costOfLivingIndex: 38, taxStructure: 'Flat 10% IIT', statuteCitation: 'Tax Code of Kazakhstan', governingBody: 'SRC', description: 'National flat IIT.', taxRegime: 'national' },
      { id: 'KZ-ALA', name: 'Almaty', code: 'KZ-ALA', cities: ['Almaty'], counties: [], propertyTax: 0.5, salesTax: 12, flatTax: 0.10, medianIncome: 3000000, costOfLivingIndex: 40, taxStructure: 'Flat 10% IIT', statuteCitation: 'Tax Code of Kazakhstan', governingBody: 'SRC Almaty', description: 'Largest city; same national IIT.', taxRegime: 'national' },
    ],
  },
  UZ: {
    name: 'Uzbekistan', legalBody: 'State Tax Committee', rules: 'Flat 12% personal income tax on employment. Social tax is employer-side.',
    currency: 'UZS', symbol: 'soʻm', regionLabel: 'Region', taxYear: '2025',
    source: { name: 'soliq.uz', url: 'https://soliq.uz/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[Infinity, .12]], joint: [], head: [] } }],
    regions: [
      { id: 'UZ-TK', name: 'Tashkent', code: 'UZ-TK', cities: ['Tashkent'], counties: [], propertyTax: 0.2, salesTax: 12, flatTax: 0.12, medianIncome: 36000000, costOfLivingIndex: 30, taxStructure: 'Flat 12%', statuteCitation: 'Tax Code of Uzbekistan', governingBody: 'State Tax Committee', description: 'National flat PIT.', taxRegime: 'national' },
    ],
  },
  MN: {
    name: 'Mongolia', legalBody: 'Mongolian Tax Administration', rules: 'Flat 10% personal income tax on employment. Social insurance is separate.',
    currency: 'MNT', symbol: '₮', regionLabel: 'Aimags / capital', taxYear: '2025',
    source: { name: 'mta.mn', url: 'https://mta.gov.mn/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[Infinity, .10]], joint: [], head: [] } }],
    regions: [
      { id: 'MN-UB', name: 'Ulaanbaatar', code: 'MN-UB', cities: ['Ulaanbaatar'], counties: [], propertyTax: 0.6, salesTax: 10, flatTax: 0.10, medianIncome: 18000000, costOfLivingIndex: 34, taxStructure: 'Flat 10%', statuteCitation: 'Personal Income Tax Law', governingBody: 'MTA', description: 'National flat PIT.', taxRegime: 'national' },
    ],
  },
  KH: {
    name: 'Cambodia', legalBody: 'General Department of Taxation', rules: 'Progressive monthly salary tax after a personal allowance. Social security is separate.',
    currency: 'KHR', symbol: '៛', regionLabel: 'Province', taxYear: '2025',
    source: { name: 'GDT Cambodia', url: 'https://www.gdt.gov.kh/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 1500000, joint: 1500000, head: 1500000 }, federal: { single: [[1500000, 0], [2000000, .05], [8500000, .1], [12500000, .15], [Infinity, .2]], joint: [], head: [] } }],
    regions: [
      { id: 'KH-PP', name: 'Phnom Penh', code: 'KH-PP', cities: ['Phnom Penh'], counties: [], propertyTax: 0.1, salesTax: 10, flatTax: 0, medianIncome: 9000000, costOfLivingIndex: 32, taxStructure: 'Progressive salary tax', statuteCitation: 'Law on Taxation', governingBody: 'GDT', description: 'National progressive salary tax.', taxRegime: 'national' },
    ],
  },
  MM: {
    name: 'Myanmar', legalBody: 'Internal Revenue Department', rules: 'Progressive personal income tax after a basic allowance. Commercial tax is separate from PIT.',
    currency: 'MMK', symbol: 'K', regionLabel: 'Region / state', taxYear: '2025',
    source: { name: 'IRD Myanmar', url: 'https://www.ird.gov.mm/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 4800000, joint: 4800000, head: 4800000 }, federal: { single: [[2000000, .05], [5000000, .1], [10000000, .15], [20000000, .2], [30000000, .25], [Infinity, .25]], joint: [], head: [] } }],
    regions: [
      { id: 'MM-YG', name: 'Yangon', code: 'MM-YG', cities: ['Yangon'], counties: [], propertyTax: 0.1, salesTax: 5, flatTax: 0, medianIncome: 6000000, costOfLivingIndex: 30, taxStructure: 'Progressive PIT', statuteCitation: 'Union Tax Law', governingBody: 'IRD', description: 'National progressive PIT.', taxRegime: 'national' },
    ],
  },
  LA: {
    name: 'Laos', legalBody: 'Tax Department of Laos', rules: 'Progressive personal income tax on employment. VAT 10%.',
    currency: 'LAK', symbol: '₭', regionLabel: 'Province', taxYear: '2025',
    source: { name: 'Tax Department Laos', url: 'https://www.tax.gov.la/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 1300000, joint: 1300000, head: 1300000 }, federal: { single: [[1300000, 0], [3700000, .05], [7400000, .1], [15000000, .15], [30000000, .2], [40000000, .25], [Infinity, .3]], joint: [], head: [] } }],
    regions: [
      { id: 'LA-VT', name: 'Vientiane Capital', code: 'LA-VT', cities: ['Vientiane'], counties: [], propertyTax: 0.1, salesTax: 10, flatTax: 0, medianIncome: 24000000, costOfLivingIndex: 32, taxStructure: 'Progressive PIT', statuteCitation: 'Tax Law', governingBody: 'Tax Department', description: 'National progressive PIT.', taxRegime: 'national' },
    ],
  },
  BO: {
    name: 'Bolivia', legalBody: 'Servicio de Impuestos Nacionales (SIN)', rules: 'RC-IVA 13% on employment with a multiple of the national minimum wage as a non-taxable floor. IVA 13%.',
    currency: 'BOB', symbol: 'Bs', regionLabel: 'Department', taxYear: '2025',
    source: { name: 'SIN Bolivia', url: 'https://www.impuestos.gob.bo/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[Infinity, .13]], joint: [], head: [] } }],
    regions: [
      { id: 'BO-L', name: 'La Paz', code: 'BO-L', cities: ['La Paz', 'El Alto'], counties: [], propertyTax: 0.3, salesTax: 13, flatTax: 0.13, medianIncome: 36000, costOfLivingIndex: 30, taxStructure: 'RC-IVA 13%', statuteCitation: 'Ley 843', governingBody: 'SIN', description: 'National RC-IVA on employment.', taxRegime: 'national' },
      { id: 'BO-S', name: 'Santa Cruz', code: 'BO-S', cities: ['Santa Cruz de la Sierra'], counties: [], propertyTax: 0.3, salesTax: 13, flatTax: 0.13, medianIncome: 40000, costOfLivingIndex: 32, taxStructure: 'RC-IVA 13%', statuteCitation: 'Ley 843', governingBody: 'SIN Santa Cruz', description: 'Same national RC-IVA.', taxRegime: 'national' },
    ],
  },
  PY: {
    name: 'Paraguay', legalBody: 'Subsecretaría de Estado de Tributación (SET)', rules: 'IRP progressive small-band personal tax. IVA 10%. Social security (IPS) is separate.',
    currency: 'PYG', symbol: '₲', regionLabel: 'Department', taxYear: '2025',
    source: { name: 'SET Paraguay', url: 'https://www.set.gov.py/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[50000000, .08], [80000000, .09], [Infinity, .1]], joint: [], head: [] } }],
    regions: [
      { id: 'PY-ASU', name: 'Asunción', code: 'PY-ASU', cities: ['Asunción'], counties: [], propertyTax: 0.5, salesTax: 10, flatTax: 0, medianIncome: 48000000, costOfLivingIndex: 32, taxStructure: 'Progressive IRP', statuteCitation: 'Ley 6380/2019', governingBody: 'SET', description: 'National IRP bands.', taxRegime: 'national' },
    ],
  },

  MO: {
    name: 'Macao SAR', legalBody: 'Financial Services Bureau (DSF)', rules: 'Complementary tax and professional tax are territorial. Salaries tax is progressive on Macao-source employment. Not taxed as mainland China.',
    currency: 'MOP', symbol: 'MOP$', regionLabel: 'Parish', taxYear: '2025',
    source: { name: 'DSF Macao', url: 'https://www.dsf.gov.mo/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 144000, joint: 144000, head: 144000 }, federal: { single: [[144000, 0], [164000, .07], [184000, .08], [224000, .09], [304000, .1], [424000, .11], [Infinity, .12]], joint: [], head: [] } }],
    regions: [{ id: 'MO-MO', name: 'Macao Peninsula / Taipa / Coloane', code: 'MO-MO', cities: ['NAPE', 'Taipa'], counties: [], propertyTax: 0.16, salesTax: 0, flatTax: 0, medianIncome: 240000, costOfLivingIndex: 92, taxStructure: 'Territorial salaries tax', statuteCitation: 'Professional Tax Regulation', governingBody: 'DSF', description: 'Independent SAR tax system.', taxRegime: 'territorial', divergenceNote: 'Macao is not taxed under mainland China individual income tax. Salaries tax is territorial and locally administered.' }],
  },
  GL: {
    name: 'Greenland', legalBody: 'Aka (Greenland Tax Agency)', rules: 'Greenland has its own income tax, not Danish kommuneskat. Municipal tax plus national tax apply to residents.',
    currency: 'DKK', symbol: 'kr', regionLabel: 'Municipality', taxYear: '2025',
    source: { name: 'Aka Greenland', url: 'https://aka.gl/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 58000, joint: 58000, head: 58000 }, federal: { single: [[Infinity, .42]], joint: [], head: [] } }],
    regions: [{ id: 'GL-SM', name: 'Sermersooq (Nuuk)', code: 'GL-SM', cities: ['Nuuk'], counties: [], propertyTax: 0, salesTax: 0, flatTax: 0.42, medianIncome: 380000, costOfLivingIndex: 125, taxStructure: 'Greenland income tax (not Denmark)', statuteCitation: 'Greenland Income Tax Act', governingBody: 'Aka', description: 'Independent tax jurisdiction from Denmark.', taxRegime: 'territorial', divergenceNote: 'Greenland is not taxed as Denmark. Municipal and national Greenland rates apply.' }],
  },
  FO: {
    name: 'Faroe Islands', legalBody: 'TAKS', rules: 'The Faroe Islands levy their own income tax. Danish Skattestyrelsen rules do not apply.',
    currency: 'DKK', symbol: 'kr', regionLabel: 'Municipality', taxYear: '2025',
    source: { name: 'TAKS Faroe Islands', url: 'https://www.taks.fo/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 30000, joint: 30000, head: 30000 }, federal: { single: [[Infinity, .35]], joint: [], head: [] } }],
    regions: [{ id: 'FO-TO', name: 'Tórshavn', code: 'FO-TO', cities: ['Tórshavn'], counties: [], propertyTax: 0, salesTax: 25, flatTax: 0.35, medianIncome: 420000, costOfLivingIndex: 115, taxStructure: 'Faroese income tax', statuteCitation: 'Faroese Tax Act', governingBody: 'TAKS', description: 'Independent from Danish income tax.', taxRegime: 'territorial', divergenceNote: 'The Faroe Islands are not taxed as Denmark.' }],
  },
  GI: {
    name: 'Gibraltar', legalBody: 'Gibraltar Income Tax Office', rules: 'Gross Income Based System (GIBS) or Allowance Based System. Not UK PAYE/HMRC Income Tax.',
    currency: 'GIP', symbol: '£', regionLabel: 'Area', taxYear: '2025/26',
    source: { name: 'Gibraltar Income Tax Office', url: 'https://www.gibraltar.gov.gi/' },
    years: [{ id: '2025/26', label: '2025/26', deduction: { single: 3203, joint: 3203, head: 3203 }, federal: { single: [[17000, .14], [8000, .17], [8000, .19], [15000, .25], [25000, .28], [32000, .35], [Infinity, .39]], joint: [], head: [] } }],
    regions: [{ id: 'GI-GI', name: 'Gibraltar', code: 'GI-GI', cities: ['Gibraltar'], counties: [], propertyTax: 0, salesTax: 0, flatTax: 0, medianIncome: 35000, costOfLivingIndex: 108, taxStructure: 'GIBS / allowance-based', statuteCitation: 'Income Tax Act 2010', governingBody: 'Income Tax Office', description: 'British Overseas Territory with its own income tax. Not HMRC.', taxRegime: 'territorial', divergenceNote: 'Gibraltar is not taxed as the United Kingdom. HMRC PAYE bands are not used.' }],
  },
  IM: {
    name: 'Isle of Man', legalBody: 'Isle of Man Treasury – Income Tax Division', rules: '10% standard rate and 22% higher rate with a personal allowance. Not UK Income Tax.',
    currency: 'GBP', symbol: '£', regionLabel: 'Sheading', taxYear: '2025/26',
    source: { name: 'Isle of Man Income Tax', url: 'https://www.gov.im/categories/tax-vat-and-your-money/income-tax/' },
    years: [{ id: '2025/26', label: '2025/26', deduction: { single: 14500, joint: 29000, head: 14500 }, federal: { single: [[6500, .1], [Infinity, .22]], joint: [], head: [] } }],
    regions: [{ id: 'IM-DO', name: 'Douglas', code: 'IM-DO', cities: ['Douglas', 'Onchan'], counties: [], propertyTax: 0, salesTax: 20, flatTax: 0, medianIncome: 38000, costOfLivingIndex: 102, taxStructure: '10%/22% Manx income tax', statuteCitation: 'Income Tax Act 1970 (Isle of Man)', governingBody: 'Treasury Income Tax Division', description: 'Crown Dependency. Not UK PAYE.', taxRegime: 'territorial', divergenceNote: 'The Isle of Man is not taxed as the United Kingdom.' }],
  },
  JE: {
    name: 'Jersey', legalBody: 'Revenue Jersey', rules: 'Standard 20% income tax with exemptions and marginal relief. Not UK HMRC.',
    currency: 'GBP', symbol: '£', regionLabel: 'Parish', taxYear: '2025',
    source: { name: 'Revenue Jersey', url: 'https://www.gov.je/taxesmoney/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 20150, joint: 32350, head: 20150 }, federal: { single: [[Infinity, .20]], joint: [], head: [] } }],
    regions: [{ id: 'JE-STH', name: 'St Helier', code: 'JE-STH', cities: ['St Helier'], counties: [], propertyTax: 0, salesTax: 5, flatTax: 0.20, medianIncome: 42000, costOfLivingIndex: 118, taxStructure: 'Standard 20% with exemption', statuteCitation: 'Income Tax (Jersey) Law 1961', governingBody: 'Revenue Jersey', description: 'Crown Dependency with its own tax law.', taxRegime: 'territorial', divergenceNote: 'Jersey is not taxed as the United Kingdom.' }],
  },
  GG: {
    name: 'Guernsey', legalBody: 'Revenue Service Guernsey', rules: 'Flat 20% income tax with personal allowances. Alderney is assessed under Guernsey; Sark is separate and not modeled here.',
    currency: 'GBP', symbol: '£', regionLabel: 'Parish', taxYear: '2025',
    source: { name: 'Revenue Service Guernsey', url: 'https://www.gov.gg/tax' },
    years: [{ id: '2025', label: '2025', deduction: { single: 13500, joint: 27000, head: 13500 }, federal: { single: [[Infinity, .20]], joint: [], head: [] } }],
    regions: [{ id: 'GG-SPP', name: 'St Peter Port', code: 'GG-SPP', cities: ['St Peter Port'], counties: [], propertyTax: 0, salesTax: 0, flatTax: 0.20, medianIncome: 40000, costOfLivingIndex: 116, taxStructure: 'Flat 20%', statuteCitation: 'Income Tax (Guernsey) Law 1975', governingBody: 'Revenue Service', description: 'Crown Dependency. Not UK PAYE.', taxRegime: 'territorial', divergenceNote: 'Guernsey is not taxed as the United Kingdom.' }],
  },
  BM: {
    name: 'Bermuda', legalBody: 'Office of the Tax Commissioner', rules: 'No personal income tax on wages. Payroll tax is levied on employers and employees as a wage tax substitute. Not a US or UK income-tax schedule.',
    currency: 'BMD', symbol: '$', regionLabel: 'Parish', taxYear: '2025',
    source: { name: 'Bermuda Tax Commissioner', url: 'https://www.gov.bm/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[Infinity, 0]], joint: [], head: [] } }],
    regions: [{ id: 'BM-HA', name: 'Hamilton', code: 'BM-HA', cities: ['Hamilton'], counties: [], propertyTax: 0, salesTax: 0, flatTax: 0, medianIncome: 72000, costOfLivingIndex: 145, taxStructure: 'No wage income tax; payroll tax optional here', statuteCitation: 'Payroll Tax Act 1995', governingBody: 'Office of the Tax Commissioner', description: 'British Overseas Territory. No PIT on wages.', taxRegime: 'no-wage-tax', divergenceNote: 'Bermuda is not taxed as the UK or US. There is no personal income tax on employment wages.' }],
  },
  KY: {
    name: 'Cayman Islands', legalBody: 'Department of International Tax Cooperation', rules: 'No personal income tax, capital gains tax, or payroll income tax on wages. Import duties fund government.',
    currency: 'KYD', symbol: 'CI$', regionLabel: 'Island', taxYear: '2025',
    source: { name: 'Cayman Islands Government', url: 'https://www.gov.ky/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[Infinity, 0]], joint: [], head: [] } }],
    regions: [{ id: 'KY-GC', name: 'Grand Cayman (George Town)', code: 'KY-GC', cities: ['George Town', 'West Bay'], counties: [], propertyTax: 0, salesTax: 0, flatTax: 0, medianIncome: 55000, costOfLivingIndex: 128, taxStructure: 'No wage income tax', statuteCitation: 'No PIT on wages', governingBody: 'Cayman Islands Government', description: 'British Overseas Territory. Not UK or US tax.', taxRegime: 'no-wage-tax', divergenceNote: 'The Cayman Islands are not taxed as the United Kingdom or the United States.' }],
  },
  AW: {
    name: 'Aruba', legalBody: 'Departamento di Impuesto', rules: 'Wage tax (loonbelasting) and income tax (inkomstenbelasting) are Aruban. Not Netherlands Box 1.',
    currency: 'AWG', symbol: 'ƒ', regionLabel: 'District', taxYear: '2025',
    source: { name: 'Impuesto Aruba', url: 'https://www.impuesto.aw/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 21618, joint: 21618, head: 21618 }, federal: { single: [[34930, .14], [65904, .25], [Infinity, .42]], joint: [], head: [] } }],
    regions: [{ id: 'AW-OR', name: 'Oranjestad', code: 'AW-OR', cities: ['Oranjestad'], counties: [], propertyTax: 0.4, salesTax: 7, flatTax: 0, medianIncome: 38000, costOfLivingIndex: 88, taxStructure: 'Aruban wage/income tax', statuteCitation: 'Landsverordening inkomstenbelasting', governingBody: 'Departamento di Impuesto', description: 'Constituent country of the Kingdom of the Netherlands with its own tax.', taxRegime: 'territorial', divergenceNote: 'Aruba is not taxed as the Netherlands. Dutch Box 1 rates are not used.' }],
  },
  CW: {
    name: 'Curaçao', legalBody: 'Belastingdienst Curaçao', rules: 'Income tax (inkomstenbelasting) is Curaçaoan. Not Netherlands Box 1.',
    currency: 'ANG', symbol: 'ƒ', regionLabel: 'District', taxYear: '2025',
    source: { name: 'Belastingdienst Curaçao', url: 'https://www.belastingdienst.cw/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[32388, .098], [Infinity, .465]], joint: [], head: [] } }],
    regions: [{ id: 'CW-WIL', name: 'Willemstad', code: 'CW-WIL', cities: ['Willemstad'], counties: [], propertyTax: 0.4, salesTax: 6, flatTax: 0, medianIncome: 32000, costOfLivingIndex: 82, taxStructure: 'Curaçao income tax', statuteCitation: 'Landsverordening op de inkomstenbelasting', governingBody: 'Belastingdienst Curaçao', description: 'Constituent country in the Kingdom of the Netherlands with its own tax.', taxRegime: 'territorial', divergenceNote: 'Curaçao is not taxed as the Netherlands.' }],
  },
  NC: {
    name: 'New Caledonia', legalBody: 'Direction des Services Fiscaux de Nouvelle-Calédonie', rules: 'IRPP is local. French CGI metropolitan rates are not used.',
    currency: 'XPF', symbol: '₣', regionLabel: 'Province', taxYear: '2025',
    source: { name: 'DSF Nouvelle-Calédonie', url: 'https://dsf.gouv.nc/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[1000000, 0], [1800000, .04], [3000000, .12], [4500000, .18], [Infinity, .25]], joint: [], head: [] } }],
    regions: [{ id: 'NC-SU', name: 'South Province (Nouméa)', code: 'NC-SU', cities: ['Nouméa'], counties: [], propertyTax: 0.2, salesTax: 0, flatTax: 0, medianIncome: 3200000, costOfLivingIndex: 118, taxStructure: 'Local IRPP', statuteCitation: 'Code des impôts de Nouvelle-Calédonie', governingBody: 'DSF', description: 'French overseas collectivity with its own tax code.', taxRegime: 'territorial', divergenceNote: 'New Caledonia is not taxed as metropolitan France.' }],
  },
  PF: {
    name: 'French Polynesia', legalBody: 'Direction des Impôts de Polynésie française', rules: 'Contribution de solidarité territoriale (CST) and local taxes. Metropolitan French IR is not used.',
    currency: 'XPF', symbol: '₣', regionLabel: 'Archipelago', taxYear: '2025',
    source: { name: 'Impôts Polynésie française', url: 'https://www.impots.gov.pf/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[150000, 0], [250000, .05], [400000, .1], [700000, .15], [Infinity, .2]], joint: [], head: [] } }],
    regions: [{ id: 'PF-TAE', name: 'Windward Islands (Papeete)', code: 'PF-TAE', cities: ['Papeete', 'Faaa'], counties: [], propertyTax: 0.2, salesTax: 16, flatTax: 0, medianIncome: 2800000, costOfLivingIndex: 122, taxStructure: 'CST / local income contribution', statuteCitation: 'Code des impôts de Polynésie française', governingBody: 'Direction des Impôts', description: 'Overseas collectivity with its own tax.', taxRegime: 'territorial', divergenceNote: 'French Polynesia is not taxed as metropolitan France.' }],
  },
  AX: {
    name: 'Åland', legalBody: 'Ålands landskapsregering / Skatteförvaltningen', rules: 'Åland is an autonomous region of Finland with its own municipal tax and some tax competence. Finnish state tax still exists, but municipal rates are Åland-set.',
    currency: 'EUR', symbol: '€', regionLabel: 'Municipality', taxYear: '2025',
    source: { name: 'Åland government', url: 'https://www.regeringen.ax/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[20500, .1264], [30500, .19], [50400, .3025], [88200, .3425], [150000, .4425], [Infinity, .4425]], joint: [], head: [] } }],
    regions: [{ id: 'AX-MH', name: 'Mariehamn', code: 'AX-MH', cities: ['Mariehamn'], counties: [], propertyTax: 0.4, salesTax: 25.5, flatTax: 0.175, medianIncome: 38000, costOfLivingIndex: 108, taxStructure: 'Finnish state tax + Åland municipal tax', statuteCitation: 'Åland Autonomy Act; Tuloverolaki', governingBody: 'Åland government / Vero', description: 'Autonomous jurisdiction. Municipal tax is not mainland Finnish kommuneskat.', taxRegime: 'devolved', divergenceNote: 'Åland is not taxed as a typical Finnish municipality. It is an autonomous jurisdiction with its own municipal tax setting.' }],
  },
  AL: {
    name: 'Albania', legalBody: 'Drejtoria e Përgjithshme e Tatimeve', rules: 'Progressive employment tax 13%/23% with a tax-free threshold.',
    currency: 'ALL', symbol: 'L', regionLabel: 'County', taxYear: '2025',
    source: { name: 'Albanian Tax Administration', url: 'https://www.tatime.gov.al/' },
    years: [{ id: '2024', label: '2024', deduction: { single: 40000, joint: 40000, head: 40000 }, federal: { single: [[50000, .13], [Infinity, .23]], joint: [], head: [] } }, { id: '2025', label: '2025', deduction: { single: 40000, joint: 40000, head: 40000 }, federal: { single: [[50000, .13], [Infinity, .23]], joint: [], head: [] } }],
    regions: [
      { id: 'AL-TR', name: 'Tirana', code: 'AL-TR', cities: ['Tirana'], counties: [], propertyTax: 0.1, salesTax: 20, flatTax: 0, medianIncome: 720000, costOfLivingIndex: 38, taxStructure: 'Progressive 13%/23%', statuteCitation: 'Income Tax Law', governingBody: 'DPT', description: 'National progressive employment tax.', taxRegime: 'national' },
      { id: 'AL-DR', name: 'Durrës', code: 'AL-DR', cities: ['Durrës'], counties: [], propertyTax: 0.1, salesTax: 20, flatTax: 0, medianIncome: 600000, costOfLivingIndex: 34, taxStructure: 'Progressive 13%/23%', statuteCitation: 'Income Tax Law', governingBody: 'DPT Durrës', description: 'Port city; same national rates.', taxRegime: 'national' },
    ],
  },
  MK: {
    name: 'North Macedonia', legalBody: 'Public Revenue Office', rules: 'Flat 10% personal income tax on employment. Social contributions are separate.',
    currency: 'MKD', symbol: 'ден', regionLabel: 'Region', taxYear: '2025',
    source: { name: 'PRO North Macedonia', url: 'https://www.ujp.gov.mk/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[Infinity, .10]], joint: [], head: [] } }],
    regions: [
      { id: 'MK-SK', name: 'Skopje', code: 'MK-SK', cities: ['Skopje'], counties: [], propertyTax: 0.1, salesTax: 18, flatTax: 0.10, medianIncome: 480000, costOfLivingIndex: 36, taxStructure: 'Flat 10%', statuteCitation: 'Personal Income Tax Law', governingBody: 'PRO', description: 'National flat PIT.', taxRegime: 'national' },
    ],
  },

  CR: {
    name: 'Costa Rica', legalBody: 'Dirección General de Tributación', rules: 'Progressive salary tax after a monthly exemption. CCSS social charges are separate and optional here.',
    currency: 'CRC', symbol: '₡', regionLabel: 'Province', taxYear: '2025',
    source: { name: 'Hacienda Costa Rica', url: 'https://www.hacienda.go.cr/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[929000, 0], [1363000, .1], [2392000, .15], [4783000, .2], [Infinity, .25]], joint: [], head: [] } }],
    regions: [
      { id: 'CR-SJ', name: 'San José', code: 'CR-SJ', cities: ['San José', 'Escazú'], counties: [{ id: 'CR-SJ-C', name: 'Central canton', seat: 'San José', population: 340000, medianIncome: 7200000, propertyTaxRate: 0.25, localSalesTaxRate: 0, localIncomeTaxRate: 0, rules: 'Municipal property tax (bienes inmuebles). No local wage tax. Off by default.' }], propertyTax: 0.25, salesTax: 13, flatTax: 0, medianIncome: 7000000, costOfLivingIndex: 42, taxStructure: 'Progressive salary tax', statuteCitation: 'Ley del Impuesto sobre la Renta', governingBody: 'DGT', description: 'National progressive salary tax.', taxRegime: 'national' },
      { id: 'CR-A', name: 'Alajuela', code: 'CR-A', cities: ['Alajuela'], counties: [], propertyTax: 0.22, salesTax: 13, flatTax: 0, medianIncome: 6000000, costOfLivingIndex: 38, taxStructure: 'Progressive salary tax', statuteCitation: 'LISR', governingBody: 'DGT Alajuela', description: 'Same national rates.', taxRegime: 'national' },
    ],
  },
  PA: {
    name: 'Panama', legalBody: 'Dirección General de Ingresos (DGI)', rules: 'Progressive income tax with a tax-free band. CSS social security is separate.',
    currency: 'PAB', symbol: 'B/.', regionLabel: 'Province', taxYear: '2025',
    source: { name: 'DGI Panama', url: 'https://dgi.mef.gob.pa/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 11000, joint: 11000, head: 11000 }, federal: { single: [[50000, .15], [Infinity, .25]], joint: [], head: [] } }],
    regions: [
      { id: 'PA-8', name: 'Panamá Province', code: 'PA-8', cities: ['Panama City', 'San Miguelito'], counties: [], propertyTax: 0.7, salesTax: 7, flatTax: 0, medianIncome: 18000, costOfLivingIndex: 48, taxStructure: 'Progressive with exemption', statuteCitation: 'Código Fiscal', governingBody: 'DGI', description: 'National progressive IR.', taxRegime: 'national' },
    ],
  },
  DO: {
    name: 'Dominican Republic', legalBody: 'Dirección General de Impuestos Internos (DGII)', rules: 'Progressive ISR on annual employment income after a tax-free threshold. TSS social security is separate.',
    currency: 'DOP', symbol: 'RD$', regionLabel: 'Province', taxYear: '2025',
    source: { name: 'DGII', url: 'https://dgii.gov.do/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 416220, joint: 416220, head: 416220 }, federal: { single: [[208110, .15], [416220, .2], [572760, .25], [Infinity, .25]], joint: [], head: [] } }],
    regions: [
      { id: 'DO-01', name: 'Distrito Nacional (Santo Domingo)', code: 'DO-01', cities: ['Santo Domingo'], counties: [], propertyTax: 1.0, salesTax: 18, flatTax: 0, medianIncome: 480000, costOfLivingIndex: 40, taxStructure: 'Progressive ISR', statuteCitation: 'Código Tributario', governingBody: 'DGII', description: 'National progressive ISR.', taxRegime: 'national' },
    ],
  },
  GT: {
    name: 'Guatemala', legalBody: 'Superintendencia de Administración Tributaria (SAT)', rules: 'Employment income 5% or 7% under the simplified regime after a personal allowance. IVA 12%.',
    currency: 'GTQ', symbol: 'Q', regionLabel: 'Department', taxYear: '2025',
    source: { name: 'SAT Guatemala', url: 'https://portal.sat.gob.gt/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 48000, joint: 48000, head: 48000 }, federal: { single: [[300000, .05], [Infinity, .07]], joint: [], head: [] } }],
    regions: [
      { id: 'GT-01', name: 'Guatemala Department', code: 'GT-01', cities: ['Guatemala City', 'Mixco'], counties: [], propertyTax: 0.9, salesTax: 12, flatTax: 0, medianIncome: 48000, costOfLivingIndex: 38, taxStructure: '5%/7% employment ISR', statuteCitation: 'Ley del ISR', governingBody: 'SAT', description: 'National two-rate ISR.', taxRegime: 'national' },
    ],
  },
  JM: {
    name: 'Jamaica', legalBody: 'Tax Administration Jamaica (TAJ)', rules: 'Flat 25% PAYE above a tax-free threshold, with a higher band for very high income. NIS/NHT are separate.',
    currency: 'JMD', symbol: 'J$', regionLabel: 'Parish', taxYear: '2025',
    source: { name: 'TAJ', url: 'https://www.jamaicatax.gov.jm/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 1500000, joint: 1500000, head: 1500000 }, federal: { single: [[6000000, .25], [Infinity, .3]], joint: [], head: [] } }],
    regions: [
      { id: 'JM-01', name: 'Kingston', code: 'JM-01', cities: ['Kingston', 'New Kingston'], counties: [], propertyTax: 0.5, salesTax: 15, flatTax: 0, medianIncome: 1200000, costOfLivingIndex: 44, taxStructure: 'PAYE 25%/30%', statuteCitation: 'Income Tax Act', governingBody: 'TAJ', description: 'National PAYE.', taxRegime: 'national' },
    ],
  },
  TT: {
    name: 'Trinidad and Tobago', legalBody: 'Inland Revenue Division', rules: 'Personal allowance then 25% and 30% bands. NIS is separate.',
    currency: 'TTD', symbol: 'TT$', regionLabel: 'Region', taxYear: '2025',
    source: { name: 'IRD Trinidad and Tobago', url: 'https://www.ird.gov.tt/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 90000, joint: 90000, head: 90000 }, federal: { single: [[1000000, .25], [Infinity, .3]], joint: [], head: [] } }],
    regions: [
      { id: 'TT-POS', name: 'Port of Spain', code: 'TT-POS', cities: ['Port of Spain'], counties: [], propertyTax: 0.3, salesTax: 12.5, flatTax: 0, medianIncome: 90000, costOfLivingIndex: 52, taxStructure: '25%/30% after allowance', statuteCitation: 'Income Tax Act', governingBody: 'IRD', description: 'National personal income tax.', taxRegime: 'national' },
    ],
  },
  FJ: {
    name: 'Fiji', legalBody: 'Fiji Revenue and Customs Service', rules: 'Progressive PAYE with a tax-free threshold. FNPF is separate.',
    currency: 'FJD', symbol: 'FJ$', regionLabel: 'Division', taxYear: '2025',
    source: { name: 'FRCS', url: 'https://www.frcs.org.fj/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 30000, joint: 30000, head: 30000 }, federal: { single: [[20000, .18], [20000, .2], [30000, .24], [Infinity, .32]], joint: [], head: [] } }],
    regions: [
      { id: 'FJ-C', name: 'Central (Suva)', code: 'FJ-C', cities: ['Suva'], counties: [], propertyTax: 0.2, salesTax: 15, flatTax: 0, medianIncome: 28000, costOfLivingIndex: 48, taxStructure: 'Progressive PAYE', statuteCitation: 'Income Tax Act 2015', governingBody: 'FRCS', description: 'National PAYE.', taxRegime: 'national' },
    ],
  },
  MV: {
    name: 'Maldives', legalBody: 'Maldives Inland Revenue Authority (MIRA)', rules: 'Resident personal income tax with a tax-free threshold then 15%/20%. GST 8%/16% on tourism.',
    currency: 'MVR', symbol: 'Rf', regionLabel: 'Atoll', taxYear: '2025',
    source: { name: 'MIRA', url: 'https://www.mira.gov.mv/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 720000, joint: 720000, head: 720000 }, federal: { single: [[480000, .15], [Infinity, .2]], joint: [], head: [] } }],
    regions: [
      { id: 'MV-MLE', name: 'Malé', code: 'MV-MLE', cities: ['Malé', 'Hulhumalé'], counties: [], propertyTax: 0, salesTax: 8, flatTax: 0, medianIncome: 180000, costOfLivingIndex: 62, taxStructure: 'PIT with tax-free band', statuteCitation: 'Income Tax Act', governingBody: 'MIRA', description: 'National PIT.', taxRegime: 'national' },
    ],
  },
  BT: {
    name: 'Bhutan', legalBody: 'Department of Revenue and Customs', rules: 'Progressive PIT with a tax-free threshold. Rural taxes are local and optional here.',
    currency: 'BTN', symbol: 'Nu.', regionLabel: 'Dzongkhag', taxYear: '2025',
    source: { name: 'DRC Bhutan', url: 'https://www.drc.gov.bt/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 300000, joint: 300000, head: 300000 }, federal: { single: [[100000, .1], [150000, .15], [250000, .2], [Infinity, .25]], joint: [], head: [] } }],
    regions: [
      { id: 'BT-15', name: 'Thimphu', code: 'BT-15', cities: ['Thimphu'], counties: [], propertyTax: 0.1, salesTax: 0, flatTax: 0, medianIncome: 280000, costOfLivingIndex: 40, taxStructure: 'Progressive PIT', statuteCitation: 'Income Tax Act of Bhutan', governingBody: 'DRC', description: 'National PIT.', taxRegime: 'national' },
    ],
  },
  MD: {
    name: 'Moldova', legalBody: 'Serviciul Fiscal de Stat', rules: 'Flat 12% personal income tax. Social and health contributions are separate.',
    currency: 'MDL', symbol: 'L', regionLabel: 'Municipality', taxYear: '2025',
    source: { name: 'SFS Moldova', url: 'https://sfs.md/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 27000, joint: 27000, head: 27000 }, federal: { single: [[Infinity, .12]], joint: [], head: [] } }],
    regions: [
      { id: 'MD-CU', name: 'Chișinău', code: 'MD-CU', cities: ['Chișinău'], counties: [], propertyTax: 0.2, salesTax: 20, flatTax: 0.12, medianIncome: 120000, costOfLivingIndex: 36, taxStructure: 'Flat 12%', statuteCitation: 'Tax Code of Moldova', governingBody: 'SFS', description: 'National flat PIT.', taxRegime: 'national' },
    ],
  },
  BA: {
    name: 'Bosnia and Herzegovina', legalBody: 'Indirect Taxation Authority / entity tax administrations', rules: 'Personal income tax is entity-level (FBiH 10%, RS 8–10%). Not a single state wage tax. Federation and Republika Srpska are modeled as regions with different rules.',
    currency: 'BAM', symbol: 'KM', regionLabel: 'Entity', taxYear: '2025',
    source: { name: 'UINO / entity tax offices', url: 'https://www.uino.gov.ba/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 300, joint: 300, head: 300 }, federal: { single: [[Infinity, .10]], joint: [], head: [] } }],
    regions: [
      { id: 'BA-BIH', name: 'Federation of Bosnia and Herzegovina (Sarajevo)', code: 'BA-BIH', cities: ['Sarajevo', 'Mostar'], counties: [], propertyTax: 0.1, salesTax: 17, flatTax: 0.10, medianIncome: 18000, costOfLivingIndex: 38, taxStructure: 'FBiH 10% PIT', statuteCitation: 'FBiH Income Tax Law', governingBody: 'FBiH Tax Administration', description: 'Entity income tax, not a single state-wide wage tax.', taxRegime: 'devolved', divergenceNote: 'FBiH income tax is not Republika Srpska tax. Entity rules apply.' },
      { id: 'BA-SRP', name: 'Republika Srpska (Banja Luka)', code: 'BA-SRP', cities: ['Banja Luka'], counties: [], propertyTax: 0.1, salesTax: 17, flatTax: 0.08, medianIncome: 16000, costOfLivingIndex: 36, taxStructure: 'RS PIT', statuteCitation: 'RS Income Tax Law', governingBody: 'RS Tax Administration', description: 'Separate entity tax from FBiH.', taxRegime: 'devolved', divergenceNote: 'Republika Srpska is not taxed as FBiH.' },
    ],
  },
  ME: {
    name: 'Montenegro', legalBody: 'Poreska uprava Crne Gore', rules: 'Progressive 9%/15% personal income tax. Municipal surtax may apply and is optional here.',
    currency: 'EUR', symbol: '€', regionLabel: 'Municipality', taxYear: '2025',
    source: { name: 'Tax Administration of Montenegro', url: 'https://www.poreskauprava.gov.me/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 700, joint: 700, head: 700 }, federal: { single: [[1000, .09], [Infinity, .15]], joint: [], head: [] } }],
    regions: [
      { id: 'ME-PG', name: 'Podgorica', code: 'ME-PG', cities: ['Podgorica'], counties: [{ id: 'ME-PG-C', name: 'Capital City', seat: 'Podgorica', population: 190000, medianIncome: 14000, propertyTaxRate: 0.3, localSalesTaxRate: 0, localIncomeTaxRate: 13, rules: 'Municipal surtax on income tax exists; off by default.' }], propertyTax: 0.3, salesTax: 21, flatTax: 0, medianIncome: 13500, costOfLivingIndex: 44, taxStructure: '9%/15% plus optional municipal surtax', statuteCitation: 'Personal Income Tax Law', governingBody: 'Poreska uprava', description: 'National PIT; municipal surtax optional.', taxRegime: 'local-surtax' },
    ],
  },
  NA: {
    name: 'Namibia', legalBody: 'Inland Revenue / NamRA', rules: 'Progressive PAYE with a tax-free threshold. Social security is separate.',
    currency: 'NAD', symbol: 'N$', regionLabel: 'Region', taxYear: '2025/26',
    source: { name: 'NamRA', url: 'https://www.namra.org.na/' },
    years: [{ id: '2025/26', label: '2025/26', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[50000, 0], [50000, .18], [100000, .25], [200000, .28], [400000, .3], [800000, .32], [Infinity, .37]], joint: [], head: [] } }],
    regions: [
      { id: 'NA-KH', name: 'Khomas (Windhoek)', code: 'NA-KH', cities: ['Windhoek'], counties: [], propertyTax: 0.4, salesTax: 15, flatTax: 0, medianIncome: 180000, costOfLivingIndex: 42, taxStructure: 'Progressive PAYE', statuteCitation: 'Income Tax Act 24 of 1981', governingBody: 'NamRA', description: 'National PAYE.', taxRegime: 'national' },
    ],
  },
  BW: {
    name: 'Botswana', legalBody: 'BURS', rules: 'Progressive PAYE with a tax-free threshold. BURS administers national tax.',
    currency: 'BWP', symbol: 'P', regionLabel: 'District', taxYear: '2025/26',
    source: { name: 'BURS', url: 'https://www.burs.org.bw/' },
    years: [{ id: '2025/26', label: '2025/26', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[48000, 0], [48000, .05], [60000, .125], [84000, .1875], [Infinity, .25]], joint: [], head: [] } }],
    regions: [
      { id: 'BW-SE', name: 'South-East (Gaborone)', code: 'BW-SE', cities: ['Gaborone'], counties: [], propertyTax: 0.3, salesTax: 14, flatTax: 0, medianIncome: 80000, costOfLivingIndex: 40, taxStructure: 'Progressive PAYE', statuteCitation: 'Income Tax Act', governingBody: 'BURS', description: 'National PAYE.', taxRegime: 'national' },
    ],
  },
  MU: {
    name: 'Mauritius', legalBody: 'Mauritius Revenue Authority (MRA)', rules: 'Progressive PIT 0%/10%/20% after an income exemption threshold. CSG and NSF are separate.',
    currency: 'MUR', symbol: 'Rs', regionLabel: 'District', taxYear: '2025/26',
    source: { name: 'MRA', url: 'https://www.mra.mu/' },
    years: [{ id: '2025/26', label: '2025/26', deduction: { single: 325000, joint: 325000, head: 325000 }, federal: { single: [[390000, .1], [Infinity, .2]], joint: [], head: [] } }],
    regions: [
      { id: 'MU-PL', name: 'Port Louis', code: 'MU-PL', cities: ['Port Louis'], counties: [], propertyTax: 0.2, salesTax: 15, flatTax: 0, medianIncome: 420000, costOfLivingIndex: 46, taxStructure: '10%/20% after exemption', statuteCitation: 'Income Tax Act', governingBody: 'MRA', description: 'National PIT.', taxRegime: 'national' },
    ],
  },
  RW: {
    name: 'Rwanda', legalBody: 'Rwanda Revenue Authority (RRA)', rules: 'PAYE 0%/20%/30% on monthly employment income. RSSB is separate.',
    currency: 'RWF', symbol: 'FRw', regionLabel: 'Province', taxYear: '2025',
    source: { name: 'RRA', url: 'https://www.rra.gov.rw/' },
    years: [{ id: '2025', label: '2025', deduction: { single: 0, joint: 0, head: 0 }, federal: { single: [[60000, 0], [100000, .2], [Infinity, .3]], joint: [], head: [] } }],
    regions: [
      { id: 'RW-01', name: 'Kigali', code: 'RW-01', cities: ['Kigali'], counties: [], propertyTax: 0.1, salesTax: 18, flatTax: 0, medianIncome: 2400000, costOfLivingIndex: 36, taxStructure: 'PAYE 0/20/30', statuteCitation: 'Law on Income Tax', governingBody: 'RRA', description: 'National PAYE.', taxRegime: 'national' },
    ],
  },

};

expandRegionalCoverage(countries);

export const countryOptions = Object.entries(countries)
  .map(([value, item]) => ({ value, label: item.name }))
  .sort((a, b) => a.label.localeCompare(b.label, 'en'));

export const defaultSettings: WorkspaceSettings = {
  country: 'US',
  region: 'CA',
  county: '',
  city: '',
  precision: 2,
  locale: 'en-US',
  live: false,
  appearance: 'light',
  showHints: true,
  regionalPresets: true,
  rememberInputs: true,
  followCountryFormat: false,
  swipeNavigation: true,
  comfortableControls: false,
  showResultAfterCalculate: true,
  layout: 'auto',
  taxYear: '2025',
  month: 1,
  complexity: 'standard',
};

/** Which levies appear at each complexity level; nothing is ever fully locked. */
export const complexityTiers: Record<string, 'simple' | 'standard' | 'advanced'> = {
  stateIncome: 'simple', provinceIncome: 'simple', regionIncome: 'simple',
  localIncome: 'standard', propertyTax: 'standard', stateSales: 'standard', vatSpending: 'standard',
  customLevy: 'advanced', fica: 'advanced', cppEi: 'advanced', ni: 'advanced',
};

export function levyVisibleAt(levyId: string, mode: string): boolean {
  if (mode === 'advanced') return true;
  const tier = complexityTiers[levyId];
  if (!tier) return mode === 'standard';
  if (mode === 'simple') return tier === 'simple';
  return tier === 'simple' || tier === 'standard';
}

export function getRegion(country: CountryId, regionId: string): Region {
  const c = countries[country] || countries.US;
  return c.regions.find(r => r.id === regionId) || c.regions[0];
}

export function jurisdictionProfile(country: CountryId, regionId: string) {
  const region = getRegion(country, regionId);
  const regime: TaxRegime = region.taxRegime
    || (region.flatTax === 0 && /no wage/i.test(region.taxStructure) ? 'no-wage-tax' : 'national');
  const note = region.divergenceNote
    || (regime === 'national' ? 'National/federal rules apply; this region does not replace the national tariff.' : '');
  return {
    regime,
    note,
    usesNationalTariff: regime === 'national' || regime === 'no-wage-tax' || regime === 'local-surtax' || regime === 'cantonal',
    separateFromParentCountry: country === 'HK' || country === 'PR',
  };
}

export interface LocalLevyOption {
  id: string;
  label: string;
  kind: 'state-income' | 'local-income' | 'sales' | 'payroll' | 'property' | 'solidarity' | 'health' | 'other';
  defaultRate: number;
  condition: string;
  defaultOn: boolean;
  mandatoryLabel: 'Always optional in this calculator' | 'Usually mandatory if applicable' | 'Optional surcharge';
  appliesTo?: 'income' | 'spending' | 'property' | 'payroll';
  defaultCap?: number;
}

/**
 * Itemized local levy catalog for every supported jurisdiction.
 * Every entry is user-controllable regardless of whether it is normally mandatory.
 */
export function localLevyOptions(country: CountryId, regionId: string, countyId?: string): LocalLevyOption[] {
  const countryData = countries[country];
  const region = getRegion(country, regionId);
  const county = region.counties?.find(c => c.id === countyId);
  const isUS = country === 'US';
  const isCAProvince = country === 'CA';
  const out: LocalLevyOption[] = [];

  // 1. State / provincial / regional income tax
  if (isUS || isCAProvince || region.customTax || region.brackets || (region.flatTax || 0) > 0) out.push({
    id: isUS ? 'stateIncome' : isCAProvince ? 'provinceIncome' : 'regionIncome',
    label: `${region.name} income tax`,
    kind: 'state-income',
    defaultRate: 0,
    condition: `${region.governingBody} income tax under ${region.statuteCitation}. ${region.taxStructure}.`,
    defaultOn: true,
    mandatoryLabel: 'Usually mandatory if applicable',
    appliesTo: 'income',
  });

  // 2. Local / municipal income or wage tax
  const localIncome = county?.localIncomeTaxRate ?? 0;
  out.push({
    id: 'localIncome',
    label: `${county?.name || region.name} local income / wage tax`,
    kind: 'local-income',
    defaultRate: localIncome,
    condition: localIncome > 0
      ? `${county?.name} levies ${localIncome}% on earned income/wages. In real life this is normally mandatory for residents or workers in this locality.`
      : 'No verified local wage-tax rate is preset for this selection. Enter a rate only if it applies to your situation.',
    defaultOn: false,
    mandatoryLabel: localIncome > 0 ? 'Usually mandatory if applicable' : 'Always optional in this calculator',
    appliesTo: 'income',
  });

  // 3. Payroll / social contribution
  const payrollDefaults: Partial<Record<CountryId, { id: string; label: string; rate: number; cap: number; condition: string; mandatory: LocalLevyOption['mandatoryLabel'] }>> = {
    US: { id: 'fica', label: 'Social Security & Medicare (FICA)', rate: 7.65, cap: 176100, condition: 'Employee share of Social Security (6.2% up to wage base) plus Medicare (1.45%, no cap). Additional 0.9% above $200k single / $250k joint.', mandatory: 'Usually mandatory if applicable' },
    CA: { id: 'cppEi', label: 'CPP & EI contributions', rate: 5.95, cap: 71300, condition: 'Canada Pension Plan (5.95% to YMPE, plus CPP2 above) and Employment Insurance (1.64% to insurable max). Quebec uses QPP.', mandatory: 'Usually mandatory if applicable' },
    GB: { id: 'ni', label: 'National Insurance (Class 1)', rate: 8, cap: 50270, condition: 'Employee Class 1 NICs: 8% between the primary threshold and UEL, 2% above. Not an income tax.', mandatory: 'Usually mandatory if applicable' },
    AU: { id: 'medicareLevy', label: 'Medicare levy', rate: 2, cap: 0, condition: '2% of taxable income for most residents. Surcharge and exemption tests not modeled.', mandatory: 'Usually mandatory if applicable' },
    DE: { id: 'socialDe', label: 'Social security contributions', rate: 20, cap: 87600, condition: 'Pension, unemployment, health, and care insurance. Roughly 20% employee share to contribution ceilings.', mandatory: 'Usually mandatory if applicable' },
    NL: { id: 'premiums', label: 'National insurance premiums', rate: 27.5, cap: 0, condition: 'Box 1 premiums (AOW/Anw/Wlz) are collected as part of bracket 1 income tax.', mandatory: 'Usually mandatory if applicable' },
    IE: { id: 'uscPrsi', label: 'USC & PRSI', rate: 4.5, cap: 0, condition: 'Universal Social Charge bands plus PRSI 4% on insurable earnings.', mandatory: 'Usually mandatory if applicable' },
    FR: { id: 'cotisations', label: 'Cotisations sociales', rate: 22, cap: 0, condition: 'Employee social contributions (health, retirement, family) on gross salary.', mandatory: 'Usually mandatory if applicable' },
    IT: { id: 'inps', label: 'INPS & regional', rate: 9.19, cap: 0, condition: 'INPS employee contribution around 9.19%, plus regional and municipal surtaxes.', mandatory: 'Usually mandatory if applicable' },
    ES: { id: 'ssEs', label: 'Seguridad Social', rate: 6.35, cap: 0, condition: 'Employee social security contribution on gross salary.', mandatory: 'Usually mandatory if applicable' },
    BE: { id: 'onss', label: 'ONSS / RSZ contributions', rate: 13.07, cap: 0, condition: 'Employee social security (13.07% standard) with special social security contributions.', mandatory: 'Usually mandatory if applicable' },
    AT: { id: 'svAt', label: 'Sozialversicherung', rate: 18.07, cap: 62400, condition: 'Health, pension, and unemployment insurance up to the contribution ceiling.', mandatory: 'Usually mandatory if applicable' },
    DK: { id: 'amBidrag', label: 'AM-bidrag (labour market contribution)', rate: 8, cap: 0, condition: '8% of gross wages before income tax.', mandatory: 'Usually mandatory if applicable' },
    NO: { id: 'trygd', label: 'Trygd (national insurance)', rate: 7.7, cap: 0, condition: 'Employee national insurance contribution.', mandatory: 'Usually mandatory if applicable' },
    FI: { id: 'tyel', label: 'Pension & unemployment insurance', rate: 7.15, cap: 0, condition: 'TyEL pension and unemployment insurance contributions.', mandatory: 'Usually mandatory if applicable' },
    SE: { id: 'socialSe', label: 'Social contributions on wages', rate: 7, cap: 0, condition: 'Pension contribution and other social charges on employment income.', mandatory: 'Usually mandatory if applicable' },
    PL: { id: 'zus', label: 'ZUS social insurance', rate: 13.71, cap: 0, condition: 'Pension, disability, sickness, and health contributions on employment income.', mandatory: 'Usually mandatory if applicable' },
    GR: { id: 'efka', label: 'EFKA contributions', rate: 13.87, cap: 0, condition: 'Employee social security (EFKA) on gross earnings.', mandatory: 'Usually mandatory if applicable' },
    PT: { id: 'ssPt', label: 'Segurança Social', rate: 11, cap: 0, condition: 'Employee social security contribution.', mandatory: 'Usually mandatory if applicable' },
    JP: { id: 'shakai', label: 'Shakai hoken & resident tax', rate: 14, cap: 0, condition: 'Health, pension, and employment insurance plus 10% local inhabitant tax on prior-year income.', mandatory: 'Usually mandatory if applicable' },
    KR: { id: 'fourMajor', label: 'Four major insurances', rate: 9.92, cap: 0, condition: 'National pension, health, employment, and industrial accident insurance on wages.', mandatory: 'Usually mandatory if applicable' },
    IN: { id: 'epfEsi', label: 'EPF & ESI contributions', rate: 12, cap: 15000, condition: 'Provident Fund (12% to wage ceiling) and ESI where applicable.', mandatory: 'Usually mandatory if applicable' },
    SG: { id: 'cpf', label: 'CPF contributions', rate: 20, cap: 6800, condition: 'Employee CPF (Ordinary + Special + Medisave) to CPF wage ceiling; citizens and PRs.', mandatory: 'Usually mandatory if applicable' },
    HK: { id: 'mpf', label: 'MPF contributions', rate: 5, cap: 18000, condition: 'Mandatory Provident Fund: 5% employee on relevant income to the maximum relevant income level.', mandatory: 'Usually mandatory if applicable' },
    TW: { id: 'nhiPension', label: 'NHI & labor pension', rate: 6.42, cap: 0, condition: 'National Health Insurance plus labor pension employee share.', mandatory: 'Usually mandatory if applicable' },
    PR: { id: 'secure', label: 'Seguro Social & retirement', rate: 5, cap: 0, condition: 'Employee share of FICA-equivalent and retirement system contributions.', mandatory: 'Usually mandatory if applicable' },
    BR: { id: 'inss', label: 'INSS', rate: 14, cap: 7507.49, condition: 'Employee INSS contribution on payroll up to the contribution ceiling.', mandatory: 'Usually mandatory if applicable' },
    MX: { id: 'imss', label: 'IMSS', rate: 2.5, cap: 0, condition: 'IMSS employee share (sickness, disability, retirement) on capped earnings.', mandatory: 'Usually mandatory if applicable' },
    CL: { id: 'afpSalud', label: 'AFP & health', rate: 12.6, cap: 0, condition: 'Pension (AFP) and health insurance employee contributions.', mandatory: 'Usually mandatory if applicable' },
    AR: { id: 'jubilacion', label: 'Jubilación & obra social', rate: 17, cap: 0, condition: 'Retirement, disability, and health insurance contributions on payroll.', mandatory: 'Usually mandatory if applicable' },
    ID: { id: 'bpjs', label: 'BPJS Kesehatan & Ketenagakerjaan', rate: 4, cap: 12000000, condition: 'Health and employment insurance contributions on capped wages.', mandatory: 'Usually mandatory if applicable' },
    TH: { id: 'sso', label: 'Social Security Office (SSO)', rate: 5, cap: 15000, condition: 'SSO contribution 5% on wages to the capped base.', mandatory: 'Usually mandatory if applicable' },
    PH: { id: 'sssPhilHealth', label: 'SSS, PhilHealth & Pag-IBIG', rate: 4.5, cap: 0, condition: 'Social security, health, and housing contributions on compensation.', mandatory: 'Usually mandatory if applicable' },
    ZA: { id: 'uif', label: 'UIF', rate: 1, cap: 0, condition: 'Unemployment Insurance Fund 1% of remuneration.', mandatory: 'Usually mandatory if applicable' },
    AE: { id: 'pensionAe', label: 'GPSSA pension (where applicable)', rate: 5, cap: 0, condition: 'For UAE/GCC nationals in registered schemes. Most expatriate employees are not enrolled.', mandatory: 'Optional surcharge' },
    CH: { id: 'ahv', label: 'AHV/IV/EO + pension', rate: 10.6, cap: 0, condition: 'First-pillar contributions plus BVG occupational pension where applicable; canton and commune multipliers vary.', mandatory: 'Usually mandatory if applicable' },
  };
  const pd = payrollDefaults[country];
  if (pd) out.push({
    id: pd.id,
    label: pd.label,
    kind: 'payroll',
    defaultRate: pd.rate,
    defaultCap: pd.cap,
    condition: `${pd.condition} Rate and ceiling are editable for your own situation.`,
    defaultOn: false,
    mandatoryLabel: pd.mandatory,
    appliesTo: 'payroll',
  });

  if (countryData.contribution) out.push({
    id: 'countryPayroll', label: countryData.contribution.label, kind: 'payroll',
    defaultRate: countryData.contribution.rate, defaultCap: countryData.contribution.annualCap,
    condition: countryData.contribution.description, defaultOn: false,
    mandatoryLabel: 'Usually mandatory if applicable', appliesTo: 'payroll',
  });

  // 4. Sales / VAT / GST spending estimate
  const baseSales = region.salesTax ?? 0;
  const districtSales = county?.localSalesTaxRate ?? 0;
  out.push({
    id: isUS ? 'stateSales' : 'vatSpending',
    label: isUS ? `${region.name} sales & use tax` : `${countryData.name} VAT/GST spending estimate`,
    kind: 'sales',
    defaultRate: baseSales + districtSales,
    condition: isUS
      ? `${baseSales}% statewide base${districtSales ? ` plus ${districtSales}% ${county?.name || 'local'} district add-on` : ''} on taxable goods/services. Not withheld from wages; enable only for an indirect-tax spending estimate.`
      : `${countryData.name} VAT/GST of ${baseSales}% on taxable spending. Not an income tax; enable only for an indirect-tax spending estimate.`,
    defaultOn: false,
    mandatoryLabel: 'Always optional in this calculator',
    appliesTo: 'spending',
  });

  // 5. Property tax
  const propertyRate = county?.propertyTaxRate ?? region.propertyTax ?? 0;
  out.push({
    id: 'propertyTax',
    label: `${county?.name || region.name} property tax estimate`,
    kind: 'property',
    defaultRate: propertyRate,
    condition: `Ad valorem property/millage tax at ${propertyRate}% effective rate. Enter your own assessed value and rate; not an income tax.`,
    defaultOn: false,
    mandatoryLabel: 'Always optional in this calculator',
    appliesTo: 'property',
  });

  // 6. Country-specific named levies
  const extras: Partial<Record<CountryId, LocalLevyOption[]>> = {
    GB: [
      { id: 'scotlandBands', label: 'Scottish Income Tax bands', kind: 'other', defaultRate: 0, condition: 'Scotland sets its own non-savings, non-dividend bands. Savings and dividend income uses UK rates.', defaultOn: false, mandatoryLabel: 'Usually mandatory if applicable', appliesTo: 'income' },
      { id: 'marriageAllowance', label: 'Marriage Allowance transfer', kind: 'other', defaultRate: 252, condition: 'Transfer 10% of a personal allowance to a spouse/civil partner (max £252/yr relief).', defaultOn: false, mandatoryLabel: 'Always optional in this calculator', appliesTo: 'income' },
    ],
    AU: [
      { id: 'mls', label: 'Medicare levy surcharge', kind: 'health', defaultRate: 1.5, condition: 'Additional 1–1.5% for higher earners without adequate private hospital cover.', defaultOn: false, mandatoryLabel: 'Optional surcharge', appliesTo: 'income' },
    ],
    DE: [
      { id: 'solidarity', label: 'Solidaritätszuschlag (soli)', kind: 'solidarity', defaultRate: 5.5, condition: '5.5% surcharge on income tax above the exemption threshold.', defaultOn: false, mandatoryLabel: 'Usually mandatory if applicable', appliesTo: 'income' },
      { id: 'churchTax', label: 'Kirchensteuer (church tax)', kind: 'other', defaultRate: 9, condition: 'Church surcharge on income tax for registered church members (8–9% depending on state).', defaultOn: false, mandatoryLabel: 'Optional surcharge', appliesTo: 'income' },
    ],
    CH: [
      { id: 'cantonalTax', label: `Cantonal/communal effective-rate estimate (${region.name})`, kind: 'state-income', defaultRate: 0, condition: 'Enter an effective percentage of national taxable income for your canton and commune. This estimate is not an official cantonal tariff or multiplier calculation.', defaultOn: false, mandatoryLabel: 'Usually mandatory if applicable', appliesTo: 'income' },
      { id: 'wealthTax', label: 'Cantonal wealth tax', kind: 'property', defaultRate: 0.3, condition: 'Annual net wealth tax on worldwide taxable assets; thresholds and rates are cantonal.', defaultOn: false, mandatoryLabel: 'Always optional in this calculator', appliesTo: 'property' },
    ],
    IE: [
      { id: 'usc', label: 'USC effective-rate estimate', kind: 'health', defaultRate: 0, condition: 'Enter an effective USC rate for your circumstances. This optional percentage estimate does not calculate the separate statutory USC bands.', defaultOn: false, mandatoryLabel: 'Usually mandatory if applicable', appliesTo: 'income' },
      { id: 'prsi', label: 'PRSI', kind: 'payroll', defaultRate: 4, condition: 'Pay-Related Social Insurance on insurable earnings.', defaultOn: false, mandatoryLabel: 'Usually mandatory if applicable', appliesTo: 'payroll' },
    ],
    BE: [
      { id: 'communalTax', label: 'Communal surcharge', kind: 'local-income', defaultRate: 7, condition: 'Communal tax as a percentage of national income tax; varies by municipality.', defaultOn: false, mandatoryLabel: 'Usually mandatory if applicable', appliesTo: 'income' },
    ],
    DK: [
      { id: 'municipalTax', label: 'Municipal income tax (kommuneskat)', kind: 'local-income', defaultRate: 24.9, condition: 'Each kommune sets its own rate; this is a large share of total Danish tax. Off by default — enable if it applies to you.', defaultOn: false, mandatoryLabel: 'Usually mandatory if applicable', appliesTo: 'income' },
      { id: 'churchTax', label: 'Church tax (folkekirken)', kind: 'other', defaultRate: 0.7, condition: 'Optional; paid by members of the national church.', defaultOn: false, mandatoryLabel: 'Optional surcharge', appliesTo: 'income' },
    ],
    FI: [
      { id: 'municipalTaxFi', label: 'Municipal tax', kind: 'local-income', defaultRate: 7.5, condition: 'Each municipality sets its own flat rate on income. Off by default — enable if it applies to you.', defaultOn: false, mandatoryLabel: 'Usually mandatory if applicable', appliesTo: 'income' },
      { id: 'yle', label: 'Public broadcasting tax', kind: 'other', defaultRate: 0.68, condition: 'Yle tax on income with minimum and maximum amounts.', defaultOn: false, mandatoryLabel: 'Usually mandatory if applicable', appliesTo: 'income' },
    ],
    NO: [
      { id: 'trygdeavgift', label: 'Trygdeavgift on ordinary income', kind: 'payroll', defaultRate: 0, condition: 'National insurance contribution on ordinary income.', defaultOn: true, mandatoryLabel: 'Usually mandatory if applicable', appliesTo: 'income' },
    ],
    SE: [
      { id: 'kommunalSkatt', label: `Kommunalskatt (${region.name})`, kind: 'local-income', defaultRate: 29, condition: 'Municipal + county council tax on taxable income; varies by kommun. Off by default — enable if it applies to you.', defaultOn: false, mandatoryLabel: 'Usually mandatory if applicable', appliesTo: 'income' },
      { id: 'begravnings', label: 'Burial fee', kind: 'other', defaultRate: 0.28, condition: 'Small municipal burial fee included in tax returns.', defaultOn: false, mandatoryLabel: 'Always optional in this calculator', appliesTo: 'income' },
    ],
    PT: [
      { id: 'surtaxPt', label: 'Sobretaxa / additional solidarity', kind: 'solidarity', defaultRate: 2.5, condition: 'Additional solidarity rate on higher taxable income brackets.', defaultOn: false, mandatoryLabel: 'Usually mandatory if applicable', appliesTo: 'income' },
    ],
    IT: [
      { id: 'irapRegionale', label: 'Regional & municipal surtaxes', kind: 'local-income', defaultRate: 1.73, condition: 'Regional (0.7–3.33%) and municipal (0–0.9%) surtaxes on national income tax. Off by default.', defaultOn: false, mandatoryLabel: 'Usually mandatory if applicable', appliesTo: 'income' },
    ],
    ES: [
      { id: 'regionalEs', label: `Autonomous community bracket (${region.name})`, kind: 'state-income', defaultRate: 0, condition: 'Half of the IRPF tariff is set by each autonomous community.', defaultOn: true, mandatoryLabel: 'Usually mandatory if applicable', appliesTo: 'income' },
    ],
    NL: [
      { id: 'labourCredit', label: 'Labour tax credit (AK)', kind: 'other', defaultRate: 0, condition: 'General and labour tax credits are phased out above income thresholds and reduce tax payable.', defaultOn: true, mandatoryLabel: 'Usually mandatory if applicable', appliesTo: 'income' },
    ],
    PL: [
      { id: 'solidarityPl', label: 'Solidarity levy (danina solidarnościowa)', kind: 'solidarity', defaultRate: 4, condition: '4% on income above PLN 1,000,000.', defaultOn: false, mandatoryLabel: 'Usually mandatory if applicable', appliesTo: 'income' },
    ],
    AE: [
      { id: 'housingFee', label: 'Housing fee (Dubai, DEWA-linked)', kind: 'property', defaultRate: 5, condition: 'Dubai housing fee of 5% of annual rent is billed monthly via utilities.', defaultOn: false, mandatoryLabel: 'Always optional in this calculator', appliesTo: 'property' },
      { id: 'tourismDirham', label: 'Tourism Dirham (hotels)', kind: 'other', defaultRate: 0, condition: 'Per-room per-night charge for hotel stays; included here only if you choose to model it.', defaultOn: false, mandatoryLabel: 'Optional surcharge', appliesTo: 'spending' },
    ],
    PR: [
      { id: 'municipalPatent', label: 'Municipal patent/license fees', kind: 'local-income', defaultRate: 0, condition: 'Municipal business patent taxes on gross volume; not a wage tax.', defaultOn: false, mandatoryLabel: 'Always optional in this calculator', appliesTo: 'income' },
      { id: 'crim', label: 'CRIM property tax', kind: 'property', defaultRate: 0.8, condition: 'Municipal property tax on CRIM-assessed value.', defaultOn: false, mandatoryLabel: 'Always optional in this calculator', appliesTo: 'property' },
    ],
    JP: [
      { id: 'residentTax', label: 'Local inhabitant tax estimate', kind: 'local-income', defaultRate: 10, condition: 'Editable percentage of this model\'s national taxable income. Actual inhabitant tax uses a prior-year local tax base and per-capita charges, which are not automatically calculated.', defaultOn: false, mandatoryLabel: 'Usually mandatory if applicable', appliesTo: 'income' },
    ],
    KR: [
      { id: 'localIncomeTax', label: 'Local income tax', kind: 'local-income', defaultRate: 10, condition: '10% surcharge on national income tax liability. Off by default.', defaultOn: false, mandatoryLabel: 'Usually mandatory if applicable', appliesTo: 'income' },
    ],
    IN: [
      { id: 'cess', label: 'Health & education cess', kind: 'health', defaultRate: 4, condition: '4% surcharge on income tax payable.', defaultOn: false, mandatoryLabel: 'Usually mandatory if applicable', appliesTo: 'income' },
      { id: 'surchargeIn', label: 'Surcharge on high income', kind: 'solidarity', defaultRate: 10, condition: '10–37% on income above ₹50 lakh depending on total income.', defaultOn: false, mandatoryLabel: 'Usually mandatory if applicable', appliesTo: 'income' },
    ],
    BR: [
      { id: 'deducaoLegal', label: 'Simplified deduction (desconto simplificado)', kind: 'other', defaultRate: 0, condition: 'Standard deduction of 20% of taxable remuneration, capped.', defaultOn: true, mandatoryLabel: 'Always optional in this calculator', appliesTo: 'income' },
    ],
    MX: [
      { id: 'subsidioEmpleo', label: 'Subsidio para el empleo', kind: 'other', defaultRate: 0, condition: 'Employment subsidy credit applied against tax on wages.', defaultOn: true, mandatoryLabel: 'Always optional in this calculator', appliesTo: 'income' },
    ],
    TW: [
      { id: 'nhiTax', label: 'National health insurance surcharge', kind: 'health', defaultRate: 2.11, condition: 'Supplementary premium on certain income types; regular NHI is a payroll item.', defaultOn: false, mandatoryLabel: 'Optional surcharge', appliesTo: 'income' },
    ],
    HK: [
      { id: 'mpfExtra', label: 'Extra voluntary MPF contributions', kind: 'payroll', defaultRate: 0, condition: 'Contributions above the mandatory 5% level.', defaultOn: false, mandatoryLabel: 'Always optional in this calculator', appliesTo: 'payroll' },
    ],
    AR: [
      { id: 'independiente', label: 'Self-employed contributions', kind: 'payroll', defaultRate: 0, condition: 'For self-employed workers (monotributo or autonomous), not salaried employees.', defaultOn: false, mandatoryLabel: 'Always optional in this calculator', appliesTo: 'income' },
    ],
    ID: [
      { id: 'npwp', label: 'NPWP holder rate', kind: 'other', defaultRate: 0, condition: 'Taxpayers with a tax ID (NPWP) pay lower rates than those without.', defaultOn: true, mandatoryLabel: 'Always optional in this calculator', appliesTo: 'income' },
    ],
    TH: [
      { id: 'pvd', label: 'Provident fund (PVD)', kind: 'payroll', defaultRate: 5, condition: 'Voluntary retirement savings contributions; reduce taxable income.', defaultOn: false, mandatoryLabel: 'Always optional in this calculator', appliesTo: 'payroll' },
    ],
    PH: [
      { id: 'th13Month', label: '13th-month pay exclusion', kind: 'other', defaultRate: 0, condition: 'Statutory 13th-month pay up to ₱90,000 is excluded from taxable income.', defaultOn: true, mandatoryLabel: 'Always optional in this calculator', appliesTo: 'income' },
    ],
    ZA: [
      { id: 'rebatesZa', label: 'Primary rebate', kind: 'other', defaultRate: 17235, condition: 'Primary rebate reduces normal tax payable.', defaultOn: true, mandatoryLabel: 'Always optional in this calculator', appliesTo: 'income' },
    ],
    CL: [
      { id: 'ufAdjust', label: 'UF-indexed bracket adjustment', kind: 'other', defaultRate: 0, condition: 'Brackets are indexed monthly to Unidad de Fomento (UF).', defaultOn: true, mandatoryLabel: 'Always optional in this calculator', appliesTo: 'income' },
    ],
  };
  (extras[country] || []).forEach(extra => out.push(extra));

  // 7. Universal custom levy
  out.push({
    id: 'customLevy',
    label: 'Custom additional levy',
    kind: 'other',
    defaultRate: 0,
    condition: 'Enter a percentage of adjusted income for an additional levy or surcharge. This is a custom estimate, not an automatic local tax lookup.',
    defaultOn: false,
    mandatoryLabel: 'Always optional in this calculator',
    appliesTo: 'income',
  });

  // Do not expose switches for statutory methods the engine does not implement.
  const embeddedOrUnsupported = new Set(['scotlandBands', 'marriageAllowance', 'wealthTax', 'municipalTax', 'municipalTaxFi', 'kommunalSkatt', 'trygdeavgift', 'irapRegionale', 'regionalEs', 'labourCredit', 'deducaoLegal', 'subsidioEmpleo', 'npwp', 'th13Month', 'rebatesZa', 'ufAdjust', 'tourismDirham', 'municipalPatent', 'crim', 'housingFee', 'yle', 'begravnings']);
  return out.filter(item => !embeddedOrUnsupported.has(item.id)).map(item => item.id === 'churchTax' && country === 'DE' && ['BY', 'BW'].includes(regionId) ? { ...item, defaultRate: 8 } : item);
}

export function getCounty(region: Region, countyId?: string): CountyData | undefined {
  if (!countyId || !region.counties?.length) return undefined;
  return region.counties.find(c => c.id === countyId);
}

export function getTaxYear(country: CountryId, yearId?: string): TaxYearPack {
  const c = countries[country] || countries.US;
  const packs = c.years;
  if (!yearId) return packs[packs.length - 1];
  return packs.find(p => p.id === yearId) || packs[packs.length - 1];
}

export function latestTaxYearId(country: CountryId): string {
  const c = countries[country] || countries.US;
  return c.years[c.years.length - 1].id;
}

export const referenceSources = [
  countries.US.source,
  { name: 'IRS 2025 standard deductions (Publication 17)', url: 'https://www.irs.gov/publications/p17' },
  { name: 'California FTB 2021-2025 tax schedules', url: 'https://www.ftb.ca.gov/about-ftb/newsroom/tax-news/2025/10.html' },
  { name: 'New York DTF Form IT-201 & NYC withholding tables', url: 'https://www.tax.ny.gov/pit/file/tax_tables.htm' },
  { name: 'Texas Comptroller Property Tax Assistance Division', url: 'https://comptroller.texas.gov/taxes/property-tax/' },
  { name: 'Pennsylvania Department of Revenue (Act 511 & Philly Wage Tax)', url: 'https://www.revenue.pa.gov/' },
  { name: 'Illinois Department of Revenue (IL-1040 Schedule)', url: 'https://tax.illinois.gov/' },
  countries.CA.source,
  { name: 'CRA 2025 payroll, Ontario surtax & health premium', url: 'https://www.canada.ca/content/dam/cra-arc/migration/cra-arc/tx/bsnss/tpcs/pyrll/t4032/2025/t4032-on-1-25eng.pdf' },
  countries.GB.source,
  { name: 'Scottish income tax: 2021-2026 reference', url: 'https://www.mygov.scot/scottish-income-tax/current-income-tax-rates' },
  countries.AU.source,
  countries.DE.source,
  countries.FR.source,
  countries.JP.source,
  countries.IN.source,
  countries.NZ.source,
  countries.HK.source,
  countries.TW.source,
  countries.PR.source,
  countries.PT.source,
  countries.BE.source,
  ...Object.values(additionalCountries).map(country => country.source),
  { name: 'Frankfurter daily reference exchange rates', url: 'https://frankfurter.dev/' },
];

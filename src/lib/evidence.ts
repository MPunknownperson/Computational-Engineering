import type { AcademicSource, CountryId, ToolId } from './types';

const sources: Record<string, AcademicSource> = {
  oecdTax: { institution: 'OECD Centre for Tax Policy and Administration', studyTitle: 'Revenue Statistics and Taxing Wages', methodology: 'Cross-country tax-benefit microsimulation and harmonized revenue classifications.', supplementReason: 'Supports cross-country comparison without replacing domestic statutory calculation.', url: 'https://www.oecd.org/tax/tax-policy/taxing-wages-brochure.pdf' },
  wid: { institution: 'World Inequality Database', studyTitle: 'Distributional National Accounts', methodology: 'Reconciles national accounts, tax records, and household surveys.', supplementReason: 'Provides incidence context where statutory tables do not describe distribution.', url: 'https://wid.world/methodology/' },
  census: { institution: 'U.S. Census Bureau', studyTitle: 'American Community Survey 5-year estimates', methodology: 'Continuous probability survey with multi-year small-area estimates.', supplementReason: 'Provides county and state income context alongside tax law.', url: 'https://www.census.gov/programs-surveys/acs/methodology.html' },
  nberMortgage: { institution: 'National Bureau of Economic Research', studyTitle: 'Mortgage prepayment and refinancing research', methodology: 'Empirical econometric analysis of mortgage performance and household refinancing.', supplementReason: 'Supports optional behavioral scenarios, not contractual payment calculation.', url: 'https://www.nber.org/topics/mortgages' },
  cfpb: { institution: 'Consumer Financial Protection Bureau', studyTitle: 'Loan Estimate and APR guidance', methodology: 'Regulatory disclosure methodology for consumer credit.', supplementReason: 'Supports APR and fee treatment.', url: 'https://www.consumerfinance.gov/ask-cfpb/what-is-an-annual-percentage-rate-apr-en-733/' },
  bisFx: { institution: 'Bank for International Settlements', studyTitle: 'Triennial Central Bank Survey of FX markets', methodology: 'Coordinated central-bank survey of foreign exchange market structure.', supplementReason: 'Provides market context; conversion still uses the selected dated reference rate.', url: 'https://www.bis.org/statistics/rpfx22.htm' },
  nist: { institution: 'NIST/SEMATECH', studyTitle: 'e-Handbook of Statistical Methods', methodology: 'Reviewed statistical methods and probability references.', supplementReason: 'Supports exact and simulation validation methods.', url: 'https://www.itl.nist.gov/div898/handbook/' },
  who: { institution: 'World Health Organization', studyTitle: 'BMI classification and interpretation', methodology: 'Population-level public-health evidence synthesis.', supplementReason: 'Provides screening thresholds while preserving the warning that BMI is not diagnosis.', url: 'https://www.who.int/data/gho/data/themes/topics/topic-details/GHO/body-mass-index' },
  bipm: { institution: 'BIPM', studyTitle: 'The International System of Units (SI)', methodology: 'International metrology standard maintained under the Metre Convention.', supplementReason: 'Defines canonical SI conversion constants.', url: 'https://www.bipm.org/en/publications/si-brochure' },
};

export function getEvidenceSources(tool: ToolId, country: CountryId): AcademicSource[] {
  if (tool === 'tax') return country === 'US' ? [sources.census, sources.oecdTax, sources.wid] : [sources.oecdTax, sources.wid];
  if (tool === 'mortgage' || tool === 'car') return [sources.cfpb, sources.nberMortgage];
  if (tool === 'currency' || tool === 'transaction') return [sources.bisFx];
  if (tool === 'probability' || tool === 'scientific') return [sources.nist];
  if (tool === 'units') return [sources.bipm];
  if (tool === 'bmi') return [sources.who];
  return [];
}
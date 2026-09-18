export type ToolId = 'mortgage' | 'tax' | 'car' | 'compound' | 'transaction' | 'currency' | 'probability' | 'scientific' | 'units' | 'bmi';
export type Values = Record<string, string>;
export type CountryId = 'US' | 'CA' | 'GB' | 'AU' | 'DE' | 'FR' | 'JP' | 'IN' | 'NZ' | 'CH' | 'SG' | 'BR' | 'KR'
  | 'IE' | 'NL' | 'ES' | 'IT' | 'MX' | 'AR' | 'ID' | 'TH' | 'PH' | 'ZA' | 'AE' | 'PL' | 'SE' | 'GR'
  | 'HK' | 'TW' | 'PR' | 'PT' | 'BE' | 'AT' | 'DK' | 'NO' | 'FI' | 'CL'
  | 'CZ' | 'RO' | 'HU' | 'CO' | 'PE' | 'MY' | 'VN' | 'EG' | 'SA' | 'IL' | 'TR' | 'UA'
  | 'SK' | 'BG' | 'HR' | 'EE' | 'LT' | 'LV' | 'LU' | 'IS' | 'QA' | 'KW' | 'PK' | 'BD' | 'KE' | 'NG' | 'MA' | 'JO'
  | 'RS' | 'SI' | 'CY' | 'MT' | 'UY' | 'EC' | 'LK' | 'NP' | 'GH' | 'TZ' | 'UG' | 'SN' | 'TN' | 'LB' | 'OM' | 'BH'
  | 'GU' | 'VI' | 'AS' | 'MP' | 'GE' | 'AM' | 'AZ' | 'KZ' | 'UZ' | 'MN' | 'KH' | 'MM' | 'LA' | 'BO' | 'PY'
  | 'MO' | 'GL' | 'FO' | 'GI' | 'IM' | 'JE' | 'GG' | 'BM' | 'KY' | 'AW' | 'CW' | 'NC' | 'PF' | 'AX' | 'AL' | 'MK'
  | 'CR' | 'PA' | 'DO' | 'GT' | 'JM' | 'TT' | 'FJ' | 'MV' | 'BT' | 'MD' | 'BA' | 'ME' | 'NA' | 'BW' | 'MU' | 'RW'
  | 'CN' | 'BN' | 'BS' | 'SC' | 'ZM' | 'PG'
  | 'ET' | 'ZW' | 'AO' | 'MW' | 'MZ' | 'DZ' | 'IQ' | 'RU' | 'BY' | 'KG' | 'TJ'
  | 'XK' | 'AD' | 'MC' | 'BB' | 'GY' | 'TL' | 'SB' | 'VU' | 'WS' | 'TO'
  | 'CI' | 'CM' | 'ZR' | 'SZ' | 'LS' | 'GA' | 'BJ' | 'BF' | 'ML' | 'NE' | 'TD' | 'SL' | 'LR' | 'GM'
  | 'SR' | 'BZ' | 'HN' | 'NI' | 'SV' | 'HT' | 'LC' | 'AG' | 'VC' | 'GD' | 'KN' | 'DM'
  | 'MG' | 'LI' | 'SM' | 'CV' | 'PW' | 'FM' | 'MH' | 'KI' | 'NR' | 'TV' | 'CK'
  | 'SS' | 'SOM' | 'GN' | 'GW' | 'CG' | 'CF' | 'ER' | 'DJ' | 'BI' | 'KM' | 'ST' | 'GQ' | 'TM'
  | 'AF' | 'YE' | 'SY' | 'LY' | 'MR' | 'BQ' | 'SX' | 'TC' | 'VG' | 'AI' | 'MS' | 'FK' | 'PM';
export type ComplexityMode = 'simple' | 'standard' | 'advanced';
export type TaxRegime = 'national' | 'devolved' | 'separate-return' | 'territorial' | 'local-surtax' | 'no-wage-tax' | 'cantonal';

export interface WorkspaceSettings {
  country: CountryId;
  region: string;
  county?: string;
  city: string;
  customLocality?: boolean;
  precision: number;
  locale: string;
  live: boolean;
  appearance: 'light' | 'ink';
  showHints?: boolean;
  regionalPresets?: boolean;
  rememberInputs?: boolean;
  followCountryFormat?: boolean;
  swipeNavigation?: boolean;
  comfortableControls?: boolean;
  showResultAfterCalculate?: boolean;
  layout?: 'auto' | 'stacked';
  taxYear?: string;
  month?: number; // 1-12 for monthly withholding/proration
  paradigm?: 'statutory' | 'academic' | 'ensemble';
  complexity?: ComplexityMode;
  /** Per-tool detail depth; overrides workspace complexity when set. */
  toolComplexity?: Partial<Record<ToolId, ComplexityMode>>;
}

export interface CalculationContext extends WorkspaceSettings {
  currency: string;
  rate?: number;
  rateDate?: string;
  sourceProvider?: string;
}

export interface Part { label: string; value: number; color?: string }
export interface CalculationCheck { name: string; passed: boolean; detail: string; standard?: string }

export interface OfficialAlignment {
  authority: string;
  instrument: string;
  citation: string;
  year: string;
  effectiveDate: string;
  status: 'Verified Live' | 'Official Statute' | 'Statutory Formula' | 'Academic Triangulation';
  url: string;
}

export interface AcademicSource {
  institution: string;
  studyTitle: string;
  methodology: string;
  supplementReason: string;
  url: string;
}

export interface NetworkNode {
  id: string;
  label: string;
  role: string;
  institution: string;
  value: number | string;
  format?: 'money' | 'percent' | 'number' | 'text';
  weight?: number;
  formulaNote: string;
  connections: string[];
}

export interface FormulaDefinition {
  id: string;
  title: string;
  expression: string;
  purpose: string;
  active: boolean;
}

export interface ToolModuleSummary {
  id: string;
  name: string;
  description: string;
  dataInputs: string[];
  companionTools: ToolId[];
}

export interface CalculationAudit {
  version: string;
  method: string;
  checks: CalculationCheck[];
  notes: string[];
  inputCount: number;
  alignment?: OfficialAlignment;
  academicSources?: AcademicSource[];
  networkNodes?: NetworkNode[];
  formulas?: FormulaDefinition[];
  module?: ToolModuleSummary;
  computedAt: string;
}

export interface Metric { label: string; value: number | string; format?: 'money' | 'percent' | 'number' }
export interface PaymentRow {
  period: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  date?: string;
  yearNumber?: number;
  monthName?: string;
}

export interface CalculationResult {
  label: string;
  value: number | string;
  format: 'money' | 'percent' | 'number' | 'text';
  suffix?: string;
  currency?: string;
  description: string;
  breakdown: Part[];
  metrics: Metric[];
  formula: string;
  steps: string[];
  warnings: string[];
  schedule?: PaymentRow[];
  frequency?: number;
  series?: { label: string; value: number }[];
  table?: { columns: string[]; rows: (string | number)[][] };
  centerLabel?: string;
  centerValue?: number;
  audit?: CalculationAudit;
  taxBasis?: { annualGross: number; annualTaxable: number; annualDeduction: number; annualMultiplier: number; displayDivisor: number; profile?: string };
  regionalStats?: {
    medianIncome?: number;
    costOfLivingIndex?: number;
    taxStructure?: string;
    governingBody?: string;
    statuteCitation?: string;
    localRule?: string;
  };
}

export interface Snapshot {
  id: string;
  tool: ToolId;
  name: string;
  values: Values;
  settings: WorkspaceSettings;
  result: CalculationResult;
  createdAt: string;
  saved: boolean;
}

export interface ToolDefinition {
  id: ToolId;
  title: string;
  short: string;
  description: string;
  category: 'Finance & money' | 'Math & everyday';
  accent: 'blue' | 'pink' | 'purple';
  defaults: Values;
  formula: string;
  compareFields: { key: string; label: string }[];
}

import { useMemo, useRef } from 'react';
import { ArrowLeftRight, Banknote, Bookmark, CalendarDays, CreditCard, Globe2, Plus, RefreshCw, ShieldCheck, SlidersHorizontal, Sparkles, TrendingUp, Wallet } from 'lucide-react';
import { NumberField, SelectField, TextField, Toggle } from './Fields';
import MethodPicker from './MethodPicker';
import OptionGroup from './OptionGroup';
import { localLevyOptions, levyVisibleAt, countries, getRegion } from '../lib/regions';
import { currencies, unitGroups } from '../lib/catalog';
import { parseNumericValue } from '../lib/format';
import { scenarioPresets, scenarioYearValue } from '../lib/scenarios';
import type { ScenarioPreset } from '../lib/scenarios';
import type { InputIssue } from '../lib/processing';
import type { CalculationContext, ComplexityMode, ToolId, Values } from '../lib/types';
import { toolSectionVisible } from '../lib/complexity';
import { describeSelection, fiscalStarts, monthOptions, resolvePeriod } from '../lib/periods';
import type { DayCount, PeriodKind } from '../lib/periods';
import { loadWorkspace, rankUsage } from '../lib/utilityWorkspace';
import type { CurrencyPair, SavedFormula } from '../lib/utilityWorkspace';
import { utilityRanker } from '../lib/engine/optimizer';

interface Props {
  tool: ToolId;
  values: Values;
  ctx: CalculationContext;
  onChange: (key: string, value: string) => void;
  onApplyPreset: (partial: Values) => void;
  onSwap: () => void;
  onRefresh: () => void;
  rateStatus: string;
  issues?: InputIssue[];
}

export default function ToolFields({ tool, values: v, ctx, onChange: change, onApplyPreset, onSwap, onRefresh, rateStatus, issues = [] }: Props) {
  const expression = useRef<HTMLTextAreaElement>(null);
  const symbol = countries[ctx.country].symbol;
  const hints = ctx.showHints !== false;
  const mode = (ctx.complexity || 'standard') as ComplexityMode;
  const show = (section: string) => toolSectionVisible(tool, section, mode);
  const errors = Object.fromEntries(issues.map(issue => [issue.field, issue.message]));
  const invalid = (...fields: string[]) => fields.some(field => errors[field]);
  const num = (field: string, label: string, prefix?: string, suffix?: string, hint?: string) => <NumberField key={field} field={field} label={label} value={v[field] || ''} onChange={value => change(field, value)} prefix={prefix} suffix={suffix} hint={hint} showHint={hints} error={errors[field]} locale={ctx.locale} allowNegative={['x', 'y', 'a', 'b', 'c'].includes(field) || (tool === 'compound' && ['rate', 'inflation'].includes(field)) || (tool === 'units' && field === 'amount')} />;
  const select = (field: string, label: string, entries: [string, string][], className?: string) => <SelectField key={field} field={field} label={label} value={v[field]} onChange={value => change(field, value)} options={entries.map(([value, label]) => ({ value, label }))} error={errors[field]} className={className} />;
  const toggle = (field: string, label: string, description?: string) => <Toggle key={field} field={field} label={label} checked={v[field] === 'true'} onChange={value => change(field, String(value))} description={hints ? description : undefined} />;
  const strip = mode !== 'simple' ? <ScenarioStrip tool={tool} ctx={ctx} values={v} onApply={onApplyPreset} /> : null;
  const ownStrip = ['currency', 'probability', 'scientific', 'units', 'bmi'].includes(tool) ? <WorkspaceStrip tool={tool} onApply={onApplyPreset} /> : null;
  const methods = <>{strip}{ownStrip}<MethodPicker tool={tool} values={v} onChange={change} hints={hints && tool !== 'units'} /></>;

  if (tool === 'mortgage') {
    const downPercent = v.downMode === 'percent' ? parseNumericValue(v.down) : parseNumericValue(v.down) / parseNumericValue(v.price) * 100;
    return <>
      {methods}
      <div className="fields-grid">
        {num('price', 'Home price', symbol)}
        <NumberField field="down" label="Down payment" value={v.down} onChange={value => change('down', value)} locale={ctx.locale} error={errors.down} prefix={v.downMode === 'amount' ? symbol : undefined} suffix={v.downMode === 'percent' ? '%' : Number.isFinite(downPercent) ? <span className="input-percentage">{downPercent.toFixed(1)}%</span> : undefined} hint="Enter an amount or switch to a percentage." labelAction={<div className="mini-segment" role="group" aria-label="Down payment unit"><button type="button" aria-label="Down payment as currency" aria-pressed={v.downMode === 'amount'} className={v.downMode === 'amount' ? 'selected' : ''} onClick={() => change('downMode', 'amount')}>{symbol}</button><button type="button" aria-label="Down payment as percentage" aria-pressed={v.downMode === 'percent'} className={v.downMode === 'percent' ? 'selected' : ''} onClick={() => change('downMode', 'percent')}>%</button></div>} />
        {num('rate', 'Annual interest rate', undefined, '%')}
        {select('years', 'Loan term', [5, 10, 15, 20, 25, 30, 35, 40, 50].map(years => [String(years), `${years} years`]))}
        {show('schedule') && v.method === 'balloon' && num('balloonPct', 'Balloon at term end', undefined, '%', 'The share of the loan repaid as a final lump sum.')}
      </div>
      {mode !== 'simple' && <div className="options-caption">Customize your estimate <span>Optional</span></div>}
      <div className="option-groups">
        {show('ownership') && <OptionGroup title="Taxes & insurance" description="Property tax, insurance, and service charges" icon={<ShieldCheck size={20} />} status={v.includeCosts === 'true' ? 'Included' : 'Excluded'} tone="purple" invalid={invalid('propertyTax', 'insurance', 'hoa', 'pmi', 'closing')}>
          {toggle('includeCosts', 'Include ownership costs', 'Regional figures are editable planning estimates.')}
          {v.includeCosts === 'true' && <div className="fields-grid section-gap">{num('propertyTax', 'Annual property tax', undefined, '%')}{num('insurance', 'Home insurance / year', symbol)}{num('hoa', 'Service charges / month', symbol)}{num('pmi', 'Mortgage insurance / year', undefined, '%', 'Applied below a 20% down payment; cancellation is not modeled.')}</div>}
          <div className="section-gap">{num('closing', 'Upfront closing costs', symbol, undefined, 'Paid upfront, not added to the loan.')}</div>
        </OptionGroup>}
        {show('extra') && <OptionGroup title="Extra payments" description="See how additional principal changes your payoff" icon={<Plus size={20} />} status={parseNumericValue(v.extra) > 0 ? 'Added' : 'Add extra'} tone="pink" invalid={invalid('extra')}>
          {num('extra', `Extra principal / ${v.frequency === '12' ? 'month' : v.frequency === '26' ? '2 weeks' : 'week'}`, symbol, undefined, 'Added to each regular payment. Interest and payoff time are recalculated.')}
        </OptionGroup>}
        {show('schedule') && <OptionGroup title="Schedule & start date" description={`Loan starts ${v.startMonth || 1}/${v.startYear || 2025}; ${v.frequency === '12' ? 'Monthly' : v.frequency === '26' ? 'Biweekly' : 'Weekly'} payments`} icon={<CalendarDays size={20} />} invalid={invalid('frequency', 'convention', 'startMonth', 'startYear')}>
          <div className="fields-grid">
            {select('startMonth', 'First payment month', [['1','Jan (01)'],['2','Feb (02)'],['3','Mar (03)'],['4','Apr (04)'],['5','May (05)'],['6','Jun (06)'],['7','Jul (07)'],['8','Aug (08)'],['9','Sep (09)'],['10','Oct (10)'],['11','Nov (11)'],['12','Dec (12)']])}
            {select('startYear', 'First payment year', [2021,2022,2023,2024,2025,2026,2027,2028,2029,2030].map(y => [String(y), String(y)]))}
            {select('frequency', 'Payment frequency', [['12', 'Monthly'], ['26', 'Every 2 weeks'], ['52', 'Weekly']])}
            {select('convention', 'Interest convention', [['monthly', 'Nominal, monthly'], ['semiannual', 'Nominal, semiannual'], ['effective', 'Effective annual rate']])}
          </div>
          {hints && <p className="field-help">Calendar dates will be calculated throughout the full amortization table, giving exact payoff month and year.</p>}
        </OptionGroup>}
      </div>
    </>;
  }

  if (tool === 'tax') {
    const region = getRegion(ctx.country, ctx.region);
    const customRegion = region.customTax || (['US', 'CA'].includes(ctx.country) && !region.brackets && region.flatTax === undefined);
    const legalCountry = countries[ctx.country];
    return <>{methods}
      <div className="tax-reference" role="note">
        <span className="tax-reference-body"><strong>{legalCountry.legalBody}</strong><small>{region.name.replace(' (custom tax)', '')} &middot; Dated employment-income reference</small></span>
        {select('year', 'Reference year', legalCountry.years.map(pack => [pack.id, pack.label] as [string, string]), 'tax-year-select')}
      </div>
      {v.taxPeriod !== 'annual' && <PeriodStrip values={v} ctx={ctx} onChange={change} />}
      <div className="fields-grid section-gap">
        {select('taxPeriod', 'Calculation frequency', [['annual', 'Annual total (Full year)'], ['monthly', 'Monthly paycheck (1 month)'], ['weekly', 'Weekly paycheck (52 weeks)'], ['biweekly', 'Biweekly paycheck (26 pay periods)'], ['partial', 'Partial year (Prorated months)']])}
        {v.taxPeriod === 'partial' && num('monthsCount', 'Months worked in year', undefined, 'months', 'Prorates brackets and deductions for partial-year residence.')}
        {num('income', v.taxPeriod === 'monthly' ? 'Monthly gross wages' : v.taxPeriod === 'weekly' ? 'Weekly gross wages' : v.taxPeriod === 'biweekly' ? 'Biweekly gross wages' : 'Employment income', symbol, undefined, v.taxPeriod === 'monthly' ? 'Enter gross pay for 1 month.' : v.taxPeriod === 'weekly' ? 'Enter gross pay for 1 week.' : v.taxPeriod === 'biweekly' ? 'Enter gross pay for 2 weeks.' : 'Annual gross salary or wages.')}
        {num('otherIncome', v.taxPeriod === 'annual' ? 'Other ordinary income' : 'Other period income', symbol)}
        {legalCountry.profiles ? select('taxProfile', 'Taxpayer profile', legalCountry.profiles.map(profile => [profile.value, profile.label])) : ctx.country === 'US' ? select('filing', 'Filing status', [['single', 'Single'], ['joint', 'Married, filing jointly']]) : <div className="reference-field"><span>Filing profile</span><strong>Resident individual</strong><small>{legalCountry.legalBody} reference, {legalCountry.years.find(pack => pack.id === v.year)?.label}</small></div>}
        {select('deductionMode', 'Deduction method', [['standard', ctx.country === 'CA' ? 'No additional deduction' : 'Standard allowance'], ['custom', 'Custom deduction']])}
        {v.deductionMode === 'custom' && num('deduction', 'National deduction', symbol)}
        {v.method === 'flat' && num('flatRate', 'National flat rate', undefined, '%')}
        {customRegion && num('regionalRate', 'Custom regional rate', undefined, '%', 'No official regional schedule is loaded.')}
        {legalCountry.additionalAllowanceLabel && v.method === 'progressive' && num('countryRelief', legalCountry.additionalAllowanceLabel, symbol, undefined, 'Annual tax-base relief only, not a cash deduction. Enter qualifying additional deductions; do not repeat the basic allowance or pre-tax adjustments.')}
      </div>
      {legalCountry.profiles && <p className="country-profile-note">{legalCountry.profiles.find(profile => profile.value === v.taxProfile)?.description}<a href={legalCountry.source.url} target="_blank" rel="noreferrer">View country reference<Globe2 size={13} /></a></p>}

      {show('customBrackets') && v.method === 'custom' && (
        <div className="custom-brackets-box section-gap">
          <div className="custom-brackets-header">
            <strong>Custom Tax Tiers (Cumulative Brackets)</strong>
            <span>Enter each cumulative maximum taxable income with its marginal rate. The last row applies above the prior tier.</span>
          </div>
          <div className="custom-bracket-rows">
            <div className="bracket-row"><span className="bracket-num">01</span>{num('customCap1', 'Up to', symbol, undefined, 'e.g., 20,000')}{num('customRate1', 'Rate', undefined, '%')}</div>
            <div className="bracket-row"><span className="bracket-num">02</span>{num('customCap2', 'Up to', symbol, undefined, 'e.g., 60,000')}{num('customRate2', 'Rate', undefined, '%')}</div>
            <div className="bracket-row"><span className="bracket-num">03</span>{num('customCap3', 'Up to', symbol)}{num('customRate3', 'Rate', undefined, '%')}</div>
            <div className="bracket-row"><span className="bracket-num">04</span>{num('customCap4', 'Up to', symbol)}{num('customRate4', 'Rate', undefined, '%')}</div>
            <div className="bracket-row final-row"><span className="bracket-num">05</span><div className="field"><div className="field-label-row"><label>Above prior tier</label></div><div className="input-wrap"><span className="input-prefix">∞</span><input readOnly value="Unlimited" /></div></div>{num('customRate5', 'Top rate', undefined, '%')}</div>
          </div>
          <p className="field-help">Tiers are cumulative and sorted automatically. Typical usage: recreate personalized thresholds not covered by national packs, or model hypothetical changes.</p>
        </div>
      )}

      {show('personal') && ctx.country === 'US' && (
        <div className="personal-profile-box section-gap">
          <div className="personal-box-header">
            <strong>Personal Circumstances Profile</strong>
            <span>Fine-tune demographics for precise federal entitlement adjustments</span>
          </div>
          <div className="fields-grid">
            <div className="standalone-toggle">{toggle('age65', 'Taxpayer or spouse is age 65 or older', 'Applies the Senior Additional Standard Deduction (larger than the regular amount).')}</div>
            {num('dependents', 'Children / minor dependents', undefined, 'children', 'Number of minor children for the Child Tax Credit calculations based on reference year.')}
            {num('withholding', 'Federal withholding already paid', symbol, undefined, 'Total amount withheld from paychecks during the year. This gives you an estimate of your refund or balance owed.')}
          </div>
        </div>
      )}
      {show('levies') && (() => {
        const localityId = ctx.county || v.county;
        const levies = localLevyOptions(ctx.country, ctx.region, localityId);
        const visible = levies.filter(l => levyVisibleAt(l.id, mode));
        const hidden = levies.length - visible.length;
        return (
          <div className="county-selector-box section-gap ca-levy-box">
            <div className="ca-levy-heading">
              <strong>Optional levies for {legalCountry.name}</strong>
              <span>Include only what applies to you. Rates are editable planning assumptions, not a complete payslip.</span>
            </div>
            {hidden > 0 && <p className="levy-hidden-note">{hidden} more levy options available in a higher detail mode.</p>}
            <div className="ca-levy-list">
              {visible.map(levy => {
                const enabled = (v[levy.id] ?? String(levy.defaultOn)) === 'true';
                return (
                  <div key={levy.id} className={`ca-levy-card ${enabled ? 'is-on' : ''}`}>
                    <div className="ca-levy-top">
                      <div>
                        <strong>{levy.label}</strong>
                        <span className="ca-levy-kind">{levy.kind}</span>
                      </div>
                      <span className="ca-levy-mandate">{levy.mandatoryLabel}</span>
                    </div>
                    <p>{levy.condition}</p>
                    <div className="standalone-toggle">{toggle(levy.id, enabled ? 'Included in this calculation' : 'Not included', 'You can turn this on or off regardless of typical mandatory status.')}</div>
                    {levy.kind === 'payroll' && enabled && <><div className="fields-grid">{num(`${levy.id}Rate`, 'Employee rate', undefined, '%')}{num(`${levy.id}Cap`, 'Annual eligible earnings ceiling', symbol, undefined, 'Annual salary ceiling, not a contribution amount. Zero means uncapped unless a ceiling is required for this country.')}{levy.id === 'countryPayroll' && select('countryPayrollBaseMode', 'Contribution base', [['income', 'Use employment income'], ['custom', 'Enter eligible annual wages']])}{levy.id === 'countryPayroll' && v.countryPayrollBaseMode === 'custom' && num('countryPayrollBase', 'Eligible wages / year', symbol)}</div>{levy.id === 'countryPayroll' && legalCountry.contribution && <a className="levy-source" href={legalCountry.contribution.source.url} target="_blank" rel="noreferrer">{legalCountry.contribution.source.name}<Globe2 size={13} /></a>}</>}
                    {levy.kind === 'sales' && enabled && <div className="fields-grid">{num(`${levy.id}Rate`, 'Base rate on taxable spending', undefined, '%')}{num('taxableSpendShare', 'Share of after-tax income treated as taxable spending', undefined, '%')}</div>}
                    {levy.kind === 'property' && enabled && <div className="fields-grid">{num('assessedValue', 'Assessed value', symbol)}{num(`${levy.id}Rate`, 'Effective rate', undefined, '%')}</div>}
                    {(levy.id === 'localIncome' || levy.id === 'customLevy') && enabled && num(`${levy.id}Rate`, 'Rate on adjusted income', undefined, '%')}
                    {levy.kind === 'health' && enabled && num(`${levy.id}Rate`, 'Rate', undefined, '%')}
                    {levy.kind === 'solidarity' && enabled && num(`${levy.id}Rate`, 'Rate on income tax or income', undefined, '%')}
                    {enabled && ['churchTax', 'communalTax', 'residentTax', 'localIncomeTax', 'cantonalTax'].includes(levy.id) && num(`${levy.id}Rate`, 'Applicable rate (see basis above)', undefined, '%')}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {show('levies') && <div className="option-groups section-gap">
        <OptionGroup title="Other local charges" description="Enter a fixed annual municipal or local amount" icon={<Wallet size={20} />} tone="blue" invalid={invalid('localAnnualAmount')}>
          {toggle('localFixed', 'Include an annual local charge', 'Use an amount from your local authority. It is prorated to the calculation frequency, and is not inferred from your locality name.')}
          {v.localFixed === 'true' && <div className="section-gap">{num('localAnnualAmount', 'Local charge / year', symbol)}</div>}
        </OptionGroup>
      </div>}
      {show('personal') && ['US', 'CA'].includes(ctx.country) && <div className="standalone-toggle">{toggle('payroll', ctx.country === 'US' ? 'Include employee FICA' : 'Include employee CPP & EI', 'Annualized, single-earner estimate. Do not also enable the flat payroll estimate above.')}</div>}
      {show('personal') && <div className="option-groups section-gap">
        <OptionGroup title="Deductions & credits" description="Pre-tax adjustments, credits, and country-specific credits" icon={<Wallet size={20} />} tone="purple" invalid={invalid('pretax', 'credits', 'contributions', 'ctc')}><div className="fields-grid">{num('pretax', 'Pre-tax adjustments', symbol)}{num('credits', 'National tax credits', symbol)}{num('contributions', 'Other yearly contributions', symbol)}{ctx.country === 'US' && num('ctc', 'Additional child tax credit amount', symbol, undefined, 'Optional extra amount on top of dependents-based credit.')}</div></OptionGroup>
        {ctx.country === 'GB' && <OptionGroup title="United Kingdom options" description="Marriage Allowance and National Insurance" icon={<Wallet size={20} />} tone="blue">{toggle('marriage', 'Apply Marriage Allowance', 'Transfers part of a non-taxpayer\u2019s allowance.')}{toggle('payroll', 'Include Class 1 National Insurance')}</OptionGroup>}
        {ctx.country === 'AU' && <OptionGroup title="Australia options" description="Medicare levy" icon={<Wallet size={20} />} tone="blue">{toggle('medicare', 'Include 2% Medicare levy', 'Surcharge and exemption tests are not modeled.')}</OptionGroup>}
        {ctx.country === 'DE' && <OptionGroup title="Germany options" description="Solidarity surcharge and church tax" icon={<Wallet size={20} />} tone="blue">{toggle('solidarity', 'Include Solidaritätszuschlag')}{toggle('churchTax', 'Include Kirchensteuer')}{num('social', 'Social insurance (employee share)', undefined, '%')}</OptionGroup>}
        {ctx.country === 'FR' && <OptionGroup title="France options" description="CSG/CRDS style social charges" icon={<Wallet size={20} />} tone="blue">{num('social', 'Social contributions', undefined, '%')}{toggle('cotisations', 'Include estimated cotisations')}</OptionGroup>}
        {ctx.country === 'JP' && <OptionGroup title="Japan options" description="Inhabitant tax and social insurance" icon={<Wallet size={20} />} tone="blue">{toggle('residentTax', 'Include local inhabitant tax (jūminzei)')}{num('social', 'Shakai hoken estimate', undefined, '%')}</OptionGroup>}
        {ctx.country === 'IN' && <OptionGroup title="India options" description="Cess and surcharge" icon={<Wallet size={20} />} tone="blue">{toggle('cess', 'Include health & education cess')}{toggle('surchargeIn', 'Include high-income surcharge')}</OptionGroup>}
        {ctx.country === 'NZ' && <OptionGroup title="New Zealand options" description="ACC earner levy" icon={<Wallet size={20} />} tone="blue">{num('social', 'ACC earner levy', undefined, '%')}</OptionGroup>}
        {ctx.country === 'IE' && <OptionGroup title="Ireland options" description="USC and PRSI" icon={<Wallet size={20} />} tone="blue">{toggle('usc', 'Include USC')}{toggle('prsi', 'Include PRSI')}</OptionGroup>}
        {ctx.country === 'SG' && <OptionGroup title="Singapore options" description="CPF" icon={<Wallet size={20} />} tone="blue">{toggle('cpf', 'Include employee CPF')}</OptionGroup>}
        {ctx.country === 'HK' && <OptionGroup title="Hong Kong options" description="MPF" icon={<Wallet size={20} />} tone="blue">{toggle('mpf', 'Include MPF contributions')}</OptionGroup>}
        {ctx.country === 'KR' && <OptionGroup title="Korea options" description="Local income tax surcharge" icon={<Wallet size={20} />} tone="blue">{toggle('localIncomeTax', 'Include 10% local income-tax surcharge')}</OptionGroup>}
        {ctx.country === 'BR' && <OptionGroup title="Brazil options" description="INSS contribution estimate" icon={<Wallet size={20} />} tone="blue">{toggle('inss', 'Include INSS estimate', 'Rate and annual eligible earnings ceiling are set in the levy options above.')}</OptionGroup>}
        {!['US', 'CA', 'GB', 'AU', 'AE', 'DE', 'FR', 'JP', 'IN', 'NZ', 'CH', 'IE', 'SG', 'HK', 'KR', 'BR'].includes(ctx.country) && <OptionGroup title={`${legalCountry.name} options`} description="Social contributions & extra levies" icon={<Wallet size={20} />} tone="blue" invalid={invalid('social')}><div className="fields-grid">{num('social', 'Social contributions / levies', undefined, '%')}</div></OptionGroup>}
      </div>}
    </>;
  }

  if (tool === 'car') return <>{methods}<div className="fields-grid">
    {num('price', 'Vehicle price', symbol)}{num('down', 'Down payment', symbol)}{num('rate', 'Annual interest rate', undefined, '%')}
    {select('months', 'Loan term', [12, 24, 36, 48, 60, 72, 84, 96, 120].map(months => [String(months), `${months} months`]))}
    {show('extra') && v.method === 'balloon' && num('balloon', 'Final balloon amount', symbol)}
  </div>{mode !== 'simple' && <div className="option-groups section-gap">
    {show('purchase') && <OptionGroup title="Trade-in & purchase costs" description="Trade-in, rebates, sales tax, and fees" icon={<CreditCard size={20} />} tone="pink" invalid={invalid('trade', 'rebate', 'salesTax', 'fees')}><div className="fields-grid">{num('trade', 'Trade-in value', symbol)}{num('rebate', 'Purchase rebate', symbol)}{num('salesTax', 'Sales tax', undefined, '%')}{num('fees', 'Title / registration fees', symbol)}</div>{toggle('tradeTaxCredit', 'Trade-in reduces the taxable price', 'Enable only where local rules permit.')}{toggle('financeFees', 'Include fees in the loan')}</OptionGroup>}
    {show('extra') && v.method !== 'flat' && <OptionGroup title="Extra payments" description="Pay additional principal every month" icon={<Plus size={20} />} invalid={invalid('extra')}>{num('extra', 'Extra monthly principal', symbol)}</OptionGroup>}
  </div>}</>;

  if (tool === 'compound') return <>{methods}<div className="fields-grid">
    {num('principal', 'Starting investment', symbol)}{num('contribution', 'Monthly contribution', symbol)}{num('rate', 'Expected annual return', undefined, '%')}{num('years', 'Investment period', undefined, 'years')}
  </div>{mode !== 'simple' && <div className="option-groups section-gap">
    {show('fees') && <OptionGroup title="Inflation & fees" description="Account for purchasing power and annual expenses" icon={<TrendingUp size={20} />} tone="purple" invalid={invalid('inflation', 'annualFee')}><div className="fields-grid">{num('inflation', 'Annual inflation', undefined, '%')}{num('annualFee', 'Annual expense ratio', undefined, '%')}</div></OptionGroup>}
    {show('timing') && <OptionGroup title="Contribution & interest timing" description="Compounding frequency, deposit cadence, and timing" icon={<CalendarDays size={20} />} invalid={invalid('frequency', 'timing', 'contribFreq')}><div className="fields-grid">
      {v.method === 'compound' && select('frequency', 'Compounding', [['1', 'Annually'], ['2', 'Semiannually'], ['4', 'Quarterly'], ['12', 'Monthly'], ['365', 'Daily']])}
      {select('contribFreq', 'Contribution cadence', [['monthly', 'Each month'], ['annual', 'Once per year']])}
      {select('timing', 'Deposit timing', [['end', 'End of period'], ['beginning', 'Beginning of period']])}
    </div></OptionGroup>}
  </div>}</>;

  if (tool === 'transaction') return <>{methods}<div className="fields-grid">
    {num('amount', v.method === 'gross-up' ? 'Target net / transaction' : 'Amount / transaction', symbol)}{num('count', 'Number of transactions')}{num('rate', 'Processing fee', undefined, '%')}{num('fixed', 'Fixed fee / transaction', symbol)}
  </div>{mode !== 'simple' && <div className="option-groups section-gap">
    {show('platform') && <OptionGroup title="Platform & international fees" description="Platform fees, border fees, exchange spread, and payout" icon={<Globe2 size={20} />} tone="purple" invalid={invalid('platform', 'crossBorder', 'spread', 'payout')}><div className="fields-grid">{num('platform', 'Platform fee', undefined, '%')}{show('crossBorder') && num('crossBorder', 'Cross-border fee', undefined, '%')}{show('crossBorder') && num('spread', 'FX spread on proceeds', undefined, '%')}{num('payout', 'One-time payout fee', symbol)}</div></OptionGroup>}
    {show('crossBorder') && <OptionGroup title="Sales tax & VAT" description="Include collected tax in the settlement calculation" icon={<Banknote size={20} />} tone="pink" invalid={invalid('vat', 'taxMode')}><div className="fields-grid">{num('vat', 'Sales tax / VAT', undefined, '%')}{v.method !== 'gross-up' && select('taxMode', 'Entered amount', [['exclusive', 'Before tax'], ['inclusive', 'Tax included']])}</div></OptionGroup>}
  </div>}</>;

  if (tool === 'currency') return <>{methods}{num('amount', 'Amount to convert', undefined, v.from)}
    <div className="swap-fields">{select('from', 'From', currencies.map(code => [code, code]))}<button type="button" className="swap-button" onClick={onSwap} title="Swap currencies" aria-label="Swap currencies"><ArrowLeftRight size={20} /></button>{select('to', 'To', currencies.map(code => [code, code]))}</div>
    {(show('source') || v.source !== 'latest' || rateStatus === 'error') && (v.source === 'manual' ? num('customRate', `1 ${v.from} equals`, undefined, v.to) : <>
      {v.source === 'historical' && <TextField label="Reference date" value={v.date} onChange={value => change('date', value)} type="date" />}
      <div className={`rate-status ${rateStatus === 'error' ? 'error-text' : ''}`}><span className={`status-dot ${rateStatus === 'loading' ? 'pulsing' : ''}`} /><span>{rateStatus === 'loading' ? 'Fetching daily reference...' : rateStatus === 'error' ? 'Rate unavailable. Retry or select Custom rate.' : v.from === v.to ? 'Same currency: 1 to 1' : `ECB reference / ${ctx.rateDate || 'awaiting rate'}`}</span><button type="button" className="rate-refresh" onClick={onRefresh} disabled={rateStatus === 'loading'}><RefreshCw size={14} className={rateStatus === 'loading' ? 'spin' : ''} />Refresh</button></div>
      {rateStatus === 'error' && <button type="button" className="text-button" onClick={() => change('source', 'manual')}>Enter a custom rate<ArrowLeftRight size={15} /></button>}
    </>)}
    {!show('source') && v.source === 'latest' && rateStatus !== 'error' && <div className="rate-status"><span className={`status-dot ${rateStatus === 'loading' ? 'pulsing' : ''}`} /><span>{rateStatus === 'loading' ? 'Fetching daily reference...' : v.from === v.to ? 'Same currency: 1 to 1' : `ECB reference / ${ctx.rateDate || 'awaiting rate'}`}</span></div>}
    {show('costs') && <div className="option-groups section-gap"><OptionGroup title="Conversion costs" description="Allow for the provider's spread and fixed fee" icon={<CreditCard size={20} />} tone="pink" invalid={invalid('spread', 'fee')}><div className="fields-grid">{num('spread', 'Exchange spread', undefined, '%')}{num('fee', 'Fixed fee', undefined, v.from)}</div></OptionGroup></div>}
  </>;

  if (tool === 'probability') return <>{methods}<div className="fields-grid">
    {v.method === 'independent' ? <>{num('pa', 'Probability of A', undefined, '%')}{num('pb', 'Probability of B', undefined, '%')}{show('event') && select('event', 'Calculate the probability of', [['and', 'Both A and B'], ['or', 'A or B, or both'], ['xor', 'Exactly one event'], ['neither', 'Neither event']], 'full-width')}</> : v.method === 'conditional' ? <>{num('joint', 'P(A and B)', undefined, '%')}{num('given', 'P(B)', undefined, '%')}</> : <>
      {num('n', v.method === 'binomial' ? 'Number of trials (n)' : 'Total objects (n)')}{num('k', v.method === 'binomial' ? 'Successes (k)' : 'Selected objects (k)')}
      {(v.method === 'binomial' || v.method === 'monte-carlo') && <>{num('p', 'Success probability', undefined, '%')}{show('event') && select('binomialEvent', 'Success condition', [['exactly', 'Exactly k successes'], ['atleast', 'At least k successes'], ['atmost', 'At most k successes']])}</>}
      {show('simulation') && v.method === 'monte-carlo' && <>{num('sims', 'Simulations (S)', undefined, undefined, '1,000 to 1,000,000 runs. Higher S tightens the estimate.')}{num('seed', 'Random seed', undefined, undefined, 'Deterministic seed — the same seed reproduces the same estimate.')}</>}
    </>}
  </div>{hints && show('event') && <p className="context-hint"><ShieldCheck size={16} />{v.method === 'conditional' ? 'The joint probability cannot exceed P(B), and P(B) must be greater than zero.' : v.method === 'monte-carlo' ? 'Seeded simulation — reproducible, and checked against the exact binomial value.' : ['permutations', 'combinations'].includes(v.method) ? 'Selections are without replacement. Arrangement counts use exact integer arithmetic.' : 'This model assumes independent events with the specified probabilities.'}</p>}</>;

  if (tool === 'scientific') {
    const insert = (token: string) => {
      const field = expression.current;
      const start = field?.selectionStart ?? v.expression.length, end = field?.selectionEnd ?? start;
      const selected = v.expression.slice(start, end);
      const addition = token.endsWith('(') && selected ? `${token}${selected})` : token;
      change('expression', v.expression.slice(0, start) + addition + v.expression.slice(end));
      requestAnimationFrame(() => { field?.focus(); field?.setSelectionRange(start + addition.length, start + addition.length); });
    };
    return <>{methods}{v.method === 'expression' ? <>
      <label className="expression-field" data-field="expression"><span>Mathematical expression</span><textarea ref={expression} value={v.expression} spellCheck={false} maxLength={400} aria-invalid={Boolean(errors.expression)} aria-describedby={errors.expression ? 'expression-error' : undefined} onChange={event => change('expression', event.target.value)} /></label>
      {errors.expression && <span className="field-error" id="expression-error">{errors.expression}</span>}
      {show('solver') && <div className="math-keypad">{['sqrt(', 'sin(', 'cos(', 'log(', 'pi', '(', ')', '^'].map(token => <button type="button" key={token} onMouseDown={event => event.preventDefault()} onClick={() => insert(token)}>{token}</button>)}</div>}
      <div className="fields-grid">{show('variables') && num('x', 'Variable x')}{show('variables') && num('y', 'Variable y')}{show('variables') && select('angle', 'Angle mode', [['radians', 'Radians'], ['degrees', 'Degrees']], 'full-width')}</div>
    </> : <><div className="quadratic-preview mono">ax<sup>2</sup> + bx + c = 0</div><div className="fields-grid">{num('a', 'Coefficient a')}{num('b', 'Coefficient b')}{num('c', 'Constant c')}</div></>}</>;
  }

  if (tool === 'units') return <>{methods}{num('amount', 'Value to convert')}<div className="swap-fields">{select('from', 'From unit', Object.entries(unitGroups[v.category]?.units || {}).map(([id, unit]) => [id, `${unit.name} (${id})`]))}<button type="button" className="swap-button" onClick={onSwap} title="Swap units" aria-label="Swap units"><ArrowLeftRight size={20} /></button>{select('to', 'To unit', Object.entries(unitGroups[v.category]?.units || {}).map(([id, unit]) => [id, `${unit.name} (${id})`]))}</div>{show('catalog') && <div className="fields-grid">{select('sigFigs', 'Significant figures shown', [3, 4, 5, 6, 8, 10, 12, 15].map(n => [String(n), `${n} significant figures`]))}</div>}{hints && show('catalog') && <p className="context-hint"><SlidersHorizontal size={16} />Temperature offsets are handled automatically. Significant figures only affect display rounding; custom units you define in the Utility studio appear in these lists and convert through the same base unit.</p>}</>;

  return <>{methods}<div className="fields-grid">{num('height', 'Height', undefined, v.units === 'metric' ? 'cm' : 'in')}{num('weight', 'Weight', undefined, v.units === 'metric' ? 'kg' : 'lb')}{show('system') && select('standard', 'Reference band set', [['who', 'WHO international adult'], ['asia-pacific', 'Asia-Pacific adult cut-offs']])}{show('guidance') && num('targetBmi', 'Target BMI for weight inversion', undefined, 'BMI', 'The engine inverts the ratio at this BMI to report a target weight.')}</div>{hints && show('guidance') && <p className="context-hint"><ShieldCheck size={16} />For adults only. BMI is a screening reference, not an assessment of individual health. The ratio is identical in both band sets; only the descriptive category and reference weight range change.</p>}</>;
}

/** Surfaces the person's own saved definitions in the calculator, ranked by frequency and recency. */
function WorkspaceStrip({ tool, onApply }: { tool: ToolId; onApply: (partial: Values) => void }) {
  const workspace = useMemo(() => loadWorkspace(), []);
  const entries = tool === 'currency' ? rankUsage<CurrencyPair>(workspace.pairs, 5).map(item => ({ id: item.id, label: item.label, values: { from: item.from, to: item.to, spread: String(item.spread), fee: String(item.fee) } }))
    : tool === 'scientific' ? rankUsage<SavedFormula>(workspace.formulas, 5).map(item => ({ id: item.id, label: item.name, values: { method: 'expression', expression: item.expression, x: String(item.variables.x), y: String(item.variables.y), angle: item.angle } }))
      : tool === 'bmi' ? workspace.profiles.slice(0, 5).map(item => ({ id: item.id, label: item.name, values: { units: item.units, height: String(item.height), weight: String(item.weight) } }))
        : tool === 'probability' ? workspace.scenarios.slice(0, 5).map(item => ({ id: item.id, label: item.name, values: item.values }))
          : workspace.units.slice(0, 5).map(item => ({ id: item.id, label: `${item.name} (${item.code})`, values: { category: item.category, from: item.code } }));
  if (!entries.length) return null;
  return <div className="scenario-strip workspace-strip">
    <span className="scenario-strip-label"><Bookmark size={13} /> Yours</span>
    <div className="scenario-chips">
      {entries.map(entry => <button type="button" key={entry.id} className="scenario-chip" onClick={() => { utilityRanker.observe(entry.id, tool); onApply(entry.values as Values); }}>{entry.label}</button>)}
    </div>
  </div>;
}

/** Year, month, pay-cycle and exact-date selection for period-aware tools. */
function PeriodStrip({ values, ctx, onChange }: { values: Values; ctx: CalculationContext; onChange: (field: string, value: string) => void }) {
  const year = Number(values.year?.slice(0, 4)) || new Date().getUTCFullYear();
  const kind: PeriodKind = values.taxPeriod === 'monthly' ? 'month'
    : values.taxPeriod === 'weekly' ? 'weekly'
      : values.taxPeriod === 'biweekly' ? 'biweekly'
        : values.taxPeriod === 'partial' ? 'custom-range' : 'annual';
  const month = Number(values.month) || 1;
  const period = resolvePeriod({ kind, year, month, start: values.periodStart, end: values.periodEnd, fiscalStartMonth: fiscalStarts[ctx.country] || 1 }, (values.dayCount as DayCount) || 'actual/actual');
  return <div className="period-strip">
    <div className="period-strip-head"><CalendarDays size={15} /><strong>{period.label}</strong><span>{describeSelection(period).split(' · ').slice(1).join(' · ')}</span></div>
    <div className="fields-grid">
      {kind === 'month' && <SelectField label="Month" value={String(month)} onChange={value => onChange('month', value)} options={monthOptions(year)} />}
      {kind === 'custom-range' && <>
        <TextField label="Period start" type="date" value={values.periodStart || `${year}-01-01`} onChange={value => onChange('periodStart', value)} />
        <TextField label="Period end" type="date" value={values.periodEnd || `${year}-12-31`} onChange={value => onChange('periodEnd', value)} />
      </>}
      {(kind === 'weekly' || kind === 'biweekly') && <TextField label="Cycle start date" type="date" value={values.periodStart || `${year}-01-01`} onChange={value => onChange('periodStart', value)} />}
      <SelectField label="Day-count convention" value={values.dayCount || 'actual/actual'} onChange={value => onChange('dayCount', value)} options={[
        { value: 'actual/actual', label: 'Actual / actual (leap-exact)' },
        { value: 'actual/365', label: 'Actual / 365' },
        { value: 'actual/360', label: 'Actual / 360' },
        { value: '30/360', label: '30 / 360' },
      ]} />
    </div>
    <p className="period-note">{period.note}</p>
  </div>;
}

function ScenarioStrip({ tool, ctx, values, onApply }: { tool: ToolId; ctx: CalculationContext; values: Values; onApply: (partial: Values) => void }) {
  const presets = scenarioPresets[tool];
  if (!presets || presets.length < 2) return null;
  return <div className="scenario-strip">
    <span className="scenario-strip-label"><Sparkles size={13} /> Start from</span>
    <div className="scenario-chips">
      {presets.map(preset => {
        const active = Object.entries(preset.values).every(([key, value]) => values[key] === value) && (tool !== 'tax' || (preset.id !== 'previous' && preset.id !== 'current'));
        return <button type="button" key={preset.id} className={`scenario-chip ${active ? 'is-active' : ''}`} title={preset.hint} onClick={() => onApply(resolvePreset(tool, ctx, preset, values))}>{preset.label}</button>;
      })}
    </div>
  </div>;
}

function resolvePreset(tool: ToolId, ctx: CalculationContext, preset: ScenarioPreset, values: Values): Values {
  const next = { ...preset.values };
  if (tool === 'tax') {
    const years = countries[ctx.country].years;
    if (preset.id === 'current') next.year = years[years.length - 1].id;
    else if (preset.id === 'previous') next.year = scenarioYearValue(years, values.year, true);
  }
  return next;
}
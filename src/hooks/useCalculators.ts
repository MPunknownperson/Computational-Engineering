import { useEffect, useMemo, useRef, useState } from 'react';
import { countries, defaultSettings, getRegion, latestTaxYearId } from '../lib/regions';
import { currencies, toolById, tools, unitGroups } from '../lib/catalog';
import { applyRegionalPresets, processCalculation, transformInput } from '../lib/processing';
import { fetchReferenceRate } from '../lib/rates';
import { loadHabits, recordHabit } from '../lib/habits';
import type { CalculationContext, CalculationResult, ComplexityMode, CountryId, Snapshot, ToolId, Values, WorkspaceSettings } from '../lib/types';
import { defaultToolComplexity } from '../lib/complexity';

const settingsKey = 'calcvault.settings.v3';
const inputsKey = 'calcvault.inputs.v2';
const historyKey = 'calcvault.history.v2';

function readStored<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
  catch { return fallback; }
}

function loadSettings(): WorkspaceSettings {
  const stored = readStored<Partial<WorkspaceSettings> | null>(settingsKey, null)
    || { ...readStored<Partial<WorkspaceSettings> | null>('calcvault.settings.v2', null), appearance: 'light' };
  const mappedCountry = stored.country === 'DC' as string ? 'US' : stored.country;
  const country = mappedCountry && Object.prototype.hasOwnProperty.call(countries, mappedCountry) ? mappedCountry : defaultSettings.country;
  const mappedRegion = stored.country === 'DC' as string ? 'DC' : stored.region;
  return {
    ...defaultSettings,
    country,
    region: getRegion(country, mappedRegion || '').id,
    city: typeof stored.city === 'string' ? stored.city.slice(0, 100) : '',
    precision: [0, 2, 4, 6].includes(stored.precision ?? -1) ? stored.precision! : 2,
    locale: ['en-US', 'en-GB', 'de-DE', 'fr-FR'].includes(stored.locale || '') ? stored.locale! : 'en-US',
    appearance: stored.appearance === 'ink' ? 'ink' : 'light',
    live: false,
    showHints: stored.showHints !== false,
    regionalPresets: stored.regionalPresets !== false,
    rememberInputs: stored.rememberInputs !== false,
    complexity: stored.complexity === 'simple' || stored.complexity === 'advanced' ? stored.complexity : 'standard',
    toolComplexity: {
      ...defaultToolComplexity(),
      ...loadHabits().preferredComplexity,
      ...(stored.toolComplexity && typeof stored.toolComplexity === 'object' ? Object.fromEntries(
        Object.entries(stored.toolComplexity).filter(([, mode]) => mode === 'simple' || mode === 'standard' || mode === 'advanced')
      ) as Partial<Record<ToolId, ComplexityMode>> : {}),
    },
  };
}

function regionalDefaults(tool: ToolId, settings: WorkspaceSettings): Values {
  const region = getRegion(settings.country, settings.region);
  return {
    ...toolById[tool].defaults,
    ...(tool === 'mortgage' ? { propertyTax: String(region.propertyTax), convention: settings.country === 'CA' ? 'semiannual' : 'monthly' } : {}),
    ...(tool === 'car' ? { salesTax: String(region.salesTax) } : {}),
    ...(tool === 'tax' ? { year: latestTaxYearId(settings.country), county: settings.county || '' } : {}),
  };
}

function loadInputs(settings: WorkspaceSettings) {
  const stored = settings.rememberInputs === false ? {} : readStored<Partial<Record<ToolId, Values>>>(inputsKey, {});
  return Object.fromEntries(tools.map(tool => {
    const defaults = regionalDefaults(tool.id, settings);
    const values = { ...defaults };
    const previous = stored?.[tool.id];
    if (previous && typeof previous === 'object') {
      Object.entries(previous).forEach(([key, value]) => { if (key in values && typeof value === 'string') values[key] = value; });
    }
    if (tool.id === 'units' && (!unitGroups[values.category] || !unitGroups[values.category].units[values.from] || !unitGroups[values.category].units[values.to])) return [tool.id, defaults];
    return [tool.id, values];
  })) as Record<ToolId, Values>;
}

function loadHistory() {
  const stored = readStored<Snapshot[]>(historyKey, []);
  return Array.isArray(stored) ? stored.filter(item => item && tools.some(tool => tool.id === item.tool) && item.result && Array.isArray(item.result.metrics) && typeof item.name === 'string' && item.values && typeof item.values === 'object' && item.settings && Object.prototype.hasOwnProperty.call(countries, item.settings.country) && countries[item.settings.country].regions.some(region => region.id === item.settings.region)) : [];
}

interface RateState {
  key: string;
  status: 'idle' | 'loading' | 'ready' | 'error';
  rate?: number;
  date?: string;
  error?: string;
}

export function useCalculators(initialTool: ToolId = 'mortgage') {
  const [settings, setSettings] = useState(loadSettings);
  const [data, setData] = useState(() => loadInputs(settings));
  const [active, setActive] = useState<ToolId>(initialTool);
  const [snapshots, setSnapshots] = useState(loadHistory);
  const [notice, setNotice] = useState('');
  const [storageError, setStorageError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [exchange, setExchange] = useState<RateState>({ key: '', status: 'idle' });
  const [refreshToken, setRefreshToken] = useState(0);
  const [submitted, setSubmitted] = useState<Partial<Record<ToolId, { values: Values; context: CalculationContext }>>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const forceRateRefresh = useRef(false);
  const country = countries[settings.country];
  const region = getRegion(settings.country, settings.region);
  const values = data[active];
  const fx = data.currency;
  const rateKey = `${fx.from}:${fx.to}:${fx.source}:${fx.source === 'historical' ? fx.date : ''}`;
  const activeComplexity = settings.toolComplexity?.[active] || settings.complexity || 'standard';
  const context: CalculationContext = useMemo(() => ({
    ...settings,
    complexity: activeComplexity,
    currency: country.currency,
    rate: exchange.key === rateKey && exchange.status === 'ready' ? exchange.rate : undefined,
    rateDate: exchange.key === rateKey && exchange.status === 'ready' ? exchange.date : undefined,
  }), [settings, activeComplexity, country.currency, exchange, rateKey]);
  const draft = useMemo(() => processCalculation(active, values, context), [active, values, context]);
  const confirmed = submitted[active];
  const displayed = settings.live ? draft : confirmed ? processCalculation(active, confirmed.values, confirmed.context) : { result: null, error: '' };
  const displayContext = settings.live || !confirmed ? context : { ...confirmed.context, precision: settings.precision, locale: settings.locale, live: false, complexity: confirmed.context.complexity };
  const dirty = !settings.live && (!confirmed || JSON.stringify(confirmed.values) !== JSON.stringify(values)
    || context.country !== confirmed.context.country || context.region !== confirmed.context.region || context.city !== confirmed.context.city || context.complexity !== confirmed.context.complexity
    || (active === 'currency' && (context.rate !== confirmed.context.rate || context.rateDate !== confirmed.context.rateDate)));
  const loading = active === 'currency' && fx.source !== 'manual' && fx.from !== fx.to
    && (exchange.key !== rateKey || exchange.status === 'loading' || exchange.status === 'idle');
  const error = active === 'currency' && exchange.key === rateKey && exchange.status === 'error' && fx.source !== 'manual'
    ? exchange.error || displayed.error : displayed.error;

  function notify(message: string) {
    setNotice(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(''), 4500);
  }

  useEffect(() => {
    document.documentElement.dataset.theme = settings.appearance;
    try { localStorage.setItem(settingsKey, JSON.stringify(settings)); } catch { setStorageError(true); }
  }, [settings]);
  useEffect(() => {
    try { if (settings.rememberInputs === false) localStorage.removeItem(inputsKey); else localStorage.setItem(inputsKey, JSON.stringify(data)); }
    catch { setStorageError(true); }
  }, [data, settings.rememberInputs]);
  useEffect(() => { try { localStorage.setItem(historyKey, JSON.stringify(snapshots)); } catch { setStorageError(true); } }, [snapshots]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  useEffect(() => {
    if (active !== 'currency' || fx.source === 'manual') return;
    if (fx.from === fx.to) { setExchange({ key: rateKey, status: 'ready', rate: 1 }); return; }
    if (!currencies.includes(fx.from) || !currencies.includes(fx.to)) {
      setExchange({ key: rateKey, status: 'error', error: 'Choose a supported currency pair.' }); return;
    }
    if (fx.source === 'historical') {
      const date = new Date(`${fx.date}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fx.date) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== fx.date || fx.date < '1999-01-04' || fx.date > new Date().toISOString().slice(0, 10)) {
        setExchange({ key: rateKey, status: 'error', error: 'Enter a date between January 4, 1999 and today.' }); return;
      }
    }
    const controller = new AbortController();
    let cancelled = false;
    const timeout = setTimeout(() => controller.abort(), 12000);
    setExchange({ key: rateKey, status: 'loading' });
    const force = forceRateRefresh.current;
    forceRateRefresh.current = false;
    fetchReferenceRate(fx.from, fx.to, controller.signal, fx.source === 'historical' ? fx.date : undefined, force)
      .then(payload => {
        if (!cancelled) setExchange({ key: rateKey, status: 'ready', rate: payload.rate, date: payload.date });
      })
      .catch((error: unknown) => {
        if (!cancelled) setExchange({ key: rateKey, status: 'error', error: error instanceof Error && error.name !== 'AbortError' ? error.message : 'The request timed out. Retry or enter a custom rate.' });
      })
      .finally(() => clearTimeout(timeout));
    return () => { cancelled = true; clearTimeout(timeout); controller.abort(); };
  }, [active, fx.from, fx.to, fx.source, fx.date, rateKey, refreshToken]);

  function changeCountry(id: CountryId) {
    const region = countries[id].regions[0];
    const county = '';
    const next = { ...settings, country: id, region: region.id, county, city: '' };
    setData(previous => {
      const withPreset = applyRegionalPresets(previous, context, { ...next, currency: countries[id].currency });
      return { ...withPreset, tax: { ...withPreset.tax, year: latestTaxYearId(id), county } };
    });
    setSettings(next);
    notify('Location updated. Custom costs are preserved; amounts are not currency-converted.');
  }

  function setToolComplexity(mode: ComplexityMode) {
    setSettings(previous => ({
      ...previous,
      complexity: mode,
      toolComplexity: { ...defaultToolComplexity(), ...previous.toolComplexity, [active]: mode },
    }));
  }

  function toolComplexity(tool: ToolId = active): ComplexityMode {
    return settings.toolComplexity?.[tool] || settings.complexity || 'standard';
  }

  function applyValues(partial: Values) {
    setData(previous => ({ ...previous, [active]: { ...previous[active], ...partial } }));
  }

  function changeRegion(id: string, countyId?: string) {
    const region = getRegion(settings.country, id);
    const county = countyId !== undefined ? countyId : '';
    const next = { ...settings, region: region.id, county, city: '' };
    setData(previous => {
      const withPreset = applyRegionalPresets(previous, context, { ...next, currency: country.currency });
      return { ...withPreset, tax: { ...withPreset.tax, county } };
    });
    setSettings(next);
  }

  function updateValue(key: string, value: string) {
    setData(previous => ({ ...previous, [active]: transformInput(active, previous[active], key, value) }));
  }

  function swapValues() {
    setData(previous => {
      const old = previous[active];
      return { ...previous, [active]: { ...old, from: old.to, to: old.from, ...(active === 'currency' && Number(old.customRate) > 0 ? { customRate: String(1 / Number(old.customRate)) } : {}) } };
    });
  }

  function reset() {
    setData(previous => ({ ...previous, [active]: regionalDefaults(active, settings) }));
    notify('Example inputs restored.');
  }

  function recordValues(): Values {
    // A saved FX scenario must retain the exact rate rather than fetch a different rate on restore.
    return active === 'currency' && fx.source !== 'manual' && context.rate ? { ...draft.normalized, source: 'manual', customRate: String(context.rate) } : { ...draft.normalized };
  }

  function snapshot(result: CalculationResult, name: string, saved: boolean): Snapshot {
    return { id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, tool: active, name, values: recordValues(), settings: { ...settings }, result: { ...result, schedule: undefined }, saved, createdAt: new Date().toISOString() };
  }

  function calculate() {
    if (!draft.result || loading) {
      notify(draft.error || 'Wait for the reference rate to load.');
      const issue = draft.issues[0];
      if (issue) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-field="${issue.field}"] input, [data-field="${issue.field}"] select, [data-field="${issue.field}"] textarea`)?.focus());
      return false;
    }
    setSubmitted(previous => ({ ...previous, [active]: { values: { ...values }, context: { ...context } } }));
    setRevision(previous => previous + 1);
    const entry = snapshot(draft.result, toolById[active].title, false);
    setSnapshots(previous => { let recentCount = 0; return [entry, ...previous].filter(item => item.saved || ++recentCount <= 30); });
    recordHabit({
      tool: active,
      country: settings.country,
      region: settings.region,
      complexity: settings.toolComplexity?.[active] || settings.complexity || 'standard',
      fields: values,
    });
    notify('Calculated. Result added to this device\'s history.');
    return true;
  }

  function save(name: string) {
    if (!displayed.result || dirty || !name.trim()) return false;
    const next = [snapshot(displayed.result, name.trim(), true), ...snapshots];
    let persisted = true;
    try { localStorage.setItem(historyKey, JSON.stringify(next)); } catch { persisted = false; setStorageError(true); }
    setSnapshots(next);
    notify(persisted ? 'Calculation saved on this device.' : 'Browser storage is unavailable. Export the calculation to keep a copy.');
    return true;
  }

  function restore(entry: Snapshot) {
    const next = { ...toolById[entry.tool].defaults, ...entry.values };
    const restored = { ...settings, country: entry.settings.country, region: entry.settings.region, city: entry.settings.city };
    setData(previous => ({ ...applyRegionalPresets(previous, context, { ...restored, currency: countries[restored.country].currency }), [entry.tool]: next }));
    setSettings(restored);
    setSubmitted(previous => ({ ...previous, [entry.tool]: { values: next, context: { ...restored, currency: countries[restored.country].currency } } }));
    setActive(entry.tool);
    notify('Saved inputs and regional settings restored.');
  }

  function apply(tool: ToolId, next: Values) {
    setData(previous => ({ ...previous, [tool]: next }));
    setSubmitted(previous => ({ ...previous, [tool]: { values: next, context: { ...context } } }));
    setActive(tool);
    setRevision(previous => previous + 1);
    notify('Scenario applied. Review the updated inputs.');
  }

  return {
    active, setActive, values, settings, setSettings, country, region, context, displayContext,
    result: displayed.result, draft, error, dirty, loading, revision, snapshots, setSnapshots,
    notice, notify, dismissNotice: () => setNotice(''), storageError,
    rateStatus: exchange.key === rateKey ? exchange.status : 'loading',
    refreshRate: () => { forceRateRefresh.current = true; setRefreshToken(previous => previous + 1); },
    changeCountry, changeRegion, updateValue, swapValues, reset, calculate, save, restore, apply, recordValues, applyValues, setToolComplexity, toolComplexity,
    isSaved: snapshots.some(entry => entry.saved && entry.tool === active && entry.settings.country === settings.country && entry.settings.region === settings.region && JSON.stringify(entry.values) === JSON.stringify(recordValues())),
  };
}

export type CalculatorStore = ReturnType<typeof useCalculators>;
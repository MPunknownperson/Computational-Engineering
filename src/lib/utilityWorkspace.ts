import { brand } from './legal';
/**
 * Utility workspace: user-generated content for the practical tools.
 *
 * Currency, probability, scientific, units and BMI are used differently from the
 * financial modules — people return to the same few conversions, constants and
 * profiles. This layer stores those definitions in the browser, validates them
 * before they can influence a calculation, and exposes them as first-class
 * inputs to the engine.
 *
 * Nothing here silently changes a result: a custom unit or constant only applies
 * where the user explicitly selects it, and every definition carries its own
 * provenance note.
 */
import { unitGroups } from './catalog';
import type { ToolId } from './types';

const KEY = `${brand.slug}.workspace.v1`;
const LEGACY_KEY = `${brand.legacySlug}.workspace.v1`;
const EXPORT_FORMAT = `${brand.slug}-workspace`;
const LEGACY_EXPORT_FORMAT = `${brand.legacySlug}-workspace`;
const LIMIT = 120;

export interface CustomUnit {
  id: string;
  category: string;
  code: string;
  name: string;
  /** Multiplier into the category's canonical base unit. */
  factor: number;
  note: string;
  createdAt: string;
}

export interface CustomConstant {
  id: string;
  symbol: string;
  value: number;
  note: string;
  createdAt: string;
}

export interface SavedFormula {
  id: string;
  name: string;
  expression: string;
  variables: { x: number; y: number };
  angle: 'radians' | 'degrees';
  uses: number;
  createdAt: string;
}

export interface CurrencyPair {
  id: string;
  from: string;
  to: string;
  label: string;
  spread: number;
  fee: number;
  uses: number;
  createdAt: string;
}

export interface ProbabilityScenario {
  id: string;
  name: string;
  method: string;
  values: Record<string, string>;
  note: string;
  createdAt: string;
}

export interface BodyProfile {
  id: string;
  name: string;
  units: 'metric' | 'imperial';
  height: number;
  weight: number;
  /** Optional context the WHO adult bands do not cover on their own. */
  ageBand?: 'adult' | 'older-adult';
  frame?: 'small' | 'medium' | 'large';
  note: string;
  createdAt: string;
}

export interface UtilityWorkspace {
  units: CustomUnit[];
  constants: CustomConstant[];
  formulas: SavedFormula[];
  pairs: CurrencyPair[];
  scenarios: ProbabilityScenario[];
  profiles: BodyProfile[];
  pinned: ToolId[];
  updatedAt: string;
}

export const emptyWorkspace = (): UtilityWorkspace => ({
  units: [], constants: [], formulas: [], pairs: [], scenarios: [], profiles: [], pinned: [],
  updatedAt: new Date().toISOString(),
});

const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function sanitizeList<T extends { id: string }>(value: unknown, guard: (item: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  const out: T[] = [];
  for (const raw of value.slice(0, LIMIT)) {
    if (!raw || typeof raw !== 'object') continue;
    const parsed = guard(raw as Record<string, unknown>);
    if (parsed) out.push(parsed);
  }
  return out;
}

const str = (value: unknown, max = 80) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : NaN);

export function loadWorkspace(): UtilityWorkspace {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return emptyWorkspace();
    const parsed = JSON.parse(raw) as Partial<UtilityWorkspace>;
    return {
      units: sanitizeList(parsed.units, item => {
        const factor = num(item.factor);
        const category = str(item.category, 24);
        if (!unitGroups[category] || !(factor > 0) || !str(item.code, 12)) return null;
        return { id: str(item.id, 48) || uid(), category, code: str(item.code, 12), name: str(item.name, 48) || str(item.code, 12), factor, note: str(item.note, 160), createdAt: str(item.createdAt, 32) || new Date().toISOString() };
      }),
      constants: sanitizeList(parsed.constants, item => {
        const value = num(item.value);
        const symbol = str(item.symbol, 16);
        if (!Number.isFinite(value) || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(symbol)) return null;
        return { id: str(item.id, 48) || uid(), symbol, value, note: str(item.note, 160), createdAt: str(item.createdAt, 32) || new Date().toISOString() };
      }),
      formulas: sanitizeList(parsed.formulas, item => {
        const expression = str(item.expression, 400);
        if (!expression) return null;
        const vars = (item.variables || {}) as Record<string, unknown>;
        return {
          id: str(item.id, 48) || uid(), name: str(item.name, 60) || 'Saved expression', expression,
          variables: { x: Number.isFinite(num(vars.x)) ? num(vars.x) : 0, y: Number.isFinite(num(vars.y)) ? num(vars.y) : 0 },
          angle: item.angle === 'degrees' ? 'degrees' : 'radians',
          uses: Math.max(0, Math.trunc(num(item.uses) || 0)), createdAt: str(item.createdAt, 32) || new Date().toISOString(),
        };
      }),
      pairs: sanitizeList(parsed.pairs, item => {
        const from = str(item.from, 6).toUpperCase(), to = str(item.to, 6).toUpperCase();
        if (from.length !== 3 || to.length !== 3) return null;
        return {
          id: str(item.id, 48) || uid(), from, to, label: str(item.label, 60) || `${from} to ${to}`,
          spread: Math.min(99, Math.max(0, num(item.spread) || 0)), fee: Math.max(0, num(item.fee) || 0),
          uses: Math.max(0, Math.trunc(num(item.uses) || 0)), createdAt: str(item.createdAt, 32) || new Date().toISOString(),
        };
      }),
      scenarios: sanitizeList(parsed.scenarios, item => {
        const method = str(item.method, 24);
        if (!method) return null;
        const values = item.values && typeof item.values === 'object' ? Object.fromEntries(Object.entries(item.values as Record<string, unknown>).slice(0, 20).map(([key, value]) => [key.slice(0, 24), String(value).slice(0, 32)])) : {};
        return { id: str(item.id, 48) || uid(), name: str(item.name, 60) || 'Saved scenario', method, values, note: str(item.note, 160), createdAt: str(item.createdAt, 32) || new Date().toISOString() };
      }),
      profiles: sanitizeList(parsed.profiles, item => {
        const height = num(item.height), weight = num(item.weight);
        if (!(height > 0) || !(weight > 0)) return null;
        return {
          id: str(item.id, 48) || uid(), name: str(item.name, 60) || 'Saved profile',
          units: item.units === 'imperial' ? 'imperial' : 'metric', height, weight,
          ageBand: item.ageBand === 'older-adult' ? 'older-adult' : 'adult',
          frame: item.frame === 'small' || item.frame === 'large' ? item.frame : 'medium',
          note: str(item.note, 160), createdAt: str(item.createdAt, 32) || new Date().toISOString(),
        };
      }),
      pinned: Array.isArray(parsed.pinned) ? (parsed.pinned.filter(id => typeof id === 'string').slice(0, 10) as ToolId[]) : [],
      updatedAt: str(parsed.updatedAt, 32) || new Date().toISOString(),
    };
  } catch {
    return emptyWorkspace();
  }
}

export function saveWorkspace(workspace: UtilityWorkspace) {
  const next = { ...workspace, updatedAt: new Date().toISOString() };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode */ }
  return next;
}

export function createId() { return uid(); }

/** Merged unit catalog: built-in groups plus validated user units. */
export function mergedUnitGroups(workspace: UtilityWorkspace) {
  const merged: typeof unitGroups = {};
  for (const [key, group] of Object.entries(unitGroups)) merged[key] = { label: group.label, units: { ...group.units } };
  for (const unit of workspace.units) {
    if (!merged[unit.category]) continue;
    if (merged[unit.category].units[unit.code]) continue; // never override a standard unit
    merged[unit.category].units[unit.code] = { name: `${unit.name} (custom)`, factor: unit.factor };
  }
  return merged;
}

/**
 * Registers validated custom units into the live catalog so the deterministic
 * conversion engine, its round-trip check and the export all see them.
 * Standard units are never overwritten.
 */
export function installCustomUnits(workspace: UtilityWorkspace) {
  let installed = 0;
  for (const unit of workspace.units) {
    const group = unitGroups[unit.category];
    if (!group) continue;
    const existing = group.units[unit.code];
    if (existing && !existing.name.endsWith('(custom)')) continue;
    group.units[unit.code] = { name: `${unit.name} (custom)`, factor: unit.factor };
    installed++;
  }
  return installed;
}

/** Removes a custom unit from the live catalog when the user deletes it. */
export function uninstallCustomUnit(unit: CustomUnit) {
  const group = unitGroups[unit.category];
  if (group && group.units[unit.code]?.name.endsWith('(custom)')) delete group.units[unit.code];
}

export interface ValidationOutcome { ok: boolean; message: string }

export function validateCustomUnit(workspace: UtilityWorkspace, draft: { category: string; code: string; factor: string }): ValidationOutcome {
  const factor = Number(draft.factor);
  if (!unitGroups[draft.category]) return { ok: false, message: 'Choose an existing measurement category.' };
  if (draft.category === 'temperature') return { ok: false, message: 'Temperature uses offsets rather than factors, so custom scales are not accepted.' };
  if (!/^[A-Za-z0-9_/^-]{1,12}$/.test(draft.code)) return { ok: false, message: 'Use 1-12 characters: letters, digits, dash, slash or underscore.' };
  if (unitGroups[draft.category].units[draft.code]) return { ok: false, message: 'That code already exists as a standard unit in this category.' };
  if (workspace.units.some(unit => unit.category === draft.category && unit.code === draft.code)) return { ok: false, message: 'You already defined that unit code in this category.' };
  if (!Number.isFinite(factor) || factor <= 0) return { ok: false, message: 'The conversion factor must be a positive number.' };
  if (factor > 1e15 || factor < 1e-15) return { ok: false, message: 'Keep the factor within 1e-15 and 1e15 for reliable precision.' };
  return { ok: true, message: `1 ${draft.code} = ${factor} ${Object.keys(unitGroups[draft.category].units)[0]} base units.` };
}

export function validateConstant(workspace: UtilityWorkspace, draft: { symbol: string; value: string }): ValidationOutcome {
  const reserved = new Set(['x', 'y', 'pi', 'e', 'sin', 'cos', 'tan', 'sqrt', 'log', 'abs', 'min', 'max', 'exp']);
  const value = Number(draft.value);
  if (!/^[a-zA-Z][a-zA-Z0-9_]{0,15}$/.test(draft.symbol)) return { ok: false, message: 'Symbols start with a letter and may contain letters, digits or underscores.' };
  if (reserved.has(draft.symbol)) return { ok: false, message: 'That symbol is reserved by the expression parser.' };
  if (workspace.constants.some(item => item.symbol === draft.symbol)) return { ok: false, message: 'You already defined that symbol.' };
  if (!Number.isFinite(value)) return { ok: false, message: 'Enter a finite numeric value.' };
  return { ok: true, message: `${draft.symbol} will be substituted as ${value} before evaluation.` };
}

/** Substitutes user constants into an expression without touching reserved names. */
export function applyConstants(expression: string, constants: CustomConstant[]) {
  let output = expression;
  const applied: string[] = [];
  for (const constant of [...constants].sort((a, b) => b.symbol.length - a.symbol.length)) {
    const pattern = new RegExp(`\\b${constant.symbol}\\b`, 'g');
    if (pattern.test(output)) {
      output = output.replace(pattern, `(${constant.value})`);
      applied.push(`${constant.symbol} = ${constant.value}`);
    }
  }
  return { expression: output, applied };
}

/** Frequency-ranked suggestions so the tools adapt to how each person uses them. */
export function rankUsage<T extends { uses: number; createdAt: string }>(items: T[], limit = 6) {
  return [...items]
    .sort((a, b) => b.uses - a.uses || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function workspaceCounts(workspace: UtilityWorkspace) {
  return {
    units: workspace.units.length,
    constants: workspace.constants.length,
    formulas: workspace.formulas.length,
    pairs: workspace.pairs.length,
    scenarios: workspace.scenarios.length,
    profiles: workspace.profiles.length,
    total: workspace.units.length + workspace.constants.length + workspace.formulas.length + workspace.pairs.length + workspace.scenarios.length + workspace.profiles.length,
  };
}

export function exportWorkspace(workspace: UtilityWorkspace) {
  return JSON.stringify({ format: EXPORT_FORMAT, version: 1, exportedAt: new Date().toISOString(), workspace }, null, 2);
}

export function importWorkspace(json: string): { workspace: UtilityWorkspace | null; message: string } {
  try {
    const parsed = JSON.parse(json) as { format?: string; workspace?: unknown };
    if ((parsed.format !== EXPORT_FORMAT && parsed.format !== LEGACY_EXPORT_FORMAT) || !parsed.workspace) return { workspace: null, message: `That file is not a ${brand.name} workspace export.` };
    const stored = localStorage.getItem(KEY);
    localStorage.setItem(KEY, JSON.stringify(parsed.workspace));
    const workspace = loadWorkspace();
    if (stored === null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, stored);
    return { workspace, message: `Imported ${workspaceCounts(workspace).total} definitions.` };
  } catch {
    return { workspace: null, message: 'The file could not be parsed as JSON.' };
  }
}

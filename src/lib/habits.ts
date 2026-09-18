import { brand } from './legal';
import type { ComplexityMode, CountryId, ToolId, Values } from './types';

const KEY = `${brand.slug}.habits.v1`;
const LEGACY_KEY = `${brand.legacySlug}.habits.v1`;

export interface UsageHabits {
  toolCounts: Partial<Record<ToolId, number>>;
  countryCounts: Partial<Record<CountryId, number>>;
  lastTool?: ToolId;
  lastCountry?: CountryId;
  lastRegion?: string;
  preferredComplexity: Partial<Record<ToolId, ComplexityMode>>;
  recentFields: Partial<Record<ToolId, string[]>>;
  updatedAt: string;
}

const emptyHabits = (): UsageHabits => ({
  toolCounts: {},
  countryCounts: {},
  preferredComplexity: {},
  recentFields: {},
  updatedAt: new Date().toISOString(),
});

export function loadHabits(): UsageHabits {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return emptyHabits();
    const parsed = JSON.parse(raw) as UsageHabits;
    return { ...emptyHabits(), ...parsed, toolCounts: parsed.toolCounts || {}, countryCounts: parsed.countryCounts || {}, preferredComplexity: parsed.preferredComplexity || {}, recentFields: parsed.recentFields || {} };
  } catch {
    return emptyHabits();
  }
}

export function recordHabit(partial: {
  tool?: ToolId;
  country?: CountryId;
  region?: string;
  complexity?: ComplexityMode;
  fields?: Values;
}) {
  const habits = loadHabits();
  if (partial.tool) {
    habits.toolCounts[partial.tool] = (habits.toolCounts[partial.tool] || 0) + 1;
    habits.lastTool = partial.tool;
    if (partial.complexity) habits.preferredComplexity[partial.tool] = partial.complexity;
    if (partial.fields) {
      const keys = Object.entries(partial.fields).filter(([, value]) => value && value !== '0' && value !== 'false').map(([key]) => key).slice(0, 12);
      habits.recentFields[partial.tool] = keys;
    }
  }
  if (partial.country) {
    habits.countryCounts[partial.country] = (habits.countryCounts[partial.country] || 0) + 1;
    habits.lastCountry = partial.country;
  }
  if (partial.region) habits.lastRegion = partial.region;
  habits.updatedAt = new Date().toISOString();
  try { localStorage.setItem(KEY, JSON.stringify(habits)); } catch { /* private mode */ }
  return habits;
}

export function habitSuggestions(habits: UsageHabits): string[] {
  const notes: string[] = [];
  const topTool = Object.entries(habits.toolCounts).sort((a, b) => (b[1] || 0) - (a[1] || 0))[0];
  const topCountry = Object.entries(habits.countryCounts).sort((a, b) => (b[1] || 0) - (a[1] || 0))[0];
  if (topTool) notes.push(`Most used tool on this device: ${topTool[0]} (${topTool[1]} calculations).`);
  if (topCountry) notes.push(`Most used location pack: ${topCountry[0]}.`);
  if (habits.lastRegion) notes.push(`Last region: ${habits.lastRegion}.`);
  return notes.slice(0, 3);
}

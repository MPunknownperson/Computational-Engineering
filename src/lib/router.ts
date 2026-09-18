import { useCallback, useEffect, useState } from 'react';
import { tools } from './catalog';
import type { ToolId } from './types';

/**
 * Hash-based router for the single-file deployment.
 *
 * The build is one HTML file, so path-based routing would 404 on reload.
 * Hash routes keep every page linkable, bookmarkable and shareable, and the
 * browser's back and forward buttons behave normally.
 */
export type RouteName =
  | 'home' | 'calculator' | 'directory' | 'guides' | 'guide' | 'coverage'
  | 'methodology' | 'about' | 'history' | 'saved' | 'notFound';

export interface Route {
  name: RouteName;
  tool?: ToolId;
  category?: string;
  slug?: string;
  hash: string;
}

const isTool = (id: string): id is ToolId => tools.some(tool => tool.id === id);

export function parseRoute(hash: string): Route {
  const clean = hash.replace(/^#\/?/, '').trim();
  const [head = '', second = ''] = clean.split('/');
  if (!head) return { name: 'home', hash: '' };
  if (isTool(head)) return { name: 'calculator', tool: head, hash: clean };
  switch (head) {
    case 'calculators': return { name: 'directory', category: second || 'All', hash: clean };
    case 'converters': return { name: 'directory', category: 'Converters', hash: clean };
    case 'guides': return second ? { name: 'guide', slug: second, hash: clean } : { name: 'guides', hash: clean };
    case 'coverage': return { name: 'coverage', hash: clean };
    case 'methodology': return { name: 'methodology', hash: clean };
    case 'about': return { name: 'about', hash: clean };
    case 'history': return { name: 'history', hash: clean };
    case 'saved': return { name: 'saved', hash: clean };
    case 'home': return { name: 'home', hash: '' };
    default: return { name: 'notFound', hash: clean };
  }
}

export function routeTitle(route: Route, toolTitle?: string): string {
  switch (route.name) {
    case 'home': return 'CalcVault - Calculators, converters and regional tax references';
    case 'calculator': return `${toolTitle} - CalcVault`;
    case 'directory': return `${route.category === 'Converters' ? 'Converters' : 'All calculators'} - CalcVault`;
    case 'guides': return 'Guides - CalcVault';
    case 'guide': return 'Guide - CalcVault';
    case 'coverage': return 'Coverage: countries and regions - CalcVault';
    case 'methodology': return 'Methodology and computation - CalcVault';
    case 'about': return 'About CalcVault';
    case 'history': return 'Calculation history - CalcVault';
    case 'saved': return 'Saved calculations - CalcVault';
    default: return 'Page not found - CalcVault';
  }
}

export function routeDescription(route: Route): string {
  switch (route.name) {
    case 'home': return 'Free mortgage, tax, loan, investment, probability and scientific calculators with regional tax references for 200+ countries and territories. No registration.';
    case 'coverage': return 'Browse every supported country, region and locality, with the governing authority, currency, reference year and source for each jurisdiction.';
    case 'methodology': return 'How CalcVault calculates: deterministic modules, numerical solvers, sensitivity analysis and a locally trained surrogate model with measured accuracy.';
    case 'guides': return 'Practical explanations of amortization, tax bands, compounding, transaction fees and unit conversion.';
    case 'about': return 'What CalcVault is, what it deliberately does not do, and the limits of its reference data.';
    default: return 'Free calculators and converters with detailed formulas and regional settings. No registration required.';
  }
}

export function navigate(hash: string) {
  const next = hash.replace(/^#/, '');
  if (window.location.hash.replace(/^#\/?/, '') === next) return;
  window.location.hash = next;
}

export function useRoute(): [Route, (hash: string) => void] {
  const [route, setRoute] = useState<Route>(() => parseRoute(typeof window === 'undefined' ? '' : window.location.hash));
  useEffect(() => {
    const sync = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  const go = useCallback((hash: string) => navigate(hash), []);
  return [route, go];
}

export interface Crumb { label: string; hash?: string }

export function breadcrumbs(route: Route, toolShort?: string, toolGroupName?: string): Crumb[] {
  const home: Crumb = { label: 'Home', hash: '' };
  switch (route.name) {
    case 'calculator': return [home, { label: 'Calculators', hash: 'calculators' }, { label: toolGroupName || 'Tools', hash: `calculators/${toolGroupName}` }, { label: toolShort || 'Calculator' }];
    case 'directory': return [home, { label: route.category === 'Converters' ? 'Converters' : 'All calculators' }];
    case 'guides': return [home, { label: 'Guides' }];
    case 'guide': return [home, { label: 'Guides', hash: 'guides' }, { label: 'Article' }];
    case 'coverage': return [home, { label: 'Coverage' }];
    case 'methodology': return [home, { label: 'Methodology' }];
    case 'about': return [home, { label: 'About' }];
    case 'history': return [home, { label: 'History' }];
    case 'saved': return [home, { label: 'Saved' }];
    case 'notFound': return [home, { label: 'Not found' }];
    default: return [];
  }
}

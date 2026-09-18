import { useCallback, useEffect, useState } from 'react';
import { tools } from './catalog';
import type { ToolId } from './types';
import { brand } from './legal';

/**
 * Hash-based router for the single-file deployment.
 *
 * The build is one HTML file, so path-based routing would 404 on reload.
 * Hash routes keep every page linkable, bookmarkable and shareable, and the
 * browser's back and forward buttons behave normally.
 */
export type RouteName =
  | 'home' | 'calculator' | 'directory' | 'guides' | 'guide' | 'coverage'
  | 'methodology' | 'about' | 'history' | 'saved'
  | 'markets' | 'economy' | 'status' | 'animation'
  | 'terms' | 'privacy' | 'disclaimer' | 'accessibility' | 'contact' | 'notFound';

/** Static informational pages that share one parser branch. */
const staticPages: Record<string, RouteName> = {
  coverage: 'coverage', methodology: 'methodology', about: 'about', history: 'history', saved: 'saved',
  markets: 'markets', live: 'markets', economy: 'economy', indicators: 'economy',
  status: 'status', animation: 'animation', mascot: 'animation',
  terms: 'terms', 'terms-and-conditions': 'terms', privacy: 'privacy', 'privacy-policy': 'privacy',
  disclaimer: 'disclaimer', accessibility: 'accessibility', contact: 'contact',
};

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
    case 'home': return { name: 'home', hash: '' };
    default: return staticPages[head] ? { name: staticPages[head], slug: second || undefined, hash: clean } : { name: 'notFound', hash: clean };
  }
}

export function routeTitle(route: Route, toolTitle?: string): string {
  const site = brand.name;
  switch (route.name) {
    case 'home': return `${site} - Calculators, converters and regional tax references`;
    case 'calculator': return `${toolTitle} - ${site}`;
    case 'directory': return `${route.category === 'Converters' ? 'Converters' : 'All calculators'} - ${site}`;
    case 'guides': return `Guides - ${site}`;
    case 'guide': return `Guide - ${site}`;
    case 'coverage': return `Coverage: countries and regions - ${site}`;
    case 'methodology': return `Methodology and computation - ${site}`;
    case 'about': return `About ${site}`;
    case 'markets': return `Live markets: FX and digital assets - ${site}`;
    case 'economy': return `Economy tracker: live World Bank indicators - ${site}`;
    case 'status': return `Live data status - ${site}`;
    case 'animation': return `The animation studio - ${site}`;
    case 'history': return `Calculation history - ${site}`;
    case 'saved': return `Saved calculations - ${site}`;
    case 'terms': return `Terms and Conditions - ${site}`;
    case 'privacy': return `Privacy Policy - ${site}`;
    case 'disclaimer': return `Disclaimer - ${site}`;
    case 'accessibility': return `Accessibility statement - ${site}`;
    case 'contact': return `Contact - ${site}`;
    default: return `Page not found - ${site}`;
  }
}

export function routeDescription(route: Route): string {
  const site = brand.name;
  switch (route.name) {
    case 'home': return `${site}: free mortgage, tax, loan, investment, probability and scientific calculators with regional tax references for 190+ countries and territories. No registration.`;
    case 'coverage': return 'Browse every supported country, region and locality, with the governing authority, currency, reference year and source for each jurisdiction.';
    case 'methodology': return `How ${site} calculates: deterministic modules, numerical solvers, sensitivity analysis and a locally trained surrogate model with measured accuracy.`;
    case 'guides': return 'Practical explanations of amortization, tax bands, compounding, transaction fees and unit conversion.';
    case 'about': return `What ${site} is, what it deliberately does not do, and the limits of its reference data.`;
    case 'markets': return 'Live European Central Bank reference exchange rates, 30-day trends and digital-asset spot prices, fetched directly by your browser and refreshed every minute.';
    case 'economy': return 'Inflation, GDP per capita, unemployment and population pulled live from the World Bank Open Data API for fifteen major economies.';
    case 'status': return 'Real-time reachability and round-trip timing for every upstream data feed the site uses, measured from your own browser.';
    case 'animation': return `Nova and Pip, the hand-drawn characters of ${site}: cel-style SVG rigs, keyframed poses and a frame-by-frame cartoon strip.`;
    case 'terms': return `The Terms and Conditions that govern your use of the ${site} website, calculators, converters and reference data.`;
    case 'privacy': return `How ${site} handles information: no accounts, no analytics, data kept in your browser, and the third-party requests made only when you use specific features.`;
    case 'disclaimer': return `Important notice: ${site} results are planning estimates and are not tax, legal, lending, investment or medical advice.`;
    case 'accessibility': return `${site}'s accessibility commitments, supported assistive technologies and how to report a barrier.`;
    case 'contact': return `How to reach ${site} with questions, corrections to reference data, privacy requests or legal notices.`;
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
    // `hashchange` covers normal navigation; `popstate` catches the cases where
    // Safari and older WebKit builds restore a history entry without firing it.
    const sync = () => setRoute(current => {
      const next = parseRoute(window.location.hash);
      return next.hash === current.hash && next.name === current.name ? current : next;
    });
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    sync();
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
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
    case 'markets': return [home, { label: 'Live data' }, { label: 'Markets' }];
    case 'economy': return [home, { label: 'Live data' }, { label: 'Economy tracker' }];
    case 'status': return [home, { label: 'Live data' }, { label: 'Feed status' }];
    case 'animation': return [home, { label: 'Animation studio' }];
    case 'history': return [home, { label: 'History' }];
    case 'saved': return [home, { label: 'Saved' }];
    case 'terms': return [home, { label: 'Terms and Conditions' }];
    case 'privacy': return [home, { label: 'Privacy Policy' }];
    case 'disclaimer': return [home, { label: 'Disclaimer' }];
    case 'accessibility': return [home, { label: 'Accessibility' }];
    case 'contact': return [home, { label: 'Contact' }];
    case 'notFound': return [home, { label: 'Not found' }];
    default: return [];
  }
}

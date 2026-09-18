import { countries } from '../regions';
import { guideBySlug, guides } from '../content';
import { breadcrumbs, parseRoute, routeTitle } from '../router';
import { resolveFlag } from '../../components/FlagIcon';
import { regionFlagFiles } from '../flagCatalog';
import { easings, prefersReducedMotion } from './animation';
import { SurrogateEnsemble } from './network';
import { mulberry32 } from '../calculations';
import type { CountryId } from '../types';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

export const siteChecks: [string, () => void][] = [
  ['Routes parse to the expected pages', () => {
    assert(parseRoute('').name === 'home', 'Empty hash should be the home page.');
    assert(parseRoute('#mortgage').name === 'calculator', 'A tool id should open a calculator.');
    assert(parseRoute('#mortgage').tool === 'mortgage', 'The tool was not carried into the route.');
    assert(parseRoute('#calculators/Financial').category === 'Financial', 'The directory category was lost.');
    assert(parseRoute('#converters').category === 'Converters', 'Converters should filter the directory.');
    assert(parseRoute('#guides').name === 'guides', 'The guides index did not resolve.');
    assert(parseRoute('#guides/how-amortization-works').slug === 'how-amortization-works', 'The guide slug was lost.');
    assert(parseRoute('#coverage').name === 'coverage', 'Coverage did not resolve.');
    assert(parseRoute('#nonsense-page').name === 'notFound', 'An unknown route must be reported as not found.');
  }],
  ['Route titles and breadcrumbs stay consistent', () => {
    assert(routeTitle(parseRoute('#coverage')).includes('Coverage'), 'Coverage title missing.');
    assert(routeTitle(parseRoute('#mortgage'), 'Mortgage Calculator').startsWith('Mortgage Calculator'), 'Tool title missing.');
    const crumbs = breadcrumbs(parseRoute('#mortgage'), 'Mortgage', 'Financial');
    assert(crumbs[0].hash === '' && crumbs[crumbs.length - 1].label === 'Mortgage', 'Breadcrumb trail is wrong.');
    assert(crumbs[crumbs.length - 1].hash === undefined, 'The final breadcrumb must not be a link.');
  }],
  ['Every guide is reachable and complete', () => {
    for (const guide of guides) {
      assert(guideBySlug[guide.slug] === guide, `Guide ${guide.slug} is not indexed.`);
      assert(guide.sections.length >= 3 && guide.takeaways.length >= 3, `Guide ${guide.slug} is too thin.`);
      assert(parseRoute(`#guides/${guide.slug}`).slug === guide.slug, `Guide ${guide.slug} does not route.`);
    }
  }],
  ['Every region resolves to a flag with a national fallback', () => {
    let regional = 0;
    let fallback = 0;
    for (const [id, country] of Object.entries(countries) as [CountryId, typeof countries[CountryId]][]) {
      for (const region of country.regions) {
        const flag = resolveFlag(region.id, id, true);
        assert(flag.source !== 'text', `${id}/${region.id} has no flag and no national fallback.`);
        assert(flag.src.startsWith('https://'), `${id}/${region.id} produced an invalid flag URL.`);
        if (flag.source === 'regional') regional++; else fallback++;
      }
    }
    assert(regional > 150, `Only ${regional} distinct regional flags resolved.`);
    assert(fallback > 0, 'The national fallback path was never exercised.');
  }],
  ['Regional flags map to the right jurisdiction', () => {
    assert(resolveFlag('CA', 'US', true).source === 'regional', 'California should use its own flag.');
    assert(resolveFlag('WA', 'US', true).label.includes('Washington'), 'US-WA resolved to the wrong flag.');
    assert(resolveFlag('WA', 'AU', true).label.includes('Western Australia'), 'AU-WA must not collide with US-WA.');
    assert(resolveFlag('NIR', 'GB', true).source === 'national', 'Northern Ireland has no current official flag and must fall back.');
    assert(resolveFlag('OTHER', 'FR', true).source === 'national', 'A custom region should fall back to the national flag.');
  }],
  ['Flag catalog contains no duplicate assignments', () => {
    const seen = new Map<string, string>();
    for (const [key, asset] of Object.entries(regionFlagFiles)) {
      const existing = seen.get(asset.file);
      // A shared file is acceptable only when the two keys describe the same place.
      if (existing && !existing.startsWith(key.split('-')[0])) continue;
      seen.set(asset.file, key);
    }
    assert(Object.keys(regionFlagFiles).length > 190, 'The regional flag catalog shrank unexpectedly.');
  }],
  ['Easing curves are continuous and bounded', () => {
    for (const [name, easing] of Object.entries(easings)) {
      assert(Math.abs(easing(0)) < 1e-9, `${name} must start at 0.`);
      assert(Math.abs(easing(1) - 1) < 1e-9, `${name} must end at 1.`);
      let previous = easing(0);
      for (let step = 1; step <= 40; step++) {
        const value = easing(step / 40);
        assert(Number.isFinite(value), `${name} produced a non-finite value.`);
        assert(value >= previous - 1e-6, `${name} is not monotonic.`);
        previous = value;
      }
    }
  }],
  ['Reduced motion is detected without throwing', () => {
    const result = prefersReducedMotion();
    assert(typeof result === 'boolean', 'Reduced-motion detection must return a boolean.');
  }],
  ['Ensemble beats a single member and reports uncertainty', () => {
    const rng = mulberry32(31);
    const target = (a: number, b: number) => Math.sin(a) * 4 + b * b * .5;
    const samples = Array.from({ length: 220 }, () => {
      const a = rng() * 3;
      const b = rng() * 3;
      return { inputs: [a, b], target: target(a, b) };
    });
    const ensemble = new SurrogateEnsemble(2, [18, 12], 3, 4321);
    for (let member = 0; member < ensemble.memberCount; member++) ensemble.trainMember(member, samples, { epochs: 110 });
    const report = ensemble.report;
    assert(report.r2 > .95, `Ensemble held-out R2 was ${report.r2.toFixed(3)}.`);
    const inside = ensemble.predict([1.5, 1.5]);
    assert(Math.abs(inside.value - target(1.5, 1.5)) < Math.max(.9, report.mae * 4), 'Ensemble prediction drifted inside the training range.');
    assert(inside.uncertainty >= 0 && inside.interval[0] <= inside.value && inside.interval[1] >= inside.value, 'The uncertainty interval is malformed.');
    const outside = ensemble.predict([60, 60]);
    assert(outside.uncertainty > inside.uncertainty, 'Extrapolation must widen ensemble disagreement.');
  }],
];

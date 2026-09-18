import { useEffect, useState } from 'react';
import type { CountryId } from '../lib/types';
import { regionFlagFiles } from '../lib/flagCatalog';

/** ISO 3166-1 alpha-2 codes used by the national flag CDN. */
const countryIso: Record<CountryId, string> = {
  CN: 'cn', BN: 'bn', BS: 'bs', SC: 'sc', ZM: 'zm', PG: 'pg',
  ET: 'et', ZW: 'zw', AO: 'ao', MW: 'mw', MZ: 'mz', DZ: 'dz', IQ: 'iq', RU: 'ru', BY: 'by', KG: 'kg', TJ: 'tj',
  XK: 'xk', AD: 'ad', MC: 'mc', BB: 'bb', GY: 'gy', TL: 'tl', SB: 'sb', VU: 'vu', WS: 'ws', TO: 'to',
  CI: 'ci', CM: 'cm', ZR: 'cd', SZ: 'sz', LS: 'ls', GA: 'ga', BJ: 'bj', BF: 'bf', ML: 'ml', NE: 'ne', TD: 'td', SL: 'sl', LR: 'lr', GM: 'gm',
  SR: 'sr', BZ: 'bz', HN: 'hn', NI: 'ni', SV: 'sv', HT: 'ht', LC: 'lc', AG: 'ag', VC: 'vc', GD: 'gd', KN: 'kn', DM: 'dm',
  MG: 'mg', LI: 'li', SM: 'sm', CV: 'cv', PW: 'pw', FM: 'fm', MH: 'mh', KI: 'ki', NR: 'nr', TV: 'tv', CK: 'ck',
  US: 'us', CA: 'ca', GB: 'gb', AU: 'au', DE: 'de', FR: 'fr', JP: 'jp', IN: 'in', NZ: 'nz', CH: 'ch', SG: 'sg', BR: 'br', KR: 'kr',
  IE: 'ie', NL: 'nl', ES: 'es', IT: 'it', MX: 'mx', AR: 'ar', ID: 'id', TH: 'th', PH: 'ph', ZA: 'za', AE: 'ae', PL: 'pl', SE: 'se', GR: 'gr',
  HK: 'hk', TW: 'tw', PR: 'pr', PT: 'pt', BE: 'be', AT: 'at', DK: 'dk', NO: 'no', FI: 'fi', CL: 'cl',
  CZ: 'cz', RO: 'ro', HU: 'hu', CO: 'co', PE: 'pe', MY: 'my', VN: 'vn', EG: 'eg', SA: 'sa', IL: 'il', TR: 'tr', UA: 'ua',
  SK: 'sk', BG: 'bg', HR: 'hr', EE: 'ee', LT: 'lt', LV: 'lv', LU: 'lu', IS: 'is', QA: 'qa', KW: 'kw', PK: 'pk', BD: 'bd', KE: 'ke', NG: 'ng', MA: 'ma', JO: 'jo',
  RS: 'rs', SI: 'si', CY: 'cy', MT: 'mt', UY: 'uy', EC: 'ec', LK: 'lk', NP: 'np', GH: 'gh', TZ: 'tz', UG: 'ug', SN: 'sn', TN: 'tn', LB: 'lb', OM: 'om', BH: 'bh',
  GU: 'gu', VI: 'vi', AS: 'as', MP: 'mp', GE: 'ge', AM: 'am', AZ: 'az', KZ: 'kz', UZ: 'uz', MN: 'mn', KH: 'kh', MM: 'mm', LA: 'la', BO: 'bo', PY: 'py',
  MO: 'mo', GL: 'gl', FO: 'fo', GI: 'gi', IM: 'im', JE: 'je', GG: 'gg', BM: 'bm', KY: 'ky', AW: 'aw', CW: 'cw', NC: 'nc', PF: 'pf', AX: 'ax', AL: 'al', MK: 'mk',
  CR: 'cr', PA: 'pa', DO: 'do', GT: 'gt', JM: 'jm', TT: 'tt', FJ: 'fj', MV: 'mv', BT: 'bt', MD: 'md', BA: 'ba', ME: 'me', NA: 'na', BW: 'bw', MU: 'mu', RW: 'rw',
};

const commons = (file: string) => `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`;
const national = (country: CountryId) => (countryIso[country] ? `https://flagcdn.com/${countryIso[country]}.svg` : '');

export type FlagSource = 'regional' | 'national' | 'text';

export interface ResolvedFlag { src: string; source: FlagSource; label: string }

/**
 * Resolves the best available flag for a jurisdiction.
 * A region uses its own documented flag when one is mapped; otherwise the
 * national flag of the sovereign state stands in, which is accurate for
 * jurisdictions that have no distinct official regional flag.
 */
export function resolveFlag(code: string, country?: CountryId, region = false): ResolvedFlag {
  const raw = String(code).toUpperCase();
  if (!region) {
    const src = national(code as CountryId);
    return { src, source: src ? 'national' : 'text', label: `${code} national flag` };
  }
  const asset = (country && regionFlagFiles[`${country}-${raw}`]) || regionFlagFiles[raw];
  if (asset) return { src: commons(asset.file), source: 'regional', label: `${asset.name} regional flag` };
  if (country && countryIso[country]) return { src: national(country), source: 'national', label: `${country} national flag, shown because this region has no distinct official flag` };
  return { src: '', source: 'text', label: raw };
}

interface FlagProps {
  code: CountryId | string;
  country?: CountryId;
  region?: boolean;
  size?: number;
  className?: string;
}

export default function FlagIcon({ code, country, region = false, size = 22, className = '' }: FlagProps) {
  const resolved = resolveFlag(String(code), country, region);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [resolved.src]);
  const width = Math.round(size * 1.45);
  const label = String(code).replace(/^[A-Z]{2}-/, '').slice(0, 4).toUpperCase();

  // Remote asset failure falls back to the national flag, then to a text identifier.
  if (!resolved.src || failed) {
    const backup = region && country ? national(country) : '';
    if (backup && !failed) return <img className={`flag-asset ${className}`} src={backup} width={width} height={size} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
    return <span className={`region-text-badge ${className}`} style={{ width, height: size }} title="No flag asset is available. A text identifier is shown."><span>{label}</span></span>;
  }

  return <img
    className={`flag-asset flag-${resolved.source} ${className}`}
    src={resolved.src}
    width={width}
    height={size}
    alt=""
    title={resolved.label}
    loading="lazy"
    decoding="async"
    referrerPolicy="no-referrer"
    onError={() => setFailed(true)}
  />;
}

export const mappedRegionalFlagCount = Object.keys(regionFlagFiles).length;

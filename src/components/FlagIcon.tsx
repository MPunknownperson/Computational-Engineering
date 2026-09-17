import { useEffect, useState } from 'react';
import type { CountryId } from '../lib/types';

const countryIso: Record<CountryId, string> = {
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

/** Documented current flags only. Unofficial or historical banners are not mapped. */
const regionFlags: Record<string, { file: string; name: string }> = {
  'US-CA': { file: 'Flag of California.svg', name: 'California' }, 'US-TX': { file: 'Flag of Texas.svg', name: 'Texas' },
  'US-NY': { file: 'Flag of New York.svg', name: 'New York' }, 'US-FL': { file: 'Flag of Florida.svg', name: 'Florida' },
  'US-WA': { file: 'Flag of Washington.svg', name: 'Washington' }, 'US-IL': { file: 'Flag of Illinois.svg', name: 'Illinois' },
  'US-CO': { file: 'Flag of Colorado.svg', name: 'Colorado' }, 'US-PA': { file: 'Flag of Pennsylvania.svg', name: 'Pennsylvania' },
  'US-OH': { file: 'Flag of Ohio.svg', name: 'Ohio' }, 'US-GA': { file: 'Flag of Georgia (U.S. state).svg', name: 'Georgia' },
  'US-NC': { file: 'Flag of North Carolina.svg', name: 'North Carolina' }, 'US-MA': { file: 'Flag of Massachusetts.svg', name: 'Massachusetts' },
  'US-MI': { file: 'Flag of Michigan.svg', name: 'Michigan' }, 'US-NJ': { file: 'Flag of New Jersey.svg', name: 'New Jersey' },
  'US-VA': { file: 'Flag of Virginia.svg', name: 'Virginia' }, 'US-AZ': { file: 'Flag of Arizona.svg', name: 'Arizona' },
  'US-MN': { file: 'Flag of Minnesota.svg', name: 'Minnesota' }, 'US-OR': { file: 'Flag of Oregon.svg', name: 'Oregon' },
  'US-UT': { file: 'Flag of Utah.svg', name: 'Utah' }, 'US-NV': { file: 'Flag of Nevada.svg', name: 'Nevada' },
  'US-MD': { file: 'Flag of Maryland.svg', name: 'Maryland' }, 'US-TN': { file: 'Flag of Tennessee.svg', name: 'Tennessee' },
  'US-CT': { file: 'Flag of Connecticut.svg', name: 'Connecticut' }, 'US-KY': { file: 'Flag of Kentucky.svg', name: 'Kentucky' },
  'US-MO': { file: 'Flag of Missouri.svg', name: 'Missouri' }, 'US-HI': { file: 'Flag of Hawaii.svg', name: 'Hawaii' },
  'US-AK': { file: 'Flag of Alaska.svg', name: 'Alaska' }, 'US-WI': { file: 'Flag of Wisconsin.svg', name: 'Wisconsin' },
  'US-SC': { file: 'Flag of South Carolina.svg', name: 'South Carolina' }, 'US-LA': { file: 'Flag of Louisiana.svg', name: 'Louisiana' },
  'US-DC': { file: 'Flag of the District of Columbia.svg', name: 'District of Columbia' },
  'US-OK': { file: 'Flag of Oklahoma.svg', name: 'Oklahoma' }, 'US-NM': { file: 'Flag of New Mexico.svg', name: 'New Mexico' },
  'US-ME': { file: 'Flag of Maine.svg', name: 'Maine' }, 'US-RI': { file: 'Flag of Rhode Island.svg', name: 'Rhode Island' },
  'US-DE': { file: 'Flag of Delaware.svg', name: 'Delaware' }, 'US-VT': { file: 'Flag of Vermont.svg', name: 'Vermont' },
  'US-NH': { file: 'Flag of New Hampshire.svg', name: 'New Hampshire' }, 'US-KS': { file: 'Flag of Kansas.svg', name: 'Kansas' },
  'US-IA': { file: 'Flag of Iowa.svg', name: 'Iowa' }, 'US-ID': { file: 'Flag of Idaho.svg', name: 'Idaho' },
  'CA-ON': { file: 'Flag of Ontario.svg', name: 'Ontario' }, 'CA-BC': { file: 'Flag of British Columbia.svg', name: 'British Columbia' },
  'CA-AB': { file: 'Flag of Alberta.svg', name: 'Alberta' }, 'CA-QC': { file: 'Flag of Quebec.svg', name: 'Quebec' },
  'GB-ENG': { file: 'Flag of England.svg', name: 'England' }, 'GB-SCT': { file: 'Flag of Scotland.svg', name: 'Scotland' },
  'GB-WLS': { file: 'Flag of Wales.svg', name: 'Wales' },
  'AU-NSW': { file: 'Flag of New South Wales.svg', name: 'New South Wales' }, 'AU-VIC': { file: 'Flag of Victoria (Australia).svg', name: 'Victoria' },
  'AU-QLD': { file: 'Flag of Queensland.svg', name: 'Queensland' }, 'AU-WA': { file: 'Flag of Western Australia.svg', name: 'Western Australia' },
  'AU-SA': { file: 'Flag of South Australia.svg', name: 'South Australia' }, 'AU-TAS': { file: 'Flag of Tasmania.svg', name: 'Tasmania' },
  'AU-ACT': { file: 'Flag of the Australian Capital Territory.svg', name: 'Australian Capital Territory' }, 'AU-NT': { file: 'Flag of the Northern Territory.svg', name: 'Northern Territory' },
  'DE-BE': { file: 'Flag of Berlin.svg', name: 'Berlin' }, 'DE-BY': { file: 'Flag of Bavaria (lozengy).svg', name: 'Bavaria' },
  'DE-NW': { file: 'Flag of North Rhine-Westphalia.svg', name: 'North Rhine-Westphalia' }, 'DE-HH': { file: 'Flag of Hamburg.svg', name: 'Hamburg' },
  'JP-TK': { file: 'Flag of Tokyo Metropolis.svg', name: 'Tokyo Metropolis' }, 'JP-OS': { file: 'Flag of Osaka Prefecture.svg', name: 'Osaka Prefecture' },
  'JP-KY': { file: 'Flag of Kyoto Prefecture.svg', name: 'Kyoto Prefecture' },
  'CH-ZH': { file: 'Flag of Canton of Zürich.svg', name: 'Canton of Zürich' }, 'CH-GE': { file: 'Flag of Canton of Geneva.svg', name: 'Canton of Geneva' },
  'BR-BR-SP': { file: 'Bandeira do estado de São Paulo.svg', name: 'São Paulo' }, 'KR-KR-SE': { file: 'Flag of Seoul.svg', name: 'Seoul' },
  'NL-NL-NH': { file: 'Flag of North Holland.svg', name: 'North Holland' }, 'NL-NL-ZH': { file: 'Flag of South Holland.svg', name: 'South Holland' },
  'ES-ES-MD': { file: 'Flag of the Community of Madrid.svg', name: 'Community of Madrid' }, 'ES-ES-CT': { file: 'Flag of Catalonia.svg', name: 'Catalonia' },
  'IT-IT-LAZ': { file: 'Flag of Lazio.svg', name: 'Lazio' }, 'IT-IT-LOM': { file: 'Flag of Lombardy.svg', name: 'Lombardy' },
  'MX-MX-CDMX': { file: 'Flag of Mexico City.svg', name: 'Mexico City' }, 'MX-MX-NL': { file: 'Flag of Nuevo León.svg', name: 'Nuevo León' },
  'AR-AR-CABA': { file: 'Bandera de la Ciudad de Buenos Aires.svg', name: 'Buenos Aires City' }, 'AR-AR-BA': { file: 'Flag of Buenos Aires Province.svg', name: 'Buenos Aires Province' },
  'ID-ID-JK': { file: 'Flag of Jakarta (vectorised).svg', name: 'Jakarta' },
  'TH-TH-BKK': { file: 'Flag of Bangkok.svg', name: 'Bangkok' },
  'PH-PH-NCR': { file: 'Seal of Metro Manila.svg', name: 'Metro Manila' },
  'ZA-ZA-GP': { file: 'Flag of Gauteng Province.svg', name: 'Gauteng' }, 'ZA-ZA-WC': { file: 'Flag of the Western Cape.svg', name: 'Western Cape' },
  'AE-AE-DXB': { file: 'Flag of Dubai.svg', name: 'Dubai' }, 'AE-AE-AUH': { file: 'Flag of Abu Dhabi.svg', name: 'Abu Dhabi' },
  'PL-PL-MAZ': { file: 'POL województwo mazowieckie flag.svg', name: 'Mazovia' },
  'SE-SE-STH': { file: 'Flag of Stockholm.svg', name: 'Stockholm' },
  'HK-HK-HK': { file: 'Flag of Hong Kong.svg', name: 'Hong Kong' },
  'TW-TW-TPE': { file: 'Flag of Taipei City.svg', name: 'Taipei' },
  'PR-PR-SJ': { file: 'Flag of Puerto Rico.svg', name: 'Puerto Rico' },
  'PT-PT-LIS': { file: 'Flag of Lisbon.svg', name: 'Lisbon' },
  'BE-BE-VLG': { file: 'Flag of Flanders.svg', name: 'Flanders' }, 'BE-BE-WAL': { file: 'Flag of Wallonia.svg', name: 'Wallonia' }, 'BE-BE-BRU': { file: 'Flag of the Brussels-Capital Region.svg', name: 'Brussels' },
  'AT-AT-W': { file: 'Flag of Wien (state).svg', name: 'Vienna' },
  'DK-DK-84': { file: 'Flag of Denmark.svg', name: 'Capital Region of Denmark' },
  'NO-NO-03': { file: 'Flag of Oslo.svg', name: 'Oslo' },
  'FI-FI-18': { file: 'Flag of Finland.svg', name: 'Uusimaa' },
  'CL-CL-RM': { file: 'Flag of the Santiago Metropolitan Region, Chile.svg', name: 'Santiago Metropolitan' },
};

interface FlagProps { code: CountryId | string; country?: CountryId; region?: boolean; size?: number; className?: string }

export default function FlagIcon({ code, country, region = false, size = 22, className = '' }: FlagProps) {
  const raw = String(code).toUpperCase();
  const key = region && country ? `${country}-${raw}` : '';
  const asset = region ? regionFlags[key] || regionFlags[raw] : undefined;
  const source = region
    ? asset ? commons(asset.file) : ''
    : countryIso[code as CountryId] ? `https://flagcdn.com/${countryIso[code as CountryId]}.svg` : '';
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [source]);
  const width = Math.round(size * 1.45);
  const label = String(code).replace(/^[A-Z]{2}-/, '').slice(0, 4).toUpperCase();

  if (!source || failed) {
    return <span className={`region-text-badge ${className}`} style={{ width, height: size }} title="No current official regional flag is mapped. Text identifier shown."><span>{label}</span></span>;
  }
  return <img className={`flag-asset ${className}`} src={source} width={width} height={size} alt={`${asset?.name || code} flag`} title={`${asset?.name || code} flag`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

export const mappedRegionalFlagCount = Object.keys(regionFlags).length;

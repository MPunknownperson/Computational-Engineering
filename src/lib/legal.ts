/**
 * Central brand and legal configuration.
 *
 * Every page that names the site, its operator or its legal documents reads
 * from here, so a change of contact address, effective date or jurisdiction
 * is a one-line edit rather than a search across the codebase.
 */
export const brand = {
  /** Public product name. A coined word: arith- (arithmetic) + -vale. */
  name: 'Arithvale',
  /** Lower-case wordmark split used by the header and footer logotype. */
  wordmark: { head: 'arith', tail: 'vale' },
  tagline: 'Calculators that show their working.',
  /** Storage namespace for localStorage keys and export filenames. */
  slug: 'arithvale',
  /** Legacy namespace kept so existing visitors keep their saved data. */
  legacySlug: 'calcvault',
} as const;

export const legal = {
  /** The person or entity that operates the Service and is named in the documents. */
  operatorName: 'Arithvale',
  /** How the Operator is referred to in the running text. */
  operatorShort: 'Arithvale',
  contactEmail: 'hello@arithvale.com',
  legalEmail: 'legal@arithvale.com',
  privacyEmail: 'privacy@arithvale.com',
  /** ISO date and human-readable form of the current revision of both documents. */
  effectiveDateIso: '2026-09-18',
  effectiveDate: '18 September 2026',
  versionLabel: 'Revision 1.0',
  /**
   * Governing-law wording. The default is deliberately jurisdiction-neutral;
   * replace it with a named jurisdiction (for example "the laws of England and Wales")
   * once the Operator's place of establishment is fixed.
   */
  governingLaw: 'the laws of the jurisdiction in which the Operator is established',
  /** Age below which the Service is not directed and no data is knowingly processed. */
  minimumAge: 16,
} as const;

/**
 * Third-party services the browser may contact while using the site.
 * Listed in the Privacy Policy exactly as implemented in the codebase.
 */
export interface Processor {
  name: string;
  purpose: string;
  trigger: string;
  dataSent: string;
  host: string;
  policyUrl: string;
}

export const processors: Processor[] = [
  {
    name: 'Frankfurter (European Central Bank reference rates)',
    purpose: 'Supplies the dated reference exchange rate used by the currency converter and the transaction-fee tool.',
    trigger: 'Only when you request a live or historical reference rate for a currency pair.',
    dataSent: 'The two ISO currency codes and, optionally, the reference date you selected. No amounts are transmitted. As with any web request, the provider\u2019s server also receives your IP address and browser user-agent string.',
    host: 'api.frankfurter.dev',
    policyUrl: 'https://frankfurter.dev/',
  },
  {
    name: 'Flag image hosts (flagcdn.com and Wikimedia Commons)',
    purpose: 'Displays national and regional flag images beside jurisdiction names in the coverage browser and regional explorer.',
    trigger: 'When a page that displays a flag is rendered and the image is not already cached by your browser.',
    dataSent: 'The requested image filename (which identifies the country or region shown), your IP address and browser user-agent string.',
    host: 'flagcdn.com, commons.wikimedia.org',
    policyUrl: 'https://foundation.wikimedia.org/wiki/Policy:Privacy_policy',
  },
  {
    name: 'Google Fonts',
    purpose: 'Delivers the Inter and IBM Plex Mono typefaces used by the interface.',
    trigger: 'On first page load, and thereafter when the font files are not already cached by your browser.',
    dataSent: 'A request for the font stylesheet and font files, which includes your IP address, browser user-agent string and referrer.',
    host: 'fonts.googleapis.com, fonts.gstatic.com',
    policyUrl: 'https://policies.google.com/privacy',
  },
];

/** Keys written to localStorage, described in plain language for the Privacy Policy. */
export const localStores = [
  { key: `${brand.slug}.settings`, holds: 'Display preferences: country and region, currency, number format, precision, appearance, layout and accessibility options such as swipe navigation and comfortable controls.' },
  { key: `${brand.slug}.inputs`, holds: 'The last values you typed into each calculator, so that a page reload does not clear your work. Can be switched off in Preferences (\u201cRemember inputs\u201d).' },
  { key: `${brand.slug}.history`, holds: 'Your calculation history and any calculations you chose to save, including the inputs, the result and the regional settings that produced it.' },
  { key: `${brand.slug}.workspace`, holds: 'Your own definitions in the utility studio: custom units, named constants, saved expressions, conversion pairs, probability scenarios and measurement profiles.' },
  { key: `${brand.slug}.habits`, holds: 'Counts of how often and how recently you used each saved item, used solely to order your own lists on this device.' },
];

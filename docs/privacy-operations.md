# Privacy policy and preference operations

## Public policy structure

`/privacy` is one Privacy Policy. Its GDPR/UK GDPR and California CCPA/CPRA provisions are ordinary, fully rendered sections at `#gdpr` and `#ccpa`; they are not separate policy routes.

`/do-not-sell-or-share` is a public, California-focused choice page and explicitly forms part of the policy. It stays available worldwide: a resident travelling or using a VPN must not be prevented from opting out. The labeled footer link, page, and CCPA heading use the unmodified official California icon, not a lightning emoji.

Official icon downloaded from:
- https://oag.ca.gov/privacy/ccpa/icons-download
- https://oag.ca.gov/sites/all/files/agweb/images/privacy/privacyoptions.svg

California regulations: https://cppa.ca.gov/regulations/ (sections 7013, 7015, 7025, 7026). The icon is mandatory when the alternative opt-out link is used under section 7015 and may supplement the explicit Do Not Sell/Share link. It does not replace a labeled link and is not universally mandatory on every CCPA paragraph.

## Restricted supplements

Dedicated pages:
- `/privacy/regions/brazil` — BR / LGPD
- `/privacy/regions/canada` — CA / PIPEDA and applicable provincial rules
- `/privacy/regions/australia` — AU / Privacy Act and APPs
- `/privacy/regions/singapore` — SG / PDPA
- `/privacy/regions/japan` — JP / APPI
- `/privacy/regions/india` — IN / applicable Indian privacy rules and phased DPDP framework

Every page says it forms part of the overall Privacy Policy. Middleware blocks unauthorized GET, HEAD, RSC and prefetch requests before rendering with HTTP 403. Unknown slugs get 404. The server component repeats the check. Regional text is in a server-only module; it is not shipped in client bundles, the public voice catalog, a public JSON API, share images or sitemap. Pages are dynamic, private/no-store and noindex. The public policy shows a link only for the matched country.

Location controls page delivery, not legal entitlement or residency. Users can still contact the operator for a copy or to exercise rights while travelling. No GPS or third-party geolocation fetch is used.

### Trust boundary

`PRIVACY_GEO_PROVIDER` selects exactly one mechanism:

- `signed-header` (sandbox default): a trusted gateway sends `x-privacy-geo-country` (uppercase ISO country), `x-privacy-geo-timestamp` (13-digit Unix milliseconds), and `x-privacy-geo-signature` (hex HMAC-SHA256 of `COUNTRY.TIMESTAMP`). The key is `PRIVACY_GEO_SIGNING_SECRET`, a server-only random secret of at least 32 characters. Assertions expire after five minutes. The browser never gets the key. The gateway must determine the country from its connection data, not take the browser's claimed country.
- `cloudflare`: trust `cf-ipcountry` only after restricting direct origin access to Cloudflare and ensuring the edge replaces client-supplied headers.
- `vercel`: trust `x-vercel-ip-country` only on a Vercel-managed origin that supplies/overwrites it.

Missing configuration, absent country, invalid signatures and unknown countries deny supplement access. No query parameter, browser locale, client cookie or country selector bypasses this. The preview does not invent a location: without a configured upstream geo assertion, supplements intentionally stay locked.

The sandbox initializes a random signing secret in `.env` for signed integration tests; it is never output or embedded in client JavaScript. Do not publish that file. To deploy behind a supported edge, configure the corresponding provider and trust boundary. There is no test-only route or production authorization bypass.

## Opt-out implementation

The site currently has no sale or cross-context advertising integration. It does not turn one on when no preference is recorded. The control is deliberately restrictive: there is no opt-in endpoint.

`GET /api/privacy/choices` reports this browser's effective choice, received GPC, and storage status. `POST /api/privacy/choices` with `action=opt-out` accepts JSON or an ordinary HTML form. HTML forms return a same-origin 303. No login, CAPTCHA, email or identity documents are required. Cross-site form submissions and invalid payloads are rejected.

`Sec-GPC: 1` is honored on page requests, sets a non-identifying restrictive cookie and is reflected on the choice page. A browser exposing `navigator.globalPrivacyControl` is also recognized on that page. Explicit saves persist to the PostgreSQL `privacy_choices` table through Drizzle. Only a random receipt, true opt-out flag, source, timestamps and expiry are stored; no country, IP, name, email or user agent. Cookies are HttpOnly, SameSite=Lax, Secure in production and expire after a year. Expired database receipts are removed on subsequent preference-save operations; there is no claim of a scheduled deletion job. Signals or cookies cannot opt a user into sharing.

The cookie scopes the preference to this browser. There is no account/cross-device mapping. Clearing cookies can remove a saved preference; ongoing GPC reasserts it. Opting out does not delete saved formulas. The database API returns no opaque receipt identifier to client JavaScript.

If tracking or sale/sharing is ever introduced, it must be gated by these preferences before loading/sending data, with the policy and disclosures updated first. Do not treat this page alone as proof of CCPA applicability or compliance.

## Legal review and regional sources

These are implementation-aligned provisions, not a certification of the operator's legal status or all historical practices. The operator must review statutory coverage, actual controller details, vendor contracts, retention and representative/DPO requirements. No agreements or transfer safeguards are invented by the code.

- ANPD: https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes
- OPC Canada: https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/pipeda-compliance-help/pipeda-interpretation-bulletins/interpretations_05_access/
- OAIC: https://www.oaic.gov.au/engage-with-us/events/privacy-awareness-week/paw-2025/privacy-rights-in-australia
- Singapore PDPC: https://www.pdpc.gov.sg/overview-of-pdpa/data-protection/individual/individuals-overview
- Japan PPC: https://www.ppc.go.jp/en/
- India notification: https://www.pib.gov.in/PressNoteDetails.aspx?NoteId=156054&ModuleId=3&reg=48&lang=2

India has phased commencement; do not claim all substantive DPDP provisions are already in force merely because the rules were notified.

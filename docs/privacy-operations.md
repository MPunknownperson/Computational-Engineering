# Privacy operations

The general `/privacy` policy is public worldwide. It includes GDPR and CCPA sections and links to the public restrictive opt-out page. Regional supplement pages and California-specific browser preference controls use server-verified location; they are not unlocked by any browser preference.

## Trust boundary

`PRIVACY_GEO_PROVIDER` selects exactly one mechanism:

- `signed-header`: a trusted gateway derives country and optional subdivision from connection information, sends `x-privacy-geo-country`, optional `x-privacy-geo-region`, a 13-digit `x-privacy-geo-timestamp`, and hex `x-privacy-geo-signature`. The signature is HMAC-SHA256 over `COUNTRY.TIMESTAMP`, or `COUNTRY.REGION.TIMESTAMP` when a region is supplied. `PRIVACY_GEO_SIGNING_SECRET` must be a server-only random secret of at least 32 characters. Assertions expire after five minutes.
- `cloudflare`: only trust `cf-ipcountry` and `cf-region-code` when the origin is restricted to Cloudflare and its edge overwrites client-supplied headers.
- `vercel`: only trust `x-vercel-ip-country` and `x-vercel-ip-country-region` on a Vercel-managed origin. A genuine Vercel deployment can also be recognized through its server environment.

Do not trust ordinary client-supplied country headers or forward them without overwriting. Query parameters, language, timezone, cookies and local storage are never access evidence. Missing configuration and invalid/expired assertions fail closed. The preview is configured for signed assertions but does not invent a visitor country. With no trusted upstream assertion, regional resources and voice remain unavailable, while general tools remain public and a protective opt-in consent notice is shown.

## Consent

There is no geographic selector. Server location chooses the applicable notice. An obsolete stored region override is removed. Unknown location uses protective opt-in defaults without asserting a country. Optional storage needs an explicit saved selection. Functional consent governs remembered state, saved-formula browser references and learning. Analytics/advertising integrations are not currently loaded. GPC always restricts advertising/sale-sharing. Categories can be changed or withdrawn from Cookie settings.

## Restricted routes

`/privacy/regions/brazil`, `/canada`, `/australia`, `/singapore`, `/japan`, and `/india` under the same prefix require the corresponding country. Proxy and server component both check authorization. GET, HEAD, RSC and prefetch requests are protected. Mismatches return 403; unknown slugs return 404. Responses are private/no-store, noindex and vary on trusted location headers. The California browser controls require verified US-CA. Location gating controls delivery, not a statement of residency or legal entitlement; the public contact route remains available.

## Persistence

PostgreSQL via Drizzle stores formulas, optional contact messages and anonymous restrictive opt-out receipts. Receipt data does not include IP, country, name, email or user agent. Essential cookies are HttpOnly, SameSite=Lax, Secure in production and expire after one year. Expired receipts are removed on subsequent preference saves. No claim of a scheduled purge is made. The operator must review controller disclosures, retention and legal applicability before public launch.

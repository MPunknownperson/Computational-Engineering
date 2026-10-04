# Search and domain portability

## What ships

- Root-relative internal navigation, assets, form endpoints, examples and fragment links.
- One canonical per page, excluding input/tracking queries. The clean tools remain canonical; only seven distinct worked guides have additional indexable URLs.
- Unique titles/descriptions, Open Graph and large-image social cards for each public page.
- Server-rendered explanatory content for visitors and crawlers, including when JavaScript is unavailable. Calculators still require JavaScript and confirmation.
- WebSite, WebPage/CollectionPage, Article, WebApplication and breadcrumb JSON-LD that reflects the visible content. No fake reviews, rating counts, FAQ/HowTo/MathSolver rich-result claims or mass-generated doorway pages.
- Accessible, same-origin 1200×630 PNG previews at `/media/{page-id}.png`, with explicit dimensions and alternative text on guide pages.
- Current-host sitemap, robots rules, app manifest, static favicon and PNG icons. API responses are excluded from indexing; private formula/contact responses are not cached.
- Optional Google and Bing verification tags, and an opt-in IndexNow utility.

## Origin selection

By default, absolute discovery URLs use the serving request's validated Host header. Internal links remain relative regardless of origin. No `localhost` or old domain is baked into the public metadata.

If your trusted reverse proxy rewrites Host, set `TRUST_PROXY_HEADERS=true` only when it overwrites incoming forwarded-host headers. The edge must restrict requests to authorised domains. Do not enable that setting behind a proxy that passes arbitrary client forwarded headers unchanged.

To consolidate aliases on one primary domain, optionally set `SITE_CANONICAL_ORIGIN=https://your-primary-domain` (no path). Change or remove this preference when moving domains. It never alters internal navigation.

Sitemaps and canonicals intentionally use absolute URLs: search engines recommend/require absolute URLs for these protocols. Generating them from the deployment is safer than relative canonicals or a hard-coded host.

## Before public indexing

1. Perform a real trademark/domain clearance for **Radix Loom**. A web search cannot establish legal availability or prevent search-engine spelling suggestions.
2. Publish on a working HTTPS domain. Confirm real content, private data controls, contact monitoring and any legally required disclosures. Neutral wording alone does not establish legal compliance.
3. Add `GOOGLE_SITE_VERIFICATION` and/or `BING_SITE_VERIFICATION` from the respective webmaster accounts. These are verification values, not fabricated identifiers.
4. Submit `/sitemap.xml` in Google Search Console and Bing Webmaster Tools. Use URL Inspection on the home page, one tool and one guide. Run Google's Rich Results Test and a Schema.org validator. Breadcrumb markup can be tested; app/article markup is descriptive and does not guarantee a search feature.
5. Check PageSpeed Insights and real-user Core Web Vitals once traffic exists. No measured score or ranking improvement is claimed by this implementation.
6. Optional: configure an 8–128 character `INDEXNOW_KEY` on the deployment. `/indexnow.txt` returns it only when configured. Preview the URL list with `node scripts/submit-indexnow.mjs --origin=https://your-domain`. Add `--submit` only after reviewing it. IndexNow is for participating engines such as Bing, not a Google submission endpoint.
7. Keep external-data and software licensing/attribution obligations under review. Omitting implementation names from marketing pages does not waive upstream rights.

## Domain moves

Navigation, prefilled tool links, query values and fragment anchors continue working without code changes. Absolute discovery URLs follow the new host unless explicitly pinned. Existing search signals and browser storage do not automatically move domains: configure permanent redirects at the old domain, use the search-engine change-of-address workflow where available, and submit the new sitemap. Saved workspaces cannot be silently transferred from one browser origin to another; download important formulas before moving.

## Validation

Run `npx next typegen`, `npm exec tsc -- --noEmit --pretty false`, `npm run lint`, `npm run build`, then the managed runtime validation. Once the preview is running, `npx playwright test` verifies unique page metadata, host switching, clean canonicals, JSON-LD, query prefills, confirmation behavior, media dimensions, no-JavaScript content and mobile navigation.

Guidance used: Google Search Essentials, structured-data quality guidelines, canonical URL guidance, Next.js Metadata/ImageResponse documentation, Bing Webmaster Guidelines and official IndexNow documentation. Search engines decide indexing, sitelinks, spelling suggestions, rich results and ranking. None can be guaranteed.

# Quantiva

A public React + Vite + Tailwind calculation site with a live data layer and hand-drawn characters.
There is no login, no search box, no chat interface and no account system.

This tree is the re-branded, re-worked successor to the previous *Arithvale* build.

## What changed in this revision

**Brand.** The site is published as **Quantiva** (*quant-* from quantity, *-iva* a coined suffix).
The mark is no longer a static tile: `BrandGlyph` in `src/components/ToolGlyph.tsx` draws an
orbit ring around a counting bead with the mascot's eyes inside, and the ring turns while the left
eye winks. Brand strings, contact addresses and the processor list live in `src/lib/legal.ts`;
`public/favicon.svg` and the inline favicon in `index.html` were redrawn to match. Local-storage
keys are namespaced `quantiva.*`, with `arithvale.*` read as a fallback so returning visitors keep
their settings, history and workspace.

**Characters and animation.** `src/components/mascot/` contains two cel-style characters drawn as
SVG paths with named joints — **Nova** (the guide) and **Pip** (a coin-cat). `src/styles/mascot.css`
rigs them: breathing, blinking, hair sway, an ahoge that wiggles, waving, pointing, cheering and
sleeping with drifting z-marks. `MascotScene` stages them in an illustrated valley with drifting
clouds, a turning sun, looping birds and falling coins; `NovaFilmstrip` plays a four-beat cartoon
with transport controls. The characters also carry the loading states, the error page and the
market reactions. Everything stops under `prefers-reduced-motion`.

**Live data.** `src/lib/live.ts` is a hardened fetch layer — timeout, two backoff retries, abort
propagation, response validation and a stale-while-revalidate memory cache. `src/hooks/useLiveData.ts`
adds polling, tab-visibility pausing, reconnection on `online` and manual refresh. Sources:

| Source | Host | Used for |
| --- | --- | --- |
| Frankfurter (ECB) | `api.frankfurter.dev` | Daily reference rates and 30-day series |
| CoinGecko | `api.coingecko.com` | Digital-asset spot prices and 24-hour change |
| World Bank Open Data | `api.worldbank.org` | Inflation, GDP per capita, unemployment, population |

**Footer.** Completely rebuilt as `src/components/SiteFooter.tsx`: a live market ticker that pauses
on hover or focus, an identity block with Pip, five navigation columns (Calculate, Live data,
Explore, Company, Legal), an honest disclaimer and a base bar with a back-to-top control.

**Reliability and browser support.**

- A render `ErrorBoundary` replaces the previous white screen on a failed chunk or bad payload.
- The route effect no longer depended on the active tool, which used to re-run the whole reset
  block (and scroll the page) every time a tool changed inside a page.
- Roving-tab keyboard handling no longer asserts on `closest()` and guards empty tab lists.
- `requestAnimationFrame`, `scrollTo({behavior})`, `MediaQueryList.addEventListener`,
  `navigator.clipboard` and `AbortSignal.timeout` are all feature-detected with working fallbacks.
- `src/styles/compat.css` supplies `color-mix()` and `dvh` fallbacks and completes the ink (dark)
  theme for every new surface.
- The hash router now also listens to `popstate` for WebKit history restores.

## Routes

The build is a single HTML file, so routing is hash-based: every page is linkable, bookmarkable and
survives a reload, and browser back/forward work normally.

- `#` home, `#calculators` / `#converters` directory, `#<tool>` each calculator
- `#markets` live FX, 30-day trends, live conversion and digital assets
- `#economy` World Bank indicator tracker, `#status` upstream feed health
- `#animation` the animation studio (character rig, poses, filmstrip)
- `#guides` and `#guides/<slug>`, `#coverage`, `#methodology`, `#about`, `#contact`
- `#terms`, `#privacy`, `#disclaimer`, `#accessibility`
- `#history`, `#saved`, plus a real not-found page

Secondary pages are code-split behind `Suspense` with an animated mascot loader. Under the
single-file plugin those chunks are inlined rather than fetched.

## Coverage

192 countries and territories, 1,520 regional choices and 1,696 locality labels, each with its own
authority, currency, dated reference year, scope note and source link.

## Development

```bash
npm install
npm run dev
npm run build     # emits a single self-contained dist/index.html
```

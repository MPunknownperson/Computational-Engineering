# Arithvale

A public React, Vite, and Tailwind calculation website. There is no login, search box, chat interface, or account system.

## Brand

The site is published as **Arithvale** (*arith-* from arithmetic, *-vale* a valley). The name is a
coined word with no prior use, chosen so that search-engine queries for it resolve to this site.
Brand strings, contact addresses, the legal effective date and the third-party processor list live
in `src/lib/legal.ts`; the mark and wordmark are `BrandGlyph` and `BrandWordmark` in
`src/components/ToolGlyph.tsx`, and the favicon is `public/favicon.svg` (also inlined in
`index.html`). Local-storage keys are namespaced `arithvale.*`; the previous `calcvault.*` keys are
read as a fallback so returning visitors keep their settings, history and workspace.

## Navigation and Legal Pages

- Header: Home, Calculators, Converters, Guides, Coverage, Methodology, About (lower-priority
  links fold into the mobile menu first).
- Footer: Tools, Explore, Company (About, Contact, Accessibility, Formulas & sources, Preferences)
  and Legal (Terms and Conditions, Privacy Policy, Disclaimer, Accessibility), plus a copyright bar.
- `#terms`, `#privacy`, `#disclaimer`, `#accessibility` and `#contact` are rendered by
  `src/components/pages/LegalPages.tsx`. The Terms and Privacy Policy describe the site exactly as
  built: no accounts, no analytics, no cookies, data held in browser local storage, and direct
  browser requests to the ECB reference-rate API, flag image hosts and Google Fonts only.

## Country and Device Updates

- Added mainland China, Brunei, the Bahamas, Seychelles, Zambia, and Papua New Guinea with dated reference profiles, local currency, named contribution options, and source links.
- Expanded the selectable regions of Germany, Japan, India, and New Zealand. Added local choices are labels unless an explicit reference rate is available.
- Consolidated country, region, and optional locality controls. The redundant county reference table is removed; California's actual locality selector remains available.
- Added unlisted-region and custom-locality choices, fixed locality persistence and restoration, and kept extra local charges opt-in.
- Added responsive phone/tablet layouts, larger touch controls, safe swipe navigation, keyboard-aware dialogs, native scrolling tables, and configurable screen/input preferences.
- Added regional and gesture regression checks to the on-demand in-browser diagnostics. See `MOBILE_QA.md` for the physical-device test matrix and data limitations.

## Coverage

192 countries and territories, 1,520 regional choices and 1,696 locality labels. Every
country keeps its own authority, currency, dated reference year, scope note and source
link, plus an explicit "other region" and "other locality" fallback for unlisted places.

## Site Architecture

The build is a single HTML file, so routing is hash-based: every page is linkable,
bookmarkable and survives a reload, and browser back/forward work normally.

- `#` home, `#calculators` / `#converters` directory, `#<tool>` each calculator
- `#guides` and `#guides/<slug>` editorial explanations of the mechanics
- `#coverage` searchable jurisdiction browser, `#methodology`, `#about`, `#contact`
- `#terms`, `#privacy`, `#disclaimer`, `#accessibility` legal and company pages
- `#history`, `#saved`, plus a real not-found page

Secondary pages are code-split behind `Suspense` with an animated loader. Under the
single-file plugin those chunks are inlined rather than fetched, so there are no external
requests and no broken preloads. Document title and meta description update per route.

## Flags

`src/lib/flagCatalog.ts` maps documented current regional flags. `resolveFlag` returns a
regional flag when one exists, otherwise the national flag of the sovereign state, and
only falls back to a text badge if no asset resolves at all. Jurisdictions with no current
official flag — Northern Ireland, for example — deliberately use the national flag rather
than a historical or invented banner. Keys are country-scoped, so `US-WA` and `AU-WA`
cannot collide.

## Animation Engine

`src/lib/engine/animation.ts` drives all motion from one shared `requestAnimationFrame`
loop, so adding animation does not add timers.

- Tweens with a documented easing set, all verified continuous and monotonic
- A real spring integrator using a fixed 1/240s sub-step, so motion is identical at 60Hz
  and 120Hz
- `prefersReducedMotion` is honoured by jumping to the final value, which keeps state
  correct instead of leaving an animation half-applied
- `stopAllAnimations` on route change prevents orphaned work

`src/components/motion/` provides the components built on it: `AnimatedNumber`, `Reveal`,
`ProgressRing`, `ProgressBar`, `LoadingBar`, `Skeleton`, `PanelLoader` and `AuroraBackdrop`.

## Computation Layer

`src/lib/engine/` holds the shared numerical services. They operate on the same
deterministic tool modules that produce confirmed results.

- `scheduler.ts` — cooperative time-slicing with a frame budget, cancellation and an LRU
  memo cache. The single-file deployment cannot ship a separate worker bundle, so long
  runs yield to the browser instead of blocking input.
- `analysis.ts` — memoized evaluation, central-difference sensitivity with elasticity
  ranking, a bracketed secant/bisection solver, and Halton-sequence sampling of the exact
  engine for surrogate training.
- `network.ts` — a fully-connected network written from scratch (forward pass,
  backpropagation, Adam) over typed arrays, plus `SurrogateEnsemble`: several
  independently seeded members whose disagreement is a genuine uncertainty signal. The
  ensemble reports a 95% interval and takes the worst member as its headline accuracy, so
  extrapolation is visible rather than hidden. Predictions can be checked against the
  exact engine in one click.
- `collaboration.ts` — a cross-module graph that chains real module outputs into other
  modules: take-home into mortgage affordability solving, payment burden as a share of
  take-home, surplus into compound growth, take-home into currency and transaction fees.
  A link is omitted with a stated reason when its prerequisites are missing.

The surrogate never replaces a confirmed result: it powers interactive previews and is
labelled as an approximation with its measured error. There is no external AI service and
no data leaves the browser.

`src/lib/engine/checks.ts` verifies these systems: the network learns a known non-linear
function and is seed-deterministic, the surrogate tracks the exact mortgage engine within
5%, the solver reproduces its target through the exact engine and reports failure instead
of guessing, sensitivity signs and shares are correct, and collaboration links are
independently reproducible.

## Result Behavior

- No result is shown until Calculate is pressed.
- Editing inputs after a calculation keeps the previous result visible and marks it as requiring an update.
- The latest result appears only after Calculate is pressed again.
- Internally computed drafts are used only for validation and are never presented as confirmed results.

## Independent Tool Modules

`src/lib/toolModules/` contains ten independent module definitions. Each module owns its formula library, data inputs, processing stages, and companion-tool links.

- Mortgage: principal, rate-convention conversion, amortization, zero-rate handling, interest-only and balloon methods, ownership costs, LTV, and actuarial APR.
- Tax: period annualization, year-specific packs, national brackets or flat rate, credits, regional methods, local tax, payroll contributions, and period proration.
- Car finance: taxable vehicle value, financing balance, amortization, balloon, and flat add-on methods.
- Compound growth: net rate, periodic-rate conversion, ordinary annuity, annuity due, simple interest, continuous growth, and real value.
- Transactions: distinct tax, processing, fixed, platform, cross-border, spread, payout, net, and gross-up stages.
- Currency: source fee, dated reference rate, spread-adjusted rate, output, and cost.
- Probability: independent-event algebra, conditional probability, binomial log-space evaluation, exact BigInt counting, and seeded Monte Carlo validation.
- Scientific: allowlisted expression parsing, angle conversion, discriminant classification, and numerically stable quadratic roots.
- Units: dimensional validation, canonical-base conversion, temperature offsets, decimal/binary storage, and inverse checking.
- BMI: SI normalization, BMI ratio, category mapping, and reference-weight inversion.

The processing facade in `src/lib/processing.ts` dispatches to the selected module. It does not combine unrelated tools using a universal weighted formula.

## Formula Sets

Each confirmed result includes several formula definitions. The detail view distinguishes formulas applied to the current method from valid alternative formulas. The reference dialog lists the full formula library for every tool.

## Flag Sources

- Country flags use FlagCDN country SVGs.
- Mapped regional flags use named Wikimedia Commons files.
- Regional lookup keys include country and region, so `US-WA` and `AU-WA` cannot collide.
- If no current official regional flag is mapped, the interface uses a text jurisdiction identifier.
- Northern Ireland deliberately uses text because it has no current official regional flag; the historical Ulster Banner is not shown as current.
- Remote asset failure also falls back to text rather than displaying an invented approximation.

## Evidence and Data

- Statutory tax packs and dated exchange-rate references control statutory and contractual calculations.
- Supplementary sources are selected by domain in `src/lib/evidence.ts`: OECD, Census/ACS, WID, NBER, CFPB, BIS, NIST, BIPM, and WHO.
- Supplementary evidence supplies context and validation references. It is not silently mixed into statutory tax or contractual payment results.
- Regional figures should retain source-year metadata and be reviewed before production use. Unsupported local rules remain explicit custom inputs.

## Verification

- The deterministic self-check suite covers loan edge cases, amortization reconciliation, historical tax packs, country options, exact and simulated probability, localized input, unit round trips, fee reverse calculations, target solvers, rate validation, and every tool method.
- Run the production build with the provided build command.
- Browser interaction and remote flag availability should be checked in the target deployment environment.
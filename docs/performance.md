# Performance and quality safeguards

## Static responsive artwork

Guide art is generated ahead of time, not rasterised on a visitor request. Regenerate after changing artwork or article titles:

`npm exec tsx -- scripts/generate-guide-images.tsx`

The script writes compressed PNG originals, 400/800/1200px lossless WebP variants, content-hashed filenames and `src/lib/media/manifest.json`. It verifies full-size WebP pixel equality against the source PNG and removes obsolete hashes. Resizing the thumbnail variants is intentional; compression of each resulting raster is lossless.

`GuideHero` uses a responsive picture element. Article heroes and the first guide image load eagerly; remaining cards load lazily. Width and height reserve space before decode. The same full-size PNG is exposed to sitemap/metadata; old slug-only image links redirect to the static asset. Only hashed filenames are immutable.

## Navigation and motion

The navigation wrapper is not keyed by route, so navigation does not remount the page subtree a second time. A single 160ms transform does not fade text or animate the header. Navigation links prefetch on pointer, focus or touch intent (respecting Save-Data) and show a fixed-size pending indicator. They do not download every tool bundle on the homepage. No global loading boundary hides streamed article HTML from no-JavaScript readers. Browser back/forward remains native.

There are no scroll-driven React renders, animated box shadows, glow/sheens over text, or perpetual illustration drift. Reveals never hide rendered content. Numeric tweens update one text node rather than re-keying individual digits. Reduced-motion preferences skip programmatic movement.

## Quality checks

Unused local variables and parameters fail TypeScript compilation. Duplicate/unreachable source modules and obsolete model/provider code have been removed.

Run the browser suites against the production preview with `npx playwright test`. The regression suite checks static image delivery, language routing, stable route wrapper and hover overlays. Accessibility audits use axe-core on the principal pages.

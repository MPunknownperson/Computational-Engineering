# Performance and quality safeguards

## Static responsive artwork

Guide art is generated ahead of time, not rasterised on a visitor request. Regenerate after changing artwork or article titles:

`npm exec tsx -- scripts/generate-guide-images.tsx`

The script writes compressed PNG originals, 400/800/1200px lossless WebP variants, content-hashed filenames and `src/lib/media/manifest.json`. It verifies full-size WebP pixel equality against the source PNG and removes obsolete hashes. Resizing the thumbnail variants is intentional; compression of each resulting raster is lossless.

`GuideHero` uses a responsive picture element. Article heroes and the first guide image load eagerly; remaining cards load lazily. Width and height reserve space before decode. The hashed PNG is canonical for sharing and the generated WebP variants are served from the same-origin media route. Only hashed filenames are immutable.

## Navigation and motion

The shared route surface stays mounted so client navigation does not remount the page subtree. Internal route links fade the current content out and the destination in with GSAP; the active navigation link animates into place instead of displaying a pending dot. Links prefetch on pointer, focus or touch intent (respecting Save-Data). Browser back and forward remain native, and no global loading boundary hides server-rendered article content.

GSAP ScrollTrigger reveals content as it reaches the reading viewport. Cards and controls use small transform-based hover and press feedback; no layout-affecting animation or animated text overlay is used. Reduced-motion preferences skip programmatic movement and keep the page readable.

## Quality checks

Unused local variables and parameters fail TypeScript compilation. The route tree keeps one media handler, and the guide image manifest is checked against generated public assets.

Run the browser suites against the production preview with `npx playwright test`. Regression checks cover responsive static image delivery, route-wrapper continuity, browser history, interactions, and accessibility audits on principal pages.

# Radix Loom — Computational Engineering

This deployment replaces the previous site with the project downloaded from:
https://github.com/MPunknownperson/Computational-Engineering/archive/refs/heads/main.zip

## Run

Install dependencies, set `DATABASE_URL`, apply the Drizzle schema with `npx drizzle-kit push`, then use `npm run dev` or build for production. Existing legacy database records are preserved, but their previous public application routes are removed. The health endpoint is `/api/health`.

## Current behavior

- The imported calculators, unit/currency converters, formula library, guides, contact form, theme, search and private engineering workbench are retained.
- Cookie notices are assigned by server-verified country/subdivision. There is no manual location setting and no language/timezone fallback for authorization.
- Speech input uses only the browser Web Speech API. Android phones/tablets are supported through Chrome with GMS and Google speech recognition; iPhone/iPad are supported only through Safari with Apple’s system Siri speech-to-text.
- A microphone request requires an explicit tap. Audio is handled by the browser service, not uploaded to this application. Vendor processing may be remote unless a verified browser-managed local mode is selected.
- Unknown location fails closed for geographically restricted resources and voice input; ordinary typed tools remain available. The consent notice uses protective opt-in defaults.

## Deployment geography

See `docs/privacy-operations.md`. This preview uses `PRIVACY_GEO_PROVIDER=signed-header` and a server-only random signing secret. A real trusted upstream must supply authentic location assertions. Vercel or Cloudflare deployments can use their matching provider after securing the origin trust boundary. Never expose the signing secret to a client bundle or invent a country when location is unavailable.

Private workbench APIs require a server-configured `WORKBENCH_API_KEY` of at least 32 bytes; they remain hidden when unconfigured. Public site functions do not require that key.

## Validation

Run `npx next typegen`, `npm exec tsc -- --noEmit --pretty false`, and `npm run build`. Geography/browser regression tests are in `tests/browser-speech-only.spec.ts`, `tests/mobile-consent-regressions.spec.ts`, `tests/cookie-consent.spec.ts` and `tests/privacy-policy.spec.ts`. Headless tests mock recognition services; real speech quality and availability still depend on the user’s physical device and provider.

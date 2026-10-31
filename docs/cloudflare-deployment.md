# Cloudflare Workers / Pages deployment

The site is built to run on Cloudflare's runtime with **no database at all**.

## What changed from the previous (PostgreSQL) build

* `pg`, `drizzle-orm`, `drizzle-kit`, `@types/pg` and `drizzle.config.json` were removed.
* `src/db/*` was deleted. Every module that used to read or write SQL now uses
  `src/lib/store` — a bounded, in-isolate collection store (`Collection<T>`),
  with row types in `src/lib/store/types.ts`.
* `DATABASE_URL` is no longer read anywhere. `/api/health` reports
  `storage: "memory"`, `database: "disabled"`.
* The remediation engine no longer self-heals SQL schemas; its playbooks now
  use `ensure-store` and `compact-store` server actions.

## Build and deploy

```bash
npm install          # or bun install — both resolve the same type contracts
npm run build        # plain Next.js production build (CI type gate)
npm run cf:build     # next build + OpenNext worker bundle (.open-next/)
npm run cf:preview   # run the Worker bundle locally with wrangler
npm run cf:deploy    # publish to Cloudflare
```

`wrangler.jsonc` pins `compatibility_flags: ["nodejs_compat", …]` so the
Node built-ins used by server code resolve inside the Worker, maps
`.open-next/assets` to the `ASSETS` binding and binds the `quilloryn.com` and
`www.quilloryn.com` custom domains.

## Type definitions under `bun install`

Cloudflare installs dependencies with `bun install`. Bun's hoisting meant
`tsc` could fail with:

```
Type error: Cannot find module '@rive-app/react-canvas' or its corresponding
type declarations.
```

even though the package is a declared dependency. The fix is
`src/types/rive-app-react-canvas.d.ts`: an ambient module declaration that
describes the API surface the app uses (`useRive`, `Layout`, `Fit`,
`Alignment`, `StateMachineInputType`, `StateMachineInput`). Ambient
declarations are resolved before `node_modules`, so the compile result is
identical under npm, pnpm and bun, while the real package still provides the
runtime implementation.

If another dependency ever ships broken or unhoisted typings, add a sibling
file in `src/types/` the same way rather than loosening `strict` mode.

## Stateless by design

Because every isolate starts with an empty store, nothing in the product
depends on cross-request persistence:

* market data is refetched from the provider chain and cached in memory,
* saved formulas, alerts and positions are scoped to a browser-generated
  workspace token and can be exported by the browser,
* privacy opt-out receipts are also mirrored in a first-party cookie,
* workbench jobs and artifacts describe work done on the current instance.

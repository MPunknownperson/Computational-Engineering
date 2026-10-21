# Radix Loom — Computational Engineering

This deployment replaces the previous site with the project downloaded from:
https://github.com/MPunknownperson/Computational-Engineering/archive/refs/heads/main.zip

## Run

Install dependencies, set `DATABASE_URL`, apply the Drizzle schema with `npx drizzle-kit push`, then use `npm run dev` or build for production. Existing legacy database records are preserved, but their previous public application routes are removed. The health endpoint is `/api/health`.

## Current behavior

- The imported calculators, unit/currency converters, formula library, guides, contact form, theme, search and private engineering workbench are retained.
- Cookie notices are assigned by server-verified country/subdivision. There is no manual location setting and no language/timezone fallback for authorization.
- Speech input prefers the browser Web Speech API. Android phones/tablets are supported through Chrome with GMS and Google speech recognition; iPhone/iPad are supported only through Safari with Apple’s system Siri speech-to-text. When the browser has no usable native recogniser, a self-hosted **sherpa-onnx WebAssembly** recogniser (`public/vendor/sherpa-onnx`, int8 streaming Zipformer) runs fully on-device as the fallback.
- After recognition, text (never audio) goes through a **LangChain** `RunnableSequence` that loads **LlamaIndex** session memory and site retrieval, runs the typed NLU pipeline, dispatches backend tools (`solve_math`, `convert_units`, `convert_currency`, `find_site_page`) and, when configured, asks **FastGPT** (OpenAI-compatible `chat/completions` with `chatId`) to comprehend the turn. FastGPT’s official embeddable widget loader is mounted when `NEXT_PUBLIC_FASTGPT_BOT_SRC` is set. See `docs/speech-fallback-and-agent.md`.
- A microphone request requires an explicit tap. Audio is handled by the browser service, not uploaded to this application. Vendor processing may be remote unless a verified browser-managed local mode is selected.
- Unknown location fails closed for geographically restricted resources and voice input; ordinary typed tools remain available. The consent notice uses protective opt-in defaults.

## Deployment geography

See `docs/privacy-operations.md`. This preview uses `PRIVACY_GEO_PROVIDER=signed-header` and a server-only random signing secret. A real trusted upstream must supply authentic location assertions. Vercel or Cloudflare deployments can use their matching provider after securing the origin trust boundary. Never expose the signing secret to a client bundle or invent a country when location is unavailable.

Private workbench APIs require a server-configured `WORKBENCH_API_KEY` of at least 32 bytes; they remain hidden when unconfigured. Public site functions do not require that key.

## Crypto computational engine (`/tools/crypto`)

The Bitcoin & crypto prices page is a computational tool, not a price list:

- **Automated updates** — `src/instrumentation.ts` starts a self-scheduling refresh loop
  (`ensureAutoUpdater`) at server boot; browsers receive pushes over Server-Sent Events
  (`/api/crypto/stream`) with automatic fallback to polling.
- **Provider chain** — CoinGecko → Coinbase → last persisted snapshot → clearly labelled
  deterministic seed. Every response states its `source` and age. Snapshots are persisted
  in `crypto_snapshots`; history series in `crypto_history_cache`.
- **Analytical engine** (`src/lib/crypto/engine.ts`, pure and deterministic) — SMA/EMA, Wilder
  RSI, MACD, Bollinger bands, annualised volatility, Sharpe/Sortino, max drawdown,
  historical/parametric VaR and CVaR, skew/kurtosis, linear regression, z-score, seeded
  GBM Monte Carlo, support/resistance clustering, Pearson correlation and beta, and a
  weighted composite signal with per-component reasons. Sums are Kahan-compensated.
- **Exact arithmetic** (`src/lib/crypto/precision.ts`) — decimal.js at 40 significant
  digits for conversion, recurring-purchase (DCA) back-tests and portfolio P&L.
- **Tools** — converter, DCA simulator, anonymous workspace-scoped portfolio tracker and
  server-evaluated price alerts (`crypto_positions`, `crypto_alerts`), correlation matrix
  and a transparent engine-status panel.

Endpoints: `/api/crypto`, `/api/crypto/history`, `/api/crypto/analysis`,
`/api/crypto/correlation`, `/api/crypto/compute?op=convert|dca`, `/api/crypto/alerts`,
`/api/crypto/portfolio`, `/api/crypto/stream`, `/api/crypto/engine`.

## High-speed processing, error handling and automated remediation

- `src/lib/core/fast-cache.ts` — TTL + stale-while-revalidate cache with request coalescing,
  LRU bounds and last-known-good fallback.
- `src/lib/core/resilience.ts` — bounded timeouts, retry with decorrelated jitter,
  per-upstream circuit breakers and an ordered provider fallback chain.
- `src/lib/core/errors.ts` / `api-handler.ts` — typed error classification, stable
  fingerprints, safe JSON errors and `Server-Timing` on every route.
- `src/lib/remediation/engine.ts` — **automated error-remediation**: capture → classify →
  fingerprint → record (`incident_reports`) → select playbook → generate fix → deploy
  (runtime patches in `runtime_patches`, cache resets, breaker control, schema self-heal,
  pool reconnect, cache warm-up) → verify → audit (`remediation_actions`). Browser-side
  actions (clear corrupt storage, cache-busting reload, transport switch, boundary reset)
  are returned to the reporting client.
- Browser capture: `src/components/system/ErrorReporter.tsx` (global errors, unhandled
  rejections, chunk failures, last user action) and self-healing `error.tsx` /
  `global-error.tsx` boundaries.
- Console: `/system/reliability` (incident ledger, deployed fixes, patches, breakers, caches,
  self-test & repair, fault drills). API: `/api/system/errors`, `/api/system/reliability`.

## Validation

Run `npx next typegen`, `npm exec tsc -- --noEmit --pretty false`, and `npm run build`. Geography/browser regression tests are in `tests/browser-speech-only.spec.ts`, `tests/mobile-consent-regressions.spec.ts`, `tests/cookie-consent.spec.ts` and `tests/privacy-policy.spec.ts`. Headless tests mock recognition services; real speech quality and availability still depend on the user’s physical device and provider.

## NLU reliability work (post-deployment)

The reported defect — a spoken **linear equation** being executed as a
**currency conversion** — was systemic rather than isolated. Speech-to-text was
accurate; the fault was entirely downstream.

**Root causes found in this codebase**

1. *No mathematical intent existed.* The IR had only `CONVERT`, `OPEN`,
   `OPEN_PAGE` and `REPEAT`, so a numeric utterance could only ever be compiled
   to a conversion.
2. *Entity mis-mapping.* `semantics.buildProgram` preferred a currency reading
   for any mention (`candidates.find(c => c.type === "currency") ?? …`) and
   filled the missing side from `pack.defaultCurrency`, so bare numbers became
   money amounts.
3. *No dispatch validation.* Whatever the builder produced was executed.
4. *Untyped context.* The runtime kept "the last program"; any later amount was
   inherited by the last `CONVERT`, so a maths turn followed by a number
   produced a conversion.
5. *Speech normalisation destroyed operators.* `normalizeSpeech` strips `+`,
   `=`, `*` and brackets, so "solve 3x + 5 = 20" was unreadable downstream.

**Changes**

- `src/lib/voice/math-intent.ts` — mathematical intent recognition, spoken-form
  normalisation ("three x plus five equals twenty" → `3*x + 5 = 20`), typed
  entities (`math.equation`, `math.expression`, `math.variable`, `math.number`)
  and a linear/quadratic solver.
- `src/lib/voice/ir.ts` — new `SOLVE` and `EVAL` opcodes with `expression` and
  `variable` slots, validated by a closed character allow-list.
- `src/lib/voice/vm.ts` — a maths executor that computes and returns the answer
  instead of routing to a converter.
- `src/lib/voice/semantics.ts` — mathematics is compiled first; cross-domain
  ellipsis is refused; the currency default requires explicit currency evidence.
- `src/lib/voice/dispatch-guard.ts` — type checking before execution. Blocks
  `math-routed-to-conversion`, `conversion-without-currency-evidence`,
  `conversion-without-unit-evidence`, `cross-domain-inheritance`,
  `non-numeric-amount` and unsafe expressions.
- `src/lib/voice/context.ts` — typed, time-bounded task context (3-minute TTL)
  that biases but never overrides explicit evidence.
- `src/lib/voice/pipeline.ts` — per-domain confidence thresholds (currency is
  the strictest at 0.62), clarification instead of guessing on cross-domain
  ambiguity, and a full decision trace.
- `src/lib/voice/telemetry.ts` + `nlu_interactions` / `nlu_regression_runs`
  tables — raw text, intent, entities, confidence, action and block reason are
  logged for every turn.
- `src/lib/voice/regression-suite.ts` and `POST /api/nlu/replay` — replayable
  golden cases, including multi-turn dialogues for context leakage.
- `src/lib/math.ts` is now isomorphic (the `"use client"` directive was removed)
  so the server executor and the browser calculator share one safety policy.

**Endpoints and UI**

- `POST /api/nlu/interpret` — run the pipeline, log it, return the trace.
- `GET  /api/nlu/logs` — recent interactions and per-domain aggregates.
- `POST /api/nlu/replay` — run the regression suite and store the result.
- `/voice-nlu` — diagnostics console: intent, entities, confidence, trace,
  interaction log and one-click regression replay.

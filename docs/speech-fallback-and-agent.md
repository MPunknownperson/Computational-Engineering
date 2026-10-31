# Speech fallback (sherpa-onnx WASM) and the context/dispatch layer

This document describes the three integrations added on top of the imported
Computational-Engineering project. No new pages, bots or homepage sections were
introduced; the existing voice panel (`SpeakCalc`) and the existing
`/api/nlu/interpret` endpoint gained new capabilities.

## 1. sherpa-onnx WebAssembly — fallback speech recogniser

**When it is used.** `decideVoiceProcessing` (`src/lib/voice/policy.ts`) still
prefers the browser's Web Speech API. Only when the browser has *no* usable
native recogniser (`speechApi === false`, or the OS/browser pairing is not
allowed for native speech) and the page can run WebAssembly + Web Audio +
`getUserMedia`, the decision becomes `{ mode: "wasm" }`. Regional
`cloud-only` rules never offer it; `local-only` rules accept it because it is
on-device.

**Runtime.** `public/vendor/sherpa-onnx/` holds the upstream k2-fsa/sherpa-onnx
WASM runtime (`sherpa-onnx-wasm-main-asr.{js,wasm,data}`, `sherpa-onnx-asr.js`,
Apache-2.0) repackaged with the int8 streaming Zipformer
`sherpa-onnx-streaming-zipformer-en-20M-2023-02-17` (≈42 MB data + 13 MB wasm).
`scripts/package-sherpa-onnx.mjs` rebuilds the bundle from the official release
archives; `manifest.json` records what is deployed.

**Execution.** `asr.worker.js` (classic worker, same origin) loads the glue,
creates an `OnlineRecognizer`, receives 16 kHz PCM chunks and streams
`partial`/`final` transcripts back. `src/lib/voice/sherpa-onnx.ts` exposes
`canUseSherpaOnnx()`, `prepareSherpaOnnx()` (one download per page, with
progress) and `createSherpaSession()` which mirrors the native session contract
(start inside the tap, one utterance, one terminal outcome). Microphone PCM is
resampled in the page and transferred to the worker; nothing leaves the
browser. The voice panel reports `data-speech-engine="sherpa-onnx-wasm"` in
this mode.

**Assets.** `/vendor/sherpa-onnx/*` is cached for 30 days and served with
`Cross-Origin-Resource-Policy: same-origin`. `NEXT_PUBLIC_SHERPA_ONNX_BASE_URL`
can point at a CDN copy of the same files.

## 2. LangChain + LlamaIndex — system context and tool dispatch

`src/lib/agent/`:

- `context.ts` (LlamaIndex): `createMemory()` per session id keeps every
  recognised utterance and every backend outcome (30-minute TTL). The public
  page catalog is ingested as `Document`s, split with `SentenceSplitter` into
  `TextNode`s and indexed by keywords (`simpleExtractKeywords`) for
  deterministic, embedding-free retrieval (`retrieveSiteContext`).
- `tools.ts` (LangChain): `tool()` definitions with zod schemas wrapping the
  backend — `solve_math`, `convert_units`, `convert_currency`,
  `find_site_page`. `dispatchTool(name, args)` invokes and records a call.
- `orchestrator.ts` (LangChain): a `RunnableSequence` —
  `interpret` reuses the project's typed NLU pipeline (`VoiceRuntime`), kept
  per session so its 3-minute task context persists across requests.

`POST /api/nlu/interpret` now runs this chain and returns the original
`decision`/`summary`/`turns` plus an `agent` block (`reply`, `href`, `label`,
`tools`, `sitePages`, `comprehension`, `frameworks`). `GET` returns the tool
manifest. The browser voice panel posts each recognised text (never audio)
with a per-page-load `sessionId` and the engine id; when the local router
cannot resolve an utterance, the agent's result is offered before the
TensorFlow.js guess.


  manages its own conversation context, and `variables` carrying the structured
  system context (engine, recognised text, deterministic decision, retrieved
  configured; failures are silent enrichment misses.
  website embed loader (`<script id="chatbot-iframe" src=".../js/iframe.js"
  data-bot-src=...>`), mounted from the root layout only when

## Environment

```
NEXT_PUBLIC_SHERPA_ONNX_BASE_URL=/vendor/sherpa-onnx/      # optional
```

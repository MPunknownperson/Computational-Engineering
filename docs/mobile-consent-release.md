# Archive replacement: mobile voice and regional cookies

## Source and deployment

Imported `https://github.com/MPunknownperson/Computational-Engineering/archive/refs/heads/main.zip`, archive commit `5f80d7bd983dc3459f1da7c9936f0731d338a48b`. The archive was checked for absolute paths, traversal and symlinks before extraction under `/tmp/ce-project`. Its source, assets, docs, tests and configurations replace the previous dashboard. Environment credentials are preserved; dependencies are installed through npm rather than overwriting the manifest.

The public application is Radix Loom. Administrative workbench APIs remain gated by the imported server-side `WORKBENCH_API_KEY` check. The old `/api/workspace` route is removed. The application's Drizzle schema supplies formula storage, contact messages, privacy receipts and the private workbench audit tables.

## Mobile voice

Native speech remains the first option where available, including prefixed WebKit recognition. A non-callable placeholder at `window.SpeechRecognition` no longer hides a working `webkitSpeechRecognition` constructor. Native start is synchronous in the original tap, does not pre-open a competing getUserMedia stream, and only reports listening after an audio/start/result event. Policy resolution completes before any cloud option is enabled.

The old fallback required the experimental, English-only browser LanguageModel audio API, absent from most phones/tablets. A second portable fallback now works on secure browsers with Web Audio, WebAssembly, Web Workers and microphone capture, without WebGPU, MediaRecorder or a browser-vendor speech model. It also supplies a local-only option when no native local language pack is available. Strict region restrictions still apply.

The multilingual, quantized `Xenova/whisper-tiny` model is pinned to the revision recorded in `public/models/Xenova/whisper-tiny/SOURCE.txt`. Model and ONNX runtime files are self-hosted. The first tap prepares the model and reports progress. A new tap is required to start microphone capture, with AudioContext resume and getUserMedia both initiated directly by that gesture. Audio is resampled to 16 kHz and transcribed inside a worker; it is never uploaded. Optional persistent model caching requires functional consent. Capture/permission/decode have deadlines; Stop, Cancel, backgrounding and navigation release capture and invalidate stale work.

Real microphone permission, Siri/Dictation settings, browser speech-service availability, embedded-frame delegation and device resource limits remain browser/OS concerns. A page cannot grant itself access denied by its browser or parent iframe. Release testing should include physical iPhone/iPad Safari and Android Chrome over HTTPS; emulated tests cannot prove physical microphone behavior.

## Regional cookies

Consent presentation recognises configured trusted geolocation plus common Cloudflare, Vercel, CloudFront, App Engine, Fastly and Fly country/state hints. Explicitly configured signed/edge policies are never bypassed with an unsigned hint. These presentation hints never grant access to private routes or regional supplements: their stricter trusted-geo checks are unchanged. No external IP lookup or GPS request is made.

Timezone aliases are canonicalised and all preferred BCP-47 locales are considered, including when timezone data is missing/UTC. The banner is mounted only after resolution, preventing a standard-notice flash. Every settings panel has a Privacy region selector for inaccurate location/VPN/shared-timezone cases. Selections persist as an essential privacy preference and keep separate consent namespaces. Settings clicks made before vendor-script readiness are retained.

Standard settings now expose necessary, functional, analytics and advertising categories, initially all selected (except advertising under GPC). This does not silently grant optional storage: saving is still required. Existing rejections are retained, and categories newly offered to a returning visitor are not retroactively accepted. Managed-region defaults remain off. Common purpose descriptions are shared; local legal introductions and relevant advertising controls remain region-specific. No analytics or advertising services are loaded.

## Consent appearance

`consent-theme.css` has greater specificity than the asynchronously loaded vendor CSS, whose black background previously overrode the site's white surface. All text, cards, descriptions, toggle states, buttons and backgrounds now use the explicit site theme. Light-on-dark and dark-on-light are both tested, independent of OS preference. Mobile panels scroll within the viewport and have touch-size controls and visible keyboard focus.

## Verification

Run `npx next typegen`, `npm exec tsc -- --noEmit --pretty false`, and `npm run build`. Then run the production preview and relevant Playwright tests. The browser tests mock vendor speech services (headless browsers do not provide them); portable-model verification can separately exercise the real self-hosted model against a known audio sample. Cookie tests cover all eight managed regimes, standard defaults, persisted rejection, GPC, region overrides and theme contrast.

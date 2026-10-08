# Speech recognition: on-device feasibility, cloud principles, and free technology

This document records the investigation behind the site's voice feature: how
cloud recognition works, whether recognition can run on the visitor's device,
which free technologies exist, and how the site's language packs turn speech
into an executed action.

---

## 1. How cloud speech recognition works

Commercial cloud recognition systems (Google, Microsoft Azure, Amazon
Transcribe, Deepgram, AssemblyAI) typically use a pipeline. Audio is streamed up in small
chunks and text is streamed back; each stage runs on server GPUs.

| Stage | What happens | Typical implementation |
| --- | --- | --- |
| Capture | Browser/OS samples the microphone, usually 16 kHz mono PCM. The page sends encoded audio (Opus at 16–32 kbit/s ≈ 2–4 KB/s) rather than raw PCM (32 KB/s). | `getUserMedia` → Opus in WebRTC/WebSocket |
| VAD / endpointing | Detects speech presence and end-of-utterance so the recogniser finalises promptly. | Energy + neural VAD, 200–800 ms silence rules |
| Feature extraction | Raw waveform → log-mel spectrogram, 80–128 bins over 25 ms windows shifted 10 ms. | `kaldi`-style fbank / Whisper mel |
| Acoustic model | Maps frames to sub-word probabilities. Current architectures are Conformer / Zipformer / FastConformer encoders, or an encoder–decoder transformer (Whisper). | ~50 M–1.5 B parameters |
| Decoding | Turns probabilities into text: CTC (fast, frame-aligned), RNN-T (streaming), or attention encoder–decoder (Whisper). Beam search plus language-model shallow fusion reduces word errors. | beam width 4–8 |
| Language model rescoring | Re-ranks hypotheses with a larger LM; grammar/phrase lists can be biased so domain words ("kilogram", "USD") survive. | WFST, neural LM, biasing lists |
| Post-processing | Inverse text normalisation ("one hundred twenty" → `120`), punctuation, capitalisation, diarisation. | rule + model hybrid |

**Why it is cloud-based:** accuracy scales with parameter count and training
data. Whisper-large is 1.55 B parameters (~3 GB); a phone or a browser tab
cannot hold that comfortably, and GPU batching makes per-minute costs low.
**What it costs:** every utterance crosses the network, so audio leaves the
device, which is a privacy and legal question as much as a technical one.

---

## 2. On-device feasibility in a browser

On-device recognition is feasible today, with three distinct mechanisms.

### 2.1 Browser-provided on-device engine (used by this site)

The Web Speech API gained a standard on-device path: set
`SpeechRecognition.processLocally = true`, check availability with
`SpeechRecognition.available({ langs, processLocally: true })`, and install a
language pack with `SpeechRecognition.install(...)`.

| Aspect | Finding |
| --- | --- |
| Languages | Per-device language packs; one download per language. |
| Availability | Chrome 139+ / Edge expose `available`/`install`; Chrome/Edge also offer cloud; Safari uses its own engine without the on-device switch; Firefox has no engine at all. |
| Download | Tens of MB per language, cached by the browser (not by the site). |
| Privacy | Audio stays on the device; the model download is the only network use. |
| Failure modes observed | Chromium builds without the on-device component **crash the renderer** when `available({ processLocally: true })` is called — the site probes lazily and never in headless. `start()` without a pack fails with `language-not-supported`. |

### 2.2 Site-delivered model running in the browser (implemented as a fallback)

WebAssembly and WebGPU let a page run an open model itself. Measured landscape:

| Model | Parameters | Download | Licence | Notes |
| --- | --- | --- | --- | --- |
| Whisper tiny (multilingual) | 39 M | ~40 MB | MIT | 99 languages; quick to download, less reliable on names and numbers |
| **Whisper Base (deployed fallback)** | **74 M** | **q8 ONNX assets, downloaded individually; total varies by runtime** | **Apache-2.0, Xenova export** | Multilingual; stronger recognition than Tiny; beam-search decoding |
| Moonshine tiny | 5.8–27 M | ~6–30 MB | MIT (English) | Built for on-device/streaming; English only |
| NVIDIA Parakeet TDT 0.6B | 600 M | ~1.2 GB | Apache-2.0 / CC-BY-4.0 variants | Server-grade, too large for a tab |
| Voxtral Realtime (Q4) | 4 B | ~2.5 GB | Apache-2.0 | Browser builds exist but are not practical for a calculator page |

Runtimes: **Transformers.js** (Apache-2.0) over **ONNX Runtime Web** (MIT),
WebGPU when present with automatic WASM fallback; **whisper.cpp** compiled to
WASM (no GPU acceleration); **Vosk** (Apache-2.0) for streaming, small-model
use.

Practical constraints measured from the ecosystem and from this
implementation:

- Cold start varies with network/device and loads several tokenizer, config and q8 model assets from Hugging Face Hub; completed files are browser-cached.
- The deployed model runs in a dedicated Web Worker with beam search (`num_beams: 3`) and repetition guards. This prevents inference from freezing the UI; it is more accurate than Whisper Tiny's greedy/fast configuration, at the cost of extra decoding time and memory.
- Whisper language parameters are human-readable model names (`french`, `chinese`, `hindi`), not BCP-47 tags (`fr-FR`, `zh-CN`). Passing locale codes to Whisper reduced multilingual accuracy; a shared locale-to-model-language map now normalises them before inference.
- The system displays the exact transcript and the interpretation/tool action separately, so a visitor can spot and correct a mismatch. A recogniser alternative that parses more completely can beat a higher-ranked but semantically incomplete hypothesis.
- A 74 M-parameter q8 base model has a larger memory footprint than Tiny. Devices that fail the local capability check or model initialisation do not expose the in-page model path.
- No native partial results unless the model is streaming-capable, so the
  command is decoded after the user stops speaking.
- iOS Safari gates WebGPU behind settings; WASM fallback is required.
- Storage quotas apply: models live in the browser Cache API, which the user
  or the browser can evict.

### 2.3 OS-provided engines (not reachable from a web page)

Android `SpeechRecognizer` provides `isOnDeviceRecognitionAvailable()` and
`createOnDeviceSpeechRecognizer()` (API 31+), a model-download trigger, and
language-support callbacks. An Android **native app** must request RECORD_AUDIO,
register a listener, and destroy the recognizer when done. Apple
`SFSpeechRecognizer` exposes `supportedLocales` and
`supportsOnDeviceRecognition`; a native iOS app can set
`SFSpeechRecognitionRequest.requiresOnDeviceRecognition` and must request both
speech and microphone authorization. Windows has its own native speech APIs.
These calls are **not accessible to a website's JavaScript** and cannot be
silently invoked by Safari/Chrome. The web app uses only browser-exposed Web
Speech or the on-page WASM/WebGPU model; a future native wrapper could provide
a carefully permissioned bridge, but none is shipped here.

### 2.4 Conclusion

| Browser/OS situation | Assignment this site makes |
| --- | --- |
| Android / iOS / iPadOS | Browser on-device (`processLocally`) when the browser exposes it; otherwise the on-page multilingual model if supported |
| Phone without an exposed local browser speech path | In-browser multilingual model if supported; otherwise voice unavailable |
| Desktop exposing a browser speech engine | Browser-managed recognition; the browser may use remote processing |
| Desktop browser with no engine or no managed speech service | Site-delivered model (WebGPU/WASM) if the runtime supports it |
| Browser with neither | Voice unavailable |
| Region restricting audio export | On-device only, or unavailable |

On-device-only for *everything* is not yet practical in a browser: native
language packs are not installed by default, Safari does not expose the web
`processLocally` switch, and downloading a model for every visitor is costly.
The site now loads its in-browser fallback on demand. Desktop browsers exposing
SpeechRecognition use their default managed service directly; a language check
with `available({processLocally:false})` is **not** a reliable test for cloud
service presence and must not be used to divert them to a local model.

---

## 3. Free and publicly available technology

| Technology | Source | Licence | Cost | Usable here |
| --- | --- | --- | --- | --- |
| Web Speech API (cloud + on-device) | W3C CG draft; Chrome, Edge, Safari | Browser implementation | Free, no key | Yes — primary path |
| Transformers.js + ONNX Runtime Web | Hugging Face | Apache-2.0 / MIT | Free | Yes — fallback path |
| Whisper Base ONNX conversion | Xenova (weights hosted on Hugging Face Hub) | Apache-2.0 export; check upstream terms for other artifacts | Free weights; visitor pays bandwidth/device compute | Deployed in a dedicated worker |
| Moonshine | Useful Sensors / Moonshine AI | MIT (English) | Free | English only |
| Vosk | Alpha Cephei | Apache-2.0 | Free | Streaming, 20+ languages, small models |
| whisper.cpp | Georgi Gerganov et al. | MIT | Free | Native/WASM port |
| Kaldi, ESPnet, SpeechBrain | community | Apache-2.0 | Free | Research/tooling |
| Common Voice | Mozilla | CC-0 dataset | Free | Training/fine-tuning data |
| Parakeet / Canary | NVIDIA | Apache-2.0, CC-BY-4.0 | Free, self-hosted | Server only (size) |
| OS engines (Android/Apple/Windows) | OS vendors | Bundled | Free | Native apps only |

Proprietary cloud APIs (Google Cloud STT, Azure, Amazon, Deepgram,
AssemblyAI) are deliberately not used: they add a second processor, a key to
protect, and a billing dependency for a feature this site can get from the
browser for free.

---

## 4. The language pack and the execution path

The language pack is the site's dictionary *and* its compiled instruction set.
Speech is understood and executed in five deterministic stages — no neural
network, no data sent anywhere.

```
audio ─▶ text (recogniser, §2)
          │
          ▼
1. LEXER        normalise (case, accents, punctuation), tokenize
2. DICTIONARY   match tokens against the language pack:
                numbers, currencies, units, topics, connectors
3. SEMANTICS    build meaning: slot filling + context (anaphora)
                → a Program in the site's intermediate representation
4. VERIFIER     structural check: opcodes, slot keys, ranges, charset
5. EXECUTOR     the site's "operating system": Program → URL/route
                via an allow-list of builders only
```

### 4.1 Intermediate representation

A `Program` is the machine language of the voice feature: a version tag, the
language that produced it, and one to three instructions. Each instruction is
an opcode plus slots. Two programs with the same meaning in different
languages compile to the same shape:

```
"convert 120 usd to euros"        → v1|en|CONVERT{amount:120,from:USD,to:EUR}
"convierte 120 dólares a euros"   → v1|es|CONVERT{amount:120,from:USD,to:EUR}
```

The canonical form is hashed (FNV-1a) into a fingerprint used as the learning
key and for de-duplication. Programs never contain URLs: the executor derives
them, so a tampered program cannot send a visitor anywhere unexpected.

### 4.2 Context and semantics

The semantic layer resolves meaning that the words alone do not carry:

- **Ellipsis** — "120 dollars to euros" then "…and 80" reuses the previous
  frame's direction with the new amount.
- **Repetition** — "again" / "otra vez" / "encore" / "nochmal" / "再来一次"
  re-executes the previous program.
- **Ambiguity** — "pounds" resolves to currency or mass from the other side of
  the sentence; "in" is a unit only after a spoken amount.
- **Defaults** — one amount and one currency ("30 euros") picks the pack's
  default counter-currency; one unit picks a sensible target ("12 kilograms" →
  kg→lb).

### 4.3 Client-side learning

Because understanding is deterministic, learning is cheap and local: when the
recogniser's first guess was wrong but a later hypothesis was understood, the
phrase→fingerprint pair is stored in `localStorage`. Next time the same
mishearing resolves instantly from memory. No audio, no upload, clearable by
the visitor.

---

## 5. Decision points for the operator

1. **Regional rules** live in `src/lib/voice/policy.ts`. Hong Kong (`HK`)
   is cloud-capable and does not inherit mainland China's (`CN`) local-only
   default. CDN geography must be trusted (not a client-spoofable header), and
   legal rules must be reviewed with counsel. Rules can be overridden
   with the `VOICE_REGION_POLICY` JSON environment variable. Legal review
   required before changing.
2. **Fallback model choice** is `Xenova/whisper-base` (multilingual, Apache-2.0
   export), loaded with the installed Transformers.js runtime inside a dedicated
   Web Worker only when the policy assigns the site-delivered path. Its model and
   tokenizer assets download individually from Hugging Face Hub on first use;
   the voice UI identifies Xenova (publisher), Hugging Face (host), licence and
   current asset progress. Self-hosting the assets removes that third-party
   model-download request.
3. **Language packs are not universal dictionaries.** The browser/OS speech
   recognizer handles unrestricted words in the configured BCP-47 language;
   `Intl.Segmenter`, `Intl.DisplayNames` and `Intl.NumberFormat` add local
   script, currency, measurement and numeral vocabulary at runtime. The site's
   complete public route catalog adds guide and article language. Only the
   explicit domain commands and approved site destinations can be executed.
   Five language packs include translated UI and command grammar; other OS
   languages use native recognition plus ICU vocabulary with English UI fallback.
   Full UI translation and broad open-ended semantic understanding require
   separately maintained translations and models, not merely OS characters.
4. **Attribution** — CC-BY-4.0 models (Parakeet, Canary) require attribution;
   the MIT/Apache-2.0 choices above avoid that obligation.

---

## 6. Desktop diagnosis and browser limitations

The previously reported desktop error was caused by treating the experimental
`SpeechRecognition.available({langs:[systemLocale],processLocally:false})`
result as a cloud-service probe. MDN states it tests availability for a
language, **not** whether a remote recognizer exists. If a language was
reported unavailable, the site wrongly selected the local Whisper model and
then claimed the device lacked local support for that language. The code now
routes desktop browsers with a recognition constructor to the browser's
default service, bypasses the local probe, and only retries with `en-US` when
that service reports `language-not-supported` for the configured OS locale.
This retry never changes the semantic language-pack set.

Safari's Web Speech implementation does not expose the on-device requirement;
web code cannot assert where Safari performs recognition, and this document
makes **no claim** about a specific remote provider for Safari. Mobile Safari
therefore uses the site's explicitly on-device model where supported.

The local fallback is a real installed Transformers.js dependency, not a
`new Function` CDN import. It releases the microphone before decoding, caps
recording at 12 seconds, and distinguishes Stop (decode the utterance) from
Cancel (discard). Its model weights still require an initial download, and
memory/CPU limits mean some devices may not support it.

Official references:
- Android: https://developer.android.com/reference/android/speech/SpeechRecognizer
- Apple native: https://developer.apple.com/documentation/speech/sfspeechrecognizer/supportsondevicerecognition
- Web Speech: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/available_static
- WebGPU model: https://huggingface.co/docs/transformers.js/en/guides/webgpu

# Android and iOS capabilities available to a website

This note distinguishes **native OS APIs** from **web APIs exposed by a browser**.
Installing a website as a PWA or opening it in a WebView does not, by itself,
give page JavaScript a native Android `Context` or an iOS `SFSpeechRecognizer`.
The site must use an API explicitly exposed to the web platform, or be wrapped
in a native application with an audited bridge.

## Android

### Native-only features (not callable by this website)

Android's native `android.speech.SpeechRecognizer` offers:

- `isOnDeviceRecognitionAvailable(Context)` and `createOnDeviceSpeechRecognizer(Context)` (API 31+), in addition to the system recognizer;
- `checkRecognitionSupport(...)`, which reports locales and recognition modes supported by the installed recognition service;
- `triggerModelDownload(...)`, which can report model download status;
- `RecognitionListener` results, alternative hypotheses, confidence scores and (on newer releases) detected locale and segment details.

A native app must declare/request `RECORD_AUDIO`, use the recognizer on the main thread,
configure the listener before starting, and call `destroy()` when finished. Android's
default `createSpeechRecognizer` may stream audio to a remote recognition service;
only the explicit on-device recognizer guarantees local processing. Google's service,
manufacturer services and installed language/model packs vary by device and country.

**A normal web page cannot invoke these Android classes.** Browser JavaScript has no
`Context`, Android package manager, permission manifest, native model-download listener
or `SpeechRecognizer` object. A Capacitor/React Native/native Android wrapper could
expose a bridge, but this Next.js deployment has no such native wrapper and must not
claim to use Android's native service directly.

### Web capabilities commonly available in Android browsers

Feature-detect and use only when present (HTTPS and user activation are required for
some APIs):

- `getUserMedia({audio:true})` for microphone permission and audio capture;
- Web Speech `SpeechRecognition` / `webkitSpeechRecognition` where shipped; it is an
  interface, not a promise of a particular local model;
- `SpeechRecognition.processLocally`, `available()` and `install()` where the browser
  implements the on-device Web Speech extension;
- WebAssembly and WebGPU for an in-page model, with browser-cache storage for model
  assets;
- `navigator.share`, the File System Access API where supported, `navigator.vibrate`,
  screen wake lock, service workers and Cache Storage where exposed.

Presence of Chrome on Android does not imply on-device speech is available: check the
language-pack status for the requested BCP-47 language. A site-delivered model (this
site uses Xenova Whisper Base through Transformers.js) is a separate fallback; it uses
the browser's WASM/WebGPU runtime, not Android's OS recognizer.

## iOS and iPadOS

### Native-only features (not callable by this website)

Apple's native Speech framework exposes `SFSpeechRecognizer`, supported locales,
`supportsOnDeviceRecognition`, authorisation requests and
`SFSpeechRecognitionRequest.requiresOnDeviceRecognition`. A native app must include
the speech-recognition and microphone usage descriptions, request user permission,
check on-device recognition for the selected locale, handle OS policy/availability
errors, and release audio/task resources. The on-device guarantee belongs to the
native request with `requiresOnDeviceRecognition = true`; a default native request
may use network services.

**Safari JavaScript cannot instantiate `SFSpeechRecognizer`, read its supported
locale list, inspect its on-device support, or set `requiresOnDeviceRecognition`**
unless an installed native wrapper explicitly adds such a bridge. This website has
no such bridge. Its Safari path is the web SpeechRecognition API as provided by that
browser; this site does not identify or claim a particular vendor cloud backend for
Safari, and cannot force the underlying browser service to run locally.

### Web capabilities commonly available on iOS

Safari/PWAs can expose secure-context microphone capture, browser web speech (with
version/device-dependent behaviour), WebAssembly, Cache Storage/service workers,
Web Share, touch/pointer and accessibility media preferences. Support differs by OS
release, browser shell, user permission and installed recognizer/language pack. A
website must test actual feature availability instead of inferring it from an
`iPhone`/`iPad` user-agent string.

When Safari does not expose a verifiably on-device recognizer, this site uses its
in-page Whisper model on a capable device. If no supported local path is available
where policy requires local-only processing, voice input is unavailable. Other
calculators and reference tools remain available.

## Universal site-side capabilities

These APIs/features work across more browser/OS combinations and are already used
where relevant:

| Capability | Browser API / site integration | Guardrail |
|---|---|---|
| Microphone consent | `MediaDevices.getUserMedia` | Requested only after the visitor activates voice; stream tracks stop after use. |
| Device adaptation | `navigator.userAgentData` where present, safe OS/device detection, `matchMedia` | Used locally to select capabilities; a UA label is not treated as proof of support. |
| Low-motion accessibility | `prefers-reduced-motion` | Scroll/illustration effects are disabled for that preference. |
| Network resilience | `navigator.onLine`, browser model cache | Online status is advisory; a failed request is caught. Model assets may be cached by the browser. |
| Screen wake | `navigator.wakeLock` | Explicit user action only; released on lifecycle changes. |
| Share | `navigator.share` with copy fallback | Feature-detected; user stays in control of the share sheet. |
| Haptics | `navigator.vibrate` | Optional feedback, ignored if absent or refused. |
| Installable shell | Web App Manifest / service worker capabilities | Does not imply access to native APIs. |

## Practical integration rule

1. Check the web API and security context, not only the operating-system name.
2. Check local recognition support for the **actual language**; an API constructor
   alone is insufficient.
3. Choose a browser-managed engine only where the regional/device policy permits it.
4. For in-page model inference, show the model publisher, host, licence and per-file
   download progress before decoding; run inference in a worker so the UI remains
   responsive.
5. Never imply a website is using an OS-exclusive recognizer unless a native app
   bridge actually supplies it. Never silently move audio from a local path to a
   remote service.

## Official references

- Android `SpeechRecognizer`: https://developer.android.com/reference/android/speech/SpeechRecognizer
- Apple `SFSpeechRecognizer` on-device capability:
  https://developer.apple.com/documentation/speech/sfspeechrecognizer/supportsondevicerecognition
- Apple request local-only recognition:
  https://developer.apple.com/documentation/speech/sfspeechrecognitionrequest/requiresondevicerecognition
- Web Speech and on-device processing:
  https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- Transformers.js WebGPU and ASR pipelines:
  https://huggingface.co/docs/transformers.js/en/guides/webgpu
  https://huggingface.co/docs/transformers.js/main/en/api/pipelines

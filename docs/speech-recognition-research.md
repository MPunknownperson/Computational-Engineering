# Speech input lifecycle and mobile startup repair

## Source import

The requested main-branch archive was downloaded from:
https://github.com/MPunknownperson/Computational-Engineering/archive/refs/heads/main.zip

Archive commit: `e15325a96398c693184c64faf0a76e6e66d8b07d`.
The app, public assets, docs, and tests were imported. The platform environment,
health route, and database pool were retained. The imported schema is registered
with Drizzle; apply it with `npx drizzle-kit push` after runtime bootstrap.

## Root causes addressed

1. Awaiting getUserMedia before native recognition.start loses the original
   user gesture in mobile browsers and opens a second, competing audio capture.
2. Setting `listening` immediately after start() falsely reports success before
   the browser emits any startup/capture event.
3. Restarting a local recognizer in an error callback loses activation again,
   can violate a local-only region policy, and can create misleading loops.
4. Unbounded pending permission/start/result calls can leave a stale busy UI.
5. Cancelled operations and onend events can overwrite a later success or retry.

## Current contract

- Capability/policy checks run without opening a microphone. Known permission
  denial, insecure origins, Permissions Policy blocks, and confirmed absence of
  input devices disable input with an explanation and a recheck action.
- An empty device list **before** microphone permission is not proof that a
  microphone is missing. Unsupported Permissions queries are not fatal.
- Native start() runs synchronously in a real tap/click. No getUserMedia call,
  await, timeout, or automatic restart precedes it.
- `requesting` -> `starting` on onstart -> `listening` on onaudiostart or
  onspeechstart. Interim results can also prove capture is active. Final results
  alone may route to a calculator. Speech/audio end becomes `processing`.
- The browser owns native microphone permission and capture. MediaRecorder is
  used only for a separately probed browser-provided audio model.
- A service start without audio times out after 8 seconds; initial startup and
  permission wait are bounded at 30 seconds. Utterances are capped at 20 seconds,
  then allowed 8 seconds to produce a final result. There is no auto-restart.
- Errors remain specific: denial, audio-capture failure, no speech, network,
  unavailable language/service, interrupted input, and startup timeout.
- Silence, network failures, and transient capture errors remain retryable. A
  verified permission/service block is rechecked after settings/device changes.
- Stop listening finalizes an utterance. Cancel, hiding/leaving the page, and
  unmount abort the session, clear timers, and ignore stale callbacks.
- An OS/browser locale is supplied explicitly; native engines are not assumed
  to auto-detect arbitrary languages from the English page language.
- On-device recognition is preferred only when its language pack is confirmed
  available. A strict local-only policy never falls back to a cloud service.
  If policy permits a switch after a local service error, it is disclosed and
  requires another explicit tap. Nothing restarts from an error callback.
- Local language pack installation requires a new tap after preparation. The
  local audio-model path waits for MediaRecorder's actual `start` event, has a
  deadline, and releases streams granted after cancellation.
- Speech synthesis is independent of recognition. Missing read-aloud support
  does not disable a working microphone-to-text engine. This app does not expose
  a nonfunctional synthesis control. Missing both native recognition and a
  verified audio-capable browser model disables voice; typing always works.

## Browser testing

`tests/voice-lifecycle.spec.ts` exercises event order, exact tap activation,
interim/final results, denied permission, no hardware, timeouts, retry, stop,
cancellation, stale events, background interruption, and local-only policy.
Phone/tablet profiles emulate Android, iPhone, and iPad. Mock recognition is
necessary: a headless browser has no real browser-provider speech service.

A physical-device release check is still required for microphone audio and
vendor services: iPhone/iPad Safari and Android Chrome over HTTPS, fresh permission
prompt, allow/deny, OS microphone disabled, network unavailable, app backgrounding,
stop, and a second independent tap. Check iOS Siri & Dictation settings when
Safari reports service-not-allowed. Embedded previews also require the parent
iframe to delegate microphone access; the child app cannot grant it to itself.

## References

- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/start
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/start_event
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/audiostart_event
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/error_event
- https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices

# Browser speech recognition

Voice input uses only the Web Speech API: `SpeechRecognition` or `webkitSpeechRecognition`. The application does not transcribe audio itself. The browser service owns microphone capture and returns text to the calculator command interpreter.

## Mobile support

- **Android phones and tablets:** Chrome, with Google Mobile Services (GMS) and the device’s Google speech recognition service enabled. Chrome must expose the recognition API, and microphone permission, connectivity, supported language and regional availability still matter. GMS availability cannot be reliably probed by a web page; service errors are handled rather than claiming guaranteed support.
- **iPhone and iPad:** this site supports voice input only in Safari, using Apple’s system Siri speech-to-text technology. Siri & Dictation and microphone permissions must be enabled where required. Chrome, Firefox, Edge and embedded browsers on Apple mobile devices are not supported by this application, even if a constructor is exposed.
- **Desktop:** feature detection is required. An exposed API is not a guarantee that the vendor speech service can complete a session.

## Privacy and geography

A browser-managed service may process audio on Google’s, Apple’s or another browser provider’s servers. Native system technology is not an offline guarantee. If the Web Speech API explicitly supports `processLocally` and a suitable language pack is usable, a local-only session may be selected. Pack installation requires a user gesture. Failure never silently changes the audio processor or restarts capture.

Country comes only from the configured trusted edge or short-lived signed gateway assertions. Locale, timezone, client country headers, cookies and URL parameters do not establish location. Unknown location disables voice. A regional local-only policy disables voice when browser-managed local recognition cannot be honored. Typing remains available.

## Lifecycle

`createNativeSession` starts synchronously within the original tap. It never opens a competing `getUserMedia` stream. Permission, service startup, utterance and result deadlines bound each session. Stop, Cancel, navigation, page backgrounding and unmount release the recognizer and invalidate stale results. Runtime service errors are visible and retries require a new tap.

Recognition language follows the site language pack and preferred compatible browser locale, not a country assertion. Supported command vocabularies include English, Spanish, French, German and Chinese. Language is never used for geographic authorization.

Reference: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition

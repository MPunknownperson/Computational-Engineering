# Voice recognition implementation

## Language routing

The generative audio path is conservatively limited to **English**. Text-model language support is not evidence of speech-recognition support. Both capability checks and engine construction reject other locales before calling the model API.

Spanish, French, German and Chinese commands continue through the deterministic five-language grammar. Their transcripts must come from a browser speech engine that supports the selected locale. The site never retries a failed foreign-language request as English. Local-only and disabled regional policies are enforced before selecting a recognition path; a cloud route is used only where policy permits and is disclosed on the voice card.

## Browser-managed model

`LanguageModel.availability()` receives the same expected audio/text modalities and English output language used by `LanguageModel.create()`. Presence of the global alone is insufficient.

The site does not host or fetch model weights. **The browser may download its own model on first use.** Preparation begins after the visitor presses Speak, has visible progress and is cancellable. The microphone opens only after preparation succeeds. Recordings and model sessions are released after each utterance or cancellation.

An optional English command repair uses an already-available text model only. It never triggers a download after a failed command, times out after three seconds and sends its proposal back through the same deterministic verifier. Cancelling or leaving the page invalidates pending proposals.

Unsupported devices can use the ordinary calculator and converter controls. We do not promise generative recognition on every browser, language or device.

## Tests

`tests/performance-regressions.spec.ts` covers English gating, Spanish/French/German browser routing and cancellation without microphone capture. Existing voice suites cover grammar, conversational context, region policy and permissions.

## References

- https://developer.chrome.com/docs/ai/prompt-api
- https://developer.chrome.com/docs/ai/get-started
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/processLocally

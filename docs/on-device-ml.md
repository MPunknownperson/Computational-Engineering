# On-device machine learning (TensorFlow.js)

TensorFlow.js (`@tensorflow/tfjs`) is woven into existing tools. It adds no
page, section or assistant. Everything runs in the visitor's browser: models are
tiny, trained on-device, cached in IndexedDB, and loaded lazily (code-split)
only when a feature is used. No audio, text, model weights or training data go
to a server, and nothing is downloaded from a third party.

Code: `src/lib/ml/*`, UI helpers: `src/components/tech/MlAssist.tsx`.

| Capability | Where it appears | Model |
| --- | --- | --- |
| Speech recognition / voice command understanding | Voice card (`SpeakCalc`). When the deterministic grammar and on-device repair cannot read a command, an intent model proposes the closest tool ("best guess", the visitor decides). Learns from phrases the visitor actually used, including mis-hearings. | `ml/intent.ts` – hashed word/bigram/char-trigram features → dense → softmax |
| Audio classification | On-device speech-model recording (`local-model.ts`). Classifies live spectrum frames as silence / speech / noise / tone: recording ends shortly after the speaker pauses, and a noisy room is flagged. No audio is kept. | `ml/audio.ts` – trained in-browser on spectra synthesised from acoustic rules |
| Text generation & completion | Expression inputs in the calculator, formula tool and scientific calculator: next-token chips and a generated completion; variables are filled in from the tool's own values. Contact message: next-word chips. | `ml/sequence.ts` (one-hot context → dense → softmax) used by `ml/completion.ts`, `ml/contact.ts` |
| NLP / text classification | Contact form suggests a topic from the message (never stored, never trained on). | `ml/classifier.ts` via `ml/contact.ts` |
| Traditional ML + personalised tools | Unit and currency converters open on the visitor's usual conversion (when no URL parameters are given) and offer "Your usual" picks. Features: hour of day, weekday/weekend, previous tool. | `ml/preferences.ts` – softmax regression trained on demand |

## Why no pretrained speech-commands model

Published TF.js keyword models are downloaded from a third-party host and would
contradict the site's "this site hosts no model weights / recordings stay on this
device" statements. Audio features are therefore classified by a model trained
locally, and native `SpeechRecognition` sessions are not given a second
microphone capture (a known mobile start-up failure documented in
`speech-recognition-research.md`).

## Privacy and control

Local state lives under `radixloom.ml.*` (localStorage) and IndexedDB
`radixloom-*` model keys. It holds expressions calculated, converter choices
with hour/weekday context, and voice phrases that led to a tool. It can be erased
with "Forget what the models learned" (Privacy page → Manage saved formulas),
"Forget learned phrases" on the voice card, or by clearing site data.
The privacy policy sections "Voice input and microphone audio" and
"On-device personalisation and predictive input" describe this.

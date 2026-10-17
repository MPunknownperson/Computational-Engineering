# Location-based consent and mobile release

## Consent

The hosting edge or trusted signed gateway supplies country and subdivision. Consent selection and restricted regional pages use the same server-side resolver. The notice cannot be changed by a country selector, browser timezone, preferred language, local storage or URL parameter. The former region preference key is discarded on mount.

Verified regions retain their jurisdiction-specific categories and notice. Unknown geography receives protective opt-in defaults; it is not treated as evidence that the visitor is in any particular jurisdiction. Optional purposes remain off until a saved choice. Consent categories remain editable; geographic identity does not.

Global Privacy Control remains restrictive. Cookie settings are available worldwide. Regional supplements and California-specific browser preference controls remain server-gated to their verified country/subdivision. The general privacy policy and ability to submit a restrictive opt-out remain public.

## Voice

Voice input uses browser-managed Web Speech API recognition only. Android phones/tablets use Chrome with GMS and Google speech recognition. iPhone/iPad use Safari with Apple’s system Siri speech-to-text. Actual API, permission, language, network and regional availability are checked; system services may process audio remotely. See `speech-recognition-research.md` for the lifecycle and privacy model.

## Verification

Run `npx next typegen`, `npm exec tsc -- --noEmit --pretty false`, and `npm run build`. Browser tests use a controlled recognition mock because headless browsers do not provide vendor services. Country-specific integration tests sign short-lived gateway assertions with the server-only local test secret. There is no test authorization endpoint.

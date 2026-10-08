import { LegalPage, type LegalSection } from "@/components/LegalPage";
import { DataControls } from "@/components/DataControls";
import { SITE } from "@/lib/site";

const N = SITE.name;

const SECTIONS: LegalSection[] = [
  {
    id: "summary",
    title: "Summary",
    bullets: [
      `${N} does not require an account and is not designed for advertising or cross-site profiling.`,
      "When you save a formula, a random workspace reference connects that saved item with the browser workspace you use. You can download or delete saved formulas with the controls below.",
      "When you use the contact form, the topic, message and any optional name or reply address you choose to provide are retained so the message can be handled.",
      "Basic connection and security information may be processed to deliver and protect the site. External reference sources may receive the selections needed to provide requested figures; saved formulas and contact messages are not intentionally included in those requests.",
      `${N} does not sell personal information or use it for targeted advertising.`,
    ],
  },
  {
    id: "responsibility",
    title: "About this notice",
    paragraphs: [
      `This notice describes information practices associated with ${N}. Privacy questions and requests can be submitted through the contact form on the site. Nothing in this notice limits rights or protections that apply under the law in your location.`,
    ],
  },
  {
    id: "categories",
    title: "Information categories, purposes and legal grounds",
    paragraphs: [
      "The categories below describe information processed through the site's current features, including during the preceding 12 months. The applicable legal ground depends on the request and the law that applies. Where required, processing is limited to a lawful ground such as fulfilling a feature you request, responding to a message, protecting the service, consent for optional processing, or compliance with a legal duty.",
    ],
    table: {
      head: ["Category", "Examples", "Purpose", "Ground where required"],
      rows: [
        ["Workspace reference and saved content", "A random reference; formula name, expression, optional description or tags", "Save, display, export or remove expressions you choose to keep.", "Provide the requested feature."],
        ["Contact information and message", "Optional name, optional reply address, selected topic and message text", "Receive, review and respond to a message.", "Respond to your request; other grounds may apply where permitted."],
        ["Connection and security information", "Network address and basic request details associated with a visit or form submission", "Provide requested content, protect the site and discourage misuse.", "Legitimate interests or legal duties where applicable."],
        ["Selected reference request", "The currency, asset, country or indicator selected in a tool", "Provide the information requested through that tool.", "Provide the requested feature; no contact details are intentionally included."],
        ["Voice input and on-device phrase memory (optional)", "Microphone audio while voice is active; the recogniser's text hypotheses; and, for understood commands, normalised phrases with their internal tool destination kept in this browser", "Understand a spoken calculation, open the matching tool with its values filled in, and improve recognition of repeated phrases on the same device.", "Consent, given by starting voice input and granting the browser's microphone permission. Phrase memory can be cleared from the voice card or browser storage."],
        ["Approximate country or region", "A two-letter country code supplied by the hosting network for the current request, or the region part of your browser language", "Decide whether voice input is offered where you are, and whether it must stay on the device.", "Legal obligations and legitimate interests; the code is evaluated per request and is not stored."],
      ],
    },
    note: "Please do not include passwords, payment-account information, health information or other sensitive personal information in formulas, spoken commands or messages unless it is necessary and lawful to do so. Where voice is recognised by a browser provider's cloud service, that provider — not this site — receives the microphone audio, as explained in the Voice input section below.",
  },
  {
    id: "sources",
    title: "How information is obtained",
    bullets: [
      "Directly from you when you enter a formula, save content, or submit a contact message.",
      "From the browser or device used to access the site, through ordinary connection and security information.",
      "From external sources when a tool requests selected reference information."
    ],
  },
  {
    id: "voice",
    title: "Voice input",
    paragraphs: [
      `${N} offers optional voice input on the calculators page. It starts only when you press the voice button, and the browser asks for microphone permission before any audio is captured. You can refuse that permission; every tool keeps working without voice.`,
      "Speech is turned into text by a speech recogniser, and the text is matched against the site's language packs — vocabularies of numbers, currencies, units and calculation topics in each supported language. If the sentence names a conversion, such as \u201cconvert 120 US dollars to euros\u201d, the matching tool opens with the amount and direction already filled in. If nothing matches, nothing happens. Unmatched speech is never executed or turned into an outside address.",
      "Where speech is recognised is chosen automatically. Phones and tablets use an explicitly local browser path where exposed; otherwise a compatible on-page model is used if the device can run it, and voice is unavailable if neither works. Desktop browsers with a recognition service use the browser-managed path; a browser without that service can use the on-page model. The browser may download a local language model on first use. Native Android and iOS speech APIs are available to native apps, not directly to this website.",
      "In browser-managed recognition, the browser may transmit microphone audio to its speech service while voice input is active. Chrome may use Google's service and Edge may use a Microsoft service. The site cannot verify or control where every browser processes audio; do not assume browser-managed recognition stays on-device unless the browser supports and accepts an explicit local-processing requirement. Any external service handles audio under its own terms. This site does not receive or store the audio. The site's explicitly local paths keep audio on your device.",
      "Availability also depends on your country or region. Voice input is not offered where providing it is restricted, and in some places it is limited to on-device recognition (for example where cross-border transfer of audio is restricted or browser cloud speech is unavailable). To apply these rules, the site uses a two-letter country code supplied by its hosting network for the current request, or the region in your browser language when no code is available. The code is not stored.",
      "To get better with use, the voice feature remembers, in this browser only, phrases it understood and the tool each one opened, including common mis-hearings by the recogniser (for example, when the recogniser's first guess was wrong but a later guess was understood). No audio is kept, nothing is uploaded, and you can clear this memory at any time with \u201cForget learned phrases\u201d on the voice card or by clearing site data in your browser.",
      "When the browser has no usable speech engine, the site can run multilingual Whisper Base on the device in a web worker. This Apache-2.0 model is published by Xenova; Transformers.js fetches its quantized model, configuration and tokenizer assets as separate file requests from Hugging Face Hub and the browser caches them. The on-screen status identifies the publisher, host and file-by-file progress. These requests transfer model software, not microphone audio. Audio is transferred to the same-origin worker, transcribed locally and released; it is never sent to Hugging Face or this site's server. If the device cannot run the model or its files cannot be loaded, voice input is unavailable.",
      "The page also reads device and browser characteristics locally — device type, operating system, browser, speech and microphone support — only to choose the processing path described above. They are not sent to the server by this site.",
    ],
  },
  {
    id: "browser",
    title: "Information kept with your browser",
    paragraphs: [
      "A random workspace reference may be kept with the browser you use after you open the formula tool. It allows saved formulas to be associated with that workspace and shown again. It is not an account or password. You may disconnect the browser using the controls below; disconnecting does not itself remove saved formulas associated with it.",
      "The site is not designed to track visitors across unrelated sites, create advertising profiles or tailor advertising. A limited browser-held reference supports the saved-formula feature you choose to use.",
    ],
  },
  {
    id: "recipients",
    title: "Categories of recipients",
    paragraphs: [
      "Information may be made available to service categories that support site availability, content, storage, security, communications or requested reference information. Information may also be disclosed where required by law or reasonably necessary to protect rights and safety.",
      "Reference-information sources may receive the selected currency, asset, economy or measure needed to provide the requested figures. Saved formulas, contact messages, names and reply addresses are not intentionally included in those requests.",
    ],
  },
  {
    id: "sale",
    title: "Sale, sharing and targeted advertising",
    paragraphs: [
      "Radix Loom does not sell personal information and does not disclose it for cross-context behavioural advertising. If that practice changes, the notice and any legally required choice will be updated before the change takes effect.",
    ],
  },
  {
    id: "retention",
    title: "How long information is kept",
    bullets: [
      "Saved formulas remain until you delete them or request their removal. They do not currently expire automatically. The formula records may include the time they were saved.",
      "Contact messages are retained for as long as reasonably needed to handle the enquiry and any appropriate follow-up, subject to legal obligations. A fixed expiry period is not currently specified; you may request deletion, subject to lawful exceptions.",
      "Connection and security information is retained only as reasonably needed to provide and protect the site or as required by law. Retention may depend on services used to make the site available.",
      "The browser-held workspace reference remains until you clear or disconnect it.",
    ],
  },
  {
    id: "rights",
    title: "Choices and privacy rights",
    paragraphs: [
      "Depending on where you live and which law applies, you may have rights to know about, access, correct, delete or receive a copy of personal information; to object to or restrict some uses; to withdraw consent where processing relies on consent; and to opt out of sale, sharing or targeted advertising. Some laws also provide an appeal process or protection against discrimination for exercising privacy rights.",
      "Use the self-service controls below for saved formulas. For other requests, use the contact form and select the privacy topic. Information may be requested to locate relevant material and reasonably verify a request. Responses are provided within applicable legal time limits. You may contact a competent privacy authority where the law allows.",
    ],
  },
  {
    id: "security",
    title: "Security",
    paragraphs: [
      "Radix Loom uses reasonable measures intended to protect information from unauthorised access, loss or misuse. No online service can guarantee absolute security. A workspace reference is a convenience, not a password; anyone who obtains it may be able to access associated saved formulas.",
    ],
  },
  {
    id: "transfers",
    title: "Information handled across locations",
    paragraphs: [
      "Information may be handled in locations different from yours by services used to make Radix Loom and its reference content available. Where applicable law requires safeguards for a transfer, appropriate safeguards are intended to be used. Details may be requested through the contact form.",
    ],
  },
  {
    id: "children",
    title: "Children",
    paragraphs: [
      `${N} is a general-audience tool and is not directed to children under 13. The site does not ask for age. If you believe a child has submitted personal information through a formula or message, use the contact form so it can be reviewed.`,
    ],
  },
  {
    id: "automated",
    title: "Automated decisions",
    paragraphs: [
      "The site does not use personal information to make solely automated decisions that produce legal or similarly significant effects about a person.",
    ],
  },
  {
    id: "changes",
    title: "Changes to this notice",
    paragraphs: [
      "This notice may be revised when the site's information practices change. The version and date above identify the current text. Material changes will be indicated on the site where appropriate.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      path="/privacy"
      eyebrow="Legal · Privacy Notice"
      title="Privacy notice and saved-formula controls"
      intro={`${N} is designed to request little information. This notice describes the general categories associated with the site's tools, how they are used and the choices available to visitors.`}
      sections={SECTIONS}
      extra={<DataControls />}
    />
  );
}

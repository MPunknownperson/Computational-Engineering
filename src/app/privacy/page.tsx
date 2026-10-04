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
        ["Voice input (optional)", "Microphone audio while the feature is active, plus the resulting transcript used on this page only", "Provide the voice-calculation feature on the calculators page; the transcript is matched to a tool and not stored by this site.", "Consent, which you give by activating the feature; you can decline the browser permission at any time."],
      ],
    },
    note: "Please do not include passwords, payment-account information, health information or other sensitive personal information in formulas or messages unless it is necessary and lawful to do so. The site does not store, transmit or otherwise process your voice itself; the processing of your microphone audio is carried out by the browser vendor's recognition service, as explained below.",
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
      `${N} includes an optional voice-input feature that uses the browser's built-in speech-recognition service. It is offered on the calculators page and must be started by you; it is not activated automatically.`,
      "When you turn the feature on, your browser listens to your microphone through its own recognition service and converts your speech into text. The text is matched against a short list of calculation intents on this page only. If it matches, the relevant tool opens. If it does not match, nothing happens. The resulting text is never sent to a server by this site.",
      "Your microphone audio and any resulting transcript are handled by the browser vendor as part of its own recognition service. In Chrome and Edge the audio is typically processed by the browser vendor's cloud service, not on your device. Safari uses a separate recognition service. Where the browser supports a local, on-device mode, this site requests it, but whether the audio is processed locally or remotely depends on your browser and device. Processing of that audio is covered by the browser vendor's own privacy notice, not by this notice.",
      "You are told about this before you activate the feature and you can always decline the browser's microphone permission. If you decline, the feature does not work but the buttons on the page continue to work as before.",
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

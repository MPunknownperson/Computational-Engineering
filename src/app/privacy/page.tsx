import { LegalPage, type LegalSection } from "@/components/LegalPage";
import { DataControls } from "@/components/DataControls";
import { GdprPolicy } from "@/components/legal/GdprPolicy";
import { CcpaPolicy } from "@/components/legal/CcpaPolicy";
import { InternationalPrivacy } from "@/components/legal/InternationalPrivacy";
import { PrivacyChoicesLink } from "@/components/legal/PrivacyChoicesLink";
import { CookieSettingsButton } from "@/components/consent/CookieSettingsButton";
import { metadataFor } from "@/lib/seo";
import { SearchContext } from "@/components/search/SearchContext";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const generateMetadata = () => metadataFor("/privacy");

const N = SITE.name;

/**
 * Privacy Policy for Radix Loom.
 *
 * Structured after the disclosures a privacy policy is normally expected to
 * contain — the controller and how to contact it, the categories of personal
 * information collected, the purposes and legal bases for each, recipients,
 * retention, transfers, individual rights (GDPR and CCPA-style), children,
 * security, automated decision-making and how the policy changes — mapped onto
 * what this site actually does: no accounts, optional advertising and analytics,
 * cookies used for those purposes, saved formulas tied to a random browser
 * reference, an opt-in contact form, opt-in microphone capture and three
 * server-side reference-data providers.
 */
const SECTIONS: LegalSection[] = [
  {
    id: "summary",
    title: "At a glance",
    bullets: [
      `${N} may display advertisements, sponsored placements, affiliate offers or other revenue-generating content.`,
      `${N} may use cookies and similar technologies, including for analytics, measurement and advertising.`,
      "Saved formulas are stored on our server under a random browser workspace reference. Blackboard notes and voice phrase memory stay on your device.",
      "The contact form is optional; you choose whether to give a name or a reply address.",
      "Microphone access only happens if you press the voice button and approve your browser's permission prompt.",
      "You can ask us not to sell or share personal information, including for advertising, and we honor Global Privacy Control when we receive it.",
    ],
    note: "This policy should be read with the Terms of Service and the Disclaimer. Where local law gives you rights in addition to those described here, those rights apply as well.",
  },
  {
    id: "controller",
    title: "Who is responsible for your information",
    paragraphs: [
      `${N} operates this website (the "controller" or "we"). There is no registered office or data protection officer published at the time of writing.`,
      "For any privacy question, access request or deletion request, use the contact form and choose the privacy topic. Please do not include sensitive identifiers in your message.",
    ],
  },
  {
    id: "collection",
    title: "Information we collect",
    paragraphs: [
      "The table describes the data used by the currently implemented features. Server-stored data is distinguished from information that stays in your browser.",
    ],
    table: {
      head: ["Category", "Examples", "Where it comes from"],
      rows: [
        ["Saved formulas", "Formula name, expression, optional description and tags", "Entered by you and saved in a browser workspace"],
        ["Workspace reference", "A random string generated in your browser", "Created when you first save a formula"],
        ["Contact message", "Chosen topic; optional name; optional reply address; message text", "Submitted by you through the contact form"],
        ["Voice content", "Microphone audio while voice input is active; the text your browser recognises", "Captured by your browser after you allow the microphone"],
        ["Device phrase memory", "Phrases the voice feature understood and the tool each opened", "Stored locally in your browser"],
        ["Board content", "Chalk strokes and typed notes on the Calculator blackboard", "Stored locally in your browser"],
        ["Connection details", "IP address, browser, device, time of request (server logs)", "Generated automatically when the site is visited"],
        ["Advertising and analytics", "Cookie or similar identifiers, pages viewed, approximate location derived from the request, device and browser type, ad interaction", "Collected automatically when advertising, measurement or analytics technologies run"],
        ["Voice region signal", "A country code from a configured trusted hosting gateway, used only to decide whether optional voice input is available", "Evaluated per request for the voice feature. It is not stored, it is not used to hide this policy, and it is not precise GPS location."],
        ["Privacy preference", "Opt-out flag, random receipt identifier, source and timestamps", "Remember an explicit opt-out or Global Privacy Control; no name, email, IP or country is stored with the receipt."],
        ["Reference selections", "The currency, asset, economy or measure you select in a tool", "Entered by you in the tool"],
      ],
    },
    note: "Please avoid putting passwords, payment details, health information or other sensitive personal data into formulas, board notes or messages.",
  },
  {
    id: "purposes",
    title: "How and why we use information",
    paragraphs: [
      "The table links each purpose to the data it uses. Applicable legal bases and rights are explained in the GDPR and CCPA sections of this policy.",
    ],
    table: {
      head: ["Purpose", "What is used"],
      rows: [
        ["Provide the tool you asked for", "Your expression, values or reference selection"],
        ["Save, show, export or remove formulas", "Saved formula fields and the workspace reference"],
        ["Answer your message", "Contact fields"],
        ["Operate and protect the site", "Server log data; transient rate-limiting keys"],
        ["Optional voice input", "Microphone audio and recognition text"],
        ["Voice availability by region", "Country signal for the current request"],
        ["Show and measure advertisements and other revenue-generating content", "Advertising and analytics identifiers, pages viewed, approximate location, device type"],
        ["Understand how the site is used", "Analytics events, cookies and similar technologies"],
      ],
    },
    note: "Where the law requires a stated legal basis for each purpose, the bases are listed in the GDPR section below, with the CCPA purposes in its own section.",
  },
  {
    id: "voice",
    title: "Voice input and microphone audio",
    paragraphs: [
      `Voice input on the ${N} calculators page is entirely optional. It begins only when you press the voice button, and your browser asks for microphone permission before any audio is captured. Every tool works without voice.`,
      "The voice card explains which recogniser will be used. A native browser speech service can involve the browser vendor (for example Apple, Google or Microsoft) processing your audio under that vendor's terms. An installed native language pack can keep processing local. Where native speech is missing, unavailable, or prohibited by a local-only policy, a portable multilingual Whisper model can run in this browser using WebAssembly. Its pinned model and runtime files are hosted on this website, not a third-party model CDN. The first tap prepares the model; a second tap starts the microphone. Preparation may transfer about 45 MB of model data plus the runtime and use device memory and battery. Microphone audio never leaves your device on either explicitly on-device path. An experimental English browser-provided audio model may also be available on some devices.",
      "On this site's side we never receive or store microphone audio. Audio is released as soon as the utterance is transcribed, and only the recognised text is used.",
      "Voice input is withheld where offering it is restricted, and limited to on-device processing where cross-border transfer of audio is restricted. This uses a country signal supplied by the hosting network, or the region of your browser language when no signal exists; that signal is evaluated per request and is not stored.",
      "If a voice command is understood, this browser remembers the phrase and the tool it opened — including a later hypothesis that corrected a mis-recognition — so a follow-up such as “and 80” works. No audio is kept. Clear it any time with “Forget learned phrases” on the voice card, or by clearing site data in your browser.",
      "Device and browser characteristics (device type, operating system, browser, whether speech and microphone APIs exist) are read locally to choose that path. This site does not send them to its server.",
      "Machine learning runs in your browser (TensorFlow.js). When the on-device speech model is recording, a small classifier looks at live spectrum measurements to detect when you have stopped talking or the room is noisy; it keeps no audio and no recording of those measurements. If a command is not understood, another small model may suggest the closest tool from the words recognised — you decide whether to open it.",
    ],
  },
  {
    id: "personalisation",
    title: "On-device personalisation and predictive input",
    paragraphs: [
      "Calculators, converters and the contact form use small machine-learning models that run entirely in your browser. They suggest the next part of an expression, open the unit and currency converters on the choices you make most often at that time of day, suggest the next word in the contact message, and suggest a contact topic.",
      "To adapt, this browser stores a short local history: expressions you calculated, which unit or currency pair you converted, the hour of day and weekday/weekend, the tool you used just before, and voice phrases that led to a tool. Trained model weights are cached in this browser's IndexedDB. Contact messages are never stored or used for learning.",
      "None of this is sent to our servers or shared, and it is not tied to an account. You can erase it at any time with “Forget what the models learned” in Manage saved formulas below, with “Forget learned phrases” on the voice card, or by clearing site data in your browser. Every tool works the same without it.",
    ],
  },
  {
    id: "no-ads",
    title: "Advertising, analytics and cookies",
    paragraphs: [
      `${N} may display advertisements, sponsored placements, affiliate modules, paid placements or other revenue-generating content. Those features help keep the calculators available.`,
      `${N} may use data analytics and measurement technologies to understand how the site is used, to improve it, and to deliver or measure advertising. Partners that provide advertising, measurement or analytics may receive information such as pages viewed, cookie or similar identifiers, approximate location derived from the request, and device or browser type.`,
      "Cookies and similar technologies may be used for these purposes. Some are set by us; others may be set by advertising, measurement or analytics partners. You can also use your browser controls to block or delete cookies. Blocking cookies may affect how some features work.",
    ],
    note: "A strictly necessary privacy-choice cookie may remember an opt-out and a random receipt reference for up to one year. It stores no name, email, IP address or browsing history. Advertising and analytics cookies, where used, are separate from that privacy-choice cookie.",
  },
  {
    id: "storage",
    title: "Cookies, local storage and similar technologies",
    paragraphs: [
      `${N} may set or allow cookies and similar technologies for advertising, analytics, measurement and essential site operation. An essential privacy-choice cookie may remember a restrictive opt-out and a random receipt reference for up to one year. It stores no name, email, IP address or browsing history.`,
      "Browser storage holds the random saved-formula workspace reference, remembered voice phrases and blackboard strokes/notes. The last voice command uses session storage. Saved formulas themselves are stored in the server database. Clearing browser storage does not delete server-side formulas; use the controls below before disconnecting your workspace.",
      "Your browser's speech service may set its own storage or use its own account state. Advertising, measurement or analytics partners may also set their own cookies under their own terms.",
    ],
  },
  {
    id: "cookie-settings",
    title: "Cookie settings, regional defaults and tool availability",
    paragraphs: [
      "Cookie settings are available to users in every region from the footer and the standard notice. All notices explain strictly necessary, functional, analytics and advertising purposes; California and Japan include the locally relevant sale/sharing or third-party-provision control. For other regions, all four categories are initially selected in the settings panel, but optional storage is not enabled until you save a choice. A previously saved rejection is preserved. GDPR/CCPA, Brazil, Canada, Australia, Singapore, Japan and India retain their jurisdiction-specific notices and protective defaults. We use hosting-edge country/state hints when available, then device timezone and preferred-language hints. These can be inaccurate, so the Privacy region selector lets you correct the notice or return to automatic detection. This preference changes only the consent experience and never grants access to a protected resource.",
      "For users receiving a GDPR/CCPA, Brazil, Canada, Australia, Singapore, Japan or India notice, a selection is required before optional cookies or similar storage are used to support services and tools. Accepting, rejecting optional purposes, or saving a custom selection all count as a choice. Closing the preferences panel without saving does not count: the notice returns and stays available until a choice is made.",
      "Continuing to browse or use the site is not consent. Until you choose, this deployment applies strictly necessary storage only for each of those regional notices; optional purposes stay off. The same conservative optional-storage default applies when location is unknown. Security, delivery of requested content and recording privacy choices may still require strictly necessary processing.",
      "Your choices affect more than cookies and collection: they also affect processing and the availability or operation of related features. Functional preferences enable remembered appearance, blackboard notes, a saved-formula workspace, voice follow-ups and on-device learning. With that category off, basic calculations and conversions remain available, appearance changes last only for the current page session, formula saving is disabled, and optional remembered state and learning are not used.",
      "You can change or withdraw your choice at any time using Cookie settings. Withdrawing stops subsequent optional storage and use; it does not automatically erase formulas already saved on the server or previously stored browser data. Use the data-management controls or your browser's site-data controls to erase those. No analytics or advertising service is loaded in this deployment. Global Privacy Control keeps advertising and sale/sharing consent off even if you accept other optional purposes.",
    ],
  },
  {
    id: "recipients",
    title: "Who receives information",
    paragraphs: [
      "The following categories of recipient may receive information as needed:",
    ],
    bullets: [
      "The hosting and infrastructure provider that runs this site — IP address and request details in ordinary server logs, needed to deliver the site and protect it.",
      "Advertising, measurement and analytics partners — cookie or similar identifiers, pages viewed, approximate location derived from the request, and device or browser type, used to show, measure or improve advertisements and to understand site use.",
      "Reference-data providers that supply figures when a tool requests them: Frankfurter (European Central Bank reference rates), CoinGecko (digital-asset prices) and the World Bank (economic indicators). Each request carries only the selected parameters (for example `USD/EUR` or an indicator code) — never your workspace, saved formulas or message.",
      "The browser vendor's speech service, when your browser uses it for voice input — microphone audio, under that vendor's terms and only while voice input is active.",
      "A bot-check provider (Cloudflare Turnstile) if it is enabled for the contact form; when it is not configured, no check and no third-party script is loaded.",
      "Authorities or advisers, where disclosure is required by law or reasonably necessary to protect rights and safety.",
    ],
  },
  {
    id: "transfers",
    title: "Transfers across borders",
    paragraphs: [
      "Information may be processed in a country different from yours, because the hosting provider, the reference-data providers or a browser vendor operate internationally. Where a transfer needs a safeguard under applicable law, appropriate safeguards are intended to be used (for example adequacy decisions or standard contractual clauses). You may ask about the relevant safeguards through the contact form.",
    ],
  },
  {
    id: "retention",
    title: "How long we keep information",
    bullets: [
      "Saved formulas: until you delete them or ask us to delete them. They do not expire automatically.",
      "Contact messages: the application has no automatic expiry. You may request deletion through the privacy contact route, subject to lawful exceptions; the operator must review retention for enquiries and follow-up.",
      "Infrastructure log retention is controlled by the hosting provider; this application does not set a fixed log-retention period. Contact us for the applicable deployment details.",
      "Browser-held workspace references, voice phrases and board notes: until cleared in the relevant feature or browser storage. The formula controls below manage server-side formulas, not all browser-held data.",
      "Privacy opt-out cookies expire after one year. Anonymous server receipts carry a matching one-year expiry and are removed on the next preference-save operation after expiry. No IP address or location is saved with them.",
      "The transient rate-limit counter for the contact form is held in server memory only and resets when the service restarts.",
    ],
  },
  {
    id: "sale",
    title: "Selling, sharing and targeted advertising",
    paragraphs: [
      `${N} may share personal information with advertising, measurement and analytics partners in ways that some privacy laws treat as a “sale” or “share,” including for cross-context behavioral advertising. Our Do Not Sell or Share My Personal Information page explains those choices. Browser controls may be available on that page. We honor Global Privacy Control when received. You can also contact us about a sale or sharing request. No account is required.`,
    ],
  },
  {
    id: "security",
    title: "Security",
    paragraphs: [
      "We use reasonable technical and organisational measures intended to protect information against unauthorised access, loss or misuse — for example by limiting what the public can submit, validating input and keeping the public surface small. No online service can guarantee absolute security.",
      "A workspace reference is a convenience, not a password: anyone who obtains it may be able to read or delete the formulas associated with it.",
    ],
  },
  {
    id: "children",
    title: "Children",
    paragraphs: [
      `${N} is a general-audience tool. It is not directed at children under 13 (and under 16 where a higher age applies for consent), and we do not knowingly collect personal information from them. We do not ask for age.`,
      "If you believe a child has submitted personal information through a formula, a board note or a message, use the contact form so it can be reviewed and removed.",
    ],
  },
  {
    id: "automated",
    title: "Automated decisions and profiling",
    paragraphs: [
      `${N} does not use personal information to make solely automated decisions that produce legal or similarly significant effects about a person. Optional voice recognition turns speech into text; it does not profile you, and nothing is scored, ranked or used to infer anything about you.`,
    ],
  },
  {
    id: "changes",
    title: "Changes to this policy",
    paragraphs: [
      "This policy is reviewed when the site's information practices change. The version and date at the top identify the current text; material changes will be indicated on the site where appropriate.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <>
    <SearchContext path="/privacy" />
    <LegalPage
      path="/privacy"
      eyebrow="Legal · Privacy"
      title="Privacy Policy"
      intro={`${N} asks for little to run the calculators, and it may also display advertisements and other revenue-generating content. This Privacy Policy explains what information is collected when you use the calculators, conversions, reference tools and optional voice input; why it is used; who receives it; and how long it is kept. It also describes advertising, analytics and cookies. GDPR, CCPA and the additional rights for Brazil, Canada, Australia, Singapore, Japan and India are sections of this same public policy. They are not hidden behind a country check.`}
      sections={SECTIONS}
      tocExtra={[
        { href: "#gdpr", label: "GDPR — your rights in the EEA and UK" },
        { href: "#ccpa", label: "CCPA / CPRA — California" },
        { href: "#international-rights", label: "Brazil, Canada, Australia, Singapore, Japan and India" },
        { href: "#privacy-choices", label: "Do Not Sell or Share" },
        { href: "#your-data", label: "Manage saved formulas" },
      ]}
      extra={
        <>
          <GdprPolicy />
          <CcpaPolicy />
          <InternationalPrivacy />
          <section id="privacy-choices" className="sketch scroll-mt-24" aria-labelledby="privacy-choices-title">
            <h2 id="privacy-choices-title" className="text-xl font-bold">Your privacy choices</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">You can review sale and sharing choices on the Do Not Sell or Share page. Browser controls may be available there. You can also contact us about a sale, sharing or related request.</p>
            <div className="mt-4 flex flex-wrap gap-5 text-sm text-[#194eb0]"><CookieSettingsButton /><PrivacyChoicesLink /></div>
          </section>
          <DataControls />
        </>
      }
    />
    </>
  );
}

import { LegalPage, type LegalSection } from "@/components/LegalPage";
import { DataControls } from "@/components/DataControls";
import { GdprPolicy } from "@/components/legal/GdprPolicy";
import { CcpaPolicy } from "@/components/legal/CcpaPolicy";
import { InternationalPrivacy } from "@/components/legal/InternationalPrivacy";
import { PrivacyChoicesLink } from "@/components/legal/PrivacyChoicesLink";
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
 * what this site actually does: no accounts, no analytics or advertising, saved
 * formulas tied to a random browser reference, an opt-in contact form, opt-in
 * microphone capture and three server-side reference-data providers.
 */
const SECTIONS: LegalSection[] = [
  {
    id: "summary",
    title: "At a glance",
    bullets: [
      `${N} does not display advertisements, sponsored placements, affiliate offers or other monetized content.`,
      `${N} does not collect personal information for advertising, monetization or analytics, and it does not use analytics or advertising cookies.`,
      "Saved formulas are stored on our server under a random browser workspace reference. Blackboard notes and voice phrase memory stay on your device.",
      "The contact form is optional; you choose whether to give a name or a reply address.",
      "Microphone access only happens if you press the voice button and approve your browser's permission prompt.",
      `${N} does not sell personal information and does not use it for cross-context behavioural advertising.`,
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
      ],
    },
    note: "Where the law requires a stated legal basis for each purpose, the bases are listed in the GDPR section below, with the CCPA purposes in its own section.",
  },
  {
    id: "voice",
    title: "Voice input and microphone audio",
    paragraphs: [
      `Voice input on the ${N} calculators page is entirely optional. It begins only when you press the voice button, and your browser asks for microphone permission before any audio is captured. Every tool works without voice.`,
      "The recogniser is chosen automatically. Phones and tablets use an explicitly on-device path where the browser exposes one; other cases may use the browser's own speech service, which can involve the browser vendor (for example Google or Microsoft) processing your audio under that vendor's terms. English may fall back to a generative model built into your browser; this site hosts no model weights. If neither path is available, voice input is simply unavailable — no audio leaves the device in the explicitly on-device paths.",
      "On this site's side we never receive or store microphone audio. Audio is released as soon as the utterance is transcribed, and only the recognised text is used.",
      "Voice input is withheld where offering it is restricted, and limited to on-device processing where cross-border transfer of audio is restricted. This uses a country signal supplied by the hosting network, or the region of your browser language when no signal exists; that signal is evaluated per request and is not stored.",
      "If a voice command is understood, this browser remembers the phrase and the tool it opened — including a later hypothesis that corrected a mis-recognition — so a follow-up such as “and 80” works. No audio is kept. Clear it any time with “Forget learned phrases” on the voice card, or by clearing site data in your browser.",
      "Device and browser characteristics (device type, operating system, browser, whether speech and microphone APIs exist) are read locally to choose that path. This site does not send them to its server.",
    ],
  },
  {
    id: "no-ads",
    title: "No advertisements, monetized content, analytics or tracking cookies",
    paragraphs: [
      `${N} does not display advertisements. Pages do not include banner ads, sponsored results, affiliate modules, paid placements or other monetized content. The tools are free, and using them does not put you into an advertising audience.`,
      `${N} does not collect personal information — including formulas, messages, voice text, workspace references or connection logs — for advertising, marketing measurement, sale, or any other monetized purpose. Reference-data requests carry only the figure you asked for, never an advertising identifier.`,
      `${N} does not use data analytics. There is no analytics product, pixel, tag manager or measurement cookie. We do not build browsing profiles, and we do not use cookies to collect data about how you move around the site.`,
    ],
    note: "The only cookie this site sets is a strictly necessary privacy-choice cookie described below. It remembers an opt-out. It is not an analytics cookie, an advertising cookie, or a cookie used to collect information about you.",
  },
  {
    id: "storage",
    title: "Cookies, local storage and similar technologies",
    paragraphs: [
      `${N} does not set analytics cookies, advertising cookies, or any cookie whose purpose is to collect data. The only cookie is an essential privacy-choice cookie that remembers a restrictive opt-out and a random receipt reference for up to one year. It stores no name, email, IP address or browsing history, and it cannot be used to advertise to you.`,
      "Browser storage holds the random saved-formula workspace reference, remembered voice phrases and blackboard strokes/notes. The last voice command uses session storage. Saved formulas themselves are stored in the server database. Clearing browser storage does not delete server-side formulas; use the controls below before disconnecting your workspace.",
      "Your browser's speech service may set its own storage or use its own account state. That is governed by your browser and its vendor, not by this site.",
    ],
  },
  {
    id: "recipients",
    title: "Who receives information",
    paragraphs: [
      "We do not operate advertising relationships and we do not disclose personal information to advertising networks. The following categories of recipient may receive information as needed:",
    ],
    bullets: [
      "The hosting and infrastructure provider that runs this site — IP address and request details in ordinary server logs, needed to deliver the site and protect it.",
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
      `${N} does not currently sell personal information or share it for cross-context behavioral advertising. Our Do Not Sell or Share My Personal Information page lets you record a restrictive browser preference, and we honor Global Privacy Control when received. No account or identity verification is required for the browser opt-out.`,
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
      intro={`${N} asks for very little, and it does not run on advertising. This Privacy Policy explains what information is collected when you use the calculators, conversions, reference tools and optional voice input; why it is used; who receives it; and how long it is kept. It also states the commitments not to display advertisements or monetized content, not to collect data for those purposes, and not to use data analytics or tracking cookies. GDPR, CCPA and the additional rights for Brazil, Canada, Australia, Singapore, Japan and India are sections of this same public policy. They are not hidden behind a country check.`}
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
            <p className="mt-3 text-sm leading-relaxed text-slate-700">The California opt-out page is available everywhere. A privacy request is not limited by your current location.</p>
            <PrivacyChoicesLink className="mt-4 text-sm text-[#194eb0]" />
          </section>
          <DataControls />
        </>
      }
    />
    </>
  );
}

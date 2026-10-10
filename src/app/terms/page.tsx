import { LegalPage, type LegalSection } from "@/components/LegalPage";
import { SITE } from "@/lib/site";
import { CURRENCIES, COUNTRIES, INDICATORS, CRYPTO_IDS, UNIT_COUNT, UNIT_CATEGORY_COUNT } from "@/lib/catalog";

const N = SITE.name;

// Drafted with the standard structure recommended for consumer web-tool
// terms: scope and acceptance, service description, acceptable use,
// intellectual property, third-party content, disclaimers, limitation of
// liability, indemnification, termination, governing law and dispute
// resolution, and the general "boilerplate" clauses (severability, no
// waiver, assignment, force majeure, entire agreement). Sections specific to
// this Service's actual features — voice input and language processing,
// saved formulas, reference data, export/regional restrictions — are
// written out in full rather than left as generic placeholders.
const SECTIONS: LegalSection[] = [
  {
    id: "scope",
    title: "About these terms",
    paragraphs: [
      `These Terms of Service (“Terms”) form an agreement between you and ${N} and apply whenever you visit or use ${N} and the calculation, conversion, reference and voice tools available on it (the “Service”). They should be read together with the Privacy Policy, the Disclaimer and the Accessibility statement, which are incorporated into these Terms by reference.`,
      "By visiting or using the Service you accept these Terms. If you do not agree with them, do not use the Service. Nothing here removes a right that applicable law does not allow to be excluded or restricted, including consumer-protection rights in your country or state of residence.",
      `In these Terms, “you” means the person using the Service, and “${N}”, “we” or “us” means the operator of the Service. Section headings are for convenience only and do not limit a section's meaning.`,
    ],
  },
  {
    id: "eligibility",
    title: "Who can use the Service",
    paragraphs: [
      `${N} does not create accounts and does not knowingly direct the Service at children. You must be able to form a binding agreement under the law that applies to you to use the Service; if you are using it on behalf of an employer or other organisation, you confirm you are authorised to accept these Terms for them.`,
      "The Service is a general calculation and reference tool, not a regulated financial, legal, tax, medical or engineering advisory service, and using it does not create a professional or fiduciary relationship.",
    ],
  },
  {
    id: "service",
    title: "What the Service offers",
    paragraphs: ["At the date of this version, the free Service offers:"],
    bullets: [
      "A calculator with a blackboard workspace for sketching, notes and expressions.",
      "A scientific calculator for mathematical expressions, named values and unit expressions.",
      `A unit converter with ${UNIT_COUNT} units in ${UNIT_CATEGORY_COUNT} categories.`,
      `A currency reference tool covering ${CURRENCIES.length} currencies, with a recent historical view. Figures are indicative and may not match a price offered by a financial institution or exchange.`,
      `A digital-asset price viewer for ${CRYPTO_IDS.length} assets. Prices are informational and can change quickly.`,
      `A viewer for ${INDICATORS.length} economic indicators across ${COUNTRIES.length} selected economies. Many figures are published periodically rather than continuously.`,
      "A formula tool where you can enter expressions, assign values, view calculated results and choose to save, export or delete expressions.",
      "An optional voice-input feature that turns a spoken request into a prefilled tool, described fully in “Voice input and language processing” below.",
    ],
    note: "Results are prepared while you enter information and are displayed only after you press the tool's confirmation button (Convert, Calculate, Evaluate, Show or Filter). Available tools and features may change; these descriptions do not guarantee that a feature will remain available unchanged.",
  },
  {
    id: "voice-input",
    title: "Voice input and language processing",
    paragraphs: [
      "The voice feature is optional, starts only when you activate it, and is described in full in the Privacy Policy. These Terms cover the conditions of using it.",
      "Depending on your device, browser and region, a spoken request may be processed entirely on your device, by your browser vendor's own speech service, or by a small on-page model — the Service selects the path automatically and does not let you route audio through a path your browser does not actually support. You accept that recognition accuracy varies by accent, background noise, device and language, and that a misrecognised phrase can open the wrong tool or no tool at all; always check the amount, units and direction shown before relying on a result.",
      "Where voice processing uses a browser vendor's own speech service or a third-party, openly licensed speech model, that provider or model is not operated by us, and its own terms and privacy practices govern its part of the processing. We do not warrant the availability, accuracy or continued free provision of any such third-party service or model.",
      "Voice input may be unavailable in some countries or regions, or limited to on-device processing only, where we have assessed that to be appropriate for legal, data-transfer or service-availability reasons. This is not a guarantee that voice input is lawful or appropriate for every use in every location, and you remain responsible for complying with local law when you use the feature.",
      "To improve recognition of repeated phrases, the feature may keep a small record of recognised phrases and the tool they opened in your browser's local storage only. You can clear this at any time from the voice control or by clearing site data in your browser; doing so does not affect any other part of the Service.",
    ],
  },
  {
    id: "permitted-use",
    title: "Permitted and prohibited use",
    paragraphs: ["You may use the Service for lawful personal, educational or professional purposes. You agree not to:"],
    bullets: [
      "use the Service in a way that violates applicable law, export-control or sanctions rules, or another person's rights;",
      "materially interfere with, overburden or disrupt access to or the proper functioning of the Service, including by automated scraping at a volume or frequency that degrades it for other visitors;",
      "probe, scan or attempt to access a non-public interface, administrative function or another visitor's saved content without authorisation;",
      "circumvent, disable or attempt to defeat a regional, device or capability restriction placed on a feature, including the voice feature's processing rules;",
      "reverse engineer, decompile or attempt to extract the source code of the Service except to the extent a restriction of that kind is not enforceable under applicable law;",
      "submit unlawful, infringing or sensitive personal information through the formula, contact or voice tools; or",
      "present an unreviewed result as certified, professionally verified or guaranteed, or otherwise misrepresent a calculation produced by the Service.",
    ],
  },
  {
    id: "results",
    title: "Results are information, not professional advice",
    paragraphs: [
      "Results depend on values and expressions entered and, where relevant, on external reference information or a recognised voice request. They are general information, not financial, investment, tax, medical, engineering, legal or other professional advice, and are not tailored to personal circumstances.",
      "Check important results independently. Do not rely on an example formula, a voice-recognised request or a reference figure for health, safety-critical, financial or legal decisions without appropriate review. See the Disclaimer for more detail on the limits of a calculated result.",
    ],
  },
  {
    id: "external-information",
    title: "External reference information",
    paragraphs: [
      "Some tools display information derived from external public or market-reference sources. Such information may be delayed, incomplete, revised or unavailable. Currency reference values may be published periodically and are not necessarily transaction prices. Digital-asset values can differ across venues. Economic statistics are often periodic and may be revised.",
      "External information may carry separate use conditions. References to it are informational and do not imply sponsorship or endorsement. Radix Loom does not guarantee that external information is complete, current or suitable for a particular decision.",
    ],
  },
  {
    id: "saved-content",
    title: "Saved formulas",
    paragraphs: [
      "If you choose to save a formula, Radix Loom retains the expression and related details you provide so they can be shown to you later. A random workspace reference kept with the browser you use links those saved items to that workspace; it is not an account or password.",
    ],
    bullets: [
      "Anyone who obtains the workspace reference may be able to access or remove formulas associated with it. Do not include passwords, confidential information or personal details in a formula.",
      "You retain the rights you have in your own expression. You allow Radix Loom to keep and display it only as needed to provide the saving feature and respond to lawful requests.",
      "You may download or delete saved formulas from the Privacy Policy controls. Saved formulas do not currently expire automatically.",
    ],
  },
  {
    id: "ip",
    title: "Intellectual property",
    paragraphs: [
      `The ${N} name, the owl and coin-cat characters, the hand-drawn illustrations, the site's visual design and layout, its underlying software and its original text are either owned by us or licensed to us, and are protected by copyright, trade mark and other intellectual-property laws. Except as these Terms expressly allow, nothing in them transfers any of that intellectual property to you.`,
      "Subject to these Terms, we grant you a limited, personal, revocable, non-exclusive, non-transferable licence to access and use the Service for its intended purpose. You may not copy, reproduce, republish, frame, sell or create derivative works from the site's software, design or original illustrations without prior written permission, except to the extent that mandatory law allows it despite this restriction.",
      "A calculation result you obtain is yours to use for your own purposes, subject to any separate rights that apply to third-party reference information included in it. Any on-device speech-recognition or language model used by the voice feature is provided under its own open-source licence by its publisher; using the Service does not grant you a separate licence to that model outside of the Service.",
      "Third-party names, trade marks and data referenced on the Service remain the property of their respective owners and are used for identification or reference only; such use does not imply endorsement, sponsorship or affiliation.",
    ],
  },
  {
    id: "third-party-links",
    title: "Links to other websites and services",
    paragraphs: [
      "The Service may link to, or reference figures sourced from, third-party websites or services that we do not operate and do not control. A link or reference is provided for convenience and does not imply our endorsement of the destination's content, accuracy, availability or privacy practices.",
      "You access any third-party website or service at your own risk and subject to its own terms and privacy notice. We are not responsible for the content, policies or practices of any third party.",
    ],
  },
  {
    id: "copyright-complaints",
    title: "Copyright and intellectual-property complaints",
    paragraphs: [
      "If you believe material on the Service infringes your copyright or other intellectual-property rights, contact us through the contact form with: a description of the work you believe is infringed; the specific material and page address you believe infringes it; your contact details; and a statement that you have a good-faith belief the use is not authorised.",
      "We will review a complaint received in this way and may remove or disable access to material in response, without that action being an admission of infringement. Submitting a complaint that is knowingly false or made in bad faith may itself expose you to liability under applicable law.",
    ],
  },
  {
    id: "availability",
    title: "Availability and changes",
    paragraphs: [
      "The Service is free of charge. It may sometimes be interrupted, changed or unavailable, including when external information or a third-party speech or model provider is unavailable. Tools or features — including specific voice languages, processing paths or regional availability — may be added, changed or withdrawn at any time. Where a change materially affects saved formulas, reasonable notice will be provided where practicable.",
    ],
  },
  {
    id: "warranties",
    title: "Disclaimer of warranties",
    paragraphs: [
      "To the fullest extent permitted by applicable law, the Service, including every calculator, converter, reference figure and the voice feature, is provided “as is” and “as available”, without warranties of any kind, whether express, implied or statutory, including implied warranties of merchantability, fitness for a particular purpose, title, non-infringement and uninterrupted or error-free operation.",
      "We do not warrant that the Service will be uninterrupted, timely, secure, accurate or error-free, that defects will be corrected, that a voice request will be recognised correctly, or that external or third-party-sourced information is complete or current. Some jurisdictions do not allow the exclusion of certain implied warranties, so some exclusions in this section may not apply to you, in which case they apply only to the maximum extent permitted.",
    ],
  },
  {
    id: "liability",
    title: "Limitation of liability",
    paragraphs: [
      `To the fullest extent permitted by applicable law, ${N} and its operators, contributors and suppliers will not be liable for any indirect, incidental, special, consequential, exemplary or punitive damages, or for any loss of profits, revenue, data, goodwill or opportunity, arising out of or relating to your use of, or inability to use, the Service — including a calculation error, a rounding difference, a delayed or inaccurate reference figure, a misrecognised voice request, or an interruption to a third-party speech or model provider — even if advised of the possibility of such damages.`,
      `To the extent any liability is not validly excluded under applicable law, the total liability of ${N} for all claims relating to the Service in any twelve-month period is limited to the greater of (a) the amount, if any, you paid to us for the Service in that period, which for the free Service is nil, and (b) one hundred US dollars (or the equivalent in your local currency).`,
      "Nothing in this section limits liability that cannot lawfully be limited, including liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation, or other liability that the applicable law does not permit to be excluded or limited.",
    ],
  },
  {
    id: "indemnification",
    title: "Indemnification",
    paragraphs: [
      `To the extent permitted by applicable law, you agree to defend, indemnify and hold harmless ${N} and its operators, contributors and suppliers from and against any claims, liabilities, damages, losses and expenses, including reasonable legal fees, arising out of or in any way connected with your misuse of the Service, your violation of these Terms, or your violation of any law or the rights of a third party, except to the extent such claims arise from our own breach of these Terms or violation of applicable law.`,
    ],
  },
  {
    id: "ending-use",
    title: "Ending or restricting use",
    paragraphs: [
      "You may stop using the Service at any time. Access or saved content may be restricted, suspended or removed where reasonably necessary to protect the Service or other visitors, comply with law or a legal request, investigate suspected misuse, or address a material breach of these Terms, with or without prior notice where circumstances make that appropriate. You can delete saved formulas using the controls in the Privacy Policy at any time, including before ending your use of the Service.",
      "Sections that by their nature are intended to survive the end of your use of the Service — including Intellectual property, Disclaimer of warranties, Limitation of liability, Indemnification, Governing law and dispute resolution, and General provisions — continue to apply after you stop using it.",
    ],
  },
  {
    id: "export-control",
    title: "Export control and sanctions",
    paragraphs: [
      "The Service, including any software, speech-recognition model or on-device technology it uses, may be subject to export-control and economic-sanctions laws. You confirm that you are not located in, or a resident of, a country or region subject to a comprehensive embargo under the law that applies to us, and that you are not on a restricted-party list under such law. Voice processing is automatically withheld or limited in some regions for related legal reasons, as described in the Privacy Policy.",
    ],
  },
  {
    id: "children",
    title: "Children",
    paragraphs: [
      `${N} is a general-audience tool, is not directed to children under 13 (or the relevant minimum age in your location), and does not knowingly collect personal information from children. If you believe a child has provided personal information through a formula, the voice feature or the contact form, please use the contact form so it can be reviewed and removed as appropriate.`,
    ],
  },
  {
    id: "electronic-communications",
    title: "Electronic communications",
    paragraphs: [
      "Using the Service and submitting the contact form are electronic transactions. You consent to receive communications from us electronically, including replies to a message you send through the contact form, and you agree that any such communication satisfies any legal requirement that it be in writing, to the extent permitted by applicable law.",
    ],
  },
  {
    id: "security",
    title: "Security",
    paragraphs: [
      "We use reasonable measures intended to protect the Service, but no online service can guarantee absolute security. If you believe you have found a security vulnerability affecting the Service, please report it through the contact form with enough detail to reproduce it, and avoid accessing or modifying data that is not yours while investigating. Please do not publicly disclose a suspected vulnerability until we have had a reasonable opportunity to address it.",
    ],
  },
  {
    id: "law",
    title: "Governing law and dispute resolution",
    paragraphs: [
      "These Terms do not select an exclusive court or displace mandatory consumer-protection or other laws that apply to you. Subject to those mandatory rules, these Terms and any dispute arising from them are governed by, and should be interpreted under, generally applicable law without regard to conflict-of-law principles, and any dispute is subject to the forums available under that law, including non-waivable consumer rights and small-claims options where they apply.",
      "If you have a concern, please raise it first through the contact form so it can be considered informally; we aim to resolve good-faith concerns without resort to formal proceedings. Using the contact form first is encouraged, not a condition for exercising a legal right, and these Terms do not require you to accept arbitration in place of a court available to you by law.",
    ],
  },
  {
    id: "updates",
    title: "Updates to these Terms",
    paragraphs: [
      "The version and date above identify the current text. Material changes will be indicated on the site. Updated Terms apply from their stated effective date and do not change the terms that applied to earlier use. Continuing to use the Service after an update takes effect means you accept the updated Terms; if you do not accept them, stop using the Service.",
    ],
  },
  {
    id: "general",
    title: "General provisions",
    paragraphs: [
      "These Terms, together with the Privacy Policy, Disclaimer and Accessibility statement, are the entire agreement between you and us about use of the Service, and supersede any earlier understanding on that subject.",
    ],
    bullets: [
      "Severability: if any part of these Terms cannot be enforced, the rest remains in effect to the extent permitted by law, and the unenforceable part is read as narrowly as needed to make it enforceable.",
      "No waiver: a failure or delay to enforce a provision is not a waiver of it, and a single or partial exercise of a right does not prevent any further exercise of it.",
      "Assignment: you may not assign or transfer your rights under these Terms without our consent; we may assign these Terms in connection with a merger, acquisition, reorganisation or sale of assets, or by operation of law.",
      "Force majeure: we are not responsible for a delay or failure to provide the Service caused by circumstances reasonably beyond our control, including outages of a hosting, network, payment, speech-recognition or data provider we rely on.",
      "Relationship of the parties: these Terms do not create a partnership, joint venture, employment or agency relationship between you and us.",
      "Language and translation: these Terms are drafted in English; any translation is provided for convenience, and applicable law governs interpretation of the original where a conflict arises.",
    ],
  },
  {
    id: "accessibility-note",
    title: "Accessibility",
    paragraphs: [
      "We aim to make the Service usable with a keyboard, touch and common assistive technology. The Accessibility statement describes current support and known limitations, and the contact form can be used to report a barrier you encounter.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [`Questions about these Terms, copyright complaints and security reports may all be sent through the contact form on ${N}.`],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      path="/terms"
      eyebrow="Legal · Terms"
      title="Terms of Service"
      intro={`These Terms describe how ${N} may be used, including its voice and language features. They use the service name and neutral language; applicable law determines the rights and responsibilities that cannot be varied by a website notice.`}
      sections={SECTIONS}
    />
  );
}

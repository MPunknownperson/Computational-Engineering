import "server-only";
import type { PrivacyRegionSlug } from "./regions";

interface RegionalClause { title: string; paragraphs: string[] }
export interface RegionalSupplement {
  scope: string;
  clauses: RegionalClause[];
  authority: { name: string; url: string };
}

/** Server-only content: never ship every jurisdiction's clauses to the client. */
export const REGIONAL_SUPPLEMENTS: Record<PrivacyRegionSlug, RegionalSupplement> = {
  brazil: {
    scope: "These clauses apply where Brazil’s Lei Geral de Proteção de Dados (LGPD) governs the processing described in the Privacy Policy. Location alone does not establish whether every LGPD obligation applies.",
    clauses: [
      { title: "Your rights under the LGPD", paragraphs: ["Subject to the applicable conditions and exceptions, you may request confirmation of processing, access, correction, anonymization, blocking or deletion of unnecessary, excessive or unlawfully processed data. You may also request information about disclosures, withdraw consent, and request portability where regulated.", "Where processing relies on consent, you may ask about the consequences of refusing it. Objections and review of solely automated decisions are available where the statutory conditions are met. Radix Loom does not use its calculator results to make significant decisions about you."] },
      { title: "Requests and complaints", paragraphs: ["Use the contact form’s privacy topic to exercise a right. Requests are handled without charging for the exercise of LGPD rights and within the applicable legal timeframe; lawful identity checks and exceptions may apply. Browser-only blackboard notes can be removed on your device; saved server-side formulas can be exported or deleted using the main policy controls.", "If a request is unresolved, you may petition the Autoridade Nacional de Proteção de Dados (ANPD) or a competent consumer-protection body. Mandatory Brazilian law takes precedence over a conflicting statement in the general policy."] },
      { title: "Transfers and retention", paragraphs: ["The main policy explains the categories of recipients and retention practices. Where Brazilian transfer rules apply, the transfer needs an applicable legal mechanism; consent to use a calculator is not blanket consent to an international transfer. Contact us for information about a transfer relevant to your data."] },
    ],
    authority: { name: "ANPD — data-subject rights and LGPD guidance", url: "https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes" },
  },
  canada: {
    scope: "These clauses apply where the federal Personal Information Protection and Electronic Documents Act (PIPEDA) or an applicable provincial privacy law governs the processing. Provincial laws, including those of Québec, Alberta and British Columbia, may impose different requirements.",
    clauses: [
      { title: "Consent, access and accuracy", paragraphs: ["Where consent is required, it must be meaningful in relation to the stated purpose. You may withdraw consent subject to legal or contractual restrictions and reasonable notice; we will explain relevant consequences. Refusing optional voice input does not prevent ordinary calculator use.", "You may ask whether we hold personal information about you, request access and information about its use and disclosure, and challenge its accuracy or completeness. Exceptions may limit access, including the protection of another person’s information."] },
      { title: "How to make a request", paragraphs: ["Use the contact form and select the privacy topic. Where PIPEDA applies to an access request, the usual response period is 30 calendar days; a legally permitted extension requires notice with the reasons and complaint rights. Other provincial deadlines may differ.", "Raise a concern with us first. You may also contact the Office of the Privacy Commissioner of Canada or the relevant provincial commissioner. The location-based page restriction does not prevent you from making a request while outside Canada."] },
      { title: "Service providers and cross-border processing", paragraphs: ["The general policy describes hosting, stored formulas and external data sources. A service provider may operate outside Canada and be subject to foreign law. Contact us for details relevant to your information; this statement does not replace any accountability, assessment or contractual safeguard required by applicable Canadian law."] },
    ],
    authority: { name: "Office of the Privacy Commissioner of Canada — access to personal information", url: "https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/pipeda-compliance-help/pipeda-interpretation-bulletins/interpretations_05_access/" },
  },
  australia: {
    scope: "These clauses apply to processing covered by Australia’s Privacy Act 1988 and Australian Privacy Principles (APPs). Statutory coverage and exceptions must be assessed for the operator and the processing; visiting from Australia alone does not establish coverage.",
    clauses: [
      { title: "Access, correction and identification", paragraphs: ["Where the APPs apply, you may request access to personal information held about you and correction of information that is inaccurate, out of date, incomplete, irrelevant or misleading. Lawful exceptions and reasonable identity checks may apply.", "You can use the calculator without an account and leave the contact form’s name field empty. Do not submit more identifying information than is needed to handle a privacy request."] },
      { title: "Complaints and responses", paragraphs: ["Use the contact form’s privacy topic to request access, correction or review of a privacy concern. We will consider the request and explain a refusal, where required, together with the available complaint route.", "Contact us about a concern before escalating it to the Office of the Australian Information Commissioner (OAIC). The OAIC generally expects an organization to have had an opportunity to respond, usually about 30 days. Applicable statutory rights and exceptions continue to govern."] },
      { title: "Overseas recipients", paragraphs: ["The main policy describes recipient categories. Hosting or browser speech services may be operated overseas. Where APP 8 applies, overseas disclosures must satisfy its requirements unless an exception applies. No statement here represents ordinary website use as consent to waive those requirements."] },
    ],
    authority: { name: "OAIC — privacy rights in Australia", url: "https://www.oaic.gov.au/engage-with-us/events/privacy-awareness-week/paw-2025/privacy-rights-in-australia" },
  },
  singapore: {
    scope: "These clauses apply where Singapore’s Personal Data Protection Act (PDPA) governs the collection, use or disclosure of personal data described in the main Privacy Policy.",
    clauses: [
      { title: "Purpose notification and consent", paragraphs: ["The main policy identifies the purposes of the website’s processing. Where required, consent must relate to those purposes. You may withdraw consent with reasonable notice; the consequences should be explained, and the affected processing must cease unless law permits or requires it.", "Optional microphone permission and browser-only notes are not a condition of using the ordinary calculators. Essential operation and legal exceptions are considered separately from optional features."] },
      { title: "Access and correction", paragraphs: ["Subject to PDPA exceptions, you may request access to personal data in our possession or control and information about its use or disclosure during the preceding year. You may also ask for correction of an error or omission.", "Use the contact form’s privacy topic. Requests are handled within applicable requirements; where a full response cannot be given within 30 days, the expected response timing should be communicated as required. A reasoned refusal and any permitted fee will be explained rather than imposed without notice."] },
      { title: "Protection, retention and transfers", paragraphs: ["Personal data should not be retained after its purpose has ended and retention is no longer necessary for legal or business purposes. Where data is transferred outside Singapore, the applicable transfer-limitation requirements, including comparable protection or a lawful exception, must be met.", "Contact us with a concern first; you may seek assistance from Singapore’s Personal Data Protection Commission (PDPC). The general policy remains available regardless of the connection used to view this supplement."] },
    ],
    authority: { name: "PDPC — individuals’ rights under the PDPA", url: "https://www.pdpc.gov.sg/overview-of-pdpa/data-protection/individual/individuals-overview" },
  },
  japan: {
    scope: "These clauses apply where Japan’s Act on the Protection of Personal Information (APPI) governs the personal information or retained personal data described in the main Privacy Policy.",
    clauses: [
      { title: "Purposes of use", paragraphs: ["The purposes identified in the main policy cover tool delivery, requested formula storage, contact responses and security. Processing for a materially different purpose must satisfy the applicable APPI requirements; use of a calculator is not permission for unrelated use."] },
      { title: "Disclosure, correction and cessation", paragraphs: ["Where the statutory conditions are met, you may request notice of purposes of use, disclosure of retained personal data and relevant third-party disclosure records, correction, addition or deletion, cessation of use or erasure, or cessation of provision to third parties.", "Submit requests through the contact form’s privacy topic. We may need information to identify the relevant record and verify the request. A refusal or limitation must be explained where required by law; the self-service formula export and deletion controls remain available."] },
      { title: "Overseas provision and complaints", paragraphs: ["Where APPI requirements apply to providing personal data to a foreign third party, consent and information about overseas protection may be required unless a lawful alternative or exception applies. Please contact us for details relevant to a proposed or actual transfer.", "For unresolved concerns, contact Japan’s Personal Information Protection Commission (PPC). Nothing in the general policy excludes a right or responsibility that cannot be excluded under the APPI."] },
    ],
    authority: { name: "Personal Information Protection Commission of Japan", url: "https://www.ppc.go.jp/en/" },
  },
  india: {
    scope: "These clauses address the Digital Personal Data Protection Act 2023, the DPDP Rules 2025 and other applicable Indian privacy rules. Commencement is phased: this page does not represent every DPDP provision as already in force. Rights and duties below apply when the relevant provisions have commenced and cover the processing.",
    clauses: [
      { title: "Notice and choice", paragraphs: ["The general policy describes the personal data and purposes associated with the site. Where DPDP notice and consent provisions apply, requests for consent must be clear and purpose-specific; withdrawal must be available subject to applicable law.", "Refusing optional speech recognition does not disable the ordinary tools. This website does not host generative model weights, but a browser may download its own model when voice is activated."] },
      { title: "Rights and grievance handling", paragraphs: ["As the relevant provisions apply, a Data Principal may request information about processing, correction, completion, updating or erasure, use the grievance process, and nominate another person to exercise rights in the circumstances provided by law.", "Use the contact form’s privacy topic and specify the request. We will explain what is needed to locate your record, consider lawful exceptions and respond under the applicable rules. Where the law requires exhaustion of a grievance process before approaching the Data Protection Board, follow that process."] },
      { title: "Phased implementation and protection of children", paragraphs: ["The Government’s DPDP Rules notification provides staged commencement, including an eighteen-month implementation period for many substantive provisions. Consult the official notification for the current dates and applicable requirements; a web page cannot bring a provision into force early.", "Where the DPDP provisions on children apply, a child generally means a person under 18 and the relevant parental-consent and processing restrictions must be observed unless an exception applies. The general policy’s age wording does not override those rules."] },
    ],
    authority: { name: "Government of India — DPDP Rules notification and implementation overview", url: "https://www.pib.gov.in/PressNoteDetails.aspx?NoteId=156054&ModuleId=3&reg=48&lang=2" },
  },
};

import { LegalPage, type LegalSection } from "@/components/LegalPage";
import { SITE } from "@/lib/site";
import { CURRENCIES, COUNTRIES, INDICATORS, CRYPTO_IDS, UNIT_COUNT, UNIT_CATEGORY_COUNT } from "@/lib/catalog";

const N = SITE.name;

const SECTIONS: LegalSection[] = [
  {
    id: "scope",
    title: "About these terms",
    paragraphs: [
      `These Terms of Use apply when you visit or use ${N} and the calculation tools available on it (the “Service”). They describe the conditions of use and should be read with the Privacy Notice and Disclaimer.`,
      "If you do not agree with these Terms, do not use the Service. Nothing here removes a right that cannot lawfully be excluded or restricted.",
    ],
  },
  {
    id: "service",
    title: "What the Service offers",
    paragraphs: ["At the date of this version, the free Service offers:"],
    bullets: [
      "A scientific calculator for mathematical expressions, named values and unit expressions.",
      `A unit converter with ${UNIT_COUNT} units in ${UNIT_CATEGORY_COUNT} categories.`,
      `A currency reference tool covering ${CURRENCIES.length} currencies, with a recent historical view. Figures are indicative and may not match a price offered by a financial institution or exchange.`,
      `A digital-asset price viewer for ${CRYPTO_IDS.length} assets. Prices are informational and can change quickly.`,
      `A viewer for ${INDICATORS.length} economic indicators across ${COUNTRIES.length} selected economies. Many figures are published periodically rather than continuously.`,
      "A formula tool where you can enter expressions, assign values, view calculated results and choose to save, export or delete expressions.",
    ],
    note: "Results are prepared while you enter information and are displayed only after you press the tool's confirmation button (Convert, Calculate, Evaluate, Show or Filter). Available tools and features may change; these descriptions do not guarantee that a feature will remain available unchanged.",
  },
  {
    id: "permitted-use",
    title: "Permitted and prohibited use",
    paragraphs: ["You may use the Service for lawful personal, educational or professional purposes. You agree not to:"],
    bullets: [
      "use the Service in a way that violates applicable law or another person’s rights;",
      "materially interfere with access to or the proper functioning of the Service;",
      "attempt to access another visitor’s saved content without permission;",
      "submit unlawful, infringing or sensitive personal information through the formula or contact tools; or",
      "present an unreviewed result as certified, professionally verified or guaranteed.",
    ],
  },
  {
    id: "results",
    title: "Results are information, not professional advice",
    paragraphs: [
      "Results depend on values and expressions entered and, where relevant, on external reference information. They are general information, not financial, investment, tax, medical, engineering, legal or other professional advice, and are not tailored to personal circumstances.",
      "Check important results independently. Do not rely on an example formula for health, safety-critical, financial or legal decisions without appropriate review.",
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
      "You may download or delete saved formulas from the Privacy Notice controls. Saved formulas do not currently expire automatically.",
    ],
  },
  {
    id: "materials",
    title: "Site materials and your results",
    paragraphs: [
      "The Radix Loom name, original illustrations, layout and site materials are presented as part of the Service. Third-party names and content remain associated with their respective sources. You may use calculations you obtain for your own purposes, subject to any separate rights that apply to external information included in them.",
    ],
  },
  {
    id: "availability",
    title: "Availability and changes",
    paragraphs: [
      "The Service is free of charge. It may sometimes be interrupted, changed or unavailable, including when external information is unavailable. Tools or features may change. Where a change materially affects saved formulas, reasonable notice will be provided where practicable.",
    ],
  },
  {
    id: "warranties",
    title: "Warranties and limitations",
    paragraphs: [
      "To the extent permitted by applicable law, the Service is provided as available, without a guarantee that it will be uninterrupted, error-free or suitable for a particular purpose. Results may contain errors or rounding differences.",
      "To the extent permitted by law, Radix Loom is not responsible for indirect or consequential loss arising from use of the Service. Nothing in these Terms excludes liability or consumer rights that applicable law does not allow to be excluded or limited.",
    ],
  },
  {
    id: "ending-use",
    title: "Ending or restricting use",
    paragraphs: [
      "You may stop using the Service at any time. Access or saved content may be restricted or removed where reasonably necessary to protect the Service, comply with law or address a material breach of these Terms. You can delete saved formulas using the controls in the Privacy Notice.",
    ],
  },
  {
    id: "updates",
    title: "Updates to these Terms",
    paragraphs: [
      "The version and date above identify the current text. Material changes will be indicated on the site. Updated Terms apply from their stated effective date and do not change the terms that applied to earlier use.",
    ],
  },
  {
    id: "law",
    title: "Applicable law and disputes",
    paragraphs: [
      "These Terms do not select an exclusive court or displace mandatory laws that apply to you. Any dispute is subject to applicable law and the forums available under that law, including non-waivable consumer rights.",
      "If you have a concern, you may first raise it through the contact form so it can be considered informally. Using the form is not a condition for exercising a legal right.",
    ],
  },
  {
    id: "general",
    title: "General provisions",
    paragraphs: [
      "If any part of these Terms cannot be enforced, the rest remains in effect to the extent permitted by law. A failure to rely on a provision is not a waiver of it. These Terms and the policies linked from the site describe the current conditions of use. Any translation is provided for convenience; applicable law governs interpretation where necessary.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [`Questions about these Terms may be sent through the contact form on ${N}.`],
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      path="/terms"
      eyebrow="Legal · Terms of Use"
      title="Terms of use for the calculator tools"
      intro={`These Terms describe how ${N} may be used. They use the service name and neutral language; applicable law determines the rights and responsibilities that cannot be varied by a website notice.`}
      sections={SECTIONS}
    />
  );
}

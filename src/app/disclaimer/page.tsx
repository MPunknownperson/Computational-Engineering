import { LegalPage, type LegalSection } from "@/components/LegalPage";
import { SITE } from "@/lib/site";

const SECTIONS: LegalSection[] = [
  {
    id: "general",
    title: "General information only",
    paragraphs: [
      `${SITE.name} calculates results from the values and expressions you enter and presents selected external reference information. Results are general information, not advice tailored to you. They can be incomplete, delayed or incorrect. Check any result that matters against an authoritative source.`,
    ],
  },
  {
    id: "financial",
    title: "Financial information",
    bullets: [
      "Currency values are reference figures, not offers to buy or sell currency. A bank, card issuer or exchange may apply a different rate, spread or fee.",
      "Digital-asset prices can change rapidly, differ between trading venues and may not represent a price available to you.",
      "Economic statistics are often published periodically, may describe earlier periods and may be revised.",
      "Nothing on this site is a recommendation to buy, sell or hold a currency, asset or security. Past values do not indicate future values.",
    ],
  },
  {
    id: "health-safety",
    title: "Health, safety and engineering",
    paragraphs: [
      "Example expressions involving health or engineering quantities are illustrations of calculations only. They have not been reviewed for a particular person, product, structure or situation. Do not use them as the sole basis for treatment, dosage, structural design or safety-critical decisions. Follow qualified professional guidance and applicable standards.",
    ],
  },
  {
    id: "freshness",
    title: "Freshness and external information",
    paragraphs: [
      "Live figures are refreshed periodically. The time shown in a tool indicates when its displayed information was last received by the page, and is not necessarily the publication time of the original information. Some reference figures are updated less frequently than others.",
      "External content may be unavailable, changed or withdrawn. Radix Loom does not guarantee that any external figure is complete, current or suitable for a particular purpose.",
    ],
  },
  {
    id: "calculation",
    title: "Calculation limits",
    bullets: [
      "Computer arithmetic can produce small rounding differences, especially with very large, very small or repeatedly rounded values. Displayed values may be rounded for readability.",
      "Unit conversions use common conventions. A different convention or definition can produce a different result.",
      "A custom expression is evaluated as entered. A mistaken value, unit, bracket or operation may lead to an incorrect result. Simplifications and derivatives are estimates or mathematical transformations that should be checked independently.",
    ],
  },
  {
    id: "external-content",
    title: "External content and names",
    paragraphs: [
      "External names, content and references remain associated with their respective sources. Their appearance is solely descriptive and does not imply sponsorship, affiliation or endorsement. Links or references are provided for convenience; their content and availability are outside Radix Loom’s control.",
    ],
  },
  {
    id: "responsibility",
    title: "Responsibility and rights",
    paragraphs: [
      "The Terms of Use describe the limits that may apply to use of the Service. Nothing in this Disclaimer excludes or limits a right or responsibility that cannot lawfully be excluded or limited.",
    ],
  },
];

export default function DisclaimerPage() {
  return (
    <LegalPage
      path="/disclaimer"
      eyebrow="Legal · Disclaimer"
      title="Calculator and data limitations"
      intro={`A plain statement of what ${SITE.name} results are, where their limits lie, and why important figures deserve independent verification.`}
      sections={SECTIONS}
    />
  );
}

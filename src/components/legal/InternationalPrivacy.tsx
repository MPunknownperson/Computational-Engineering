import Link from "next/link";
import { SITE } from "@/lib/site";

/**
 * Public international notice. Most websites (and the regulators themselves)
 * expect one privacy policy that anyone can read — not a page that appears
 * only when an IP geolocation header matches. APP 1, the PDPA, PIPEDA, the
 * LGPD, the APPI and the DPDP framework all treat the notice as something the
 * person can open, including while travelling or on a VPN.
 */
const REGIONS: Array<{
  id: string;
  title: string;
  law: string;
  paragraphs: string[];
  authority: { name: string; url: string };
}> = [
  {
    id: "brazil",
    title: "Brazil",
    law: "Lei Geral de Proteção de Dados (LGPD)",
    paragraphs: [
      "Where the LGPD applies, you may ask us to confirm whether we process personal data about you and to provide access. You may also ask for correction of incomplete, inaccurate or outdated data, and — where the statutory conditions are met — anonymization, blocking or deletion of unnecessary, excessive or unlawfully processed data, information about sharing, portability, and withdrawal of consent. A simplified confirmation is due immediately where the LGPD requires it; a complete declaration is due within the period the statute sets (generally 15 days).",
      "We do not charge a fee to exercise LGPD rights. Calculator results are not used to make significant decisions about you. If a request is unresolved, you may petition the Autoridade Nacional de Proteção de Dados (ANPD). Mandatory Brazilian law takes precedence over a conflicting sentence in this policy.",
    ],
    authority: { name: "ANPD — data-subject rights", url: "https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes" },
  },
  {
    id: "canada",
    title: "Canada",
    law: "PIPEDA and applicable provincial laws",
    paragraphs: [
      "Where the federal Personal Information Protection and Electronic Documents Act applies, we identify the purposes of collection in this policy, collect only what those purposes need, and keep a contact route for privacy questions. You may ask whether we hold personal information about you, request access, and challenge its accuracy. Where PIPEDA’s access timeline applies, we aim to respond within 30 days and will explain any legally permitted extension. Provincial laws, including Québec’s Law 25 and the private-sector laws of Alberta and British Columbia, may add different consent, notice or complaint rules.",
      "Hosting and reference-data providers may process information outside Canada, where it can be subject to foreign law. That fact does not remove your right to ask us about a disclosure. Raise a concern with us first; you may also contact the Office of the Privacy Commissioner of Canada or the relevant provincial commissioner. Being outside Canada when you read this page does not prevent a request.",
    ],
    authority: { name: "Office of the Privacy Commissioner of Canada — access rights", url: "https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/pipeda-compliance-help/pipeda-interpretation-bulletins/interpretations_05_access/" },
  },
  {
    id: "australia",
    title: "Australia",
    law: "Privacy Act 1988 and the Australian Privacy Principles",
    paragraphs: [
      "Australian Privacy Principle 1 expects a clearly expressed, up-to-date privacy policy that people can actually find. This page is that policy: it is public, and it is not shown or hidden according to an IP address. Where the APPs apply, you may request access to personal information we hold about you and correction of information that is inaccurate, out of date, incomplete, irrelevant or misleading. We may need to confirm we are talking about the right record. A refusal, where the law allows one, will be explained together with the complaint route.",
      "Please contact us before escalating a concern to the Office of the Australian Information Commissioner. The OAIC generally expects the organisation to have had a chance to respond, often about 30 days. If personal information is disclosed overseas, APP 8 applies unless an exception does — using a calculator is not consent to waive that principle.",
    ],
    authority: { name: "OAIC — privacy rights in Australia", url: "https://www.oaic.gov.au/engage-with-us/events/privacy-awareness-week/paw-2025/privacy-rights-in-australia" },
  },
  {
    id: "singapore",
    title: "Singapore",
    law: "Personal Data Protection Act (PDPA)",
    paragraphs: [
      "Where the PDPA applies, this policy is the notice of purposes. Consent, when it is required, relates to those purposes. You may withdraw consent with reasonable notice; we will explain the consequences, and we will stop the affected processing unless the law permits or requires it to continue. Optional microphone permission is not a condition of using the calculators.",
      "Subject to PDPA exceptions, you may request access to personal data in our possession or under our control, information about how it was used or disclosed in the past year, and correction of an error or omission. We handle requests as the PDPA requires, including telling you when a response will take longer than 30 days. Personal data is not kept once the purpose has ended and retention is no longer necessary. Transfers outside Singapore follow the PDPA’s transfer limitation. You may also seek assistance from the Personal Data Protection Commission.",
    ],
    authority: { name: "PDPC — individuals’ rights", url: "https://www.pdpc.gov.sg/overview-of-pdpa/data-protection/individual/individuals-overview" },
  },
  {
    id: "japan",
    title: "Japan",
    law: "Act on the Protection of Personal Information (APPI)",
    paragraphs: [
      "Where the APPI applies, the purposes of use are the ones named in this policy: delivering the tool you asked for, storing a formula you chose to save, answering a message, and protecting the site. We do not use a calculator session as permission for a different purpose. Where the statutory conditions are met, you may request disclosure of retained personal data, correction, addition or deletion, cessation of use or erasure, and cessation of third-party provision.",
      "Providing personal data to a third party in a foreign country requires the APPI’s consent or information steps unless a lawful exception applies. Contact us for the details that apply to your information. Unresolved concerns may be raised with the Personal Information Protection Commission. A later amendment to the APPI is not described here as already in force.",
    ],
    authority: { name: "Personal Information Protection Commission of Japan", url: "https://www.ppc.go.jp/en/" },
  },
  {
    id: "india",
    title: "India",
    law: "Digital Personal Data Protection Act 2023 and the DPDP Rules",
    paragraphs: [
      "India’s DPDP Act and the DPDP Rules notified in November 2025 are being brought into force in phases, with many substantive duties running through an implementation period toward May 2027. This page does not pretend that every DPDP provision is already binding. As each provision commences and covers the processing, a Data Principal may request a summary of personal data and processing, correction, completion, updating or erasure, nomination of another person in the circumstances the law provides, and use of the grievance process.",
      "The contact form’s privacy topic is the grievance route. We will say what is needed to find the relevant record and respond under the rules that have commenced. Where the law requires the grievance process to be used before approaching the Data Protection Board, that sequence applies. When the provisions on children are in force, a child is generally a person under 18, and the parental-consent and processing limits apply unless an exception does. Notice of purposes is this public policy — it is not locked to an Indian IP address, and it is available in English.",
    ],
    authority: { name: "Government of India — DPDP Rules notification and implementation overview", url: "https://www.pib.gov.in/PressNoteDetails.aspx?NoteId=156054&ModuleId=3&reg=48&lang=2" },
  },
];

export function InternationalPrivacy() {
  return (
    <section id="international-rights" className="sketch scroll-mt-24" aria-labelledby="international-rights-title">
      <h2 id="international-rights-title" className="text-xl font-extrabold tracking-tight">
        Brazil, Canada, Australia, Singapore, Japan and India
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">
        Most websites publish one privacy policy that anyone can open, then spell out extra rights in that same
        document. Regulators expect the notice to be available — Australia’s APP 1 says so expressly — rather than
        revealed only when a network header looks like a particular country. {SITE.name} follows that practice.
        The clauses below are part of this Privacy Policy. They are not a separate, location-locked supplement,
        and reading them does not require a VPN check, a country menu, or device location.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">
        Which statute applies depends on the law and the processing, not on the IP address of this visit. Travelling
        or using a VPN does not remove a right, and it does not by itself create one. Use the{" "}
        <Link href="/contact" className="font-semibold underline underline-offset-4">contact form</Link> and choose
        the privacy topic. We do not ask for precise GPS location to honour a request.
      </p>
      <div className="mt-5 space-y-4">
        {REGIONS.map((region) => (
          <section key={region.id} id={region.id} aria-labelledby={`${region.id}-title`} className="rounded-xl border-2 border-[color:var(--line)] bg-[#f7f8fb] p-4">
            <h3 id={`${region.id}-title`} className="text-base font-extrabold tracking-tight">{region.title}</h3>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{region.law}</p>
            {region.paragraphs.map((text) => (
              <p key={text} className="mt-3 text-sm leading-relaxed text-slate-700">{text}</p>
            ))}
            <p className="mt-3 text-sm">
              <a href={region.authority.url} className="font-semibold underline underline-offset-4" rel="noreferrer">{region.authority.name}</a>
            </p>
          </section>
        ))}
      </div>
    </section>
  );
}

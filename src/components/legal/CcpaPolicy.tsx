import Link from "next/link";
import { CaliforniaPrivacyIcon } from "./CaliforniaPrivacyIcon";
import { PrivacyChoicesLink } from "./PrivacyChoicesLink";

/** A section of /privacy, not a separate California policy page. */
export function CcpaPolicy() {
  return (
    <section id="ccpa" className="sketch scroll-mt-24" aria-labelledby="ccpa-title">
      <h2 id="ccpa-title" className="flex items-start gap-3 text-xl font-extrabold tracking-tight">
        <CaliforniaPrivacyIcon className="mt-1.5" />
        <span>California — CCPA / CPRA</span>
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">
        This section forms part of this Privacy Policy. Where the California Consumer Privacy Act, as amended by the
        California Privacy Rights Act, applies to our processing, California residents have the rights described below,
        subject to the law’s scope and exceptions. The categories below describe the site’s current data practices;
        they do not claim that we collect recordings that remain with your browser.
      </p>
      <h3 className="mt-5 font-bold">Information, sources and purposes</h3>
      <div className="mt-3 overflow-x-auto rounded-xl border-2 border-[color:var(--line)]" tabIndex={0} role="region" aria-label="CCPA information categories">
        <table className="w-full min-w-[520px] text-left text-sm">
          <caption className="sr-only">Personal information categories, sources and uses</caption>
          <thead className="bg-[#f0f3f7]"><tr>{["Category", "Source and examples", "Purpose"].map((heading) => <th key={heading} scope="col" className="border-b-2 border-[color:var(--line)] px-3 py-2">{heading}</th>)}</tr></thead>
          <tbody>{[
            ["Identifiers", "Optional contact name and email; a random saved-formula workspace reference and opt-out receipt; connection IP processed by infrastructure.", "Answer messages, provide requested storage, remember privacy choices and protect the service."],
            ["Electronic content and request activity", "Formulas and messages you choose to submit; ordinary connection/request details handled by hosting systems.", "Operate the requested tools, handle enquiries and maintain security."],
            ["Browser-only information", "Blackboard strokes/notes and voice phrase memory remain on your device. Microphone audio is handled by your chosen browser recognition path, not received or stored by our server.", "Optional drawing, notes and speech input. A browser-managed speech service may process audio under its own terms."],
          ].map(([category, examples, purpose]) => <tr key={category} className="border-t border-slate-200"><th scope="row" className="px-3 py-3 align-top font-semibold">{category}</th><td className="px-3 py-3 align-top text-slate-700">{examples}</td><td className="px-3 py-3 align-top text-slate-700">{purpose}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">
        The recipients and retention sections above explain hosting, reference-data requests, optional bot checks and browser processing.
        Public reference APIs receive tool selections from our server, not your formula workspace or contact message.
        Those requests do not by themselves establish a contractual service-provider relationship.
      </p>
      <h3 className="mt-5 font-bold">Sale, sharing and your opt-out</h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">
        Radix Loom does not currently sell personal information or share it for cross-context behavioral advertising.
        We nevertheless provide a direct opt-out control and honor Global Privacy Control (GPC) when received.
        A saved choice is not required to benefit from the site’s no-sale/no-sharing practice.
      </p>
      <PrivacyChoicesLink className="mt-4 text-sm text-[#194eb0]" />
      <p className="mt-3 text-sm leading-relaxed text-slate-700">
        The opt-out covers both sale and sharing, is available without an account or identity verification, and does not require
        scrolling through this policy to find the control. The page is public in every location so travel or an uncertain country signal
        does not block a California resident. A received GPC signal applies without an extra confirmation step.
      </p>
      <h3 className="mt-5 font-bold">Other California rights</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
        <li>Request access to or knowledge of personal information, including relevant categories, sources, purposes and disclosures.</li>
        <li>Request deletion or correction, subject to the exceptions and verification rules that apply to those requests.</li>
        <li>Opt out of sale/sharing and, where applicable, limit use or disclosure of sensitive personal information beyond permitted purposes.</li>
        <li>Exercise applicable rights without unlawful discrimination, including through an authorized agent where the law permits.</li>
      </ul>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">
        Use the <Link href="/privacy#your-data" className="font-semibold underline underline-offset-4">saved-formula controls</Link> for self-service export or deletion.
        For other access, correction, deletion or agent requests, use the <Link href="/contact" className="font-semibold underline underline-offset-4">contact form</Link> and select the privacy topic.
        We may need information to locate records and verify those requests. This verification does not apply to the browser opt-out.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">
        Where CCPA deadlines apply, access, correction and deletion requests generally receive a response within 45 days; a permitted
        extension of up to a further 45 days requires notice. An opt-out must be honored as soon as feasibly possible and within the applicable
        15-business-day limit—not held for that 45-day process. The browser control here records the restrictive choice immediately on success.
      </p>
      <p className="mt-4 text-xs leading-relaxed text-slate-600">
        The blue checkmark/X is the official California Opt-Out Icon. It supplements, rather than replaces, the labeled link.
        Reference: <a href="https://oag.ca.gov/privacy/ccpa/icons-download" rel="noreferrer" className="underline underline-offset-4">California Attorney General icon guidance</a> and
        {" "}<a href="https://cppa.ca.gov/regulations/" rel="noreferrer" className="underline underline-offset-4">CPPA regulations</a> (§§ 7013, 7015, 7025–7026).
      </p>
    </section>
  );
}

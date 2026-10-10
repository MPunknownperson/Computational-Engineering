import { SITE } from "@/lib/site";

/**
 * Section: rights and rules under the GDPR (and the UK GDPR / GDPR-style
 * regimes that mirror it). Presented as its own component so the EU material
 * can be reviewed, translated or updated independently of the general policy.
 */
export function GdprPolicy() {
  return (
    <section id="gdpr" className="sketch scroll-mt-24" aria-labelledby="gdpr-title">
      <h2 id="gdpr-title" className="text-xl font-extrabold tracking-tight">
        Your rights under the GDPR
      </h2>

      <p className="mt-3 text-[.95rem] leading-relaxed text-slate-700">
        Where the EU GDPR or UK GDPR applies to the processing described here, this section forms part
        of the same Privacy Policy. <strong>{SITE.name}</strong> is the service name used for privacy enquiries;
        contact us through the privacy topic for the operator’s details and any applicable representative or data-protection contact.
      </p>

      <h3 className="mt-4 text-base font-bold text-[color:var(--ink)]">Legal basis for each purpose</h3>
      <div className="mt-3 max-w-full overflow-x-auto rounded-xl border-2 border-[color:var(--line)]" tabIndex={0} role="region" aria-label="GDPR legal bases">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="bg-[color:var(--paper-2)]"><tr>
            <th className="border-b-2 border-[color:var(--line)] px-3 py-2 text-xs font-extrabold uppercase tracking-wider">Purpose</th>
            <th className="border-b-2 border-[color:var(--line)] px-3 py-2 text-xs font-extrabold uppercase tracking-wider">GDPR basis</th>
          </tr></thead>
          <tbody>
            {[
              ["Providing a calculator, converter or reference tool you ask for", "Art. 6(1)(b) — performance of a task at your request"],
              ["Saving and managing your formulas (optional feature)", "Art. 6(1)(b)/(f) — your request, and legitimate interest in operating the requested feature"],
              ["Answering your contact message", "Art. 6(1)(f) — legitimate interest in responding to you, plus Art. 6(1)(b) for what you ask"],
              ["Security, availability and abuse protection of the site", "Art. 6(1)(f) — legitimate interest; Art. 6(1)(c) where a duty of law applies"],
              ["Optional voice input", "Art. 6(1)(a) — consent, given by pressing the voice button and allowing the microphone"],
            ].map(([purpose, basis]) => (
              <tr key={purpose} className="align-top odd:bg-white even:bg-[#fffdf5]">
                <td className="border-t border-slate-200 px-3 py-2 font-bold text-[color:var(--ink)]">{purpose}</td>
                <td className="border-t border-slate-200 px-3 py-2 text-slate-700">{basis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="mt-4 text-base font-bold text-[color:var(--ink)]">What the GDPR gives you</h3>
      <ul className="mt-3 space-y-2">
        {[
          ["Right of access", "ask for a copy of the personal information we hold about you — for example, your saved formulas or any contact message."],
          ["Right to rectification", "ask us to correct information you have provided that is inaccurate or incomplete."],
          ["Right to erasure", "ask us to delete your information, subject to legal exceptions (the self-service controls on this page already delete saved formulas)."],
          ["Right to restriction and objection", "ask that we limit, or stop, certain processing where the legal conditions are met."],
          ["Right to data portability", "request your saved formulas as structured data; the export control below provides them in JSON."],
          ["Right to withdraw consent", "consent for optional processing can be withdrawn at any time by refusing the microphone prompt or clearing site data."],
          ["Right to lodge a complaint", "you may complain to the data-protection authority of your member state."],
        ].map(([right, what]) => (
          <li key={right} className="flex items-start gap-2.5 text-[.95rem] leading-relaxed text-slate-700">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2f66c0]" aria-hidden="true" />
            <span><strong className="text-[color:var(--ink)]">{right}.</strong> {what}</span>
          </li>
        ))}
      </ul>

      <h3 className="mt-4 text-base font-bold text-[color:var(--ink)]">Transfers and safeguards</h3>
      <p className="mt-2 text-[.95rem] leading-relaxed text-slate-700">
        Where information is processed outside the EEA — for example by the hosting provider or a
        reference-data provider — and the law requires a transfer safeguard, a valid transfer mechanism must apply.
        This policy does not certify a specific provider or contractual arrangement.
        Ask through the contact form for the mechanism relevant to your information.
      </p>

      <p className="mt-4 rounded-xl border-2 border-dashed border-[color:var(--line)] bg-[#fffdf5] px-3.5 py-2.5 text-sm text-slate-600">
        Requests under this section: use the contact form, topic “Privacy or my saved formulas”. We
        verify a request where necessary. Applicable GDPR requests generally require a response within
        one month; a permitted extension of up to two further months requires notice and reasons within
        that initial month. You may complain to the competent EEA authority or the UK Information Commissioner.
      </p>
    </section>
  );
}

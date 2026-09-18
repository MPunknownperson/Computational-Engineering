import type { ReactNode } from 'react';
import { Accessibility, ArrowRight, FileText, Mail, Printer, Scale, ShieldCheck, TriangleAlert } from 'lucide-react';
import { brand, legal, localStores, processors } from '../../lib/legal';

/* ------------------------------------------------------------------------- */
/* Shared document layout                                                    */
/* ------------------------------------------------------------------------- */

interface LegalSection { id: string; title: string; content: ReactNode }

interface LegalDocumentProps {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  lede: ReactNode;
  sections: LegalSection[];
  related: { hash: string; label: string }[];
  onNavigate: (hash: string) => void;
  contactEmail: string;
}

function scrollToSection(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  target.focus({ preventScroll: true });
}

function LegalDocument({ eyebrow, title, icon, lede, sections, related, onNavigate, contactEmail }: LegalDocumentProps) {
  return <div className="content-page legal-page route-enter">
    <header className="page-intro legal-intro">
      <span className="article-meta">{eyebrow} &middot; Effective {legal.effectiveDate} &middot; {legal.versionLabel}</span>
      <h1>{icon}{title}</h1>
      <p>{lede}</p>
    </header>

    <div className="legal-layout">
      <aside className="legal-toc" aria-label="Document contents">
        <h2>Contents</h2>
        <ol>
          {sections.map((section, index) => <li key={section.id}>
            <button type="button" onClick={() => scrollToSection(section.id)}><span>{index + 1}.</span>{section.title}</button>
          </li>)}
        </ol>
        <button type="button" className="secondary-button legal-print" onClick={() => window.print()}><Printer size={15} />Print or save as PDF</button>
      </aside>

      <div className="legal-body">
        {sections.map((section, index) => <section key={section.id} id={section.id} className="legal-section" tabIndex={-1} aria-labelledby={`${section.id}-heading`}>
          <h2 id={`${section.id}-heading`}><span className="legal-number">{index + 1}.</span>{section.title}</h2>
          {section.content}
        </section>)}

        <footer className="legal-footer">
          <div className="legal-footer-contact">
            <Mail size={16} />
            <p>Questions about this document can be sent to <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. This revision took effect on {legal.effectiveDate}.</p>
          </div>
          <nav className="legal-related" aria-label="Related documents">
            <h2>Related documents</h2>
            {related.map(link => <button key={link.hash} type="button" className="text-button" onClick={() => onNavigate(link.hash)}>{link.label}<ArrowRight size={14} /></button>)}
          </nav>
        </footer>
      </div>
    </div>
  </div>;
}

/* ------------------------------------------------------------------------- */
/* Terms and Conditions                                                      */
/* ------------------------------------------------------------------------- */

export function TermsPage({ onNavigate }: { onNavigate: (hash: string) => void }) {
  const site = brand.name;
  const op = legal.operatorShort;
  const sections: LegalSection[] = [
    {
      id: 'terms-acceptance',
      title: 'Agreement to these Terms',
      content: <>
        <p>These Terms and Conditions (the &ldquo;<strong>Terms</strong>&rdquo;) constitute a legally binding agreement between you (&ldquo;<strong>you</strong>&rdquo;, &ldquo;<strong>your</strong>&rdquo; or the &ldquo;<strong>User</strong>&rdquo;) and {legal.operatorName} (the &ldquo;<strong>Operator</strong>&rdquo;, &ldquo;<strong>we</strong>&rdquo;, &ldquo;<strong>us</strong>&rdquo; or &ldquo;<strong>our</strong>&rdquo;) and govern your access to and use of the {site} website, together with its calculators, converters, guides, reference data, exports and any related features (collectively, the &ldquo;<strong>Service</strong>&rdquo;).</p>
        <p>By accessing or using the Service you acknowledge that you have read, understood and agree to be bound by these Terms and by our <button type="button" className="inline-link" onClick={() => onNavigate('privacy')}>Privacy Policy</button>, which is incorporated into these Terms by reference. If you do not agree to these Terms, you must not access or use the Service.</p>
        <p>The Service is provided without charge and without registration. Your acceptance of these Terms is therefore expressed through your use of the Service rather than through a signature or an account.</p>
      </>,
    },
    {
      id: 'terms-definitions',
      title: 'Definitions',
      content: <>
        <p>In these Terms, unless the context requires otherwise:</p>
        <ul className="legal-definitions">
          <li><strong>&ldquo;Content&rdquo;</strong> means all text, formulas, guides, reference tables, data packs, graphics, logos, icons, layouts, software, source code and other material made available through the Service, other than User Material.</li>
          <li><strong>&ldquo;Reference Data&rdquo;</strong> means the tax tables, contribution schedules, statutory thresholds, exchange rates, unit definitions and similar factual data compiled from public sources and presented within the Service with a stated reference date or year and a stated source.</li>
          <li><strong>&ldquo;Results&rdquo;</strong> means any figure, table, chart, schedule, projection, sensitivity analysis, surrogate prediction, comparison or export generated by the Service in response to your inputs.</li>
          <li><strong>&ldquo;User Material&rdquo;</strong> means the inputs, preferences, saved calculations, calculation history, custom units, named constants, saved expressions, conversion pairs, scenarios, measurement profiles and any other data you enter into or create with the Service.</li>
          <li><strong>&ldquo;Third-Party Services&rdquo;</strong> means external services that your browser may contact while you use the Service, as identified in the Privacy Policy, and external websites to which the Service links.</li>
          <li><strong>&ldquo;Device&rdquo;</strong> means the browser and the hardware on which it runs from which you access the Service.</li>
          <li><strong>&ldquo;Applicable Law&rdquo;</strong> means all laws, regulations and binding codes that apply to a party or to the Service from time to time.</li>
        </ul>
        <p>Headings are for convenience only and do not affect interpretation. The words &ldquo;including&rdquo; and &ldquo;for example&rdquo; are illustrative and mean &ldquo;including without limitation&rdquo;.</p>
      </>,
    },
    {
      id: 'terms-eligibility',
      title: 'Eligibility and capacity',
      content: <>
        <p>You may use the Service only if you are at least {legal.minimumAge} years of age, or the age of majority in your jurisdiction if that is higher, and are legally capable of entering into a binding agreement under Applicable Law.</p>
        <p>If you use the Service on behalf of a company, partnership, public body or other organisation, you represent and warrant that you are authorised to bind that organisation to these Terms, in which case &ldquo;you&rdquo; and &ldquo;your&rdquo; also refer to that organisation.</p>
        <p>You are responsible for ensuring that your use of the Service complies with the laws of the country from which you access it, including any export-control, sanctions or professional-conduct rules that apply to you.</p>
      </>,
    },
    {
      id: 'terms-nature',
      title: 'Nature of the Service and no professional advice',
      content: <>
        <p>The Service is a general-purpose informational and educational tool. It produces estimates derived from the inputs you supply and from dated Reference Data, and it displays the formulas, intermediate steps and assumptions used to reach each Result. Results are provided for planning and illustrative purposes only.</p>
        <p className="callout"><TriangleAlert size={16} />Nothing on the Service constitutes, or should be relied upon as, tax, legal, accounting, financial, investment, lending, credit, insurance, pension, medical or other professional advice, nor as an offer, solicitation, recommendation or endorsement of any financial product, provider or course of action.</p>
        <p>The Operator is not a tax agent, accountant, financial adviser, credit broker, lender, deposit-taker, currency dealer, payment institution or healthcare provider, and is not authorised or regulated as any of these. No fiduciary, advisory, client or professional relationship is created between you and the Operator by your use of the Service.</p>
        <p>The body-mass-index tool applies a population-level screening index published by public-health bodies. It is not a diagnosis, does not account for individual factors such as body composition, age, sex or ethnicity, and must not be used as a substitute for consultation with a qualified healthcare professional.</p>
        <p>You should obtain advice from a suitably qualified and, where relevant, licensed professional who is familiar with your circumstances before making any financial, tax, legal or health decision. You alone are responsible for any decision you make, or refrain from making, in reliance on the Service.</p>
      </>,
    },
    {
      id: 'terms-reference-data',
      title: 'Reference Data, currency of information and sources',
      content: <>
        <p>Reference Data is compiled in good faith from publicly available sources such as national and regional tax authorities, central banks, statistical offices and standards bodies. Each reference pack is labelled with its reference year or date and its source so that you can verify it independently.</p>
        <p>Laws, rates, thresholds, allowances, contribution ceilings and reliefs change frequently and sometimes retroactively. The Service may not reflect the most recent amendments, transitional provisions, phase-outs, means-tested reliefs, exemptions, surcharges, local variations, treaty positions or cross-border rules that apply to your situation. Where no verified figure exists for a jurisdiction or levy, the corresponding field is deliberately left empty rather than estimated; a locality selection is a descriptive label and does not, by itself, apply any charge.</p>
        <p>Exchange rates presented by the Service are reference rates published by the European Central Bank and delivered through a Third-Party Service. They are indicative mid-market reference rates, not rates at which any transaction can be executed, and they will differ from the rates, spreads and fees offered by banks, card issuers, brokers and payment providers.</p>
        <p>Previews produced by the locally trained surrogate model are approximations and are labelled as such together with their measured error. Only Results produced by the deterministic calculation engine after you press &ldquo;Calculate&rdquo; are presented as confirmed Results, and even confirmed Results remain estimates that depend on the accuracy of your inputs and of the Reference Data.</p>
        <p>The Operator does not warrant the accuracy, completeness, timeliness or fitness for any purpose of Reference Data or of any information supplied by a Third-Party Service, and has no control over the external sources from which such data is drawn. You should always confirm figures against the primary source and, where appropriate, with a professional before acting on them.</p>
      </>,
    },
    {
      id: 'terms-licence',
      title: 'Licence to use the Service',
      content: <>
        <p>Subject to your compliance with these Terms, the Operator grants you a limited, revocable, non-exclusive, non-transferable and non-sublicensable licence to access and use the Service for your personal use or for the internal purposes of the organisation on whose behalf you act.</p>
        <p>You may use, copy, print, store and share the Results and exports generated from your own inputs, including for commercial purposes, provided that you do not present them as advice, certification or endorsement by the Operator, do not remove or obscure any notice or disclaimer they contain, and do not use them in a manner that is misleading or unlawful.</p>
        <p>Except as expressly permitted in these Terms or by mandatory provisions of Applicable Law, you may not reproduce, distribute, publicly display, transmit, adapt, translate, frame, mirror, sell, rent, lend or otherwise commercially exploit the Content, in whole or in part, without the Operator&rsquo;s prior written consent.</p>
        <p>All rights not expressly granted to you in these Terms are reserved by the Operator and its licensors.</p>
      </>,
    },
    {
      id: 'terms-acceptable-use',
      title: 'Acceptable use',
      content: <>
        <p>You agree that you will not, and will not permit or assist any third party to:</p>
        <ol className="legal-list">
          <li>use the Service in any way that breaches Applicable Law or infringes the rights of any person;</li>
          <li>attempt to gain unauthorised access to, interfere with, damage or disrupt the Service, the systems on which it is hosted, or any Third-Party Service;</li>
          <li>introduce viruses, worms, logic bombs or other malicious or technologically harmful material;</li>
          <li>use robots, spiders, scrapers or other automated means to access the Service at a rate or volume that impairs it, or to harvest Content for republication, other than by search engines acting in accordance with published robots directives;</li>
          <li>decompile, reverse engineer, disassemble or otherwise attempt to derive the source code of the Service except to the extent that Applicable Law expressly permits such activity notwithstanding this restriction;</li>
          <li>present Results as an official assessment, determination, filing, quotation, valuation or professional opinion, or otherwise misrepresent their nature or origin;</li>
          <li>use the Service in connection with any activity where a failure or inaccuracy of the Service could reasonably be expected to lead to death, personal injury or severe physical, environmental or financial damage; the Service is not designed or intended for such high-risk uses;</li>
          <li>remove, alter or obscure any copyright, trade mark, attribution or other proprietary notice or disclaimer within the Service or its exports;</li>
          <li>impersonate the Operator, or state or imply that the Operator endorses you or your use of the Results; or</li>
          <li>circumvent any technical measure the Operator employs to protect the Service.</li>
        </ol>
        <p>The Operator may investigate any suspected breach of this section and may take any action it considers appropriate, including restricting access and reporting unlawful conduct to the competent authorities.</p>
      </>,
    },
    {
      id: 'terms-user-material',
      title: 'User Material and local storage',
      content: <>
        <p>The Service does not offer user accounts and does not transmit your User Material to the Operator. User Material is stored, at your request, exclusively in the local storage of your Device. The Operator does not receive, host, access, moderate, back up or restore User Material and cannot recover it on your behalf.</p>
        <p>You retain all rights, title and interest in your User Material. You are solely responsible for User Material, for maintaining your own backups (for example by using the export functions), and for the consequences of clearing browser data, using private browsing modes, switching Devices or browsers, or any storage eviction performed by your browser.</p>
        <p>Where you import a workspace file, you are responsible for its content and origin. The Service validates the format of imported files but cannot verify that the definitions they contain are correct, and you assume the risk of any Results affected by imported or user-defined content.</p>
        <p>Custom units, constants, expressions and other definitions you create become inputs to the calculation engine. Results that depend on such definitions are marked accordingly. The Operator is not responsible for any inaccuracy in Results arising from user-defined content.</p>
        <p>If you choose to send the Operator feedback, suggestions or corrections (for example a corrected tax threshold with its source), you grant the Operator a perpetual, irrevocable, worldwide, royalty-free licence to use, incorporate and publish that feedback without any obligation of attribution or compensation, and you confirm that you have the right to grant that licence.</p>
      </>,
    },
    {
      id: 'terms-ip',
      title: 'Intellectual property',
      content: <>
        <p>The Service and the Content, including the selection, arrangement, presentation and coding of Reference Data, are owned by or licensed to the Operator and are protected by copyright, database, trade mark and other intellectual-property laws worldwide.</p>
        <p>The name &ldquo;{site}&rdquo;, the {site} logo and wordmark, and any associated get-up are trade names, trade marks or trade dress of the Operator, whether or not registered. You may refer to the Service by name for the purpose of identifying it, but you may not use these marks in any way that suggests affiliation, sponsorship or endorsement, or that is likely to cause confusion, without the Operator&rsquo;s prior written consent.</p>
        <p>The Operator does not claim any proprietary right in mathematical formulas, statutory texts, official rates or other facts and public-domain materials as such. Names, marks and logos of tax authorities, central banks, standards bodies and other institutions referenced as sources, and flag images, belong to their respective owners; their appearance in the Service is for identification only and does not imply any affiliation with, or endorsement by, those bodies.</p>
        <p>The Service incorporates open-source software components that are licensed under their respective licences. Nothing in these Terms restricts the rights granted to you by those licences in respect of those components.</p>
      </>,
    },
    {
      id: 'terms-third-parties',
      title: 'Third-Party Services and links',
      content: <>
        <p>To deliver particular features, your browser may make requests directly to Third-Party Services: a reference-rate provider when you request an exchange rate, image hosts that supply flag images, and a font-delivery service. These requests are described in the Privacy Policy. Third-Party Services are provided by independent parties under their own terms and privacy policies, over which the Operator has no control.</p>
        <p>The Service also links to external websites, including the primary sources for Reference Data. Such links are provided for your convenience and verification only. The Operator does not endorse, and is not responsible or liable for, the content, accuracy, availability, security or practices of any external website or Third-Party Service.</p>
        <p>The Operator may add, replace, suspend or discontinue any Third-Party Service at any time without notice, and does not guarantee that any Third-Party Service will remain available or compatible with the Service.</p>
      </>,
    },
    {
      id: 'terms-availability',
      title: 'Availability, changes and discontinuation of the Service',
      content: <>
        <p>The Service is provided free of charge. The Operator may modify, update, suspend, restrict or discontinue the Service or any part of it, including any calculator, converter, guide, reference pack or feature, at any time, with or without notice, and shall have no liability to you or to any third party for doing so.</p>
        <p>The Operator does not guarantee that the Service will be available at any particular time, uninterrupted, secure or free from errors, or that any defect will be corrected. Access may be interrupted by maintenance, hosting or network failures, or events outside the Operator&rsquo;s reasonable control.</p>
        <p>The Service may continue to function after first load while your Device is offline. Offline operation depends on your browser&rsquo;s caching behaviour, which the Operator does not control, and is not guaranteed.</p>
        <p>The Operator is under no obligation to update Reference Data, to add jurisdictions, or to do so within any particular time after a change in law.</p>
      </>,
    },
    {
      id: 'terms-warranties',
      title: 'Disclaimer of warranties',
      content: <>
        <p className="legal-caps">To the fullest extent permitted by Applicable Law, the Service, the Content, the Reference Data and all Results are provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranty, representation, condition or guarantee of any kind, whether express, implied, statutory or otherwise, including without limitation any implied warranties or conditions of merchantability, satisfactory quality, fitness for a particular purpose, accuracy, completeness, timeliness, title and non-infringement, all of which are expressly disclaimed.</p>
        <p>Without limiting the foregoing, the Operator makes no warranty or representation that: (a) the Service will meet your requirements or expectations; (b) any Result will be accurate, complete, current, reliable or suitable for your circumstances; (c) any Result will be accepted or relied upon by any tax authority, lender, court, employer, insurer or other third party; (d) any error or omission will be identified or corrected; or (e) the Service or the servers that deliver it are free of viruses or other harmful components.</p>
        <p>Some jurisdictions do not allow the exclusion of certain warranties or conditions. To the extent such exclusions are not permitted in your jurisdiction, the relevant warranties are limited to the minimum scope and shortest duration permitted by Applicable Law.</p>
      </>,
    },
    {
      id: 'terms-liability',
      title: 'Limitation of liability',
      content: <>
        <p className="legal-caps">To the fullest extent permitted by Applicable Law, in no event shall the Operator or its owners, officers, directors, employees, contractors, contributors, licensors or suppliers be liable to you or to any third party for any indirect, incidental, special, consequential, exemplary or punitive damages, or for any loss of profits, revenue, savings, business, opportunity, goodwill or data, or for any tax liability, assessment, penalty, interest, surcharge, overpayment or underpayment, loan, credit, currency or investment loss, missed deadline, or cost of procuring substitute services, arising out of or in connection with the Service, the Content, the Reference Data, any Result or these Terms, whether based on contract, tort (including negligence), breach of statutory duty, strict liability or any other legal theory, and even if the Operator has been advised of the possibility of such loss.</p>
        <p>Because the Service is provided free of charge, to the fullest extent permitted by Applicable Law the total aggregate liability of the Operator and the persons listed above for all claims of any kind arising out of or relating to the Service or these Terms shall not exceed one hundred United States dollars (USD 100) or the equivalent in the currency of your place of residence.</p>
        <p>Nothing in these Terms excludes or limits any liability that cannot be excluded or limited under Applicable Law, including, where such law so provides, liability for death or personal injury caused by negligence, for fraud or fraudulent misrepresentation, or for gross negligence or wilful misconduct. If you are a consumer, nothing in these Terms affects your statutory rights, which remain in full force.</p>
        <p>You acknowledge that the exclusions and limitations in this section and in the preceding section reflect a reasonable allocation of risk in light of the free, informational nature of the Service, and that the Operator would not make the Service available without them.</p>
      </>,
    },
    {
      id: 'terms-indemnity',
      title: 'Indemnification',
      content: <>
        <p>To the extent permitted by Applicable Law, you agree to indemnify, defend and hold harmless the Operator and its owners, officers, directors, employees, contractors, contributors and licensors from and against any and all claims, demands, liabilities, damages, losses, costs and expenses (including reasonable legal fees) arising out of or in connection with: (a) your breach of these Terms; (b) your violation of Applicable Law or of the rights of any third party; or (c) any representation you make to a third party based on Results generated by the Service.</p>
        <p>This section does not apply to you to the extent that you are a consumer and such an indemnity is unenforceable under the mandatory consumer-protection law of your country of residence.</p>
      </>,
    },
    {
      id: 'terms-privacy',
      title: 'Privacy',
      content: <>
        <p>The Operator&rsquo;s handling of information in connection with the Service is described in the <button type="button" className="inline-link" onClick={() => onNavigate('privacy')}>Privacy Policy</button>. In summary, the Service does not require an account, does not use analytics or advertising technologies, keeps your inputs and history on your Device, and causes your browser to contact a small number of Third-Party Services only for specific features. By using the Service you acknowledge that you have read the Privacy Policy.</p>
      </>,
    },
    {
      id: 'terms-termination',
      title: 'Suspension and termination',
      content: <>
        <p>The Operator may restrict, suspend or terminate your access to all or part of the Service at any time, with or without cause and with or without notice, including where the Operator reasonably believes that you have breached these Terms or that your use presents a risk to the Service, to other users or to third parties. Because the Service has no accounts, such measures may be implemented through technical restrictions.</p>
        <p>You may stop using the Service at any time. You may delete User Material by using the controls within the Service or by clearing site data for the Service in your browser settings.</p>
        <p>Any provision of these Terms which by its nature is intended to survive termination, including the sections on intellectual property, disclaimer of warranties, limitation of liability, indemnification, governing law and general provisions, shall survive termination or expiry of these Terms.</p>
      </>,
    },
    {
      id: 'terms-changes',
      title: 'Changes to these Terms',
      content: <>
        <p>The Operator may revise these Terms from time to time, for example to reflect changes in the Service, in Applicable Law or in the Third-Party Services used. The current version will always be published on this page with its effective date and revision label. Where a change is material, the Operator will give reasonable advance notice by posting a notice within the Service before the change takes effect, where practicable.</p>
        <p>Because the Service does not collect contact details, the Operator cannot notify you individually. You are encouraged to review these Terms periodically. Your continued use of the Service after the effective date of a revised version constitutes your acceptance of the revised Terms. If you do not agree to a revision, you must stop using the Service.</p>
      </>,
    },
    {
      id: 'terms-law',
      title: 'Governing law and dispute resolution',
      content: <>
        <p>These Terms, and any dispute or claim (including non-contractual disputes or claims) arising out of or in connection with them, their subject matter or formation, or with the Service, shall be governed by and construed in accordance with {legal.governingLaw}, without regard to its conflict-of-law rules.</p>
        <p>Subject to the following paragraph, the courts of that jurisdiction shall have exclusive jurisdiction to settle any such dispute or claim.</p>
        <p><strong>Consumers.</strong> If you are a consumer, you will additionally benefit from any mandatory provisions of the law of the country in which you are habitually resident. Nothing in this section affects your rights as a consumer to rely on such mandatory provisions or to bring proceedings in the courts of your country of residence where Applicable Law grants you that right.</p>
        <p><strong>Informal resolution.</strong> Before commencing formal proceedings, each party agrees to attempt in good faith to resolve any dispute by written notice to the other party (in the Operator&rsquo;s case, to <a href={`mailto:${legal.legalEmail}`}>{legal.legalEmail}</a>) and to allow at least thirty (30) days for a negotiated resolution. This paragraph does not prevent either party from seeking urgent interim or injunctive relief.</p>
        <p><strong>Alternative dispute resolution.</strong> The Operator is not obliged to, and does not undertake to, participate in dispute-resolution proceedings before a consumer arbitration board or similar body unless required to do so by Applicable Law.</p>
      </>,
    },
    {
      id: 'terms-general',
      title: 'General provisions',
      content: <>
        <ul className="legal-list">
          <li><strong>Entire agreement.</strong> These Terms, together with the Privacy Policy and any notices displayed within the Service, constitute the entire agreement between you and the Operator concerning the Service and supersede all prior or contemporaneous understandings and agreements, whether written or oral, relating to that subject matter.</li>
          <li><strong>Severability.</strong> If any provision of these Terms is held by a court or other competent authority to be invalid, illegal or unenforceable, that provision shall be enforced to the maximum extent permissible and, to the extent necessary, deemed modified so as to be valid and enforceable, and the remaining provisions shall continue in full force and effect.</li>
          <li><strong>No waiver.</strong> No failure or delay by the Operator in exercising any right or remedy under these Terms shall operate as a waiver of that right or remedy, nor shall any single or partial exercise preclude any further exercise.</li>
          <li><strong>Assignment.</strong> You may not assign, transfer or sub-license any of your rights or obligations under these Terms without the Operator&rsquo;s prior written consent. The Operator may assign or transfer its rights and obligations under these Terms to any successor in interest to the Service, on notice to you published within the Service.</li>
          <li><strong>Third-party rights.</strong> Except for the persons expressly entitled to the benefit of the limitation-of-liability and indemnification sections, no person other than you and the Operator has any right to enforce any provision of these Terms.</li>
          <li><strong>Force majeure.</strong> The Operator shall not be liable for any failure or delay in performing its obligations that results from causes beyond its reasonable control, including acts of God, natural disaster, epidemic, war, terrorism, civil unrest, labour dispute, governmental action, failure of utilities, hosting or telecommunications networks, or failure of a Third-Party Service.</li>
          <li><strong>Relationship of the parties.</strong> Nothing in these Terms creates any partnership, joint venture, agency, franchise, employment or fiduciary relationship between you and the Operator.</li>
          <li><strong>Notices.</strong> Notices to the Operator must be sent by email to <a href={`mailto:${legal.legalEmail}`}>{legal.legalEmail}</a>. The Operator may give notice to users generally by publishing it within the Service.</li>
          <li><strong>Language.</strong> These Terms are drafted in English. Any translation is provided for convenience only; in the event of inconsistency, the English version prevails to the extent permitted by Applicable Law.</li>
        </ul>
      </>,
    },
    {
      id: 'terms-contact',
      title: 'Contact',
      content: <>
        <p>Questions, notices and requests concerning these Terms should be addressed to {op} at <a href={`mailto:${legal.legalEmail}`}>{legal.legalEmail}</a>. Reports of suspected errors in Reference Data are welcome and should, where possible, include the jurisdiction, the reference year, the figure you believe to be incorrect and a link to the primary source. See also the <button type="button" className="inline-link" onClick={() => onNavigate('contact')}>Contact page</button>.</p>
      </>,
    },
  ];

  return <LegalDocument
    eyebrow="Legal"
    title="Terms and Conditions"
    icon={<Scale size={25} />}
    lede={<>These Terms govern your use of {site}. They explain what the Service is, what it is not, how you may use it, and how responsibility is allocated between you and the Operator. Please read them together with the Privacy Policy.</>}
    sections={sections}
    related={[{ hash: 'privacy', label: 'Privacy Policy' }, { hash: 'disclaimer', label: 'Disclaimer' }, { hash: 'accessibility', label: 'Accessibility statement' }, { hash: 'about', label: `About ${site}` }]}
    onNavigate={onNavigate}
    contactEmail={legal.legalEmail}
  />;
}

/* ------------------------------------------------------------------------- */
/* Privacy Policy                                                            */
/* ------------------------------------------------------------------------- */

export function PrivacyPage({ onNavigate }: { onNavigate: (hash: string) => void }) {
  const site = brand.name;
  const sections: LegalSection[] = [
    {
      id: 'privacy-summary',
      title: 'Summary',
      content: <>
        <p>This Privacy Policy (the &ldquo;<strong>Policy</strong>&rdquo;) explains how {legal.operatorName} (the &ldquo;<strong>Operator</strong>&rdquo;, &ldquo;<strong>we</strong>&rdquo;, &ldquo;<strong>us</strong>&rdquo; or &ldquo;<strong>our</strong>&rdquo;) handles information when you use the {site} website and its tools (the &ldquo;<strong>Service</strong>&rdquo;). It has been written to describe precisely how the Service is built, which means that much of it describes what does <em>not</em> happen.</p>
        <ul className="legal-summary">
          <li><ShieldCheck size={15} />There are no accounts, no registration and no login. We do not ask for your name, email address or any other identifier.</li>
          <li><ShieldCheck size={15} />We use no analytics, advertising technology, tracking pixels, fingerprinting or social-media plug-ins, and we set no cookies.</li>
          <li><ShieldCheck size={15} />The figures you enter (income, loan amounts, measurements and so on) are processed entirely inside your browser and are never transmitted to us or to anyone else.</li>
          <li><ShieldCheck size={15} />Your preferences, calculation history and saved items are stored in your browser&rsquo;s local storage on your own Device. We cannot see them.</li>
          <li><ShieldCheck size={15} />Your browser contacts a small number of third-party services only for specific features: a reference exchange rate when you ask for one, flag images, and web fonts. Those requests unavoidably include your IP address.</li>
          <li><ShieldCheck size={15} />We do not sell, rent or &ldquo;share&rdquo; personal information (as those terms are defined in United States state privacy laws) and never have.</li>
        </ul>
        <p>For the purposes of the EU General Data Protection Regulation (&ldquo;<strong>GDPR</strong>&rdquo;), the UK GDPR and similar laws, the Operator is the controller of the limited personal data described in sections 5 and 6. You can reach us at <a href={`mailto:${legal.privacyEmail}`}>{legal.privacyEmail}</a>.</p>
      </>,
    },
    {
      id: 'privacy-scope',
      title: 'Scope and definitions',
      content: <>
        <p>This Policy applies to all visitors to and users of the Service, wherever located. It does not apply to third-party websites to which the Service links, nor to the independent practices of the third-party services described in section 5, each of which is governed by its own privacy policy.</p>
        <p>&ldquo;<strong>Personal data</strong>&rdquo; (or &ldquo;personal information&rdquo;) means any information relating to an identified or identifiable natural person. &ldquo;<strong>Processing</strong>&rdquo; means any operation performed on personal data, such as collection, storage, use, disclosure or deletion. &ldquo;<strong>Device</strong>&rdquo; means the browser and hardware you use to access the Service. &ldquo;<strong>Local storage</strong>&rdquo; means the browser storage area (the Web Storage API) that a website may use to keep data on a Device.</p>
      </>,
    },
    {
      id: 'privacy-not-collected',
      title: 'Information we do not collect',
      content: <>
        <p>The Operator does not collect, receive or store any of the following through the Service:</p>
        <ul className="legal-list">
          <li>names, email addresses, telephone numbers, postal addresses or dates of birth;</li>
          <li>account credentials, passwords or authentication tokens;</li>
          <li>payment or banking details; the Service is free and processes no payments;</li>
          <li>government identifiers such as tax or social-security numbers;</li>
          <li>the financial, tax, property, vehicle, body-measurement or other figures you enter into any calculator or converter;</li>
          <li>the contents of your calculation history, saved calculations or custom definitions;</li>
          <li>precise geolocation; your choice of country or region within the Service is a preference held on your Device and is not transmitted to us;</li>
          <li>behavioural analytics, page-view statistics, heat maps or session recordings; or</li>
          <li>cross-site identifiers, advertising identifiers or device fingerprints.</li>
        </ul>
        <p>The Operator maintains no database of users. We therefore have no record that you have used the Service unless you choose to contact us.</p>
      </>,
    },
    {
      id: 'privacy-local',
      title: 'Information stored on your Device only',
      content: <>
        <p>To make the Service useful across visits, it stores certain data in your browser&rsquo;s local storage. This data remains on your Device, is readable only by the Service when loaded from the same origin, and is never transmitted to the Operator or to any third party. The Operator has no technical means of accessing, reading, recovering or deleting it.</p>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead><tr><th scope="col">Storage key</th><th scope="col">What it holds</th></tr></thead>
            <tbody>
              {localStores.map(store => <tr key={store.key}><td><code>{store.key}</code></td><td>{store.holds}</td></tr>)}
            </tbody>
          </table>
        </div>
        <p>The Service also keeps a short-lived, in-memory cache of any exchange rates it has fetched during the current page session so that repeated requests for the same currency pair do not generate repeated network requests. This cache is discarded when the page is closed.</p>
        <p><strong>Your controls.</strong> You can switch off the remembering of inputs in Preferences (&ldquo;Remember inputs&rdquo;), delete individual history entries or clear the history from the History page, export or delete your utility-studio workspace, and remove everything at once by clearing site data for the Service in your browser settings. Private or incognito browsing modes discard local storage when the session ends.</p>
        <p><strong>Legal position.</strong> Because this data never reaches the Operator, the Operator does not process it within the meaning of data-protection law. Storage of this data on your Device is strictly necessary to provide functionality that you explicitly request &mdash; remembering your preferences and the items you choose to keep &mdash; and for that reason no consent banner is displayed. Where the law of your country nevertheless requires your consent for such storage, your use of the relevant feature, which you can disable at any time, constitutes that request and consent.</p>
      </>,
    },
    {
      id: 'privacy-third-parties',
      title: 'Requests made by your browser to third-party services',
      content: <>
        <p>Certain features require your browser to request resources directly from independent third-party services. These requests are made from your Device to the third party; they are not routed through any server operated by the Operator, and the Operator receives no data back other than the requested resource being displayed in your browser. By the nature of internet protocols, every such request discloses to the recipient your IP address, your browser&rsquo;s user-agent string and, in some cases, the address of the page that made the request.</p>
        <div className="legal-table-wrap">
          <table className="legal-table legal-table-wide">
            <thead><tr><th scope="col">Service</th><th scope="col">Purpose</th><th scope="col">When it is contacted</th><th scope="col">Data disclosed to it</th></tr></thead>
            <tbody>
              {processors.map(processor => <tr key={processor.name}>
                <td><strong>{processor.name}</strong><br /><small>{processor.host}</small><br /><a href={processor.policyUrl} target="_blank" rel="noopener noreferrer">Provider policy</a></td>
                <td>{processor.purpose}</td>
                <td>{processor.trigger}</td>
                <td>{processor.dataSent}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <p>Each of these providers acts as an independent controller of the data it receives and may retain it in its own technical or security logs in accordance with its own policy. The Operator has no access to those logs. To the best of the Operator&rsquo;s knowledge, none of these requests causes cookies to be set in your browser.</p>
        <p><strong>Your options.</strong> Reference rates are requested only when you choose a live or dated reference rate; you may enter a rate manually instead. If you block requests to the font service, the Service falls back to fonts installed on your Device. If you block the flag image hosts, a text badge is shown in place of each flag. In every case the calculators continue to function.</p>
      </>,
    },
    {
      id: 'privacy-hosting',
      title: 'Hosting and technical logs',
      content: <>
        <p>The Service is delivered as a single static file by a web-hosting provider. When you load or reload the page, the hosting provider&rsquo;s servers receive the data contained in any standard web request: your IP address, the date and time, the address requested, your browser&rsquo;s user-agent string and, where your browser sends it, the referring page. Hosting providers commonly keep this data for a limited period in technical logs used for security, capacity and abuse prevention.</p>
        <p>Navigation within the Service uses the fragment portion of the address (the part after the &ldquo;#&rdquo;). Browsers do not send the fragment to any server. Consequently, which calculator you open, which country or region you select and which guide you read are not disclosed to the hosting provider or to anyone else.</p>
        <p>To the extent the Operator has access to such logs, it uses them solely to maintain the security and availability of the Service, does not combine them with any other data, does not use them to identify individual visitors, and does not retain them beyond the period the hosting provider keeps them for technical purposes.</p>
      </>,
    },
    {
      id: 'privacy-legal-bases',
      title: 'Purposes and legal bases',
      content: <>
        <p>Where the GDPR, the UK GDPR or a similar law applies, the Operator relies on the following legal bases for the limited processing described in this Policy:</p>
        <ul className="legal-list">
          <li><strong>Legitimate interests</strong> (Article 6(1)(f) GDPR) in delivering the Service securely and reliably, in preventing abuse, and in serving the static page and its resources when you request them. We have assessed that these interests are not overridden by your interests or fundamental rights, given the minimal data involved and the absence of any profiling.</li>
          <li><strong>Provision of a service you request</strong> (Article 6(1)(b) GDPR, or legitimate interests where no contract exists) for third-party requests that you initiate, such as fetching a reference exchange rate for a pair you selected.</li>
          <li><strong>Consent</strong> (Article 6(1)(a) GDPR) only where the law of your country requires consent for a particular operation, such as storage of preferences on your Device, in which case your use of the optional feature constitutes consent that you can withdraw at any time by disabling the feature or clearing site data.</li>
          <li><strong>Compliance with a legal obligation</strong> (Article 6(1)(c) GDPR) where we are required to retain or disclose information by Applicable Law.</li>
        </ul>
        <p>The Service does not make any decision about you based solely on automated processing that produces legal or similarly significant effects (Article 22 GDPR). The surrogate model referred to in the Methodology page is trained inside your browser on synthetic samples generated from the calculation engine; it does not learn from, profile or evaluate you.</p>
      </>,
    },
    {
      id: 'privacy-cookies',
      title: 'Cookies and similar technologies',
      content: <>
        <p>The Service sets no cookies of any kind, whether first-party or third-party, session or persistent, essential or otherwise. It does not use web beacons, pixel tags, local shared objects, IndexedDB identifiers, service-worker identifiers or browser fingerprinting.</p>
        <p>The only client-side storage used is the browser local storage described in section 4, which holds functional data you have chosen to keep and contains no unique identifier assigned by the Operator. Because no non-essential storage is used, no cookie consent banner is displayed.</p>
        <p>You can view, edit or delete the Service&rsquo;s local storage through your browser&rsquo;s developer tools or by clearing site data. Doing so resets the Service to its default state and removes your history, saved calculations and custom definitions.</p>
      </>,
    },
    {
      id: 'privacy-retention',
      title: 'Data retention',
      content: <>
        <ul className="legal-list">
          <li><strong>Local storage on your Device</strong> persists until you delete it, clear browser data, or your browser evicts it under storage pressure. The calculation history keeps a bounded number of recent entries and discards the oldest automatically; saved calculations are kept until you remove them.</li>
          <li><strong>Technical logs</strong> held by the hosting provider or the third-party services are retained for the periods set out in their respective policies, which the Operator does not control.</li>
          <li><strong>Correspondence.</strong> If you contact us, we keep the correspondence for as long as necessary to deal with your enquiry, to keep a record of any correction made to Reference Data, and to comply with legal obligations, after which it is deleted. In most cases this is no longer than twenty-four (24) months after the matter is closed.</li>
        </ul>
      </>,
    },
    {
      id: 'privacy-sharing',
      title: 'Disclosure of personal data',
      content: <>
        <p>The Operator does not sell, rent, trade or otherwise make personal data available to third parties for monetary or other valuable consideration, and does not share personal data for cross-context behavioural advertising. The Operator has not done so in the preceding twelve (12) months.</p>
        <p>The Operator does not disclose personal data to third parties except in the following limited circumstances:</p>
        <ul className="legal-list">
          <li>to the third-party services that your browser contacts directly, as described in section 5, and to the hosting provider, as described in section 6;</li>
          <li>to professional advisers, such as lawyers or accountants, under a duty of confidentiality, where necessary to obtain advice or to establish, exercise or defend legal claims;</li>
          <li>where required by Applicable Law, court order or a binding request from a public authority, or where disclosure is necessary to protect the rights, property or safety of the Operator, its users or the public; or</li>
          <li>to a successor in the event of a merger, acquisition, reorganisation or transfer of the Service, in which case the successor will be bound by this Policy in respect of any personal data transferred.</li>
        </ul>
        <p>Because the Operator holds almost no personal data, any such disclosure would in practice be limited to correspondence you have sent us and to technical logs.</p>
      </>,
    },
    {
      id: 'privacy-transfers',
      title: 'International transfers',
      content: <>
        <p>The third-party services described in section 5 may be located in, or process data in, countries other than your own, including the United States. Because your browser contacts these services directly, the transfer of your IP address to them is made by your Device rather than by the Operator. Where those providers are subject to the GDPR or UK GDPR they rely on their own transfer mechanisms, such as adequacy decisions (including the EU&ndash;U.S. Data Privacy Framework and its UK extension) or standard contractual clauses, details of which are available in their respective privacy policies.</p>
        <p>Correspondence you send to the Operator will be processed in the country in which the Operator is established and, where necessary, by email providers acting on the Operator&rsquo;s behalf under appropriate safeguards.</p>
      </>,
    },
    {
      id: 'privacy-rights',
      title: 'Your rights and how to exercise them',
      content: <>
        <p>Depending on where you live, you may have some or all of the following rights in relation to personal data that the Operator holds about you. Because the Operator holds no personal data about you other than any correspondence you have sent and, transiently, technical logs, these rights will in most cases be exercised directly on your Device by using the controls described in section 4.</p>
        <p><strong>European Economic Area, United Kingdom and Switzerland.</strong> You have the right to request access to, rectification or erasure of, or restriction of the processing of, your personal data; the right to data portability; the right to object to processing based on legitimate interests; the right to withdraw consent at any time without affecting the lawfulness of processing before withdrawal; and the right to lodge a complaint with a supervisory authority, in particular in the member state of your habitual residence, place of work or place of the alleged infringement (in the United Kingdom, the Information Commissioner&rsquo;s Office).</p>
        <p><strong>California and other United States states.</strong> If you are a resident of California, you have the right under the California Consumer Privacy Act, as amended by the California Privacy Rights Act, to know what personal information is collected, used, disclosed or sold; to request deletion and correction; to opt out of the sale or sharing of personal information; to limit the use of sensitive personal information; and not to be discriminated against for exercising these rights. The Operator does not sell or share personal information, does not collect sensitive personal information, and has no actual knowledge of selling or sharing the personal information of consumers under sixteen (16) years of age. The Operator treats browser-level opt-out preference signals such as Global Privacy Control as a valid request to opt out; because no sale or sharing takes place, such a signal has no additional effect. You may designate an authorised agent to make a request on your behalf. Residents of other states with comprehensive privacy laws, including Colorado, Connecticut, Virginia, Utah, Texas and Oregon, have comparable rights, which may be exercised in the same way.</p>
        <p><strong>Other jurisdictions.</strong> Residents of Brazil (LGPD), Canada (PIPEDA and provincial laws), Australia, New Zealand, Japan, South Korea, India, South Africa and other countries with data-protection legislation have equivalent rights under those laws to the extent applicable.</p>
        <p><strong>How to exercise your rights.</strong> Send your request to <a href={`mailto:${legal.privacyEmail}`}>{legal.privacyEmail}</a>. We will respond within the period required by Applicable Law (one month under the GDPR, extendable where permitted; forty-five days under the CCPA). Because we do not hold identifying data, we may only be able to verify and act upon requests that relate to correspondence sent from the email address making the request. We will not charge a fee for handling a request unless it is manifestly unfounded or excessive, in which case we may charge a reasonable fee or refuse to act, as Applicable Law permits.</p>
      </>,
    },
    {
      id: 'privacy-children',
      title: 'Children',
      content: <>
        <p>The Service is not directed to children under {legal.minimumAge} years of age, or under the applicable age of digital consent in your country if different, and the Operator does not knowingly collect personal data from children. Because the Service collects no personal data through its ordinary use, no personal data of children is collected by it. If you believe that a child has sent personal data to the Operator by email, please contact us at <a href={`mailto:${legal.privacyEmail}`}>{legal.privacyEmail}</a> so that it can be deleted.</p>
      </>,
    },
    {
      id: 'privacy-security',
      title: 'Security',
      content: <>
        <p>The Service is designed to minimise risk by design and by default: it is delivered as a static page, performs all calculations locally, stores nothing on any server, and therefore holds no repository of user data that could be breached. Imported workspace files are validated before use, and custom definitions cannot overwrite standard units or reserved names.</p>
        <p>The security of data held in your browser&rsquo;s local storage depends on the security of your Device. You should use a device lock, keep your browser up to date, and clear site data after using the Service on a shared or public computer. No method of transmission or storage is completely secure, and the Operator cannot guarantee absolute security.</p>
      </>,
    },
    {
      id: 'privacy-signals',
      title: 'Do Not Track and opt-out preference signals',
      content: <>
        <p>Because the Service does not track visitors, it behaves identically whether or not your browser sends a &ldquo;Do Not Track&rdquo; header or a Global Privacy Control signal. Where Applicable Law treats such a signal as an exercise of a legal right to opt out of the sale or sharing of personal information or of targeted advertising, the Operator honours it; no such activity occurs in any event.</p>
      </>,
    },
    {
      id: 'privacy-links',
      title: 'Links to other websites',
      content: <>
        <p>The Service links to external websites, including the tax authorities, central banks and standards bodies cited as sources for Reference Data, and the policies of the third-party services listed above. Those websites are operated independently, and this Policy does not apply to them. You should review the privacy policy of any website you visit.</p>
      </>,
    },
    {
      id: 'privacy-changes',
      title: 'Changes to this Policy',
      content: <>
        <p>The Operator may update this Policy from time to time to reflect changes in the Service, in the third-party services it uses or in Applicable Law. The current version will always be published on this page with its effective date and revision label, and a summary of material changes will be noted here for a reasonable period. Because the Operator does not collect contact details, it cannot notify you individually; please review this Policy periodically. Your continued use of the Service after a revised Policy takes effect indicates that you have read it.</p>
      </>,
    },
    {
      id: 'privacy-contact',
      title: 'Contact and complaints',
      content: <>
        <p>The controller responsible for the processing described in this Policy is {legal.operatorName}. Privacy enquiries and requests to exercise your rights should be sent to <a href={`mailto:${legal.privacyEmail}`}>{legal.privacyEmail}</a>. General enquiries may be sent to <a href={`mailto:${legal.contactEmail}`}>{legal.contactEmail}</a>.</p>
        <p>If you are dissatisfied with our response, you have the right to lodge a complaint with the data-protection supervisory authority in your country of residence. We would nonetheless appreciate the opportunity to address your concern first.</p>
      </>,
    },
  ];

  return <LegalDocument
    eyebrow="Legal"
    title="Privacy Policy"
    icon={<ShieldCheck size={25} />}
    lede={<>How {site} handles information: no accounts, no analytics, no cookies, your data kept on your own Device, and a precise description of the few requests your browser makes to third parties when you use specific features.</>}
    sections={sections}
    related={[{ hash: 'terms', label: 'Terms and Conditions' }, { hash: 'disclaimer', label: 'Disclaimer' }, { hash: 'contact', label: 'Contact' }, { hash: 'about', label: `About ${site}` }]}
    onNavigate={onNavigate}
    contactEmail={legal.privacyEmail}
  />;
}

/* ------------------------------------------------------------------------- */
/* Disclaimer                                                                */
/* ------------------------------------------------------------------------- */

export function DisclaimerPage({ onNavigate }: { onNavigate: (hash: string) => void }) {
  const site = brand.name;
  const sections: LegalSection[] = [
    {
      id: 'disclaimer-general',
      title: 'General',
      content: <>
        <p>The information, calculators, converters, guides and Reference Data made available on {site} are provided for general informational and educational purposes only. All Results are estimates based on the inputs you provide and on Reference Data that carries a stated reference date. This Disclaimer supplements, and should be read together with, the <button type="button" className="inline-link" onClick={() => onNavigate('terms')}>Terms and Conditions</button>, which contain the full disclaimer of warranties and limitation of liability.</p>
      </>,
    },
    {
      id: 'disclaimer-advice',
      title: 'No professional advice',
      content: <>
        <p>Nothing on this website constitutes tax, legal, accounting, financial, investment, lending, credit, insurance, pension or medical advice, or an offer or recommendation of any product or service. The Operator is not licensed or regulated as a provider of any such advice. Before acting on any Result, you should consult a qualified professional who can take your individual circumstances into account.</p>
      </>,
    },
    {
      id: 'disclaimer-tax',
      title: 'Tax and regulatory information',
      content: <>
        <p>Tax rates, thresholds, allowances, contribution schedules and related figures change frequently and vary by jurisdiction, filing status and personal circumstances. Reference packs are dated and sourced but may not reflect the most recent legislation, transitional rules, reliefs, exemptions, surcharges, local variations or international treaty positions. Where no verified figure is available, the field is left empty rather than estimated. Results are not an assessment, return, filing or determination and will not be accepted as such by any authority.</p>
      </>,
    },
    {
      id: 'disclaimer-financial',
      title: 'Loans, investments and exchange rates',
      content: <>
        <p>Mortgage, loan, ownership-cost and investment projections assume the rates, fees, periods and conventions you enter and do not model every product feature, fee, penalty, tax treatment or market movement. Past or assumed rates of return are not a guarantee of future performance, and the value of investments can fall as well as rise. Exchange rates are European Central Bank reference rates: they are indicative and will differ from the rates and charges applied by any bank, card issuer or currency provider.</p>
      </>,
    },
    {
      id: 'disclaimer-health',
      title: 'Health information',
      content: <>
        <p>The body-mass-index calculator applies a general population-screening index. It does not diagnose any condition, does not account for body composition, age, sex, ethnicity, pregnancy or medical history, and is not a substitute for professional medical assessment. Consult a qualified healthcare professional about any health concern.</p>
      </>,
    },
    {
      id: 'disclaimer-accuracy',
      title: 'Accuracy, errors and corrections',
      content: <>
        <p>Reasonable care is taken to keep calculations and Reference Data accurate, and an in-browser verification suite is available on request from the Methodology page. Nonetheless, errors and omissions may occur, and the Operator does not warrant that the website is error-free. If you believe a figure is wrong, please report it with the jurisdiction, reference year and a link to the primary source via the <button type="button" className="inline-link" onClick={() => onNavigate('contact')}>Contact page</button>. Corrections are made at the Operator&rsquo;s discretion and without any admission of liability.</p>
      </>,
    },
    {
      id: 'disclaimer-external',
      title: 'External sources and links',
      content: <>
        <p>References to tax authorities, central banks, standards bodies, research institutions and other external sources are provided for verification and context only. Such references do not imply any affiliation with, or endorsement by, those bodies, and the Operator is not responsible for the content or availability of any external website.</p>
      </>,
    },
  ];

  return <LegalDocument
    eyebrow="Legal"
    title="Disclaimer"
    icon={<TriangleAlert size={25} />}
    lede={<>Every number produced by {site} is a planning estimate. This notice explains, in plain terms, what that means and why you should verify important figures with a professional.</>}
    sections={sections}
    related={[{ hash: 'terms', label: 'Terms and Conditions' }, { hash: 'privacy', label: 'Privacy Policy' }, { hash: 'methodology', label: 'Methodology' }]}
    onNavigate={onNavigate}
    contactEmail={legal.legalEmail}
  />;
}

/* ------------------------------------------------------------------------- */
/* Accessibility statement                                                   */
/* ------------------------------------------------------------------------- */

export function AccessibilityPage({ onNavigate }: { onNavigate: (hash: string) => void }) {
  const site = brand.name;
  const sections: LegalSection[] = [
    {
      id: 'a11y-commitment',
      title: 'Our commitment',
      content: <>
        <p>{legal.operatorName} is committed to making {site} usable by as many people as possible, including people who rely on assistive technologies. Our target is conformance with the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA. Accessibility is treated as an ongoing engineering responsibility rather than a one-off audit.</p>
      </>,
    },
    {
      id: 'a11y-features',
      title: 'What the site does',
      content: <>
        <ul className="legal-list">
          <li>Every control is reachable and operable from the keyboard, with a visible focus indicator; a &ldquo;Skip to content&rdquo; link is the first focusable element on every page.</li>
          <li>Tab lists follow the WAI-ARIA authoring pattern and support arrow-key, Home and End navigation; dialogs trap focus and return it when closed.</li>
          <li>Calculators do not change a result silently: results appear only when you press Calculate, and edited inputs are announced as requiring an update.</li>
          <li>Motion is honoured according to your system preference; when &ldquo;reduce motion&rdquo; is enabled, animations jump straight to their final state.</li>
          <li>Touch targets meet the recommended minimum size, and a &ldquo;comfortable controls&rdquo; option in Preferences enlarges them further.</li>
          <li>Text can be resized with browser zoom up to 200% without loss of content or functionality, and layouts reflow for narrow viewports.</li>
          <li>Images that convey information have text alternatives; decorative glyphs are hidden from assistive technology; flags fall back to a text badge when an image cannot load.</li>
          <li>Number formats, precision and an alternative high-contrast appearance can be set in Preferences and are remembered on your Device.</li>
        </ul>
      </>,
    },
    {
      id: 'a11y-limitations',
      title: 'Known limitations',
      content: <>
        <p>We are aware of the following areas where the experience may fall short and are working to improve them:</p>
        <ul className="legal-list">
          <li>Large amortization and comparison tables scroll horizontally on small screens; a summary of each table is provided, but reading every cell with a screen reader can be laborious.</li>
          <li>Sensitivity charts and progress indicators are accompanied by textual equivalents, but the charts themselves are not individually navigable.</li>
          <li>Flag images are loaded from third-party hosts and their visual quality cannot be guaranteed.</li>
        </ul>
      </>,
    },
    {
      id: 'a11y-feedback',
      title: 'Feedback and enforcement',
      content: <>
        <p>If you encounter a barrier, need information in an alternative format, or have a suggestion, please email <a href={`mailto:${legal.contactEmail}`}>{legal.contactEmail}</a> with the page address, the assistive technology and browser you use, and a description of the problem. We aim to acknowledge accessibility reports within five (5) working days. If you are not satisfied with our response, you may be entitled to contact the body responsible for enforcing accessibility requirements in your country.</p>
        <p>This statement was prepared on {legal.effectiveDate} and reflects the Operator&rsquo;s own evaluation of the site. See also the <button type="button" className="inline-link" onClick={() => onNavigate('about')}>About page</button>.</p>
      </>,
    },
  ];

  return <LegalDocument
    eyebrow="Company"
    title="Accessibility statement"
    icon={<Accessibility size={25} />}
    lede={<>How {site} approaches accessibility, what already works, what does not yet, and how to tell us when something gets in your way.</>}
    sections={sections}
    related={[{ hash: 'about', label: `About ${site}` }, { hash: 'contact', label: 'Contact' }, { hash: 'terms', label: 'Terms and Conditions' }]}
    onNavigate={onNavigate}
    contactEmail={legal.contactEmail}
  />;
}

/* ------------------------------------------------------------------------- */
/* Contact                                                                   */
/* ------------------------------------------------------------------------- */

export function ContactPage({ onNavigate }: { onNavigate: (hash: string) => void }) {
  const site = brand.name;
  const channels = [
    { icon: <Mail size={18} />, title: 'General enquiries', email: legal.contactEmail, body: 'Questions about the calculators, suggestions for new tools or jurisdictions, and accessibility feedback.' },
    { icon: <FileText size={18} />, title: 'Reference data corrections', email: legal.contactEmail, body: 'Report an outdated rate, threshold or allowance. Please include the jurisdiction, the reference year, the figure you believe is wrong and a link to the primary source.' },
    { icon: <ShieldCheck size={18} />, title: 'Privacy requests', email: legal.privacyEmail, body: 'Requests to exercise your data-protection rights, and questions about the Privacy Policy.' },
    { icon: <Scale size={18} />, title: 'Legal notices', email: legal.legalEmail, body: 'Notices under the Terms and Conditions, intellectual-property matters and press or licensing enquiries.' },
  ];
  return <div className="content-page route-enter">
    <header className="page-intro">
      <h1><Mail size={25} />Contact</h1>
      <p>{site} has no account system and collects no contact details, so email is the only channel. Choose the address that matches your enquiry so it reaches the right place.</p>
    </header>
    <div className="contact-grid">
      {channels.map(channel => <article key={channel.title} className="contact-card">
        <span className="layer-icon">{channel.icon}</span>
        <h2>{channel.title}</h2>
        <p>{channel.body}</p>
        <a className="contact-email" href={`mailto:${channel.email}`}>{channel.email}</a>
      </article>)}
    </div>
    <section className="article-section">
      <h2>What to expect</h2>
      <p>We aim to acknowledge messages within five (5) working days. Reports of incorrect Reference Data are checked against the primary source before any change is published; corrections are made at the Operator&rsquo;s discretion. Please do not send account credentials, government identifiers or other sensitive personal information, as the Service has no facility for them and they are not needed to answer an enquiry.</p>
      <p>Anything you send by email is handled as described in the <button type="button" className="inline-link" onClick={() => onNavigate('privacy')}>Privacy Policy</button>. Nothing you enter into a calculator is ever transmitted to us; if you would like us to reproduce a calculation, include the inputs in your message or attach an export.</p>
    </section>
  </div>;
}

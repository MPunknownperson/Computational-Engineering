import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { trustedPrivacyCountry } from "@/lib/privacy/geo";
import { privacyRegion } from "@/lib/privacy/regions";
import { REGIONAL_SUPPLEMENTS } from "@/lib/privacy/regional-content";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Metadata and content repeat the gate; the proxy also blocks direct/RSC requests. */
async function allowedRegion(slug: string) {
  const region = privacyRegion(slug);
  if (!region || trustedPrivacyCountry(await headers()) !== region.country) notFound();
  return region;
}

export async function generateMetadata({ params }: { params: Promise<{ jurisdiction: string }> }): Promise<Metadata> {
  const { jurisdiction } = await params;
  const region = await allowedRegion(jurisdiction);
  return {
    title: `${region.name} Privacy Supplement`,
    description: `The ${region.name} supplement forms part of the Radix Loom Privacy Policy.`,
    alternates: { canonical: `/privacy/regions/${region.slug}` },
    robots: { index: false, follow: false, noarchive: true },
  };
}

export default async function RegionalPrivacyPage({ params }: { params: Promise<{ jurisdiction: string }> }) {
  const { jurisdiction } = await params;
  const region = await allowedRegion(jurisdiction);
  const content = REGIONAL_SUPPLEMENTS[region.slug];
  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <Link href="/privacy#regional-supplements" className="text-sm font-semibold underline underline-offset-4">Privacy Policy / Regional supplements</Link>
      <h1 className="h-title mt-5 text-3xl sm:text-4xl">{region.name} Privacy Supplement</h1>
      <p className="mt-4 text-sm font-semibold text-slate-600">{region.law} · Policy version {SITE.legalVersion} · Updated {SITE.legalUpdated}</p>
      <div className="mt-6 rounded-xl border-2 border-[color:var(--line)] bg-white p-5 text-sm leading-relaxed text-slate-700">
        <p><strong>This supplement forms part of the overall Radix Loom Privacy Policy.</strong> Read it together with the <Link href="/privacy" className="font-bold underline underline-offset-4">main Privacy Policy</Link>, which describes the site’s data categories, purposes, recipients, retention and controls.</p>
        <p className="mt-3">{content.scope}</p>
      </div>
      <div className="legal-body mt-7 space-y-5">
        {content.clauses.map((clause, index) => (
          <section key={clause.title} className="sketch" aria-labelledby={`regional-clause-${index}`}>
            <h2 id={`regional-clause-${index}`} className="text-xl font-bold">{clause.title}</h2>
            {clause.paragraphs.map((text) => <p key={text} className="mt-3 text-sm leading-relaxed text-slate-700">{text}</p>)}
          </section>
        ))}
      </div>
      <section className="mt-7 text-sm leading-relaxed text-slate-700" aria-labelledby="regional-contact">
        <h2 id="regional-contact" className="text-xl font-bold">Requests and availability</h2>
        <p className="mt-3">Use our <Link href="/contact" className="font-bold underline underline-offset-4">contact form</Link> and select the privacy topic. The country check limits access to this page, not your statutory rights. If you are travelling or your connection is mislocated, contact us for the applicable supplement. You do not need to disclose precise GPS location.</p>
        <p className="mt-3">Official reference: <a href={content.authority.url} rel="noreferrer" className="font-semibold underline underline-offset-4">{content.authority.name}</a>.</p>
      </section>
    </div>
  );
}

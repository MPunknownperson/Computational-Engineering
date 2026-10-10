import Link from "next/link";
import { headers } from "next/headers";
import { trustedPrivacyCountry } from "@/lib/privacy/geo";
import { regionForCountry } from "@/lib/privacy/regions";

/** Only the matching link is rendered. No policy text or client country selector. */
export async function RegionalPrivacyLinks() {
  const region = regionForCountry(trustedPrivacyCountry(await headers()));
  return (
    <section id="regional-supplements" className="sketch scroll-mt-24" aria-labelledby="regional-supplements-title">
      <h2 id="regional-supplements-title" className="text-xl font-extrabold tracking-tight">Regional privacy supplements</h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">
        GDPR and CCPA provisions are included above in this single Privacy Policy. Clauses for Brazil, Canada,
        Australia, Singapore, Japan and India are on dedicated regional pages. Each expressly forms part of this policy
        and is available only through a connection identified in that country by our trusted hosting gateway.
      </p>
      {region ? (
        <Link href={`/privacy/regions/${region.slug}`} prefetch={false} className="mt-4 inline-flex rounded-xl border-2 border-[color:var(--line)] bg-[#edf5f8] px-4 py-3 font-semibold underline underline-offset-4">
          Read the {region.name} Privacy Supplement
        </Link>
      ) : (
        <p className="mt-4 rounded-xl border border-slate-300 bg-[#f6f8fa] p-4 text-sm text-slate-700">
          No regional supplement is available for this connection. Your country may be outside the covered regions,
          or the hosting gateway may not provide a verified country signal.
        </p>
      )}
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        Location-based display is not a determination of residence or legal rights. The main policy and opt-out controls remain public.
        If you need a regional copy while travelling or using a VPN, <Link href="/contact" className="font-semibold underline underline-offset-4">contact us</Link>.
      </p>
    </section>
  );
}

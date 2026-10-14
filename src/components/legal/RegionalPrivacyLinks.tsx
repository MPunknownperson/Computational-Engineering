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
        GDPR, CCPA and international rights are described above in this public Privacy Policy.
        When our trusted hosting gateway verifies a supported country, an additional regional
        supplement is linked here. Each supplement forms part of this same policy; access to
        the main policy and your privacy rights does not depend on a location check.
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

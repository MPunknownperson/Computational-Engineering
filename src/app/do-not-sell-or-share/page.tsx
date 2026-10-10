import Link from "next/link";
import { cookies, headers } from "next/headers";
import { metadataFor } from "@/lib/seo";
import { privacyChoiceStatus } from "@/lib/privacy/choices";
import { PRIVACY_CHOICES_PATH, PRIVACY_OPTOUT_COOKIE, type PrivacyChoiceStatus } from "@/lib/privacy/constants";
import { SearchContext } from "@/components/search/SearchContext";
import { CaliforniaPrivacyIcon } from "@/components/legal/CaliforniaPrivacyIcon";
import { PrivacyChoiceForm } from "@/components/legal/PrivacyChoiceForm";

export const dynamic = "force-dynamic";
export const generateMetadata = () => metadataFor(PRIVACY_CHOICES_PATH);

export default async function PrivacyChoicesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [requestHeaders, jar, query] = await Promise.all([headers(), cookies(), searchParams]);
  let initial: PrivacyChoiceStatus;
  let initialError = query.error ? "The preference could not be saved. Please retry." : null;
  try { initial = await privacyChoiceStatus(requestHeaders, jar); }
  catch {
    const gpc = requestHeaders.get("sec-gpc") === "1";
    const marker = jar.get(PRIVACY_OPTOUT_COOKIE)?.value === "1";
    initial = { optedOut: gpc || marker, stored: marker, globalPrivacyControl: gpc, source: gpc ? "gpc" : marker ? "browser" : null, updatedAt: null, saleOrSharingEnabled: false };
    initialError = "We could not read the saved preference. The site’s no-sale/no-sharing practice still applies.";
  }
  return (
    <>
      <SearchContext path={PRIVACY_CHOICES_PATH} />
      <div className="mx-auto max-w-4xl px-5 py-12">
        <Link href="/privacy#ccpa" className="text-sm font-semibold underline underline-offset-4">Privacy Policy / California</Link>
        <div className="mt-6 flex items-center gap-3 text-sm font-semibold text-slate-700"><CaliforniaPrivacyIcon /> California privacy choices</div>
        <h1 className="h-title mt-3 text-3xl leading-tight sm:text-4xl">Do Not Sell or Share My Personal Information</h1>
        <p className="mt-5 text-base leading-relaxed text-slate-700">
          Radix Loom does not currently sell personal information or share it for cross-context behavioral advertising.
          We provide these controls so you can record your preference and see whether Global Privacy Control (GPC) is active.
          This page forms part of our <Link href="/privacy" className="font-bold underline underline-offset-4">Privacy Policy</Link>.
        </p>
        <PrivacyChoiceForm initial={initial} initialError={initialError} />
        <section className="mt-8 space-y-4 text-sm leading-relaxed text-slate-700" aria-labelledby="california-choice-rights">
          <h2 id="california-choice-rights" className="text-xl font-bold text-[color:var(--ink)]">California opt-out rights</h2>
          <p>Where the CCPA applies, California residents can direct a business not to sell their personal information or share it for cross-context behavioral advertising. Our control records both choices together. We do not require a verified consumer request, login, or payment for this opt-out.</p>
          <p>GPC can be enabled in a supporting browser or extension. We honor a received Sec-GPC: 1 signal automatically, without extra steps or a confirmation prompt. A signal or saved opt-out cannot be overridden by this page.</p>
          <p>This page is available in every location, so travel, a VPN or an unknown country cannot prevent a California resident or authorized agent from accessing the controls. The cookie applies to this browser; there is no account with which to connect other devices.</p>
          <p>An authorized agent may use these browser controls on your behalf. For a request concerning information beyond this browser, use the <Link href="/contact" className="font-bold underline underline-offset-4">contact form</Link> and choose the privacy topic. We may need enough information to match that request, but the browser opt-out requires no identity documents.</p>
          <p>Access, correction and deletion requests are separate from this choice. Read the <Link href="/privacy#ccpa" className="font-bold underline underline-offset-4">CCPA section of the Privacy Policy</Link> or use the <Link href="/privacy#your-data" className="font-bold underline underline-offset-4">saved-formula controls</Link>.</p>
        </section>
      </div>
    </>
  );
}

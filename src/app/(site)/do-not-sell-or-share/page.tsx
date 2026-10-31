import Link from "next/link";
import { cookies, headers } from "next/headers";
import { metadataFor } from "@/lib/seo";
import { privacyChoiceStatus } from "@/lib/privacy/choices";
import { PRIVACY_CHOICES_PATH, PRIVACY_OPTOUT_COOKIE, type PrivacyChoiceStatus } from "@/lib/privacy/constants";
import { browserPreferenceControlsVisible } from "@/lib/privacy/geo";
import { SearchContext } from "@/components/search/SearchContext";
import { CaliforniaPrivacyIcon } from "@/components/legal/CaliforniaPrivacyIcon";
import { PrivacyChoiceForm } from "@/components/legal/PrivacyChoiceForm";

export const dynamic = "force-dynamic";
export const generateMetadata = () => metadataFor(PRIVACY_CHOICES_PATH);

export default async function PrivacyChoicesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [requestHeaders, jar, query] = await Promise.all([headers(), cookies(), searchParams]);
  const showBrowserPreference = browserPreferenceControlsVisible(requestHeaders);
  let initial: PrivacyChoiceStatus;
  let initialError = query.error ? "The preference could not be saved. Please retry." : null;
  try { initial = await privacyChoiceStatus(requestHeaders, jar); }
  catch {
    const gpc = requestHeaders.get("sec-gpc") === "1";
    const marker = jar.get(PRIVACY_OPTOUT_COOKIE)?.value === "1";
    initial = { optedOut: gpc || marker, stored: marker, globalPrivacyControl: gpc, source: gpc ? "gpc" : marker ? "browser" : null, updatedAt: null, saleOrSharingEnabled: false };
    initialError = "We could not read the saved preference. You can still contact us about a sale or sharing request.";
  }
  return (
    <>
      <SearchContext path={PRIVACY_CHOICES_PATH} />
      <div className="mx-auto max-w-4xl px-5 py-12">
        <Link href="/privacy#ccpa" className="text-sm font-semibold underline underline-offset-4">Privacy Policy</Link>
        <div className="mt-6 flex items-center gap-3 text-sm font-semibold text-slate-700"><CaliforniaPrivacyIcon /> Privacy choices</div>
        <h1 className="h-title mt-3 text-3xl leading-tight sm:text-4xl">Do Not Sell or Share My Personal Information</h1>
        <p className="mt-5 text-base leading-relaxed text-slate-700">
          This page lets you review how Quilloryn treats the sale or sharing of personal information,
          including for advertising and analytics. It forms part of our{" "}
          <Link href="/privacy" className="font-bold underline underline-offset-4">Privacy Policy</Link>.
          A Global Privacy Control (GPC) signal is honored when we receive it.
        </p>
        {showBrowserPreference ? (
          <PrivacyChoiceForm initial={initial} initialError={initialError} />
        ) : (
          <section className="mt-7 rounded-2xl border-2 border-[color:var(--line)] bg-white p-5 sm:p-6" aria-labelledby="privacy-contact-title">
            <h2 id="privacy-contact-title" className="text-xl font-bold">Make a request</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              You can ask us about the sale or sharing of personal information, including advertising and analytics,
              through the contact form. No account is required. Please choose the privacy topic and describe the request.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              We honor a received GPC signal automatically. For a request that is not limited to this browser,
              use the <Link href="/contact" className="font-bold underline underline-offset-4">contact form</Link>.
            </p>
          </section>
        )}
        <section className="mt-8 space-y-4 text-sm leading-relaxed text-slate-700" aria-labelledby="choice-rights">
          <h2 id="choice-rights" className="text-xl font-bold text-[color:var(--ink)]">Sale, sharing and related rights</h2>
          <p>
            Some privacy laws treat the use of personal information for cross-context behavioral advertising as a
            “sale” or “share.” Advertising, measurement and analytics partners described in the Privacy Policy may
            receive information as needed to deliver or measure that content.
          </p>
          <p>
            Where those laws apply, you can direct a business not to sell personal information or share it for
            cross-context behavioral advertising. We do not require a login or payment to consider that request.
            GPC can be enabled in a supporting browser or extension and is honored when received, without an extra
            confirmation prompt.
          </p>
          <p>
            An authorized agent may contact us on your behalf. For a request concerning information beyond this
            browser, use the <Link href="/contact" className="font-bold underline underline-offset-4">contact form</Link>{" "}
            and choose the privacy topic. We may need enough information to match that request.
          </p>
          <p>
            Access, correction and deletion requests are separate from a sale or sharing choice. Read the{" "}
            <Link href="/privacy#ccpa" className="font-bold underline underline-offset-4">CCPA section of the Privacy Policy</Link>{" "}
            or use the <Link href="/privacy#your-data" className="font-bold underline underline-offset-4">saved-formula controls</Link>.
          </p>
        </section>
      </div>
    </>
  );
}

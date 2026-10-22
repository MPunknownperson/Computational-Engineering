import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark, Wordmark } from "@/components/Brand";
import { SiteFooter } from "@/components/SiteFooter";
import { PageTransition } from "@/components/Motion";
import { MobileNav } from "@/components/MobileNav";
import { Nav, type NavItem } from "@/components/Nav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SITE } from "@/lib/site";
import { headers } from "next/headers";
import { parseAcceptLanguage, selectPack, t, type UiKey } from "@/lib/i18n";
import { consentAreaFromHeaders } from "@/lib/privacy/consent-location";
import { regimeForArea } from "@/lib/privacy/consent-regime";
import { ConsentManager } from "@/components/consent/ConsentManager";
import { FastGptWidget } from "@/components/tech/FastGptWidget";
import { fastGptWidgetConfig } from "@/lib/agent/fastgpt";
import { ErrorReporter } from "@/components/system/ErrorReporter";

const NAV: Array<{ href: string; key: UiKey }> = [
  { href: "/", key: "nav.home" },
  { href: "/calculators", key: "nav.tools" },
  { href: "/guides", key: "nav.guides" },
  { href: "/about", key: "nav.about" },
  { href: "/contact", key: "nav.contact" },
];

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const pack = selectPack(parseAcceptLanguage(requestHeaders.get("accept-language")));
  const NAV_ITEMS: NavItem[] = NAV.map((item) => ({ href: item.href, label: t(pack, item.key) }));
  const serverRegime = regimeForArea(consentAreaFromHeaders(requestHeaders));
  const fastGpt = fastGptWidgetConfig();
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="site-header sticky top-0 z-40 border-b-2 border-[color:var(--line)] bg-[color:var(--nav-bg)]">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4 py-2 sm:px-5">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${SITE.name} home`}>
            <BrandMark size={36} /><Wordmark className="text-[1.12rem]" />
          </Link>
          <div className="ml-auto"><Nav items={NAV_ITEMS} /></div>
          <ThemeToggle />
          <MobileNav items={NAV_ITEMS} />
        </div>
      </header>
      <main id="main" className="relative z-[1] flex-1" tabIndex={-1}>
        <PageTransition>{children}</PageTransition>
      </main>
      <SiteFooter />
      <ConsentManager serverRegime={serverRegime} />
      <ErrorReporter />
      {fastGpt && <FastGptWidget scriptSrc={fastGpt.scriptSrc} botSrc={fastGpt.botSrc} />}
    </>
  );
}

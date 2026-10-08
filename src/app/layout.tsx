import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";
import { BrandMark, Wordmark } from "@/components/Brand";
import { SiteFooter } from "@/components/SiteFooter";
import { PageTransition } from "@/components/Motion";
import { MobileNav } from "@/components/MobileNav";
import { Nav, type NavItem } from "@/components/Nav";
import { PwaInstall } from "@/components/tech/BrowserTools";
import { SITE } from "@/lib/site";
import { defaultMetadata } from "@/lib/seo";
import { headers } from "next/headers";
import { parseAcceptLanguage, selectPack, t, type UiKey } from "@/lib/i18n";

export const generateMetadata = defaultMetadata;
export const viewport: Viewport = {
  themeColor: "#f7f5ef",
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
};

const NAV: Array<{ href: string; key: UiKey }> = [
  { href: "/", key: "nav.home" },
  { href: "/calculators", key: "nav.tools" },
  { href: "/studio", key: "nav.studio" },
  { href: "/arena", key: "nav.arena" },
  { href: "/guides", key: "nav.guides" },
  { href: "/tools/formula", key: "nav.formulas" },
  { href: "/tools/currency", key: "nav.currency" },
  { href: "/tools/economy", key: "nav.economy" },
];

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Navigation labels come from the visitor's language pack.
  const pack = selectPack(parseAcceptLanguage((await headers()).get("accept-language")));
  const NAV_ITEMS: NavItem[] = NAV.map((item) => ({ href: item.href, label: t(pack, item.key) }));
  return (
    <html lang="en">
      <body className="paper-bg flex min-h-screen flex-col text-[color:var(--ink)] antialiased">
        <a href="#main" className="skip-link">Skip to content</a>
        <header className="sticky top-0 z-40 border-b-2 border-[color:var(--line)] bg-[color:var(--paper)]">
          <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4 py-2 sm:px-5">
            <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${SITE.name} home`}>
              <BrandMark size={36} /><Wordmark className="text-[1.12rem]" />
            </Link>
            <div className="ml-auto"><Nav items={NAV_ITEMS} /></div>
            <MobileNav items={NAV_ITEMS} />
          </div>
        </header>
        <main id="main" className="relative z-[1] flex-1" tabIndex={-1}>
          <PageTransition>{children}</PageTransition>
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}

import type { Viewport } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "imagehover.css/css/imagehover.min.css";
import "./globals.css";
import { BrandMark, Wordmark } from "@/components/Brand";
import { SiteFooter } from "@/components/SiteFooter";
import { PageTransition } from "@/components/Motion";
import { MobileNav } from "@/components/MobileNav";
import { Nav, type NavItem } from "@/components/Nav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SITE } from "@/lib/site";
import { defaultMetadata } from "@/lib/seo";
import { headers } from "next/headers";
import { parseAcceptLanguage, selectPack, t, type UiKey } from "@/lib/i18n";

export const generateMetadata = defaultMetadata;
export const viewport: Viewport = {
  themeColor: "#f7f5ef",
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

// Runs before hydration so system-dark devices never flash the day palette.
const appearanceScript = `(function(){try{var saved=localStorage.getItem('radix-loom-theme');var mode=(saved==='dark'||saved==='light')?saved:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=mode;document.documentElement.style.colorScheme=mode;}catch(e){document.documentElement.dataset.theme='light';}})();`;

const NAV: Array<{ href: string; key: UiKey }> = [
  { href: "/", key: "nav.home" },
  { href: "/calculators", key: "nav.tools" },
  { href: "/guides", key: "nav.guides" },
  { href: "/about", key: "nav.about" },
  { href: "/contact", key: "nav.contact" },
];

const TONES = new Set(["home", "ink", "indigo", "teal", "terra", "violet", "rose", "green", "blue", "warm", "slate"]);

export default async function RootLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const pack = selectPack(parseAcceptLanguage(requestHeaders.get("accept-language")));
  const rawTone = requestHeaders.get("x-page-tone") ?? "home";
  const tone = TONES.has(rawTone) ? rawTone : "home";
  const NAV_ITEMS: NavItem[] = NAV.map((item) => ({ href: item.href, label: t(pack, item.key) }));
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: appearanceScript }} /></head>
      <body className={`tone-${tone} paper-bg flex min-h-screen flex-col text-[color:var(--ink)] antialiased`}>
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
      </body>
    </html>
  );
}

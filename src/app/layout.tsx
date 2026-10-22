import type { Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/dm-sans";
import "./globals.css";
import "@/components/consent/consent-theme.css";
import { defaultMetadata } from "@/lib/seo";
import { headers } from "next/headers";
import { consentAreaFromHeaders } from "@/lib/privacy/consent-location";
import { protectiveConsentRegime, regimeForArea } from "@/lib/privacy/consent-regime";

export const generateMetadata = defaultMetadata;
export const viewport: Viewport = {
  themeColor: "#f7f5ef",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
};

// Runs before hydration so system-dark devices never flash the day palette.
const appearanceScript = `(function(){try{var r=document.documentElement.dataset.consentRegime;var p='stcm.radixloom-v2-'+r+'.';var allowed=localStorage.getItem(p+'hasConsented')==='1'&&localStorage.getItem(p+'consent.functional')==='true';var saved=allowed?localStorage.getItem('radix-loom-theme'):null;var mode=(saved==='dark'||saved==='light')?saved:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=mode;document.documentElement.style.colorScheme=mode;}catch(e){document.documentElement.dataset.theme='light';}})();`;

const TONES = new Set(["home", "ink", "indigo", "teal", "terra", "violet", "rose", "green", "blue", "warm", "slate"]);

export default async function RootLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const rawTone = requestHeaders.get("x-page-tone") ?? "home";
  const tone = TONES.has(rawTone) ? rawTone : "home";
  const serverRegime = regimeForArea(consentAreaFromHeaders(requestHeaders));
  const consentRegime = protectiveConsentRegime(serverRegime);
  return (
    <html
      lang="en"
      data-consent-regime={consentRegime}
      data-consent-location={serverRegime === "unknown" ? "unverified" : "verified"}
      suppressHydrationWarning
    >
      <head><script dangerouslySetInnerHTML={{ __html: appearanceScript }} /></head>
      <body className={`tone-${tone} paper-bg flex min-h-screen flex-col text-[color:var(--ink)] antialiased`}>
        {children}
      </body>
    </html>
  );
}

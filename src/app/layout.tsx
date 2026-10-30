import type { Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/dm-sans";
import "./globals.css";
import "@/components/consent/consent-theme.css";
import { defaultMetadata } from "@/lib/seo";
import { cookies, headers } from "next/headers";
import { consentAreaFromHeaders } from "@/lib/privacy/consent-location";
import { protectiveConsentRegime, regimeForArea } from "@/lib/privacy/consent-regime";

export const generateMetadata = defaultMetadata;
export const viewport: Viewport = {
  themeColor: "#fff6dc",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
};

// Runs before hydration so neither a system-dark device nor a visitor who
// chose dark mode ever sees a flash of the day palette.
//
// The appearance choice is a strictly necessary interface preference: it is
// stored for everyone (cookie + localStorage) and never depends on optional
// consent, which previously made the toggle reset on every navigation.
const appearanceScript = `(function(){try{var saved=null;var m=document.cookie.match(/(?:^|; )quilloryn-theme=(dark|light)/);if(m)saved=m[1];if(!saved){var ls=localStorage.getItem('quilloryn-theme');if(ls==='dark'||ls==='light')saved=ls;}var mode=saved||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=mode;document.documentElement.style.colorScheme=mode;var meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',mode==='dark'?'#141d30':'#fff6dc');}catch(e){document.documentElement.dataset.theme='light';}})();`;

const TONES = new Set(["home", "ink", "indigo", "teal", "terra", "violet", "rose", "green", "blue", "warm", "slate"]);

export default async function RootLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const cookieStore = await cookies();
  const storedTheme = cookieStore.get("quilloryn-theme")?.value;
  const theme = storedTheme === "dark" || storedTheme === "light" ? storedTheme : undefined;
  const rawTone = requestHeaders.get("x-page-tone") ?? "home";
  const tone = TONES.has(rawTone) ? rawTone : "home";
  const serverRegime = regimeForArea(consentAreaFromHeaders(requestHeaders));
  const consentRegime = protectiveConsentRegime(serverRegime);
  return (
    <html
      lang="en"
      data-theme={theme}
      style={theme ? { colorScheme: theme } : undefined}
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

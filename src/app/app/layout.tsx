import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./native.css";

export const metadata: Metadata = {
  title: { default: "Quilloryn", template: "%s · Quilloryn" },
  description: "Friendly calculators, unit converters and reference tools in a native-feel connected app.",
  applicationName: "Quilloryn",
  manifest: "/app/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Quilloryn", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5ef" },
    { media: "(prefers-color-scheme: dark)", color: "#12120f" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // `viewport-fit: cover` lets the UI run under the notch / status bar so the
  // app looks like system software rather than a page inside a browser.
  viewportFit: "cover",
  colorScheme: "light dark",
};

export default function AppShellLayout({ children }: { children: ReactNode }) {
  return <div className="native-root">{children}</div>;
}

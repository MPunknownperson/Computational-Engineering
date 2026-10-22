import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./pwa.css";
import { PwaChrome } from "@/components/pwa/PwaChrome";
import { ServiceWorkerBridge } from "@/components/pwa/ServiceWorkerBridge";

export const metadata: Metadata = {
  title: { default: "Radix Loom App", template: "%s · Radix Loom App" },
  description: "Installable offline-first engineering toolkit.",
  applicationName: "Radix Loom",
  manifest: "/app/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Radix Loom", statusBarStyle: "black-translucent" },
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
  viewportFit: "cover",
  colorScheme: "light dark",
};

export default function PwaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="pwa-root" data-pwa-shell>
      <ServiceWorkerBridge />
      <PwaChrome>{children}</PwaChrome>
    </div>
  );
}

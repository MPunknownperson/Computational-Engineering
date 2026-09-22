import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";
import { BrandMark } from "@/components/Brand";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "NumeriQ — Calculate anything",
  description:
    "A friendly calculation toolkit with live market data, scientific math, unit conversion and custom formulas.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="paper-bg text-[color:var(--ink)] antialiased min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

function SiteHeader() {
  const nav = [
    { href: "/", label: "Home" },
    { href: "/calculators", label: "Tools" },
    { href: "/tools/formula", label: "Custom Formula" },
    { href: "/tools/currency", label: "Live FX" },
    { href: "/tools/crypto", label: "Crypto" },
    { href: "/tools/economy", label: "Economy" },
  ];
  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-[color:var(--paper)]/85 border-b-2 border-[color:var(--line)]">
      <div className="mx-auto max-w-7xl px-5 h-16 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <BrandMark size={34} />
          <span className="font-extrabold text-xl tracking-tight">
            Numeri<span className="text-[color:var(--accent)]">Q</span>
          </span>
        </Link>
        <nav className="ml-2 hidden md:flex items-center gap-1 text-sm">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="px-3 py-1.5 rounded-lg hover:bg-black/5 font-medium"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden sm:inline-flex chip">
            <span className="live-dot" /> live data
          </span>
        </div>
      </div>
    </header>
  );
}

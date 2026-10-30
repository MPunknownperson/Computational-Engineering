"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const TABS = [
  { href: "/app/home", label: "Home", icon: "🏠" },
  { href: "/app/calculator", label: "Calc", icon: "🧮" },
  { href: "/app/convert", label: "Convert", icon: "📐" },
  { href: "/app/settings", label: "Settings", icon: "⚙️" },
];

const TITLES: Record<string, string> = {
  "/app/home": "Quilloryn",
  "/app/calculator": "Calculator",
  "/app/convert": "Unit converter",
  "/app/settings": "Settings",
  "/app/offline": "Offline",
};

export function PwaChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/app";
  const isGate = pathname === "/app";
  if (isGate) return <>{children}</>;
  return (
    <>
      <header className="pwa-topbar">
        <span aria-hidden className="pwa-ico">◆</span>
        <h1 className="text-base font-semibold">{TITLES[pathname] ?? "Quilloryn"}</h1>
      </header>
      <div className="pwa-scroll">{children}</div>
      <nav className="pwa-tabs" aria-label="App sections">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="pwa-tab"
            data-active={pathname === tab.href}
            aria-current={pathname === tab.href ? "page" : undefined}
          >
            <span aria-hidden className="pwa-ico">{tab.icon}</span>
            {tab.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

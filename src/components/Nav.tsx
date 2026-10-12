"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

gsap.registerPlugin(useGSAP);

export type NavItem = { href: string; label: string };

/** Prefetch on intent and animate the active destination instead of showing a pending dot. */
export function Nav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const navRef = useRef<HTMLElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);
  const prefetched = useRef(new Set<string>());
  const mounted = useRef(false);

  const prefetchOnIntent = (href: string) => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData || prefetched.current.has(href)) return;
    prefetched.current.add(href);
    router.prefetch(href);
  };

  useGSAP(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const active = activeRef.current;
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(
      active,
      { y: 4, scale: 0.97, opacity: 0.78 },
      { y: 0, scale: 1, opacity: 1, duration: 0.32, ease: "power2.out", clearProps: "transform,opacity" },
    );
  }, { scope: navRef, dependencies: [pathname], revertOnUpdate: true });

  return (
    <nav ref={navRef} className="hidden items-center gap-0.5 text-sm lg:flex" aria-label="Primary">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            ref={active ? activeRef : undefined}
            href={item.href}
            prefetch={false}
            onPointerEnter={() => prefetchOnIntent(item.href)}
            onFocus={() => prefetchOnIntent(item.href)}
            onTouchStart={() => prefetchOnIntent(item.href)}
            aria-current={active ? "page" : undefined}
            className={`nav-link ${active ? "is-active" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

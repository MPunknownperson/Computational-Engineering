"use client";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef } from "react";

export type NavItem = { href: string; label: string };

function PendingIndicator() {
  const { pending } = useLinkStatus();
  return <span className={`nav-pending ${pending ? "is-pending" : ""}`} aria-hidden="true" />;
}

/** No layout measurements, timers or animated width/position writes. */
export function Nav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const prefetched = useRef(new Set<string>());
  const prefetchOnIntent = (href: string) => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData || prefetched.current.has(href)) return;
    prefetched.current.add(href);
    router.prefetch(href);
  };
  return (
    <nav className="hidden items-center gap-0.5 text-sm lg:flex" aria-label="Primary">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            onPointerEnter={() => prefetchOnIntent(item.href)}
            onFocus={() => prefetchOnIntent(item.href)}
            onTouchStart={() => prefetchOnIntent(item.href)}
            aria-current={active ? "page" : undefined}
            className={`nav-link ${active ? "is-active" : ""}`}
          >
            {item.label}<PendingIndicator />
          </Link>
        );
      })}
    </nav>
  );
}

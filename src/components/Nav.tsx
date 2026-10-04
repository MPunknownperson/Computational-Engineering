"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type NavItem = { href: string; label: string };

export function Nav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const refs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });

  const activeIndex = items.findIndex((i) =>
    i.href === "/" ? pathname === "/" : pathname.startsWith(i.href),
  );

  const measure = () => {
    const el = refs.current[activeIndex];
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
    else setPill((p) => ({ ...p, ready: false }));
  };

  useLayoutEffect(measure, [activeIndex, items.length]);
  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    const t = setTimeout(measure, 120);
    return () => { window.removeEventListener("resize", onResize); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, items.length]);

  return (
    <nav className="relative hidden items-center gap-0.5 text-sm lg:flex" aria-label="Primary">
      {items.map((n, i) => (
        <Link
          key={n.href}
          ref={(el) => { refs.current[i] = el; }}
          href={n.href}
          className={`nav-link ${i === activeIndex ? "is-active" : ""}`}
        >
          {n.label}
        </Link>
      ))}
      <span
        className="nav-pill"
        style={{
          transform: `translateX(${pill.left + pill.width * 0.18}px)`,
          width: `${pill.width * 0.64}px`,
          opacity: pill.ready && activeIndex >= 0 ? 1 : 0,
        }}
      />
    </nav>
  );
}

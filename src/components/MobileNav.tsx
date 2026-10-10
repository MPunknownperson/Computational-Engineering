"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/Icons";

export function MobileNav({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close the menu when the route changes, using a render-phase adjustment
  // rather than an effect, so no extra render pass is scheduled.
  const [renderedPath, setRenderedPath] = useState(pathname);
  if (renderedPath !== pathname) {
    setRenderedPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        className="btn !min-h-11 !px-3"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name={open ? "close" : "menu"} size={20} />
        <span className="sr-only">Menu</span>
      </button>

      <nav
        id={menuId}
        aria-label="Mobile navigation"
        className={`absolute left-0 right-0 top-16 origin-top border-b-2 border-[color:var(--line)] bg-[color:var(--nav-bg)] shadow-[0_4px_0_var(--line)] transition-all duration-200 ${
          open ? "opacity-100 translate-y-0" : "pointer-events-none -translate-y-2 opacity-0"
        }`}
        hidden={!open}
      >
        <div className="mx-auto grid max-w-7xl gap-1 px-4 py-4 sm:px-5">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-xl px-3 py-3 font-semibold transition-colors duration-200 ${
                pathname === item.href ? "bg-[color:var(--nav-active)] text-[color:var(--ink)]" : "text-slate-700 hover:bg-[color:var(--nav-hover)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

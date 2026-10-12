"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Icon } from "@/components/Icons";

export function MobileNav({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();

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

      <AnimatePresence initial={false}>
        {open && (
          <motion.nav
            key="mobile-navigation"
            id={menuId}
            aria-label="Mobile navigation"
            className="absolute left-0 right-0 top-16 origin-top border-b-2 border-[color:var(--line)] bg-[color:var(--nav-bg)] shadow-[0_4px_0_var(--line)]"
            initial={reduced ? false : { opacity: 0, y: -12, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10, scaleY: 0.96 }}
            transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 360, damping: 30 }}
          >
            <div className="mx-auto grid max-w-7xl gap-1 px-4 py-4 sm:px-5">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-xl px-3 py-3 font-semibold transition-colors duration-200 ${
                    pathname === item.href ? "bg-[color:var(--nav-active)] text-[color:var(--ink)]" : "text-slate-700 hover:bg-[color:var(--nav-hover)]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}

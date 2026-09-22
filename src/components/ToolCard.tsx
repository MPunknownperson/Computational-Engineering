import Link from "next/link";
import type { ReactNode } from "react";

export type ToolCardProps = {
  href: string;
  title: string;
  blurb: string;
  accent: string; // tailwind-safe hex via CSS var
  icon: ReactNode;
  badge?: string;
};

export function ToolCard({ href, title, blurb, accent, icon, badge }: ToolCardProps) {
  return (
    <Link
      href={href}
      className="group block sketch bg-white p-5 hover:-translate-y-0.5 transition-transform"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 grid place-items-center rounded-xl border-2 border-[color:var(--line)]"
          style={{ background: accent, boxShadow: "2px 2px 0 0 var(--line)" }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg leading-tight">{title}</h3>
            {badge && (
              <span className="chip" style={{ background: "#fff" }}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 mt-1">{blurb}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-slate-500">Open tool →</span>
        <span className="font-semibold group-hover:text-[color:var(--accent)]">Try it</span>
      </div>
    </Link>
  );
}

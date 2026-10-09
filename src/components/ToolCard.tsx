import Link from "next/link";
import type { CSSProperties } from "react";
import { Icon, type IconName } from "./Icons";

export type ToolCardProps = {
  href: string;
  title: string;
  blurb: string;
  icon: IconName;
  tone?: "coral" | "sky" | "sun" | "mint" | "pink" | "ink";
  badge?: string;
  meta?: string;
};

const TONES: Record<NonNullable<ToolCardProps["tone"]>, { bg: string; fg: string; hover: string }> = {
  coral: { bg: "#ff6b4a", fg: "#fff", hover: "#ff7d60" },
  sky: { bg: "#5b8cff", fg: "#fff", hover: "#729cff" },
  sun: { bg: "#ffd23f", fg: "#0b1020", hover: "#ffdd6b" },
  mint: { bg: "#4ade80", fg: "#0b1020", hover: "#6ee79b" },
  pink: { bg: "#f9a8d4", fg: "#0b1020", hover: "#fbc4e1" },
  ink: { bg: "#0b1020", fg: "#ffd23f", hover: "#121a33" },
};

export function ToolCard({
  href,
  title,
  blurb,
  icon,
  tone = "sun",
  badge,
  meta,
}: ToolCardProps) {
  const t = TONES[tone];
  const tileStyle = {
    background: t.bg,
    color: t.fg,
  } as CSSProperties;

  return (
    <Link
        href={href}
        className="group sketch card-hover flex h-full flex-col"
        style={{ ["--tile" as string]: t.hover }}
      >
        <div className="flex items-start gap-3.5">
          <span className="icon-tile" style={tileStyle}>
            <Icon name={icon} size={21} strokeWidth={2.1} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="block text-[1.05rem] font-extrabold leading-tight tracking-tight">{title}</span>
              {badge && (
                <span className="chip chip-live !py-0.5 !text-[.6rem] uppercase tracking-widest">
                  <span className="live-dot" /> {badge}
                </span>
              )}
            </span>
            <span className="mt-1.5 block text-sm leading-relaxed text-slate-600">{blurb}</span>
          </span>
        </div>

        <span className="mt-auto flex items-center justify-between border-t-2 border-[color:var(--line)] pt-3.5 text-sm">
          <span className="text-xs font-semibold text-slate-500">{meta ?? "Open tool"}</span>
          <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-bold">
            Open
            <Icon name="arrow-right" size={16} />
          </span>
        </span>
      </Link>
  );
}

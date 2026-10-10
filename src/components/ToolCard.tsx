import Link from "next/link";
import { Icon, IconSticker, type IconName } from "./Icons";

export type ToolTone = "coral" | "sky" | "mint" | "violet" | "pink" | "terra" | "ink";

export type ToolCardProps = {
  href: string;
  title: string;
  blurb: string;
  icon: IconName;
  tone: ToolTone;
  badge?: string;
  meta?: string;
};

export function ToolCard({
  href,
  title,
  blurb,
  icon,
  tone,
  badge,
  meta,
}: ToolCardProps) {
  const stickerStroke = tone === "ink" ? "#ffd23f" : "#0b1020";
  return (
    <Link
        href={href}
        className="group sketch card-hover flex h-full flex-col"
      >
        <div className="flex items-start gap-3.5">
          <IconSticker name={icon} tone={tone} size={21} strokeWidth={2.1} stroke={stickerStroke} />

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
            <Icon name="arrow-right" size={16} className="card-arrow" />
          </span>
        </span>
      </Link>
  );
}

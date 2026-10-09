import Link from "next/link";
import type { ReactNode } from "react";
import { Reveal } from "@/components/Motion";
import { Icon, type IconName } from "@/components/Icons";
import { SITE } from "@/lib/site";

export type LegalSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: { head: string[]; rows: string[][] };
  note?: string;
};

export const LEGAL_LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/terms", label: "Terms of Use", icon: "shield" },
  { href: "/privacy", label: "Privacy Notice", icon: "layers" },
  { href: "/disclaimer", label: "Disclaimer", icon: "bolt" },
  { href: "/accessibility", label: "Accessibility", icon: "target" },
  { href: "/contact", label: "Contact", icon: "sparkle" },
];

export function LegalLinks({ current }: { current?: string }) {
  return (
    <nav aria-label="Policies and contact" className="flex flex-wrap gap-2">
      {LEGAL_LINKS.map((l) => {
        const active = current === l.href;
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}
            className={`chip !py-1.5 ${active ? "!bg-[color:var(--accent-3)]" : ""}`}>
            <Icon name={l.icon} size={13} strokeWidth={2.3} /> {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function LegalPage({
  path, eyebrow, title, intro, updated = SITE.legalUpdated, sections, extra,
}: {
  path: string; eyebrow: string; title: string; intro: string; updated?: string;
  sections: LegalSection[]; extra?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <Reveal>
        <span className="chip"><Icon name="shield" size={13} strokeWidth={2.3} /> {eyebrow}</span>
        <h1 className="h-title mt-4 text-4xl sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-3xl text-[1.05rem] leading-relaxed text-slate-600">{intro}</p>
        <p className="mt-3 text-xs font-bold uppercase tracking-[.16em] text-slate-500">
          Version {SITE.legalVersion} · Updated {updated}
        </p>
      </Reveal>

      <div className="mt-10 grid min-w-0 gap-8 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
          <nav aria-label="On this page" className="sketch-sm">
            <div className="text-[.62rem] font-extrabold uppercase tracking-[.18em] text-slate-500">On this page</div>
            <ol className="mt-2 space-y-0.5 text-sm">
              {sections.map((s, i) => (
                <li key={s.id}><a href={`#${s.id}`} className="row-hover block rounded-lg px-2 py-1 font-semibold text-slate-600 hover:text-[color:var(--ink)]">
                  <span className="mono mr-1.5 text-xs text-slate-400">{String(i + 1).padStart(2, "0")}</span>{s.title}
                </a></li>
              ))}
            </ol>
          </nav>
          <div className="sketch-sm">
            <div className="mb-2 text-[.62rem] font-extrabold uppercase tracking-[.18em] text-slate-500">Related</div>
            <LegalLinks current={path} />
          </div>
        </aside>

        <article className="legal-body min-w-0 space-y-5">
          {sections.map((s, i) => (
            <Reveal key={s.id} delay={Math.min(i, 5) * 25}>
              <section id={s.id} className="sketch scroll-mt-24">
                <h2 className="flex items-start gap-3 text-xl font-extrabold tracking-tight">
                  <span className="mt-0.5 inline-grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 border-[color:var(--line)] bg-[color:var(--accent-3)] text-xs shadow-[2px_2px_0_0_var(--line)]">{i + 1}</span>
                  {s.title}
                </h2>
                {s.paragraphs?.map((p, j) => <p key={j} className="mt-3 text-[.95rem] leading-relaxed text-slate-700">{p}</p>)}
                {s.bullets && <ul className="mt-3 space-y-2">
                  {s.bullets.map((b, j) => <li key={j} className="flex items-start gap-2.5 text-[.95rem] leading-relaxed text-slate-700">
                    <Icon name="check" size={17} strokeWidth={2.6} className="mt-1 shrink-0 text-[#146c3a]" /><span>{b}</span>
                  </li>)}
                </ul>}
                {s.table && <div className="mt-4 max-w-full overflow-x-auto rounded-xl border-2 border-[color:var(--line)]" tabIndex={0} role="region" aria-label={`${s.title} table`}>
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead className="bg-[color:var(--paper-2)]"><tr>{s.table.head.map((h) => <th key={h} className="border-b-2 border-[color:var(--line)] px-3 py-2 text-xs font-extrabold uppercase tracking-wider">{h}</th>)}</tr></thead>
                    <tbody>{s.table.rows.map((r, ri) => <tr key={ri} className="align-top odd:bg-white even:bg-[#fffdf5]">{r.map((c, ci) => <td key={ci} className={`border-t border-slate-200 px-3 py-2 text-slate-700 ${ci === 0 ? "font-bold text-[color:var(--ink)]" : ""}`}>{c}</td>)}</tr>)}</tbody>
                  </table>
                </div>}
                {s.note && <p className="mt-4 rounded-xl border-2 border-dashed border-[color:var(--line)] bg-[#fffdf5] px-3.5 py-2.5 text-sm text-slate-600">{s.note}</p>}
              </section>
            </Reveal>
          ))}
          {extra}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-sm">
            <span className="text-slate-500">Questions about this notice? Use the <Link href="/contact">contact form</Link>.</span>
            <a href="#main" className="btn !py-1.5 text-xs">Back to top <Icon name="chevron" size={14} className="rotate-180" /></a>
          </div>
        </article>
      </div>
    </div>
  );
}

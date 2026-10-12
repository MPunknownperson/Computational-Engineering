import Link from "next/link";
import { GUIDES, guidePath } from "@/lib/guides";
import { GuideHero } from "@/components/GuideHero";
import { MotionCard } from "@/components/Motion";

export function GuideTeasers() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-5" aria-labelledby="learn-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.15em] text-slate-600">Understand the method</p>
          <h2 id="learn-heading" className="h-title mt-3 text-3xl sm:text-4xl">Small guides.<br /> <span className="h-underline">Useful answers.</span></h2>
          <p className="mt-4 max-w-xl text-slate-600">Worked examples, practical definitions and the assumptions worth checking before you calculate.</p>
        </div>
        <Link href="/guides" className="font-bold text-[#923019] underline underline-offset-4">Explore all guides →</Link>
      </div>
      <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[GUIDES[0], GUIDES[3], GUIDES[4]].map((guide, i) => (
          <MotionCard key={guide.slug} className="h-full">
            <Link href={guidePath(guide)} className="sketch card-hover block h-full overflow-hidden !p-0">
              <figure className="guide-teaser-figure">
                <GuideHero path={guidePath(guide)} alt={guide.imageAlt} sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" />
              </figure>
              <span className="block p-5">
                <span className="inline-grid h-9 w-9 place-items-center rounded-xl border-2 border-[color:var(--line)] bg-[color:var(--accent-3)] text-sm font-bold">0{i + 1}</span>
                <span className="mt-4 block text-lg font-extrabold leading-snug">{guide.title}</span>
                <span className="mt-3 block text-sm leading-relaxed text-slate-600">{guide.description}</span>
                <span className="mt-4 block text-xs font-bold uppercase tracking-wider text-[#923019]">{guide.category}</span>
                <span className="guide-teaser-action mt-3 inline-flex items-center gap-1 text-xs font-bold">Explore this guide <span aria-hidden="true">↗</span></span>
              </span>
            </Link>
          </MotionCard>
        ))}
      </div>
    </section>
  );
}

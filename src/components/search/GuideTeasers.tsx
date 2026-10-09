import Link from "next/link";
import { GUIDES, guidePath } from "@/lib/guides";

export function GuideTeasers() {
  return <section className="mx-auto max-w-7xl px-4 py-12 sm:px-5" aria-labelledby="learn-heading">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.15em] text-slate-600">Understand the method</p>
        <h2 id="learn-heading" className="h-title mt-3 text-3xl sm:text-4xl">Small guides.<br /> <span className="h-underline">Useful answers.</span></h2>
        <p className="mt-4 max-w-xl text-slate-600">Worked examples, practical definitions and the assumptions worth checking before you calculate.</p>
      </div>
      <Link href="/guides" className="font-bold text-[#923019] underline underline-offset-4">Explore all guides →</Link>
    </div>
    <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {[GUIDES[0], GUIDES[3], GUIDES[4]].map((guide, i) => <Link key={guide.slug} href={guidePath(guide)} className="sketch card-hover block">
        <span className="inline-grid h-10 w-10 place-items-center rounded-xl border-2 border-[color:var(--line)] bg-[color:var(--accent-3)] font-bold">0{i + 1}</span>
        <h3 className="mt-4 text-lg font-extrabold leading-snug">{guide.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{guide.description}</p>
        <span className="mt-4 block text-xs font-bold uppercase tracking-wider text-[#923019]">{guide.category}</span>
      </Link>)}
    </div>
  </section>;
}

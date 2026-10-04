import Link from "next/link";
import { GUIDES } from "@/lib/guides";
import { LANDING_PAGES, LANDING_SECTIONS } from "@/lib/landing";
import { metadataFor } from "@/lib/seo";
import { SearchContext } from "@/components/search/SearchContext";
import { GuideTeasers } from "@/components/search/GuideTeasers";

export const generateMetadata = () => metadataFor("/guides");

const CATEGORY_ORDER = ["Conversions", "Calculation methods", "Reference information"] as const;

export default function GuidesPage() {
  return <>
    <SearchContext path="/guides" />
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-5 sm:py-14">
      <span className="chip">Worked examples · Practical methods</span>
      <h1 className="h-title mt-5 text-4xl sm:text-5xl">
        Math and conversion <span className="h-underline">guides</span><br className="hidden sm:block" /> with worked examples
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
        {GUIDES.length} focused guides on unit conversion, equations, matrices, compound interest,
        currency reference values and everyday arithmetic. Each explains its assumptions, shows a
        worked example and opens the matching tool with editable inputs.
      </p>

      {CATEGORY_ORDER.map((category) => (
        <section key={category} className="mt-12" aria-labelledby={`category-${category.replace(/\s+/g, "-")}`}>
          <h2 id={`category-${category.replace(/\s+/g, "-")}`} className="text-2xl font-extrabold">{category}</h2>
          <p className="mt-2 text-sm text-slate-600">{categoryBlurb(category)}</p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {GUIDES.filter((guide) => guide.category === category).map((guide) => (
              <article key={guide.slug} className="sketch card-hover h-full">
                <span className="chip !text-[.66rem]">{guide.formula}</span>
                <h3 className="mt-3 text-lg font-extrabold leading-snug">
                  <Link href={`/guides/${guide.slug}`}>{guide.title}</Link>
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{guide.description}</p>
                <p className="mt-3 rounded-lg border border-[color:var(--line)] bg-[#fffdf5] px-3 py-2 text-xs font-semibold text-slate-700">
                  {guide.takeaway}
                </p>
                <Link href={`/guides/${guide.slug}`} className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-[#923019] underline underline-offset-4">
                  Read the guide <span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className="mt-14" aria-labelledby="dedicated-pages-heading">
        <h2 id="dedicated-pages-heading" className="text-2xl font-extrabold">Dedicated converters, calculators and reference pages</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Short on time? Each page below opens with the inputs already filled in — change any value,
          confirm, and read the result.
        </p>
        {LANDING_SECTIONS.map((section) => (
          <div key={section.section} className="mt-6">
            <h3 className="text-lg font-extrabold">{section.title}</h3>
            <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {LANDING_PAGES.filter((page) => page.section === section.section).map((page) => (
                <li key={page.slug}>
                  <Link href={page.path} className="sketch-sm row-hover block h-full">
                    <span className="block text-sm font-extrabold">{page.title}</span>
                    <span className="mt-1 block text-xs leading-snug text-slate-500">{page.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <div className="mt-12 rounded-2xl border-2 border-dashed border-[color:var(--line)] bg-[#fff8dc] p-5 text-sm leading-relaxed text-slate-700">
        These guides explain common methods; they do not cover every measurement convention or
        individual circumstance. Examples are illustrative, and important results should be
        checked independently.
      </div>
      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        {LANDING_SECTIONS.map((hub) => (
          <Link key={hub.section} href={`/${hub.section}`} className="sketch-sm card-hover block">
            <span className="block text-sm font-extrabold">{hub.title}</span>
            <span className="mt-1 block text-xs leading-snug text-slate-500">{hub.blurb}</span>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#923019]">Browse all →</span>
          </Link>
        ))}
      </div>
      <p className="mt-7 text-sm text-slate-600">
        Prefer to start with a tool? <Link href="/calculators" className="font-bold underline underline-offset-4">Browse the calculators and converters</Link>.
      </p>
    </div>
  </>;
}

function categoryBlurb(category: (typeof CATEGORY_ORDER)[number]): string {
  switch (category) {
    case "Conversions": return "Exact unit definitions, the direction of each conversion and the mistakes to avoid.";
    case "Calculation methods": return "Formulas, their inputs and their limitations, with the arithmetic shown.";
    case "Reference information": return "How to read published figures and what they do and do not tell you.";
  }
}

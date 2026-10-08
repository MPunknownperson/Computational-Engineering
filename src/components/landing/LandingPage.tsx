import Link from "next/link";
import type { LandingPage } from "@/lib/landing";
import { LANDING_PAGES, LANDING_SECTIONS } from "@/lib/landing";
import { SearchContext } from "@/components/search/SearchContext";
import { GuideHero } from "@/components/GuideHero";
import { ConvertWidget, CalculateWidget, ReferenceWidget } from "./widgets";

export function LandingArticle({ page }: { page: LandingPage }) {
  const siblings = LANDING_PAGES.filter((item) => item.section === page.section && item.slug !== page.slug).slice(0, 3);
  const sectionTitle = LANDING_SECTIONS.find((item) => item.section === page.section)?.title ?? page.section;

  return (
    <>
      <SearchContext path={page.path} />
      <article className="mx-auto max-w-6xl px-4 py-9 sm:px-5 sm:py-12">
        <header className="max-w-3xl">
          <span className="chip">{sectionTitle}</span>
          <h1 className="h-title mt-5 text-3xl leading-tight sm:text-5xl">{page.title}</h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-700">{page.intro}</p>
        </header>

        <div className="mt-8 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-7">
            <figure className="sketch overflow-hidden !p-0">
              <GuideHero
                path={page.path}
                alt={`${page.title} — ${page.formula ?? sectionTitle}`}
                priority
              />
            </figure>

            {page.widget.type === "convert" && (
              <ConvertWidget widget={page.widget} toolHref={toolHrefFor(page)} />
            )}
            {page.widget.type === "calculate" && (
              <CalculateWidget widget={page.widget} toolHref={toolHrefFor(page)} />
            )}
            {page.widget.type === "reference" && (
              <ReferenceWidget widget={page.widget} toolHref={toolHrefFor(page)} />
            )}

            {page.method.map((section, i) => (
              <section key={section.heading} id={`step-${i + 1}`} className="scroll-mt-24">
                <h2 className="text-2xl font-extrabold">{section.heading}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="mt-3 leading-relaxed text-slate-700">{paragraph}</p>
                ))}
              </section>
            ))}

            <section aria-label="Things to keep in mind" className="rounded-2xl border-2 border-dashed border-[color:var(--line)] bg-[#fff8dc] p-5">
              <h2 className="text-base font-extrabold">Keep in mind</h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700">
                {page.assumptions.map((item) => <li key={item.slice(0, 40)}>{item}</li>)}
              </ul>
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24">
            <nav aria-label="Related calculations" className="sketch">
              <h2 className="text-base font-extrabold">Related</h2>
              <ul className="mt-3 space-y-1">
                <li>
                  <Link href={`/${page.section}`} className="row-hover block rounded-xl px-2.5 py-2 text-sm font-bold text-[#923019]">
                    All {sectionTitle.toLowerCase()} →
                  </Link>
                </li>
                {page.related.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="row-hover block rounded-xl px-2.5 py-2 text-sm font-bold">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="On this page" className="sketch-sm">
              <h2 className="text-sm font-extrabold">On this page</h2>
              <ol className="mt-3 list-decimal space-y-3 pl-4 text-sm">
                {page.method.map((section, i) => (
                  <li key={section.heading}>
                    <a className="underline underline-offset-4" href={`${page.path}#step-${i + 1}`}>{section.heading}</a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>
        </div>

        {siblings.length > 0 && (
          <section className="mt-12" aria-labelledby="more-heading">
            <h2 id="more-heading" className="text-2xl font-extrabold">More {sectionTitle.toLowerCase()}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {siblings.map((item) => (
                <Link key={item.slug} href={item.path} className="sketch card-hover block overflow-hidden !p-0">
                  <GuideHero
                    path={item.path}
                    alt={`${item.title} — ${item.formula ?? sectionTitle}`}
                    sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                    className="border-b-2 border-[color:var(--line)]"
                  />
                  <span className="block p-4">
                    <span className="block font-extrabold">{item.title}</span>
                    <span className="mt-2 block text-sm text-slate-600">{item.description}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}

function toolHrefFor(page: LandingPage): string {
  const direct = page.related.find((link) => link.href.startsWith("/tools/"));
  return direct?.href ?? "/calculators";
}

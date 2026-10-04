import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { findGuide, guidePath } from "@/lib/guides";
import { findSearchPage, imagePath } from "@/lib/search-pages";
import { SITE } from "@/lib/site";
import { metadataFor } from "@/lib/seo";
import { SearchContext } from "@/components/search/SearchContext";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const guide = findGuide((await params).slug);
  if (!guide) notFound();
  return metadataFor(guidePath(guide));
}

export default async function GuidePage({ params }: Props) {
  const guide = findGuide((await params).slug);
  if (!guide) notFound();
  const path = guidePath(guide);
  const related = guide.related.map(findGuide).filter((g) => g !== undefined);
  return <>
    <SearchContext path={path} />
    <article className="mx-auto max-w-6xl px-4 py-9 sm:px-5 sm:py-12">
      <header className="max-w-4xl">
        <span className="chip">{guide.category}</span>
        <h1 className="h-title mt-5 text-3xl leading-tight sm:text-5xl">{guide.title}</h1>
        <p className="mt-5 text-lg leading-relaxed text-slate-700">{guide.intro}</p>
        <p className="mt-4 text-xs font-semibold text-slate-600">Worked example · Updated <time dateTime={SITE.contentUpdated}>2 October 2026</time></p>
      </header>
      <div className="mt-8 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-7">
          <figure className="sketch overflow-hidden !p-0">
            <Image src={imagePath(findSearchPage(path)!)} width={1200} height={630} priority unoptimized alt={guide.imageAlt} className="h-auto w-full" />
            <figcaption className="border-t-2 border-[color:var(--line)] px-5 py-3 text-sm text-slate-600">{guide.takeaway}. Illustration, not a live result.</figcaption>
          </figure>
          {guide.sections.map((section, i) => <section key={section.heading} id={`step-${i + 1}`} className="scroll-mt-24">
            <h2 className="text-2xl font-extrabold">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-3 leading-relaxed text-slate-700">{paragraph}</p>)}
          </section>)}
          <section className="sketch !p-0 overflow-hidden" aria-label="Reference table">
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={guide.table.caption}>
              <table className="w-full text-left text-sm">
                <caption className="px-5 py-4 text-left text-base font-extrabold">{guide.table.caption}</caption>
                <thead className="border-y-2 border-[color:var(--line)] bg-[color:var(--paper-2)]"><tr>{guide.table.columns.map((column) => <th scope="col" key={column} className="px-5 py-3 font-bold">{column}</th>)}</tr></thead>
                <tbody>{guide.table.rows.map((row) => <tr key={row[0]} className="border-b border-slate-200 last:border-0">{row.map((cell, i) => i === 0 ? <th scope="row" className="px-5 py-3 font-semibold" key={i}>{cell}</th> : <td key={i} className="px-5 py-3">{cell}</td>)}</tr>)}</tbody>
              </table>
            </div>
          </section>
          <div className="rounded-2xl border-2 border-dashed border-[color:var(--line)] bg-[#fff8dc] p-5 text-sm leading-relaxed">
            <strong>Check the assumptions.</strong> These are educational examples. A conversion or formula does not validate its inputs or replace professional advice. <Link href="/disclaimer" className="font-bold underline underline-offset-4">Read the limitations</Link>.
          </div>
        </div>
        <aside className="space-y-5 lg:sticky lg:top-24">
          <div className="sketch">
            <h2 className="text-lg font-extrabold">Try the worked example</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">The link fills in the example inputs. Review them, then press the confirmation button. Opening the link does not calculate a visible answer or save a formula.</p>
            <Link href={guide.toolHref} className="btn btn-primary mt-5 w-full !whitespace-normal text-center">{guide.toolLabel}</Link>
          </div>
          <nav aria-label="Guide sections" className="sketch-sm">
            <h2 className="text-sm font-extrabold">On this page</h2>
            <ol className="mt-3 list-decimal space-y-3 pl-4 text-sm">{guide.sections.map((section, i) => <li key={section.heading}><a className="underline underline-offset-4" href={`${path}#step-${i + 1}`}>{section.heading}</a></li>)}</ol>
          </nav>
        </aside>
      </div>
      <section className="mt-12" aria-labelledby="related-guides-heading">
        <h2 id="related-guides-heading" className="text-2xl font-extrabold">Continue exploring</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">{related.map((item) => <Link href={guidePath(item)} key={item.slug} className="sketch card-hover block"><h3 className="font-extrabold">{item.title}</h3><p className="mt-2 text-sm text-slate-600">{item.description}</p></Link>)}</div>
        <Link href="/guides" className="mt-6 inline-block text-sm font-bold underline underline-offset-4">All calculation guides</Link>
      </section>
    </article>
  </>;
}

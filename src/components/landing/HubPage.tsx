import Link from "next/link";
import { LANDING_PAGES, LANDING_SECTIONS, type LandingKind } from "@/lib/landing";
import { SearchContext } from "@/components/search/SearchContext";
import { GuideHero } from "@/components/GuideHero";
import { Icon } from "@/components/Icons";

const HUB_COPY: Record<LandingKind, {
  intro: string;
  steps: { heading: string; body: string }[];
  faq: { q: string; a: string }[];
}> = {
  convert: {
    intro:
      "Every converter below is prefilled with a real value you can edit. Choose a pair, press Convert, and read the answer — plus every other unit in the same category, shown alongside for comparison.",
    steps: [
      { heading: "Exact definitions, not rounded estimates", body: "The pound, international mile, US gallon and square foot each have a fixed definition. Conversions use those definitions, so a displayed answer is limited only by how many decimals you choose to show." },
      { heading: "The direction matters", body: "Multiply to go one way and divide to go the other. Each page states the factor in both directions so you can see which operation applies to the number you have." },
      { heading: "Categories keep unlike units apart", body: "Mass, volume, area, speed and temperature each convert on their own terms. Temperature uses an offset as well as a scale; area needs the length factor squared." },
    ],
    faq: [
      { q: "What is the most common conversion mistake?", a: "Applying a length factor to an area or volume. Square units need the factor squared and cubic units need it cubed." },
      { q: "Why do US and Imperial gallons differ?", a: "They are separate definitions. One US liquid gallon is about 3.785 litres, while one Imperial gallon is about 4.546 litres." },
    ],
  },
  calculate: {
    intro:
      "A formula is only as good as its inputs. Each calculator below shows the expression it uses, starts with an example you can edit, and reveals the result only once you press Evaluate.",
    steps: [
      { heading: "Know what the formula assumes", body: "Every calculator lists its assumptions — fixed rates, even splits, chosen units — so you can tell whether the arithmetic fits your situation before you rely on a figure." },
      { heading: "Check the result by substitution", body: "Put the answer back into the original problem. This catches sign errors and wrong units much faster than a second pass of the same calculation." },
      { heading: "Numbers are rarely exact", body: "Results are rounded for display while intermediate steps keep full precision. Where money or measurements are involved, your inputs carry the uncertainty." },
    ],
    faq: [
      { q: "Are these financial calculators advice?", a: "No. They illustrate arithmetic only and do not account for fees, taxes, insurance or rate changes. Confirm real offers with the relevant provider." },
      { q: "Why does the result wait for a button press?", a: "So you always know which inputs produced the number you are looking at. Change an input and the result hides again until you confirm." },
    ],
  },
  reference: {
    intro:
      "Reference figures come from published sources and arrive with their own dates and update rhythms. These pages show the figure, the period it covers and enough context to quote it responsibly.",
    steps: [
      { heading: "Check the date before the number", body: "A reference figure is only meaningful alongside the period it describes. Currency reference rates publish on working days; digital-asset values change constantly; economic statistics are annual and revised." },
      { heading: "Reference is not a transaction", body: "A currency reference value is not a dealing quote, and an asset price is not an executable order. Spreads, fees, timing and venue all change the figure you actually receive." },
      { heading: "Treat movement carefully", body: "A daily percentage, a trend line and a historical series are context. They describe what happened, not what will happen." },
    ],
    faq: [
      { q: "Why does a figure look different elsewhere?", a: "Different sources, reference periods and conventions. Compare like with like: same measure, same date, same units." },
      { q: "Is missing data the same as zero?", a: "No. A missing observation means no published figure for that period and should not be read as a value of zero." },
    ],
  },
};

export function HubPage({ section }: { section: LandingKind }) {
  const hub = LANDING_SECTIONS.find((s) => s.section === section)!;
  const pages = LANDING_PAGES.filter((p) => p.section === section);
  const copy = HUB_COPY[section];
  const siblings = LANDING_SECTIONS.filter((s) => s.section !== section);

  return (
    <>
      <SearchContext path={`/${section}`} />
      <div className="mx-auto max-w-6xl px-4 py-9 sm:px-5 sm:py-12">
        <header className="max-w-3xl">
          <span className="chip">{hub.title}</span>
          <h1 className="h-title mt-5 text-3xl leading-tight sm:text-5xl">{hub.heading}</h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-700">{copy.intro}</p>
        </header>

        <section className="mt-10" aria-labelledby="all-in-section">
          <h2 id="all-in-section" className="text-2xl font-extrabold">All {hub.title.toLowerCase()}</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((page) => (
              <article key={page.slug} className="sketch card-hover h-full overflow-hidden !p-0">
                <GuideHero
                  path={page.path}
                  alt={`${page.title} — ${page.formula ?? hub.title}`}
                  sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                  className="border-b-2 border-[color:var(--line)]"
                />
                <div className="p-4">
                  {page.formula && <span className="mono rounded-lg border border-[color:var(--line)] bg-[#fffdf5] px-2.5 py-1 text-xs">{page.formula}</span>}
                  <h3 className="mt-3 text-lg font-extrabold leading-snug">
                    <Link href={page.path}>{page.title}</Link>
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{page.description}</p>
                  <Link href={page.path} className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-[#923019] underline underline-offset-4">
                    Open <Icon name="arrow-right" size={14} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 grid gap-4 md:grid-cols-3" aria-label={`How ${hub.title.toLowerCase()} work here`}>
          {copy.steps.map((step) => (
            <div key={step.heading} className="sketch-sm">
              <h3 className="text-base font-extrabold">{step.heading}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-12" aria-labelledby="hub-faq">
          <h2 id="hub-faq" className="text-2xl font-extrabold">Common questions</h2>
          <div className="mt-4 space-y-3">
            {copy.faq.map((item) => (
              <div key={item.q} className="rounded-2xl border border-[color:var(--line)] bg-[#fffdf5] p-5">
                <h3 className="text-base font-extrabold">{item.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <nav aria-label="Other sections" className="mt-12">
          <h2 className="text-lg font-extrabold">Explore the rest of the site</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {siblings.map((s) => (
              <li key={s.section}>
                <Link href={`/${s.section}`} className="chip !min-h-11">{s.heading}</Link>
              </li>
            ))}
            <li><Link href="/guides" className="chip !min-h-11">Math guides</Link></li>
            <li><Link href="/calculators" className="chip !min-h-11">All tools</Link></li>
          </ul>
        </nav>

        <p className="mt-10 rounded-2xl border-2 border-dashed border-[color:var(--line)] bg-[#fff8dc] p-5 text-sm leading-relaxed text-slate-700">
          These pages describe how each figure is produced and what it excludes. They do not cover
          every convention or individual circumstance — check important results independently.
        </p>
      </div>
    </>
  );
}

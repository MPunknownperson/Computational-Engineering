import Link from "next/link";
import { ToolCard } from "@/components/ToolCard";
import { Reveal } from "@/components/Motion";
import { Icon, type IconName } from "@/components/Icons";
import { Owl } from "@/components/Mascots";
import { CURRENCIES, COUNTRIES, UNIT_COUNT, UNIT_CATEGORY_COUNT, CRYPTO_IDS } from "@/lib/catalog";
import { CONVERSION_LINKS, FORMULA_LINKS, REFERENCE_LINKS } from "@/lib/deep-links";
import { SpeakCalc } from "@/components/tech/BrowserTools";

type Tone = "coral" | "sky" | "sun" | "mint" | "pink" | "ink";
const ALL: { href: string; title: string; blurb: string; icon: IconName; tone: Tone; badge?: string; meta: string }[] = [
  { href: "/tools/scientific", title: "Scientific calculator", blurb: "Mathematical expressions, named values, functions and unit expressions. Press Calculate to see the answer.", icon: "sigma", tone: "coral", meta: "press Calculate" },
  { href: "/tools/units", title: "Unit converter", blurb: `${UNIT_COUNT} units in ${UNIT_CATEGORY_COUNT} categories, with conversions shown together.`, icon: "swap", tone: "sky", meta: `${UNIT_COUNT} units` },
  { href: "/tools/currency", title: "Currency reference", blurb: `Reference values for ${CURRENCIES.length} currencies, with a recent historical view.`, icon: "globe", tone: "sun", badge: "updates", meta: `${CURRENCIES.length} currencies` },
  { href: "/tools/crypto", title: "Digital-asset prices", blurb: `${CRYPTO_IDS.length} assets with price, daily movement and market summaries.`, icon: "coin", tone: "mint", badge: "updates", meta: `${CRYPTO_IDS.length} assets` },
  { href: "/tools/formula", title: "Custom formulas", blurb: "Enter expressions, set values, review results and choose to save them.", icon: "function", tone: "pink", meta: "save · download · remove" },
  { href: "/tools/economy", title: "Economic indicators", blurb: `Selected periodic public indicators across ${COUNTRIES.length} economies.`, icon: "chart", tone: "ink", badge: "updates", meta: `${COUNTRIES.length} economies` },
];

const NOTES: { icon: IconName; title: string; body: string }[] = [
  { icon: "shield", title: "No account", body: "Use the calculators without creating a profile." },
  { icon: "layers", title: "Several tool types", body: "Calculations, conversions, reference figures and saved expressions." },
  { icon: "bolt", title: "Reference information", body: "External figures may be delayed, revised or temporarily unavailable." },
  { icon: "target", title: "Check important results", body: "Use independent confirmation for decisions involving money, health or safety." },
];

export default function CalculatorsPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-14">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="chip"><Icon name="grid" size={13} /> directory</span>
            <h1 className="h-title mt-4 text-4xl sm:text-5xl">
              All <span className="h-underline">calculators</span> &amp; converters
            </h1>
            <p className="mt-4 max-w-2xl text-[1.05rem] leading-relaxed text-slate-600">
              Free calculators and unit converters for scientific maths, currency, digital assets
              and economic data. Saving an expression is optional.
            </p>
          </div>
          <Owl mood="think" size={68} />
        </div>
      </Reveal>

      <p className="mt-5 text-sm text-slate-600">Need an explanation first? <Link href="/guides" className="font-bold underline underline-offset-4">Read the worked guides</Link>.</p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ALL.map((tool) => <Reveal key={tool.href}><ToolCard {...tool} /></Reveal>)}
      </div>

      <div className="mt-10"><SpeakCalc /></div>

      {/* Topic hubs group the related landing pages into browseable clusters.
          This keeps every spoke within three clicks of the homepage and gives
          each cluster one clearly defined index page. */}
      <section className="mt-12 grid gap-4 md:grid-cols-3" aria-labelledby="topic-hubs-heading">
        <h2 id="topic-hubs-heading" className="sr-only">Browse by topic</h2>
        {[
          { href: "/convert", title: "Unit converters", body: "kg→lbs, mi→km, °C→°F, L→gal, ft²→m² and more." },
          { href: "/calculate", title: "Online calculators", body: "Loan payments, bill splitting, quadratic equations." },
          { href: "/reference", title: "Reference figures", body: "Currency values, digital assets, economic indicators." },
        ].map((hub) => (
          <Link key={hub.href} href={hub.href} className="sketch-sm card-hover block">
            <span className="block text-base font-extrabold">{hub.title}</span>
            <span className="mt-1 block text-xs leading-snug text-slate-500">{hub.body}</span>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#923019]">
              Browse <Icon name="arrow-right" size={12} />
            </span>
          </Link>
        ))}
      </section>

      {/* Crawlable starting points. Each link opens a real tool with its inputs
          preloaded, giving visitors a direct route and giving search engines a
          distinct destination URL with descriptive anchor text per intent. */}
      <section className="mt-14" aria-labelledby="starting-points-heading">
        <Reveal>
          <h2 id="starting-points-heading" className="text-2xl font-extrabold">Common starting points</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Every link below opens the relevant tool with its inputs already filled in. Change any
            value, then press that tool&apos;s confirmation button to reveal the result. For a focused
            page per task — with its own explanation and a confirm-to-reveal widget — see the{" "}
            <Link href="/guides" className="font-bold underline underline-offset-4">worked guides</Link>{" "}
            and their linked converter, calculator and reference pages.
          </p>
        </Reveal>

        {([
          { id: "conversions", title: "Unit conversions", links: CONVERSION_LINKS },
          { id: "formulas", title: "Formula presets", links: FORMULA_LINKS },
          { id: "reference", title: "Reference figures", links: REFERENCE_LINKS },
        ] as const).map((group) => (
          <div key={group.id} className="mt-8">
            <h3 className="text-lg font-extrabold">{group.title}</h3>
            <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="sketch-sm row-hover flex min-h-16 flex-col justify-center gap-1">
                    <span className="text-sm font-extrabold">{link.title}</span>
                    <span className="text-xs leading-snug text-slate-500">{link.description}</span>
                    {link.formula && <span className="mono text-[.68rem] text-slate-500">{link.formula}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <Reveal delay={100}>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {NOTES.map((note) => (
            <div key={note.title} className="sketch-sm flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 border-[color:var(--line)] bg-[color:var(--accent-3)] shadow-[2px_2px_0_0_var(--line)]"><Icon name={note.icon} size={17} strokeWidth={2.2} /></span>
              <span><span className="block text-sm font-extrabold">{note.title}</span><span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{note.body}</span></span>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={130}>
        <div className="sketch mt-12 flex flex-wrap items-center justify-between gap-5 !bg-[color:var(--ink)] !text-white">
          <div><h2 className="text-xl font-extrabold">Need to calculate a different expression?</h2><p className="mt-1 text-sm text-slate-300">Enter your own expression and values in the custom formula tool.</p></div>
          <Link href="/tools/formula" className="btn btn-primary">Open custom formulas <Icon name="arrow-right" size={16} /></Link>
        </div>
      </Reveal>
    </div>
  );
}

import { GuideTeasers } from "@/components/search/GuideTeasers";
import { metadataFor } from "@/lib/seo";
import { SearchContext } from "@/components/search/SearchContext";
import Link from "next/link";
import { HeroIllustration } from "@/components/HeroIllustration";
import { VoiceIllustration } from "@/components/VoiceIllustration";
import { ToolCard } from "@/components/ToolCard";
import { Icon, type IconName } from "@/components/Icons";
import { Reveal, Parallax } from "@/components/Motion";
import { Faq } from "@/components/home/Faq";
import { FormulaLibrary } from "@/components/home/Sections";
import { SITE } from "@/lib/site";
import { CURRENCIES, COUNTRIES, UNIT_COUNT, UNIT_CATEGORY_COUNT, CRYPTO_IDS, INDICATORS } from "@/lib/catalog";

const VOICE_POINTS: { icon: IconName; title: string; body: string }[] = [
  { icon: "mic", title: "Say it in your own words", body: "“Convert 120 US dollars to euros,” “70 kilos in pounds,” “loan payment” — the matching tool opens with the amount and direction already filled in." },
  { icon: "language", title: "Five languages, one grammar", body: "English, Spanish, French, German and Chinese are understood by the same engine, each with its own numbers, currencies and topic words." },
  { icon: "shield", title: "Processed where it makes sense", body: "Phones use on-device recognition where it's offered; desktop browsers use their own speech service. Nothing is uploaded to this site." },
  { icon: "refresh", title: "Gets better as you use it", body: "A quick “again” repeats your last command, and a follow-up amount reuses the direction you already set — no need to restate everything." },
];

export const generateMetadata = () => metadataFor("/");

type Tone = "coral" | "sky" | "sun" | "mint" | "pink" | "ink";

const TOOLS: {
  href: string; title: string; blurb: string; icon: IconName; tone: Tone; badge?: string; meta: string;
}[] = [
  { href: "/tools/scientific", title: "Scientific calculator", blurb: "Mathematical expressions, named values, functions and unit expressions. Press Calculate to see the answer.", icon: "sigma", tone: "coral", meta: "press Calculate" },
  { href: "/tools/units", title: "Unit converter", blurb: `${UNIT_COUNT} units in ${UNIT_CATEGORY_COUNT} categories. Press Convert to reveal the answer and every other unit at once.`, icon: "swap", tone: "sky", meta: "press Convert" },
  { href: "/tools/currency", title: "Currency reference", blurb: `Reference values for ${CURRENCIES.length} currencies. Press Convert to reveal the amount and the recent trend.`, icon: "globe", tone: "sun", badge: "updates", meta: "press Convert" },
  { href: "/tools/crypto", title: "Digital-asset prices", blurb: `Price, daily movement and market summaries for ${CRYPTO_IDS.length} digital assets, with a filter you apply yourself.`, icon: "coin", tone: "mint", badge: "updates", meta: `${CRYPTO_IDS.length} assets` },
  { href: "/tools/formula", title: "Custom formulas", blurb: "Enter expressions and values, press Evaluate to reveal the result, then save what you want to keep.", icon: "function", tone: "pink", meta: "press Evaluate" },
  { href: "/tools/economy", title: "Economic indicators", blurb: `${INDICATORS.length} measures — inflation, growth, lending rates, debt and more — for ${COUNTRIES.length} economies. Press Show to reveal the figures.`, icon: "chart", tone: "ink", badge: "updates", meta: "press Show" },
];

const FACTS: { icon: IconName; title: string; body: string }[] = [
  { icon: "function", title: "Use your own formulas", body: "Enter an expression such as P*(1+r/n)^(n*t), provide values for its variables and press Evaluate. Simplification and derivative estimates are aids, not proof of correctness." },
  { icon: "bolt", title: "Reference information", body: "Currency values, digital-asset prices and public economic indicators appear in their respective tools. Their sources, coverage and update frequency differ." },
  { icon: "shield", title: "No account required", body: "Use the calculators without a profile. If you choose to save a formula, a random workspace reference helps make it available again in the same browser." },
  { icon: "target", title: "Nothing appears unasked", body: "Calculated results wait for your confirmation. Worked examples are labelled as illustrations, and the market table provides reference information." },
];

const INFORMATION_TYPES = [
  { icon: "globe" as IconName, title: "Currency reference values", text: "Indicative exchange-rate information and recent historical views. These are not transaction offers and may differ from rates available to you.", href: "/tools/currency" },
  { icon: "coin" as IconName, title: "Digital-asset market information", text: "Prices, daily movement and market summaries. Figures can change quickly and differ across venues.", href: "/tools/crypto" },
  { icon: "chart" as IconName, title: "Economic indicators", text: "Selected public statistics, many of which are published periodically and may be revised.", href: "/tools/economy" },
];

export default function Home() {
  return (
    <div className="relative z-[1]">
      <SearchContext path="/" />
      <section className="mx-auto max-w-7xl px-5 pb-10 pt-14 sm:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Reveal>
              <h1 className="h-title text-[2.6rem] leading-[1.04] sm:text-[3.7rem]">
                <span className="h-underline">Free online calculator</span><br />
                &amp; unit converter<br />
                for everyday numbers.
              </h1>
            </Reveal>
            <Reveal delay={70}>
              <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-slate-600">
                {SITE.name} brings together a scientific calculator, unit conversion, currency and
                digital-asset reference tools, selected economic indicators and a place to enter
                your own formulas. Calculators prepare your answer while you type and show it only
                when you press their confirmation button. No account is required.
              </p>
            </Reveal>
            <Reveal delay={140}>
              <div className="mt-8">
                <Link href="/calculators" className="btn btn-primary">
                  Browse the tools <Icon name="arrow-right" size={17} />
                </Link>
              </div>
            </Reveal>
          </div>
          <Reveal delay={120}><Parallax range={14}><HeroIllustration /></Parallax></Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12" aria-labelledby="voice-heading">
        <div className="sketch overflow-hidden !p-0">
          <div className="grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-2">
            <div>
              <Reveal>
                <span className="chip"><Icon name="mic" size={13} /> Speak a calculation</span>
                <h2 id="voice-heading" className="h-title mt-4 text-3xl sm:text-4xl">
                  Say what you want to <span className="h-underline">calculate</span>
                </h2>
                <p className="mt-4 max-w-xl text-[1.05rem] leading-relaxed text-slate-600">
                  Press the microphone on the calculators page and speak a conversion, a formula or
                  a reference figure. The site understands the request and opens the right tool with
                  your values already in place — no typing, no menus to search through.
                </p>
              </Reveal>
              <Reveal delay={60}>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {VOICE_POINTS.map((point) => (
                    <div key={point.title} className="flex items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 border-[color:var(--line)] bg-white text-[color:var(--accent-2)] shadow-[2px_2px_0_0_var(--line)]">
                        <Icon name={point.icon} size={16} />
                      </span>
                      <div>
                        <div className="text-sm font-extrabold tracking-tight">{point.title}</div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">{point.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Reveal>
              <Reveal delay={110}>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href="/calculators" className="btn btn-primary">
                    Try speaking a calculation <Icon name="arrow-right" size={17} />
                  </Link>
                  <Link href="/guides/voice-coach" className="btn">
                    <Icon name="book" size={16} /> See the learning paths
                  </Link>
                </div>
              </Reveal>
            </div>
            <Reveal delay={90}><Parallax range={10}><VoiceIllustration /></Parallax></Reveal>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12" aria-labelledby="tools-heading">
        <Reveal>
          <h2 id="tools-heading" className="h-title text-3xl sm:text-4xl">Six tools, <span className="h-underline">many uses</span></h2>
          <p className="mt-2 max-w-xl text-slate-600">Calculate, convert values or explore selected reference information.</p>
        </Reveal>
        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t, i) => <Reveal key={t.href} delay={i * 50}><ToolCard {...t} /></Reveal>)}
        </div>
      </section>

      <GuideTeasers />

      <section className="mx-auto max-w-7xl px-5 py-12" aria-labelledby="facts-heading">
        <Reveal>
          <h2 id="facts-heading" className="h-title text-3xl sm:text-4xl">What to <span className="h-underline">expect</span></h2>
        </Reveal>
        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map((f) => (
            <Reveal key={f.title}>
              <div className="sketch h-full">
                <span className="icon-tile"><Icon name={f.icon} size={21} strokeWidth={2.1} /></span>
                <h3 className="mt-4 text-[1.05rem] font-extrabold tracking-tight">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12" aria-labelledby="formula-heading">
        <Reveal>
          <div className="rounded-[24px] border-2 border-[color:var(--line)] bg-[#0b1020] p-8 shadow-[var(--shadow-ink-lg)] sm:p-12" data-tone="dark">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <h2 id="formula-heading" className="text-3xl font-extrabold leading-tight text-white sm:text-4xl">Bring your own method.</h2>
                <p className="mt-4 leading-relaxed text-slate-300">
                  Enter a repayment expression, conversion factor or physics formula. Provide values
                  for its variables, then press Evaluate to reveal the result. Simplification and
                  derivative estimates can help with exploration; important calculations should be
                  checked independently.
                </p>
                <ul className="mt-6 space-y-2.5">
                  {[
                    "Review a simplified form of the expression",
                    "Estimate a derivative at a point you choose",
                    "Use unit expressions and named values",
                    "Save, export or remove your formulas",
                  ].map((s) => <li key={s} className="flex items-start gap-2.5 text-sm text-slate-200"><Icon name="check" size={17} className="mt-0.5 shrink-0 text-[#4ade80]" />{s}</li>)}
                </ul>
                <div className="mt-8"><Link href="/tools/formula" className="btn btn-primary">Open custom formulas <Icon name="arrow-right" size={17} /></Link></div>
              </div>
              <div className="rounded-2xl border-2 border-white/15 bg-black/40 p-5 text-sm" aria-label="Illustrative formula example">
                {[
                  { k: "expression", v: "P * (1 + r/n)^(n*t)" },
                  { k: "values", v: "P=1000, r=0.05, n=12, t=10" },
                  { k: "illustrative result", v: "1647.0095" },
                ].map((row) => <div key={row.k} className="flex items-baseline justify-between gap-4 border-b border-white/5 py-2.5 last:border-0"><span className="text-slate-400">{row.k}</span><span className="mono text-[#ffd23f]">{row.v}</span></div>)}
                <p className="mt-3 text-xs text-slate-400">Illustration only; values and rounding depend on the expression entered.</p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12" aria-labelledby="library-heading">
        <Reveal>
          <h2 id="library-heading" className="h-title text-3xl sm:text-4xl">Example <span className="h-underline">formulas</span></h2>
          <p className="mt-2 max-w-xl text-slate-600">Open an example in the formula tool and adapt it to your own inputs.</p>
        </Reveal>
        <div className="mt-8"><Reveal><FormulaLibrary /></Reveal></div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12" aria-labelledby="reference-heading">
        <Reveal>
          <h2 id="reference-heading" className="h-title text-3xl sm:text-4xl">Reference <span className="h-underline">information</span></h2>
          <p className="mt-2 max-w-2xl text-slate-600">Figures are supplied from external sources. Availability, coverage and update frequency vary by tool.</p>
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {INFORMATION_TYPES.map((item) => (
            <Reveal key={item.title}>
              <Link href={item.href} className="sketch card-hover block h-full">
                <div className="flex items-center gap-2"><Icon name={item.icon} size={17} className="text-[color:var(--accent)]" /><span className="font-extrabold">{item.title}</span></div>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.text}</p>
              </Link>
            </Reveal>
          ))}
        </div>
        <p className="mt-4 max-w-3xl text-xs text-slate-500">Reference figures are for general information, not advice. See the <Link href="/disclaimer" className="font-bold underline decoration-2 underline-offset-2">Disclaimer</Link>.</p>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 pb-20" aria-labelledby="faq-heading">
        <Reveal>
          <h2 id="faq-heading" className="h-title text-center text-3xl sm:text-4xl">Frequently <span className="h-underline">asked</span></h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-slate-600">Detailed answers for voice setup, processing messages, follow-up commands, saved formulas and reference figures.</p>
        </Reveal>
        <div className="mt-9"><Reveal><Faq /></Reveal></div>
      </section>
    </div>
  );
}

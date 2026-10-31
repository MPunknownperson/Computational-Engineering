import { GuideTeasers } from "@/components/search/GuideTeasers";
import { metadataFor } from "@/lib/seo";
import { SearchContext } from "@/components/search/SearchContext";
import Link from "next/link";
import { HeroIllustration } from "@/components/HeroIllustration";
import { VoiceIllustration } from "@/components/VoiceIllustration";
import { ToolCartoon, type ToolCartoonId } from "@/components/home/ToolCartoons";
import type { ToolTone } from "@/components/ToolCard";
import { Icon, type IconName } from "@/components/Icons";
import { MotionCard, Reveal } from "@/components/Motion";
import { Faq } from "@/components/home/Faq";
import { FormulaLibrary } from "@/components/home/Sections";
import { CURRENCIES, COUNTRIES, UNIT_COUNT, UNIT_CATEGORY_COUNT, CRYPTO_IDS, INDICATORS } from "@/lib/catalog";

const VOICE_POINTS: { icon: IconName; title: string; body: string }[] = [
  { icon: "mic", title: "Say it in your own words", body: "Try “120 dollars to euros” or “70 kilos in pounds”. The right tool opens with your numbers filled in." },
  { icon: "language", title: "English plus four others", body: "Spanish, French, German and Chinese work too. Accuracy is best in English; we're still tuning the rest." },
  { icon: "shield", title: "Audio stays with you", body: "Recognition is done by your phone or browser. We never receive the recording." },
  { icon: "refresh", title: "Short follow-ups work", body: "Say “again”, or just a new amount, and it reuses the last conversion." },
];

export const generateMetadata = () => metadataFor("/");

const TOOLS: {
  href: string; title: string; blurb: string; cartoon: ToolCartoonId; tone: ToolTone; badge?: string; meta: string;
}[] = [
  { href: "/tools/calculator", tone: "ink", cartoon: "calculator", title: "Calculator", blurb: "A basic calculator with a scratch area for notes. Your board is saved in this browser only.", meta: "press Calculate" },
  { href: "/tools/scientific", tone: "coral", cartoon: "scientific", title: "Scientific calculator", blurb: "Roots, trig, matrices, constants and units. Type it how you'd write it on paper.", meta: "press Calculate" },
  { href: "/tools/units", tone: "sky", cartoon: "units", title: "Unit converter", blurb: `${UNIT_COUNT} units in ${UNIT_CATEGORY_COUNT} categories. Convert once and see the value in every related unit.`, meta: "press Convert" },
  { href: "/tools/currency", tone: "terra", cartoon: "currency", title: "Currency reference", blurb: `${CURRENCIES.length} currencies with the rate date and a short history. Good for budgeting — your bank's rate will differ.`, badge: "updates", meta: "press Convert" },
  { href: "/tools/crypto", tone: "violet", cartoon: "crypto", title: "Digital-asset prices", blurb: `Prices and 24h change for ${CRYPTO_IDS.length} coins. Exchanges disagree, so treat these as ballpark numbers.`, badge: "updates", meta: `${CRYPTO_IDS.length} assets` },
  { href: "/tools/formula", tone: "pink", cartoon: "formula", title: "Custom formulas", blurb: "Write your own expression, fill in the variables, save it for later.", meta: "press Evaluate" },
  { href: "/tools/economy", tone: "mint", cartoon: "economy", title: "Economic indicators", blurb: `Inflation, GDP growth, rates and debt — ${INDICATORS.length} series for ${COUNTRIES.length} countries. Some only update yearly.`, badge: "updates", meta: "press Show" },
];

const FACTS: { icon: IconName; title: string; body: string }[] = [
  { icon: "function", title: "Use your own formulas", body: "Type something like P*(1+r/n)^(n*t), fill in the letters, done. Double-check anything important." },
  { icon: "bolt", title: "Reference information", body: "Rates and prices come from public sources and refresh at different speeds." },
  { icon: "shield", title: "No account required", body: "There are no accounts. Saved formulas are tied to this browser." },
  { icon: "target", title: "You press the button", body: "Results show up when you hit Calculate, not while you're still typing." },
];

const INFORMATION_TYPES = [
  { icon: "globe" as IconName, title: "Currency reference values", text: "Indicative exchange-rate information and recent historical views. These are not transaction offers and may differ from rates available to you.", href: "/tools/currency" },
  { icon: "coin" as IconName, title: "Digital-asset market information", text: "Prices, daily movement and market summaries. Figures can change quickly and differ across venues.", href: "/tools/crypto" },
  { icon: "chart" as IconName, title: "Economic indicators", text: "Selected public statistics, many of which are published periodically and may be revised.", href: "/tools/economy", tone: "mint" },
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
                Calculators and converters,<br />without the clutter.
              </h1>
            </Reveal>
            <Reveal delay={70}>
              <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-slate-600">
                A scientific calculator, a unit converter, exchange rates and a few other tools we
                kept reaching for ourselves. No sign-up, no pop-ups asking for your email.
              </p>
            </Reveal>
            <Reveal delay={140}>
              <div className="mt-8">
                <Link href="/calculators" className="btn btn-primary">
                  See all tools <Icon name="arrow-right" size={17} />
                </Link>
              </div>
            </Reveal>
          </div>
          <Reveal delay={120}><HeroIllustration /></Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12" aria-labelledby="voice-heading">
        <div className="sketch overflow-hidden !p-0">
          <div className="grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-2">
            <div>
              <Reveal>
                <span className="chip"><Icon name="mic" size={13} /> Speak a calculation</span>
                <h2 id="voice-heading" className="h-title mt-4 text-3xl sm:text-4xl">
                  Or just say it out loud
                </h2>
                <p className="mt-4 max-w-xl text-[1.05rem] leading-relaxed text-slate-600">
                  Tap the mic on the tools page and say what you need. It works well for
                  conversions; longer formulas are hit and miss.
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
                    Try the mic <Icon name="arrow-right" size={17} />
                  </Link>
                  <Link href="/guides/voice-coach" className="btn">
                    <Icon name="book" size={16} /> Voice tips
                  </Link>
                </div>
              </Reveal>
            </div>
            <Reveal delay={90}><VoiceIllustration /></Reveal>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12" aria-labelledby="tools-heading">
        <Reveal>
          <h2 id="tools-heading" className="h-title text-3xl sm:text-4xl">Seven tools, <span className="h-underline">many uses</span></h2>
          <p className="mt-2 max-w-2xl text-slate-600">Each tool has its own cartoon and its own job — sketch a sum, convert a unit, or look up a reference figure. Nothing is revealed until you press the button.</p>
        </Reveal>
        <div className="mt-9 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {TOOLS.map((t, i) => (
            <Reveal key={t.href} delay={i * 50} className="h-full">
              <MotionCard className="h-full">
                <Link href={t.href} className="sketch card-hover flex h-full flex-col overflow-hidden !p-0">
                  <div className="border-b-2 border-[color:var(--line)] bg-[color:var(--paper)] p-3">
                    <ToolCartoon id={t.cartoon} />
                  </div>
                  <span className="flex flex-1 flex-col p-5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[1.05rem] font-extrabold tracking-tight">{t.title}</span>
                      {t.badge && <span className="chip chip-live !py-0.5 !text-[.6rem] uppercase tracking-widest"><span className="live-dot" /> {t.badge}</span>}
                    </span>
                    <span className="mt-2 block text-sm leading-relaxed text-slate-600">{t.blurb}</span>
                    <span className="mt-4 flex items-center justify-between border-t-2 border-[color:var(--line)] pt-3 text-sm">
                      <span className="text-xs font-semibold text-slate-500">{t.meta}</span>
                      <span className="inline-flex items-center gap-1 font-bold">Open <Icon name="arrow-right" size={16} className="card-arrow" /></span>
                    </span>
                  </span>
                </Link>
              </MotionCard>
            </Reveal>
          ))}
        </div>
      </section>

      <GuideTeasers />

      <section className="defer-paint mx-auto max-w-7xl px-5 py-12" aria-labelledby="facts-heading">
        <Reveal>
          <h2 id="facts-heading" className="h-title text-3xl sm:text-4xl">A few notes</h2>
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

      <section className="defer-paint mx-auto max-w-7xl px-5 py-12" aria-labelledby="formula-heading">
        <Reveal>
          <div className="rounded-[24px] border-2 border-[color:var(--line)] bg-[#0b1020] p-8 shadow-[var(--shadow-ink-lg)] sm:p-12" data-tone="dark">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <h2 id="formula-heading" className="text-3xl font-extrabold leading-tight text-white sm:text-4xl">Your own formulas</h2>
                <p className="mt-4 leading-relaxed text-slate-300">
                  Loan repayments, a conversion factor you use at work, a physics formula from class.
                  Write it once, plug in numbers whenever you need them.
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

      <section className="defer-paint mx-auto max-w-7xl px-5 py-12" aria-labelledby="library-heading">
        <Reveal>
          <h2 id="library-heading" className="h-title text-3xl sm:text-4xl">Some examples</h2>
          <p className="mt-2 max-w-xl text-slate-600">Click one to open it in the formula tool.</p>
        </Reveal>
        <div className="mt-8"><Reveal><FormulaLibrary /></Reveal></div>
      </section>

      <section className="defer-paint mx-auto max-w-7xl px-5 py-12" aria-labelledby="reference-heading">
        <Reveal>
          <h2 id="reference-heading" className="h-title text-3xl sm:text-4xl">Where the numbers come from</h2>
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

      <section className="defer-paint mx-auto max-w-7xl px-5 py-12 pb-20" aria-labelledby="faq-heading">
        <Reveal>
          <h2 id="faq-heading" className="h-title text-center text-3xl sm:text-4xl">Questions</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-slate-600">Things people have asked us.</p>
        </Reveal>
        <div className="mt-9"><Reveal><Faq /></Reveal></div>
      </section>
    </div>
  );
}

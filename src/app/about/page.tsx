import Link from "next/link";
import { BrandMark, Wordmark } from "@/components/Brand";
import { Reveal } from "@/components/Motion";
import { Icon, type IconName } from "@/components/Icons";
import { LegalLinks } from "@/components/LegalPage";
import { Owl } from "@/components/Mascots";
import { SITE } from "@/lib/site";
import { COUNTRIES, CURRENCIES, INDICATORS, UNIT_COUNT, UNIT_CATEGORY_COUNT } from "@/lib/catalog";

const PRINCIPLES: { icon: IconName; title: string; body: string; bg: string; fg: string }[] = [
  { icon: "target", title: "You confirm the result", body: "Work is prepared while you type, but the answer is shown only after you press Convert, Calculate, Evaluate or Show.", bg: "#ffd23f", fg: "#0b1020" },
  { icon: "shield", title: "Useful context", body: "Dates and update times appear alongside reference figures where available.", bg: "#5b8cff", fg: "#fff" },
  { icon: "bolt", title: "No account required", body: "Calculators can be used without creating a profile. Saving an expression is optional.", bg: "#ff6b4a", fg: "#fff" },
  { icon: "layers", title: "Everyday calculations", body: "Scientific expressions, unit conversions and selected reference figures in one place.", bg: "#4ade80", fg: "#0b1020" },
];

const HOW = [
  { title: "Calculations", body: "Enter an expression and any values it needs, then press the confirmation button. Decimal arithmetic is used where possible, and displayed values may be rounded." },
  { title: "Reference figures", body: "Currency, digital-asset and economic information is drawn from external sources. Coverage and update frequency vary." },
  { title: "Saved formulas", body: "If you choose to save an expression, it is associated with a random workspace reference so it can be shown again in the same browser. You can download or remove it." },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-14">
      <Reveal>
        <div className="flex flex-wrap items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark size={60} />
            <div><Wordmark className="text-3xl" /><div className="text-sm font-semibold text-slate-500">{SITE.tagline}</div></div>
          </Link>
          <Owl mood="think" size={80} />
        </div>
        <h1 className="h-title mt-6 text-4xl sm:text-5xl">
          About our <span className="h-underline">calculator</span> and conversion tools
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-slate-600">
          {SITE.name} is a friendly collection of calculation tools for scientific expressions,
          unit conversion, reference information and custom formulas. The name combines <em>radix</em>,
          the base of a numeral system, with <em>loom</em>: a place to bring separate mathematical
          ideas together. The static, interwoven mark reflects that combination.
        </p>
      </Reveal>

      <Reveal delay={80}>
        <h2 className="mt-14 text-2xl font-extrabold tracking-tight">What guides the site</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {PRINCIPLES.map((item) => (
            <div key={item.title} className="sketch h-full">
              <span className="icon-tile" style={{ background: item.bg, color: item.fg }}><Icon name={item.icon} size={20} strokeWidth={2.1} /></span>
              <h3 className="mt-3 font-extrabold">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={120}>
        <h2 className="mt-14 text-2xl font-extrabold tracking-tight">Coverage</h2>
        <p className="mt-2 text-sm text-slate-600">A summary of the selections currently available:</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sketch-sm"><strong>{UNIT_COUNT} units</strong> in {UNIT_CATEGORY_COUNT} categories</div>
          <div className="sketch-sm"><strong>{CURRENCIES.length} currencies</strong> in the currency tool</div>
          <div className="sketch-sm"><strong>{COUNTRIES.length} economies</strong> with {INDICATORS.length} indicators</div>
          <div className="sketch-sm"><strong>Custom expressions</strong> with user-provided values</div>
          <div className="sketch-sm"><strong>A blackboard calculator</strong> for sketches, notes and expressions</div>
        </div>
      </Reveal>

      <Reveal delay={160}>
        <h2 className="mt-14 text-2xl font-extrabold tracking-tight">How to use the tools</h2>
        <ol className="mt-4 space-y-3">
          {HOW.map((item, i) => (
            <li key={item.title} className="sketch-sm flex items-start gap-3">
              <span className="mono inline-grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 border-[color:var(--line)] bg-[color:var(--accent-3)] text-xs font-extrabold">{i + 1}</span>
              <span><span className="block font-extrabold">{item.title}</span><span className="mt-0.5 block text-sm leading-relaxed text-slate-600">{item.body}</span></span>
            </li>
          ))}
        </ol>
      </Reveal>

      <Reveal delay={200}>
        <h2 className="mt-14 text-2xl font-extrabold tracking-tight">Policies and questions</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">Read the current notices about use, privacy, result limitations and accessibility.</p>
        <div className="mt-4"><LegalLinks /></div>
      </Reveal>

      <Reveal delay={230}>
        <div className="mt-10"><Link href="/calculators" className="btn btn-primary">Browse the tools <Icon name="arrow-right" size={17} /></Link></div>
      </Reveal>
    </div>
  );
}

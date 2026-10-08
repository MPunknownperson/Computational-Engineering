import Link from "next/link";
import { BrandMark, Wordmark } from "./Brand";
import { SITE } from "@/lib/site";

const COLS = [
  { title: "Calculate", items: [
    { href: "/tools/scientific", label: "Scientific calculator" },
    { href: "/tools/units", label: "Unit converter" },
    { href: "/tools/formula", label: "Custom formulas" },
  ] },
  { title: "By topic", items: [
    { href: "/convert", label: "Unit converters" },
    { href: "/calculate", label: "Online calculators" },
    { href: "/reference", label: "Reference figures" },
    { href: "/guides", label: "Math guides" },
  ] },
  { title: "Reference tools", items: [
    { href: "/tools/currency", label: "Currency values" },
    { href: "/tools/crypto", label: "Digital-asset prices" },
    { href: "/tools/economy", label: "Economic indicators" },
  ] },
  { title: "Engines", items: [
    { href: "/studio", label: "Melody studio" },
    { href: "/arena", label: "Rhythm arena" },
    { href: "/arena?mode=tilt", label: "Play with motion" },
    { href: "/studio?compose=1", label: "Generate a melody" },
  ] },
  { title: "Learn", items: [
    { href: "/guides", label: "Worked guides" },
    { href: "/guides/voice-coach", label: "Voice learning paths" },
    { href: "/guides/meters-to-feet", label: "Meters to feet" },
    { href: "/guides/quadratic-equation-positive-root", label: "Quadratic formula" },
    { href: "/guides/megabytes-vs-mebibytes", label: "MB vs MiB" },
  ] },
  { title: "Site", items: [
    { href: "/calculators", label: "All tools" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ] },
  { title: "Information", items: [
    { href: "/terms", label: "Terms of Use" },
    { href: "/privacy", label: "Privacy Notice" },
    { href: "/disclaimer", label: "Disclaimer" },
    { href: "/accessibility", label: "Accessibility" },
  ] },
];

export function SiteFooter() {
  return (
    <footer className="relative z-[1] mt-20 border-t-2 border-[color:var(--line)] bg-[color:var(--paper-2)]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-2 lg:grid-cols-[1.3fr_repeat(5,1fr)]">
        <div>
          <Link href="/" className="inline-flex items-center gap-2.5"><BrandMark size={32} /><Wordmark className="text-lg" /></Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-600">{SITE.description}</p>
        </div>
        {COLS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="mb-3 text-sm font-extrabold tracking-tight">{column.title}</h2>
            <ul className="space-y-2 text-sm">{column.items.map((item) => <li key={item.href}><Link href={item.href} className="font-semibold text-slate-600 hover:text-[color:var(--ink)] hover:underline">{item.label}</Link></li>)}</ul>
          </nav>
        ))}
      </div>
      <div className="border-t-2 border-[color:var(--line)] px-5 py-5 text-center text-xs font-semibold text-slate-500">
        © {new Date().getFullYear()} {SITE.name}. External reference information may be delayed, revised or unavailable.
      </div>
    </footer>
  );
}

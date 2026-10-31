import Link from "next/link";
import { Reveal } from "@/components/Motion";
import { Icon, type IconName } from "@/components/Icons";
import { LegalLinks } from "@/components/LegalPage";
import { ContactForm } from "@/components/ContactForm";
import { Owl } from "@/components/Mascots";

const HELP: { icon: IconName; title: string; body: string }[] = [
  { icon: "target", title: "Which tool", body: "and the expression or values involved." },
  { icon: "sparkle", title: "What happened", body: "what you expected and what you saw." },
  { icon: "globe", title: "Reference information", body: "the date or displayed update time, if relevant." },
  { icon: "layers", title: "Saved formulas", body: "the formula name, if possible. The Privacy Policy has controls to download or remove them." }
];

const SELF_SERVICE = [
  { href: "/privacy#your-data", title: "Manage saved formulas", detail: "Download or remove them using the controls in the Privacy Policy." },
  { href: "/disclaimer", title: "Understand a result", detail: "Review the limits of reference figures and calculations." },
  { href: "/accessibility", title: "Accessibility information", detail: "Read current support and known limitations." },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="chip"><Icon name="sparkle" size={13} strokeWidth={2.3} /> contact</span>
            <h1 className="h-title mt-4 text-4xl sm:text-5xl">Contact us about <span className="h-underline">feedback</span>, privacy or accessibility</h1>
            <p className="mt-4 max-w-2xl text-[1.05rem] leading-relaxed text-slate-600">
              Use the form to send feedback, report a result that looks wrong, or submit a privacy or accessibility request.
            </p>
          </div>
          <Owl mood="happy" size={88} />
        </div>
      </Reveal>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Reveal><ContactForm /></Reveal>
        <div className="space-y-5">
          <Reveal delay={50}>
            <div className="sketch">
              <h2 className="text-lg font-extrabold tracking-tight">Helpful details</h2>
              <ul className="mt-3 space-y-2.5">
                {HELP.map((item) => (
                  <li key={item.title} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700">
                    <Icon name={item.icon} size={16} className="mt-0.5 shrink-0 text-[color:var(--accent)]" />
                    <span><strong>{item.title}</strong> {item.body}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={90}>
            <div className="sketch">
              <h2 className="text-lg font-extrabold tracking-tight">You may not need to send a message</h2>
              <ul className="mt-3 space-y-1">
                {SELF_SERVICE.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="row-hover group flex items-center justify-between gap-3 rounded-xl px-2.5 py-2">
                      <span><span className="block text-sm font-extrabold">{item.title}</span><span className="block text-xs text-slate-500">{item.detail}</span></span>
                      <Icon name="arrow-right" size={15} className="shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={130}>
            <div className="sketch">
              <h2 className="text-lg font-extrabold tracking-tight">Policies and notices</h2>
              <p className="mt-2 text-sm text-slate-600">Read the current information about use, privacy, results and accessibility.</p>
              <div className="mt-4"><LegalLinks current="/contact" /></div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

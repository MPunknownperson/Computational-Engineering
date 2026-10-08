import Link from "next/link";
import { Icon } from "@/components/Icons";
import { GuideHero } from "@/components/GuideHero";
import { Reveal } from "@/components/Motion";
import { metadataFor } from "@/lib/seo";
import { SearchContext } from "@/components/search/SearchContext";
import { LANGUAGE_PACKS } from "@/lib/i18n";
import { LEARNING_PATHS, LEARNING_PATH_ORDER } from "@/lib/learning-paths";

export const generateMetadata = () => metadataFor("/guides/voice-coach");

/**
 * A learning path for every supported language — English included.
 *
 * Most language-learning sites teach a language other than the one the
 * course is written in, so the language the course itself happens to be
 * written in never gets a path of its own. Here the "language" being taught
 * is the site's own voice command grammar, so every supported language —
 * including English — gets the same five-unit, can-do progression.
 *
 * Built as plain <details>/<summary> disclosures: the full path for every
 * language is in the HTML from the first response and works with the
 * keyboard, a screen reader or no JavaScript at all; opening one is a native
 * browser interaction, not a client-side tab system to keep in sync.
 */
export default function VoiceCoachPage() {
  return (
    <>
      <SearchContext path="/guides/voice-coach" />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-5 sm:py-14">
        <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_380px]">
          <Reveal>
            <span className="chip"><Icon name="language" size={13} /> Voice · Learning paths</span>
            <h1 className="h-title mt-5 text-4xl sm:text-5xl">
              A learning path for <span className="h-underline">every language</span> — English included
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
              Five short units per language, each with a clear goal and real phrases to try: say a
              number, name a currency, ask for a formula, read reference data, then chain a
              follow-up without repeating yourself. Open a language below to see its path.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <GuideHero
              path="/guides/voice-coach"
              alt="Illustration of multilingual speech recognised, interpreted as a verified calculator action and opened as a prefilled tool."
              priority
            />
          </Reveal>
        </div>

        <div className="mt-10 space-y-5">
          {LEARNING_PATH_ORDER.map((lang, index) => {
            const pack = LANGUAGE_PACKS[lang];
            const path = LEARNING_PATHS[lang];
            return (
              <Reveal key={lang} delay={Math.min(index, 4) * 40}>
                <details className="group sketch !p-0 overflow-hidden" open={lang === "en"}>
                  <summary className="flex cursor-pointer list-none items-center gap-3.5 px-5 py-4 marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="icon-tile !h-11 !w-11 !rounded-[14px]" style={{ background: "var(--accent-3)" }}>
                      <Icon name="language" size={19} strokeWidth={2.1} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-2">
                        <span className="text-lg font-extrabold tracking-tight">{pack.name}</span>
                        <span className="text-sm font-semibold text-slate-500">{pack.nativeName}</span>
                      </span>
                      <span className="block text-xs font-semibold uppercase tracking-widest text-slate-500">
                        {path.units.length} units · {path.units.length * 3} example commands
                      </span>
                    </span>
                    <Icon name="chevron" size={20} className="shrink-0 text-slate-500 transition-transform duration-300 group-open:rotate-180" />
                  </summary>

                  <div className="border-t-2 border-[color:var(--line)] bg-[#fffdf5] px-5 py-6 sm:px-7">
                    <ol className="relative space-y-6 before:absolute before:bottom-2 before:left-[21px] before:top-2 before:w-0.5 before:border-l-2 before:border-dashed before:border-[color:var(--line)] before:content-['']">
                      {path.units.map((unit, unitIndex) => (
                        <li key={unit.id} className="relative pl-14">
                          <span className="absolute left-0 top-0 grid h-11 w-11 place-items-center rounded-full border-2 border-[color:var(--line)] bg-white shadow-[2px_2px_0_0_var(--line)]">
                            <Icon name={unit.icon} size={19} strokeWidth={2.1} />
                          </span>
                          <div className="sketch-sm">
                            <span className="chip !py-0.5 !text-[.62rem]">Unit {unitIndex + 1}</span>
                            <h3 className="mt-2 text-base font-extrabold tracking-tight">{unit.title}</h3>
                            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{unit.canDo}</p>
                            <ul className="mt-3.5 space-y-2.5">
                              {unit.phrases.map((phrase) => (
                                <li key={phrase.speech} className="rounded-xl border border-[color:var(--line)] bg-white px-3.5 py-2.5">
                                  <p className="mono text-sm font-bold text-[color:var(--ink)]">&ldquo;{phrase.speech}&rdquo;</p>
                                  <p className="mt-1 text-xs text-slate-500">{phrase.meaning}</p>
                                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-[#146c3a]">
                                    <Icon name="arrow-right" size={13} />{phrase.opens}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                </details>
              </Reveal>
            );
          })}
        </div>

        <Reveal>
          <div className="mt-12 rounded-[24px] border-2 border-[color:var(--line)] bg-[#0b1020] p-8 text-center shadow-[var(--shadow-ink-lg)] sm:p-10">
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">Try it with your own voice</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
              Every phrase above works on the calculators page right now. Recognition runs on your
              device or through your browser&apos;s own speech service — never uploaded to this site.
            </p>
            <Link href="/calculators" className="btn btn-primary mt-6">
              Open the calculators <Icon name="arrow-right" size={17} />
            </Link>
          </div>
        </Reveal>
        <p className="mt-6 text-sm text-slate-600">
          Want the technical detail behind recognition and processing? Read the{" "}
          <Link href="/privacy#voice" className="font-bold underline underline-offset-4">voice section of the Privacy Notice</Link>.
        </p>
      </div>
    </>
  );
}

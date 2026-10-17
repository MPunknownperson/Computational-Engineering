"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { Icon } from "@/components/Icons";

type Item = { q: string; a: ReactNode };

const ITEMS: Item[] = [
  {
    q: "What kind of live information is shown?",
    a: "The currency tool shows published reference values; the digital-asset tool shows market summaries; and the economy tool shows public indicators. Their sources and update schedules differ, and figures may be delayed, revised or unavailable. Reference values are not transaction offers or advice.",
  },
  {
    q: "Why does nothing appear until I press a button?",
    a: "Each tool prepares an answer while you type, then waits for you to confirm. Press Convert, Calculate, Evaluate, Show or Filter — or press Enter in a field — to reveal it. Change an input and the result hides again until you confirm, so you always know which values produced the number you are looking at.",
  },
  {
    q: "How does “Speak a calculation” work from start to finish?",
    a: "Press the microphone on the Calculators page, grant the browser's microphone permission, then say a complete request such as “Convert 120 US dollars to euros.” Speech becomes text, the language pack finds the amount, currencies or units and compiles a verified instruction. The page then automatically opens the relevant calculator with the values already filled in. Check those values before you rely on a result: speech recognition can mishear names, numbers or units.",
  },
  {
    q: "What does “Preparing voice recognition…” mean?",
    a: "The browser may need to prepare a native Web Speech API language pack when explicit on-device recognition is supported and required. Preparation needs a tap, and a fresh tap starts the microphone after it is ready. If no compatible browser speech service is available, voice stays unavailable; you can always type values instead.",
  },
  {
    q: "Why does it say “Waiting for microphone permission…”?",
    a: "The browser is showing, or is about to show, its own permission prompt. Choose Allow if you want to speak. If you previously denied the microphone, use the lock or microphone control in the browser address bar to change the setting, then try again. If another application is using the microphone, close it before retrying.",
  },
  {
    q: "Why is voice input unavailable on this device, browser or region?",
    a: "Voice needs HTTPS, microphone permission, a verified country or region, and a working Web Speech API service. On Android phones and tablets, use Chrome with Google Mobile Services (GMS) and Google speech recognition enabled. On iPhone and iPad, this site supports voice only in Safari with Apple’s system Siri speech-to-text technology. Availability depends on service, language, network and regional rules. The typed tools remain available.",
  },
  {
    q: "Where is my audio processed?",
    a: <>
      Voice is recognised only through your browser’s Web Speech API. Chrome on Android uses the Google speech service through GMS; Safari on iPhone/iPad uses Apple’s system Siri speech-to-text. These services may send audio to their provider, so native recognition is not an offline guarantee. An explicitly supported local-only browser mode must keep processing on-device. This website does not receive or store microphone audio. Read the full details in the <Link href="/privacy#voice" className="font-bold underline underline-offset-4">Voice input section of the Privacy Policy</Link>.
    </>,
  },
  {
    q: "What does “That didn’t match a calculator” mean?",
    a: "The recognizer produced text, but the site's deterministic language pack could not connect it to an approved tool or page. It does not guess and it never turns spoken text into an arbitrary web address. Say both sides of a conversion — for example, “5 miles to kilometers” — or name a known task such as “loan payment,” “split the bill,” “US inflation” or “scientific calculator.”",
  },
  {
    q: "Why can speech recognition still get a number or word wrong?",
    a: "Recognition is best-effort: accents, background noise, microphone quality, language and the browser’s speech service can affect the transcript. The site interprets the returned text as a verified calculator command. A later recognition hypothesis may correct a mishearing, and phrase memory is optional. Always check the amount, currency or unit, and conversion direction in the opened tool.",
  },
  {
    q: "Will the voice feature learn from me?",
    a: "Only in this browser, and only as a small phrase-to-command association. If the recognizer's first guess is wrong but another hypothesis is understood, the feature can remember that phrase so it works next time. It does not save audio or upload the phrase. “Forget learned phrases” on the voice card clears both learned phrases and the short-lived last-command context.",
  },
  {
    q: "Can I follow up without repeating the whole conversion?",
    a: "Yes, within the same browser session. After you say “120 dollars to euros,” return to the Calculators page and say “and 80” to reuse the currency direction with the new amount, or say “again” to repeat the verified command. The last command expires when the browser session ends or when you clear learned phrases.",
  },
  {
    q: "Can I use my own formula?",
    a: "Yes. Enter an expression with named values and press Evaluate. The formula tool can also show a simplified form and estimate a derivative. Check any important result independently.",
  },
  {
    q: "Do I need an account?",
    a: "No account is required. If you choose to save formulas, a random workspace reference helps show them again in the same browser. You can download or remove saved formulas in the Privacy Policy.",
  },
  {
    q: "Are the figures advice or guaranteed current?",
    a: <>
      No. Calculations depend on your inputs; external figures can be delayed, changed or unavailable. {"Radix Loom"} does not provide professional advice. See the <Link href="/disclaimer" className="font-bold underline underline-offset-4">Disclaimer</Link> before relying on a result.
    </>,
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();
  return (
    <div className="mx-auto max-w-3xl divide-y divide-[color:var(--line)] overflow-hidden rounded-[20px] border-2 border-[color:var(--line)] bg-white shadow-[var(--shadow-ink)]">
      {ITEMS.map((item, index) => {
        const isOpen = open === index;
        const id = `${baseId}-${index}`;
        return (
          <div key={item.q}>
            <button
              className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-200 hover:bg-[#fff4d0]"
              onClick={() => setOpen(isOpen ? null : index)}
              aria-expanded={isOpen}
              aria-controls={id}
            >
              <span className="font-semibold text-slate-900">{item.q}</span>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2 border-[color:var(--line)] bg-[#fffdf5] text-slate-600 transition-transform duration-300 group-aria-expanded:rotate-180">
                <Icon name="chevron" size={16} />
              </span>
            </button>
            <div id={id} className={`acc-body ${isOpen ? "is-open" : ""}`}>
              <div><div className="px-5 pb-5 text-sm leading-relaxed text-slate-600">{item.a}</div></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

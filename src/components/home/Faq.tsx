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
    a: "The feature is selecting the processing path for your browser, device and region. A browser-provided on-device language pack may need preparing. If this browser lacks a usable speech engine, the page loads multilingual Whisper Base, an Apache-2.0 model published by Xenova and fetched as separate quantized assets from Hugging Face Hub. The voice card identifies the publisher and host and shows the current file and download progress; the browser caches each asset for later use. This prepares software only—the microphone is requested afterwards, and audio is not sent to the model host.",
  },
  {
    q: "Why does it say “Waiting for microphone permission…”?",
    a: "The browser is showing, or is about to show, its own permission prompt. Choose Allow if you want to speak. If you previously denied the microphone, use the lock or microphone control in the browser address bar to change the setting, then try again. If another application is using the microphone, close it before retrying.",
  },
  {
    q: "Why is voice input unavailable on this device, browser or region?",
    a: "Voice needs a secure HTTPS page, a microphone, and a usable recognition path. Phones and tablets are kept on an explicitly local path; if neither the browser nor the device can provide one, the feature remains unavailable rather than sending audio elsewhere. Desktop browsers normally use their own managed recognition service. Some countries or regions are limited to local processing or have the feature withheld. The calculator tools continue to work without voice.",
  },
  {
    q: "Where is my audio processed?",
    a: <>
      The page chooses a processing route automatically. An explicit local route keeps audio on the device. A desktop browser may use its own managed speech service; the site does not receive or store that audio. If the browser has no usable speech engine, Xenova Whisper Base can run in a page worker after its quantized files download from Hugging Face Hub. Read the full details in the <Link href="/privacy#voice" className="font-bold underline underline-offset-4">Voice input section of the Privacy Notice</Link>.
    </>,
  },
  {
    q: "What does “That didn’t match a calculator” mean?",
    a: "The recognizer produced text, but the site's deterministic language pack could not connect it to an approved tool or page. It does not guess and it never turns spoken text into an arbitrary web address. Say both sides of a conversion — for example, “5 miles to kilometers” — or name a known task such as “loan payment,” “split the bill,” “US inflation” or “scientific calculator.”",
  },
  {
    q: "Why can speech recognition still get a number or word wrong?",
    a: "Recognition is best-effort: accents, background sound, microphone quality and a browser's language model all affect the transcript. On the in-page fallback, multilingual Whisper Base runs in a worker with beam-search decoding; French, Chinese and other configured languages are passed using their model language names rather than short locale codes. The page shows both the transcript and the tool interpretation before it opens, and repeated recogniser mishearings can be corrected by a later hypothesis and remembered on this device. Check the amount, currency/unit and direction in the opened tool before confirming.",
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
    a: "No account is required. If you choose to save formulas, a random workspace reference helps show them again in the same browser. You can download or remove saved formulas in the Privacy Notice.",
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

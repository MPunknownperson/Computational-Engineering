"use client";
import { useState } from "react";
import { Icon } from "@/components/Icons";

const ITEMS = [
  {
    q: "What kind of live information is shown?",
    a: "The currency tool shows published reference values; the digital-asset tool shows market summaries; and the economy tool shows public indicators. Their sources and update schedules differ, and figures may be delayed or revised.",
  },
  {
    q: "Why does nothing appear until I press a button?",
    a: "Each tool works out the answer while you type, then waits for you to confirm. Pressing Convert, Calculate, Evaluate, Show or Filter — or pressing Enter in a field — reveals the result. Change an input and the result hides again until you confirm, so you always know which values produced the number you are looking at.",
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
    a: "No. Calculations depend on your inputs; external figures can be delayed, changed or unavailable. Radix Loom does not provide professional advice. See the Disclaimer before relying on a result.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-3xl divide-y divide-[color:var(--line)] overflow-hidden rounded-[20px] border-2 border-[color:var(--line)] bg-white shadow-[var(--shadow-ink)]">
      {ITEMS.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.q}>
            <button
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors duration-200 hover:bg-[#fff4d0]"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              <span className="font-semibold text-slate-900">{it.q}</span>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2 border-[color:var(--line)] bg-[#fffdf5] text-slate-600">
                <Icon name="chevron" size={16} />
              </span>
            </button>
            <div className={`acc-body ${isOpen ? "is-open" : ""}`}>
              <div><p className="px-5 pb-5 text-sm leading-relaxed text-slate-600">{it.a}</p></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

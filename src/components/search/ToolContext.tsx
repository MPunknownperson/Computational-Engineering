import Link from "next/link";
import { GUIDES, guidePath } from "@/lib/guides";

const HELP: Record<string, { title: string; steps: string[]; note: string }> = {
  "/tools/scientific": {
    title: "Working with scientific expressions",
    steps: ["Enter an expression using explicit brackets and operations, such as sqrt(a^2 + b^2).", "Define the values it needs. Semicolons separate definitions; later values can use earlier ones.", "Press Calculate to reveal the answer. Matrix inputs use semicolons between rows. Review the result before reusing it."],
    note: "Angles in ordinary trigonometric expressions are in radians unless units say otherwise. Numerical methods are approximations, and rounding or singularities can affect a result.",
  },
  "/tools/units": {
    title: "Choosing the right conversion",
    steps: ["Choose the category before selecting the source and destination units.", "Enter the measured value. Decimal data units such as MB are distinct from binary units such as MiB.", "Press Convert to reveal the result. A different input requires another confirmation."],
    note: "Temperature readings need an offset as well as a scale factor. Mass, force, area and volume are different quantities; check that the chosen category matches your measurement.",
  },
  "/tools/formula": {
    title: "Building a reusable formula",
    steps: ["Name the expression and enter its mathematical terms, for example P*(1+r/n)^(n*t).", "Assign values with consistent units. A rate of 5% is 0.05 when the formula expects a decimal rate.", "Press Evaluate. Save only expressions you want to revisit, and use the Privacy Notice controls to download or remove saved formulas."],
    note: "Saving does not certify a formula. Review its assumptions, inputs and output before making an important decision. Avoid sensitive information in saved content.",
  },
  "/tools/currency": {
    title: "Understanding a currency conversion",
    steps: ["Enter the base-currency amount and select the target currency.", "Wait for reference information to be available, then press Convert.", "Check the reference date as well as the amount. A page update time is not necessarily the time the underlying value was published."],
    note: "Reference rates are not dealing quotes. Fees, spreads, settlement times and rounding may change the amount available from a financial institution.",
  },
  "/tools/crypto": {
    title: "Reading a digital-asset market table",
    steps: ["The table presents a fixed selection of digital assets, not every available asset.", "Type a name or symbol and press Filter to apply the selection.", "Compare the displayed price with daily movement and market context; the reference information can be delayed."],
    note: "A daily percentage is not a forecast. Prices differ across venues, and a market-size figure is not the same as available liquidity. This table does not provide investment advice.",
  },
  "/tools/economy": {
    title: "Comparing economic indicators",
    steps: ["Choose an economy and one of the available measures.", "Press Show after the information is ready. The latest available observation may be for an earlier year.", "Review the historical series and the values table together. Keep the definition and time period consistent when comparing economies."],
    note: "A missing observation is not zero. Periodic statistics may be revised; nominal GDP per person is not adjusted for purchasing power or inflation unless explicitly stated.",
  },
};

export function ToolContext({ path }: { path: string }) {
  const info = HELP[path];
  if (!info) return null;
  const guides = GUIDES.filter((guide) => guide.toolHref.split("?")[0] === path);
  return <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-5" aria-labelledby="tool-help-title">
    <div className="sketch">
      <h2 id="tool-help-title" className="text-xl font-extrabold">{info.title}</h2>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700">{info.steps.map((step) => <li key={step}>{step}</li>)}</ol>
      <p className="mt-4 text-sm leading-relaxed text-slate-600">{info.note}</p>
      {guides.length > 0 && <div className="mt-5 border-t border-[color:var(--line)] pt-4">
        <h3 className="text-sm font-bold">Worked examples</h3>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-3 text-sm">{guides.map((guide) => <li key={guide.slug}><Link href={guidePath(guide)} className="font-semibold text-[#923019] underline underline-offset-4">{guide.title.split(":")[0]}</Link></li>)}</ul>
      </div>}
    </div>
  </section>;
}

import Link from "next/link";
import { presetHref } from "@/lib/presets";
import { Icon, type IconName } from "@/components/Icons";

/** Ready-to-adapt expressions. They are examples only; check results independently. */
export const LIBRARY: {
  id: string;
  name: string;
  field: string;
  expr: string;
  vars: string;
  icon: IconName;
}[] = [
  { id: "loan-payment", name: "Loan payment", field: "finance", expr: "P * (r/12) / (1 - (1 + r/12)^(-12*n))", vars: "P = 250000, r = 0.048, n = 30", icon: "wallet" },
  { id: "circle-area", name: "Circle area", field: "geometry", expr: "pi * radius^2", vars: "radius = 12.5", icon: "target" },
  { id: "heat-change", name: "Heat change", field: "science", expr: "mass * capacity * (T2 - T1)", vars: "mass = 2, capacity = 4.18, T2 = 80, T1 = 20", icon: "thermometer" },
  { id: "fuel-estimate", name: "Fuel estimate", field: "travel", expr: "distance * use / 100 * price", vars: "distance = 340, use = 7.4, price = 1.68", icon: "gauge" },
  { id: "tip-split", name: "Tip split", field: "everyday", expr: "bill * (1 + tip) / people", vars: "bill = 184.5, tip = 0.12, people = 5", icon: "coin" },
  { id: "pace", name: "Pace", field: "sport", expr: "minutes / distance", vars: "minutes = 225, distance = 42.195", icon: "clock" },
];

export function FormulaLibrary() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {LIBRARY.map((formula) => (
        <Link key={formula.name} href={presetHref(formula.id)} className="group sketch card-hover block">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[color:var(--ink)]/[0.05] text-[color:var(--accent)] ring-1 ring-[color:var(--line)]">
              <Icon name={formula.icon} size={17} />
            </span>
            <div>
              <div className="text-sm font-bold tracking-tight">{formula.name}</div>
              <div className="text-[.66rem] uppercase tracking-widest text-slate-500">{formula.field}</div>
            </div>
          </div>
          <span className="mono mt-3 block truncate rounded-lg border border-[color:var(--line)] bg-[#fffdf5] px-2.5 py-1.5 text-[.72rem] text-slate-700">
            {formula.expr}
          </span>
          <p className="mono mt-2 truncate text-[.68rem] text-slate-500">{formula.vars}</p>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
            View in formula tool <Icon name="arrow-right" size={13} />
          </span>
        </Link>
      ))}
    </div>
  );
}

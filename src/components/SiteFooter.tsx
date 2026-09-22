import Link from "next/link";
import { BrandMark } from "./Brand";

export function SiteFooter() {
  const cols = [
    {
      title: "Calculate",
      items: [
        { href: "/tools/scientific", label: "Scientific" },
        { href: "/tools/units", label: "Unit converter" },
        { href: "/tools/formula", label: "Custom formula" },
      ],
    },
    {
      title: "Live data",
      items: [
        { href: "/tools/currency", label: "FX rates" },
        { href: "/tools/crypto", label: "Crypto prices" },
        { href: "/tools/economy", label: "Economy indicators" },
      ],
    },
    {
      title: "NumeriQ",
      items: [
        { href: "/calculators", label: "All tools" },
        { href: "/about", label: "About" },
      ],
    },
  ];
  return (
    <footer className="mt-16 border-t-2 border-[color:var(--line)] bg-[color:var(--paper-2)]">
      <div className="mx-auto max-w-7xl px-5 py-10 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2.5">
            <BrandMark size={30} />
            <span className="font-extrabold text-lg">
              Numeri<span className="text-[color:var(--accent)]">Q</span>
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-600 max-w-xs">
            A friendly calculation toolkit. Live market data, scientific math,
            unit conversion and a custom formula engine — all in one place.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Market data from Frankfurter (ECB), CoinGecko and the World Bank.
            Not financial advice.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h3 className="font-bold mb-3">{c.title}</h3>
            <ul className="space-y-2 text-sm">
              {c.items.map((i) => (
                <li key={i.href}>
                  <Link href={i.href} className="hover:text-[color:var(--accent)]">
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-black/10 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} NumeriQ · Built with Next.js, mathjs and
        open data.
      </div>
    </footer>
  );
}

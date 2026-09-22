import { ToolCard } from "@/components/ToolCard";

export const metadata = { title: "All tools · NumeriQ" };

export default function CalculatorsPage() {
  const all = [
    { href: "/tools/scientific", title: "Scientific calculator", blurb: "Type any expression — trig, logs, roots, constants.", accent: "#ff6b4a", icon: "∑" },
    { href: "/tools/units", title: "Unit converter", blurb: "Length, mass, time, temperature, area, volume, speed, data.", accent: "#5b8cff", icon: "⇄" },
    { href: "/tools/currency", title: "Live FX converter", blurb: "ECB reference rates with 30-day chart.", accent: "#ffd23f", icon: "€", badge: "live" },
    { href: "/tools/crypto", title: "Crypto prices", blurb: "Top coins, spot price and 24h change.", accent: "#4ade80", icon: "₿", badge: "live" },
    { href: "/tools/formula", title: "Custom formula", blurb: "Save, simplify and re-use your own expressions.", accent: "#b388ff", icon: "ƒ" },
    { href: "/tools/economy", title: "Economy indicators", blurb: "World Bank data across 190+ countries.", accent: "#22c55e", icon: "📊", badge: "live" },
  ];
  return (
    <div className="mx-auto max-w-7xl px-5 py-12">
      <h1 className="h-title text-4xl">
        <span className="h-underline">All</span> tools
      </h1>
      <p className="mt-3 text-slate-600 max-w-2xl">
        Every calculator and live-data tool in one place. Nothing requires a
        login; your saved formulas live in your browser and can be stored on
        the server for cross-device access.
      </p>
      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {all.map((t) => (
          <ToolCard
            key={t.href}
            href={t.href}
            title={t.title}
            blurb={t.blurb}
            accent={t.accent}
            badge={t.badge}
            icon={<span className="text-xl font-black text-white">{t.icon}</span>}
          />
        ))}
      </div>
    </div>
  );
}

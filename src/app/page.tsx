import Link from "next/link";
import { HeroIllustration } from "@/components/HeroIllustration";
import { ToolCard } from "@/components/ToolCard";

export default function Home() {
  return (
    <div>
      {/* HERO */}
      <section className="mx-auto max-w-7xl px-5 pt-12 pb-8 md:pt-20 md:pb-12 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <span className="chip mb-4">
            <span className="live-dot" /> live data · 2026
          </span>
          <h1 className="h-title text-5xl md:text-6xl leading-[1.05] mt-3">
            Calculate <span className="h-underline">anything</span>,<br />
            from pocket change to planets.
          </h1>
          <p className="mt-5 text-lg text-slate-600 max-w-xl">
            NumeriQ is a friendly toolkit with a scientific calculator, unit
            converter, live FX &amp; crypto tickers, World Bank economic data,
            and a custom formula engine that lets you write your own math.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/calculators" className="btn btn-primary">
              Browse all tools
            </Link>
            <Link href="/tools/formula" className="btn btn-ink">
              Write a custom formula
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            <span className="chip">mathjs powered</span>
            <span className="chip">Frankfurter FX</span>
            <span className="chip">CoinGecko</span>
            <span className="chip">World Bank</span>
            <span className="chip">no login</span>
          </div>
        </div>
        <HeroIllustration />
      </section>

      {/* FEATURED TOOLS */}
      <section className="mx-auto max-w-7xl px-5 py-10">
        <h2 className="h-title text-3xl mb-6">
          <span className="h-underline">Featured</span> tools
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <ToolCard
            href="/tools/scientific"
            title="Scientific calculator"
            blurb="Trig, logs, roots, constants, custom variables. Type any expression and press Enter."
            accent="#ff6b4a"
            icon={<span className="text-xl font-black text-white">∑</span>}
          />
          <ToolCard
            href="/tools/units"
            title="Unit converter"
            blurb="Length, mass, time, temperature, area, volume, speed and digital data."
            accent="#5b8cff"
            icon={<span className="text-xl font-black text-white">⇄</span>}
          />
          <ToolCard
            href="/tools/currency"
            title="Live FX converter"
            blurb="Real-time ECB reference rates with 30-day history, auto-refreshing."
            accent="#ffd23f"
            icon={<span className="text-xl font-black">€</span>}
            badge="live"
          />
          <ToolCard
            href="/tools/crypto"
            title="Crypto prices"
            blurb="Spot prices and 24h change for the top coins. Updates every 30s."
            accent="#4ade80"
            icon={<span className="text-xl font-black">₿</span>}
            badge="live"
          />
          <ToolCard
            href="/tools/formula"
            title="Custom formula"
            blurb="Write your own expression, save it, re-use it. Feed it to the engine or simplify it."
            accent="#b388ff"
            icon={<span className="text-xl font-black text-white">ƒ</span>}
          />
          <ToolCard
            href="/tools/economy"
            title="Economy indicators"
            blurb="Inflation, GDP per capita, unemployment and population from the World Bank."
            accent="#22c55e"
            icon={<span className="text-xl font-black text-white">📊</span>}
            badge="live"
          />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-5 py-10 grid md:grid-cols-3 gap-5">
        {[
          { t: "1. Pick a tool", d: "From the nav or the grid above." },
          { t: "2. Type or select", d: "Expressions, amounts, or just a country." },
          { t: "3. Get a real answer", d: "Formatted, cited, and saved if you like." },
        ].map((s) => (
          <div key={s.t} className="sketch-sm bg-white p-5">
            <div className="font-bold text-lg">{s.t}</div>
            <div className="text-slate-600 text-sm mt-1">{s.d}</div>
          </div>
        ))}
      </section>
    </div>
  );
}

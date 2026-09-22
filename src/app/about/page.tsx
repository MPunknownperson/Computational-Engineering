import { BrandMark } from "@/components/Brand";

export const metadata = { title: "About · NumeriQ" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <div className="flex items-center gap-3">
        <BrandMark size={44} />
        <h1 className="h-title text-4xl">About NumeriQ</h1>
      </div>
      <p className="mt-4 text-slate-700 leading-relaxed">
        NumeriQ is a friendly, login-free calculation toolkit. It bundles a
        scientific calculator, a unit converter, live FX and crypto tools,
        World Bank economic indicators, and a custom formula engine that lets
        you save and re-use your own expressions.
      </p>
      <h2 className="mt-8 font-bold text-xl">Data sources</h2>
      <ul className="mt-2 space-y-1 text-slate-700 list-disc pl-5">
        <li>Frankfurter — daily ECB reference rates and historical series.</li>
        <li>CoinGecko — crypto spot prices, market cap, 24h change.</li>
        <li>World Bank Open Data — inflation, GDP per capita, unemployment, population.</li>
      </ul>
      <h2 className="mt-8 font-bold text-xl">Built with</h2>
      <ul className="mt-2 space-y-1 text-slate-700 list-disc pl-5">
        <li>Next.js (App Router), React 19, Tailwind CSS v4.</li>
        <li>mathjs for symbolic and numeric evaluation.</li>
        <li>PostgreSQL + Drizzle ORM for saved formulas.</li>
      </ul>
      <p className="mt-8 text-xs text-slate-500">
        Market data is provided for informational purposes only and is not
        financial advice.
      </p>
    </div>
  );
}

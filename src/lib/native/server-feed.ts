import "server-only";
import { store } from "@/lib/store";

/**
 * Seed content for the native shell feed. Kept server-side so the infinite
 * scroll in the app is a genuine paginated database read rather than a
 * client-side array slice.
 */
const SEED: Array<{ slug: string; title: string; summary: string; category: string; href: string; icon: string; weight: number }> = [
  { slug: "scientific-calculator", title: "Scientific calculator", summary: "Full expression evaluator with mathjs precision and history.", category: "calculate", href: "/app/calculator", icon: "calculator-outline", weight: 100 },
  { slug: "unit-converter", title: "Unit converter", summary: "Length, mass, temperature, pressure, energy and more.", category: "convert", href: "/app/convert", icon: "swap-horizontal-outline", weight: 98 },
  { slug: "beam-deflection", title: "Beam deflection", summary: "Simply supported and cantilever deflection under point loads.", category: "structural", href: "/calculate/beam-deflection", icon: "git-commit-outline", weight: 94 },
  { slug: "ohms-law", title: "Ohm's law", summary: "Solve voltage, current, resistance and dissipated power.", category: "electrical", href: "/calculate/ohms-law", icon: "flash-outline", weight: 92 },
  { slug: "reynolds-number", title: "Reynolds number", summary: "Classify laminar, transitional and turbulent pipe flow.", category: "fluids", href: "/calculate/reynolds-number", icon: "water-outline", weight: 90 },
  { slug: "currency", title: "Currency rates", summary: "Live reference rates with transparent provider attribution.", category: "markets", href: "/tools/currency", icon: "cash-outline", weight: 88 },
  { slug: "crypto-engine", title: "Crypto analytics engine", summary: "RSI, MACD, VaR, Monte Carlo and composite signals.", category: "markets", href: "/tools/crypto", icon: "trending-up-outline", weight: 86 },
  { slug: "formula-library", title: "Formula library", summary: "Searchable engineering formulas with symbol glossaries.", category: "reference", href: "/tools/formula", icon: "library-outline", weight: 84 },
  { slug: "stress-strain", title: "Stress and strain", summary: "Axial stress, strain and Young's modulus relationships.", category: "structural", href: "/calculate/stress-strain", icon: "resize-outline", weight: 82 },
  { slug: "heat-transfer", title: "Conductive heat transfer", summary: "Fourier conduction through plane and composite walls.", category: "thermal", href: "/calculate/heat-transfer", icon: "thermometer-outline", weight: 80 },
  { slug: "pipe-pressure-drop", title: "Pipe pressure drop", summary: "Darcy–Weisbach head loss with friction factor estimation.", category: "fluids", href: "/calculate/pipe-pressure-drop", icon: "git-merge-outline", weight: 78 },
  { slug: "gear-ratio", title: "Gear ratio", summary: "Torque, speed and mechanical advantage across a train.", category: "mechanical", href: "/calculate/gear-ratio", icon: "cog-outline", weight: 76 },
  { slug: "voltage-divider", title: "Voltage divider", summary: "Output voltage with loading effects and tolerance bands.", category: "electrical", href: "/calculate/voltage-divider", icon: "options-outline", weight: 74 },
  { slug: "moment-of-inertia", title: "Second moment of area", summary: "Rectangular, circular and hollow section properties.", category: "structural", href: "/calculate/moment-of-inertia", icon: "shapes-outline", weight: 72 },
  { slug: "economy-npv", title: "Engineering economy", summary: "NPV, IRR and payback for capital project comparison.", category: "economy", href: "/tools/economy", icon: "bar-chart-outline", weight: 70 },
  { slug: "bolt-torque", title: "Bolt preload torque", summary: "Torque–tension relationship with nut factor selection.", category: "mechanical", href: "/calculate/bolt-torque", icon: "build-outline", weight: 68 },
  { slug: "reference-constants", title: "Physical constants", summary: "CODATA constants with units and uncertainty.", category: "reference", href: "/reference", icon: "infinite-outline", weight: 66 },
  { slug: "guides", title: "Engineering guides", summary: "Worked explanations behind every calculator.", category: "reference", href: "/guides", icon: "book-outline", weight: 64 },
];

let seeded = false;

/** Idempotently populates the feed table on first read. */
export async function ensureFeedSeed(): Promise<void> {
  if (seeded) return;
  if (store.appFeed.size === 0) {
    const now = new Date();
    for (const item of SEED) {
      store.appFeed.insert({ id: store.appFeed.nextSequence(), ...item, createdAt: now });
    }
  }
  seeded = true;
}

export interface FeedPage {
  items: Array<{ id: number; slug: string; title: string; summary: string; category: string; href: string; icon: string }>;
  nextCursor: number | null;
  total: number;
}

/**
 * Keyset pagination ordered by descending weight. The cursor is the row id of
 * the last item already shown, which keeps infinite scroll stable while new
 * rows are inserted.
 */
export async function readFeedPage(cursor: number | null, limit: number, category: string | null): Promise<FeedPage> {
  await ensureFeedSeed();
  const take = Math.min(Math.max(limit, 1), 30);
  try {
    const rows = store.appFeed
      .list((row) => (cursor ? row.id > cursor : true))
      .sort((a, b) => a.id - b.id || b.weight - a.weight)
      .slice(0, take + 1);

    const filtered = category && category !== "all" ? rows.filter((r) => r.category === category) : rows;
    const hasMore = rows.length > take;
    const page = filtered.slice(0, take);
    const total = store.appFeed.size;

    return {
      items: page.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        summary: r.summary,
        category: r.category,
        href: r.href,
        icon: r.icon,
      })),
      nextCursor: hasMore && page.length > 0 ? rows[Math.min(take, rows.length) - 1].id : null,
      total: total || page.length,
    };
  } catch {
    return { items: [], nextCursor: null, total: 0 };
  }
}

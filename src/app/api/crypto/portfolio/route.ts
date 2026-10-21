import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { cryptoPositions } from "@/db/schema";
import { readJson, requireParam, withApiHandler, workspaceFrom } from "@/lib/core/api-handler";
import { AppError } from "@/lib/core/errors";
import { isPositiveDecimal, valuePositions } from "@/lib/crypto/precision";
import { ASSET_META, isAssetId, isVs } from "@/lib/crypto/providers";
import { ensureAutoUpdater, latestQuotes } from "@/lib/crypto/service";

export const dynamic = "force-dynamic";

/** GET /api/crypto/portfolio?vs=usd — positions valued with exact arithmetic at the latest quotes. */
export const GET = withApiHandler("crypto.portfolio.list", async ({ request, url }) => {
  ensureAutoUpdater();
  const workspace = workspaceFrom(request);
  const vs = requireParam(url, "vs", /^[a-z]{3}$/, "usd");
  if (!isVs(vs)) throw new AppError("validation", "Unsupported quote currency.");
  const [rows, quotes] = await Promise.all([db.select().from(cryptoPositions).where(eq(cryptoPositions.workspace, workspace)).orderBy(desc(cryptoPositions.createdAt)).limit(200), latestQuotes(vs)]);
  const valuation = valuePositions(rows.map((r) => ({ quantity: r.quantity, costBasis: r.costBasis, price: quotes.get(r.assetId)?.price ?? 0 })));
  const items = rows.map((r, i) => ({ ...r, price: quotes.get(r.assetId)?.price ?? null, change24h: quotes.get(r.assetId)?.change24h ?? null, ...valuation.rows[i] }));
  return NextResponse.json({ vs, items, total: valuation.total, totalCost: valuation.totalCost, pnl: valuation.pnl, pnlPct: valuation.pnlPct, quotedAt: Date.now() }, { headers: { "Cache-Control": "no-store" } });
});

/** POST /api/crypto/portfolio { assetId, quantity, costBasis, vs?, note? } */
export const POST = withApiHandler("crypto.portfolio.create", async ({ request }) => {
  const workspace = workspaceFrom(request);
  const body = await readJson(request, (raw) => {
    const b = raw as Record<string, unknown>;
    const assetId = String(b.assetId ?? ""), quantity = String(b.quantity ?? "").trim(), costBasis = String(b.costBasis ?? "").trim(), vs = String(b.vs ?? "usd").toLowerCase();
    if (!isAssetId(assetId)) throw new AppError("validation", "Unknown asset.");
    if (!isPositiveDecimal(quantity) || quantity.length > 40) throw new AppError("validation", "Quantity must be a positive decimal.");
    if (!/^\d+(\.\d+)?$/.test(costBasis) || costBasis.length > 40) throw new AppError("validation", "Cost basis must be a decimal (0 allowed).");
    if (!isVs(vs)) throw new AppError("validation", "Unsupported quote currency.");
    return { assetId, quantity, costBasis, vs, note: typeof b.note === "string" ? b.note.slice(0, 140) : null };
  });
  const count = await db.select({ id: cryptoPositions.id }).from(cryptoPositions).where(eq(cryptoPositions.workspace, workspace));
  if (count.length >= 100) throw new AppError("validation", "Position limit reached (100 per workspace).");
  const [row] = await db.insert(cryptoPositions).values({ workspace, assetId: body.assetId, symbol: ASSET_META[body.assetId].symbol, quantity: body.quantity, costBasis: body.costBasis, vs: body.vs, note: body.note }).returning();
  return NextResponse.json({ item: row }, { status: 201 });
});

/** DELETE /api/crypto/portfolio?id=… */
export const DELETE = withApiHandler("crypto.portfolio.delete", async ({ request, url }) => {
  const workspace = workspaceFrom(request);
  const id = url.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new AppError("validation", "Position id is required.");
  await db.delete(cryptoPositions).where(and(eq(cryptoPositions.workspace, workspace), eq(cryptoPositions.id, id)));
  return NextResponse.json({ ok: true });
});

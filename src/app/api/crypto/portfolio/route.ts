import { NextResponse } from "next/server";
import { newId, store } from "@/lib/store";
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
  const rows = store.cryptoPositions.list((row) => row.workspace === workspace).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 200);
  const quotes = await latestQuotes(vs);
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
  const count = store.cryptoPositions.count((row) => row.workspace === workspace);
  if (count >= 100) throw new AppError("validation", "Position limit reached (100 per workspace).");
  const row = store.cryptoPositions.insert({ id: newId(), workspace, assetId: body.assetId, symbol: ASSET_META[body.assetId].symbol, quantity: body.quantity, costBasis: body.costBasis, vs: body.vs, note: body.note, createdAt: new Date() });
  return NextResponse.json({ item: row }, { status: 201 });
});

/** DELETE /api/crypto/portfolio?id=… */
export const DELETE = withApiHandler("crypto.portfolio.delete", async ({ request, url }) => {
  const workspace = workspaceFrom(request);
  const id = url.searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new AppError("validation", "Position id is required.");
  store.cryptoPositions.remove((row) => row.workspace === workspace && row.id === id);
  return NextResponse.json({ ok: true });
});

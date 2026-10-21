import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { cryptoAlerts } from "@/db/schema";
import { readJson, withApiHandler, workspaceFrom } from "@/lib/core/api-handler";
import { AppError } from "@/lib/core/errors";
import { isDecimalString } from "@/lib/crypto/precision";
import { ASSET_META, isAssetId, isVs } from "@/lib/crypto/providers";
import { ensureAutoUpdater, evaluateAlerts, getMarkets } from "@/lib/crypto/service";

export const dynamic = "force-dynamic";
const CONDITIONS = new Set(["above", "below", "change_up", "change_down"]);

/** GET /api/crypto/alerts — this workspace's alerts (evaluated against the latest quotes first). */
export const GET = withApiHandler("crypto.alerts.list", async ({ request }) => {
  ensureAutoUpdater();
  const workspace = workspaceFrom(request);
  const markets = await getMarkets("usd").catch(() => null);
  if (markets) await evaluateAlerts(markets.items, "usd");
  const rows = await db.select().from(cryptoAlerts).where(eq(cryptoAlerts.workspace, workspace)).orderBy(desc(cryptoAlerts.createdAt)).limit(100);
  return NextResponse.json({ items: rows }, { headers: { "Cache-Control": "no-store" } });
});

/** POST /api/crypto/alerts { assetId, condition, threshold, note?, vs? } */
export const POST = withApiHandler("crypto.alerts.create", async ({ request }) => {
  const workspace = workspaceFrom(request);
  const body = await readJson(request, (raw) => {
    const b = raw as Record<string, unknown>;
    const assetId = String(b.assetId ?? ""), condition = String(b.condition ?? ""), threshold = String(b.threshold ?? "").trim(), vs = String(b.vs ?? "usd").toLowerCase();
    if (!isAssetId(assetId)) throw new AppError("validation", "Unknown asset.");
    if (!CONDITIONS.has(condition)) throw new AppError("validation", "Condition must be above, below, change_up or change_down.");
    if (!isDecimalString(threshold) || threshold.length > 30) throw new AppError("validation", "Threshold must be a decimal number.");
    if (!isVs(vs)) throw new AppError("validation", "Unsupported quote currency.");
    const note = typeof b.note === "string" ? b.note.slice(0, 140) : null;
    return { assetId, condition, threshold, vs, note };
  });
  const count = await db.select({ id: cryptoAlerts.id }).from(cryptoAlerts).where(eq(cryptoAlerts.workspace, workspace));
  if (count.length >= 50) throw new AppError("validation", "Alert limit reached (50 per workspace).");
  const [row] = await db.insert(cryptoAlerts).values({ workspace, assetId: body.assetId, symbol: ASSET_META[body.assetId].symbol, vs: body.vs, condition: body.condition, threshold: body.threshold, note: body.note }).returning();
  return NextResponse.json({ item: row }, { status: 201 });
});

/** DELETE /api/crypto/alerts?id=… (or ?id=triggered to clear all triggered) */
export const DELETE = withApiHandler("crypto.alerts.delete", async ({ request, url }) => {
  const workspace = workspaceFrom(request);
  const id = url.searchParams.get("id") ?? "";
  if (id === "triggered") {
    await db.delete(cryptoAlerts).where(and(eq(cryptoAlerts.workspace, workspace), eq(cryptoAlerts.status, "triggered")));
    return NextResponse.json({ ok: true });
  }
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new AppError("validation", "Alert id is required.");
  await db.delete(cryptoAlerts).where(and(eq(cryptoAlerts.workspace, workspace), eq(cryptoAlerts.id, id)));
  return NextResponse.json({ ok: true });
});

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { formulas } from "@/db/schema";
import { eq, and, desc, count } from "drizzle-orm";
import { FORMULA_LIMITS as L } from "@/lib/catalog";

// Workspace tokens are random strings generated in the browser ("ws_" + 8 chars).
const WS = /^ws_[a-z0-9]{6,32}$/;

function workspaceOf(req: NextRequest) {
  const ws = req.nextUrl.searchParams.get("workspace");
  return ws && WS.test(ws) ? ws : null;
}

/** List (or export, with ?all=1) the formulas saved in a workspace. */
export async function GET(req: NextRequest) {
  const ws = workspaceOf(req);
  if (!ws) return NextResponse.json({ items: [] });
  if (req.nextUrl.searchParams.get("summary") === "1") {
    const [result] = await db
      .select({ total: count() })
      .from(formulas)
      .where(eq(formulas.workspace, ws));
    return NextResponse.json({ count: result?.total ?? 0 });
  }
  const all = req.nextUrl.searchParams.get("all") === "1";
  const q = db
    .select()
    .from(formulas)
    .where(eq(formulas.workspace, ws))
    .orderBy(desc(formulas.createdAt));
  const items = all ? await q : await q.limit(L.listed);
  return NextResponse.json({ workspace: ws, count: items.length, items });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { workspace, name, expression, description, tags } = body || {};
  if (typeof workspace !== "string" || !WS.test(workspace) || !name || !expression) {
    return NextResponse.json({ error: "workspace, name and expression required" }, { status: 400 });
  }
  if (typeof expression !== "string" || expression.length > L.expression) {
    return NextResponse.json({ error: "expression too long" }, { status: 400 });
  }
  const [row] = await db
    .insert(formulas)
    .values({
      workspace,
      name: String(name).slice(0, L.name),
      expression,
      description: description ? String(description).slice(0, L.description) : null,
      tags: tags ? String(tags).slice(0, L.tags) : null,
    })
    .returning();
  return NextResponse.json({ item: row });
}

/** Delete one formula (?id=) or every formula in the workspace (?all=1). */
export async function DELETE(req: NextRequest) {
  const ws = workspaceOf(req);
  if (!ws) return NextResponse.json({ error: "workspace required" }, { status: 400 });

  if (req.nextUrl.searchParams.get("all") === "1") {
    const removed = await db.delete(formulas).where(eq(formulas.workspace, ws)).returning({ id: formulas.id });
    return NextResponse.json({ ok: true, removed: removed.length });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const removed = await db
    .delete(formulas)
    .where(and(eq(formulas.id, id), eq(formulas.workspace, ws)))
    .returning({ id: formulas.id });
  return NextResponse.json({ ok: true, removed: removed.length });
}

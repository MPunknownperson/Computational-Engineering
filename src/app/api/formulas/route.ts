import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { formulas } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const ws = req.nextUrl.searchParams.get("workspace");
  if (!ws) return NextResponse.json({ items: [] });
  const items = await db
    .select()
    .from(formulas)
    .where(eq(formulas.workspace, ws))
    .orderBy(desc(formulas.createdAt))
    .limit(50);
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { workspace, name, expression, description, tags } = body || {};
  if (!workspace || !name || !expression) {
    return NextResponse.json({ error: "workspace, name and expression required" }, { status: 400 });
  }
  if (typeof expression !== "string" || expression.length > 2000) {
    return NextResponse.json({ error: "expression too long" }, { status: 400 });
  }
  const [row] = await db
    .insert(formulas)
    .values({
      workspace,
      name: String(name).slice(0, 100),
      expression,
      description: description ? String(description).slice(0, 500) : null,
      tags: tags ? String(tags).slice(0, 200) : null,
    })
    .returning();
  return NextResponse.json({ item: row });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const ws = req.nextUrl.searchParams.get("workspace");
  if (!id || !ws) return NextResponse.json({ error: "id and workspace required" }, { status: 400 });
  await db.delete(formulas).where(and(eq(formulas.id, id), eq(formulas.workspace, ws)));
  return NextResponse.json({ ok: true });
}

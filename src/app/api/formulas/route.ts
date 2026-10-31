import { NextRequest, NextResponse } from "next/server";
import { newId, store } from "@/lib/store";
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
    return NextResponse.json({ count: store.formulas.count((row) => row.workspace === ws) });
  }
  const all = req.nextUrl.searchParams.get("all") === "1";
  const rows = store.formulas
    .list((row) => row.workspace === ws)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const items = all ? rows : rows.slice(0, L.listed);
  return NextResponse.json({ workspace: ws, count: items.length, items });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { workspace, name, expression, description, tags, variables } = body || {};
  if (typeof workspace !== "string" || !WS.test(workspace) || !name || !expression) {
    return NextResponse.json({ error: "workspace, name and expression required" }, { status: 400 });
  }
  if (typeof expression !== "string" || expression.length > L.expression) {
    return NextResponse.json({ error: "expression too long" }, { status: 400 });
  }
  let storedVariables: string | null = null;
  if (variables !== undefined && variables !== null) {
    const serialised = typeof variables === "string" ? variables : JSON.stringify(variables);
    if (serialised.length > L.variables) return NextResponse.json({ error: "variables too long" }, { status: 400 });
    try { JSON.parse(serialised); storedVariables = serialised; } catch { return NextResponse.json({ error: "variables must be JSON" }, { status: 400 }); }
  }
  const row = store.formulas.insert({
    id: newId(),
    workspace,
    name: String(name).slice(0, L.name),
    expression,
    description: description ? String(description).slice(0, L.description) : null,
    tags: tags ? String(tags).slice(0, L.tags) : null,
    variables: storedVariables,
    createdAt: new Date(),
  });
  return NextResponse.json({ item: row });
}

/** Delete one formula (?id=) or every formula in the workspace (?all=1). */
export async function DELETE(req: NextRequest) {
  const ws = workspaceOf(req);
  if (!ws) return NextResponse.json({ error: "workspace required" }, { status: 400 });

  if (req.nextUrl.searchParams.get("all") === "1") {
    const removed = store.formulas.remove((row) => row.workspace === ws);
    return NextResponse.json({ ok: true, removed: removed.length });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const removed = store.formulas.remove((row) => row.id === id && row.workspace === ws);
  return NextResponse.json({ ok: true, removed: removed.length });
}

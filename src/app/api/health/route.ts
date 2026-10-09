import { db } from "@/db";
import { sql } from "drizzle-orm";
import { ensureWorkspace } from "@/lib/workbench/sandbox";

export const dynamic = "force-dynamic";

/** Public deployment health check; implementation details remain private. */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    // Also ensure the server-side runtime workspace is writable without
    // disclosing its path or inventory to public health-check callers.
    await ensureWorkspace();
    return Response.json({
      ok: true,
      service: "radix-loom",
      database: "connected",
      time: new Date().toISOString(),
    });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}

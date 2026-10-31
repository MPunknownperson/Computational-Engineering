import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Liveness + readiness.
 *
 * The site runs with no database at all (it is deployed to Cloudflare Workers
 * and Pages), so readiness means: the runtime booted, the in-process store is
 * addressable and the reliability pipeline is armed.
 */
export async function GET() {
  const started = Date.now();
  try {
    const incidents = store.incidents.size;
    const jobs = store.jobs.size;
    return Response.json(
      {
        ok: true,
        storage: "memory",
        database: "disabled",
        incidents,
        jobs,
        latencyMs: Date.now() - started,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { ok: false, storage: "unavailable", latencyMs: Date.now() - started },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

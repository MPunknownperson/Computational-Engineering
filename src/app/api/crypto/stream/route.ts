import { isVs } from "@/lib/crypto/providers";
import { engineStatus, ensureAutoUpdater, getMarkets } from "@/lib/crypto/service";
import { getRuntime } from "@/lib/remediation/runtime-config";

export const dynamic = "force-dynamic";

/**
 * GET /api/crypto/stream?vs=usd — Server-Sent Events.
 * Pushes `tick` (market table) every `client.streamPushMs` and a `status`
 * frame every fourth tick. Reads come from the shared cache so a thousand
 * open streams cost one upstream request. Heartbeats keep proxies open.
 */
export async function GET(request: Request) {
  ensureAutoUpdater();
  const url = new URL(request.url);
  const vs = (url.searchParams.get("vs") ?? "usd").toLowerCase();
  if (!isVs(vs)) return new Response("unsupported quote currency", { status: 400 });
  const encoder = new TextEncoder();
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => { if (!closed) controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)); };
      let n = 0;
      const push = async () => {
        if (closed) return;
        try {
          const markets = await getMarkets(vs);
          send("tick", { vs, items: markets.items.map((a) => ({ ...a, sparkline7d: n % 8 === 0 ? a.sparkline7d : undefined })), source: markets.source, live: markets.live, fetchedAt: markets.fetchedAt, ageMs: markets.age, state: markets.state, seq: n });
          if (n % 4 === 0) send("status", await engineStatus());
        } catch (error) {
          send("error", { message: error instanceof Error ? error.message : "stream error", retryable: true });
        }
        n++;
        if (!closed) timer = setTimeout(push, getRuntime("client.streamPushMs"));
      };
      send("hello", { vs, pushMs: getRuntime("client.streamPushMs"), transport: getRuntime("client.transport") });
      void push();
      heartbeat = setInterval(() => { if (!closed) controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`)); }, 20_000);
      request.signal.addEventListener("abort", () => { closed = true; if (timer) clearTimeout(timer); if (heartbeat) clearInterval(heartbeat); try { controller.close(); } catch { /* already closed */ } });
    },
    cancel() { closed = true; if (timer) clearTimeout(timer); if (heartbeat) clearInterval(heartbeat); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
}

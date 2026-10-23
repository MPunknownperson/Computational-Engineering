/// <reference lib="webworker" />

/**
 * Online-only service worker.
 *
 * This application is explicitly **not** offline-capable. It exists so the
 * installed app still gets the things a service worker unlocks — install
 * eligibility, `launch_handler`, navigation preload, update control and
 * notification/share plumbing — while guaranteeing that every response the
 * user sees came from the network on this request.
 *
 * Any cache written by a previous offline-first build is destroyed on
 * activation so upgrading installs can never serve stale computations.
 */

declare const self: ServiceWorkerGlobalScope;
declare const BUILD_REVISION: string;

const REVISION = typeof BUILD_REVISION === "string" ? BUILD_REVISION : "dev";

self.addEventListener("install", () => {
  // No precache: there is nothing to warm because nothing may be served cold.
  void self.skipWaiting();
});

self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      // Remove every cache left behind by earlier offline-capable versions.
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));

      // Navigation preload lets the browser start the network request in
      // parallel with worker start-up, which removes the usual SW latency tax.
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }

      await self.clients.claim();
    })(),
  );
});

/**
 * Network-only fetch handling. The only value added here is using the
 * navigation preload response when one exists, and converting a hard network
 * failure into a clear, honest error document instead of the browser's
 * generic dinosaur page.
 */
self.addEventListener("fetch", (event: FetchEvent) => {
  const request = event.request;

  // Never interfere with non-GET traffic (notably the Share Target POST).
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const preload = (await event.preloadResponse) as Response | undefined;
          if (preload) return preload;
          return await fetch(request);
        } catch {
          return new Response(OFFLINE_DOCUMENT, {
            status: 503,
            statusText: "Offline",
            headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
          });
        }
      })(),
    );
    return;
  }

  event.respondWith(
    fetch(request, { cache: "no-store" }).catch(
      () => new Response("", { status: 503, statusText: "Offline" }),
    ),
  );
});

/** Lets the page trigger an immediate activation after an update is found. */
self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if ((event.data as { type?: string } | undefined)?.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
  if ((event.data as { type?: string } | undefined)?.type === "REVISION") {
    event.source?.postMessage({ type: "REVISION", revision: REVISION });
  }
});

const OFFLINE_DOCUMENT = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>No connection</title>
<style>
 :root{color-scheme:light dark}
 body{margin:0;min-height:100dvh;display:grid;place-items:center;text-align:center;
   font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
   padding:2rem;background:#f7f5ef;color:#16160f}
 @media (prefers-color-scheme:dark){body{background:#101014;color:#f2f2f5}}
 h1{font-size:1.3rem;margin:.6rem 0}
 p{max-width:32rem;opacity:.72}
 button{margin-top:1.2rem;padding:.75rem 1.6rem;border:0;border-radius:999px;
   background:#3b5bdb;color:#fff;font-weight:600;min-height:44px}
</style></head>
<body><div><div style="font-size:2.5rem">⚡</div>
<h1>You&rsquo;re offline</h1>
<p>Radix Loom computes everything on the server, so it needs a live connection.
Reconnect and try again — no stale offline copy is kept by design.</p>
<button onclick="location.reload()">Retry</button></div></body></html>`;

export {};

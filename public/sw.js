"use strict";(()=>{var o="bb282cb75f7d";self.addEventListener("install",()=>{self.skipWaiting()});self.addEventListener("activate",e=>{e.waitUntil((async()=>{let t=await caches.keys();await Promise.all(t.map(n=>caches.delete(n))),self.registration.navigationPreload&&await self.registration.navigationPreload.enable(),await self.clients.claim()})())});self.addEventListener("fetch",e=>{let t=e.request;if(!(t.method!=="GET"||new URL(t.url).origin!==self.location.origin)){if(t.mode==="navigate"){e.respondWith((async()=>{try{let i=await e.preloadResponse;return i||await fetch(t)}catch{return new Response(a,{status:503,statusText:"Offline",headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}})}})());return}e.respondWith(fetch(t,{cache:"no-store"}).catch(()=>new Response("",{status:503,statusText:"Offline"})))}});self.addEventListener("message",e=>{e.data?.type==="SKIP_WAITING"&&self.skipWaiting(),e.data?.type==="REVISION"&&e.source?.postMessage({type:"REVISION",revision:o})});var a=`<!doctype html>
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
<body><div><div style="font-size:2.5rem">\u26A1</div>
<h1>You&rsquo;re offline</h1>
<p>Radix Loom computes everything on the server, so it needs a live connection.
Reconnect and try again \u2014 no stale offline copy is kept by design.</p>
<button onclick="location.reload()">Retry</button></div></body></html>`;})();

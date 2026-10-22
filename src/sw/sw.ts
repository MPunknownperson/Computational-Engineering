/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

/** App-shell routes that are precached when the worker installs. */
const PRECACHE: PrecacheEntry[] = [
  { url: "/app", revision: BUILD_REVISION },
  { url: "/app/home", revision: BUILD_REVISION },
  { url: "/app/calculator", revision: BUILD_REVISION },
  { url: "/app/convert", revision: BUILD_REVISION },
  { url: "/app/settings", revision: BUILD_REVISION },
  { url: "/app/offline", revision: BUILD_REVISION },
  { url: "/app/manifest.webmanifest", revision: BUILD_REVISION },
  { url: "/icons/icon-192.png", revision: BUILD_REVISION },
  { url: "/icons/icon-512.png", revision: BUILD_REVISION },
  { url: "/icons/maskable-512.png", revision: BUILD_REVISION },
  { url: "/icons/apple-touch-icon.png", revision: BUILD_REVISION },
];

declare const self: ServiceWorkerGlobalScope;
declare const BUILD_REVISION: string;

const OFFLINE_URL = "/app/offline";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST ?? PRECACHE,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // App shell navigations inside the dedicated PWA path: network-first with
    // an offline fallback page so the app always boots.
    {
      matcher: ({ request, url }) => request.mode === "navigate" && url.pathname.startsWith("/app"),
      handler: new NetworkFirst({
        cacheName: "pwa-app-shell",
        networkTimeoutSeconds: 4,
        plugins: [new ExpirationPlugin({ maxEntries: 40, maxAgeSeconds: 7 * 24 * 60 * 60 })],
      }),
    },
    // Icons, fonts and images: cache-first, they are versioned assets.
    {
      matcher: ({ request }) => ["image", "font"].includes(request.destination),
      handler: new CacheFirst({
        cacheName: "pwa-assets",
        plugins: [new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 30 * 24 * 60 * 60 })],
      }),
    },
    // Build output: hashed, immutable.
    {
      matcher: ({ url }) => url.pathname.startsWith("/_next/static/"),
      handler: new CacheFirst({
        cacheName: "pwa-next-static",
        plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 365 * 24 * 60 * 60 })],
      }),
    },
    // Read-only data endpoints: network-first, fall back to the last payload.
    {
      matcher: ({ url, request }) => request.method === "GET" && url.pathname.startsWith("/api/"),
      handler: new NetworkFirst({
        cacheName: "pwa-api",
        networkTimeoutSeconds: 6,
        plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 })],
      }),
    },
    // Mutations are never cached.
    {
      matcher: ({ request }) => request.method !== "GET",
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url }) => url.pathname.startsWith("/media/"),
      handler: new StaleWhileRevalidate({ cacheName: "pwa-media" }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: OFFLINE_URL,
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();

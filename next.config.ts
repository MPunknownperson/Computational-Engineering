import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: { optimizePackageImports: ["mathjs"] },
  serverExternalPackages: ["adm-zip", "tar", "typescript", "llamaindex", "@llamaindex/core", "@llamaindex/env", "@huggingface/transformers", "onnxruntime-node"],
  // Let Next stream metadata to browsers; HTML-only bots get its default
  // blocking behavior. A blanket htmlLimitedBots regex delayed every route.
  async redirects() {
    return [{ source: "/tools/markets", destination: "/tools/currency", permanent: true }];
  },
  // The native shell used to be an optional catch-all route folder named
  // `[[...slug]]`. That folder name blocked the GitHub import and collided with
  // the static /app page, so deep links are now rewritten (after the
  // filesystem routes are checked) to a plainly named /app/shell page.
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        { source: "/app/:tab/:rest*", destination: "/app/shell?tab=:tab" },
        { source: "/app/:tab", destination: "/app/shell?tab=:tab" },
      ],
      fallback: [],
    };
  },
  async headers() {
    return [
      { source: "/:path*", headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ] },
      { source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] },
      { source: "/api/formulas", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
      { source: "/api/contact", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
      { source: "/api/workbench/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
      { source: "/api/workbench/code", headers: [{ key: "Cache-Control", value: "no-store" }, { key: "X-Content-Type-Options", value: "nosniff" }] },
      // Personalized choices and gated supplements must not enter shared caches.
      { source: "/privacy", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
      { source: "/do-not-sell-or-share", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
      { source: "/api/privacy/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
      // Legacy slug URLs can change. Only content-hashed assets are immutable.
      { source: "/media/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400" }] },
      { source: "/media/:asset([a-z0-9-]+\\.[a-f0-9]{12}\\..+)", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/icons/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800" }] },
      // Self-hosted Silktide Consent Manager v2.0 (no third-party CDN, no tracking).
      { source: "/vendor/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800" }] },
      // Self-hosted sherpa-onnx WebAssembly ASR runtime + int8 model (large, versioned by deploy).
      { source: "/vendor/sherpa-onnx/:path*", headers: [
        { key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=604800" },
        { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
      ] },
      { source: "/app/:path((?!manifest\\.webmanifest).*)", headers: [{ key: "Cache-Control", value: "no-store" }] },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] },
      { source: "/app/manifest.webmanifest", headers: [{ key: "Content-Type", value: "application/manifest+json" }, { key: "Cache-Control", value: "public, max-age=3600" }] },
      { source: "/favicon.svg", headers: [{ key: "Cache-Control", value: "public, max-age=604800" }] },
    ];
  },
};
export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: { optimizePackageImports: ["mathjs"] },
  serverExternalPackages: ["adm-zip", "tar"],
  // Let Next stream metadata to browsers; HTML-only bots get its default
  // blocking behavior. A blanket htmlLimitedBots regex delayed every route.
  async redirects() {
    return [{ source: "/tools/markets", destination: "/tools/currency", permanent: true }];
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
      // Personalized choices and gated supplements must not enter shared caches.
      { source: "/privacy", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
      { source: "/do-not-sell-or-share", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
      { source: "/api/privacy/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
      // Legacy slug URLs can change. Only content-hashed assets are immutable.
      { source: "/media/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=86400" }] },
      { source: "/media/:asset([a-z0-9-]+\\.[a-f0-9]{12}\\..+)", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      { source: "/icons/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=604800" }] },
      { source: "/favicon.svg", headers: [{ key: "Cache-Control", value: "public, max-age=604800" }] },
    ];
  },
};
export default nextConfig;

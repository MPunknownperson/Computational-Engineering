import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Metadata is inexpensive and deterministic per host. Put it in the head for
  // all clients, including HTML-only link-preview bots.
  htmlLimitedBots: /.*/,
  // Native/CJS packages used by the workbench archive engine.
  serverExternalPackages: ["adm-zip", "tar"],
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
      // The workbench APIs stream live job state; never cache them.
      { source: "/api/workbench/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};
export default nextConfig;

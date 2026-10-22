import { NextResponse } from "next/server";

export const dynamic = "force-static";

/**
 * Dedicated manifest for the /app PWA path. Scope and start_url stay inside
 * /app so the installed app never navigates into the marketing website.
 */
export function GET() {
  const manifest = {
    id: "/app",
    name: "Radix Loom — Computational Engineering",
    short_name: "Radix Loom",
    description: "Offline-first engineering calculators, converters and tooling in a native-style app.",
    start_url: "/app/home",
    scope: "/app",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    orientation: "portrait-primary",
    lang: "en",
    dir: "ltr",
    background_color: "#f7f5ef",
    theme_color: "#f7f5ef",
    categories: ["utilities", "education", "productivity"],
    prefer_related_applications: false,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
    shortcuts: [
      { name: "Calculator", short_name: "Calc", url: "/app/calculator", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Unit converter", short_name: "Convert", url: "/app/convert", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Settings", short_name: "Settings", url: "/app/settings", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

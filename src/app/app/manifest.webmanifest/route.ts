import { NextResponse } from "next/server";

export const dynamic = "force-static";

/**
 * Manifest for the /app PWA. Scope and start_url stay inside /app so the
 * installed app never navigates into the marketing website.
 *
 * Key native-parity declarations:
 * - `display_override: ["window-controls-overlay", ...]` lets the desktop app
 *   hide the browser title bar so our own chrome reaches into it.
 * - `share_target` registers the app in the system "Share to…" sheet.
 * - `launch_handler: focus-existing` makes re-launch behave like an app icon
 *   tap instead of opening duplicate windows.
 */
export function GET() {
  const manifest = {
    id: "/app",
    name: "Quilloryn — Calculators and Converters",
    short_name: "Quilloryn",
    description: "Friendly calculators, unit converters and reference tools in a native-feel app shell.",
    start_url: "/app/home",
    scope: "/app",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    orientation: "any",
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
      { name: "Shared with app", short_name: "Shared", url: "/app/shared", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Settings", short_name: "Settings", url: "/app/settings", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
    // Web Share Target API — places the app in the OS share sheet.
    share_target: {
      action: "/app/share",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        url: "url",
        files: [
          { name: "files", accept: ["text/plain", "text/csv", ".csv", ".txt"] },
        ],
      },
    },
    launch_handler: { client_mode: ["focus-existing", "auto"] },
    handle_links: "preferred",
    edge_side_panel: { preferred_width: 420 },
    scope_extensions: [],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

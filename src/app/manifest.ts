import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { SEARCH_PAGES } from "@/lib/search-pages";

// App shortcuts surface individual tools from the browser/OS level, so a
// visitor can jump straight to the calculation they need.
const SHORTCUTS = [
  { name: "Unit converter", url: "/tools/units?category=length&from=m&to=ft&value=5" },
  { name: "Scientific calculator", url: "/tools/scientific" },
  { name: "Custom formula", url: "/tools/formula?preset=compound-interest" },
  { name: "Currency reference", url: "/tools/currency?base=USD&to=EUR&amount=100" },
];

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: SITE.name,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "en",
    background_color: "#f7f5ef",
    theme_color: "#f7f5ef",
    categories: ["utilities", "education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: SHORTCUTS.map((shortcut) => ({ name: shortcut.name, url: shortcut.url })),
  };
}

import { SEARCH_PAGES } from "@/lib/search-pages";

/**
 * Operational pages that are real routes but are not search-facing content,
 * so they are not part of the search catalogue (and are noindex via robots).
 */
const OPERATIONAL_PAGES = ["/voice-nlu", "/system/reliability"];

/**
 * Dedicated PWA domain path. These routes belong to the installed app shell
 * (not to website visitors) and are noindex.
 */
export const PWA_PAGES = [
  "/app",
  "/app/home",
  "/app/calculator",
  "/app/convert",
  "/app/shared",
  "/app/settings",
  "/app/share",
  "/app/manifest.webmanifest",
];

/** Pages Next.js should render. Everything else is a real HTTP 404. */
const KNOWN_PAGES = new Set([...SEARCH_PAGES.map((page) => page.path), ...OPERATIONAL_PAGES, ...PWA_PAGES]);

/** next.config redirects — must reach the framework, not a 404. */
const FRAMEWORK_REDIRECTS = new Set(["/tools/markets"]);

export type PageDisposition = "render" | "framework" | "missing";

/**
 * Decide whether a pathname is a real page.
 * Trailing slashes of known pages are left to Next.js (308). Unknown paths,
 * including bad dynamic slugs, are missing so the proxy can answer 404 before
 * streaming starts — otherwise the App Router often returns 200 with a
 * not-found screen.
 */
export function pageDisposition(pathname: string): PageDisposition {
  if (FRAMEWORK_REDIRECTS.has(pathname)) return "framework";
  if (KNOWN_PAGES.has(pathname)) return "render";
  if (pathname.length > 1 && pathname.endsWith("/")) {
    const stripped = pathname.replace(/\/+$/, "") || "/";
    if (KNOWN_PAGES.has(stripped) || FRAMEWORK_REDIRECTS.has(stripped)) return "framework";
  }
  return "missing";
}

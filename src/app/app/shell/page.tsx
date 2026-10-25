import type { Metadata } from "next";
import { NativeAppLoader } from "@/components/native/NativeAppLoader";

export const dynamic = "force-dynamic";

const TABS = ["home", "calculator", "convert", "shared", "settings"] as const;

export const metadata: Metadata = {
  title: "Radix Loom",
  robots: { index: false, follow: false },
};

/**
 * Client shell for deep links under /app/*.
 *
 * This used to live in an optional catch-all folder named `[[...slug]]`. The
 * bracketed, dotted folder name could not be committed through the GitHub
 * import tooling used for this project and it also collided with the static
 * `/app` page. The folder is gone: `next.config.ts` rewrites unknown `/app/<tab>`
 * URLs to `/app/shell?tab=<tab>` instead, so every deep link still resolves to
 * the right screen while the file tree stays plain ASCII.
 */
export default async function AppShellPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const { tab } = await searchParams;
  const first = (Array.isArray(tab) ? tab[0] : tab)?.split("/")[0] ?? "home";
  const initialTab = (TABS as readonly string[]).includes(first) ? first : "home";
  return <NativeAppLoader initialTab={initialTab} />;
}

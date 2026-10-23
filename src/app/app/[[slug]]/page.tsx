import type { Metadata } from "next";
import { NativeAppLoader } from "@/components/native/NativeAppLoader";

export const dynamic = "force-dynamic";

const TABS = ["home", "calculator", "convert", "shared", "settings"] as const;

export const metadata: Metadata = {
  title: "Radix Loom",
  robots: { index: false, follow: false },
};

/**
 * Every /app/* URL renders the same client shell. Internal navigation is owned
 * by the active engine (Ionic's IonNav stack or Framework7's router), so deep
 * links still resolve to the right screen while in-app moves stay instant and
 * animated instead of round-tripping to the server.
 */
export default async function AppShellPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  const first = slug?.[0] ?? "home";
  const initialTab = (TABS as readonly string[]).includes(first) ? first : "home";
  return <NativeAppLoader initialTab={initialTab} />;
}

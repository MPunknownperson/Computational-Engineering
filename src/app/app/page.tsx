import type { Metadata } from "next";
import { InstallGate } from "@/components/pwa/InstallGate";

export const metadata: Metadata = {
  title: "Install the Radix Loom app",
  description: "Install the Radix Loom progressive web app for an offline-first, native-style experience.",
  robots: { index: false, follow: false },
};

export default function PwaEntryPage() {
  return <InstallGate />;
}

import type { Metadata } from "next";
import { NativeAppLoader } from "@/components/native/NativeAppLoader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shared · Radix Loom",
  robots: { index: false, follow: false },
};

/** Share-target landing screen inside the native shell. */
export default function SharedPage() {
  return <NativeAppLoader initialTab="shared" />;
}

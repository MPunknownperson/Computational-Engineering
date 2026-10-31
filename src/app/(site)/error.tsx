"use client";
import { SelfHealingBoundary } from "@/components/system/SelfHealingBoundary";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <SelfHealingBoundary error={error} reset={reset} scope="route" />;
}

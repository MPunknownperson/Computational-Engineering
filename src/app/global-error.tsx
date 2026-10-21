"use client";
import { SelfHealingBoundary } from "@/components/system/SelfHealingBoundary";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f7f5ef", color: "#0b1020" }}>
        <SelfHealingBoundary error={error} reset={reset} scope="global" />
      </body>
    </html>
  );
}

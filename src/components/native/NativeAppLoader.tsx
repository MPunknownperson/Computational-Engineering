"use client";

import dynamic from "next/dynamic";

/**
 * Entry point mounted by the /app route. The whole native shell renders on the
 * client only: it owns its own navigation stack, so Next never performs a
 * server navigation between screens and the transitions stay native-smooth.
 */
const NativeApp = dynamic(() => import("./NativeApp"), {
  ssr: false,
  loading: () => (
    <div className="native-boot" role="status" aria-live="polite">
      <span className="native-boot__spinner" aria-hidden />
      <p>Loading Quilloryn…</p>
    </div>
  ),
});

export function NativeAppLoader({ initialTab }: { initialTab: string }) {
  return <NativeApp initialTab={initialTab} />;
}

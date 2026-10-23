"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { NativeProvider, useNative } from "./NativeProvider";
import { ConnectionGate } from "./ConnectionGate";
import { ServiceWorkerHost } from "./ServiceWorkerHost";
import { onHardwareBack } from "@/lib/native/bridge";

/**
 * Both UI engines are loaded lazily and client-only. They touch `window`
 * during module evaluation (custom-element registration for Ionic, DOM
 * measurement for Framework7), so server rendering is deliberately disabled.
 */
const IonicEngine = dynamic(() => import("./ionic/IonicEngine"), {
  ssr: false,
  loading: () => <EngineSplash label="Ionic" />,
});

const F7Engine = dynamic(() => import("./framework7/F7Engine"), {
  ssr: false,
  loading: () => <EngineSplash label="Framework7" />,
});

function EngineSplash({ label }: { label: string }) {
  return (
    <div className="native-boot" role="status" aria-live="polite">
      <span className="native-boot__spinner" aria-hidden />
      <p>Starting {label} shell…</p>
    </div>
  );
}

function EngineSwitch({ initialTab }: { initialTab: string }) {
  const { engine } = useNative();

  // Android's hardware/gesture back should never close the app from a nested
  // screen; each engine's router handles it first.
  useEffect(() => {
    return onHardwareBack(() => {
      const openOverlay = document.querySelector(".sheet-modal.modal-in, ion-modal.show-modal, .panel-in, ion-menu.show-menu");
      if (openOverlay) return true;
      return false;
    });
  }, []);

  if (engine === "framework7") {
    return <F7Engine initialTab={initialTab} />;
  }
  const ionicTab = (["home", "calculator", "convert", "shared", "settings"] as const).includes(
    initialTab as "home",
  )
    ? (initialTab as "home" | "calculator" | "convert" | "shared" | "settings")
    : "home";
  return <IonicEngine initialTab={ionicTab} />;
}

export default function NativeApp({ initialTab }: { initialTab: string }) {
  return (
    <NativeProvider>
      <ServiceWorkerHost />
      <ConnectionGate>
        <EngineSwitch initialTab={initialTab} />
      </ConnectionGate>
    </NativeProvider>
  );
}

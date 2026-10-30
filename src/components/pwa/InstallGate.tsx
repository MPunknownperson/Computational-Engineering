"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches
    || window.matchMedia("(display-mode: fullscreen)").matches
    || window.matchMedia("(display-mode: minimal-ui)").matches
    || nav.standalone === true;
}

export function InstallGate() {
  const router = useRouter();
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    if (isStandalone()) {
      router.replace("/app/home");
      return;
    }
    const ua = navigator.userAgent;
    setPlatform(/iPhone|iPad|iPod/.test(ua) ? "ios" : /Android/.test(ua) ? "android" : "desktop");
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setStatus("Installed — open Quilloryn from your home screen."));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [router]);

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    setStatus(choice.outcome === "accepted" ? "Installing…" : "Installation dismissed.");
    setPrompt(null);
  };

  const steps = platform === "ios"
    ? ["Tap the Share button in Safari", "Choose “Add to Home Screen”", "Open Quilloryn from your home screen"]
    : platform === "android"
      ? ["Open the browser menu (⋮)", "Choose “Install app” / “Add to Home screen”", "Launch Quilloryn from your launcher"]
      : ["Click the install icon in the address bar", "Confirm “Install”", "Quilloryn opens in its own window"];

  return (
    <div className="pwa-scroll" style={{ display: "grid", placeItems: "center" }}>
      <div style={{ maxWidth: 480, width: "100%", display: "grid", gap: "1rem", textAlign: "center" }}>
        <div
          aria-hidden
          style={{
            width: 104, height: 104, margin: "0 auto", borderRadius: 26,
            background: "linear-gradient(145deg,#2f6f5b,#7fd1b2)", display: "grid", placeItems: "center",
            color: "#fff", fontSize: 46, fontWeight: 700, boxShadow: "0 18px 40px -18px rgba(0,0,0,.55)",
          }}
        >
          ◆
        </div>
        <h1 style={{ fontSize: "1.7rem", fontWeight: 700 }}>Quilloryn App</h1>
        <p className="pwa-muted">
          This address is the dedicated home of the Quilloryn progressive web app. Install it to get an
          offline-first, native-style experience — no address bar, no browser chrome.
        </p>
        {prompt && (
          <button type="button" className="pwa-btn" data-variant="accent" onClick={install}>
            Install app
          </button>
        )}
        {status && <p className="pwa-muted">{status}</p>}
        <div className="pwa-card" style={{ textAlign: "left" }}>
          <h2 style={{ fontWeight: 600, marginBottom: ".5rem" }}>
            How to install{platform === "ios" ? " on iOS" : platform === "android" ? " on Android" : " on desktop"}
          </h2>
          <ol style={{ display: "grid", gap: ".45rem", paddingLeft: "1.1rem", listStyle: "decimal" }}>
            {steps.map((step) => <li key={step} className="pwa-muted">{step}</li>)}
          </ol>
        </div>
        <button type="button" className="pwa-btn" onClick={() => router.push("/app/home")}>
          Preview the app experience
        </button>
        <a href="/" className="pwa-muted" style={{ fontSize: ".85rem", textDecoration: "underline" }}>
          Continue to the regular website
        </a>
      </div>
    </div>
  );
}

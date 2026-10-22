"use client";

import { useEffect, useState } from "react";

export function PwaSettings() {
  const [online, setOnline] = useState(true);
  const [caches, setCaches] = useState<string[]>([]);
  const [usage, setUsage] = useState<string>("—");
  const [swState, setSwState] = useState("checking…");

  const refresh = async () => {
    if (typeof window === "undefined") return;
    setOnline(navigator.onLine);
    if ("caches" in window) setCaches(await window.caches.keys());
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      setUsage(`${((estimate.usage ?? 0) / 1_048_576).toFixed(1)} MB cached`);
    }
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      setSwState(reg ? (reg.active ? "active" : "installing") : "not registered");
    } else {
      setSwState("unsupported");
    }
  };

  useEffect(() => {
    void refresh();
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const clear = async () => {
    const keys = await window.caches.keys();
    await Promise.all(keys.map((key) => window.caches.delete(key)));
    await refresh();
  };

  return (
    <div style={{ display: "grid", gap: ".85rem" }}>
      <div className="pwa-card" style={{ display: "grid", gap: ".4rem" }}>
        <Row label="Connection" value={online ? "Online" : "Offline"} />
        <Row label="Service worker" value={swState} />
        <Row label="Storage" value={usage} />
        <Row label="Cache buckets" value={String(caches.length)} />
      </div>
      <div className="pwa-card">
        <p className="pwa-muted" style={{ fontSize: ".85rem", marginBottom: ".6rem" }}>
          Workbox strategies: app shell &amp; static assets use cache-first with revision hashes, navigation and API
          requests use network-first with an offline fallback.
        </p>
        <ul style={{ display: "grid", gap: ".3rem", fontSize: ".85rem" }} className="pwa-muted">
          {caches.map((key) => <li key={key}>• {key}</li>)}
        </ul>
      </div>
      <button type="button" className="pwa-btn" onClick={clear}>Clear offline cache</button>
      <button type="button" className="pwa-btn" onClick={() => location.reload()}>Check for updates</button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
      <span className="pwa-muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

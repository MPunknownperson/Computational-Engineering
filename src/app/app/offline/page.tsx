export const metadata = { title: "Offline", robots: { index: false, follow: false } };

export default function OfflinePage() {
  return (
    <div className="pwa-card" style={{ textAlign: "center" }}>
      <p style={{ fontSize: "2.4rem" }} aria-hidden>📴</p>
      <h2 style={{ fontWeight: 700, fontSize: "1.2rem" }}>You are offline</h2>
      <p className="pwa-muted" style={{ marginTop: ".4rem" }}>
        This screen was served from the Workbox cache. Calculator and converter still work — live data will sync
        when the connection returns.
      </p>
    </div>
  );
}

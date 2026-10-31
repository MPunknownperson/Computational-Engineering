import Link from "next/link";

const CARDS = [
  { href: "/app/calculator", icon: "🧮", title: "Calculator", body: "Fast arithmetic with a native keypad." },
  { href: "/app/convert", icon: "📐", title: "Unit converter", body: "Length, mass, temperature, data and more." },
  { href: "/app/settings", icon: "⚙️", title: "Settings & storage", body: "Cache status, offline control, updates." },
];

export default function PwaHome() {
  return (
    <div style={{ display: "grid", gap: "0.85rem" }}>
      <section className="pwa-card">
        <p className="pwa-muted" style={{ fontSize: ".8rem", textTransform: "uppercase", letterSpacing: ".08em" }}>
          Welcome back
        </p>
        <h2 style={{ fontSize: "1.45rem", fontWeight: 700, marginTop: ".2rem" }}>Calculators and converters</h2>
        <p className="pwa-muted" style={{ marginTop: ".35rem" }}>
          Everything below works offline once cached by the Workbox-powered service worker.
        </p>
      </section>
      {CARDS.map((card) => (
        <Link key={card.href} href={card.href} className="pwa-card" style={{ display: "flex", gap: ".85rem", alignItems: "center" }}>
          <span aria-hidden style={{ fontSize: "1.6rem" }}>{card.icon}</span>
          <span>
            <span style={{ display: "block", fontWeight: 600 }}>{card.title}</span>
            <span className="pwa-muted" style={{ fontSize: ".9rem" }}>{card.body}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

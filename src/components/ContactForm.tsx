"use client";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { CONTACT_LIMITS as L, CONTACT_TOPICS } from "@/lib/catalog";
import { TurnstileWidget } from "@/components/tech/TurnstileWidget";

type Status = "idle" | "sending" | "sent" | "error";

export function ContactForm() {
  const [topic, setTopic] = useState<string>("general");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [turnstile, setTurnstile] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const tooShort = message.trim().length < L.minMessage;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (tooShort || status === "sending") return;
    setStatus("sending");
    setError(null);
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, name, email, message, website, turnstile }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Could not send your message.");
      setStatus("sent");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not send your message.");
    }
  }

  if (status === "sent") {
    return (
      <div className="sketch panel-swap text-center" role="status">
        <span className="icon-tile mx-auto" style={{ background: "#4ade80" }}>
          <Icon name="check" size={22} strokeWidth={2.6} />
        </span>
        <h2 className="mt-3 text-xl font-extrabold">Message received</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
          {email
            ? "If a reply is needed we will use the e-mail address you gave."
            : "You did not leave an e-mail address, so we will not be able to reply directly."}
        </p>
        <button className="btn mt-5" onClick={() => setStatus("idle")}>
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="sketch space-y-4" noValidate>
      <div>
        <label htmlFor="cf-topic" className="mb-1.5 block text-sm font-extrabold">Topic</label>
        <select id="cf-topic" className="select" value={topic} onChange={(e) => setTopic(e.target.value)}>
          {CONTACT_TOPICS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cf-name" className="mb-1.5 block text-sm font-extrabold">
            Name <span className="font-semibold text-slate-500">(optional)</span>
          </label>
          <input id="cf-name" className="input" value={name} maxLength={L.name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="cf-email" className="mb-1.5 block text-sm font-extrabold">
            E-mail <span className="font-semibold text-slate-500">(optional, only for a reply)</span>
          </label>
          <input id="cf-email" type="email" className="input" value={email} maxLength={L.email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
      </div>

      <div>
        <label htmlFor="cf-message" className="mb-1.5 block text-sm font-extrabold">Message</label>
        <textarea
          id="cf-message"
          className="textarea !font-sans"
          value={message}
          maxLength={L.message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Which tool, what you entered, what you expected and what you saw…"
          required
          aria-describedby="cf-count"
        />
        <div id="cf-count" className="mt-1 flex justify-between text-xs text-slate-500">
          <span>Please do not include passwords, payment details or health information.</span>
          <span className="mono">{message.length}/{L.message}</span>
        </div>
      </div>
      <TurnstileWidget onToken={(token) => setTurnstile(token ?? "")} />

      {/* honeypot — hidden from people and assistive technology */}
      <div className="hidden" aria-hidden>
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border-2 border-[color:var(--line)] bg-[#ffe4e0] px-3 py-2 text-sm font-semibold">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-sm text-xs text-slate-500">
          The topic, message and any optional contact details are used to handle your enquiry. See the{" "}
          <Link href="/privacy#categories" className="font-bold underline decoration-2 underline-offset-2">
            Privacy Notice
          </Link>{" "}
          for how long they are kept and how to ask for removal.
        </p>
        <button type="submit" className="btn btn-primary !min-h-11" disabled={tooShort || status === "sending"}>
          {status === "sending" ? "Sending…" : "Send message"}
          <Icon name="arrow-right" size={16} />
        </button>
      </div>
    </form>
  );
}


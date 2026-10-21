"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MarketAsset } from "@/lib/crypto/providers";

export type { MarketAsset };

export type FeedMeta = { source: string; live: boolean; fetchedAt: number; ageMs: number; state: string; transport: "sse" | "polling" | "idle"; lastEventAt: number | null; seq: number; errors: number; reconnects: number };

export const VS_OPTIONS = [
  { value: "usd", label: "USD", symbol: "$" }, { value: "eur", label: "EUR", symbol: "€" }, { value: "gbp", label: "GBP", symbol: "£" }, { value: "jpy", label: "JPY", symbol: "¥" },
  { value: "chf", label: "CHF", symbol: "CHF " }, { value: "cad", label: "CAD", symbol: "CA$" }, { value: "aud", label: "AUD", symbol: "A$" }, { value: "btc", label: "BTC", symbol: "₿" }, { value: "eth", label: "ETH", symbol: "Ξ" },
];

export function vsSymbol(vs: string): string { return VS_OPTIONS.find((o) => o.value === vs)?.symbol ?? `${vs.toUpperCase()} `; }

/* ------------------------------ workspace ----------------------------- */

const WS_KEY = "radix-crypto:workspace";
export function workspaceToken(): string {
  if (typeof window === "undefined") return "server-render-placeholder";
  try {
    const existing = localStorage.getItem(WS_KEY) ?? sessionStorage.getItem(WS_KEY);
    if (existing && /^[A-Za-z0-9_-]{16,80}$/.test(existing)) return existing;
    const bytes = new Uint8Array(24); crypto.getRandomValues(bytes);
    const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    try { localStorage.setItem(WS_KEY, token); } catch { sessionStorage.setItem(WS_KEY, token); }
    return token;
  } catch {
    return `ephemeral-${Math.random().toString(36).slice(2).padEnd(14, "0")}`;
  }
}

/* ---------------------------- error reporting ------------------------- */

export type ClientAction = { type: string; [key: string]: unknown };
export type ApiError = Error & { status?: number; category?: string; retryable?: boolean; remediation?: { playbook: string; summary: string; clientActions: ClientAction[] } | null };

const reported = new Map<string, number>();
export async function reportClientError(input: { message: string; stack?: string; category?: string; route?: string; userAction?: string; context?: Record<string, unknown> }): Promise<{ clientActions: ClientAction[]; summary?: string; playbook?: string } | null> {
  const key = `${input.category ?? ""}|${input.message.slice(0, 80)}`;
  const last = reported.get(key) ?? 0;
  if (Date.now() - last < 15_000) return null;
  reported.set(key, Date.now());
  try {
    const response = await fetch("/api/system/errors", { method: "POST", headers: { "Content-Type": "application/json", "x-workspace": workspaceToken() }, body: JSON.stringify({ ...input, route: input.route ?? (typeof location !== "undefined" ? location.pathname : undefined), context: { ...(input.context ?? {}), href: typeof location !== "undefined" ? location.href : undefined, online: typeof navigator !== "undefined" ? navigator.onLine : undefined } }), keepalive: true });
    if (!response.ok) return null;
    const data = await response.json();
    return { clientActions: data.clientActions ?? [], summary: data.summary, playbook: data.playbook };
  } catch { return null; }
}

/** Apply browser-side remediation actions returned by the server. */
export function applyClientActions(actions: ClientAction[], handlers: { retry?: () => void; resetBoundary?: () => void; switchTransport?: (to: "polling" | "sse") => void; notify?: (message: string) => void } = {}): void {
  for (const action of actions) {
    switch (action.type) {
      case "retry": setTimeout(() => handlers.retry?.(), Number(action.delayMs ?? 1_000)); break;
      case "reset-boundary": handlers.resetBoundary?.(); break;
      case "switch-transport": handlers.switchTransport?.(action.to === "sse" ? "sse" : "polling"); try { sessionStorage.setItem("radix-crypto:transport", String(action.to)); } catch { /* ignore */ } break;
      case "notify": handlers.notify?.(String(action.message ?? "")); break;
      case "clear-storage": {
        const keys = Array.isArray(action.keys) ? (action.keys as string[]) : [];
        const scopes = action.scope === "local" ? [localStorage] : action.scope === "session" ? [sessionStorage] : [localStorage, sessionStorage];
        for (const store of scopes) {
          try { for (let i = store.length - 1; i >= 0; i--) { const k = store.key(i); if (k && keys.some((prefix) => k.startsWith(prefix)) && k !== WS_KEY) store.removeItem(k); } } catch { /* ignore */ }
        }
        break;
      }
      case "reload": {
        try {
          const last = Number(sessionStorage.getItem("radix-crypto:last-reload") ?? 0);
          if (Date.now() - last < 5 * 60_000) break; // one automatic reload per 5 minutes
          sessionStorage.setItem("radix-crypto:last-reload", String(Date.now()));
        } catch { /* ignore */ }
        setTimeout(() => { const url = new URL(location.href); if (action.cacheBust) url.searchParams.set("_r", Date.now().toString(36)); location.replace(url.toString()); }, Number(action.delayMs ?? 500));
        break;
      }
    }
  }
}

/** fetch + JSON with classification, automatic incident reporting and one retry for retryable failures. */
export async function apiFetch<T>(input: string, init: RequestInit & { userAction?: string; retries?: number } = {}): Promise<T> {
  const { userAction, retries = 1, ...rest } = init;
  const headers = { "x-workspace": workspaceToken(), ...(rest.headers ?? {}) } as Record<string, string>;
  let attempt = 0;
  for (;;) {
    try {
      const response = await fetch(input, { ...rest, headers, cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const error = new Error(data?.error ?? `Request failed (${response.status})`) as ApiError;
        error.status = response.status; error.category = data?.category; error.retryable = data?.retryable; error.remediation = data?.remediation ?? null;
        if (data?.remediation?.clientActions?.length && response.status >= 500) applyClientActions(data.remediation.clientActions.filter((a: ClientAction) => a.type !== "retry" && a.type !== "reload"));
        throw error;
      }
      return data as T;
    } catch (error) {
      const apiError = error as ApiError;
      const retryable = apiError.retryable ?? (apiError.status === undefined || apiError.status >= 500);
      if (retryable && attempt < retries) { attempt++; await new Promise((r) => setTimeout(r, 400 * attempt + Math.random() * 300)); continue; }
      if (apiError.status === undefined || apiError.status >= 500) {
        void reportClientError({ message: apiError.message, category: apiError.category ?? (apiError.status === undefined ? "network_offline" : undefined), route: input.split("?")[0], userAction, context: { status: apiError.status } });
      }
      throw error;
    }
  }
}

/* ------------------------------ market feed --------------------------- */

type FeedState = { items: MarketAsset[]; meta: FeedMeta; loading: boolean; error: string | null; notice: string | null };

export function useMarketFeed(vs: string): FeedState & { refresh: () => Promise<void> } {
  const [state, setState] = useState<FeedState>({ items: [], meta: { source: "—", live: false, fetchedAt: 0, ageMs: 0, state: "miss", transport: "idle", lastEventAt: null, seq: 0, errors: 0, reconnects: 0 }, loading: true, error: null, notice: null });
  const sparkRef = useRef<Map<string, number[]>>(new Map());
  const transportRef = useRef<"sse" | "polling">("sse");
  const sourceRef = useRef<EventSource | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failuresRef = useRef(0);

  const merge = useCallback((items: MarketAsset[]) => items.map((a) => {
    if (a.sparkline7d && a.sparkline7d.length) sparkRef.current.set(a.id, a.sparkline7d);
    return { ...a, sparkline7d: a.sparkline7d ?? sparkRef.current.get(a.id) ?? null };
  }), []);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<{ items: MarketAsset[]; source: string; live: boolean; fetchedAt: number; ageMs: number; state: string }>(`/api/crypto?vs=${vs}`, { userAction: "refresh-markets" });
      failuresRef.current = 0;
      setState((s) => ({ ...s, items: merge(data.items), loading: false, error: null, meta: { ...s.meta, source: data.source, live: data.live, fetchedAt: data.fetchedAt, ageMs: data.ageMs, state: data.state, lastEventAt: Date.now() } }));
    } catch (error) {
      failuresRef.current++;
      const apiError = error as ApiError;
      setState((s) => ({ ...s, loading: s.items.length === 0 ? false : s.loading, error: apiError.message, notice: apiError.remediation?.summary ?? s.notice, meta: { ...s.meta, errors: s.meta.errors + 1 } }));
    }
  }, [vs, merge]);

  useEffect(() => {
    let cancelled = false;
    try { if (sessionStorage.getItem("radix-crypto:transport") === "polling") transportRef.current = "polling"; } catch { /* ignore */ }
    sparkRef.current = new Map();
    setState((s) => ({ ...s, loading: true, items: [] }));

    const startPolling = () => {
      if (cancelled) return;
      transportRef.current = "polling";
      setState((s) => ({ ...s, meta: { ...s.meta, transport: "polling" } }));
      const loop = async () => { if (cancelled) return; await refresh(); if (!cancelled) pollRef.current = setTimeout(loop, failuresRef.current ? Math.min(120_000, 15_000 * 2 ** failuresRef.current) : 30_000); };
      void loop();
    };

    const startStream = () => {
      if (cancelled || typeof EventSource === "undefined") { startPolling(); return; }
      void refresh(); // immediate paint; the stream then takes over
      const source = new EventSource(`/api/crypto/stream?vs=${vs}`);
      sourceRef.current = source;
      let streamErrors = 0;
      source.addEventListener("tick", (event) => {
        const data = JSON.parse((event as MessageEvent).data) as { items: MarketAsset[]; source: string; live: boolean; fetchedAt: number; ageMs: number; state: string; seq: number };
        streamErrors = 0;
        setState((s) => ({ ...s, items: merge(data.items), loading: false, error: null, meta: { ...s.meta, source: data.source, live: data.live, fetchedAt: data.fetchedAt, ageMs: data.ageMs, state: data.state, transport: "sse", lastEventAt: Date.now(), seq: data.seq } }));
      });
      source.addEventListener("error", () => {
        streamErrors++;
        setState((s) => ({ ...s, meta: { ...s.meta, errors: s.meta.errors + 1, reconnects: s.meta.reconnects + 1 } }));
        if (streamErrors >= 3) {
          source.close();
          void reportClientError({ message: "EventSource stream failed repeatedly", category: "upstream_unavailable", route: "/api/crypto/stream", userAction: "live-feed", context: { feature: "stream" } }).then((plan) => { if (plan) applyClientActions(plan.clientActions, { switchTransport: () => undefined }); });
          startPolling();
        }
      });
    };

    if (transportRef.current === "polling") startPolling(); else startStream();
    return () => { cancelled = true; sourceRef.current?.close(); sourceRef.current = null; if (pollRef.current) clearTimeout(pollRef.current); };
  }, [vs, refresh, merge]);

  return { ...state, refresh };
}

/* ------------------------------ formatters ---------------------------- */

export function fmtPrice(value: number | null | undefined, vs = "usd"): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const sym = vsSymbol(vs);
  const abs = Math.abs(value);
  const digits = vs === "btc" || vs === "eth" ? (abs >= 1 ? 4 : 8) : abs >= 1000 ? 2 : abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
  return `${sym}${value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
export function fmtBig(value: number | null | undefined, vs = "usd"): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const sym = vsSymbol(vs);
  if (value >= 1e12) return `${sym}${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `${sym}${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${sym}${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${sym}${(value / 1e3).toFixed(1)}K`;
  return `${sym}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
export function fmtPct(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}
export function fmtAge(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1_000) return "just now";
  if (ms < 60_000) return `${Math.round(ms / 1_000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  return `${(ms / 3_600_000).toFixed(1)}h ago`;
}
export function sourceLabel(source: string): string {
  if (source.startsWith("coingecko")) return "CoinGecko · live";
  if (source.startsWith("coinbase")) return "Coinbase · live";
  if (source.startsWith("db-cache")) return "Persisted cache";
  if (source === "snapshot" || source === "snapshots") return "Last persisted snapshot";
  if (source === "seed") return "Reference seed (providers unreachable)";
  return source;
}

"use client";

/**
 * Engine-agnostic state for the native shell. Both the Ionic and the
 * Framework7 renderers consume these hooks, so the two skins always behave
 * identically and only the presentation differs.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { evaluate } from "mathjs";
import {
  CATEGORIES,
  FACTORS,
  TEMPERATURE_UNITS,
  convert,
  convertTemperature,
  type Category,
} from "@/lib/units";
import { deviceId } from "./platform";

/* ── Feed: pull-to-refresh + infinite scroll ─────────────────────────────── */

export interface FeedItem {
  id: number;
  slug: string;
  title: string;
  summary: string;
  category: string;
  href: string;
  icon: string;
}

export interface FeedState {
  items: FeedItem[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  total: number;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

const PAGE_SIZE = 6;

export function useFeed(): FeedState {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const fetchPage = useCallback(async (from: number | null, replace: boolean) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const url = `/api/app/feed?limit=${PAGE_SIZE}${from ? `&cursor=${from}` : ""}`;
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Feed unavailable (${response.status})`);
      const data = (await response.json()) as { items: FeedItem[]; nextCursor: number | null; total: number };
      setItems((prev) => (replace ? data.items : [...prev, ...data.items]));
      setCursor(data.nextCursor);
      setHasMore(Boolean(data.nextCursor));
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setHasMore(false);
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    void fetchPage(null, true);
  }, [fetchPage]);

  const refresh = useCallback(async () => {
    setHasMore(true);
    await fetchPage(null, true);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!hasMore) return;
    await fetchPage(cursor, false);
  }, [cursor, hasMore, fetchPage]);

  return { items, loading, hasMore, error, total, refresh, loadMore };
}

/* ── Calculator ──────────────────────────────────────────────────────────── */

export interface CalcEntry {
  expression: string;
  result: string;
}

export function useCalculator() {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState("0");
  const [history, setHistory] = useState<CalcEntry[]>([]);

  const press = useCallback(
    (key: string) => {
      if (key === "C") {
        setExpression("");
        setResult("0");
        return "clear" as const;
      }
      if (key === "DEL") {
        setExpression((v) => v.slice(0, -1));
        return "edit" as const;
      }
      if (key === "=") {
        try {
          const value = evaluate(expression || "0");
          const text = String(value);
          setResult(text);
          setHistory((prev) => [{ expression: expression || "0", result: text }, ...prev].slice(0, 40));
          return "ok" as const;
        } catch {
          setResult("Error");
          return "error" as const;
        }
      }
      setExpression((v) => v + key);
      return "edit" as const;
    },
    [expression],
  );

  const setFromShare = useCallback((value: string) => {
    setExpression(value);
    try {
      setResult(String(evaluate(value)));
    } catch {
      setResult("0");
    }
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  return { expression, result, history, press, setExpression, setFromShare, clearHistory };
}

export const CALC_KEYS = ["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "(", ")", "C", "DEL", "+", "="];

/* ── Converter ───────────────────────────────────────────────────────────── */

export function useConverter() {
  const [category, setCategory] = useState<Category>("length");
  const [value, setValue] = useState("1");

  const units = useMemo<Array<readonly [string, string]>>(() => {
    if (category === "temperature") {
      return Object.entries(TEMPERATURE_UNITS).map(([k, v]) => [k, v] as const);
    }
    return Object.entries(FACTORS[category]).map(([k, v]) => [k, v.label] as const);
  }, [category]);

  const [from, setFrom] = useState<string>("m");
  const [to, setTo] = useState<string>("km");

  const changeCategory = useCallback((next: Category) => {
    setCategory(next);
    const list = next === "temperature" ? Object.keys(TEMPERATURE_UNITS) : Object.keys(FACTORS[next]);
    setFrom(list[0]);
    setTo(list[1] ?? list[0]);
  }, []);

  const swap = useCallback(() => {
    setFrom((prevFrom) => {
      setTo(prevFrom);
      return to;
    });
  }, [to]);

  const output = useMemo(() => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "—";
    try {
      const computed =
        category === "temperature"
          ? convertTemperature(numeric, from as "C" | "F" | "K", to as "C" | "F" | "K")
          : convert(category, numeric, from, to);
      return String(Number(computed.toPrecision(10)));
    } catch {
      return "—";
    }
  }, [category, from, to, value]);

  return { category, categories: CATEGORIES, units, value, from, to, output, setValue, setFrom, setTo, changeCategory, swap };
}

/* ── Share inbox ─────────────────────────────────────────────────────────── */

export interface SharedRecord {
  id: string;
  title: string | null;
  body: string | null;
  url: string | null;
  kind: string;
  parsed: Record<string, unknown>;
  platform: string;
  createdAt: string;
}

export function useSharedInbox() {
  const [items, setItems] = useState<SharedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/app/shared?deviceId=${encodeURIComponent(deviceId())}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load shared items");
      const data = (await response.json()) as { items: SharedRecord[] };
      setItems(data.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = useCallback(
    async (id?: string) => {
      const query = new URLSearchParams({ deviceId: deviceId() });
      if (id) query.set("id", id);
      await fetch(`/api/app/shared?${query.toString()}`, { method: "DELETE" });
      await load();
    },
    [load],
  );

  return { items, loading, error, reload: load, remove };
}

import { useCallback, useEffect, useRef, useState } from 'react';

export interface LiveState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  updatedAt: number | null;
  refresh: () => void;
}

export interface LiveOptions {
  /** Poll interval in milliseconds. Zero disables polling. */
  interval?: number;
  /** Pause polling while the tab is hidden (saves quota on public APIs). */
  pauseWhenHidden?: boolean;
  enabled?: boolean;
}

const isAbort = (error: unknown) =>
  error instanceof DOMException ? error.name === 'AbortError' : error instanceof Error && error.name === 'AbortError';

/**
 * Generic live-data hook.
 *
 * Handles abort on unmount, polling, tab-visibility pausing, reconnection after
 * the browser goes back online, and a manual refresh. The loader is kept in a
 * ref so an inline arrow function in the caller does not restart the cycle on
 * every render, which is the classic cause of request storms.
 */
export function useLiveData<T>(key: string, loader: (signal: AbortSignal) => Promise<T>, options: LiveOptions = {}): LiveState<T> {
  const { interval = 0, pauseWhenHidden = true, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);
  const mounted = useRef(true);
  loaderRef.current = loader;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const run = async (isRefresh: boolean) => {
      if (cancelled) return;
      if (isRefresh) setRefreshing(true); else setLoading(true);
      try {
        const value = await loaderRef.current(controller.signal);
        if (cancelled || !mounted.current) return;
        setData(value);
        setError(null);
        setUpdatedAt(Date.now());
      } catch (caught) {
        if (cancelled || !mounted.current || isAbort(caught)) return;
        setError(caught instanceof Error ? caught.message : 'This data source could not be reached.');
      } finally {
        if (!cancelled && mounted.current) { setLoading(false); setRefreshing(false); }
      }
      if (!cancelled && interval > 0) {
        timer = setTimeout(() => { void run(true); }, interval);
      }
    };

    void run(false);

    const onVisibility = () => {
      if (!pauseWhenHidden || typeof document === 'undefined') return;
      if (document.visibilityState === 'visible' && interval > 0) {
        if (timer) clearTimeout(timer);
        void run(true);
      }
    };
    const onOnline = () => { void run(true); };

    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
    if (typeof window !== 'undefined') window.addEventListener('online', onOnline);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      controller.abort();
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
      if (typeof window !== 'undefined') window.removeEventListener('online', onOnline);
    };
  }, [key, interval, pauseWhenHidden, enabled, nonce]);

  const refresh = useCallback(() => { setNonce(value => value + 1); }, []);

  return { data, error, loading, refreshing, updatedAt, refresh };
}

/** Tracks the browser's connectivity so views can explain an empty state. */
export function useOnlineStatus() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return online;
}

/** Re-renders on a timer so "updated 12s ago" labels stay honest. */
export function useTicker(intervalMs = 15000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(value => value + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

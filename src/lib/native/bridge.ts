/**
 * Capacitor bridge.
 *
 * Every call is lazily imported and defensively wrapped: inside a Capacitor
 * native container the real plugin runs and we get true OS behaviour
 * (system share sheet, Taptic Engine, status-bar theming, keyboard insets,
 * hardware back button). In a plain browser the same API degrades to the
 * closest web platform equivalent (Web Share, Vibration, meta theme-color,
 * visualViewport) so the calling UI never needs a branch.
 */

import { isCapacitorNative } from "./platform";

export type ImpactStyle = "light" | "medium" | "heavy";

/* ── Haptics ─────────────────────────────────────────────────────────────── */

let hapticsEnabled = true;
export function setHapticsEnabled(value: boolean) {
  hapticsEnabled = value;
}

export async function impact(style: ImpactStyle = "light"): Promise<void> {
  if (!hapticsEnabled || typeof window === "undefined") return;
  if (isCapacitorNative()) {
    try {
      const mod = await import("@capacitor/haptics");
      const map = { light: mod.ImpactStyle.Light, medium: mod.ImpactStyle.Medium, heavy: mod.ImpactStyle.Heavy };
      await mod.Haptics.impact({ style: map[style] });
      return;
    } catch {
      /* fall through to the web fallback */
    }
  }
  try {
    const ms = style === "heavy" ? 24 : style === "medium" ? 14 : 8;
    navigator.vibrate?.(ms);
  } catch {
    /* vibration unsupported (iOS Safari) — silently ignore */
  }
}

export async function selectionChanged(): Promise<void> {
  if (!hapticsEnabled) return;
  if (isCapacitorNative()) {
    try {
      const mod = await import("@capacitor/haptics");
      await mod.Haptics.selectionChanged();
      return;
    } catch {
      /* ignore */
    }
  }
  void impact("light");
}

export async function notify(type: "success" | "warning" | "error"): Promise<void> {
  if (!hapticsEnabled) return;
  if (isCapacitorNative()) {
    try {
      const mod = await import("@capacitor/haptics");
      const map = {
        success: mod.NotificationType.Success,
        warning: mod.NotificationType.Warning,
        error: mod.NotificationType.Error,
      };
      await mod.Haptics.notification({ type: map[type] });
      return;
    } catch {
      /* ignore */
    }
  }
  void impact(type === "error" ? "heavy" : "medium");
}

/* ── Share ───────────────────────────────────────────────────────────────── */

export interface SharePayload {
  title?: string;
  text?: string;
  url?: string;
}

/** Opens the real OS share sheet. Returns false when no sharing UI exists. */
export async function share(payload: SharePayload): Promise<boolean> {
  if (isCapacitorNative()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title: payload.title, text: payload.text, url: payload.url, dialogTitle: payload.title });
      return true;
    } catch {
      return false;
    }
  }
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(payload);
      return true;
    } catch {
      return false;
    }
  }
  // Last resort: clipboard, so the action is never a dead end.
  try {
    const text = [payload.title, payload.text, payload.url].filter(Boolean).join("\n");
    await navigator.clipboard?.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function canShare(): boolean {
  if (typeof window === "undefined") return false;
  return isCapacitorNative() || typeof navigator.share === "function" || Boolean(navigator.clipboard);
}

/* ── Status bar ──────────────────────────────────────────────────────────── */

/**
 * Keeps the OS status bar in sync with the app palette so the app never shows
 * a mismatched strip at the top of the screen.
 */
export async function syncStatusBar(theme: "light" | "dark", color: string): Promise<void> {
  if (isCapacitorNative()) {
    try {
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      await StatusBar.setStyle({ style: theme === "dark" ? Style.Dark : Style.Light });
      // Android supports a coloured status bar; iOS ignores this call.
      await StatusBar.setBackgroundColor({ color }).catch(() => undefined);
      await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => undefined);
      return;
    } catch {
      /* ignore */
    }
  }
  if (typeof document === "undefined") return;
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = color;
}

/* ── Keyboard ────────────────────────────────────────────────────────────── */

/**
 * Publishes the on-screen keyboard height as `--keyboard-inset` so sticky
 * keypads and toolbars ride above it exactly like a native app.
 */
export function watchKeyboard(): () => void {
  if (typeof window === "undefined") return () => undefined;
  const root = document.documentElement;
  const set = (h: number) => root.style.setProperty("--keyboard-inset", `${Math.max(0, Math.round(h))}px`);
  const cleanups: Array<() => void> = [];

  if (isCapacitorNative()) {
    void import("@capacitor/keyboard")
      .then(({ Keyboard }) => {
        const showP = Keyboard.addListener("keyboardWillShow", (info) => set(info.keyboardHeight));
        const hideP = Keyboard.addListener("keyboardWillHide", () => set(0));
        cleanups.push(() => {
          void showP.then((h) => h.remove());
          void hideP.then((h) => h.remove());
        });
      })
      .catch(() => undefined);
  }

  const vv = window.visualViewport;
  if (vv) {
    const onResize = () => set(window.innerHeight - vv.height - vv.offsetTop);
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    cleanups.push(() => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    });
  }

  return () => {
    cleanups.forEach((fn) => fn());
    set(0);
  };
}

/* ── Hardware back button ────────────────────────────────────────────────── */

/** Android hardware/gesture back. Returning true marks the event handled. */
export function onHardwareBack(handler: () => boolean): () => void {
  if (typeof window === "undefined") return () => undefined;
  let remove = () => undefined as void;
  if (isCapacitorNative()) {
    void import("@capacitor/app")
      .then(({ App }) =>
        App.addListener("backButton", () => {
          if (!handler()) void App.exitApp();
        }),
      )
      .then((handle) => {
        remove = () => void handle.remove();
      })
      .catch(() => undefined);
  }
  // Browsers: intercept the history pop so in-app navigation wins first.
  const onPop = () => {
    if (handler()) history.pushState(null, "", location.href);
  };
  window.addEventListener("popstate", onPop);
  return () => {
    remove();
    window.removeEventListener("popstate", onPop);
  };
}

/* ── Network ─────────────────────────────────────────────────────────────── */

export interface NetworkState {
  connected: boolean;
  connectionType: string;
}

/**
 * This PWA is deliberately **online-only**, so connectivity is a first-class
 * signal rather than something papered over with a cache.
 */
export function watchNetwork(cb: (state: NetworkState) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  let removeNative = () => undefined as void;

  const emitFromBrowser = () =>
    cb({
      connected: navigator.onLine,
      connectionType:
        (navigator as unknown as { connection?: { effectiveType?: string } }).connection?.effectiveType ?? "unknown",
    });

  if (isCapacitorNative()) {
    void import("@capacitor/network")
      .then(async ({ Network }) => {
        const status = await Network.getStatus();
        cb({ connected: status.connected, connectionType: status.connectionType });
        const handle = await Network.addListener("networkStatusChange", (s) =>
          cb({ connected: s.connected, connectionType: s.connectionType }),
        );
        removeNative = () => void handle.remove();
      })
      .catch(emitFromBrowser);
  } else {
    emitFromBrowser();
  }

  window.addEventListener("online", emitFromBrowser);
  window.addEventListener("offline", emitFromBrowser);
  return () => {
    removeNative();
    window.removeEventListener("online", emitFromBrowser);
    window.removeEventListener("offline", emitFromBrowser);
  };
}

/* ── Device + preferences ────────────────────────────────────────────────── */

export interface DeviceSummary {
  model: string;
  operatingSystem: string;
  osVersion: string;
  manufacturer: string;
  isVirtual: boolean;
  webViewVersion: string;
}

export async function deviceSummary(): Promise<DeviceSummary | null> {
  try {
    const { Device } = await import("@capacitor/device");
    const info = await Device.getInfo();
    return {
      model: info.model,
      operatingSystem: info.operatingSystem,
      osVersion: info.osVersion,
      manufacturer: info.manufacturer,
      isVirtual: info.isVirtual,
      webViewVersion: info.webViewVersion,
    };
  } catch {
    return null;
  }
}

/** Capacitor Preferences in native containers, localStorage on the web. */
export async function prefGet(key: string): Promise<string | null> {
  if (isCapacitorNative()) {
    try {
      const { Preferences } = await import("@capacitor/preferences");
      return (await Preferences.get({ key })).value;
    } catch {
      /* ignore */
    }
  }
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function prefSet(key: string, value: string): Promise<void> {
  if (isCapacitorNative()) {
    try {
      const { Preferences } = await import("@capacitor/preferences");
      await Preferences.set({ key, value });
      return;
    } catch {
      /* ignore */
    }
  }
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage blocked */
  }
}

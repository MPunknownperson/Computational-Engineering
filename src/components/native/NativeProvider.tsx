"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_PLATFORM,
  deviceId,
  effectiveEngine,
  effectiveMode,
  resolvePlatform,
  windowControlsOverlayVisible,
  type EnginePreference,
  type ModePreference,
  type PlatformInfo,
  type UiMode,
} from "@/lib/native/platform";
import { setHapticsEnabled, syncStatusBar, watchKeyboard, watchNetwork } from "@/lib/native/bridge";

export interface TitlebarArea {
  /** Width of the OS window-control buttons region, in CSS pixels. */
  x: number;
  y: number;
  width: number;
  height: number;
}

interface NativeContextValue {
  info: PlatformInfo;
  mode: UiMode;
  engine: "ionic" | "framework7";
  enginePreference: EnginePreference;
  modePreference: ModePreference;
  haptics: boolean;
  online: boolean;
  connectionType: string;
  wco: boolean;
  titlebar: TitlebarArea | null;
  deviceId: string;
  setEnginePreference: (value: EnginePreference) => void;
  setModePreference: (value: ModePreference) => void;
  setHaptics: (value: boolean) => void;
}

const NativeContext = createContext<NativeContextValue | null>(null);

const STORAGE = {
  engine: "quilloryn-native-engine",
  mode: "quilloryn-native-mode",
  haptics: "quilloryn-native-haptics",
};

function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key) as T | null;
    return value && allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function NativeProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<PlatformInfo>(DEFAULT_PLATFORM);
  const [enginePreference, setEnginePreferenceState] = useState<EnginePreference>("auto");
  const [modePreference, setModePreferenceState] = useState<ModePreference>("auto");
  const [haptics, setHapticsState] = useState(true);
  const [online, setOnline] = useState(true);
  const [connectionType, setConnectionType] = useState("unknown");
  const [wco, setWco] = useState(false);
  const [titlebar, setTitlebar] = useState<TitlebarArea | null>(null);
  const [id, setId] = useState("anonymous");

  /* Resolve the platform and stored preferences once on the client. */
  useEffect(() => {
    setInfo(resolvePlatform());
    setId(deviceId());
    setEnginePreferenceState(readStored(STORAGE.engine, ["auto", "ionic", "framework7"] as const, "auto"));
    setModePreferenceState(readStored(STORAGE.mode, ["auto", "ios", "md"] as const, "auto"));
    try {
      setHapticsState(window.localStorage.getItem(STORAGE.haptics) !== "false");
    } catch {
      /* storage blocked */
    }
  }, []);

  /* Window Controls Overlay: track the geometry the OS reserves for its own
     buttons so our title bar never slides underneath them. */
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const overlay = (
      navigator as unknown as {
        windowControlsOverlay?: {
          visible: boolean;
          getTitlebarAreaRect: () => DOMRect;
          addEventListener: (t: string, h: () => void) => void;
          removeEventListener: (t: string, h: () => void) => void;
        };
      }
    ).windowControlsOverlay;
    if (!overlay) return;

    const sync = () => {
      const visible = overlay.visible;
      setWco(visible);
      const rect = overlay.getTitlebarAreaRect();
      setTitlebar(visible ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null);
      const root = document.documentElement;
      root.dataset.wco = visible ? "on" : "off";
      root.style.setProperty("--titlebar-height", visible ? `${Math.round(rect.height)}px` : "0px");
      root.style.setProperty("--titlebar-x", `${Math.round(rect.x)}px`);
      root.style.setProperty("--titlebar-width", visible ? `${Math.round(rect.width)}px` : "100%");
    };

    sync();
    overlay.addEventListener("geometrychange", sync);
    return () => overlay.removeEventListener("geometrychange", sync);
  }, []);

  /* Online-only policy: this app refuses to pretend it works offline. */
  useEffect(() => {
    return watchNetwork((state) => {
      setOnline(state.connected);
      setConnectionType(state.connectionType);
    });
  }, []);

  /* Keyboard insets so keypads float above the on-screen keyboard. */
  useEffect(() => watchKeyboard(), []);

  useEffect(() => {
    setHapticsEnabled(haptics);
  }, [haptics]);

  const mode = effectiveMode(info, modePreference);
  const engine = effectiveEngine(info, enginePreference);

  /* Keep the OS status bar / theme-color matching the shell palette. */
  useEffect(() => {
    const dark = document.documentElement.dataset.theme === "dark";
    void syncStatusBar(dark ? "dark" : "light", dark ? "#12120f" : "#f7f5ef");
  }, [mode]);

  /* Expose the resolved platform on <html> so CSS can adapt per OS. */
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.nativePlatform = info.platform;
    root.dataset.nativeMode = mode;
    root.dataset.nativeEngine = engine;
    root.dataset.nativeStandalone = info.isStandalone ? "yes" : "no";
    setWco((current) => current || windowControlsOverlayVisible());
  }, [info, mode, engine]);

  /* Mirror preferences to the server so a reinstall restores the same feel. */
  useEffect(() => {
    if (id === "anonymous") return;
    const payload = JSON.stringify({ deviceId: id, engine: enginePreference, mode: modePreference, haptics, platform: info.platform });
    const timer = setTimeout(() => {
      void fetch("/api/app/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload }).catch(
        () => undefined,
      );
    }, 400);
    return () => clearTimeout(timer);
  }, [id, enginePreference, modePreference, haptics, info.platform]);

  const setEnginePreference = useCallback((value: EnginePreference) => {
    setEnginePreferenceState(value);
    try {
      window.localStorage.setItem(STORAGE.engine, value);
    } catch {
      /* ignore */
    }
  }, []);

  const setModePreference = useCallback((value: ModePreference) => {
    setModePreferenceState(value);
    try {
      window.localStorage.setItem(STORAGE.mode, value);
    } catch {
      /* ignore */
    }
  }, []);

  const setHaptics = useCallback((value: boolean) => {
    setHapticsState(value);
    try {
      window.localStorage.setItem(STORAGE.haptics, String(value));
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<NativeContextValue>(
    () => ({
      info,
      mode,
      engine,
      enginePreference,
      modePreference,
      haptics,
      online,
      connectionType,
      wco,
      titlebar,
      deviceId: id,
      setEnginePreference,
      setModePreference,
      setHaptics,
    }),
    [info, mode, engine, enginePreference, modePreference, haptics, online, connectionType, wco, titlebar, id, setEnginePreference, setModePreference, setHaptics],
  );

  return <NativeContext.Provider value={value}>{children}</NativeContext.Provider>;
}

export function useNative(): NativeContextValue {
  const context = useContext(NativeContext);
  if (!context) throw new Error("useNative must be used inside <NativeProvider>");
  return context;
}

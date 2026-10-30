/**
 * Platform resolution for the native shell.
 *
 * The app must *feel* native on each OS, so almost every visual decision keys
 * off this module: Ionic runs in `ios` (Cupertino) or `md` (Material) mode,
 * Framework7 runs in its matching `ios` / `md` theme, and desktop gets a
 * window-chrome layout with the Window Controls Overlay.
 */

export type NativePlatform = "ios" | "android" | "desktop";
/** Visual language. `ios` = Cupertino, `md` = Material Design. */
export type UiMode = "ios" | "md";
export type EnginePreference = "auto" | "ionic" | "framework7";
export type ModePreference = "auto" | "ios" | "md";

export interface PlatformInfo {
  platform: NativePlatform;
  mode: UiMode;
  /** Running inside a Capacitor native container (not just a browser). */
  isNative: boolean;
  /** Installed + launched from the home screen / app list. */
  isStandalone: boolean;
  isTouch: boolean;
  /** Desktop PWA window where we draw our own title bar. */
  hasWindowControlsOverlay: boolean;
}

export const DEFAULT_PLATFORM: PlatformInfo = {
  platform: "desktop",
  mode: "md",
  isNative: false,
  isStandalone: false,
  isTouch: false,
  hasWindowControlsOverlay: false,
};

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}

function capacitorGlobal(): CapacitorGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

/** True when the page is running inside a real Capacitor native WebView. */
export function isCapacitorNative(): boolean {
  const cap = capacitorGlobal();
  return Boolean(cap?.isNativePlatform?.());
}

/** True when launched as an installed app rather than a browser tab. */
export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  const matches = (q: string) => {
    try {
      return window.matchMedia(q).matches;
    } catch {
      return false;
    }
  };
  return (
    iosStandalone ||
    matches("(display-mode: standalone)") ||
    matches("(display-mode: fullscreen)") ||
    matches("(display-mode: minimal-ui)") ||
    matches("(display-mode: window-controls-overlay)")
  );
}

/** Window Controls Overlay is only meaningful in an installed desktop window. */
export function windowControlsOverlayVisible(): boolean {
  if (typeof navigator === "undefined") return false;
  const wco = (navigator as unknown as { windowControlsOverlay?: { visible?: boolean } }).windowControlsOverlay;
  return Boolean(wco?.visible);
}

/**
 * Detects the OS. Capacitor is authoritative when present; otherwise we read
 * the UA/UA-Client-Hints. iPadOS 13+ reports itself as "Macintosh" with touch
 * points, which is handled explicitly.
 */
export function detectPlatform(): NativePlatform {
  if (typeof navigator === "undefined") return "desktop";

  const cap = capacitorGlobal();
  const capPlatform = cap?.getPlatform?.();
  if (capPlatform === "ios") return "ios";
  if (capPlatform === "android") return "android";

  const ua = navigator.userAgent || "";
  const uaData = (navigator as unknown as { userAgentData?: { platform?: string; mobile?: boolean } }).userAgentData;
  const hintPlatform = (uaData?.platform || "").toLowerCase();

  if (hintPlatform === "android" || /Android/i.test(ua)) return "android";
  if (hintPlatform === "ios" || /iPhone|iPod/i.test(ua)) return "ios";
  // iPadOS desktop-mode masquerade.
  if (/iPad/i.test(ua)) return "ios";
  if (/Macintosh/i.test(ua) && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1) {
    return "ios";
  }
  return "desktop";
}

/**
 * Which design language to render. Apple platforms get Cupertino; Android gets
 * Material. Desktop follows the host OS convention: macOS leans Cupertino,
 * Windows/Linux lean Material.
 */
export function modeForPlatform(platform: NativePlatform): UiMode {
  if (platform === "ios") return "ios";
  if (platform === "android") return "md";
  if (typeof navigator === "undefined") return "md";
  const ua = navigator.userAgent || "";
  const uaData = (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData;
  const hint = (uaData?.platform || "").toLowerCase();
  if (hint.includes("mac") || /Mac OS X/i.test(ua)) return "ios";
  return "md";
}

export function resolvePlatform(): PlatformInfo {
  if (typeof window === "undefined") return DEFAULT_PLATFORM;
  const platform = detectPlatform();
  return {
    platform,
    mode: modeForPlatform(platform),
    isNative: isCapacitorNative(),
    isStandalone: isStandaloneDisplay(),
    isTouch: typeof navigator !== "undefined" && navigator.maxTouchPoints > 0,
    hasWindowControlsOverlay: windowControlsOverlayVisible(),
  };
}

/** Applies an explicit user override on top of the auto-detected mode. */
export function effectiveMode(info: PlatformInfo, preference: ModePreference): UiMode {
  return preference === "auto" ? info.mode : preference;
}

/**
 * Default engine per platform. Framework7's page transitions and swipe-back
 * are the closest match to stock iOS, so Apple devices default to it; Android
 * and desktop default to Ionic's Material implementation.
 */
export function defaultEngineFor(platform: NativePlatform): "ionic" | "framework7" {
  return platform === "ios" ? "framework7" : "ionic";
}

export function effectiveEngine(info: PlatformInfo, preference: EnginePreference): "ionic" | "framework7" {
  return preference === "auto" ? defaultEngineFor(info.platform) : preference;
}

/** Stable per-device id used to scope shared items and preferences. */
export function deviceId(): string {
  if (typeof window === "undefined") return "anonymous";
  const KEY = "quilloryn-device-id";
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing) return existing;
    const created =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `dev-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    window.localStorage.setItem(KEY, created);
    return created;
  } catch {
    return "anonymous";
  }
}

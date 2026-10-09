export type OperatingSystem =
  | "android"
  | "ios"
  | "ipados"
  | "macos"
  | "windows"
  | "linux"
  | "chromeos"
  | "unknown";

export type BrowserFamily = "chrome" | "edge" | "safari" | "firefox" | "opera" | "unknown";
export type DeviceKind = "phone" | "tablet" | "desktop";

export interface BatteryState {
  supported: boolean;
  charging: boolean | null;
  level: number | null;
  lowPower: boolean | null;
}

export interface PlatformProfile {
  os: OperatingSystem;
  browser: BrowserFamily;
  device: DeviceKind;
  secureContext: boolean;
  standalone: boolean;
  touch: boolean;
  pointer: "coarse" | "fine" | "unknown";
  reducedMotion: boolean;
  prefersContrast: boolean;
  saveData: boolean;
  online: boolean;
  language: string;
  timezone: string;
  cores: number | null;
  memoryGb: number | null;
  battery: BatteryState;
  capabilities: {
    speechRecognition: boolean;
    onDeviceSpeech: boolean;
    clipboardRead: boolean;
    clipboardWrite: boolean;
    filePicker: boolean;
    share: boolean;
    wakeLock: boolean;
    haptics: boolean;
    offlineCache: boolean;
  };
}

function userAgent(): string {
  return typeof navigator === "undefined" ? "" : navigator.userAgent;
}

function uaData(): { platform?: string; mobile?: boolean } | null {
  if (typeof navigator === "undefined") return null;
  return (navigator as Navigator & { userAgentData?: { platform?: string; mobile?: boolean } }).userAgentData ?? null;
}

export function detectOperatingSystem(ua = userAgent()): OperatingSystem {
  const dataPlatform = uaData()?.platform?.toLowerCase() ?? "";
  const value = `${dataPlatform} ${ua}`.toLowerCase();
  // iPadOS 13+ reports itself as MacIntel while touch-capable.
  if (/ipad/.test(value) || (typeof navigator !== "undefined" && /macintosh/.test(value) && navigator.maxTouchPoints > 1)) return "ipados";
  if (/iphone|ipod/.test(value)) return "ios";
  if (/android/.test(value)) return "android";
  if (/cros/.test(value)) return "chromeos";
  if (/windows/.test(value)) return "windows";
  if (/mac os|macintosh|macintel/.test(value)) return "macos";
  if (/linux|x11/.test(value)) return "linux";
  return "unknown";
}

export function detectBrowser(ua = userAgent()): BrowserFamily {
  const value = ua.toLowerCase();
  if (/edg\//.test(value)) return "edge";
  if (/opr\//.test(value)) return "opera";
  if (/firefox\//.test(value)) return "firefox";
  if (/chrome\//.test(value) || /crios\//.test(value)) return "chrome";
  if (/safari\//.test(value) && !/chrome|crios|android/.test(value)) return "safari";
  return "unknown";
}

function speechCtorPresent(): boolean {
  if (typeof window === "undefined") return false;
  const current = window as unknown as Record<string, unknown>;
  return Boolean(current.SpeechRecognition ?? current.webkitSpeechRecognition);
}

function onDeviceSpeechPresent(): boolean {
  if (typeof window === "undefined") return false;
  const current = window as unknown as Record<string, unknown>;
  const ctor = (current.SpeechRecognition ?? current.webkitSpeechRecognition) as { prototype?: object } | undefined;
  return Boolean(ctor?.prototype && "processLocally" in ctor.prototype);
}

function standaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches === true ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function batteryFallback(): BatteryState {
  return { supported: false, charging: null, level: null, lowPower: null };
}

/** Snapshot browser + OS capabilities without touching a server. */
export function detectPlatformProfile(): PlatformProfile {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      os: "unknown",
      browser: "unknown",
      device: "desktop",
      secureContext: false,
      standalone: false,
      touch: false,
      pointer: "unknown",
      reducedMotion: false,
      prefersContrast: false,
      saveData: false,
      online: true,
      language: "en-US",
      timezone: "UTC",
      cores: null,
      memoryGb: null,
      battery: batteryFallback(),
      capabilities: {
        speechRecognition: false,
        onDeviceSpeech: false,
        clipboardRead: false,
        clipboardWrite: false,
        filePicker: false,
        share: false,
        wakeLock: false,
        haptics: false,
        offlineCache: false,
      },
    };
  }

  const coarse = window.matchMedia?.("(pointer: coarse)").matches === true;
  const touch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
  const dataSaver = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
  const device = coarse && Math.min(window.innerWidth, window.innerHeight) < 600 ? "phone" : touch && Math.min(window.innerWidth, window.innerHeight) < 1000 ? "tablet" : "desktop";

  return {
    os: detectOperatingSystem(),
    browser: detectBrowser(),
    device,
    secureContext: window.isSecureContext,
    standalone: standaloneMode(),
    touch,
    pointer: coarse ? "coarse" : "fine",
    reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true,
    prefersContrast: window.matchMedia?.("(prefers-contrast: more)").matches === true,
    saveData: dataSaver,
    online: navigator.onLine,
    language: navigator.language || "en-US",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    cores: navigator.hardwareConcurrency ?? null,
    memoryGb: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
    battery: batteryFallback(),
    capabilities: {
      speechRecognition: speechCtorPresent(),
      onDeviceSpeech: onDeviceSpeechPresent(),
      clipboardRead: Boolean(navigator.clipboard?.readText),
      clipboardWrite: Boolean(navigator.clipboard?.writeText),
      filePicker: typeof (window as Window & { showOpenFilePicker?: unknown }).showOpenFilePicker === "function",
      share: typeof navigator.share === "function",
      wakeLock: "wakeLock" in navigator,
      haptics: "vibrate" in navigator,
      offlineCache: "serviceWorker" in navigator && "caches" in window,
    },
  };
}

export async function readBatteryState(): Promise<BatteryState> {
  if (typeof navigator === "undefined") return batteryFallback();
  const getBattery = (navigator as Navigator & { getBattery?: () => Promise<{ charging: boolean; level: number }> }).getBattery;
  if (!getBattery) return batteryFallback();
  try {
    const battery = await getBattery.call(navigator);
    const level = Math.round(battery.level * 100) / 100;
    return { supported: true, charging: battery.charging, level, lowPower: !battery.charging && level <= 0.2 };
  } catch {
    return batteryFallback();
  }
}

export function operatingSystemLabel(os: OperatingSystem): string {
  return {
    android: "Android",
    ios: "iOS",
    ipados: "iPadOS",
    macos: "macOS",
    windows: "Windows",
    linux: "Linux",
    chromeos: "ChromeOS",
    unknown: "your device",
  }[os];
}

export function browserLabel(browser: BrowserFamily): string {
  return {
    chrome: "Chrome",
    edge: "Edge",
    safari: "Safari",
    firefox: "Firefox",
    opera: "Opera",
    unknown: "this browser",
  }[browser];
}

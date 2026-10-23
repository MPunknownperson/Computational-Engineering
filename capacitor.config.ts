import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize } from "@capacitor/keyboard";

/**
 * Capacitor configuration.
 *
 * Capacitor wraps this exact web build in a native iOS/Android container, so
 * the same code that runs as a PWA can also ship to the App Store and Play
 * Store with access to system-level APIs the web platform withholds
 * (Taptic Engine, native share sheet, status-bar control, keyboard metrics,
 * background network state).
 *
 * Because the app is deliberately **online-only**, the native container does
 * not bundle a static export. It points at the live origin via `server.url`,
 * which means native builds always run the current server-rendered app and
 * never a stale embedded copy.
 */
const origin = process.env.CAPACITOR_SERVER_URL ?? "https://radix-loom.app";

const config: CapacitorConfig = {
  appId: "app.radixloom.engineering",
  appName: "Radix Loom",
  // Present for CLI compatibility; the live server below takes precedence.
  webDir: "public",
  server: {
    url: `${origin}/app/home`,
    cleartext: false,
    androidScheme: "https",
    iosScheme: "https",
    // Keep in-app navigation inside the web view for the whole origin.
    allowNavigation: [new URL(origin).host],
  },
  ios: {
    // Lets our own chrome draw under the status bar, matching the PWA.
    contentInset: "never",
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
    backgroundColor: "#f7f5ef",
  },
  android: {
    backgroundColor: "#f7f5ef",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: "DEFAULT",
      backgroundColor: "#f7f5ef",
    },
    Keyboard: {
      resize: KeyboardResize.Native,
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 600,
      backgroundColor: "#f7f5ef",
      androidScaleType: "CENTER_CROP",
    },
  },
};

export default config;

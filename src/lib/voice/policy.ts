import type { BrowserFamily, DeviceKind, OperatingSystem } from "@/lib/platform";

/**
 * Automatic voice-processing assignment.
 *
 * There is no user-facing local/cloud choice. The mode is derived from:
 *   1. the country/region rule (legal availability),
 *   2. the device class (mobile prefers on-device, desktop prefers cloud),
 *   3. what the browser and device can actually do.
 *
 * Rules, in order:
 *   - No speech API                       → unavailable
 *   - Region rule "none"                  → unavailable
 *   - Region rule "local-only"            → local if supported, else unavailable
 *   - Region rule "cloud-only"            → cloud if supported, else unavailable
 *   - Mobile (Android, iOS, iPadOS)       → local if supported, else unavailable
 *   - Desktop                             → cloud; if the browser has no cloud
 *                                           service, local; if neither, unavailable
 */

export type RegionRule = "any" | "local-only" | "cloud-only" | "none";
export type ProcessingMode = "local" | "cloud" | "local-model";
export type LocalSupport = "available" | "downloadable" | "downloading" | "unavailable" | "unknown";

export type UnavailableReason = "no-api" | "region" | "no-local" | "no-cloud";

export type VoiceDecision =
  | { available: true; mode: ProcessingMode; prepareLocal: boolean; region: string | null; rule: RegionRule }
  | { available: false; reason: UnavailableReason; region: string | null; rule: RegionRule };

/**
 * Default regional availability. These defaults reflect common constraints on
 * speech services and cross-border audio transfer; operators must review them
 * with counsel and can override any entry with the VOICE_REGION_POLICY
 * environment variable (JSON, e.g. {"DE":"local-only","XX":"none"}).
 */
export const DEFAULT_REGION_RULES: Record<string, RegionRule> = {
  // Hong Kong is a distinct jurisdiction: do not inherit mainland restrictions.
  // Hosting/CDN country headers should supply HK for Hong Kong visitors.
  HK: "any",
  // Mainland China: keep recognition on-device by default.
  CN: "local-only",
  // Personal-data localisation requirements: keep audio on the device.
  RU: "local-only",
  // Comprehensively embargoed jurisdictions where browser speech services are
  // not offered and providing the feature may be prohibited.
  CU: "none",
  IR: "none",
  KP: "none",
  SY: "none",
};

export function normalizeRegion(value: string | null | undefined): string | null {
  if (!value) return null;
  const code = value.trim().toUpperCase();
  // XX/T1/ZZ are "unknown" / Tor markers used by CDNs.
  if (!/^[A-Z]{2}$/.test(code) || code === "XX" || code === "T1" || code === "ZZ") return null;
  return code;
}

export function parseRegionOverrides(raw: string | null | undefined): Record<string, RegionRule> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const result: Record<string, RegionRule> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const region = normalizeRegion(key);
      if (region && (value === "any" || value === "local-only" || value === "cloud-only" || value === "none")) {
        result[region] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function regionRule(region: string | null, overrides: Record<string, RegionRule> = {}): RegionRule {
  if (!region) return "any";
  return overrides[region] ?? DEFAULT_REGION_RULES[region] ?? "any";
}

/** Region from a locale tag such as "en-US" or "zh-Hans-CN"; a weak fallback when no geo signal exists. */
export function regionFromLocale(locale: string | null | undefined): string | null {
  if (!locale) return null;
  const parts = locale.split(/[-_]/).slice(1);
  return normalizeRegion(parts.find((part) => /^[A-Za-z]{2}$/.test(part)) ?? null);
}

export function isMobile(os: OperatingSystem, device: DeviceKind): boolean {
  return os === "android" || os === "ios" || os === "ipados" || device === "phone";
}

export interface PolicyInput {
  speechApi: boolean;
  os: OperatingSystem;
  device: DeviceKind;
  browser: BrowserFamily;
  /** Does the browser provide a server-side recognition service? */
  browserCloud: boolean;
  /** On-device recognition state for the recognition language. */
  local: LocalSupport;
  /** Can the page run a small model itself (WebGPU/WebAssembly)? */
  canRunLocalModel?: boolean;
  region: string | null;
  overrides?: Record<string, RegionRule>;
}

function localUsable(local: LocalSupport): boolean {
  return local === "available" || local === "downloadable" || local === "downloading" || local === "unknown";
}

export function decideVoiceProcessing(input: PolicyInput): VoiceDecision {
  const region = input.region;
  const rule = regionRule(region, input.overrides);
  if (rule === "none") return { available: false, reason: "region", region, rule };

  // No browser engine: the page can still run a model itself, unless the
  // region forbids that or the runtime is too weak.
  if (!input.speechApi) {
    if (rule === "cloud-only") return { available: false, reason: "no-cloud", region, rule };
    if (input.canRunLocalModel) {
      return { available: true, mode: "local-model", prepareLocal: true, region, rule };
    }
    return { available: false, reason: "no-api", region, rule };
  }

  const canLocal = localUsable(input.local);
  const canCloud = input.browserCloud;
  const local = (): VoiceDecision => ({
    available: true,
    mode: "local",
    prepareLocal: input.local === "downloadable" || input.local === "downloading",
    region,
    rule,
  });
  const cloud = (): VoiceDecision => ({ available: true, mode: "cloud", prepareLocal: false, region, rule });

  const model = (): VoiceDecision =>
    input.canRunLocalModel
      ? { available: true, mode: "local-model", prepareLocal: true, region, rule }
      : { available: false, reason: "no-cloud", region, rule };

  if (rule === "local-only") {
    if (canLocal) return local();
    return input.canRunLocalModel
      ? { available: true, mode: "local-model", prepareLocal: true, region, rule }
      : { available: false, reason: "no-local", region, rule };
  }
  if (rule === "cloud-only") return canCloud ? cloud() : { available: false, reason: "no-cloud", region, rule };

  if (isMobile(input.os, input.device)) {
    if (canLocal) return local();
    return input.canRunLocalModel
      ? { available: true, mode: "local-model", prepareLocal: true, region, rule }
      : { available: false, reason: "no-local", region, rule };
  }
  if (canCloud) return cloud();
  if (canLocal) return local();
  return model();
}

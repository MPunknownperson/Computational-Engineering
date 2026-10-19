import { speechBrowserAllowed, type BrowserFamily, type DeviceKind, type OperatingSystem } from "@/lib/platform";

/**
 * Browser-managed Web Speech API recognition is preferred. When the browser
 * has no usable speech service, a self-hosted sherpa-onnx WebAssembly
 * recogniser ("wasm") runs fully on-device as the fallback.
 */
export type RegionRule = "any" | "local-only" | "cloud-only" | "none";
export type ProcessingMode = "local" | "cloud" | "wasm";
export type LocalSupport = "available" | "downloadable" | "downloading" | "unavailable" | "unknown";
export type UnavailableReason = "no-api" | "browser" | "location" | "region" | "no-local" | "no-cloud";
export type VoiceDecision =
  | { available: true; mode: ProcessingMode; prepareLocal: boolean; region: string | null; rule: RegionRule }
  | { available: false; reason: UnavailableReason; region: string | null; rule: RegionRule };

/** Operator policy, not a claim that a country universally prohibits speech input. */
export const DEFAULT_REGION_RULES: Record<string, RegionRule> = {
  HK: "any", CN: "local-only", RU: "local-only",
  CU: "none", IR: "none", KP: "none", SY: "none",
};

export function normalizeRegion(value: string | null | undefined): string | null {
  const code = value?.trim().toUpperCase();
  return code && /^[A-Z]{2}$/.test(code) && !["XX", "T1", "ZZ", "EU"].includes(code) ? code : null;
}

export function parseRegionOverrides(raw: string | null | undefined): Record<string, RegionRule> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const result: Record<string, RegionRule> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const region = key.trim() === "*" ? "*" : normalizeRegion(key);
      if (region && ["any", "local-only", "cloud-only", "none"].includes(String(value))) result[region] = value as RegionRule;
    }
    return result;
  } catch { return {}; }
}

/**
 * Operator rules only restrict specific countries. When the country could not
 * be determined the default rule applies: voice stays available. Recognition
 * is performed by the visitor's own browser (or an on-device model), so an
 * unknown location is never a reason to withhold the feature.
 */
export function regionRule(region: string | null, overrides: Record<string, RegionRule> = {}): RegionRule {
  const code = normalizeRegion(region);
  if (!code) return overrides["*"] ?? "any";
  return overrides[code] ?? DEFAULT_REGION_RULES[code] ?? "any";
}

export function isMobile(os: OperatingSystem, device: DeviceKind): boolean {
  return ["android", "ios", "ipados"].includes(os) || device === "phone" || device === "tablet";
}

export interface PolicyInput {
  speechApi: boolean;
  os: OperatingSystem;
  device: DeviceKind;
  browser: BrowserFamily;
  browserCloud: boolean;
  local: LocalSupport;
  region: string | null;
  overrides?: Record<string, RegionRule>;
  /** The sherpa-onnx WebAssembly fallback can run in this browser. */
  wasm?: boolean;
}

export function decideVoiceProcessing(input: PolicyInput): VoiceDecision {
  const region = normalizeRegion(input.region);
  const rule = regionRule(region, input.overrides);
  if (rule === "none") return { available: false, reason: "region", region, rule };
  // sherpa-onnx WASM is on-device processing, so it satisfies "local-only" and
  // "any" but is never offered where the operator mandates a cloud service.
  const wasm = (): VoiceDecision => ({ available: true, mode: "wasm", prepareLocal: true, region, rule });
  const wasmAllowed = !!input.wasm && rule !== "cloud-only";
  if (!speechBrowserAllowed(input.os, input.browser)) return wasmAllowed ? wasm() : { available: false, reason: "browser", region, rule };
  if (!input.speechApi) return wasmAllowed ? wasm() : { available: false, reason: "no-api", region, rule };

  const canLocal = ["available", "downloadable", "downloading"].includes(input.local);
  const local = (): VoiceDecision => ({
    available: true, mode: "local", prepareLocal: input.local !== "available", region, rule,
  });
  const cloud = (): VoiceDecision => ({ available: true, mode: "cloud", prepareLocal: false, region, rule });

  if (rule === "local-only") return canLocal ? local() : wasmAllowed ? wasm() : { available: false, reason: "no-local", region, rule };
  if (rule === "cloud-only") return input.browserCloud ? cloud() : { available: false, reason: "no-cloud", region, rule };
  if (isMobile(input.os, input.device) && canLocal) return local();
  if (input.browserCloud) return cloud();
  if (canLocal) return local();
  if (wasmAllowed) return wasm();
  return { available: false, reason: "no-cloud", region, rule };
}

import { speechBrowserAllowed, type BrowserFamily, type DeviceKind, type OperatingSystem } from "@/lib/platform";

/** Only browser-managed Web Speech API recognition is supported. */
export type RegionRule = "any" | "local-only" | "cloud-only" | "none";
export type ProcessingMode = "local" | "cloud";
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
      const region = normalizeRegion(key);
      if (region && ["any", "local-only", "cloud-only", "none"].includes(String(value))) result[region] = value as RegionRule;
    }
    return result;
  } catch { return {}; }
}

export function regionRule(region: string | null, overrides: Record<string, RegionRule> = {}): RegionRule {
  // No locale or user selection can unlock a service for an unknown location.
  if (!normalizeRegion(region)) return "none";
  return overrides[region!] ?? DEFAULT_REGION_RULES[region!] ?? "any";
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
}

export function decideVoiceProcessing(input: PolicyInput): VoiceDecision {
  const region = normalizeRegion(input.region);
  const rule = regionRule(region, input.overrides);
  if (!region) return { available: false, reason: "location", region, rule };
  if (rule === "none") return { available: false, reason: "region", region, rule };
  if (!speechBrowserAllowed(input.os, input.browser)) return { available: false, reason: "browser", region, rule };
  if (!input.speechApi) return { available: false, reason: "no-api", region, rule };

  const canLocal = ["available", "downloadable", "downloading"].includes(input.local);
  const local = (): VoiceDecision => ({
    available: true, mode: "local", prepareLocal: input.local !== "available", region, rule,
  });
  const cloud = (): VoiceDecision => ({ available: true, mode: "cloud", prepareLocal: false, region, rule });

  if (rule === "local-only") return canLocal ? local() : { available: false, reason: "no-local", region, rule };
  if (rule === "cloud-only") return input.browserCloud ? cloud() : { available: false, reason: "no-cloud", region, rule };
  if (isMobile(input.os, input.device) && canLocal) return local();
  if (input.browserCloud) return cloud();
  if (canLocal) return local();
  return { available: false, reason: "no-cloud", region, rule };
}

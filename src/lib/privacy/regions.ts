/** Public routing metadata only. The regional policy text stays server-side. */
export const PRIVACY_REGIONS = [
  { slug: "brazil", country: "BR", name: "Brazil", law: "LGPD" },
  { slug: "canada", country: "CA", name: "Canada", law: "PIPEDA and applicable provincial laws" },
  { slug: "australia", country: "AU", name: "Australia", law: "Privacy Act and Australian Privacy Principles" },
  { slug: "singapore", country: "SG", name: "Singapore", law: "PDPA" },
  { slug: "japan", country: "JP", name: "Japan", law: "APPI" },
  { slug: "india", country: "IN", name: "India", law: "DPDP framework and applicable privacy rules" },
] as const;

export type PrivacyRegion = (typeof PRIVACY_REGIONS)[number];
export type PrivacyRegionSlug = PrivacyRegion["slug"];
export const REGIONAL_PRIVACY_PREFIX = "/privacy/regions/";

export function privacyRegion(slug: string): PrivacyRegion | undefined {
  return PRIVACY_REGIONS.find((region) => region.slug === slug);
}

export function regionForCountry(country: string | null): PrivacyRegion | undefined {
  return PRIVACY_REGIONS.find((region) => region.country === country);
}

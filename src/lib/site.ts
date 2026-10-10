// Shared public identity and discovery-content metadata.
export const SITE = {
  name: "Radix Loom",
  tagline: "A little clarity in every calculation",
  // Keyword-led and intent-aligned: this is the home-page snippet, so it leads
  // with the phrases people actually type rather than the brand name.
  description:
    "Free online calculator and unit converter. Solve scientific expressions, convert length, weight, temperature and data, and write your own formulas — no sign-up.",
  legalUpdated: "9 October 2026",
  legalVersion: "6.0",
  contentUpdated: "2026-10-07",
  storageKeys: [{ key: "radixloom.workspace" }] as const,
  legacyStorageKeys: [
    "arithbit.workspace", "sumbyte.workspace", "abacorn.workspace", "numble.workspace",
    "numeriq.workspace", "calcite.workspace", "axiom.workspace",
  ] as const,
} as const;

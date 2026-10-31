// Shared public identity and discovery-content metadata.
export const SITE = {
  name: "Quilloryn",
  url: "https://quilloryn.com",
  domain: "quilloryn.com",
  tagline: "Calculators and converters, without the clutter",
  // Keyword-led and intent-aligned: this is the home-page snippet, so it leads
  // with the phrases people actually type rather than the brand name.
  description:
    "Scientific calculator, unit converter, exchange rates and custom formulas. Free, no sign-up.",
  legalUpdated: "16 October 2026",
  legalVersion: "8.1",
  contentUpdated: "2026-10-07",
  storageKeys: [{ key: "quilloryn.workspace" }] as const,
  legacyStorageKeys: [
    "radixloom.workspace", "arithbit.workspace", "sumbyte.workspace", "abacorn.workspace", "numble.workspace",
    "numeriq.workspace", "calcite.workspace", "axiom.workspace",
  ] as const,
} as const;

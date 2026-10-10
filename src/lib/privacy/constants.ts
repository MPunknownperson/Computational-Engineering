export const PRIVACY_CHOICES_PATH = "/do-not-sell-or-share";
export const PRIVACY_CHOICE_COOKIE = "radixloom.privacy-choice";
export const PRIVACY_OPTOUT_COOKIE = "radixloom.optout";
export const PRIVACY_COOKIE_SECONDS = 365 * 24 * 60 * 60;

export interface PrivacyChoiceStatus {
  optedOut: boolean;
  stored: boolean;
  globalPrivacyControl: boolean;
  source: "manual" | "gpc" | "browser" | null;
  updatedAt: string | null;
  saleOrSharingEnabled: false;
}

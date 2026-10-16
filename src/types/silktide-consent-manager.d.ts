/** Minimal typings for the self-hosted Silktide Consent Manager v2.0 global. */
interface SilktideConsentType {
  id: string;
  label: string;
  description: string;
  required?: boolean;
  defaultValue?: boolean;
  gtag?: string | string[];
  scripts?: Array<{ url: string; load?: "async" | "defer"; type?: string; crossorigin?: string; integrity?: string }>;
  onAccept?: () => void;
  onReject?: () => void;
}

interface SilktideConsentConfig {
  consentTypes: SilktideConsentType[];
  eventName?: string;
  namespace?: string;
  debug?: boolean;
  autoShow?: boolean;
  text?: {
    prompt?: {
      description?: string;
      acceptAllButtonText?: string;
      acceptAllButtonAccessibleLabel?: string;
      rejectNonEssentialButtonText?: string;
      rejectNonEssentialButtonAccessibleLabel?: string;
      preferencesButtonText?: string;
      preferencesButtonAccessibleLabel?: string;
    };
    preferences?: {
      title?: string;
      description?: string;
      saveButtonText?: string;
      saveButtonAccessibleLabel?: string;
      rejectNonEssentialButtonText?: string;
      rejectNonEssentialButtonAccessibleLabel?: string;
      creditLinkText?: string;
      creditLinkAccessibleLabel?: string;
    };
  };
  prompt?: { position?: "center" | "bottomLeft" | "bottomCenter" | "bottomRight" };
  icon?: { position?: "bottomLeft" | "bottomRight" };
  backdrop?: { show?: boolean };
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
  onPromptOpen?: () => void;
  onPromptClose?: () => void;
  onPreferencesOpen?: () => void;
  onPreferencesClose?: () => void;
  onBackdropOpen?: () => void;
  onBackdropClose?: () => void;
}

interface SilktideConsentInstance {
  config: SilktideConsentConfig;
  toggleModal(show: boolean): void;
  getConsentChoice(typeId: string): boolean | null;
  getHasConsented(): boolean;
  clearAllConsents(): void;
  destroy(): void;
}

interface SilktideConsentManagerApi {
  init(config: SilktideConsentConfig): void;
  update(partial: Partial<SilktideConsentConfig>): void;
  getInstance(): SilktideConsentInstance | null | undefined;
  resetConsent(): void;
}

interface Window {
  silktideConsentManager?: SilktideConsentManagerApi;
}

interface Navigator {
  globalPrivacyControl?: boolean;
}

import type { ConsentRegime } from "@/lib/privacy/consent-regime";
import { PRIVACY_CHOICES_PATH } from "@/lib/privacy/constants";
import { SITE } from "@/lib/site";

interface BuildOptions {
  regime: Exclude<ConsentRegime, "standard">;
  globalPrivacyControl: boolean;
  onOptOut: () => void;
}

const ESSENTIAL_DESCRIPTION =
  "<p>Needed for the site to work: security, load balancing, your privacy choices and this consent record (kept in your browser's local storage, not in a cookie). They cannot be switched off.</p>";
const FUNCTIONAL_DESCRIPTION =
  "<p>Remember settings you choose, such as light or dark appearance, your calculator workspace and saved formulas. Everything stays on this device.</p>";
const ANALYTICS_DESCRIPTION =
  "<p>Would help us understand which tools and guides are useful. We do not currently load any analytics; if we ever introduce it, it will only run when this is on.</p>";
const ADVERTISING_GDPR_DESCRIPTION =
  "<p>Would allow third parties to build an advertising profile. We do not use advertising cookies. Nothing is set unless you switch this on, and it is off by default.</p>";
const ADVERTISING_CCPA_DESCRIPTION =
  "<p>Cookies or identifiers that could count as a <em>sale</em> or <em>sharing</em> for cross-context behavioral advertising under California law. We do not sell or share personal information today. Turning this off records a Do Not Sell or Share opt-out for this browser.</p>";

/**
 * Jurisdiction-specific Silktide configuration.
 * GDPR: opt-in, equal-prominence accept / reject, granular consent, withdrawal.
 * CCPA/CPRA: notice at collection, opt-out of sale/sharing, GPC honoured.
 */
export function buildSilktideConfig({ regime, globalPrivacyControl, onOptOut }: BuildOptions): SilktideConsentConfig {
  const common = {
    namespace: `radixloom-${regime}`,
    eventName: "stcm_consent_update",
    icon: { position: "bottomLeft" as const },
    backdrop: { show: regime === "gdpr" },
    prompt: { position: regime === "gdpr" ? ("bottomCenter" as const) : ("bottomRight" as const) },
  };

  if (regime === "gdpr") {
    return {
      ...common,
      consentTypes: [
        { id: "essential", label: "Strictly necessary", description: ESSENTIAL_DESCRIPTION, required: true },
        { id: "functional", label: "Functional preferences", description: FUNCTIONAL_DESCRIPTION, defaultValue: false },
        { id: "analytics", label: "Analytics", description: ANALYTICS_DESCRIPTION, defaultValue: false, gtag: "analytics_storage" },
        { id: "advertising", label: "Advertising", description: ADVERTISING_GDPR_DESCRIPTION, defaultValue: false, gtag: ["ad_storage", "ad_user_data", "ad_personalization"] },
      ],
      text: {
        prompt: {
          description:
            `<p><strong>Your privacy choices (GDPR / UK GDPR).</strong> ${SITE.name} uses strictly necessary storage to run the site. ` +
            `With your consent we may also remember your preferences; we do not run analytics or advertising cookies today. ` +
            `Rejecting is as easy as accepting, and you can withdraw consent at any time from <em>Cookie settings</em> in the footer. ` +
            `Read our <a href="/privacy#gdpr">Privacy Policy</a> for the legal basis, retention periods and your rights.</p>`,
          acceptAllButtonText: "Accept all",
          acceptAllButtonAccessibleLabel: "Accept all cookies and similar storage",
          rejectNonEssentialButtonText: "Reject non-essential",
          rejectNonEssentialButtonAccessibleLabel: "Reject all non-essential cookies and similar storage",
          preferencesButtonText: "Manage preferences",
          preferencesButtonAccessibleLabel: "Open cookie preferences",
        },
        preferences: {
          title: "Cookie preferences",
          description:
            `<p>Under the GDPR we need your prior consent before using any non-essential cookies or local storage. ` +
            `Each category below is off until you turn it on. Your choice is stored only in this browser, applies across ${SITE.name}, ` +
            `and can be changed or withdrawn whenever you like.</p>`,
          saveButtonText: "Save my choices",
          saveButtonAccessibleLabel: "Save cookie preferences and close",
          rejectNonEssentialButtonText: "Reject non-essential",
          rejectNonEssentialButtonAccessibleLabel: "Reject all non-essential cookies",
          creditLinkText: "Consent tool by Silktide",
          creditLinkAccessibleLabel: "Silktide Consent Manager, open source",
        },
      },
    };
  }

  // California (CCPA / CPRA): opt-out model.
  const defaultOn = !globalPrivacyControl;
  return {
    ...common,
    consentTypes: [
      { id: "essential", label: "Strictly necessary", description: ESSENTIAL_DESCRIPTION, required: true },
      { id: "functional", label: "Functional preferences", description: FUNCTIONAL_DESCRIPTION, defaultValue: defaultOn },
      { id: "analytics", label: "Analytics", description: ANALYTICS_DESCRIPTION, defaultValue: defaultOn, gtag: "analytics_storage" },
      {
        id: "sale-sharing",
        label: "Sale or sharing for targeted advertising",
        description: ADVERTISING_CCPA_DESCRIPTION,
        defaultValue: defaultOn,
        gtag: ["ad_storage", "ad_user_data", "ad_personalization"],
        onReject: onOptOut,
      },
    ],
    text: {
      prompt: {
        description:
          `<p><strong>Notice at collection (California CCPA/CPRA).</strong> ${SITE.name} collects limited device and usage information to run the site and remember your settings. ` +
          `We do not sell or share personal information, and we honor Global Privacy Control${globalPrivacyControl ? " — your browser's GPC signal has been detected and applied" : ""}. ` +
          `You may still record an opt-out at any time. See <a href="/privacy#ccpa">Privacy Policy</a> and ` +
          `<a href="${PRIVACY_CHOICES_PATH}">Do Not Sell or Share My Personal Information</a>.</p>`,
        acceptAllButtonText: "OK",
        acceptAllButtonAccessibleLabel: "Acknowledge the notice and keep current settings",
        rejectNonEssentialButtonText: "Do Not Sell or Share My Personal Information",
        rejectNonEssentialButtonAccessibleLabel: "Opt out of sale or sharing of personal information",
        preferencesButtonText: "Privacy settings",
        preferencesButtonAccessibleLabel: "Open privacy settings",
      },
      preferences: {
        title: "Your California privacy choices",
        description:
          `<p>California residents can opt out of the sale or sharing of personal information and limit the use of sensitive personal information. ` +
          `Switch a category off to opt out; no account, verification or email is required. ` +
          `Your choice is kept in this browser and, for sale/sharing, also recorded on our server so it persists. ` +
          `You can also use the <a href="${PRIVACY_CHOICES_PATH}">dedicated opt-out page</a> or send a Global Privacy Control signal.</p>`,
        saveButtonText: "Save choices",
        saveButtonAccessibleLabel: "Save privacy choices and close",
        rejectNonEssentialButtonText: "Opt out of all",
        rejectNonEssentialButtonAccessibleLabel: "Opt out of all non-essential categories",
        creditLinkText: "Consent tool by Silktide",
        creditLinkAccessibleLabel: "Silktide Consent Manager, open source",
      },
    },
  };
}

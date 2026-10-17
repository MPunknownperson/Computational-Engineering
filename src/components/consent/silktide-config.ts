import type { ConsentRegime, ManagedConsentRegime } from "@/lib/privacy/consent-regime";
import { consentNamespace } from "@/lib/privacy/browser-consent";
import { PRIVACY_CHOICES_PATH } from "@/lib/privacy/constants";
import { SITE } from "@/lib/site";

interface BuildOptions {
  regime: ConsentRegime;
  globalPrivacyControl: boolean;
  onOptOut: () => void;
}

const ESSENTIAL_DESCRIPTION =
  "<p>Needed for the site to work: security, load balancing, your privacy choices and this consent record (kept in your browser's local storage, not in a cookie). They cannot be switched off.</p>";
const FUNCTIONAL_DESCRIPTION =
  "<p>Remember appearance, blackboard notes, voice follow-ups and on-device learning. This also enables a browser reference for formulas that you explicitly save to our server. With this off, calculations still work, but saved state, learning and formula saving are unavailable. Existing data can be managed on the Privacy Policy page.</p>";
const ANALYTICS_DESCRIPTION =
  "<p>Would help us understand which tools and guides are useful. We do not currently load any analytics; if we ever introduce it, it will only run when this is on.</p>";
const ADVERTISING_GDPR_DESCRIPTION =
  "<p>Would allow third parties to build an advertising profile. We do not use advertising cookies. Nothing is set unless you switch this on, and it is off by default.</p>";
const ADVERTISING_CCPA_DESCRIPTION =
  "<p>Cookies or identifiers that could count as a <em>sale</em> or <em>sharing</em> for cross-context behavioral advertising under California law. We do not sell or share personal information today. Turning this off records a Do Not Sell or Share opt-out for this browser.</p>";

type RegionalRegime = Exclude<ManagedConsentRegime, "gdpr" | "ccpa">;

/** Preserve the regional prompt positions without blocking ordinary browsing. */
const OPT_IN_REGIMES = new Set<ManagedConsentRegime>(["gdpr", "lgpd", "pipeda", "dpdp"]);

interface RegionalCopy {
  law: string;
  authority: string;
  policyAnchor: string;
  optIn: boolean;
  /** Whether a dedicated "third-party provision / sale" toggle is shown. */
  thirdPartyToggle: boolean;
  promptTitle: string;
  promptBody: string;
  preferencesTitle: string;
  preferencesBody: string;
  acceptText: string;
  rejectText: string;
  preferencesButton: string;
  advertisingLabel: string;
  advertisingDescription: string;
  withdrawNote: string;
}

const REGIONAL: Record<RegionalRegime, RegionalCopy> = {
  lgpd: {
    law: "LGPD (Lei Geral de Proteção de Dados)",
    authority: "ANPD",
    policyAnchor: "international-rights",
    optIn: true,
    thirdPartyToggle: false,
    promptTitle: "Your privacy choices (Brazil — LGPD)",
    promptBody: "uses strictly necessary storage to run the site. Under the LGPD, any optional cookie or local-storage use requires your free, informed and unambiguous consent for a specific purpose. Nothing optional is set until you choose.",
    preferencesTitle: "Cookie preferences — LGPD",
    preferencesBody: "Each category lists its purpose. Consent is given per purpose and can be revoked at any time, free of charge; revoking it does not affect the lawfulness of prior processing. You may also contact us to exercise your rights of confirmation, access, correction, anonymisation, portability and deletion, or lodge a complaint with the ANPD.",
    acceptText: "Aceitar tudo / Accept all",
    rejectText: "Recusar opcionais / Reject optional",
    preferencesButton: "Gerenciar / Manage",
    advertisingLabel: "Advertising (publicidade)",
    advertisingDescription: "<p>Would allow advertising identifiers or profiling. We do not use advertising cookies today; this stays off unless you turn it on.</p>",
    withdrawNote: "You can revoke consent at any time from <em>Cookie settings</em> in the footer.",
  },
  pipeda: {
    law: "PIPEDA and Quebec Law 25",
    authority: "Office of the Privacy Commissioner of Canada",
    policyAnchor: "international-rights",
    optIn: true,
    thirdPartyToggle: false,
    promptTitle: "Your privacy choices (Canada — PIPEDA / Law 25)",
    promptBody: "uses strictly necessary storage to run the site. Canadian law requires meaningful consent, and Quebec's Law 25 requires that any technology which identifies, locates or profiles you is off by default until you activate it. Optional categories are therefore off until you choose.",
    preferencesTitle: "Cookie preferences — Canada",
    preferencesBody: "Turn on only the purposes you agree to. Your choice is kept in this browser and can be withdrawn whenever you like. You may contact us to access or correct your personal information, or complain to the Office of the Privacy Commissioner of Canada or the Commission d'accès à l'information du Québec.",
    acceptText: "Accept all / Tout accepter",
    rejectText: "Reject optional / Refuser",
    preferencesButton: "Manage / Gérer",
    advertisingLabel: "Advertising and profiling",
    advertisingDescription: "<p>Would allow identifying, locating or profiling technologies for advertising. We do not use them today; this remains deactivated unless you activate it (Law 25, s. 8.1).</p>",
    withdrawNote: "You can withdraw consent at any time from <em>Cookie settings</em> in the footer.",
  },
  au: {
    law: "Privacy Act 1988 (Australian Privacy Principles)",
    authority: "OAIC",
    policyAnchor: "international-rights",
    optIn: false,
    thirdPartyToggle: false,
    promptTitle: "Privacy notice (Australia — APPs)",
    promptBody: "collects limited device and usage information to run the site and remember your settings. In line with APP 1 and APP 5 this notice explains what is collected and why; you can limit optional categories at any time and we do not use advertising cookies today.",
    preferencesTitle: "Cookie settings — Australia",
    preferencesBody: "Switch off any optional category you prefer not to use. Your choice is stored in this browser. You may contact us to access or correct personal information (APP 12 and 13), or complain to the Office of the Australian Information Commissioner.",
    acceptText: "Accept optional",
    rejectText: "Essential only",
    preferencesButton: "Cookie settings",
    advertisingLabel: "Advertising",
    advertisingDescription: "<p>Would allow advertising identifiers. We do not use advertising cookies today. Switch this off to make sure none are ever set in this browser.</p>",
    withdrawNote: "Change your choice at any time from <em>Cookie settings</em> in the footer.",
  },
  pdpa: {
    law: "PDPA (Personal Data Protection Act 2012)",
    authority: "PDPC",
    policyAnchor: "international-rights",
    optIn: false,
    thirdPartyToggle: false,
    promptTitle: "Privacy notice (Singapore — PDPA)",
    promptBody: "collects limited device and usage information to run the site and remember your settings. Under the PDPA we notify you of each purpose and rely on consent for optional categories; you may withdraw consent for any purpose with reasonable notice.",
    preferencesTitle: "Cookie settings — Singapore",
    preferencesBody: "Each category states its purpose. Switch off any purpose you do not consent to; your choice is stored in this browser. You may contact us to access or correct personal data, or raise a concern with the Personal Data Protection Commission.",
    acceptText: "Accept optional",
    rejectText: "Essential only",
    preferencesButton: "Cookie settings",
    advertisingLabel: "Advertising",
    advertisingDescription: "<p>Would allow advertising identifiers for a marketing purpose. We do not use advertising cookies today. Switch this off to withdraw consent for that purpose.</p>",
    withdrawNote: "Withdraw consent at any time from <em>Cookie settings</em> in the footer.",
  },
  appi: {
    law: "APPI (Act on the Protection of Personal Information)",
    authority: "Personal Information Protection Commission (PPC)",
    policyAnchor: "international-rights",
    optIn: false,
    thirdPartyToggle: true,
    promptTitle: "Privacy notice (Japan — APPI)",
    promptBody: "collects limited device and usage information to run the site and remember your settings. Under the amended APPI, providing personally referable information such as advertising identifiers to third parties requires your prior consent, so that category is off until you turn it on.",
    preferencesTitle: "Cookie settings — Japan (個人情報保護法)",
    preferencesBody: "Each category states its purpose of use. Third-party provision of personally referable information stays off unless you consent. You may contact us for disclosure, correction or suspension of use, or consult the Personal Information Protection Commission.",
    acceptText: "同意する / Agree",
    rejectText: "必要なもののみ / Essential only",
    preferencesButton: "設定 / Settings",
    advertisingLabel: "Third-party provision (advertising identifiers)",
    advertisingDescription: "<p>Would allow personally referable information (cookies, advertising IDs) to be provided to third parties. Off by default as required by the APPI; we do not use advertising cookies today.</p>",
    withdrawNote: "Change your choice at any time from <em>Cookie settings</em> in the footer.",
  },
  dpdp: {
    law: "Digital Personal Data Protection Act 2023",
    authority: "Data Protection Board of India",
    policyAnchor: "international-rights",
    optIn: true,
    thirdPartyToggle: false,
    promptTitle: "Your privacy choices (India — DPDP Act)",
    promptBody: "uses strictly necessary storage to run the site. Under the DPDP Act, optional processing needs your free, specific, informed, unconditional and unambiguous consent through a clear affirmative action, so optional categories are off until you choose.",
    preferencesTitle: "Consent preferences — DPDP Act",
    preferencesBody: "Each category explains the specified purpose. Withdrawing consent is as easy as giving it and takes effect in this browser immediately. You may contact us to access, correct or erase personal data or to nominate someone to act for you, and may approach the Data Protection Board of India.",
    acceptText: "Accept all / सभी स्वीकार करें",
    rejectText: "Reject optional / अस्वीकार करें",
    preferencesButton: "Manage / प्रबंधित करें",
    advertisingLabel: "Advertising",
    advertisingDescription: "<p>Would allow advertising identifiers. We do not use advertising cookies today; nothing is set unless you give consent, and you can withdraw it at any time.</p>",
    withdrawNote: "Withdraw consent at any time from <em>Cookie settings</em> in the footer.",
  },
};

function buildRegional(
  regime: RegionalRegime,
  common: Pick<SilktideConsentConfig, "namespace" | "eventName" | "icon" | "backdrop" | "prompt">,
  onOptOut: () => void,
): SilktideConsentConfig {
  const copy = REGIONAL[regime];
  const defaultOn = false;
  return {
    ...common,
    consentTypes: [
      { id: "essential", label: "Strictly necessary", description: ESSENTIAL_DESCRIPTION, required: true },
      { id: "functional", label: "Functional preferences", description: FUNCTIONAL_DESCRIPTION, defaultValue: defaultOn },
      { id: "analytics", label: "Analytics", description: ANALYTICS_DESCRIPTION, defaultValue: defaultOn, gtag: "analytics_storage" },
      {
        id: copy.thirdPartyToggle ? "third-party-provision" : "advertising",
        label: copy.advertisingLabel,
        description: copy.advertisingDescription,
        defaultValue: false,
        gtag: ["ad_storage", "ad_user_data", "ad_personalization"],
        onReject: onOptOut,
      },
    ],
    text: {
      prompt: {
        description:
          `<p><strong>${copy.promptTitle}.</strong> ${SITE.name} ${copy.promptBody} ` +
          `${copy.withdrawNote} Read our <a href="/privacy#${copy.policyAnchor}">Privacy Policy</a> for details under the ${copy.law}.</p>`,
        acceptAllButtonText: copy.acceptText,
        acceptAllButtonAccessibleLabel: "Accept all optional cookies and similar storage",
        rejectNonEssentialButtonText: copy.rejectText,
        rejectNonEssentialButtonAccessibleLabel: "Reject all optional cookies and similar storage",
        preferencesButtonText: copy.preferencesButton,
        preferencesButtonAccessibleLabel: "Open cookie settings",
      },
      preferences: {
        title: copy.preferencesTitle,
        description: `<p>${copy.preferencesBody}</p>`,
        saveButtonText: "Save choices",
        saveButtonAccessibleLabel: "Save cookie settings and close",
        rejectNonEssentialButtonText: copy.rejectText,
        rejectNonEssentialButtonAccessibleLabel: "Reject all optional categories",
        creditLinkText: "Consent tool by Silktide",
        creditLinkAccessibleLabel: "Silktide Consent Manager, open source",
      },
    },
  };
}

/**
 * Jurisdiction-specific Silktide configuration.
 * GDPR: opt-in, equal-prominence accept / reject, granular consent, withdrawal.
 * CCPA/CPRA: notice at collection, opt-out of sale/sharing, GPC honoured.
 */
function buildManagedConfig({ regime, globalPrivacyControl, onOptOut }: BuildOptions & { regime: ManagedConsentRegime }): SilktideConsentConfig {
  const common = {
    namespace: consentNamespace(regime),
    eventName: "stcm_consent_update",
    icon: { position: "bottomLeft" as const },
    backdrop: { show: false },
    prompt: { position: OPT_IN_REGIMES.has(regime) ? ("bottomCenter" as const) : ("bottomRight" as const) },
  };

  if (regime in REGIONAL) {
    return buildRegional(regime as RegionalRegime, common, onOptOut);
  }

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
          rejectNonEssentialButtonAccessibleLabel: "Reject non-essential cookies and similar storage",
          preferencesButtonText: "Manage preferences",
          preferencesButtonAccessibleLabel: "Manage preferences — open cookie preferences",
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

  // The site requires an explicit choice for optional purposes in California too.
  const defaultOn = false;
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
        acceptAllButtonText: "Accept optional",
        acceptAllButtonAccessibleLabel: "Accept optional cookies and similar storage",
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


const CHOICE_NOTICE =
  "<p><strong>A selection is required before optional cookies or similar storage can support services and tools.</strong> Your choices affect data collection, processing, remembered preferences and the availability of related features. This notice stays available until you accept, reject or save a selection. If you continue browsing without choosing, the defaults for this notice apply: strictly necessary storage only; optional purposes stay off. Browsing is not consent. Basic calculations remain available.</p>";

function buildBaseSilktideConfig(options: BuildOptions): SilktideConsentConfig {
  if (options.regime === "standard") {
    // Do not replace or auto-open over the existing informational notice.
    return {
      namespace: consentNamespace("standard"),
      autoShow: false,
      backdrop: { show: false },
      icon: { position: "bottomLeft" },
      consentTypes: [
        { id: "essential", label: "Strictly necessary", description: ESSENTIAL_DESCRIPTION, required: true },
        { id: "functional", label: "Functional preferences", description: FUNCTIONAL_DESCRIPTION, defaultValue: true },
        { id: "analytics", label: "Analytics", description: ANALYTICS_DESCRIPTION, defaultValue: true, gtag: "analytics_storage" },
        { id: "advertising", label: "Advertising", description: "<p>Controls whether advertising cookies or identifiers may be used. We do not currently load advertising services or sell or share personal information. You can switch this off at any time.</p>", defaultValue: !options.globalPrivacyControl, gtag: ["ad_storage", "ad_user_data", "ad_personalization"] },
      ],
      text: {
        prompt: { preferencesButtonAccessibleLabel: "Open cookie settings" },
        preferences: {
          title: "Cookie settings",
          description: "<p>Choose how cookies and similar storage support your experience. All categories are selected initially for the standard notice; you can switch off any optional category before saving. These selections are not permission to use optional storage until you save them. No analytics or advertising services are currently loaded. Regional notices use the same purpose categories with the applicable local protections.</p>",
          saveButtonText: "Save choices",
          saveButtonAccessibleLabel: "Save cookie settings and close",
          rejectNonEssentialButtonText: "Essential only",
          rejectNonEssentialButtonAccessibleLabel: "Reject all optional categories",
          creditLinkText: "Consent tool by Silktide",
          creditLinkAccessibleLabel: "Silktide Consent Manager, open source",
        },
      },
    };
  }
  const config = buildManagedConfig({ ...options, regime: options.regime });
  if (config.text?.prompt) config.text.prompt.description += CHOICE_NOTICE;
  if (config.text?.preferences) config.text.preferences.description += CHOICE_NOTICE;
  return config;
}

export function buildSilktideConfig(options: BuildOptions): SilktideConsentConfig {
  const config = buildBaseSilktideConfig(options);
  // New categories are not retroactive consent from a returning visitor.
  if (options.regime === "standard" && typeof window !== "undefined") {
    try {
      const prefix = `stcm.${consentNamespace("standard")}.`;
      if (localStorage.getItem(prefix + "hasConsented") === "1") {
        for (const type of config.consentTypes) {
          if (!type.required && localStorage.getItem(prefix + "consent." + type.id) === null) type.defaultValue = false;
        }
      }
    } catch { /* UI defaults are still not a saved choice. */ }
  }
  return config;
}

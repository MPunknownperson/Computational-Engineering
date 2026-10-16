"use client";

import { useSyncExternalStore } from "react";
import { optionalPurposeAllowed, subscribeConsentChange, type OptionalPurpose } from "@/lib/privacy/browser-consent";

export function useOptionalConsent(purpose: OptionalPurpose): boolean {
  return useSyncExternalStore(subscribeConsentChange, () => optionalPurposeAllowed(purpose), () => false);
}

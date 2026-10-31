import "server-only";
import { newId, store } from "@/lib/store";
import { PRIVACY_CHOICE_COOKIE, PRIVACY_COOKIE_SECONDS, PRIVACY_OPTOUT_COOKIE, type PrivacyChoiceStatus } from "./constants";

interface CookieReader { get(name: string): { value: string } | undefined }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function storedChoice(cookies: CookieReader) {
  const id = cookies.get(PRIVACY_CHOICE_COOKIE)?.value;
  if (!id || !UUID.test(id)) return null;
  const choice = store.privacyChoices.find((row) => row.id === id && row.expiresAt.getTime() > Date.now());
  return choice ?? null;
}

/** A site-wide no-sale/no-sharing practice applies even without a preference. */
export async function privacyChoiceStatus(headers: Pick<Headers, "get">, cookies: CookieReader): Promise<PrivacyChoiceStatus> {
  const stored = await storedChoice(cookies);
  const gpc = headers.get("sec-gpc") === "1";
  const marker = cookies.get(PRIVACY_OPTOUT_COOKIE)?.value === "1";
  return {
    optedOut: gpc || marker || !!stored?.saleSharingOptOut,
    stored: !!stored || marker,
    globalPrivacyControl: gpc,
    source: gpc ? "gpc" : stored ? stored.source === "gpc" ? "gpc" : "manual" : marker ? "browser" : null,
    updatedAt: stored?.updatedAt.toISOString() ?? null,
    saleOrSharingEnabled: false,
  };
}

/** Persist only a restrictive choice. There is deliberately no opt-in endpoint. */
export async function savePrivacyOptOut(cookies: CookieReader, source: "manual" | "gpc") {
  const now = new Date();
  // No background scheduler is assumed: expired receipts are removed on saves.
  store.privacyChoices.remove((row) => row.expiresAt.getTime() <= now.getTime());
  const previous = await storedChoice(cookies);
  const values = {
    saleSharingOptOut: true,
    source: previous?.source === "gpc" || source === "gpc" ? "gpc" : "manual",
    updatedAt: now,
    expiresAt: new Date(now.getTime() + PRIVACY_COOKIE_SECONDS * 1000),
  };
  const choice = previous
    ? store.privacyChoices.update((row) => row.id === previous.id, values)[0]
    : store.privacyChoices.insert({ id: newId(), createdAt: now, ...values });
  return choice;
}

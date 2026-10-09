/**
 * Cloudflare Turnstile — a free, non-intrusive bot check.
 *
 * It is opt-in: the widget is not rendered and no verification is attempted
 * unless both the public site key and the private secret key are configured.
 * Without them the existing honeypot and rate limit continue to apply, so the
 * form works exactly as before.
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

export const TURNSTILE_ENABLED = Boolean(SITE_KEY && SECRET_KEY);
export const TURNSTILE_SITE_KEY = SITE_KEY ?? null;

export type TurnstileCheck =
  | { ok: true; skipped: true }
  | { ok: true; skipped: false }
  | { ok: false; skipped: false; error: string };

/** Verify a Turnstile response server-side. Skips entirely when unconfigured. */
export async function verifyTurnstile(token: string | undefined): Promise<TurnstileCheck> {
  if (!TURNSTILE_ENABLED) return { ok: true, skipped: true };
  if (!token) return { ok: false, skipped: false, error: "Please complete the human check before sending." };

  try {
    const body = new FormData();
    body.set("secret", SECRET_KEY as string);
    body.set("response", token);

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return { ok: false, skipped: false, error: "The human check could not be completed. Please try again." };

    const outcome = (await response.json()) as { success?: boolean; "error-codes"?: string[] };
    return outcome.success
      ? { ok: true, skipped: false }
      : { ok: false, skipped: false, error: "The human check did not pass. Please try again." };
  } catch {
    return { ok: false, skipped: false, error: "The human check is temporarily unavailable. Please try again." };
  }
}

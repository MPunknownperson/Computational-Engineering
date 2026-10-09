"use client";
import { useEffect, useRef } from "react";
import { TURNSTILE_ENABLED, TURNSTILE_SITE_KEY } from "@/lib/turnstile";

/**
 * Cloudflare Turnstile widget (free, privacy-preserving, cookie-free).
 *
 * Renders nothing and loads no third-party script unless a site key is
 * configured. Turnstile requires named global callbacks rather than inline
 * functions, so this component registers them on `window` and cleans up.
 */
export function TurnstileWidget({ onToken }: { onToken: (token: string | null) => void }) {
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!TURNSTILE_ENABLED || !holder.current) return;

    const success = `__turnstileOk_${Math.random().toString(36).slice(2)}`;
    const expired = `__turnstileExp_${Math.random().toString(36).slice(2)}`;
    const error = `__turnstileErr_${Math.random().toString(36).slice(2)}`;

    // Turnstile reads these from window; register them before it runs.
    Object.assign(window, {
      [success]: (token: string) => onToken(token),
      [expired]: () => onToken(null),
      [error]: () => onToken(null),
    });

    holder.current.setAttribute("data-callback", success);
    holder.current.setAttribute("data-expired-callback", expired);
    holder.current.setAttribute("data-error-callback", error);

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      for (const key of [success, expired, error]) {
        delete (window as unknown as Record<string, unknown>)[key];
      }
      script.remove();
    };
  }, [onToken]);

  if (!TURNSTILE_ENABLED) return null;

  return (
    <div
      ref={holder}
      className="cf-turnstile"
      data-sitekey={TURNSTILE_SITE_KEY ?? ""}
      data-size="flexible"
      data-theme="light"
      aria-label="Human verification"
    />
  );
}

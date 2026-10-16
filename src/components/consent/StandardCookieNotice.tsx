"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { STANDARD_NOTICE_KEY } from "./consent-events";
import { SITE } from "@/lib/site";

function dismissed(): boolean {
  try { return window.localStorage.getItem(STANDARD_NOTICE_KEY) === "1"; }
  catch { return false; }
}

/** Simple informational notice for regions outside the GDPR and CCPA. */
export function StandardCookieNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(!dismissed()), 400);
    return () => window.clearTimeout(timer);
  }, []);

  const close = () => {
    try { window.localStorage.setItem(STANDARD_NOTICE_KEY, "1"); } catch { /* storage blocked */ }
    setOpen(false);
  };

  if (!open) return null;
  return (
    <aside role="region" aria-label="Cookie notice" className="cookie-notice">
      <div className="cookie-notice-card">
        <span className="cookie-notice-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5Z" /><circle cx="8.5" cy="10.5" r="1" /><circle cx="12.5" cy="15.5" r="1" /><circle cx="16" cy="11" r="1" />
          </svg>
        </span>
        <p className="cookie-notice-text">
          {SITE.name} uses essential cookies and local storage to run the site and remember your settings. We do not use advertising trackers.{" "}
          <Link href="/privacy" className="font-semibold underline underline-offset-4">Privacy Policy</Link>
        </p>
        <button type="button" onClick={close} className="btn btn-ink cookie-notice-ok">I understand</button>
        <button type="button" onClick={close} aria-label="Close cookie notice" className="cookie-notice-close"><X size={18} aria-hidden="true" /></button>
      </div>
    </aside>
  );
}

import Link from "next/link";
import { PRIVACY_CHOICES_PATH } from "@/lib/privacy/constants";
import { CaliforniaPrivacyIcon } from "./CaliforniaPrivacyIcon";

export function PrivacyChoicesLink({ className = "" }: { className?: string }) {
  return (
    <Link href={PRIVACY_CHOICES_PATH} prefetch={false} className={`inline-flex items-center gap-2 font-semibold underline underline-offset-4 ${className}`}>
      <CaliforniaPrivacyIcon />
      <span>Do Not Sell or Share My Personal Information</span>
    </Link>
  );
}

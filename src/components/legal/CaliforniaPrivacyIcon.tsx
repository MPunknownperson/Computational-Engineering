import Image from "next/image";

/** Official, unaltered California Attorney General artwork (blue check / X). */
export function CaliforniaPrivacyIcon({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/icons/california-privacy-options.svg"
      width={30}
      height={14}
      unoptimized
      alt="California Consumer Privacy Act (CCPA) Opt-Out Icon"
      className={`inline-block h-[14px] w-[30px] shrink-0 align-middle ${className}`}
    />
  );
}

import { SITE } from "@/lib/site";

/**
 * Radix Loom mark — a cartoon mathematical loom. The bracketed grid evokes a
 * numeral radix; its woven paths cross a friendly central knot. Static SVG,
 * designed to remain clear from favicon size through the page header.
 */
export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" className="brand-static">
      <rect x="8" y="8" width="52" height="52" rx="15" fill="#0b1020" />
      <rect x="4" y="4" width="52" height="52" rx="15" fill="#ffd23f" stroke="#0b1020" strokeWidth="3" />
      {/* radix brackets */}
      <path d="M15 16h-4v32h4M49 16h4v32h-4" stroke="#0b1020" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* loom grid */}
      <path d="M21 19v26M32 19v26M43 19v26M19 23h26M19 32h26M19 41h26" stroke="#0b1020" strokeWidth="2.4" strokeLinecap="round" />
      {/* interlaced strands */}
      <path d="M21 23l22 18M43 23L21 41" stroke="#ff6b4a" strokeWidth="4" strokeLinecap="round" />
      {/* friendly knot / eye pair */}
      <circle cx="28" cy="31" r="1.6" fill="#0b1020" />
      <circle cx="36" cy="31" r="1.6" fill="#0b1020" />
      <path d="M29 37q3 2.5 6 0" stroke="#0b1020" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="46" cy="45" r="4.2" fill="#5b8cff" stroke="#0b1020" strokeWidth="2" />
      <circle cx="46" cy="45" r="1.2" fill="#fffdf5" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`font-extrabold tracking-[-.03em] whitespace-nowrap ${className}`} aria-label={SITE.name}>
    <span className="text-[color:var(--ink)]">Radix</span>{" "}<span className="text-[#a43420]">Loom</span>
  </span>;
}

import { SITE } from "@/lib/site";

/**
 * Radix Loom mark — an owl, redrawn as a logo rather than lifted from the
 * mascot illustrations. Where Nova the mascot is a soft, round character,
 * the mark is a geometric emblem: the owl's face is a rounded square tile,
 * its "ear tufts" are the radix brackets `[ ]` turned upward, and its eyes
 * are two woven rings whose crossing strands nod to the loom. The beak is a
 * single downward chevron. It stays legible from a 16px favicon up to the
 * page header because every shape is a bold, closed primitive.
 */
export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true" className="brand-static">
      {/* offset ink shadow + sun tile */}
      <rect x="8" y="8" width="52" height="52" rx="16" fill="#0b1020" />
      <rect x="4" y="4" width="52" height="52" rx="16" fill="#ffd23f" stroke="#0b1020" strokeWidth="3" />

      {/* ear tufts = radix brackets, pointing up */}
      <path d="M14 20V11h7M46 20v-9h-7" stroke="#0b1020" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />

      {/* face plate */}
      <path d="M12 26c0-5 4-9 9-9h18c5 0 9 4 9 9v14c0 7-8 12-18 12S12 47 12 40V26Z" fill="#fffdf5" stroke="#0b1020" strokeWidth="3" strokeLinejoin="round" />

      {/* woven eye rings */}
      <circle cx="22.5" cy="31" r="7" fill="#fff" stroke="#0b1020" strokeWidth="2.8" />
      <circle cx="37.5" cy="31" r="7" fill="#fff" stroke="#0b1020" strokeWidth="2.8" />
      <path d="M17 31h11M22.5 25.5v11M32 31h11M37.5 25.5v11" stroke="#ff6b4a" strokeWidth="2" strokeLinecap="round" opacity=".85" />
      <circle cx="22.5" cy="31" r="2.9" fill="#0b1020" />
      <circle cx="37.5" cy="31" r="2.9" fill="#0b1020" />
      <circle cx="23.6" cy="29.9" r="1" fill="#fffdf5" />
      <circle cx="38.6" cy="29.9" r="1" fill="#fffdf5" />

      {/* beak: a single chevron */}
      <path d="M27 40l3 4 3-4" stroke="#0b1020" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="#ff9d3d" />

      {/* breast feathers = three loom stitches */}
      <path d="M22 47h4M28 49h4M34 47h4" stroke="#5b8cff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`font-extrabold tracking-[-.03em] whitespace-nowrap ${className}`} aria-label={SITE.name}>
    <span className="text-[color:var(--ink)]">Radix</span>{" "}<span className="text-[#a43420]">Loom</span>
  </span>;
}

import { useId } from 'react';
import type { CSSProperties } from 'react';
import type { ToolId } from '../lib/types';
import { brand } from '../lib/legal';

export function ToolGlyph({ tool, size = 42, className = '' }: { tool: ToolId; size?: number; className?: string }) {
  const drawings = {
    mortgage: <><path d="M10 23 24 11l14 12v17H10Z" fill="#dce6ff" /><path d="M6 24 24 8l18 16" stroke="#345be6" strokeWidth="3.4" /><path d="M10 25v15h28V25" /><path d="M20 40V29h8v11" fill="#879de9" /><path d="M32 12V7h6v11" fill="#edb3d2" /><circle cx="12" cy="10" r="3" fill="#edb3d2" stroke="none" /></>,
    tax: <><path d="M12 7h24v36l-4-3-4 3-4-3-4 3-4-3-4 3Z" fill="#ece2ff" /><path d="M17 14h14M18 33h12" /><path d="m19 27 10-8" stroke="#7655bb" strokeWidth="2.8" /><circle cx="19.5" cy="20" r="2" fill="#c191de" /><circle cx="29" cy="27" r="2" fill="#edb3d2" /><path d="M36 8h4v7h-4" fill="#bba0e4" /></>,
    car: <><path d="m11 22 5-11h18l6 11" fill="#e9ddfb" /><path d="M7 21h33l3 6v10H5V27Z" fill="#b8cdff" /><path d="m18 13-3 9m16-9 4 9M9 28h6m19 0h5M20 29h9" /><rect x="8" y="34" width="6" height="7" rx="2" fill="#28334b" /><rect x="34" y="34" width="6" height="7" rx="2" fill="#28334b" /><path d="M19 16h11" stroke="#fff" strokeWidth="2.6" /></>,
    compound: <><path d="M7 40h36" /><rect x="10" y="28" width="7" height="12" rx="1" fill="#d9c8f2" /><rect x="22" y="20" width="7" height="20" rx="1" fill="#a7bcf6" /><rect x="34" y="10" width="7" height="30" rx="1" fill="#4d70e1" /><path d="M7 23c7 0 8-9 17-9M19 9l6 5-5 5" stroke="#7051b3" strokeWidth="2.4" /><circle cx="11" cy="9" r="3" fill="#eda8ce" stroke="none" /></>,
    transaction: <><rect x="6" y="8" width="26" height="19" rx="3" fill="#b9ccfb" /><path d="M6 14h26M11 21h6" /><rect x="18" y="23" width="24" height="18" rx="3" fill="#f4cbe0" /><path d="M23 29h13M23 35h6" /><path d="m10 34-5-4 5-4m-5 4h9M37 11l6 4-6 4m6-4h-6" stroke="#6479c3" /></>,
    currency: <><circle cx="18" cy="19" r="11" fill="#c3d5ff" /><circle cx="31" cy="31" r="11" fill="#e5d9fa" /><path d="M21 14h-5a3 3 0 0 0 0 6h3a3 3 0 0 1 0 6h-5m4-14v16" stroke="#3554b8" /><path d="M35 25a6 6 0 1 0 0 12M24 29h10m-10 4h8" stroke="#785ab0" /><path d="m32 8 6 1-1 6M10 35l-1 6 6-1" /></>,
    probability: <><rect x="6" y="6" width="25" height="25" rx="4" fill="#dbc6f0" /><rect x="19" y="21" width="24" height="23" rx="4" fill="#f3c4dc" /><g fill="#5c498d" stroke="none"><circle cx="12" cy="12" r="2" /><circle cx="25" cy="12" r="2" /><circle cx="12" cy="25" r="2" /><circle cx="18.5" cy="18.5" r="2" /></g><g fill="#965c7b" stroke="none"><circle cx="25" cy="27" r="2" /><circle cx="37" cy="38" r="2" /><circle cx="31" cy="32.5" r="2" /></g></>,
    scientific: <><rect x="8" y="6" width="32" height="37" rx="4" fill="#e3eaff" /><path d="M8 19h32" /><path d="m13 13 3 3 5-7h13" stroke="#315bd2" /><path d="m15 26 9 10m0-10-9 10" stroke="#5e6db3" /><path d="M29 25c0-4 6-4 6 0 0 2-6 4-6 6h6" stroke="#9a71c0" /><circle cx="39" cy="8" r="4" fill="#edafd0" stroke="none" /></>,
    units: <><path d="m6 32 26-26 11 11-26 26Z" fill="#bad1ff" /><path d="m29 10 5 5M23 16l3 3m-9 3 5 5m-11 1 3 3" /><path d="M7 10v9m0-9h9M40 30v10h-9" stroke="#9975bf" /><path d="m7 10 8 8m25 22-8-8" stroke="#9975bf" /><circle cx="8" cy="8" r="3" fill="#edb6d6" stroke="none" /></>,
    bmi: <><path d="M24 40S5 28 5 17a10 10 0 0 1 19-4 10 10 0 0 1 19 4c0 11-19 23-19 23Z" fill="#f2bed8" /><path d="M10 24h8l4-10 5 17 4-8h10" stroke="#b36395" strokeWidth="2.3" /><path d="M33 12h3" stroke="white" strokeWidth="3" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 48 48" className={`tool-glyph ${className}`} style={{ '--glyph-size': `${size}px` } as CSSProperties} fill="none" stroke="#293249" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{drawings[tool]}</svg>;
}

/**
 * Quantiva mark: a "Q" drawn as an orbit ring around a counting bead, with the
 * mascot's two eyes inside the tile. The ring turns and the left eye winks, so
 * the logo is a miniature of the same character rig used across the site.
 */
export function BrandGlyph({ size = 36 }: { size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gradientId = `brand-fill-${id}`;
  const ringId = `brand-ring-${id}`;
  return <span className="brand-mark" style={{ lineHeight: 0 }}>
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" fill="none" className="brand-glyph">
      <defs>
        <linearGradient id={gradientId} x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4f7bff" />
          <stop offset="0.55" stopColor="#6b5cf0" />
          <stop offset="1" stopColor="#8b46d6" />
        </linearGradient>
        <linearGradient id={ringId} x1="6" y1="6" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ffd8ef" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="36" height="36" rx="11" fill={`url(#${gradientId})`} />
      <g className="brand-mark-orbit">
        <ellipse cx="20" cy="20" rx="13" ry="9" transform="rotate(-32 20 20)" stroke={`url(#${ringId})`} strokeWidth="2.2" fill="none" opacity="0.95" />
        <circle cx="30.4" cy="12.6" r="2.5" fill="#ffd166" />
      </g>
      <g fill="#ffffff">
        <ellipse className="brand-mark-eye" cx="16" cy="19" rx="2.1" ry="2.7" />
        <ellipse cx="24" cy="19" rx="2.1" ry="2.7" />
      </g>
      <path d="M16.8 25.4q3.2 3 6.4 0" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" fill="none" />
    </svg>
  </span>;
}

/** The logotype used beside the mark: "quant" + "iva" + accent period. */
export function BrandWordmark() {
  return <span className="brand-wordmark">{brand.wordmark.head}<span className="brand-blue">{brand.wordmark.tail}</span><span className="brand-period">.</span></span>;
}
import { findSearchPage, imagePath } from "@/lib/search-pages";

/**
 * Article hero image.
 *
 * This is a real <img> pointing at the page's rasterised illustration under
 * /media/*.png — the same file declared in the sitemap, Open Graph tags and
 * ImageObject structured data. An inline <svg> would look identical to a
 * visitor but is invisible to Google Images; a shared PNG URL with explicit
 * width/height and descriptive alt text is what gets an article picture
 * indexed and shown in image results. The art itself is original vector work
 * generated per guide (see /media/[image]/route.tsx), so each post still has
 * its own content-specific scene.
 */
export interface GuideHeroProps {
  /** The page path (e.g. /guides/meters-to-feet) whose image should be shown. */
  path: string;
  alt: string;
  className?: string;
  /** The main hero on a page should load eagerly; cards and teasers lazily. */
  priority?: boolean;
  sizes?: string;
}

export function GuideHero({ path, alt, className = "", priority = false, sizes = "(min-width: 1024px) 800px, 100vw" }: GuideHeroProps) {
  const page = findSearchPage(path);
  if (!page) return null;
  const src = imagePath(page);
  // A plain <img> is intentional: next/image would route the file through
  // /_next/image, so the URL the page shows would no longer be the URL declared
  // in the sitemap, Open Graph and ImageObject — exactly the mismatch that keeps
  // article pictures out of image search. The PNG already has fixed dimensions.
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      width={1200}
      height={630}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      sizes={sizes}
      className={`block h-auto w-full bg-[#fffaf0] ${className}`}
    />
  );
}

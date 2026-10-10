import { findSearchPage, imageId, imagePath } from "@/lib/search-pages";
import { mediaAssets } from "@/lib/media/assets";

export interface GuideHeroProps {
  path: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

/**
 * Pre-rendered responsive art. No request-time OG render or image optimizer is
 * involved. The full-size PNG remains the canonical image for sharing/search;
 * browsers choose a lossless WebP at the appropriate width. Dimensions reserve
 * space; only article heroes load eagerly, while cards load on demand.
 */
export function GuideHero({
  path,
  alt,
  className = "",
  priority = false,
  sizes = "(min-width: 1024px) 800px, 100vw",
}: GuideHeroProps) {
  const page = findSearchPage(path);
  if (!page) return null;
  const assets = mediaAssets(imageId(page));
  const srcSet = assets?.variants.map(({ width, src }) => `${src} ${width}w`).join(", ");

  return (
    <picture className="block">
      {srcSet && <source type="image/webp" srcSet={srcSet} sizes={sizes} />}
      <img
        src={imagePath(page)}
        alt={alt}
        width={1200}
        height={630}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className={`guide-image block h-auto w-full bg-[#fffdf5] ${className}`}
      />
    </picture>
  );
}

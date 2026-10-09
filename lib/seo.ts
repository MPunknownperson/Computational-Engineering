import type { Metadata } from "next";
import { headers } from "next/headers";
import { cache } from "react";
import { SITE } from "./site";
import { absoluteUrl, originFromHeaders } from "./urls";
import { findSearchPage, imagePath } from "./search-pages";

// Header-derived origin is memoized only within the current render, never across
// hosts. A domain move changes no internal links or content paths.
export const siteOrigin = cache(async () => originFromHeaders(await headers()));

export async function defaultMetadata(): Promise<Metadata> {
  const origin = await siteOrigin();
  return {
    metadataBase: new URL(origin),
    applicationName: SITE.name,
    title: { default: `${SITE.name} — Calculators, conversions & worked examples`, template: `%s | ${SITE.name}` },
    description: SITE.description,
    icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" }], apple: "/icons/apple-touch-icon.png" },
    manifest: "/manifest.webmanifest",
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
    referrer: "strict-origin-when-cross-origin",
    // Single-language site: declare it explicitly so crawlers need not infer it.
    alternates: { languages: { "en": ".", "x-default": "." } },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
      other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
    },
  };
}

export async function metadataFor(path: string): Promise<Metadata> {
  const page = findSearchPage(path);
  if (!page) throw new Error(`Missing metadata for ${path}`);
  const origin = await siteOrigin();
  const canonical = absoluteUrl(origin, page.path);
  const image = absoluteUrl(origin, imagePath(page));
  return {
    title: { absolute: `${page.title} | ${SITE.name}` },
    description: page.description,
    alternates: { canonical, languages: { "en": page.path, "x-default": page.path } },
    openGraph: {
      type: page.kind === "article" ? "article" : "website",
      title: page.title,
      description: page.description,
      url: canonical,
      siteName: SITE.name,
      locale: "en_US",
      images: [{ url: image, width: 1200, height: 630, alt: `${page.title} — ${SITE.name}` }],
      ...(page.kind === "article" ? { publishedTime: `${SITE.contentUpdated}T00:00:00Z`, modifiedTime: `${SITE.contentUpdated}T00:00:00Z` } : {}),
    },
    twitter: { card: "summary_large_image", title: page.title, description: page.description, images: [{ url: image, alt: `${page.title} — ${SITE.name}` }] },
  };
}

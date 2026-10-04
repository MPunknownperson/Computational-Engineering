import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";
import { SEARCH_PAGES, imagePath } from "@/lib/search-pages";
import { siteOrigin } from "@/lib/seo";
import { absoluteUrl } from "@/lib/urls";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await siteOrigin();
  return SEARCH_PAGES.map((page) => ({
    url: absoluteUrl(origin, page.path),
    images: page.kind === "article" ? [absoluteUrl(origin, imagePath(page))] : undefined,
    // A content revision date, not the sitemap's request time or a market quote's
    // polling time. Query variants and private endpoints are deliberately absent.
    lastModified: SITE.contentUpdated,
  }));
}

import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/seo";

export const dynamic = "force-dynamic";
export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await siteOrigin();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/privacy/regions/"] }],
    sitemap: `${origin}/sitemap.xml`,
  };
}

import { SITE } from "@/lib/site";
import { findSearchPage, imagePath } from "@/lib/search-pages";
import { siteOrigin } from "@/lib/seo";
import { absoluteUrl } from "@/lib/urls";

export function JsonLd({ value }: { value: unknown }) {
  // Escape HTML-significant characters so even future editable titles cannot
  // terminate the script element.
  const data = JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: data }} />;
}

export async function SearchContext({ path }: { path: string }) {
  const page = findSearchPage(path);
  if (!page) return null;
  const origin = await siteOrigin();
  const url = absoluteUrl(origin, path);
  const home = absoluteUrl(origin, "/");
  const graph: Record<string, unknown>[] = [];
  if (path === "/") {
    graph.push({ "@type": "WebSite", "@id": `${home}#website`, name: SITE.name, url: home, description: SITE.description, inLanguage: "en" });
  }
  graph.push({
    "@type": page.kind === "article" ? "Article" : page.kind === "directory" ? "CollectionPage" : "WebPage",
    "@id": `${url}#page`, url, name: page.title, description: page.description,
    inLanguage: "en", isAccessibleForFree: true, isPartOf: { "@id": `${home}#website` },
    primaryImageOfPage: { "@type": "ImageObject", url: absoluteUrl(origin, imagePath(page)), width: 1200, height: 630 },
    ...(page.kind === "article" ? { headline: page.title, image: absoluteUrl(origin, imagePath(page)), datePublished: SITE.contentUpdated, dateModified: SITE.contentUpdated } : {}),
  });
  if (page.kind === "tool") graph.push({
    "@type": "WebApplication", "@id": `${url}#application`, name: page.title,
    url, description: page.description, applicationCategory: "EducationalApplication",
    operatingSystem: "Any", browserRequirements: "JavaScript enabled", isAccessibleForFree: true,
    mainEntityOfPage: { "@id": `${url}#page` },
    // No invented reviews or ratings. This describes the app; it does not claim
    // eligibility for Google's software-app rich-result format.
  });
  // No visible breadcrumb trail is rendered: every page lives at its own
  // independent root-level path, and the domain itself identifies the site root.
  return <JsonLd value={{ "@context": "https://schema.org", "@graph": graph }} />;
}

import type {
  Article,
  CollectionPage,
  Graph,
  ImageObject,
  Organization,
  Thing,
  WebApplication,
  WebPage,
  WebSite,
  WithContext,
} from "schema-dts";
import { SITE } from "@/lib/site";
import { findSearchPage, imagePath } from "@/lib/search-pages";
import { siteOrigin } from "@/lib/seo";
import { absoluteUrl } from "@/lib/urls";

export function JsonLd({ value }: { value: Graph | WithContext<Thing> }) {
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
  const imageUrl = absoluteUrl(origin, imagePath(page));
  const image: ImageObject = {
    "@type": "ImageObject",
    url: imageUrl,
    width: "1200",
    height: "630",
  };

  const graph: Thing[] = [];

  if (path === "/") {
    const website: WebSite = {
      "@type": "WebSite",
      "@id": `${home}#website`,
      name: SITE.name,
      url: home,
      description: SITE.description,
      inLanguage: "en",
      publisher: { "@id": `${home}#organization` },
    };
    const organization: Organization = {
      "@type": "Organization",
      "@id": `${home}#organization`,
      name: SITE.name,
      url: home,
      logo: absoluteUrl(origin, "/favicon.svg"),
    };
    graph.push(website, organization);
  }

  if (page.kind === "article") {
    const article: Article = {
      "@type": "Article",
      "@id": `${url}#page`,
      url,
      name: page.title,
      headline: page.title,
      description: page.description,
      inLanguage: "en",
      isAccessibleForFree: true,
      isPartOf: { "@id": `${home}#website` },
      image: imageUrl,
      datePublished: SITE.contentUpdated,
      dateModified: SITE.contentUpdated,
      mainEntityOfPage: url,
    };
    graph.push(article);
  } else if (page.kind === "directory") {
    const collection: CollectionPage = {
      "@type": "CollectionPage",
      "@id": `${url}#page`,
      url,
      name: page.title,
      description: page.description,
      inLanguage: "en",
      isAccessibleForFree: true,
      isPartOf: { "@id": `${home}#website` },
      primaryImageOfPage: image,
    };
    graph.push(collection);
  } else {
    const webPage: WebPage = {
      "@type": "WebPage",
      "@id": `${url}#page`,
      url,
      name: page.title,
      description: page.description,
      inLanguage: "en",
      isAccessibleForFree: true,
      isPartOf: { "@id": `${home}#website` },
      primaryImageOfPage: image,
    };
    graph.push(webPage);
  }

  if (page.kind === "tool") {
    const application: WebApplication = {
      "@type": "WebApplication",
      "@id": `${url}#application`,
      name: page.title,
      url,
      description: page.description,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Any",
      browserRequirements: "Requires JavaScript",
      isAccessibleForFree: true,
      mainEntityOfPage: { "@id": `${url}#page` },
    };
    graph.push(application);
  }

  const payload: Graph = { "@context": "https://schema.org", "@graph": graph };
  return <JsonLd value={payload} />;
}

import { notFound } from "next/navigation";
import { LANDING_PAGES, findLanding } from "@/lib/landing";
import { metadataFor } from "@/lib/seo";
import { LandingArticle } from "@/components/landing/LandingPage";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return LANDING_PAGES.filter((page) => page.section === "convert").map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: Props) {
  const page = findLanding("convert", (await params).slug);
  if (!page) notFound();
  return metadataFor(page.path);
}

export default async function ConvertLandingPage({ params }: Props) {
  const page = findLanding("convert", (await params).slug);
  if (!page) notFound();
  return <LandingArticle page={page} />;
}

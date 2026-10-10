import { imageId, imagePath, SEARCH_PAGES } from "@/lib/search-pages";

/** Old /media/<slug>.png links still work, without rasterising on request. */
export async function GET(_request: Request, { params }: { params: Promise<{ image: string }> }) {
  const { image } = await params;
  const page = SEARCH_PAGES.find((candidate) => `${imageId(candidate)}.png` === image);
  if (!page) return new Response("Image not found", { status: 404 });
  // Relative Location preserves the visitor's origin behind a reverse proxy.
  return new Response(null, { status: 307, headers: { Location: imagePath(page) } });
}

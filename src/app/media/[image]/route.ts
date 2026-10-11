import { promises as fs } from "node:fs";
import path from "node:path";
import { imageId, imagePath, SEARCH_PAGES } from "@/lib/search-pages";

export const dynamic = "force-dynamic";

const MEDIA_DIR = path.join(process.cwd(), "public", "media");
const SAFE_NAME = /^[a-z0-9][a-z0-9._-]*\.(png|webp)$/;

async function mediaFile(filename: string): Promise<Response | null> {
  if (!SAFE_NAME.test(filename)) return null;
  const absolute = path.join(MEDIA_DIR, filename);
  if (!absolute.startsWith(MEDIA_DIR + path.sep)) return null;
  try {
    const body = await fs.readFile(absolute);
    const hashed = /\.[a-f0-9]{12}(\.\d+)?\.(png|webp)$/.test(filename);
    return new Response(body, {
      headers: {
        "content-type": filename.endsWith(".webp") ? "image/webp" : "image/png",
        "cache-control": hashed
          ? "public, max-age=31536000, immutable"
          : "public, max-age=86400",
      },
    });
  } catch {
    return null;
  }
}

/** Serve hashed public art, and keep unhashed /media/<slug>.png links working. */
export async function GET(_request: Request, { params }: { params: Promise<{ image: string }> }) {
  const { image } = await params;
  const direct = await mediaFile(image);
  if (direct) return direct;

  const page = SEARCH_PAGES.find((candidate) => `${imageId(candidate)}.png` === image);
  if (page) {
    const hashed = imagePath(page).replace(/^\/media\//, "");
    const served = await mediaFile(hashed);
    if (served) return served;
  }

  return new Response("Image not found", { status: 404 });
}

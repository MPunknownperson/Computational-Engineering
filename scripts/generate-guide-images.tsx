import { createHash } from "node:crypto";
import { readdir, mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { SEARCH_PAGES, imageId } from "../src/lib/search-pages";
import { renderPageImage } from "../src/lib/media/artwork";

/** Run with: npm exec tsx -- scripts/generate-guide-images.tsx */
/** Pass `--icons-only` when only the mark changed; skips the 48 page images. */
const ICONS_ONLY = process.argv.includes("--icons-only");

async function main() {
  await mkdir("public/icons", { recursive: true });
  for (const [name, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["apple-touch-icon.png", 180]] as const) {
    await sharp("public/favicon.svg", { density: 384 }).resize(size, size)
      .png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(`public/icons/${name}`);
  }
  // Maskable icons must keep their artwork inside the central 80% safe area,
  // so the tile is composited at 78% over a solid brand-coloured square.
  const mark = await sharp("public/favicon.svg", { density: 384 }).resize(399, 399).png().toBuffer();
  await sharp({ create: { width: 512, height: 512, channels: 4, background: "#ffd23f" } })
    .composite([{ input: mark, gravity: "centre" }])
    .png({ compressionLevel: 9, adaptiveFiltering: true }).toFile("public/icons/maskable-512.png");
  if (ICONS_ONLY) {
    console.log("Icons generated (4).");
    return;
  }
  const output = path.resolve("public/media");
  await mkdir(output, { recursive: true });
  const manifest: Record<string, {
    png: string;
    variants: Array<{ width: number; src: string }>;
  }> = {};
  const keep = new Set<string>();
  let originalBytes = 0;
  let thumbnailBytes = 0;

  // Run serially to keep the renderer's memory use bounded on small servers.
  for (const page of SEARCH_PAGES) {
    const id = imageId(page);
    const raw = Buffer.from(await renderPageImage(page).arrayBuffer());
    const hash = createHash("sha256").update(raw).digest("hex").slice(0, 12);
    const pngName = `${id}.${hash}.png`;
    const png = await sharp(raw).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
    await writeFile(path.join(output, pngName), png);
    keep.add(pngName);
    originalBytes += raw.length;
    const variants: Array<{ width: number; src: string }> = [];

    // Resizing is deliberate for thumbnails. Each resulting raster is then
    // compressed losslessly; the full-width variant retains every source pixel.
    for (const width of [400, 800, 1200]) {
      const name = `${id}.${hash}.${width}.webp`;
      const image = sharp(raw);
      if (width !== 1200) image.resize({ width });
      const compressed = await image.webp({ lossless: true, effort: 6 }).toBuffer();
      await writeFile(path.join(output, name), compressed);
      keep.add(name);
      variants.push({ width, src: `/media/${name}` });
      if (width === 400) thumbnailBytes += compressed.length;
      // Prove full-size compression did not change any pixels.
      if (width === 1200) {
        const expected = await sharp(raw).ensureAlpha().raw().toBuffer();
        const actual = await sharp(compressed).ensureAlpha().raw().toBuffer();
        if (!expected.equals(actual)) throw new Error(`Pixel mismatch in ${name}`);
      }
    }
    manifest[id] = { png: `/media/${pngName}`, variants };
    console.log(`Generated ${id}`);
  }

  // Remove old hashed files so future regenerations do not accumulate assets.
  for (const file of await readdir(output)) {
    if (/\.[a-f0-9]{12}(\.\d+)?\.(png|webp)$/.test(file) && !keep.has(file)) {
      await unlink(path.join(output, file));
    }
  }
  const manifestFile = "src/lib/media/manifest.json";
  const json = `${JSON.stringify(manifest, null, 2)}\n`;
  const previous = await readFile(manifestFile, "utf8").catch(() => "");
  if (previous !== json) await writeFile(manifestFile, json);
  console.log(`${SEARCH_PAGES.length} images; original PNGs ${Math.round(originalBytes / 1024)} KB; 400px lossless WebPs ${Math.round(thumbnailBytes / 1024)} KB.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

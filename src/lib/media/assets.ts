import manifest from "./manifest.json";

export interface ImageAssets {
  png: string;
  variants: Array<{ width: number; src: string }>;
}

const assets = manifest as Record<string, ImageAssets>;

export function mediaAssets(id: string): ImageAssets | undefined {
  return assets[id];
}

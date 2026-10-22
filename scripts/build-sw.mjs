/**
 * Bundles the Serwist/Workbox service worker (src/sw/sw.ts) into public/sw.js.
 *
 * Serwist's webpack plugin is incompatible with Next 16's Turbopack build, so
 * the worker is compiled as a standalone ESBuild bundle. Runtime caching
 * strategies (network-first / cache-first / stale-while-revalidate) come from
 * the Workbox-derived `serwist` runtime.
 */
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const source = readFileSync(new URL("../src/sw/sw.ts", import.meta.url), "utf8");
const revision = createHash("sha256").update(source).digest("hex").slice(0, 12);

await build({
  entryPoints: ["src/sw/sw.ts"],
  bundle: true,
  minify: true,
  format: "iife",
  target: "es2020",
  platform: "browser",
  outfile: "public/sw.js",
  define: {
    BUILD_REVISION: JSON.stringify(revision),
    "process.env.NODE_ENV": JSON.stringify("production"),
    "self.__SW_MANIFEST": "undefined",
  },
  logLevel: "info",
});

writeFileSync("public/sw-build.json", JSON.stringify({ revision, builtAt: new Date().toISOString() }, null, 2));
console.log(`service worker bundled (revision ${revision})`);

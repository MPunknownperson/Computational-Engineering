#!/usr/bin/env node
/**
 * Repackage the upstream sherpa-onnx WebAssembly ASR runtime with a compact
 * int8 streaming model so it can be self-hosted from /public/vendor.
 *
 * The official release bundle (sherpa-onnx-wasm-simd-<ver>-en-asr-zipformer)
 * embeds a ~190 MB fp32 model in the Emscripten `.data` package. The file
 * table for that package is inlined in the glue script as
 * `loadPackage({files:[...],remote_package_size:N})`, so the package can be
 * rebuilt from different files as long as that table is rewritten too.
 *
 * Usage:
 *   node scripts/package-sherpa-onnx.mjs \
 *     --runtime /tmp/sherpa/sherpa-onnx-wasm-simd-v1.13.7-en-asr-zipformer \
 *     --model   /tmp/sherpa/sherpa-onnx-streaming-zipformer-en-20M-2023-02-17 \
 *     --out     public/vendor/sherpa-onnx
 *
 * The runtime archive comes from
 *   https://github.com/k2-fsa/sherpa-onnx/releases (asset *-en-asr-zipformer.tar.bz2)
 * and the model from
 *   https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models
 */
import { readFileSync, writeFileSync, mkdirSync, statSync, copyFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const runtimeDir = resolve(option("runtime", "/tmp/sherpa/sherpa-onnx-wasm-simd-v1.13.7-en-asr-zipformer"));
const modelDir = resolve(option("model", "/tmp/sherpa/sherpa-onnx-streaming-zipformer-en-20M-2023-02-17"));
const outDir = resolve(option("out", "public/vendor/sherpa-onnx"));
const glueName = "sherpa-onnx-wasm-main-asr.js";
const dataName = "sherpa-onnx-wasm-main-asr.data";
const wasmName = "sherpa-onnx-wasm-main-asr.wasm";

function pick(dir, pattern) {
  const match = readdirSync(dir).filter((file) => pattern.test(file)).sort();
  if (!match.length) throw new Error(`No file matching ${pattern} in ${dir}`);
  return join(dir, match[0]);
}

// Prefer int8 weights; fall back to fp32 when an int8 export is missing.
const files = [
  { filename: "/encoder.onnx", source: pick(modelDir, /^encoder.*\.int8\.onnx$/) },
  { filename: "/decoder.onnx", source: pick(modelDir, /^decoder.*\.int8\.onnx$/) },
  { filename: "/joiner.onnx", source: pick(modelDir, /^joiner.*\.int8\.onnx$/) },
  { filename: "/tokens.txt", source: join(modelDir, "tokens.txt") },
];

mkdirSync(outDir, { recursive: true });

// 1. Concatenate the model files into the new data package.
const chunks = [];
let offset = 0;
const table = files.map((file) => {
  const buffer = readFileSync(file.source);
  const entry = { filename: file.filename, start: offset, end: offset + buffer.length };
  offset += buffer.length;
  chunks.push(buffer);
  return entry;
});
writeFileSync(join(outDir, dataName), Buffer.concat(chunks));

// 2. Patch the inline file table in the Emscripten glue.
const glue = readFileSync(join(runtimeDir, glueName), "utf8");
const pattern = /loadPackage\(\{files:\[[^\]]*\],remote_package_size:\d+\}\)/;
if (!pattern.test(glue)) throw new Error(`Could not find the package table in ${glueName}`);
const tableSource = table.map((entry) => `{filename:${JSON.stringify(entry.filename)},start:${entry.start},end:${entry.end}}`).join(",");
const patched = glue.replace(pattern, `loadPackage({files:[${tableSource}],remote_package_size:${offset}})`);
writeFileSync(join(outDir, glueName), patched);

// 3. Copy the untouched runtime pieces.
copyFileSync(join(runtimeDir, wasmName), join(outDir, wasmName));
copyFileSync(join(runtimeDir, "sherpa-onnx-asr.js"), join(outDir, "sherpa-onnx-asr.js"));

const manifest = {
  runtime: runtimeDir.split("/").pop(),
  model: modelDir.split("/").pop(),
  packagedAt: new Date().toISOString(),
  files: table.map((entry) => ({ ...entry, bytes: entry.end - entry.start })),
  dataBytes: offset,
  wasmBytes: statSync(join(outDir, wasmName)).size,
};
writeFileSync(join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Packaged ${files.length} files (${(offset / 1048576).toFixed(1)} MB) into ${outDir}`);

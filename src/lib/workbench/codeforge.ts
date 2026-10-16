import "server-only";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { execTool, whichBinary } from "@/lib/workbench/sandbox";

const execFileAsync = promisify(execFile);

async function execIn(cwd: string, file: string, args: string[], timeout: number): Promise<{ stdout: string; exitCode: number }> {
  try {
    const { stdout } = await execFileAsync(file, args, { cwd, timeout, maxBuffer: 1024 * 1024, env: { ...process.env, PATH: `/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ""}` } });
    return { stdout, exitCode: 0 };
  } catch (error) {
    const err = error as { stdout?: string; code?: number };
    return { stdout: err.stdout ?? "", exitCode: typeof err.code === "number" ? err.code : 1 };
  }
}

/**
 * CodeForge — the workbench's dedicated code-development and processing engine.
 *
 * Everything here runs in-process (TypeScript compiler API, mathjs, node:crypto)
 * or through an already-vetted sandbox binary. Inputs are size-capped and no
 * user code is ever `eval`ed; "benchmark" only measures mathjs expressions.
 */

export const CODEFORGE_MAX_SOURCE = 256 * 1024;

export type CodeForgeAction =
  | "transpile"
  | "diagnose"
  | "format"
  | "minify"
  | "analyze"
  | "hash"
  | "benchmark"
  | "lint";

export const CODEFORGE_ACTIONS: readonly CodeForgeAction[] = [
  "transpile", "diagnose", "format", "minify", "analyze", "hash", "benchmark", "lint",
];

export interface CodeForgeRequest {
  action: CodeForgeAction;
  source: string;
  /** File name hint used to pick a language (e.g. "widget.tsx"). */
  filename?: string;
  /** For "benchmark": how many times to evaluate. */
  iterations?: number;
  /** For "benchmark": mathjs scope variables. */
  scope?: Record<string, number>;
  /** For "transpile": ECMAScript target. */
  target?: "es2017" | "es2020" | "es2022" | "esnext";
  /** For "format"/"hash": JSON indent or hash algorithm. */
  option?: string;
}

export interface CodeForgeResult {
  action: CodeForgeAction;
  ok: boolean;
  durationMs: number;
  output?: string;
  data?: Record<string, unknown>;
  error?: string;
}

class CodeForgeError extends Error {}

function assertSource(source: unknown): string {
  if (typeof source !== "string") throw new CodeForgeError("`source` must be a string.");
  if (source.length > CODEFORGE_MAX_SOURCE) {
    throw new CodeForgeError(`Source exceeds ${CODEFORGE_MAX_SOURCE / 1024} KiB.`);
  }
  return source;
}

type TS = typeof import("typescript");
let tsModule: Promise<TS> | null = null;
function loadTypeScript(): Promise<TS> {
  if (!tsModule) tsModule = import("typescript").then((m) => (m.default ?? m) as TS);
  return tsModule;
}

function languageFor(filename: string | undefined): "ts" | "tsx" | "js" | "jsx" | "json" | "css" | "md" | "text" {
  const ext = (filename ?? "").toLowerCase().split(".").pop() ?? "";
  if (["ts", "mts", "cts"].includes(ext)) return "ts";
  if (ext === "tsx") return "tsx";
  if (["js", "mjs", "cjs"].includes(ext)) return "js";
  if (ext === "jsx") return "jsx";
  if (ext === "json") return "json";
  if (ext === "css") return "css";
  if (ext === "md" || ext === "mdx") return "md";
  return "text";
}

async function transpile(source: string, filename: string | undefined, target: CodeForgeRequest["target"], minify: boolean) {
  const ts = await loadTypeScript();
  const lang = languageFor(filename);
  const jsx = lang === "tsx" || lang === "jsx";
  const targetMap: Record<NonNullable<CodeForgeRequest["target"]>, number> = {
    es2017: ts.ScriptTarget.ES2017,
    es2020: ts.ScriptTarget.ES2020,
    es2022: ts.ScriptTarget.ES2022,
    esnext: ts.ScriptTarget.ESNext,
  };
  const result = ts.transpileModule(source, {
    fileName: filename ?? (jsx ? "input.tsx" : "input.ts"),
    reportDiagnostics: true,
    compilerOptions: {
      target: targetMap[target ?? "es2022"],
      module: ts.ModuleKind.ESNext,
      jsx: jsx ? ts.JsxEmit.ReactJSX : undefined,
      removeComments: minify,
      importHelpers: false,
      sourceMap: false,
      isolatedModules: true,
      verbatimModuleSyntax: false,
    },
  });
  const diagnostics = (result.diagnostics ?? []).map((d) => ({
    code: d.code,
    message: ts.flattenDiagnosticMessageText(d.messageText, "\n"),
    start: d.start ?? null,
  }));
  let output = result.outputText;
  if (minify) {
    output = output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n");
  }
  return { output, diagnostics };
}

async function diagnose(source: string, filename: string | undefined) {
  const ts = await loadTypeScript();
  const name = filename ?? "input.ts";
  const lang = languageFor(name);
  const kind = lang === "tsx" ? ts.ScriptKind.TSX : lang === "jsx" ? ts.ScriptKind.JSX : lang === "js" ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const file = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, kind);
  const syntactic = (file as unknown as { parseDiagnostics?: import("typescript").Diagnostic[] }).parseDiagnostics ?? [];
  const problems = syntactic.map((d) => {
    const pos = d.start != null ? file.getLineAndCharacterOfPosition(d.start) : null;
    return {
      code: d.code,
      message: ts.flattenDiagnosticMessageText(d.messageText, "\n"),
      line: pos ? pos.line + 1 : null,
      column: pos ? pos.character + 1 : null,
    };
  });
  let functions = 0, classes = 0, imports = 0, exportsCount = 0, maxDepth = 0;
  const walk = (node: import("typescript").Node, depth: number) => {
    maxDepth = Math.max(maxDepth, depth);
    if (ts.isFunctionLike(node)) functions += 1;
    if (ts.isClassDeclaration(node)) classes += 1;
    if (ts.isImportDeclaration(node)) imports += 1;
    if (ts.isExportAssignment(node) || ts.isExportDeclaration(node)) exportsCount += 1;
    if (ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) exportsCount += 1;
    ts.forEachChild(node, (child) => walk(child, depth + 1));
  };
  walk(file, 0);
  return { problems, metrics: { functions, classes, imports, exports: exportsCount, astDepth: maxDepth } };
}

function formatJson(source: string, indentOption: string | undefined) {
  const indent = Math.min(8, Math.max(0, Number.parseInt(indentOption ?? "2", 10) || 0));
  const parsed = JSON.parse(source) as unknown;
  return indent === 0 ? JSON.stringify(parsed) : JSON.stringify(parsed, null, indent);
}

async function formatWithPrettier(source: string, filename: string | undefined): Promise<string | null> {
  const prettier = await whichBinary("prettier");
  if (!prettier) return null;
  const dir = join(tmpdir(), `codeforge-${randomUUID()}`);
  await mkdir(dir, { recursive: true });
  const file = join(dir, filename?.replace(/[^\w.-]/g, "_") || "input.ts");
  try {
    await writeFile(file, source, "utf8");
    const run = await execTool(prettier, ["--no-config", file], 15_000);
    return run.exitCode === 0 ? run.stdout : null;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function formatSource(source: string, filename: string | undefined, option: string | undefined) {
  const lang = languageFor(filename);
  if (lang === "json") return { output: formatJson(source, option), engine: "json" };
  const pretty = await formatWithPrettier(source, filename);
  if (pretty !== null) return { output: pretty, engine: "prettier" };
  if (lang === "ts" || lang === "tsx" || lang === "js" || lang === "jsx") {
    // Deterministic fallback: normalise indentation using the TypeScript printer.
    const ts = await loadTypeScript();
    const file = ts.createSourceFile(filename ?? "input.ts", source, ts.ScriptTarget.Latest, true,
      lang === "tsx" ? ts.ScriptKind.TSX : lang === "jsx" ? ts.ScriptKind.JSX : lang === "js" ? ts.ScriptKind.JS : ts.ScriptKind.TS);
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, removeComments: false });
    return { output: printer.printFile(file), engine: "typescript-printer" };
  }
  return { output: source.replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n"), engine: "whitespace" };
}

function analyze(source: string, filename: string | undefined) {
  const lines = source.split(/\r?\n/);
  const nonBlank = lines.filter((l) => l.trim().length > 0);
  const comments = nonBlank.filter((l) => /^\s*(\/\/|\/\*|\*|#)/.test(l));
  const code = nonBlank.length - comments.length;
  const branchTokens = source.match(/\b(if|else if|for|while|case|catch|\?\?|&&|\|\||\?)\b|\?[^.:]/g) ?? [];
  const longest = lines.reduce((max, l) => Math.max(max, l.length), 0);
  const todo = (source.match(/\b(TODO|FIXME|HACK|XXX)\b/g) ?? []).length;
  const identifiers = new Set(source.match(/\b[A-Za-z_$][\w$]*\b/g) ?? []);
  return {
    language: languageFor(filename),
    bytes: Buffer.byteLength(source, "utf8"),
    lines: lines.length,
    codeLines: code,
    commentLines: comments.length,
    blankLines: lines.length - nonBlank.length,
    longestLine: longest,
    cyclomaticEstimate: 1 + branchTokens.length,
    uniqueIdentifiers: identifiers.size,
    todoMarkers: todo,
    maintainability: Math.max(0, Math.min(100, Math.round(100 - (branchTokens.length / Math.max(code, 1)) * 120 - (longest > 160 ? 10 : 0) - todo * 2))),
  };
}

function hash(source: string, algorithm: string | undefined) {
  const allowed = ["sha256", "sha1", "sha512", "md5", "sha384"];
  const alg = allowed.includes(algorithm ?? "") ? (algorithm as string) : "sha256";
  const digest = createHash(alg).update(source, "utf8").digest("hex");
  return { algorithm: alg, digest, bytes: Buffer.byteLength(source, "utf8") };
}

async function benchmark(expression: string, iterations: number | undefined, scope: Record<string, number> | undefined) {
  const { create, all } = await import("mathjs");
  const math = create(all, {});
  // Disable anything that could reach the host.
  const disabled = () => { throw new Error("disabled in benchmark sandbox"); };
  math.import({ import: disabled, createUnit: disabled, evaluate: disabled, simplify: disabled, derivative: disabled, resolve: disabled }, { override: true });
  const runs = Math.min(100_000, Math.max(1, Math.floor(iterations ?? 1_000)));
  const safeScope: Record<string, number> = {};
  for (const [k, v] of Object.entries(scope ?? {})) if (/^[A-Za-z_]\w{0,31}$/.test(k) && Number.isFinite(v)) safeScope[k] = v;
  const compileStart = performance.now();
  const node = math.parse(expression);
  const compiled = node.compile();
  const compileMs = performance.now() - compileStart;
  let last: unknown = null;
  const samples: number[] = [];
  const start = performance.now();
  for (let i = 0; i < runs; i++) {
    const t = performance.now();
    last = compiled.evaluate({ ...safeScope });
    samples.push(performance.now() - t);
  }
  const total = performance.now() - start;
  samples.sort((a, b) => a - b);
  const pct = (p: number) => samples[Math.min(samples.length - 1, Math.floor(p * samples.length))] ?? 0;
  return {
    expression: node.toString(),
    result: math.format(last, { precision: 14 }),
    iterations: runs,
    compileMs: Number(compileMs.toFixed(4)),
    totalMs: Number(total.toFixed(3)),
    meanUs: Number(((total / runs) * 1000).toFixed(3)),
    p50Us: Number((pct(0.5) * 1000).toFixed(3)),
    p95Us: Number((pct(0.95) * 1000).toFixed(3)),
    opsPerSecond: Math.round(runs / (total / 1000)),
  };
}

async function lint(source: string, filename: string | undefined) {
  const eslint = await whichBinary("eslint");
  const dir = join(tmpdir(), `codeforge-${randomUUID()}`);
  await mkdir(dir, { recursive: true });
  const safeName = filename?.replace(/[^\w.-]/g, "_") || "input.ts";
  const file = join(dir, safeName);
  try {
    await writeFile(file, source, "utf8");
    if (eslint) {
      await writeFile(join(dir, "eslint.config.mjs"), "export default [{ files: ['**/*'], rules: { 'no-debugger': 'error', 'no-unused-vars': 'warn', 'no-undef': 'off' } }];\n", "utf8");
      const run = await execIn(dir, eslint, ["--no-config-lookup", "--config", "eslint.config.mjs", "--format", "json", safeName], 20_000);
      try {
        const parsed = JSON.parse(run.stdout || "[]") as Array<{ messages: Array<{ ruleId: string | null; severity: number; message: string; line: number; column: number }> }>;
        const messages = parsed.flatMap((r) => r.messages).map((m) => ({ rule: m.ruleId, severity: m.severity === 2 ? "error" : "warning", message: m.message, line: m.line, column: m.column }));
        return { engine: "eslint", messages };
      } catch {
        /* fall through to built-in checks */
      }
    }
    // Built-in heuristics when eslint is unavailable.
    const messages: Array<{ rule: string; severity: "error" | "warning"; message: string; line: number; column: number }> = [];
    source.split(/\r?\n/).forEach((line, index) => {
      const push = (rule: string, severity: "error" | "warning", message: string, column: number) => messages.push({ rule, severity, message, line: index + 1, column });
      const debuggerAt = line.indexOf("debugger");
      if (debuggerAt >= 0) push("no-debugger", "error", "Unexpected 'debugger' statement.", debuggerAt + 1);
      const consoleAt = line.search(/\bconsole\.(log|debug)\(/);
      if (consoleAt >= 0) push("no-console", "warning", "Unexpected console statement.", consoleAt + 1);
      const evalAt = line.search(/\beval\(/);
      if (evalAt >= 0) push("no-eval", "error", "eval can be harmful.", evalAt + 1);
      const varAt = line.search(/^\s*var\s/);
      if (varAt >= 0) push("no-var", "warning", "Unexpected var, use let or const instead.", varAt + 1);
      const eqAt = line.search(/[^=!]==[^=]/);
      if (eqAt >= 0) push("eqeqeq", "warning", "Expected '===' and instead saw '=='.", eqAt + 2);
      if (/\s+$/.test(line)) push("no-trailing-spaces", "warning", "Trailing spaces not allowed.", line.trimEnd().length + 1);
    });
    const diag = await diagnose(source, filename);
    for (const p of diag.problems) messages.push({ rule: `ts${p.code}`, severity: "error", message: p.message, line: p.line ?? 1, column: p.column ?? 1 });
    return { engine: "built-in", messages };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function runCodeForge(request: CodeForgeRequest): Promise<CodeForgeResult> {
  const started = performance.now();
  const done = (partial: Omit<CodeForgeResult, "action" | "durationMs">): CodeForgeResult => ({
    action: request.action,
    durationMs: Number((performance.now() - started).toFixed(3)),
    ...partial,
  });
  try {
    if (!CODEFORGE_ACTIONS.includes(request.action)) throw new CodeForgeError(`Unknown action. Use one of: ${CODEFORGE_ACTIONS.join(", ")}.`);
    const source = assertSource(request.source);
    switch (request.action) {
      case "transpile": {
        const r = await transpile(source, request.filename, request.target, false);
        return done({ ok: r.diagnostics.length === 0, output: r.output, data: { diagnostics: r.diagnostics, target: request.target ?? "es2022" } });
      }
      case "minify": {
        const r = await transpile(source, request.filename, request.target, true);
        return done({ ok: true, output: r.output, data: { before: Buffer.byteLength(source), after: Buffer.byteLength(r.output), savedPercent: Number((100 - (Buffer.byteLength(r.output) / Math.max(1, Buffer.byteLength(source))) * 100).toFixed(1)) } });
      }
      case "diagnose": {
        const r = await diagnose(source, request.filename);
        return done({ ok: r.problems.length === 0, data: r });
      }
      case "format": {
        const r = await formatSource(source, request.filename, request.option);
        return done({ ok: true, output: r.output, data: { engine: r.engine } });
      }
      case "analyze":
        return done({ ok: true, data: analyze(source, request.filename) });
      case "hash":
        return done({ ok: true, data: hash(source, request.option) });
      case "benchmark":
        return done({ ok: true, data: await benchmark(source, request.iterations, request.scope) });
      case "lint": {
        const r = await lint(source, request.filename);
        return done({ ok: !r.messages.some((m) => m.severity === "error"), data: r });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return done({ ok: false, error: message });
  }
}

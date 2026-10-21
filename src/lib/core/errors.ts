/**
 * Typed error model shared by every API route, the crypto engine and the
 * automated remediation system. Every failure is reduced to a stable
 * *category* (what kind of thing went wrong) and a *fingerprint* (a hash of
 * the category + normalised message + route) so repeated occurrences group
 * together and a playbook can be selected deterministically.
 */
import { createHash } from "node:crypto";

export type ErrorCategory =
  | "upstream_timeout"
  | "upstream_unavailable"
  | "rate_limited"
  | "malformed_payload"
  | "validation"
  | "not_found"
  | "database_unavailable"
  | "schema_missing"
  | "network_offline"
  | "chunk_load"
  | "hydration"
  | "storage_corrupt"
  | "render"
  | "unknown";

export type Severity = "info" | "warning" | "error" | "critical";

export class AppError extends Error {
  readonly category: ErrorCategory;
  readonly status: number;
  readonly retryable: boolean;
  readonly detail?: Record<string, unknown>;
  constructor(category: ErrorCategory, message: string, options: { status?: number; retryable?: boolean; detail?: Record<string, unknown>; cause?: unknown } = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "AppError";
    this.category = category;
    this.status = options.status ?? defaultStatus(category);
    this.retryable = options.retryable ?? defaultRetryable(category);
    this.detail = options.detail;
  }
}

function defaultStatus(category: ErrorCategory): number {
  switch (category) {
    case "validation": return 400;
    case "not_found": return 404;
    case "rate_limited": return 429;
    case "upstream_timeout": return 504;
    case "upstream_unavailable":
    case "malformed_payload": return 502;
    case "database_unavailable":
    case "schema_missing": return 503;
    default: return 500;
  }
}

function defaultRetryable(category: ErrorCategory): boolean {
  return ["upstream_timeout", "upstream_unavailable", "rate_limited", "database_unavailable", "network_offline", "chunk_load"].includes(category);
}

export function severityFor(category: ErrorCategory): Severity {
  switch (category) {
    case "validation":
    case "not_found": return "info";
    case "rate_limited":
    case "upstream_timeout":
    case "upstream_unavailable":
    case "malformed_payload":
    case "network_offline":
    case "chunk_load":
    case "hydration":
    case "storage_corrupt": return "warning";
    case "database_unavailable":
    case "schema_missing": return "critical";
    default: return "error";
  }
}

/** Best-effort classification of any thrown value. */
export function classifyError(error: unknown): { category: ErrorCategory; message: string; stack?: string } {
  if (error instanceof AppError) return { category: error.category, message: error.message, stack: error.stack };
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";
  const stack = error instanceof Error ? error.stack : undefined;
  const text = `${message} ${(error as { code?: string })?.code ?? ""}`.toLowerCase();
  const code = (error as { code?: string })?.code;
  let category: ErrorCategory = "unknown";
  if (/abort|timed? ?out|etimedout|deadline/.test(text)) category = "upstream_timeout";
  else if (/429|too many requests|rate limit/.test(text)) category = "rate_limited";
  else if (code === "42P01" || /relation .* does not exist|no such table|undefined_table/.test(text)) category = "schema_missing";
  else if (code === "ECONNREFUSED" || code === "57P01" || /connection terminated|database|postgres|pool is draining|ECONNRESET/i.test(text)) category = "database_unavailable";
  else if (/fetch failed|enotfound|eai_again|network|socket hang up|offline/.test(text)) category = "upstream_unavailable";
  else if (/unexpected token|json|malformed|invalid payload|not valid/.test(text)) category = "malformed_payload";
  else if (/loading chunk|chunkloaderror|failed to fetch dynamically imported module|importing a module script failed/.test(text)) category = "chunk_load";
  else if (/hydration|hydrat|text content does not match|did not match/.test(text)) category = "hydration";
  else if (/localstorage|indexeddb|quota|storage/.test(text)) category = "storage_corrupt";
  else if (/cannot read propert|is not a function|undefined is not|null is not|is not defined|maximum update depth|minified react error/.test(text)) category = "render";
  else if (/invalid|required|must be|expected/.test(text)) category = "validation";
  return { category, message, stack };
}

/** Collapse volatile tokens so the same defect yields the same fingerprint. */
export function normaliseMessage(message: string): string {
  return message
    .replace(/0x[0-9a-f]{6,}/gi, "<hex>")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<uuid>")
    .replace(/\d+(\.\d+)?/g, "<n>")
    .replace(/https?:\/\/\S+/g, "<url>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

export function fingerprintError(category: ErrorCategory, message: string, route?: string | null): string {
  return createHash("sha1").update(`${category}|${normaliseMessage(message)}|${route ?? ""}`).digest("hex").slice(0, 16);
}

/** JSON body that never leaks a stack trace or an internal host name. */
export function toPublicError(error: unknown): { error: string; category: ErrorCategory; retryable: boolean; status: number } {
  if (error instanceof AppError) {
    return { error: error.message, category: error.category, retryable: error.retryable, status: error.status };
  }
  const { category, message } = classifyError(error);
  const safe = category === "unknown" || category === "render" ? "The request could not be completed." : message.slice(0, 200);
  return { error: safe, category, retryable: defaultRetryable(category), status: defaultStatus(category) };
}

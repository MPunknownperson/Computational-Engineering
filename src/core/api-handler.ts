/**
 * Wrap a route handler so that every failure is classified, recorded as an
 * incident, run through the remediation engine and answered with a safe,
 * consistent JSON body. Successful responses carry `Server-Timing` so the
 * engine status page can show per-request latency.
 */
import { NextResponse } from "next/server";
import { AppError, toPublicError } from "./errors";
import { captureAndRemediate } from "@/lib/remediation/engine";

export type HandlerContext = { request: Request; url: URL; startedAt: number };

export function withApiHandler(name: string, handler: (ctx: HandlerContext) => Promise<Response>) {
  return async function wrapped(request: Request): Promise<Response> {
    const startedAt = Date.now();
    const url = new URL(request.url);
    try {
      const response = await handler({ request, url, startedAt });
      response.headers.set("Server-Timing", `app;dur=${Date.now() - startedAt};desc="${name}"`);
      return response;
    } catch (error) {
      const publicError = toPublicError(error);
      // Validation and not-found are user input, not system faults; skip remediation.
      const systemic = !(publicError.category === "validation" || publicError.category === "not_found");
      const remediation = systemic
        ? await Promise.race([
            captureAndRemediate({ origin: "server", error, route: `${request.method} ${url.pathname}`, context: { query: Object.fromEntries(url.searchParams.entries()), handler: name } }),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 2_500)),
          ]).catch(() => null)
        : null;
      const body = {
        ...publicError,
        remediation: remediation ? { playbook: remediation.plan.playbook, summary: remediation.plan.summary, clientActions: remediation.plan.clientActions, verified: remediation.verified, fingerprint: remediation.fingerprint } : null,
      };
      return NextResponse.json(body, { status: publicError.status, headers: { "Cache-Control": "no-store", "Server-Timing": `app;dur=${Date.now() - startedAt};desc="${name}-error"` } });
    }
  };
}

export function requireParam(url: URL, key: string, pattern: RegExp, fallback?: string): string {
  const value = (url.searchParams.get(key) ?? fallback ?? "").trim();
  if (!value || !pattern.test(value)) throw new AppError("validation", `Parameter "${key}" is missing or invalid.`);
  return value;
}

export function intParam(url: URL, key: string, fallback: number, min: number, max: number): number {
  const raw = url.searchParams.get(key);
  if (raw === null || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new AppError("validation", `Parameter "${key}" must be a number.`);
  return Math.min(max, Math.max(min, Math.round(value)));
}

export async function readJson<T>(request: Request, validate: (body: unknown) => T): Promise<T> {
  let body: unknown;
  try { body = await request.json(); } catch { throw new AppError("validation", "Request body must be valid JSON."); }
  return validate(body);
}

/** Workspace token: random browser-generated id, never an account. */
export function workspaceFrom(request: Request): string {
  const token = request.headers.get("x-workspace") ?? "";
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(token)) throw new AppError("validation", "A workspace token header is required.");
  return token;
}

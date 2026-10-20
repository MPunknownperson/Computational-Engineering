import { timingSafeEqual } from "node:crypto";

/**
 * Operator authentication for private backend endpoints (workbench shell,
 * archive and tool installation, raw NLU logs, regression replay).
 *
 * A single bearer secret, `WORKBENCH_API_KEY`, at least 32 bytes long. The
 * comparison is constant-time and an unset or short key disables access
 * entirely rather than failing open.
 */
export function hasAdminKey(request: Request): boolean {
  const expected = process.env.WORKBENCH_API_KEY;
  if (!expected || Buffer.byteLength(expected, "utf8") < 32) return false;
  const supplied = (request.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i)?.[1] ?? "";
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(supplied, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

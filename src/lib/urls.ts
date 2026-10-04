// One rule for links, form destinations, presets and fragments: remain on the
// current origin. Never accept an arbitrary absolute destination from input.
export function internalHref(
  path: string,
  params: Record<string, string | number | undefined> = {},
  fragment?: string,
): string {
  if (!/^\/(?!\/)/.test(path) || /[\\?#\s]/.test(path)) throw new Error("Expected a root-relative path.");
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value));
  }
  const suffix = query.toString();
  return `${path}${suffix ? `?${suffix}` : ""}${fragment ? `#${encodeURIComponent(fragment)}` : ""}`;
}

/** Validated origin used only when discovery protocols require absolute URLs. */
export function originFromHeaders(h: Pick<Headers, "get">): string {
  // Optional primary-domain preference for aliases; not used by internal links.
  const configured = process.env.SITE_CANONICAL_ORIGIN;
  if (configured) {
    const url = new URL(configured);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      throw new Error("SITE_CANONICAL_ORIGIN must be an HTTP(S) origin without a path.");
    }
    return url.origin;
  }
  // Only trust forwarded host values when the deployment explicitly opts in.
  const host = (process.env.TRUST_PROXY_HEADERS === "true" ? h.get("x-forwarded-host")?.split(",")[0] : null) ?? h.get("host");
  if (!host || !/^(?:[a-z\d.-]+|\[[a-f\d:]+\])(?::\d{1,5})?$/i.test(host)) throw new Error("A valid request host is required.");
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(?::|$)/.test(host);
  const protocol = local ? "http" : "https";
  return new URL(`${protocol}://${host}`).origin;
}

export function absoluteUrl(origin: string, path: string): string {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) throw new Error("Expected an internal path.");
  return new URL(path, origin).href;
}

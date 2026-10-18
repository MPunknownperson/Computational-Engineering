/**
 * Server-side visitor geolocation.
 *
 * Resolution order (first trusted answer wins):
 *   1. Location headers injected by the hosting edge (Cloudflare, Vercel,
 *      CloudFront, Fastly, Akamai, Google Cloud, Azure Front Door, nginx GeoIP…).
 *   2. A server-side IP geolocation lookup of the connecting address, cached
 *      in memory so the external service is asked at most once per IP.
 *
 * The result is written to internal `x-rl-geo-*` request headers by the proxy
 * so every server component and route handler reads the same answer. Client
 * supplied copies of those headers are always stripped first.
 */

export const RESOLVED_GEO_COUNTRY_HEADER = "x-rl-geo-country";
export const RESOLVED_GEO_REGION_HEADER = "x-rl-geo-region";
export const RESOLVED_GEO_SOURCE_HEADER = "x-rl-geo-source";

export interface ResolvedGeo {
  country: string;
  region: string | null;
  source: string;
}

const INVALID_COUNTRIES = new Set(["XX", "ZZ", "EU", "T1", "A1", "A2", "O1", "AP"]);

export function cleanCountry(value: string | null | undefined): string | null {
  const country = value?.trim().toUpperCase();
  return country && /^[A-Z]{2}$/.test(country) && !INVALID_COUNTRIES.has(country) ? country : null;
}

export function cleanRegion(value: string | null | undefined): string | null {
  const region = value?.trim().toUpperCase().replace(/^[A-Z]{2}-/, "");
  return region && /^[A-Z0-9]{1,3}$/.test(region) ? region : null;
}

/** Header pairs set by well-known hosting edges / reverse proxies. */
const EDGE_HEADERS: Array<{ source: string; country: string; region?: string }> = [
  { source: "cloudflare", country: "cf-ipcountry", region: "cf-region-code" },
  { source: "vercel", country: "x-vercel-ip-country", region: "x-vercel-ip-country-region" },
  { source: "cloudfront", country: "cloudfront-viewer-country", region: "cloudfront-viewer-country-region" },
  { source: "fastly", country: "fastly-client-country-code", region: "fastly-client-region" },
  { source: "netlify", country: "x-nf-country", region: "x-nf-subdivision" },
  { source: "fly", country: "fly-client-country" },
  { source: "google", country: "x-client-geo-country", region: "x-client-geo-region" },
  { source: "appengine", country: "x-appengine-country", region: "x-appengine-region" },
  { source: "azure", country: "x-azure-clientip-country" },
  { source: "akamai", country: "x-akamai-edgescape-country-code", region: "x-akamai-edgescape-region" },
  { source: "geoip", country: "x-geo-country", region: "x-geo-region" },
  { source: "geoip", country: "x-geoip-country-code", region: "x-geoip-region-code" },
  { source: "geoip", country: "x-country-code", region: "x-region-code" },
  { source: "geoip", country: "x-country", region: "x-region" },
];

export function geoFromEdgeHeaders(headers: Pick<Headers, "get">): ResolvedGeo | null {
  for (const edge of EDGE_HEADERS) {
    const country = cleanCountry(headers.get(edge.country));
    if (!country) continue;
    return { country, region: edge.region ? cleanRegion(headers.get(edge.region)) : null, source: edge.source };
  }
  return null;
}

/* ------------------------------------------------------------------------ */
/* Client IP                                                                 */
/* ------------------------------------------------------------------------ */

const IP_HEADERS = ["cf-connecting-ip", "true-client-ip", "x-real-ip", "x-client-ip", "fastly-client-ip", "fly-client-ip", "x-forwarded-for", "forwarded"];

function stripPort(ip: string): string {
  const value = ip.trim().replace(/^"|"$/g, "");
  if (value.startsWith("[")) return value.slice(1, value.indexOf("]"));
  const parts = value.split(":");
  return parts.length === 2 ? parts[0] : value;
}

function isPublicIp(ip: string): boolean {
  if (/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 169 && b === 254) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    return true;
  }
  if (ip.includes(":")) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower.startsWith("fe80") || lower.startsWith("fc") || lower.startsWith("fd")) return false;
    if (lower.startsWith("::ffff:")) return isPublicIp(lower.slice(7));
    return true;
  }
  return false;
}

export function clientIp(headers: Pick<Headers, "get">): string | null {
  for (const name of IP_HEADERS) {
    const raw = headers.get(name);
    if (!raw) continue;
    const candidates = name === "forwarded"
      ? [...raw.matchAll(/for=("?\[?[^;,"\]]+\]?"?)/gi)].map((m) => m[1])
      : raw.split(",");
    for (const candidate of candidates) {
      const ip = stripPort(candidate);
      if (ip && isPublicIp(ip)) return ip;
    }
  }
  return null;
}

/* ------------------------------------------------------------------------ */
/* IP lookup with cache                                                      */
/* ------------------------------------------------------------------------ */

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_MAX = 5_000;
type CacheEntry = { value: ResolvedGeo | null; expires: number };

const globalStore = globalThis as unknown as { __rlGeoCache?: Map<string, CacheEntry>; __rlGeoPending?: Map<string, Promise<ResolvedGeo | null>> };
const cache = (globalStore.__rlGeoCache ??= new Map<string, CacheEntry>());
const pending = (globalStore.__rlGeoPending ??= new Map<string, Promise<ResolvedGeo | null>>());

function remember(ip: string, value: ResolvedGeo | null, ttl = CACHE_TTL_MS) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
  cache.set(ip, { value, expires: Date.now() + ttl });
}

async function fetchJson(url: string, ms: number): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" }, cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type Provider = (ip: string, ms: number) => Promise<ResolvedGeo | null>;

const providers: Provider[] = [
  async (ip, ms) => {
    const data = await fetchJson(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, ms);
    if (!data || data.error) return null;
    const country = cleanCountry(String(data.country_code ?? data.country ?? ""));
    return country ? { country, region: cleanRegion(String(data.region_code ?? "")), source: "ip-lookup" } : null;
  },
  async (ip, ms) => {
    const data = await fetchJson(`https://ipwho.is/${encodeURIComponent(ip)}`, ms);
    if (!data || data.success === false) return null;
    const country = cleanCountry(String(data.country_code ?? ""));
    return country ? { country, region: cleanRegion(String(data.region_code ?? "")), source: "ip-lookup" } : null;
  },
  async (ip, ms) => {
    const data = await fetchJson(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode,region`, ms);
    if (!data || data.status !== "success") return null;
    const country = cleanCountry(String(data.countryCode ?? ""));
    return country ? { country, region: cleanRegion(String(data.region ?? "")), source: "ip-lookup" } : null;
  },
];

function lookupsEnabled(): boolean {
  const flag = (process.env.PRIVACY_GEO_LOOKUP ?? "on").toLowerCase();
  return !["off", "false", "0", "disabled"].includes(flag);
}

export async function lookupIp(ip: string, timeoutMs = 2_000): Promise<ResolvedGeo | null> {
  const hit = cache.get(ip);
  if (hit && hit.expires > Date.now()) return hit.value;
  const inflight = pending.get(ip);
  if (inflight) return inflight;
  const task = (async () => {
    for (const provider of providers) {
      const result = await provider(ip, timeoutMs);
      if (result) { remember(ip, result); return result; }
    }
    // Negative results are cached briefly so a flaky upstream is not hammered.
    remember(ip, null, 5 * 60 * 1000);
    return null;
  })().finally(() => pending.delete(ip));
  pending.set(ip, task);
  return task;
}

/* ------------------------------------------------------------------------ */
/* Public API                                                                */
/* ------------------------------------------------------------------------ */

/** Already-resolved answer injected by the proxy, if any. */
export function resolvedGeoFromHeaders(headers: Pick<Headers, "get">): ResolvedGeo | null {
  const country = cleanCountry(headers.get(RESOLVED_GEO_COUNTRY_HEADER));
  if (!country) return null;
  return { country, region: cleanRegion(headers.get(RESOLVED_GEO_REGION_HEADER)), source: headers.get(RESOLVED_GEO_SOURCE_HEADER) ?? "proxy" };
}

/** Full resolution: injected → edge headers → cached IP lookup. */
export async function resolveVisitorGeo(headers: Pick<Headers, "get">): Promise<ResolvedGeo | null> {
  const injected = resolvedGeoFromHeaders(headers);
  if (injected) return injected;
  const edge = geoFromEdgeHeaders(headers);
  if (edge) return edge;
  if (!lookupsEnabled()) return null;
  const ip = clientIp(headers);
  if (!ip) return null;
  return lookupIp(ip);
}

/** Strip any client-supplied copies, then write the resolved location. */
export function applyResolvedGeo(headers: Headers, geo: ResolvedGeo | null) {
  headers.delete(RESOLVED_GEO_COUNTRY_HEADER);
  headers.delete(RESOLVED_GEO_REGION_HEADER);
  headers.delete(RESOLVED_GEO_SOURCE_HEADER);
  if (!geo) return;
  headers.set(RESOLVED_GEO_COUNTRY_HEADER, geo.country);
  if (geo.region) headers.set(RESOLVED_GEO_REGION_HEADER, geo.region);
  headers.set(RESOLVED_GEO_SOURCE_HEADER, geo.source);
}

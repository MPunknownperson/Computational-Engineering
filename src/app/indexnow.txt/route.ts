// IndexNow keys are public proof-of-control tokens, not private API credentials.
// The endpoint is absent until a valid deployment key is configured.
export const dynamic = "force-dynamic";
export function GET() {
  const key = process.env.INDEXNOW_KEY ?? "";
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) return new Response("Not configured", { status: 404 });
  return new Response(key, { headers: {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex",
  } });
}

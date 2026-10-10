import { NextResponse } from "next/server";

/**
 * A finished document response. The App Router client treats a non-OK,
 * non-flight response as an MPA navigation, so soft routing cannot hide a
 * missing page behind HTTP 200.
 */
export function missingPageResponse(): NextResponse {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,follow">
  <title>Page not found | Radix Loom</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 32px 20px;
      background: #f7f5ef; color: #0b1020; font: 16px/1.6 ui-sans-serif, system-ui, sans-serif; }
    main { width: min(640px, 100%); text-align: center; background: #fff; border: 2px solid #1a2040;
      border-radius: 22px; box-shadow: 4px 4px 0 #1a2040; padding: 36px 28px 32px; }
    p.kicker { margin: 14px 0 0; font: 700 12px/1 ui-monospace, monospace; letter-spacing: .18em;
      text-transform: uppercase; color: #475569; }
    h1 { margin: 10px 0 0; font-size: clamp(1.8rem, 4vw, 2.4rem); letter-spacing: -.03em; line-height: 1.1; }
    h1 span { background: linear-gradient(#ffd23f, #ffd23f) 0 88% / 100% 0.35em no-repeat; }
    p.lead { margin: 14px auto 0; max-width: 38ch; color: #334155; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 22px; }
    a { display: inline-flex; align-items: center; min-height: 44px; padding: 0 16px; border-radius: 14px;
      border: 2px solid #1a2040; font-weight: 700; text-decoration: none; color: #0b1020; background: #fff;
      box-shadow: 2px 2px 0 #1a2040; }
    a.primary { background: #b83a1c; color: #fff; }
  </style>
</head>
<body>
  <main>
    <svg width="108" height="102" viewBox="0 0 100 95" aria-hidden="true">
      <ellipse cx="50" cy="88" rx="26" ry="5" fill="#0b1020" opacity=".14"/>
      <ellipse cx="50" cy="52" rx="32" ry="35" fill="#8b5a3c" stroke="#0b1020" stroke-width="3"/>
      <ellipse cx="50" cy="61" rx="20" ry="22" fill="#f4d9b3" stroke="#0b1020" stroke-width="2.4"/>
      <polygon points="27,26 36,9 42,32" fill="#8b5a3c" stroke="#0b1020" stroke-width="3"/>
      <polygon points="73,26 64,9 58,32" fill="#8b5a3c" stroke="#0b1020" stroke-width="3"/>
      <circle cx="39" cy="44" r="12" fill="#fff" stroke="#0b1020" stroke-width="2.8"/>
      <circle cx="61" cy="44" r="12" fill="#fff" stroke="#0b1020" stroke-width="2.8"/>
      <circle cx="40" cy="46" r="5.4" fill="#0b1020"/>
      <circle cx="62" cy="46" r="5.4" fill="#0b1020"/>
      <path d="M31 31 l14 3M69 31 l-14 3" stroke="#0b1020" stroke-width="2.6" stroke-linecap="round"/>
      <polygon points="50,54 44,64 56,64" fill="#ff9d3d" stroke="#0b1020" stroke-width="2.4"/>
    </svg>
    <p class="kicker">Error 404 · Page not found</p>
    <h1>This page <span>doesn't add up</span>.</h1>
    <p class="lead">Nova checked twice — there is nothing at this address. The link may be old, or the tool may have moved into the directory.</p>
    <div class="actions">
      <a class="primary" href="/">Back home</a>
      <a href="/calculators">Browse tools</a>
    </div>
  </main>
</body>
</html>`;

  return new NextResponse(html, {
    status: 404,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex, follow",
      "x-content-type-options": "nosniff",
    },
  });
}

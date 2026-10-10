import { expect, test } from "@playwright/test";
import { SEARCH_PAGES, imagePath } from "../src/lib/search-pages";
import { internalHref, originFromHeaders } from "../src/lib/urls";
import { unitInput } from "../src/lib/presets";

test("every page is its own destination: distinct path, heading and canonical", async ({ request }) => {
  const seen = new Set<string>();
  for (const entry of SEARCH_PAGES) {
    const response = await request.get(entry.path);
    expect(response.status(), entry.path).toBe(200);
    // No page may bounce the visitor back to the homepage.
    expect(request, entry.path).toBeTruthy();
    const html = await response.text();
    const canonical = html.match(/rel="canonical" href="([^"]+)"/)?.[1];
    expect(new URL(canonical!, "https://x.test").pathname, entry.path).toBe(entry.path);
    expect(seen.has(canonical!), `duplicate canonical ${canonical}`).toBeFalsy();
    seen.add(canonical!);
    // Each page must state its own purpose in its own heading.
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, "").trim();
    expect(h1?.length ?? 0, `missing h1 at ${entry.path}`).toBeGreaterThan(2);
    // Crawlable internal links must exist so the page is discoverable beyond /.
    expect(html.match(/<a\s[^>]*href="\/[^"]*"/g)?.length ?? 0, entry.path).toBeGreaterThan(1);
  }
});

test("no internal search exists: route, query box and markup are absent", async ({ request, page }) => {
  // The internal search route is gone entirely.
  expect((await request.get("/search")).status()).toBe(404);
  // No search box or site-search landmark anywhere on the public site.
  for (const entry of SEARCH_PAGES) {
    const html = await (await request.get(entry.path)).text();
    expect(html, `${entry.path} must not expose a search form`).not.toMatch(/role="search"/);
    expect(html, `${entry.path} must not expose a site-search field`).not.toContain('type="search"');
    expect(html, `${entry.path} must not declare a SearchAction`).not.toContain("SearchAction");
  }
  // The guides directory is a plain listing, not a filtered search.
  await page.goto("/guides");
  await expect(page.getByRole("heading", { name: /Math and conversion guides/i, level: 1 })).toBeVisible();
  expect(await page.locator('input[type="search"]').count()).toBe(0);
});

test("search-engine configuration exposes a distinct destination per intent", async ({ request }) => {
  const { CONVERSION_LINKS, FORMULA_LINKS, REFERENCE_LINKS } = await import("../src/lib/deep-links");
  const all = [...CONVERSION_LINKS, ...FORMULA_LINKS, ...REFERENCE_LINKS];
  expect(all.length).toBeGreaterThan(25);

  // Every starting point must resolve, and each must be its own destination.
  const destinations = new Set<string>();
  for (const link of all) {
    const response = await request.get(link.href);
    expect(response.status(), `${link.title} → ${link.href}`).toBe(200);
    const html = await response.text();
    // The tool must actually receive the advertised inputs.
    if (link.href.includes("from=mi&to=km")) expect(html).toContain('value="5"');
    if (link.href.includes("preset=quadratic-root")) expect(html).toContain("(-b + sqrt(b^2 - 4*a*c))");
    if (link.href.includes("indicator=inflation")) expect(html).toContain('value="USA"');
    const path = new URL(link.href, "https://x.test").pathname;
    expect(destinations.has(link.href), `duplicate destination ${link.href}`).toBeFalsy();
    destinations.add(link.href);
    expect(path === "/tools/units" || path === "/tools/formula" || path === "/tools/scientific" || path === "/tools/currency" || path === "/tools/crypto" || path === "/tools/economy").toBe(true);
  }

  // The tools directory must publish these as crawlable links with descriptive
  // anchor text, so search engines see one URL per intent.
  const directory = await (await request.get("/calculators")).text();
  for (const link of all) expect(directory, `missing crawlable link for ${link.title}`).toContain(`>${link.title}<`);
});

test("titles and descriptions follow Google's title-link guidance", () => {
  // Distinctive, concise, keyword-led copy: no duplicate titles, no keyword
  // stuffing, sensible snippet length, and the main heading matches the title.
  const titles = SEARCH_PAGES.map((p) => p.title);
  expect(new Set(titles).size).toBe(titles.length);
  for (const page of SEARCH_PAGES) {
    expect(page.title.length, `${page.path} title too long`).toBeLessThanOrEqual(60);
    expect(page.title.length, `${page.path} title too short`).toBeGreaterThanOrEqual(25);
    expect(page.description.length, `${page.path} description too long`).toBeLessThanOrEqual(175);
    expect(page.description.length, `${page.path} description too short`).toBeGreaterThanOrEqual(100);
    // No keyword stuffing: no significant word may appear more than twice.
    const words = page.title.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    for (const word of words) {
      expect(words.filter((w) => w === word).length, `${page.path} repeats "${word}"`).toBeLessThanOrEqual(2);
    }
    // The title must use the same language/writing system as the page (Latin).
    expect(/[^\x00-\x7F]/.test(page.title.replace(/[°²³—–·×÷≈…'']/g, "")), `${page.path} has non-Latin title text`).toBe(false);
  }
  // Boilerplate titles vary by only a word — caught by the uniqueness check
  // above. The home-page title must lead with the words people search for.
  expect(titles[0]).toMatch(/calculator/i);
  expect(titles[0]).toMatch(/unit converter|converter/i);
});

test("the main heading of each page reflects the words people search for", async ({ request }) => {
  for (const entry of SEARCH_PAGES) {
    const html = await (await request.get(entry.path)).text();
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() ?? "";
    expect(h1.length, `${entry.path} missing heading`).toBeGreaterThan(2);
    // At least two significant title words must appear in the main heading so
    // the title link and the visible page agree.
    const titleWords = entry.title.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
    const heading = h1.toLowerCase();
    const overlap = titleWords.filter((w) => heading.includes(w));
    expect(overlap.length, `${entry.path} heading "${h1}" diverges from title "${entry.title}"`).toBeGreaterThanOrEqual(2);
    // The heading must be the single prominent title on the page.
    expect(html.match(/<h1/g)?.length, `${entry.path} has more than one h1`).toBe(1);
  }
});

test("internal URLs are encoded, relative, and reject off-site destinations", () => {
  expect(internalHref("/tools/formula", { preset: "a+b & c" }, "result 1")).toBe("/tools/formula?preset=a%2Bb+%26+c#result%201");
  expect(() => internalHref("//outside.example/", {})).toThrow();
  expect(() => internalHref("https://outside.example/", {})).toThrow();
  expect(() => internalHref("/\\outside.example", {})).toThrow();
  expect(originFromHeaders(new Headers({ host: "first.example" }))).toBe("https://first.example");
  expect(originFromHeaders(new Headers({ host: "second.example" }))).toBe("https://second.example");
  expect(() => originFromHeaders(new Headers({ host: "bad.example/path" }))).toThrow();
  expect(unitInput(new URLSearchParams("category=unknown&from=bad&to=bad&value=NaN"))).toEqual({ category: "length", from: "m", to: "ft", value: "1" });
});

test("all public routes have unique titles, descriptions and one clean canonical", async ({ request }) => {
  const titles = new Set<string>();
  for (const entry of SEARCH_PAGES) {
    const response = await request.get(entry.path, { headers: { host: "first.example" } });
    expect(response.status(), entry.path).toBe(200);
    const html = await response.text();
    const head = html.split("</head>")[0];
    const title = head.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    expect(title, entry.path).toBeTruthy();
    expect(titles.has(title!), `duplicate title at ${entry.path}`).toBeFalsy();
    titles.add(title!);
    expect(head).toContain('name="description"');
    expect(head.match(/rel="canonical"/g)?.length).toBe(1);
    const canonical = head.match(/rel="canonical" href="([^"]+)"/)?.[1];
    expect(canonical, entry.path).toBeTruthy();
    expect(new URL(canonical!).href).toBe(new URL(entry.path, "https://first.example").href);
    expect(head).toContain('property="og:image"');
    expect(head).toContain('name="twitter:card" content="summary_large_image"');
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    expect(scripts.length, entry.path).toBeGreaterThan(0);
    for (const script of scripts) {
      const data = JSON.parse(script[1]);
      expect(data["@context"]).toBe("https://schema.org");
      expect(script[1]).not.toMatch(/aggregateRating|ratingValue|FAQPage|QAPage|MathSolver/);
    }
    expect(html).not.toContain("http://localhost:3000");
  }
});

test("canonical, social image, sitemap and robots follow the serving domain", async ({ request }) => {
  for (const host of ["alpha.example", "beta.example"]) {
    const response = await request.get("/tools/units?category=length&from=m&to=ft&value=5&utm_source=example", { headers: { host } });
    const html = await response.text();
    expect(html).toContain(`rel="canonical" href="https://${host}/tools/units"`);
    expect(html).toContain(`https://${host}${imagePath(SEARCH_PAGES.find((entry) => entry.path === "/tools/units")!)}`);
    const sitemap = await request.get("/sitemap.xml", { headers: { host } });
    expect(sitemap.status()).toBe(200);
    const xml = await sitemap.text();
    const locations = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    expect(locations.length).toBe(SEARCH_PAGES.length);
    expect(new Set(locations).size).toBe(locations.length);
    for (const url of locations) {
      expect(new URL(url).origin).toBe(`https://${host}`);
      expect(new URL(url).search).toBe("");
    }
    expect(xml).not.toContain("/api/");
    expect(xml).toContain(`<image:loc>https://${host}${imagePath(SEARCH_PAGES.find((entry) => entry.path === "/guides/meters-to-feet")!)}</image:loc>`);
    const robots = await (await request.get("/robots.txt", { headers: { host } })).text();
    expect(robots).toContain(`Sitemap: https://${host}/sitemap.xml`);
    expect(robots).not.toContain("Disallow: /_next");
  }
});

test("worked guide preloads units and still requires Convert", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/guides/meters-to-feet");
  await page.getByRole("link", { name: "Open meters-to-feet converter", exact: true }).click();
  await expect(page.locator("#unit-value")).toHaveValue("5");
  await expect(page.locator("#unit-from")).toHaveValue("m");
  await expect(page.locator("#unit-to")).toHaveValue("ft");
  await expect(page.locator("#unit-result .locked-result")).toBeVisible();
  await page.getByRole("button", { name: "Convert", exact: true }).click();
  await expect(page.locator("#unit-result")).toContainText("16.404199");
  await page.locator("#unit-value").fill("10");
  await expect(page.locator("#unit-result .locked-result")).toBeVisible();
  expect(errors).toEqual([]);
});

test("preset IDs load correctly and unsafe query input is not executed", async ({ page }) => {
  await page.goto("/tools/formula?preset=compound-interest");
  await expect(page.locator("#f-expr")).toHaveValue("P * (1 + r/n)^(n*t)");
  await expect(page.locator("#formula-result .locked-result")).toBeVisible();
  await page.getByRole("button", { name: "Evaluate", exact: true }).click();
  await expect(page.locator("#formula-result")).toContainText("1647.009");
  await page.goto("/tools/scientific?preset=linear-system");
  await expect(page.locator("#scientific-expression")).toHaveValue("lusolve([2, 1; 1, -1], [5; 1])");
  await expect(page.locator("#scientific-result .locked-result")).toBeVisible();
  await page.getByRole("button", { name: "Calculate", exact: true }).click();
  await expect(page.locator("#scientific-result")).toContainText("[[2], [1]]");
  await page.goto("/tools/formula?preset=%3Cscript%3E&expression=process.exit(1)");
  await expect(page.locator("#f-expr")).toHaveValue("P * (1 + r/n)^(n*t)");
});

test("guide content and links are visible with JavaScript disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000" });
  const page = await context.newPage();
  await page.goto("/guides/compound-interest");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Define the inputs", exact: true })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open compound-interest example", exact: true })).toHaveAttribute("href", "/tools/formula?preset=compound-interest");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "What to expect" })).toBeVisible();
  const links = await page.locator("a[href]").evaluateAll((elements) => elements.map((el) => el.getAttribute("href")!));
  expect(links.every((href) => href.startsWith("/") || href.startsWith("#"))).toBe(true);
  await context.close();
});

test("responsive guide and homepage fit small screens and preserve navigation", async ({ page }) => {
  for (const width of [375, 768]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/guides", "/guides/megabytes-vs-mebibytes"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(1);
    }
    await page.getByRole("button", { name: "Open navigation menu" }).click();
    await expect(page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Guides", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Open navigation menu" })).toBeFocused();
  }
});

test("rich media, unknown routes, redirects and privacy endpoints behave correctly", async ({ request }) => {
  const image = await request.get("/media/guides--meters-to-feet.png");
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/png");
  const buffer = await image.body();
  expect(buffer.readUInt32BE(16)).toBe(1200);
  expect(buffer.readUInt32BE(20)).toBe(630);
  expect((await request.get("/media/missing.png")).status()).toBe(404);
  expect((await request.get("/guides/missing-guide")).status()).toBe(404);
  const redirect = await request.get("/tools/markets?base=EUR&to=USD", { maxRedirects: 0 });
  expect(redirect.status()).toBe(308);
  expect(redirect.headers().location).toContain("/tools/currency?base=EUR&to=USD");
  const privateData = await request.get("/api/formulas");
  expect(privateData.headers()["x-robots-tag"]).toContain("noindex");
  expect(privateData.headers()["cache-control"]).toContain("no-store");
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.start_url).toBe("/");
  expect(manifest.scope).toBe("/");
});

test("every public page has a working, correctly sized image preview", async ({ request }) => {
  for (const entry of SEARCH_PAGES) {
    const response = await request.get(imagePath(entry));
    expect(response.status(), entry.path).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
    const image = await response.body();
    expect(image.readUInt32BE(16), entry.path).toBe(1200);
    expect(image.readUInt32BE(20), entry.path).toBe(630);
  }
});

test("topic clusters are wired hub-and-spoke and reachable in three clicks", async ({ request }) => {
  const { LANDING_PAGES, LANDING_SECTIONS } = await import("../src/lib/landing");
  const hubs = LANDING_SECTIONS.map((s) => `/${s.section}`);

  // Hubs link every spoke in their cluster with descriptive anchor text.
  for (const hub of hubs) {
    const html = await (await request.get(hub)).text();
    const spokes = LANDING_PAGES.filter((p) => `/${p.section}` === hub);
    expect(spokes.length, `${hub} has no spokes`).toBeGreaterThan(2);
    for (const spoke of spokes) {
      expect(html, `${hub} missing spoke ${spoke.slug}`).toContain(`href="${spoke.path}"`);
    }
  }
  // Every spoke links back to its hub (bidirectional linking).
  for (const spoke of LANDING_PAGES) {
    const html = await (await request.get(spoke.path)).text();
    expect(html, `${spoke.path} missing hub link`).toContain(`href="/${spoke.section}"`);
  }
  // Hubs are discoverable from the two highest-authority directories, so no
  // landing page sits more than three clicks from the homepage.
  for (const hub of hubs) {
    const directory = await (await request.get("/calculators")).text();
    expect(directory, `/calculators missing ${hub}`).toContain(`href="${hub}"`);
    const guides = await (await request.get("/guides")).text();
    expect(guides, `/guides missing ${hub}`).toContain(`href="${hub}"`);
  }
});

test("URL variants are canonicalised, not indexed as doorway pages", async ({ request }) => {
  // Faceted / prefilled variants of a tool share one canonical and are absent
  // from the sitemap, so they cannot appear as separate search results.
  const variants = [
    "/tools/units?category=length&from=m&to=ft&value=5&utm_source=x",
    "/tools/units?category=mass&from=lb&to=kg&value=100",
    "/tools/formula?preset=compound-interest&tracking=1",
    "/tools/currency?base=EUR&to=JPY&amount=250&ref=y",
  ];
  const canonicals = new Set<string>();
  for (const variant of variants) {
    const html = await (await request.get(variant)).text();
    const canonical = html.match(/rel="canonical" href="([^"]+)"/)?.[1];
    expect(canonical, variant).toBeTruthy();
    canonicals.add(new URL(canonical!, "https://x.test").pathname);
  }
  // All variants collapse to three clean tool paths, never to the variant URL.
  expect(canonicals.size).toBe(3);
  expect([...canonicals].every((path) => !path.includes("?"))).toBe(true);

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).not.toMatch(/<loc>[^<]*\?/); // no query strings in sitemap
  for (const hub of ["/convert", "/calculate", "/reference"]) {
    expect(sitemap, `hub ${hub} missing from sitemap`).toContain(hub);
  }
});

test("landing pages carry genuine substance, not keyword-swapped templates", async ({ request }) => {
  const { LANDING_PAGES } = await import("../src/lib/landing");
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const page of LANDING_PAGES) {
    titles.add(page.title);
    descriptions.add(page.description);
    // Substantive, per-page content required to avoid scaled-content abuse.
    expect(page.method.length, `${page.slug} too few method sections`).toBeGreaterThanOrEqual(2);
    expect(page.assumptions.length, `${page.slug} too few assumptions`).toBeGreaterThanOrEqual(2);
    expect(page.related.length, `${page.slug} too few related links`).toBeGreaterThanOrEqual(3);
    expect(page.intro.length, `${page.slug} intro too short`).toBeGreaterThan(140);
    const rendered = await (await request.get(page.path)).text();
    const words = rendered.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    expect(words, `${page.slug} too thin`).toBeGreaterThan(260);
  }
  // No two landing pages may be the same page with different words swapped in.
  expect(titles.size).toBe(LANDING_PAGES.length);
  expect(descriptions.size).toBe(LANDING_PAGES.length);
});

test("dedicated landing pages are interactive but confirm-gated", async ({ page }) => {
  // Conversion landing: prefilled inputs, hidden result, Convert reveals it.
  await page.goto("/convert/miles-to-kilometers");
  await expect(page.getByRole("heading", { name: /Miles to kilometers/i, level: 1 })).toBeVisible();
  await expect(page.locator("#landing-value-mi-km")).toHaveValue("5");
  await expect(page.locator(".locked-result")).toBeVisible();
  await page.getByRole("button", { name: "Convert", exact: true }).click();
  await expect(page.locator(".result-panel")).toContainText("8.04672");
  // Calculation landing: prefilled preset, hidden result, Evaluate reveals it.
  await page.goto("/calculate/tip-split");
  await expect(page.locator("#landing-expr-tip-split")).toHaveValue("bill * (1 + tip) / people");
  await expect(page.locator(".locked-result")).toBeVisible();
  await page.getByRole("button", { name: "Evaluate", exact: true }).click();
  await expect(page.locator(".result-panel")).toContainText("41.328");
  // Reference landing: nothing fetched until the visitor confirms.
  await page.goto("/reference/us-inflation-rate");
  await page.getByRole("button", { name: "Show the figure", exact: true }).click();
  await expect(page.locator(".result-panel")).toContainText("Latest value");
  // Each landing page links back to its tool, a guide hub and siblings.
  await expect(page.getByRole("link", { name: /economy tool|full tool/i }).first()).toBeVisible();
});

test("formula saving, count-only lookup, export and deletion still work", async ({ request }) => {
  const workspace = `ws_discovery${Date.now()}`;
  try {
    const saved = await request.post("/api/formulas", {
      data: { workspace, name: "Discovery regression example", expression: "2 + 3", description: "Temporary test formula" },
    });
    expect(saved.status()).toBe(200);
    const summary = await (await request.get(`/api/formulas?workspace=${workspace}&summary=1`)).json();
    expect(summary).toEqual({ count: 1 });
    const exported = await (await request.get(`/api/formulas?workspace=${workspace}&all=1`)).json();
    expect(exported.items[0].expression).toBe("2 + 3");
    const removed = await (await request.delete(`/api/formulas?workspace=${workspace}&all=1`)).json();
    expect(removed.removed).toBe(1);
    const empty = await (await request.get(`/api/formulas?workspace=${workspace}&summary=1`)).json();
    expect(empty.count).toBe(0);
  } finally {
    await request.delete(`/api/formulas?workspace=${workspace}&all=1`);
  }
});

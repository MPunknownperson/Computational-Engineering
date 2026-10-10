import { createHmac, randomBytes } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { expect, test } from "@playwright/test";
import { PRIVACY_REGIONS } from "@/lib/privacy/regions";
import { trustedPrivacyCountry } from "@/lib/privacy/geo";
import { PRIVACY_CHOICES_PATH } from "@/lib/privacy/constants";

loadEnv({ quiet: true });

function signedCountry(country: string, secret = process.env.PRIVACY_GEO_SIGNING_SECRET, time = Date.now()) {
  if (!secret) throw new Error("Regional integration tests require the configured server-only signing secret.");
  const timestamp = String(time);
  return {
    "x-privacy-geo-country": country,
    "x-privacy-geo-timestamp": timestamp,
    "x-privacy-geo-signature": createHmac("sha256", secret).update(`${country}.${timestamp}`).digest("hex"),
  };
}

test("country resolver fails closed and never treats language as location", () => {
  const secret = randomBytes(32).toString("hex");
  const options = { provider: "signed-header", signingSecret: secret };
  const now = Date.now();
  expect(trustedPrivacyCountry(new Headers({ "accept-language": "pt-BR", "cf-ipcountry": "BR", "x-page-tone": "brazil" }), options, now)).toBeNull();
  expect(trustedPrivacyCountry(new Headers(signedCountry("BR", secret, now)), options, now)).toBe("BR");
  expect(trustedPrivacyCountry(new Headers(signedCountry("BR", secret, now - 360_000)), options, now)).toBeNull();
  expect(trustedPrivacyCountry(new Headers(signedCountry("BR", "wrong-secret-".repeat(4), now)), options, now)).toBeNull();
  expect(trustedPrivacyCountry(new Headers(signedCountry("BR", secret, now)), { provider: "disabled", signingSecret: secret }, now)).toBeNull();
});

test("GDPR and CCPA are consolidated on the main policy with the official icon", async ({ page, request }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy Policy", exact: true })).toBeVisible();
  await expect(page.locator("#gdpr")).toContainText("GDPR");
  await expect(page.locator("#ccpa")).toContainText("California");
  await expect(page.locator("#ccpa-title img")).toHaveAttribute("src", "/icons/california-privacy-options.svg");
  await expect(page.locator("#ccpa").getByRole("link", { name: /Do Not Sell or Share My Personal Information/ })).toHaveAttribute("href", PRIVACY_CHOICES_PATH);
  expect((await request.get("/privacy/gdpr")).status()).toBe(404);
  expect((await request.get("/privacy/ccpa")).status()).toBe(404);
  const policy = await (await request.get("/privacy")).text();
  expect(policy).not.toContain("There is no “Do Not Sell");
  expect(policy).not.toContain("Your rights under the LGPD");
});

for (const region of PRIVACY_REGIONS) {
  test(`${region.name} supplement only renders for its signed country`, async ({ request }) => {
    const url = `/privacy/regions/${region.slug}`;
    const blocked = await request.get(url);
    expect(blocked.status()).toBe(403);
    expect(blocked.headers()["cache-control"]).toContain("no-store");
    expect(await blocked.text()).not.toContain(`id="regional-clause-0"`);
    expect((await request.get(url, { headers: signedCountry(region.country === "BR" ? "CA" : "BR") })).status()).toBe(403);

    const response = await request.get(url, { headers: signedCountry(region.country) });
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
    const html = await response.text();
    expect(html).toContain(`${region.name} Privacy Supplement`);
    expect(html).toContain("This supplement forms part of the overall Radix Loom Privacy Policy.");
    expect(html).toContain('id="regional-clause-0"');
  });
}

test("country overrides, forged headers, HEAD and RSC cannot bypass regional access", async ({ request }) => {
  const url = "/privacy/regions/brazil";
  const attempts: Array<Record<string, string>> = [
    { "cf-ipcountry": "BR" },
    { "x-vercel-ip-country": "BR" },
    { "accept-language": "pt-BR", "x-privacy-country": "BR" },
    { ...signedCountry("BR"), "x-privacy-geo-country": "CA" },
  ];
  for (const headers of attempts) {
    expect((await request.get(`${url}?country=BR&region=BR`, { headers })).status()).toBe(403);
  }
  const rsc = await request.get(`${url}?_rsc=test`, { headers: { RSC: "1", "Next-Router-Prefetch": "1" } });
  expect(rsc.status()).toBe(403);
  expect(await rsc.text()).not.toContain("Your rights under the LGPD");
  expect((await request.head(url)).status()).toBe(403);
  expect((await request.get("/privacy/regions/unknown", { headers: signedCountry("BR") })).status()).toBe(404);
});

test("regional links are per-request and excluded from public discovery", async ({ request }) => {
  const brazil = await (await request.get("/privacy", { headers: signedCountry("BR") })).text();
  expect(brazil).toContain('href="/privacy/regions/brazil"');
  expect(brazil).not.toContain('href="/privacy/regions/canada"');
  const canada = await (await request.get("/privacy", { headers: signedCountry("CA") })).text();
  expect(canada).toContain('href="/privacy/regions/canada"');
  expect(canada).not.toContain('href="/privacy/regions/brazil"');
  const unknown = await (await request.get("/privacy")).text();
  expect(unknown).not.toMatch(/href="\/privacy\/regions\//);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).not.toContain("/privacy/regions/");
  expect(sitemap).toContain(PRIVACY_CHOICES_PATH);
});

test("California choices use local official artwork and a conspicuous footer link", async ({ page, request }) => {
  await page.goto("/");
  const link = page.getByRole("contentinfo").getByRole("link", { name: /Do Not Sell or Share My Personal Information/ });
  await expect(link).toHaveAttribute("href", PRIVACY_CHOICES_PATH);
  await expect(link.locator("img")).toHaveAttribute("alt", "California Consumer Privacy Act (CCPA) Opt-Out Icon");
  const icon = await request.get("/icons/california-privacy-options.svg");
  expect(icon.status()).toBe(200);
  expect(await icon.text()).toContain("#0066FF");
  await page.goto(PRIVACY_CHOICES_PATH);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Do Not Sell or Share My Personal Information");
  await expect(page.getByRole("button", { name: "Opt out of sale and sharing" })).toBeVisible();
  expect((await request.get(PRIVACY_CHOICES_PATH, { headers: signedCountry("JP") })).status()).toBe(200);
});

test("manual opt-out persists without personal information and survives reload", async ({ page }) => {
  await page.goto(PRIVACY_CHOICES_PATH);
  await page.getByRole("button", { name: "Opt out of sale and sharing" }).click();
  await expect(page.getByRole("button", { name: "Opt-out saved for this browser" })).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("opt-out is active");
  await page.reload();
  await expect(page.getByRole("button", { name: "Opt-out saved for this browser" })).toBeDisabled();
  const status = await page.evaluate(async () => (await fetch("/api/privacy/choices")).json());
  expect(status).toMatchObject({ optedOut: true, stored: true, source: "manual", saleOrSharingEnabled: false });
  expect(status.id).toBeUndefined();
  const cookies = await page.context().cookies();
  expect(cookies.find((cookie) => cookie.name === "radixloom.privacy-choice")?.httpOnly).toBe(true);
});

test("GPC is honored without confirmation and cannot be reversed by the API", async ({ page }) => {
  await page.context().setExtraHTTPHeaders({ "Sec-GPC": "1" });
  await page.goto(PRIVACY_CHOICES_PATH);
  await expect(page.getByRole("status")).toContainText("Global Privacy Control is detected and honored");
  await expect(page.getByRole("status")).toContainText("opt-out is active");
  const undo = await page.request.post("/api/privacy/choices", { data: { action: "opt-in" } });
  expect(undo.status()).toBe(400);
  await page.context().setExtraHTTPHeaders({});
  await page.reload();
  await expect(page.getByRole("status")).toContainText("opt-out is active");
});

test("browser-only GPC property is respected when no header is exposed", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "globalPrivacyControl", { value: true, configurable: true }));
  await page.goto(PRIVACY_CHOICES_PATH);
  await expect(page.getByRole("status")).toContainText("Global Privacy Control is detected and honored");
  await expect(page.getByRole("button", { name: "Opt-out saved for this browser" })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole("status")).toContainText("Global Privacy Control is detected and honored");
});

test("HTML form records a privacy choice with JavaScript disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL: "http://127.0.0.1:3000" });
  const page = await context.newPage();
  try {
    await page.goto(PRIVACY_CHOICES_PATH);
    await page.getByRole("button", { name: "Opt out of sale and sharing" }).click();
    await expect(page).toHaveURL(/do-not-sell-or-share\?saved=1$/);
    await expect(page.getByRole("status")).toContainText("opt-out is active");
    await expect(page.getByRole("button", { name: "Opt-out saved for this browser" })).toBeDisabled();
  } finally { await context.close(); }
});

test("preference API rejects malformed and cross-site changes, with no caching", async ({ request }) => {
  const malformed = await request.post("/api/privacy/choices", { data: "{", headers: { "content-type": "application/json" } });
  expect(malformed.status()).toBe(400);
  const crossSite = await request.post("/api/privacy/choices", { data: { action: "opt-out" }, headers: { origin: "https://untrusted.example", "sec-fetch-site": "cross-site" } });
  expect(crossSite.status()).toBe(403);
  const status = await request.get("/api/privacy/choices");
  expect(status.headers()["cache-control"]).toContain("no-store");
  expect(await status.json()).toMatchObject({ saleOrSharingEnabled: false });
});

import { trustedGeoHeaders } from "./support/geography";
import { expect, test } from "@playwright/test";
import { mediaAssets } from "@/lib/media/assets";

test("guide art has hashed lossless variants with immutable caching", async ({ request }) => {
  const assets = mediaAssets("guides--meters-to-feet")!;
  expect(assets.variants.map(({ width }) => width)).toEqual([400, 800, 1200]);
  const image = await request.get(assets.variants[0].src);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/webp");
  expect(image.headers()["cache-control"]).toContain("immutable");
  expect((await image.body()).length).toBeLessThan(60_000);
  const legacy = await request.get("/media/guides--meters-to-feet.png");
  expect(legacy.status()).toBe(200);
  expect(legacy.headers()["content-type"]).toContain("image/png");
});

test("guide thumbnails use responsive static art, not runtime image generation", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.goto("/guides");
  const first = page.locator("picture img").first();
  await first.scrollIntoViewIfNeeded();
  await expect(first).toBeVisible();
  await expect.poll(() => first.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  const source = await first.evaluate((img: HTMLImageElement) => img.currentSrc);
  expect(source).toMatch(/\.[a-f0-9]{12}\.(400|800|1200)\.webp$/);
  expect(source).not.toContain("/_next/image");
  await expect(first).toHaveAttribute("loading", "eager");
});

test("navigation preserves its wrapper, stays readable and retains browser history", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const root = await page.locator("[data-route-surface]").elementHandle();
  await page.getByRole("navigation", { name: "Primary", exact: true }).getByRole("link", { name: "Guides" }).click();
  await expect(page).toHaveURL(/\/guides$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("guides");
  expect(await root!.evaluate((node) => node.isConnected)).toBe(true);
  expect(await page.locator("[data-route-surface]").evaluate((node) => getComputedStyle(node).opacity)).toBe("1");
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Free online calculator");
  expect(errors).toEqual([]);
});

test("hover never places glow or sheen overlays over readable text", async ({ page }) => {
  await page.goto("/");
  const button = page.getByRole("link", { name: "Browse the tools" });
  await button.hover();
  const style = await button.evaluate((node) => ({
    before: getComputedStyle(node, "::before").content,
    after: getComputedStyle(node, "::after").content,
    color: getComputedStyle(node).color,
    background: getComputedStyle(node).backgroundColor,
  }));
  expect(["none", "normal"]).toContain(style.before);
  expect(["none", "normal"]).toContain(style.after);
  expect(style.color).toBe("rgb(255, 255, 255)");
  expect(style.background).not.toBe("rgba(0, 0, 0, 0)");
});

for (const [locale, phrase] of [["es-MX", "70 kilos en libras"], ["fr-FR", "70 kilos en livres"], ["de-DE", "70 Kilo in Pfund"]]) {
  test(`non-English browser speech keeps ${locale} and does not invoke an alternate speech engine`, async ({ browser }) => {
    const context = await browser.newContext({ locale, extraHTTPHeaders: trustedGeoHeaders("US", "NY") });
    const page = await context.newPage();
    try {
      await page.addInitScript(({ phrase }) => {
        const w = window as unknown as Record<string, unknown>;
        const probe = { language: "", modelCalls: 0 };
        w.__languageProbe = probe;
        w.LanguageModel = {
          availability: async () => { probe.modelCalls++; return "available"; },
          create: async () => { probe.modelCalls++; throw new Error("English model must not be called"); },
        };
        navigator.mediaDevices.getUserMedia = async () => ({ getTracks: () => [{ stop() {} }] }) as unknown as MediaStream;
        class Recognition {
          lang = "";
          onresult: ((event: unknown) => void) | null = null;
          onerror = null;
          onend = null;
          start() {
            probe.language = this.lang;
            this.onresult?.({ results: [{ length: 1, 0: { transcript: phrase, confidence: .95 } }] });
          }
          stop() {}
          abort() {}
        }
        w.SpeechRecognition = Recognition;
        delete w.webkitSpeechRecognition;
      }, { phrase });
      await page.goto("/calculators");
      const button = page.locator("section[aria-labelledby='voice-heading'] button.btn-primary");
      await expect(button).toBeEnabled();
      await button.click();
      await expect.poll(() => page.evaluate(() => (window as unknown as { __languageProbe: { language: string } }).__languageProbe.language)).toBe(locale);
      expect(await page.evaluate(() => (window as unknown as { __languageProbe: { modelCalls: number } }).__languageProbe.modelCalls)).toBe(0);
    } finally { await context.close(); }
  });
}


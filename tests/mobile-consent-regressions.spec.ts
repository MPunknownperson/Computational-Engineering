import { devices, expect, test } from "@playwright/test";
import { regimeFromTimezone } from "@/lib/privacy/consent-regime";
import { decideVoiceProcessing } from "@/lib/voice/policy";

const regimes = [
  ["gdpr", "GDPR", "Europe/Berlin"], ["ccpa", "California", "America/Los_Angeles"],
  ["lgpd", "Brazil", "America/Sao_Paulo"], ["pipeda", "Canada", "America/Toronto"],
  ["au", "Australia", "Australia/Sydney"], ["pdpa", "Singapore", "Asia/Singapore"],
  ["appi", "Japan", "Asia/Tokyo"], ["dpdp", "India", "Asia/Kolkata"],
] as const;

const settings = (page: import("@playwright/test").Page) => page.getByRole("contentinfo").getByRole("button", { name: "Cookie settings", exact: true });

test("missing timezones, language lists, aliases and portable policy are handled", () => {
  expect(regimeFromTimezone(undefined, ["en-US", "pt-BR"])).toBe("lgpd");
  expect(regimeFromTimezone("UTC", ["en-US", "fr-CA"])).toBe("pipeda");
  expect(regimeFromTimezone(undefined, "en-AU")).toBe("au");
  expect(regimeFromTimezone("UTC", "zh-Hans-SG")).toBe("pdpa");
  expect(regimeFromTimezone(undefined, "ja-JP")).toBe("appi");
  expect(regimeFromTimezone("UTC", "ta-IN")).toBe("dpdp");
  expect(regimeFromTimezone(undefined, "de-DE")).toBe("gdpr");
  expect(regimeFromTimezone("Asia/Calcutta", "en-US")).toBe("dpdp");
  expect(regimeFromTimezone("US/Pacific", "en-US")).toBe("ccpa");
  const input = { speechApi: false, os: "ios" as const, device: "tablet" as const, browser: "safari" as const, browserCloud: false, local: "unavailable" as const, region: "CN", language: "zh-CN", canRunPortableModel: true };
  expect(decideVoiceProcessing(input)).toMatchObject({ available: true, mode: "portable", rule: "local-only" });
  expect(decideVoiceProcessing({ ...input, region: "IR" })).toMatchObject({ available: false, reason: "region" });
  expect(decideVoiceProcessing({ ...input, region: "US", overrides: { US: "cloud-only" } })).toMatchObject({ available: false, reason: "no-cloud" });
});

for (const [country, headers, regime] of [
  ["Brazil", { "cf-ipcountry": "BR" }, "lgpd"],
  ["India", { "x-vercel-ip-country": "IN" }, "dpdp"],
  ["California", { "cloudfront-viewer-country": "US", "cloudfront-viewer-country-region": "CA" }, "ccpa"],
  ["Canada", { "x-appengine-country": "CA" }, "pipeda"],
  ["Australia", { "fastly-client-country": "AU" }, "au"],
  ["Japan", { "fly-client-country": "JP" }, "appi"],
] as Array<[string, Record<string, string>, string]>) {
  test(`${country} hosting hints select the managed notice without provider configuration`, async ({ browser }) => {
    const context = await browser.newContext({ timezoneId: "Asia/Seoul", locale: "en-US", extraHTTPHeaders: headers });
    const page = await context.newPage();
    try {
      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("data-consent-regime", regime);
      await expect(page.locator("#stcm-banner")).toBeVisible();
      await expect(page.locator(".cookie-notice")).toHaveCount(0);
    } finally { await context.close(); }
  });
}

test("all eight regions can be corrected manually and persist without accepting cookies", async ({ browser }) => {
  const context = await browser.newContext({ timezoneId: "Asia/Seoul", locale: "en-US" });
  const page = await context.newPage();
  try {
    await page.goto("/"); await settings(page).click();
    for (const [regime, name] of regimes) {
      await page.getByLabel("Privacy region", { exact: true }).selectOption(regime);
      await expect(page.locator("html")).toHaveAttribute("data-consent-regime", regime);
      await expect(page.locator("#stcm-modal")).toBeVisible();
      await expect(page.locator("#consent-region-help")).toContainText(name);
      await expect(page.locator("#consent-functional")).not.toBeChecked();
      expect(await page.evaluate((r) => localStorage.getItem(`stcm.radixloom-v2-${r}.hasConsented`), regime)).toBeNull();
    }
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-consent-regime", "dpdp");
    await expect(page.locator("#stcm-banner")).toContainText("DPDP");
    await settings(page).click();
    await page.getByLabel("Privacy region", { exact: true }).selectOption("auto");
    await expect(page.locator("html")).toHaveAttribute("data-consent-regime", "standard");
    for (const purpose of ["essential", "functional", "analytics", "advertising"]) await expect(page.locator(`#consent-${purpose}`)).toBeChecked();
  } finally { await context.close(); }
});

test("standard saved rejections survive reload and are not reset to defaults", async ({ browser }) => {
  const context = await browser.newContext({ timezoneId: "Asia/Seoul", locale: "en-US" });
  const page = await context.newPage();
  try {
    await page.goto("/"); await settings(page).click();
    for (const purpose of ["essential", "functional", "analytics", "advertising"]) await expect(page.locator(`#consent-${purpose}`)).toBeChecked();
    await page.locator('label[for="consent-analytics"]').click();
    await page.locator('label[for="consent-advertising"]').click();
    await page.locator("#stcm-modal .stcm-modal-save").click();
    await page.reload(); await settings(page).click();
    await expect(page.locator("#consent-functional")).toBeChecked();
    await expect(page.locator("#consent-analytics")).not.toBeChecked();
    await expect(page.locator("#consent-advertising")).not.toBeChecked();
  } finally { await context.close(); }
});

test("standard advertising defaults honour GPC", async ({ browser }) => {
  const context = await browser.newContext({ timezoneId: "Asia/Seoul", locale: "en-US" });
  await context.addInitScript(() => Object.defineProperty(navigator, "globalPrivacyControl", { value: true }));
  const page = await context.newPage();
  try {
    await page.goto("/"); await settings(page).click();
    await expect(page.locator("#consent-functional")).toBeChecked();
    await expect(page.locator("#consent-analytics")).toBeChecked();
    await expect(page.locator("#consent-advertising")).not.toBeChecked();
    await expect(page.locator("#consent-advertising")).toBeDisabled();
  } finally { await context.close(); }
});

for (const device of ["Desktop Chrome", "iPhone 13", "iPad (gen 7)"]) {
  test(`${device}: consent palette follows explicit theme, not OS preference`, async ({ browser }) => {
    const { defaultBrowserType: _unused, ...profile } = devices[device]; void _unused;
    const context = await browser.newContext({ ...profile, timezoneId: "Asia/Seoul", locale: "en-US", colorScheme: "dark" });
    const page = await context.newPage();
    try {
      await page.goto("/");
      await page.getByRole("switch", { name: /Switch to light mode/ }).click();
      await settings(page).click();
      await expect(page.locator("#stcm-modal")).toBeVisible();
      const colors = await page.locator("#stcm-modal").evaluate((element) => ({ background: getComputedStyle(element).backgroundColor, text: getComputedStyle(element).color, width: element.getBoundingClientRect().width, viewport: innerWidth }));
      expect(colors.background).toBe("rgb(255, 255, 255)");
      expect(colors.text).toBe("rgb(11, 16, 32)");
      expect(colors.width).toBeLessThanOrEqual(colors.viewport);
      await page.screenshot({ path: `/tmp/radix-consent-${device.replace(/\W+/g, "-")}-light.png` });
      await page.locator(".stcm-modal-close").click();
      await page.getByRole("switch", { name: /Switch to dark mode/ }).click();
      await settings(page).click();
      await expect(page.locator("#stcm-modal")).toHaveCSS("background-color", "rgb(27, 41, 65)");
      await expect(page.locator("#stcm-modal")).toHaveCSS("color", "rgb(237, 243, 255)");
    } finally { await context.close(); }
  });
}

test("consent controls have accessible names and AA contrast in both themes", async ({ browser }) => {
  const context = await browser.newContext({ timezoneId: "Asia/Seoul", locale: "en-US", colorScheme: "light", reducedMotion: "reduce" });
  const page = await context.newPage();
  try {
    await page.goto("/");
    await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
    for (const theme of ["light", "dark"]) {
      await settings(page).click();
      await expect(page.locator("#stcm-modal")).toBeVisible();
      await expect(page.locator("#stcm-modal")).toHaveCSS("opacity", "1");
      const violations = await page.evaluate(async () => {
        const axe = (window as unknown as { axe: typeof import("axe-core") }).axe;
        const result = await axe.run(document.querySelector("#stcm-modal")!, { runOnly: { type: "rule", values: ["color-contrast", "label", "aria-valid-attr-value", "button-name", "select-name"] } });
        return result.violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => node.target) }));
      });
      expect(violations, `Consent accessibility in ${theme} mode`).toEqual([]);
      await page.locator(".stcm-modal-close").click();
      if (theme === "light") await page.getByRole("switch", { name: /Switch to dark mode/ }).click();
    }
  } finally { await context.close(); }
});

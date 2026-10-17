import { devices, expect, test } from "@playwright/test";
import { protectiveConsentRegime, regimeForArea } from "@/lib/privacy/consent-regime";
import { trustedGeoHeaders } from "./support/geography";

const settings = (page: import("@playwright/test").Page) => page.getByRole("contentinfo").getByRole("button", { name: "Cookie settings", exact: true });

test("only server-verified country and subdivision determine the notice", () => {
  expect(regimeForArea({ country: "BR", region: null })).toBe("lgpd");
  expect(regimeForArea({ country: "US", region: "CA" })).toBe("ccpa");
  expect(regimeForArea({ country: "US", region: "NY" })).toBe("standard");
  expect(regimeForArea(null)).toBe("unknown");
  expect(protectiveConsentRegime("unknown")).toBe("gdpr");
});

for (const [country, region, regime] of [
  ["DE", undefined, "gdpr"], ["US", "CA", "ccpa"], ["BR", undefined, "lgpd"],
  ["CA", undefined, "pipeda"], ["AU", undefined, "au"], ["SG", undefined, "pdpa"],
  ["JP", undefined, "appi"], ["IN", undefined, "dpdp"],
] as const) {
  test(`${country}: verified country wins over unrelated timezone, locale and old settings`, async ({ browser }) => {
    const context = await browser.newContext({ timezoneId: "Asia/Seoul", locale: "en-US", extraHTTPHeaders: trustedGeoHeaders(country, region) });
    await context.addInitScript(() => localStorage.setItem("radixloom.consent-region.v1", "standard"));
    const page = await context.newPage();
    try {
      await page.goto("/?country=KR&privacyRegion=standard");
      await expect(page.locator("html")).toHaveAttribute("data-consent-regime", regime);
      await expect(page.locator("#stcm-banner")).toBeVisible();
      await settings(page).click();
      await expect(page.locator("#stcm-modal")).toBeVisible();
      await expect(page.getByLabel("Privacy region", { exact: true })).toHaveCount(0);
      await expect(page.locator("#consent-region-selector")).toHaveCount(0);
      await expect(page.locator("#consent-functional")).not.toBeChecked();
      expect(await page.evaluate(() => localStorage.getItem("radixloom.consent-region.v1"))).toBeNull();
    } finally { await context.close(); }
  });
}

test("unverified geography never trusts client-supplied country headers", async ({ browser }) => {
  const context = await browser.newContext({ timezoneId: "Asia/Tokyo", locale: "ja-JP", extraHTTPHeaders: { "cf-ipcountry": "JP", "x-country-code": "JP" } });
  const page = await context.newPage();
  try {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-consent-regime", "gdpr");
    await expect(page.locator("html")).toHaveAttribute("data-consent-location", "unverified");
    expect((await page.request.get("/privacy/regions/japan")).status()).toBe(403);
  } finally { await context.close(); }
});

test("standard saved rejections survive reload and are not reset to defaults", async ({ browser }) => {
  const context = await browser.newContext({ extraHTTPHeaders: trustedGeoHeaders("KR"), timezoneId: "Asia/Seoul", locale: "en-US" });
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
  const context = await browser.newContext({ extraHTTPHeaders: trustedGeoHeaders("KR"), timezoneId: "Asia/Seoul", locale: "en-US" });
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
    const context = await browser.newContext({ extraHTTPHeaders: trustedGeoHeaders("KR"), ...profile, timezoneId: "Asia/Seoul", locale: "en-US", colorScheme: "dark" });
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
  const context = await browser.newContext({ extraHTTPHeaders: trustedGeoHeaders("KR"), timezoneId: "Asia/Seoul", locale: "en-US", colorScheme: "light", reducedMotion: "reduce" });
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

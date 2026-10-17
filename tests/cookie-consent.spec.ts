import { expect, test, type Browser } from "@playwright/test";

const cases = [
  ["GDPR", "Europe/Berlin", "gdpr"],
  ["California", "America/Los_Angeles", "ccpa"],
  ["Brazil", "America/Sao_Paulo", "lgpd"],
  ["Canada", "America/Toronto", "pipeda"],
  ["Australia", "Australia/Sydney", "au"],
  ["Singapore", "Asia/Singapore", "pdpa"],
  ["Japan", "Asia/Tokyo", "appi"],
  ["India", "Asia/Kolkata", "dpdp"],
] as const;

async function regionalContext(browser: Browser, timezoneId: string) {
  return browser.newContext({
    timezoneId,
    locale: "en-US",
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
  });
}

for (const [region, timezone, regime] of cases) {
  test(`${region}: pending choice keeps notice and optional storage off`, async ({ browser }) => {
    const context = await regionalContext(browser, timezone);
    const page = await context.newPage();
    try {
      await page.goto("/tools/formula");
      await expect(page.locator("html")).toHaveAttribute("data-consent-regime", regime);
      const notice = page.locator("#stcm-banner");
      await expect(notice).toBeVisible();
      await expect(notice).toContainText("Browsing is not consent");
      await expect(page.getByRole("button", { name: "Save formula", exact: true })).toBeDisabled();
      expect(await page.evaluate(() => localStorage.getItem("radixloom.workspace"))).toBeNull();
      await page.getByRole("contentinfo").getByRole("button", { name: "Cookie settings", exact: true }).click();
      await expect(page.locator("#stcm-modal")).toBeVisible();
      await expect(page.locator("#consent-functional")).not.toBeChecked();
      await page.locator(".stcm-modal-close").click();
      await expect(notice).toBeVisible();
      await page.goto("/tools/calculator");
      await expect(notice).toBeVisible();
      expect(await page.evaluate(() => localStorage.getItem("radixloom.calculator-board.v1"))).toBeNull();
      await notice.getByRole("button", { name: /Reject|Opt out/i }).click();
      await expect(notice).toHaveCount(0);
      expect(await page.evaluate((name) => localStorage.getItem(`stcm.radixloom-v2-${name}.hasConsented`), regime)).toBe("1");
      expect(await page.evaluate((name) => localStorage.getItem(`stcm.radixloom-v2-${name}.consent.functional`), regime)).toBe("false");
    } finally {
      await context.close();
    }
  });
}

test("settings are global while the standard notice remains unchanged", async ({ browser }) => {
  const context = await regionalContext(browser, "Asia/Seoul");
  const page = await context.newPage();
  try {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-consent-regime", "standard");
    const notice = page.getByRole("region", { name: "Cookie notice", exact: true });
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("uses essential cookies and local storage to run the site and remember your settings. We do not use advertising trackers.");
    await expect(page.locator("#stcm-banner")).toHaveCount(0);
    await notice.getByRole("button", { name: "I understand", exact: true }).click();
    expect(await page.evaluate(() => localStorage.getItem("stcm.radixloom-v2-standard.hasConsented"))).toBeNull();
    await page.getByRole("contentinfo").getByRole("button", { name: "Cookie settings", exact: true }).click();
    await expect(page.locator("#stcm-modal")).toBeVisible();
    await expect(page.locator("#stcm-modal")).toContainText("All categories are selected initially");
    for (const purpose of ["essential", "functional", "analytics", "advertising"]) {
      await expect(page.locator(`#consent-${purpose}`)).toBeChecked();
    }
    await page.locator("#stcm-modal").getByRole("button", { name: "Save cookie settings and close", exact: true }).click();
    await page.goto("/tools/formula");
    await expect(page.getByRole("button", { name: "Save formula", exact: true })).toBeEnabled();
    await expect(page.getByRole("region", { name: "Cookie notice", exact: true })).toHaveCount(0);
  } finally { await context.close(); }
});

test("functional choice enables saved formulas and withdrawal disables saving", async ({ browser }) => {
  const context = await regionalContext(browser, "Europe/Berlin");
  const page = await context.newPage();
  try {
    await page.goto("/tools/formula");
    await page.locator("#stcm-banner .stcm-accept-all").click();
    await expect(page.getByRole("button", { name: "Save formula", exact: true })).toBeEnabled();
    const token = await page.evaluate(() => localStorage.getItem("radixloom.workspace"));
    expect(token).toMatch(/^ws_[a-z0-9]{6,32}$/);
    await page.getByRole("button", { name: "Save formula", exact: true }).click();
    await expect(page.getByText("Saved “Compound interest”.", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.locator("#stcm-banner")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Save formula", exact: true })).toBeEnabled();
    await page.getByRole("contentinfo").getByRole("button", { name: "Cookie settings", exact: true }).click();
    await page.locator('label[for="consent-functional"]').click();
    await page.locator("#stcm-modal").getByRole("button", { name: "Save cookie preferences and close", exact: true }).click();
    await expect(page.getByRole("button", { name: "Save formula", exact: true })).toBeDisabled();
    await expect(page.getByText(/Formula saving is off/)).toBeVisible();
    await page.request.delete(`/api/formulas?workspace=${encodeURIComponent(token!)}&all=1`);
  } finally { await context.close(); }
});

test("Global Privacy Control stays restrictive after accepting optional purposes", async ({ browser }) => {
  const context = await regionalContext(browser, "America/Los_Angeles");
  await context.addInitScript(() => Object.defineProperty(navigator, "globalPrivacyControl", { value: true, configurable: true }));
  const page = await context.newPage();
  try {
    await page.goto("/");
    await page.locator("#stcm-banner .stcm-accept-all").click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem("stcm.radixloom-v2-ccpa.consent.sale-sharing"))).toBe("false");
    await page.getByRole("contentinfo").getByRole("button", { name: "Cookie settings", exact: true }).click();
    await expect(page.locator("#consent-sale-sharing")).not.toBeChecked();
    await expect(page.locator("#consent-sale-sharing")).toBeDisabled();
  } finally { await context.close(); }
});

test("replacement is live and the previous public workspace APIs are gone", async ({ request }) => {
  const home = await request.get("/");
  expect(home.status()).toBe(200);
  expect(await home.text()).toContain("Radix Loom");
  expect((await request.get("/api/health")).status()).toBe(200);
  expect((await request.get("/api/workspace")).status()).toBe(404);
  expect((await request.get("/api/workbench/system")).status()).toBe(404);
});

import { expect, test } from "@playwright/test";

test("exchange-rate tool shows the expanded currency catalog, all-rate table and selectable trend periods", async ({ page }) => {
  await page.goto("/tools/currency", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /Exchange rates/i })).toBeVisible();

  const from = page.locator("#currency-from");
  const to = page.locator("#currency-to");
  await expect(from.locator("option")).toHaveCount(30);
  await expect(to.locator("option")).toHaveCount(30);
  await expect(from.locator("option[value='PLN']")).toContainText("złoty");
  await expect(from.locator("option[value='THB']")).toContainText("baht");

  const convert = page.getByRole("button", { name: "Convert" });
  await expect(convert).toBeEnabled({ timeout: 30000 });
  await convert.click();
  const allRates = page.locator("details").filter({ hasText: /other currencies/i });
  await allRates.locator("summary").click();
  await expect(allRates.locator("tbody tr")).toHaveCount(29, { timeout: 30000 });
  await expect(allRates).toContainText("Romanian leu");
  await expect(allRates).toContainText("Thai baht");

  await page.getByRole("button", { name: "1 year" }).click();
  await expect(page.getByText(/Over the last 1 year/)).toBeVisible({ timeout: 30000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test("economy comparison and ranking each fetch and confirm their own data mode", async ({ page }) => {
  await page.goto("/tools/economy", { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: /Compare/ }).click();
  const show = page.getByRole("button", { name: "Show" });
  await expect(show).toBeEnabled({ timeout: 30000 });
  await show.click();
  await expect(page.locator("tbody tr")).toHaveCount(3, { timeout: 30000 });
  await expect(page.locator("tbody")).toContainText("Japan");

  await page.getByRole("tab", { name: /Rank all economies/ }).click();
  await expect(show).toBeEnabled({ timeout: 30000 });
  await show.click();
  await expect(page.locator("tbody tr")).toHaveCount(30, { timeout: 30000 });
  await expect(page.locator("tbody tr").first()).toContainText("Argentina");
});

test("standalone finance page is removed; finance calculators live in formulas", async ({ page }) => {
  const response = await page.request.get("/finance");
  expect(response.status()).toBe(404);
  await page.goto("/tools/formula");
  await expect(page.getByRole("heading", { name: /custom formula/i })).toBeVisible();
  const presets = await page.request.get("/calculators");
  expect(presets.ok()).toBeTruthy();
});

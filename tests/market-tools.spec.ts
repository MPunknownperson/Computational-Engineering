import { expect, test } from "@playwright/test";
import { COUNTRIES } from "@/lib/catalog";

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
  // Control the response timing; UI regressions must not depend on whether
  // an upstream statistics service is fast or has a value for every economy.
  await page.route("**/api/economy?*", async (route) => {
    const query = new URL(route.request().url()).searchParams;
    const countries = (query.get("country") ?? "USA").split(",");
    if (countries.length > 1) await new Promise((resolve) => setTimeout(resolve, 250));
    const results = countries.map((country, index) => ({
      country,
      latest: { year: "2024", value: country === "ARG" ? 200 : 30 - index },
      series: [{ year: "2023", value: 2 }, { year: "2024", value: country === "ARG" ? 200 : 30 - index }],
    }));
    await route.fulfill({ json: countries.length > 1
      ? { compare: true, countries, indicator: "inflation", results }
      : { country: countries[0], indicator: "inflation", latest: results[0].latest, series: results[0].series },
    });
  });
  await page.goto("/tools/economy", { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: /Compare/ }).click();
  const show = page.getByRole("button", { name: "Show" });
  await expect(show).toBeDisabled();
  await expect(show).toBeEnabled({ timeout: 30000 });
  await show.click();
  await expect(page.locator("tbody tr")).toHaveCount(3, { timeout: 30000 });
  await expect(page.locator("tbody")).toContainText("Japan");

  await page.getByRole("tab", { name: /Rank all economies/ }).click();
  await expect(show).toBeEnabled({ timeout: 30000 });
  await show.click();
  await expect(page.locator("tbody tr")).toHaveCount(COUNTRIES.length, { timeout: 30000 });
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

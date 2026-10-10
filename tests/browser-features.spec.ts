import { expect, test, type Page } from "@playwright/test";
import { parseVoiceCommand } from "@/lib/voice/pipeline";

const AUDIT_PATHS = ["/", "/calculators", "/tools/units", "/tools/scientific", "/tools/formula", "/guides", "/contact", "/terms", "/privacy", "/do-not-sell-or-share"];

/**
 * WCAG 2.1 AA audit using axe-core (Deque Systems, free and open source).
 *
 * Colour contrast must be measured on elements at rest. The site's scroll-reveal
 * animation transitions `.reveal` from opacity 0 to 1, so an audit that runs
 * while that transition is in flight reads partially transparent text and
 * blends the foreground with the background — turning a 7:1 pair into a
 * spurious 4.2:1 "violation" that differs on every run. Requesting reduced
 * motion makes the stylesheet pin `.reveal` to its final opacity (see the
 * `prefers-reduced-motion` block in globals.css), so measurements are
 * deterministic and reflect the state users actually end up reading.
 */
async function audit(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("domcontentloaded");
  const axePath = require.resolve("axe-core/axe.min.js");
  await page.addScriptTag({ path: axePath });
  const results = await page.evaluate(async () => {
    return await (window as any).axe.run(document, {
      runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
    });
  });
  return (results.violations ?? []) as Array<{ id: string; impact?: string; nodes: unknown[] }>;
}

test("key pages meet WCAG 2.1 AA per axe-core", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  try {
  for (const path of AUDIT_PATHS) {
    const violations = await audit(page, path);
    const serious = violations.filter((v) => ["critical", "serious"].includes(v.impact ?? ""));
    expect(
      serious.map((v) => `${v.id} (${v.nodes.length})`).join(", "),
      `${path} has serious/critical accessibility violations`,
    ).toBe("");
    // Any remaining minor/moderate issue is reported but does not fail the run.
    if (violations.length) {
      console.log(`[axe] ${path}: ${violations.map((v) => `${v.id}:${v.impact}`).join(", ")}`);
    }
  }
  } finally {
    await context.close();
  }
});

test("voice entry is present and degrades safely when unsupported", async ({ page }) => {
  await page.goto("/calculators");
  const heading = page.getByRole("heading", { name: /Speak what you want to calculate/i });
  await expect(heading).toBeVisible();
  // In a headless browser the API is usually absent, so the button must be
  // disabled with a clear explanation rather than throwing on click.
  const button = page.getByRole("button", { name: /Speak a calculation|Voice input unavailable/i });
  await expect(button).toBeVisible();
  if (await button.isDisabled()) {
    await expect(page.locator("#voice-status")).toContainText(/Voice input is not available|try one of/i);
  }
});

test("wake lock and share controls appear on calculator pages and degrade safely", async ({ page }) => {
  for (const path of ["/tools/scientific", "/tools/units", "/tools/formula"]) {
    await page.goto(path);
    await expect(page.getByRole("button", { name: /Keep screen awake|Display awake/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Share|Share link/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Copy result/i })).toBeVisible();
    // Clicking must never throw, even when the APIs are unavailable.
    await page.getByRole("button", { name: /Keep screen awake/i }).click();
    await expect(page.locator("#wake-status")).not.toBeEmpty();
  }
});

test("the footer contains no search button", async ({ page, request }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer).toBeVisible();
  const text = await footer.innerText();
  expect(text.toLowerCase()).not.toContain("search the site");
  expect(text).not.toContain("/search");
  // Route and any lingering link are gone site-wide.
  for (const path of ["/", "/calculators", "/about", "/terms"]) {
    const html = await (await request.get(path)).text();
    expect(html, `${path} still links /search`).not.toContain('href="/search"');
  }
});

test("voice intent matching is deterministic and never invents a destination", async () => {
  expect(parseVoiceCommand("convert 70 kilos to pounds")?.href).toContain("from=kg&to=lb&value=70");
  expect(parseVoiceCommand("5 miles to kilometers")?.href).toContain("from=mi&to=km&value=5");
  expect(parseVoiceCommand("celsius to fahrenheit")?.href).toContain("from=C&to=F");
  expect(parseVoiceCommand("split the bill")?.href).toContain("preset=tip-split");
  expect(parseVoiceCommand("bitcoin price")?.href).toContain("tools/crypto");
  // No match means no result, not a guess.
  expect(parseVoiceCommand("what is the weather tomorrow")).toBeNull();
  expect(parseVoiceCommand("")).toBeNull();
});

test("contact works without bot-check keys and the widget stays off", async ({ page, request }) => {
  await page.goto("/contact");
  // Turnstile is opt-in; with no keys configured no external widget is loaded.
  expect(await page.locator(".cf-turnstile").count()).toBe(0);
  const res = await request.post("/api/contact", {
    data: {
      topic: "general",
      name: "Automated test",
      email: "",
      message: "A message long enough to pass the length check for this test.",
      website: "",
    },
  });
  expect([200, 201]).toContain(res.status());
});

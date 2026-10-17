import { devices, expect, test, type BrowserContext, type Page } from "@playwright/test";
import { trustedGeoHeaders } from "./support/geography";
import { decideVoiceProcessing, type PolicyInput } from "@/lib/voice/policy";
import { detectBrowser, speechBrowserAllowed } from "@/lib/platform";

const card = (page: Page) => page.locator('[data-speech-engine="web-speech"]');
const base: PolicyInput = { speechApi: true, os: "android", browser: "chrome", device: "phone", browserCloud: true, local: "unavailable", region: "US" };

test("only native recognition modes exist and unknown geography fails closed", () => {
  expect(decideVoiceProcessing(base)).toMatchObject({ available: true, mode: "cloud" });
  expect(decideVoiceProcessing({ ...base, region: null })).toMatchObject({ available: false, reason: "location" });
  expect(decideVoiceProcessing({ ...base, speechApi: false })).toMatchObject({ available: false, reason: "no-api" });
  expect(decideVoiceProcessing({ ...base, region: "CN" })).toMatchObject({ available: false, reason: "no-local" });
  expect(decideVoiceProcessing({ ...base, region: "CN", local: "available" })).toMatchObject({ available: true, mode: "local" });
  expect(decideVoiceProcessing({ ...base, region: "IR" })).toMatchObject({ available: false, reason: "region" });
  expect(speechBrowserAllowed("ios", "chrome")).toBe(false);
  expect(speechBrowserAllowed("ipados", "safari")).toBe(true);
  expect(speechBrowserAllowed("android", "firefox")).toBe(false);
  expect(detectBrowser("Mozilla/5.0 iPhone EdgiOS/120.0 Safari/605.1")).toBe("edge");
  expect(detectBrowser("Mozilla/5.0 iPhone FxiOS/120.0 Safari/605.1")).toBe("firefox");
});

async function mockSpeech(context: BrowserContext, expose = true) {
  await context.addInitScript(({ expose }) => {
    const scope = window as unknown as Record<string, unknown>;
    const probe = { starts: 0, streams: 0, language: "", gesture: false };
    scope.__nativeSpeechProbe = probe;
    if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => { probe.streams++; throw new Error("Native recognition must own microphone capture"); };
    delete scope.SpeechRecognition;
    delete scope.webkitSpeechRecognition;
    if (!expose) return;
    class Recognition {
      lang = ""; continuous = false; interimResults = true; maxAlternatives = 1;
      onstart: (() => void) | null = null;
      onaudiostart: (() => void) | null = null;
      onresult: ((event: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        probe.starts++; probe.language = this.lang; probe.gesture = navigator.userActivation?.isActive ?? true;
        this.onstart?.(); this.onaudiostart?.();
        queueMicrotask(() => this.onresult?.({ resultIndex: 0, results: [{ length: 1, isFinal: true, 0: { transcript: "five miles to kilometers", confidence: .99 } }] }));
      }
      stop() {} abort() {}
    }
    scope.webkitSpeechRecognition = Recognition;
  }, { expose });
}

for (const [label, device, supported, ua] of [
  ["Android Chrome phone", "Pixel 7", true, ""],
  ["Android Chrome tablet", "Galaxy Tab S4", true, ""],
  ["iPhone Safari", "iPhone 13", true, ""],
  ["iPad Safari", "iPad (gen 7)", true, ""],
  ["iPhone Chrome", "iPhone 13", false, "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1"],
  ["iPad Chrome", "iPad (gen 7)", false, "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1"],
  ["Android Firefox", "Pixel 7", false, "Mozilla/5.0 (Android 14; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0"],
] as const) {
  test(`${label}: platform browser rule is enforced`, async ({ browser }) => {
    const { defaultBrowserType: _ignored, ...profile } = devices[device]; void _ignored;
    const context = await browser.newContext({ ...profile, ...(ua ? { userAgent: ua } : {}), locale: "en-US", extraHTTPHeaders: trustedGeoHeaders("US", "NY") });
    const page = await context.newPage();
    const assets: string[] = [];
    page.on("request", request => { if (/\/models\/|\/vendor\/onnx\/|\.onnx(?:\?|$)|\.wasm(?:\?|$)/.test(request.url())) assets.push(request.url()); });
    try {
      await mockSpeech(context);
      await page.goto("/calculators");
      await page.locator("[data-voice-entry]").scrollIntoViewIfNeeded();
      await expect(card(page)).toBeVisible();
      if (label.startsWith("Android")) await expect(card(page)).toContainText("Google Mobile Services (GMS)");
      else await expect(card(page)).toContainText("only in Safari");
      if (supported) {
        const button = card(page).getByRole("button", { name: "Speak a calculation", exact: true });
        await expect(button).toBeEnabled();
        await button.click();
        await page.waitForURL(/\/tools\/units\?category=length&from=mi&to=km&value=5/);
        const probe = await page.evaluate(() => (window as unknown as { __nativeSpeechProbe: { starts: number; streams: number; gesture: boolean } }).__nativeSpeechProbe);
        expect(probe.starts).toBe(1); expect(probe.streams).toBe(0); expect(probe.gesture).toBe(true);
      } else {
        await expect(card(page).getByRole("button", { name: "Voice input unavailable", exact: true })).toBeDisabled();
      }
      expect(assets).toEqual([]);
    } finally { await context.close(); }
  });
}

test("no native API means no microphone, no fallback and no model requests", async ({ browser }) => {
  const context = await browser.newContext({ extraHTTPHeaders: trustedGeoHeaders("US", "NY") });
  const page = await context.newPage();
  const assets: string[] = [];
  page.on("request", request => { if (/\/models\/|\/vendor\/onnx\/|\.wasm(?:\?|$)/.test(request.url())) assets.push(request.url()); });
  try {
    await mockSpeech(context, false); await page.goto("/calculators");
    await expect(card(page).getByRole("button", { name: "Voice input unavailable", exact: true })).toBeDisabled();
    expect(await page.evaluate(() => (window as unknown as { __nativeSpeechProbe: { streams: number } }).__nativeSpeechProbe.streams)).toBe(0);
    expect(assets).toEqual([]);
  } finally { await context.close(); }
});

test("voice geography cannot be supplied through query, locale or untrusted edge headers", async ({ request }) => {
  const response = await request.get("/api/voice/policy?country=US&region=US", { headers: { "cf-ipcountry": "US", "x-country-code": "US", "accept-language": "en-US" } });
  expect(await response.json()).toMatchObject({ country: null, rule: "none" });
  const verified = await request.get("/api/voice/policy", { headers: trustedGeoHeaders("US", "NY") });
  expect(await verified.json()).toMatchObject({ country: "US", rule: "any" });
});

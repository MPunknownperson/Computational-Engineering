import { devices, expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

test("real self-hosted speech works without native ASR, experimental AI, MediaRecorder or WebGPU", async ({ browser }) => {
  test.setTimeout(180000);
  const { defaultBrowserType: _unused, ...profile } = devices["iPhone 13"]; void _unused;
  const context = await browser.newContext({ ...profile, timezoneId: "Asia/Seoul", locale: "en-US" });
  const page = await context.newPage();
  const errors: string[] = [];
  const assets: string[] = [];
  const remote: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (/\/models\/|\/vendor\/onnx\//.test(url.pathname)) assets.push(request.url());
    if (/huggingface|jsdelivr/.test(url.hostname)) remote.push(request.url());
  });
  const fixture = await readFile(path.join(process.cwd(), "tests/fixtures/jfk.wav"));
  await page.route("**/__voice-test.wav", (route) => route.fulfill({ body: fixture, contentType: "audio/wav" }));
  await page.route("**/api/voice/policy", (route) => route.fulfill({ json: { country: "US", overrides: {} } }));
  await page.addInitScript(() => {
    const scope = window as unknown as Record<string, unknown>;
    for (const name of ["SpeechRecognition", "webkitSpeechRecognition", "LanguageModel", "MediaRecorder"]) Object.defineProperty(window, name, { configurable: true, value: undefined });
    scope.__portableMicCalls = 0;
    // Feed a known PCM sample through actual Web Audio capture. Recognition,
    // resampling, the model, and WASM worker are real; only hardware is replaced.
    // WebKit can replace methods on its native MediaDevices during document
    // setup. Keep a stable hardware shim, as in the native lifecycle harness.
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: Object.assign(new EventTarget(), { getUserMedia: async () => {
      scope.__portableMicCalls = Number(scope.__portableMicCalls) + 1;
      const Context = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audio = new Context();
      void audio.resume();
      const response = await fetch("/__voice-test.wav");
      const buffer = await audio.decodeAudioData(await response.arrayBuffer());
      const source = audio.createBufferSource(); source.buffer = buffer;
      const destination = audio.createMediaStreamDestination(); source.connect(destination); source.start();
      scope.__portableTestContext = audio;
      return destination.stream;
    } }) });
  });
  try {
    await page.goto("/calculators");
    // Voice is intentionally lazy-loaded below the directory on phones.
    await page.locator("[data-voice-entry]").scrollIntoViewIfNeeded();
    const card = page.locator("section[aria-labelledby='voice-heading']");
    const speak = card.getByRole("button", { name: "Speak a calculation", exact: true });
    await expect(speak).toBeEnabled();
    await expect(card).toContainText("On-device speech · phones, tablets & desktops");
    await speak.click();
    await expect(card).toContainText("On-device speech is ready", { timeout: 120000 });
    expect(await page.evaluate(() => (window as unknown as { __portableMicCalls: number }).__portableMicCalls)).toBe(0);
    await speak.click();
    await expect(card).toHaveAttribute("data-voice-phase", "listening", { timeout: 15000 });
    await page.waitForTimeout(6500); // Deliver a known-length real audio segment.
    await card.getByRole("button", { name: "Stop listening", exact: true }).click();
    await expect(card).toContainText(/Heard:.*(?:fellow|American)/i, { timeout: 60000 });
    expect(await page.evaluate(() => (window as unknown as { __portableMicCalls: number }).__portableMicCalls)).toBe(1);
    expect(assets.some((url) => url.endsWith(".onnx"))).toBe(true);
    expect(assets.some((url) => url.endsWith(".wasm"))).toBe(true);
    expect(remote).toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    await page.evaluate(() => { void (window as unknown as { __portableTestContext?: AudioContext }).__portableTestContext?.close(); }).catch(() => undefined);
    await context.close();
  }
});

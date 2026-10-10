import { expect, test } from "@playwright/test";
import { mediaAssets } from "@/lib/media/assets";
import { supportsGenerativeSpeechLanguage } from "@/lib/voice/languages";
import { decideVoiceProcessing } from "@/lib/voice/policy";

 test("generative audio is gated independently from text-language support", () => {
  for (const locale of ["en", "en-US", "en-GB", "en_AU"]) expect(supportsGenerativeSpeechLanguage(locale)).toBe(true);
  for (const locale of ["es-MX", "fr-FR", "de-DE", "zh-Hans-CN", "ja-JP"]) {
    expect(supportsGenerativeSpeechLanguage(locale)).toBe(false);
    const policy = decideVoiceProcessing({
      speechApi: false, browserCloud: false, local: "unavailable", canRunLocalModel: true,
      language: locale, os: "windows", device: "desktop", browser: "chrome", region: "US",
    });
    expect(policy.available).toBe(false);
  }
});

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
  test(`non-English browser speech keeps ${locale} and never invokes the English model`, async ({ browser }) => {
    const context = await browser.newContext({ locale });
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

test("cancelled English model preparation never opens the microphone", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    delete w.SpeechRecognition;
    delete w.webkitSpeechRecognition;
    const probe = { microphone: 0, aborted: false };
    w.__cancelProbe = probe;
    navigator.mediaDevices.getUserMedia = async () => {
      probe.microphone++;
      return {} as MediaStream;
    };
    w.LanguageModel = {
      availability: async () => "downloadable",
      create: ({ signal }: { signal: AbortSignal }) => new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => { probe.aborted = true; reject(new DOMException("Cancelled", "AbortError")); });
      }),
    };
  });
  await page.goto("/calculators");
  const card = page.locator("section[aria-labelledby='voice-heading']");
  await expect(card.getByRole("button", { name: "Speak a calculation" })).toBeEnabled();
  await card.getByRole("button", { name: "Speak a calculation" }).click();
  await expect(card).toContainText("English speech");
  await card.getByRole("button", { name: "Cancel" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __cancelProbe: { aborted: boolean } }).__cancelProbe.aborted)).toBe(true);
  expect(await page.evaluate(() => (window as unknown as { __cancelProbe: { microphone: number } }).__cancelProbe.microphone)).toBe(0);
});

test("an available text model cannot enable unsupported audio capture", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    delete w.SpeechRecognition;
    delete w.webkitSpeechRecognition;
    const probe = { audioChecks: 0, creations: 0, microphone: 0 };
    w.__audioProbe = probe;
    navigator.mediaDevices.getUserMedia = async () => { probe.microphone++; return {} as MediaStream; };
    w.LanguageModel = {
      availability: async ({ expectedInputs }: { expectedInputs: Array<{ type: string }> }) => {
        if (expectedInputs.some((input) => input.type === "audio")) { probe.audioChecks++; return "unavailable"; }
        return "available";
      },
      create: async () => { probe.creations++; throw new Error("No audio support"); },
    };
  });
  await page.goto("/calculators");
  await expect(page.locator("section[aria-labelledby='voice-heading']").getByRole("button", { name: "Voice input unavailable" })).toBeDisabled();
  const probe = await page.evaluate(() => (window as unknown as { __audioProbe: { audioChecks: number; creations: number; microphone: number } }).__audioProbe);
  expect(probe.audioChecks).toBeGreaterThan(0);
  expect(probe.creations).toBe(0);
  expect(probe.microphone).toBe(0);
});

test("English generative recognition prepares the model before recording and releases it", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    delete w.SpeechRecognition;
    delete w.webkitSpeechRecognition;
    const probe = { prepared: false, events: [] as string[], audioLanguage: "" };
    w.__captureProbe = probe;
    w.LanguageModel = {
      availability: async () => "available",
      create: async (options: { expectedInputs: Array<{ type: string; languages?: string[] }> }) => {
        probe.audioLanguage = options.expectedInputs.find((input) => input.type === "audio")?.languages?.[0] ?? "";
        probe.events.push("prepare");
        await new Promise((resolve) => setTimeout(resolve, 40));
        probe.prepared = true;
        return {
          prompt: async () => { probe.events.push("transcribe"); return "five miles to kilometers"; },
          destroy() { probe.events.push("destroy"); },
        };
      },
    };
    navigator.mediaDevices.getUserMedia = async () => {
      if (!probe.prepared) throw new Error("Microphone opened before model readiness");
      probe.events.push("microphone");
      return { getTracks: () => [{ stop() { probe.events.push("release"); } }] } as unknown as MediaStream;
    };
    class Recorder extends EventTarget {
      state = "inactive";
      mimeType = "audio/webm";
      static isTypeSupported() { return true; }
      start() { this.state = "recording"; probe.events.push("record"); setTimeout(() => this.stop(), 40); }
      stop() {
        if (this.state !== "recording") return;
        this.state = "inactive";
        const event = new Event("dataavailable");
        Object.defineProperty(event, "data", { value: new Blob([new Uint8Array(2000)]) });
        this.dispatchEvent(event);
        this.dispatchEvent(new Event("stop"));
      }
    }
    w.MediaRecorder = Recorder;
  });
  await page.goto("/calculators");
  const button = page.locator("section[aria-labelledby='voice-heading']").getByRole("button", { name: "Speak a calculation" });
  await expect(button).toBeEnabled();
  await button.click();
  await page.waitForURL(/\/tools\/units\?category=length&from=mi&to=km&value=5/);
  const probe = await page.evaluate(() => (window as unknown as { __captureProbe: { events: string[]; audioLanguage: string } }).__captureProbe);
  expect(probe.audioLanguage).toBe("en");
  expect(probe.events.slice(0, 3)).toEqual(["prepare", "microphone", "record"]);
  expect(probe.events.indexOf("release")).toBeLessThan(probe.events.indexOf("transcribe"));
  expect(probe.events).toContain("destroy");
});

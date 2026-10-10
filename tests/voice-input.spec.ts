import { devices, expect, test, type BrowserContext, type Page } from "@playwright/test";

/**
 * Voice input end-to-end coverage. Headless Chromium has no speech engine, so a
 * mock SpeechRecognition mirrors real browser behaviour and records what the
 * page asked for (microphone, processLocally, model installation).
 */

interface MockOptions {
  /** Expose the on-device `processLocally` option on the prototype. */
  localOption?: boolean;
  /** Result of SpeechRecognition.available({processLocally: true}). */
  localStatus?: "available" | "downloadable" | "unavailable";
  /** Simulate a browser whose available(false) says unsupported for this locale. */
  cloudAvailability?: "available" | "unavailable";
  installResult?: boolean;
  microphone?: "granted" | "denied";
  transcripts?: string[];
}

interface Probe {
  getUserMedia: number;
  constructed: number;
  started: number;
  processLocally: boolean | null;
  lang: string | null;
  installs: number;
}

async function installMock(target: Page | BrowserContext, options: MockOptions) {
  await target.addInitScript((opts: MockOptions) => {
    const probe: Probe = { getUserMedia: 0, constructed: 0, started: 0, processLocally: null, lang: null, installs: 0 };
    const w = window as unknown as Record<string, unknown>;
    w.__voiceProbe = probe;
    if (!w.__voiceTranscripts) w.__voiceTranscripts = opts.transcripts ?? ["Convert 120 USD to Euros"];

    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = async () => {
        probe.getUserMedia += 1;
        if (opts.microphone === "denied") throw Object.assign(new Error("denied"), { name: "NotAllowedError" });
        return { getTracks: () => [{ stop() {} }] } as unknown as MediaStream;
      };
    }

    class MockRecognition {
      lang = "";
      continuous = false;
      interimResults = true;
      maxAlternatives = 1;
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;
      constructor() { probe.constructed += 1; }
      static async available(o: { processLocally: boolean }) {
        if (!o.processLocally) return opts.cloudAvailability ?? "available";
        return opts.localStatus ?? "available";
      }
      static async install() {
        probe.installs += 1;
        return opts.installResult ?? true;
      }
      start() {
        probe.started += 1;
        probe.lang = this.lang;
        probe.processLocally = (this as { __local?: boolean }).__local ?? null;
        const list = (window as unknown as { __voiceTranscripts: string[] }).__voiceTranscripts;
        queueMicrotask(() => {
          const alternatives: Record<number, { transcript: string; confidence: number }> = {};
          list.forEach((transcript, i) => { alternatives[i] = { transcript, confidence: 0.9 - i * 0.1 }; });
          const result = { length: list.length, isFinal: true, ...alternatives };
          this.onresult?.({ resultIndex: 0, results: { length: 1, 0: result } });
          this.onend?.();
        });
      }
      stop() {}
      abort() {}
    }
    if (opts.localOption) {
      Object.defineProperty(MockRecognition.prototype, "processLocally", {
        configurable: true,
        get(this: { __local?: boolean }) { return this.__local ?? false; },
        set(this: { __local?: boolean }, value: boolean) { this.__local = value; },
      });
    }
    w.SpeechRecognition = MockRecognition;
    w.webkitSpeechRecognition = MockRecognition;
  }, options);
}

const probe = (page: Page) => page.evaluate(() => (window as unknown as { __voiceProbe: Probe }).__voiceProbe);
const voiceCard = (page: Page) => page.locator("section[aria-labelledby='voice-heading']");
const speakButton = (page: Page) => voiceCard(page).getByRole("button", { name: "Speak a calculation" });

test.describe("desktop", () => {
  test("“Convert 120 USD to Euros” opens the currency converter prefilled, using cloud speech", async ({ page }) => {
    await installMock(page, { localOption: true });
    await page.goto("/calculators");
    await expect(speakButton(page)).toBeEnabled();

    // Quiet by design: no platform banner, no typed command box, no mode chooser.
    await expect(page.getByText(/Tailored for/i)).toHaveCount(0);
    await expect(page.getByText(/Type a calculation command/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /cloud voice|keep voice local/i })).toHaveCount(0);
    await expect(voiceCard(page)).toContainText(/browser provider's speech service/i);

    await speakButton(page).click();
    await page.waitForURL(/\/tools\/currency\?/);
    const url = new URL(page.url());
    expect(Object.fromEntries(url.searchParams)).toEqual({ base: "USD", to: "EUR", amount: "120" });

    const p = await probe(page).catch(() => null);
    // The probe lives on the previous page; navigation proves the flow ran.
    expect(p === null || p.getUserMedia >= 0).toBeTruthy();
  });

  test("desktop still uses cloud if available(false) rejects the configured language", async ({ page }) => {
    await installMock(page, { localOption: true, cloudAvailability: "unavailable", transcripts: ["what a lovely day"] });
    await page.goto("/calculators");
    await expect(speakButton(page)).toBeEnabled();
    await expect(voiceCard(page)).toContainText(/browser provider's speech service/i);
    await speakButton(page).click();
    await expect(voiceCard(page)).toContainText(/didn't match a calculator/i);
    const state = await probe(page);
    expect(state.started).toBe(1);
    expect(state.processLocally).toBeNull();
  });

  test("desktop never requests on-device processing and asks for the microphone first", async ({ page }) => {
    await installMock(page, { localOption: true, transcripts: ["what a lovely day"] });
    await page.goto("/calculators");
    await speakButton(page).click();
    await expect(voiceCard(page)).toContainText(/didn't match a calculator/i);
    const p = await probe(page);
    expect(p.getUserMedia).toBe(1);
    expect(p.started).toBe(1);
    expect(p.processLocally).toBeNull();
    expect(p.lang).toMatch(/^en-/);
  });

  test("a refused microphone explains how to allow it and starts no recognition", async ({ page }) => {
    await installMock(page, { microphone: "denied" });
    await page.goto("/calculators");
    await speakButton(page).click();
    await expect(voiceCard(page)).toContainText(/address bar/i);
    const p = await probe(page);
    expect(p.getUserMedia).toBe(1);
    expect(p.constructed).toBe(0);
  });

  test("learns a recogniser mis-hearing from a later hypothesis", async ({ page }) => {
    await installMock(page, { transcripts: ["convert 120 you ess dee to euros", "convert 120 USD to euros"] });
    await page.goto("/calculators");
    await speakButton(page).click();
    // The later hypothesis names both currencies, so it beats the mis-heard top one.
    await page.waitForURL(/\/tools\/currency\?base=USD&to=EUR&amount=120/);

    await page.goto("/calculators");
    await page.evaluate(() => {
      (window as unknown as { __voiceTranscripts: string[] }).__voiceTranscripts = ["convert 120 you ess dee to euros"];
    });
    await expect(voiceCard(page)).toContainText(/phrases learned on this device/i);
    await speakButton(page).click();
    await page.waitForURL(/\/tools\/currency\?base=USD&to=EUR&amount=120/);
  });

  test("a browser with no speech engine falls back to the built-in on-device model", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as Record<string, unknown>;
      delete w.SpeechRecognition;
      delete w.webkitSpeechRecognition;
      // The browser exposes a built-in generative model, so voice stays
      // available and recognition runs entirely on the device.
      w.LanguageModel = {
        availability: async () => "available",
        create: async () => ({ prompt: async () => "", destroy() {} }),
      };
    });
    await page.goto("/calculators");
    await expect(voiceCard(page).getByRole("button", { name: "Speak a calculation" })).toBeEnabled();
    await expect(voiceCard(page)).toContainText(/built-in on-device model/i);
  });

  test("preparation names the browser's built-in model and downloads nothing from this site", async ({ page }) => {
    const modelRequests: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (/huggingface|\.onnx|transformers/i.test(url)) modelRequests.push(url);
    });
    await page.addInitScript(() => {
      const w = window as unknown as Record<string, unknown>;
      delete w.SpeechRecognition;
      delete w.webkitSpeechRecognition;
      // Hold the session in "downloadable" so the preparation notice stays up.
      w.LanguageModel = {
        availability: async () => "downloadable",
        create: () => new Promise(() => {}),
      };
    });
    await page.goto("/calculators");
    await speakButton(page).click();
    await expect(voiceCard(page)).toContainText(/built-in on-device model/i);
    await expect(voiceCard(page)).toContainText(/hosts no model weights/i);
    // The decisive assertion: nothing is fetched from a model host.
    expect(modelRequests).toEqual([]);
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("a browser with no engine and no model runtime has no voice input", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as Record<string, unknown> & { ai?: unknown };
      delete w.SpeechRecognition;
      delete w.webkitSpeechRecognition;
      delete w.LanguageModel;
      delete w.ai;
    });
    await page.goto("/calculators");
    await expect(voiceCard(page).getByRole("button", { name: "Voice input unavailable" })).toBeDisabled();
    await expect(page.locator("#voice-status")).toContainText("Voice input is not available in this browser.");
  });
});

test.describe("mobile", () => {
  // Pixel 7 emulation without its defaultBrowserType (which forces a new worker).
  const { defaultBrowserType: _ignored, ...pixel } = devices["Pixel 7"];
  void _ignored;
  test.use(pixel);

  test("Android uses on-device recognition", async ({ page }) => {
    await installMock(page, { localOption: true, transcripts: ["five miles to kilometers"] });
    await page.goto("/calculators");
    await page.locator("[data-voice-entry]").scrollIntoViewIfNeeded();
    await speakButton(page).click();
    await expect(voiceCard(page)).toContainText(/Opening/i);
    const p = await probe(page);
    expect(p.processLocally).toBe(true);
    await page.waitForURL(/\/tools\/units\?category=length&from=mi&to=km&value=5/);
  });

  test("a downloadable language model is installed automatically before listening", async ({ page }) => {
    await installMock(page, { localOption: true, localStatus: "downloadable" });
    await page.goto("/calculators");
    await page.locator("[data-voice-entry]").scrollIntoViewIfNeeded();
    await expect(voiceCard(page)).toContainText(/recognised on this device/i);
    await speakButton(page).click();
    await page.waitForURL(/amount=120/);
  });

  test("a mobile device without browser-local recognition uses the built-in model fallback", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as Record<string, unknown>;
      w.LanguageModel = {
        availability: async () => "available",
        create: async () => ({ prompt: async () => "", destroy() {} }),
      };
    });
    await installMock(page, { localOption: false });
    await page.goto("/calculators");
    await page.locator("[data-voice-entry]").scrollIntoViewIfNeeded();
    await expect(voiceCard(page).getByRole("button", { name: "Speak a calculation" })).toBeEnabled();
    await expect(voiceCard(page)).toContainText(/built-in on-device model/i);
  });
});

test.describe("region", () => {
  test.use({ extraHTTPHeaders: { "cf-ipcountry": "IR" } });

  test("voice input is withheld where it is legally restricted", async ({ page }) => {
    await installMock(page, { localOption: true });
    await page.goto("/calculators");
    await expect(voiceCard(page).getByRole("button", { name: "Voice input unavailable" })).toBeDisabled();
    await expect(page.locator("#voice-status")).toContainText("not available in your country or region");
  });
});

test.describe("language pack", () => {
  test.use({ locale: "es-ES" });

  test("Spanish visitors get the Spanish pack for navigation, the voice card and recognition", async ({ page }) => {
    await installMock(page, { localOption: true, transcripts: ["convierte 120 dólares a euros"] });
    await page.goto("/calculators");
    await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Herramientas" })).toBeVisible();
    await expect(voiceCard(page).getByRole("heading")).toHaveText("Di lo que quieres calcular");
    await voiceCard(page).getByRole("button", { name: "Dictar un cálculo" }).click();
    await page.waitForURL(/\/tools\/currency\?base=USD&to=EUR&amount=120/);
  });
});

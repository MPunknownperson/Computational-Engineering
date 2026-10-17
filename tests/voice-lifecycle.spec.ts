import { devices, expect, test, type Page } from "@playwright/test";
import type { RecognitionInstance } from "@/lib/browser-tokens";

type MockOptions = {
  permission?: PermissionState;
  microphone?: boolean;
  noApi?: boolean;
  prefixedOnly?: boolean;
  local?: boolean;
  localStatus?: "available" | "unavailable" | "downloadable";
  region?: string;
  insecure?: boolean;
};
type EventName = "start" | "audio" | "speechend" | "end" | "error" | "interim" | "result" | "stale";
interface Probe { starts: number; stops: number; aborts: number; mediaRequests: number; gesture: boolean[]; locals: boolean[]; language: string }
interface Harness {
  probe: Probe;
  emit(event: EventName, text?: string): void;
  permission(state: PermissionState): void;
  microphone(available: boolean): void;
}
const card = (page: Page) => page.locator("section[aria-labelledby='voice-heading']");
const speak = (page: Page) => card(page).getByRole("button", { name: "Speak a calculation", exact: true });
const probe = (page: Page) => page.evaluate(() => (window as unknown as { __voiceTest: Harness }).__voiceTest.probe);
const emit = (page: Page, event: EventName, text?: string) => page.evaluate(({ event, text }) => {
  (window as unknown as { __voiceTest: Harness }).__voiceTest.emit(event, text);
}, { event, text });

async function setup(page: Page, options: MockOptions = {}) {
  await page.route("**/api/voice/policy", (route) => route.fulfill({ json: { country: options.region ?? "US", overrides: {} } }));
  await page.addInitScript((opts: MockOptions) => {
    const w = window as unknown as Record<string, unknown>;
    const probe: Probe = { starts: 0, stops: 0, aborts: 0, mediaRequests: 0, gesture: [], locals: [], language: "" };
    let inGesture = false;
    let hasMicrophone = opts.microphone !== false;
    document.addEventListener("click", () => { inGesture = true; }, true);
    // Next attaches React's root handler to document. Clear at window, after
    // the complete event propagation, so an awaited permission loses this flag.
    window.addEventListener("click", () => { inGesture = false; });
    class Permission extends EventTarget { state: PermissionState = opts.permission ?? "prompt"; }
    const permission = new Permission();
    Object.defineProperty(navigator, "permissions", { configurable: true, value: { query: async () => permission } });
    // WebKit may replace native MediaDevices methods during document setup.
    // Model the hardware API with one stable EventTarget instead.
    const media = Object.assign(new EventTarget(), {
      getUserMedia: async () => {
        probe.mediaRequests++;
        throw new Error("Native recognition must own microphone capture");
      },
      enumerateDevices: async () => hasMicrophone
        ? [{ kind: "audioinput", deviceId: "microphone", label: "Microphone", groupId: "audio", toJSON: () => ({}) }]
        : [],
    });
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: media });
    if (opts.insecure) Object.defineProperty(window, "isSecureContext", { configurable: true, value: false });
    let current: MockRecognition | null = null;
    let staleResult: RecognitionInstance["onresult"] = null;
    class MockRecognition {
      lang = ""; continuous = false; interimResults = true; maxAlternatives = 4;
      local = false;
      onstart: RecognitionInstance["onstart"] = null;
      onaudiostart: RecognitionInstance["onaudiostart"] = null;
      onspeechstart: RecognitionInstance["onspeechstart"] = null;
      onspeechend: RecognitionInstance["onspeechend"] = null;
      onaudioend: RecognitionInstance["onaudioend"] = null;
      onnomatch: RecognitionInstance["onnomatch"] = null;
      onresult: RecognitionInstance["onresult"] = null;
      onerror: RecognitionInstance["onerror"] = null;
      onend: RecognitionInstance["onend"] = null;
      static async available() { return opts.localStatus ?? "available"; }
      static async install() { return true; }
      start() {
        current = this; staleResult = this.onresult;
        probe.starts++; probe.gesture.push(inGesture); probe.locals.push(this.local); probe.language = this.lang;
      }
      stop() { probe.stops++; }
      abort() { probe.aborts++; }
    }
    if (opts.local) Object.defineProperty(MockRecognition.prototype, "processLocally", {
      get(this: MockRecognition) { return this.local; }, set(this: MockRecognition, value: boolean) { this.local = value; },
    });
    w.SpeechRecognition = opts.noApi ? undefined : opts.prefixedOnly ? {} : MockRecognition;
    w.webkitSpeechRecognition = opts.noApi ? undefined : MockRecognition;
    w.LanguageModel = undefined;
    if (opts.noApi) w.Worker = undefined;
    w.__voiceTest = {
      probe,
      emit(event: EventName, text = "5 miles to kilometers") {
        if (!current) return;
        const result = { resultIndex: 0, results: { length: 1, 0: { length: 1, isFinal: event !== "interim", 0: { transcript: text, confidence: 0.95 } } } };
        if (event === "start") current.onstart?.();
        if (event === "audio") current.onaudiostart?.();
        if (event === "speechend") current.onspeechend?.();
        if (event === "end") current.onend?.();
        if (event === "error") current.onerror?.({ error: text });
        if (event === "result" || event === "interim") current.onresult?.(result);
        if (event === "stale") staleResult?.(result);
      },
      permission(state: PermissionState) { permission.state = state; permission.dispatchEvent(new Event("change")); },
      microphone(available: boolean) { hasMicrophone = available; navigator.mediaDevices.dispatchEvent(new Event("devicechange")); },
    } satisfies Harness;
  }, options);
  await page.goto("/calculators");
  await page.locator("[data-voice-entry]").scrollIntoViewIfNeeded();
  await expect(card(page)).toBeVisible();
}

test.use({ locale: "en-US" });

for (const profile of ["Desktop Chrome", "Pixel 7", "iPhone 13", "iPad (gen 7)"]) {
  const { defaultBrowserType: _engine, ...emulation } = devices[profile];
  void _engine;
  test.describe(`${profile} voice lifecycle`, () => {
    test.use(emulation);
    test("a tap starts once; listening waits for real capture and final speech opens a tool", async ({ page }) => {
      await setup(page);
      await expect(speak(page)).toBeEnabled();
      await speak(page).click();
      await expect(card(page)).toHaveAttribute("data-voice-phase", "requesting");
      await expect(card(page).getByRole("button", { name: "Cancel", exact: true })).toBeVisible();
      await expect(card(page)).not.toContainText("Listening…");
      await emit(page, "start");
      await expect(card(page)).toHaveAttribute("data-voice-phase", "starting");
      await expect(card(page)).not.toContainText("Listening…");
      await emit(page, "audio");
      await expect(card(page).getByRole("button", { name: "Stop listening" })).toBeVisible();
      await emit(page, "interim", "5 miles");
      await expect(card(page)).toContainText("5 miles");
      expect(page.url()).toContain("/calculators");
      const p = await probe(page);
      expect(p.starts).toBe(1); expect(p.mediaRequests).toBe(0); expect(p.gesture).toEqual([true]);
      expect(p.language).toBe("en-US");
      await emit(page, "result");
      await page.waitForURL(/\/tools\/units\?.*value=5/);
    });
    test("transient errors stop cleanly and a second tap remains usable", async ({ page }) => {
      await setup(page);
      await speak(page).click();
      await emit(page, "error", "network");
      await expect(card(page).getByRole("alert")).toContainText("connection");
      await expect(speak(page)).toBeEnabled();
      expect((await probe(page)).starts).toBe(1);
      await speak(page).click();
      await emit(page, "start"); await emit(page, "audio");
      expect((await probe(page)).starts).toBe(2);
      await emit(page, "result");
      await page.waitForURL(/\/tools\/units\?/);
    });
    if (profile !== "Desktop Chrome") test("a failed local service is disclosed and requires a new tap before using the provider", async ({ page }) => {
      await setup(page, { local: true });
      await speak(page).click();
      await emit(page, "error", "language-not-supported");
      await expect(card(page)).toContainText("Your next tap");
      await expect(speak(page)).toBeEnabled();
      expect((await probe(page)).locals).toEqual([true]);
      await speak(page).click();
      expect((await probe(page)).locals).toEqual([true, false]);
      expect((await probe(page)).gesture).toEqual([true, true]);
      await emit(page, "audio"); await emit(page, "result");
      await page.waitForURL(/\/tools\/units\?/);
    });
  });
}

test("permission wait times out without falsely listening or restarting", async ({ page }) => {
  await page.clock.install();
  await setup(page); await speak(page).click();
  await page.clock.fastForward(31_000);
  await expect(card(page).getByRole("alert")).toContainText("did not start in time");
  await expect(speak(page)).toBeEnabled();
  await expect(card(page)).not.toContainText("Listening…");
  expect((await probe(page)).starts).toBe(1);
});

test("service onstart without microphone capture also times out", async ({ page }) => {
  await page.clock.install(); await setup(page); await speak(page).click();
  await emit(page, "start"); await page.clock.fastForward(9_000);
  await expect(card(page).getByRole("alert")).toContainText("did not start in time");
  expect((await probe(page)).starts).toBe(1);
});

test("an early onend has a specific failure rather than a stale listening prompt", async ({ page }) => {
  await setup(page); await speak(page).click(); await emit(page, "end");
  await expect(card(page).getByRole("alert")).toContainText("ended before the microphone started");
  await expect(speak(page)).toBeEnabled();
});

for (const error of ["no-speech", "audio-capture", "aborted"]) {
  test(`${error} is recoverable and never triggers an automatic restart`, async ({ page }) => {
    await setup(page); await speak(page).click(); await emit(page, "audio"); await emit(page, "error", error);
    await expect(card(page).getByRole("alert")).toBeVisible();
    await expect(speak(page)).toBeEnabled();
    await expect(card(page)).not.toContainText("Listening…");
    expect((await probe(page)).starts).toBe(1);
  });
}

test("a denied microphone permission is not queried until the visitor taps Speak", async ({ page }) => {
  await setup(page, { permission: "denied" });
  await expect(speak(page)).toBeEnabled();
  expect((await probe(page)).starts).toBe(0);
  expect((await probe(page)).mediaRequests).toBe(0);
});

test("permission denied by recognition stays disabled until rechecked", async ({ page }) => {
  await setup(page); await speak(page).click(); await emit(page, "error", "not-allowed");
  await expect(card(page).getByRole("button", { name: "Voice input unavailable" })).toBeDisabled();
  await expect(card(page).getByRole("alert")).toContainText("address bar");
  await card(page).getByRole("button", { name: "Recheck availability" }).click();
  await expect(speak(page)).toBeEnabled();
});

test("missing hardware is not assumed before a tap", async ({ page }) => {
  await setup(page, { permission: "granted", microphone: false });
  await expect(speak(page)).toBeEnabled();
  expect((await probe(page)).mediaRequests).toBe(0);
});

test("a privacy-filtered device list before permission does not disable voice", async ({ page }) => {
  await setup(page, { permission: "prompt", microphone: false });
  await expect(speak(page)).toBeEnabled();
});

test("no native engine, browser model or portable runtime disables voice", async ({ page }) => {
  await setup(page, { noApi: true });
  await expect(card(page).getByRole("button", { name: "Voice input unavailable" })).toBeDisabled();
  await expect(card(page).getByRole("link", { name: /keyboard|teclado|clavier|tippen|键盘/i })).toHaveCount(0);
  expect((await probe(page)).starts).toBe(0);
});

test("an insecure context never starts a recognizer", async ({ page }) => {
  await setup(page, { insecure: true });
  await expect(card(page)).toContainText("secure (https) connection");
  await expect(card(page).getByRole("button", { name: "Voice input unavailable" })).toBeDisabled();
});

test("Stop finalizes speech, while Cancel invalidates pending and stale events", async ({ page }) => {
  await setup(page); await speak(page).click(); await emit(page, "audio");
  await card(page).getByRole("button", { name: "Stop listening" }).click();
  await expect(card(page)).toHaveAttribute("data-voice-phase", "processing");
  expect((await probe(page)).stops).toBe(1);
  await card(page).getByRole("button", { name: "Cancel", exact: true }).click();
  await emit(page, "stale"); await emit(page, "end");
  await expect(speak(page)).toBeEnabled();
  expect(page.url()).toContain("/calculators");
  expect((await probe(page)).aborts).toBeGreaterThan(0);
});

test("a final result after Stop still routes to the requested calculator", async ({ page }) => {
  await setup(page); await speak(page).click(); await emit(page, "audio");
  await card(page).getByRole("button", { name: "Stop listening" }).click();
  await emit(page, "result"); await page.waitForURL(/\/tools\/units\?/);
});

test("leaving the visible page aborts capture and does not restart in the background", async ({ page }) => {
  await setup(page); await speak(page).click(); await emit(page, "audio");
  await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" }); document.dispatchEvent(new Event("visibilitychange")); });
  await expect(card(page).getByRole("alert")).toContainText("interrupted");
  expect((await probe(page)).starts).toBe(1);
  expect((await probe(page)).aborts).toBeGreaterThan(0);
});

test("a local-only region never falls back to a cloud engine after a service error", async ({ page }) => {
  await setup(page, { region: "CN", local: true });
  await speak(page).click(); await emit(page, "error", "language-not-supported");
  await expect(speak(page)).toBeEnabled();
  await expect(card(page)).toContainText("On-device speech · phones, tablets & desktops");
  await expect(card(page)).toContainText("audio will stay on this device");
  const p = await probe(page); expect(p.starts).toBe(1); expect(p.locals).toEqual([true]);
  await expect(card(page)).not.toContainText("browser provider's speech service");
});

test("page and backend retain database-backed formulas and private administrative routes", async ({ request }) => {
  const health = await request.get("/api/health"); expect(health.ok()).toBeTruthy();
  const hidden = await request.get("/api/workbench/jobs"); expect(hidden.status()).toBe(404);
  const workspace = `ws_${Date.now()}regression`;
  const created = await request.post("/api/formulas", { data: { workspace, name: "Voice regression", expression: "2 + 3" } });
  expect(created.ok()).toBeTruthy();
  const item = (await created.json()).item;
  const list = await request.get(`/api/formulas?workspace=${workspace}`);
  expect((await list.json()).items).toEqual(expect.arrayContaining([expect.objectContaining({ id: item.id, expression: "2 + 3" })]));
  const removed = await request.delete(`/api/formulas?workspace=${workspace}&id=${item.id}`);
  expect((await removed.json()).removed).toBe(1);
});


test("a non-callable standard placeholder does not hide WebKit-prefixed speech", async ({ page }) => {
  await setup(page, { prefixedOnly: true });
  await expect(speak(page)).toBeEnabled();
  await speak(page).click();
  await emit(page, "start"); await emit(page, "audio"); await emit(page, "result");
  await page.waitForURL(/\/tools\/units\?/);
  expect((await probe(page)).starts).toBe(1);
});

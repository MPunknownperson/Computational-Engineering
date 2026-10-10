import { expect, test } from "@playwright/test";
import { repairTranscript, isNearMatch } from "@/lib/voice/matching";
import { LANGUAGE_PACKS, packOrder } from "@/lib/i18n";
import { VoiceRuntime } from "@/lib/voice/pipeline";
import { routeHypotheses } from "@/lib/command-engine";
import { canRunLocalModel, createLocalModelEngine, localModelReady } from "@/lib/voice/local-model";
import { aiAvailability, hasOnDeviceAi } from "@/lib/ai/on-device";

const runtime = () => new VoiceRuntime(packOrder(LANGUAGE_PACKS.en));

test.describe("on-device generative recognition", () => {
  // Recognition is provided by the browser's built-in model. Nothing is
  // downloaded from this origin, so with no browser API present every entry
  // point must degrade quietly rather than throw or start a network fetch.
  test("reports unavailable without a browser built-in model", async () => {
    expect(hasOnDeviceAi()).toBe(false);
    expect(canRunLocalModel()).toBe(false);
    expect(await localModelReady()).toBe(false);
    expect(await aiAvailability("audio")).toBe("unavailable");
    expect(await aiAvailability("text")).toBe("unavailable");
  });

  test("engine construction is refused instead of failing late", () => {
    const engine = createLocalModelEngine({ language: "en-US", onText: () => undefined });
    expect(engine).toBeNull();
  });
});

test.describe("transcript repair", () => {
  test("drops filler words recognisers add", () => {
    expect(repairTranscript("okay please convert 120 usd to euros")).toBe("convert 120 usd to euros");
    expect(repairTranscript("hey can you show me 5 miles to kilometers")).toBe("show me 5 miles to kilometers");
  });

  test("turns dictated decimals into numbers", () => {
    expect(repairTranscript("convert one point five kilometers to miles")).toBe("convert 1.5 kilometers to miles");
    expect(repairTranscript("12 point 5 kg to pounds")).toBe("12.5 kg to pounds");
  });

  test("turns fractions into a numeric amount", () => {
    expect(repairTranscript("convert half a kilo to pounds")).toContain("0.5 kilo");
  });
});

test.describe("tolerant matching", () => {
  test("accepts common recogniser spelling slips and rejects unrelated words", () => {
    expect(isNearMatch("kihlograms", "kilograms")).toBe(true);
    expect(isNearMatch("dolars", "dollars")).toBe(true);
    expect(isNearMatch("celcius", "celsius")).toBe(true);
    expect(isNearMatch("dog", "dollars")).toBe(false);
    expect(isNearMatch("euros", "kilos")).toBe(false);
  });
});

test.describe("recognition accuracy end to end", () => {
  test("a mis-spelled currency name still routes to the right tool", () => {
    const route = runtime().interpret({ heard: "convert 120 dolars to euross", hypothesis: "convert 120 dolars to euross" });
    const params = new URL(route!.action.href, "http://site.test").searchParams;
    expect(params.get("base")).toBe("USD");
    expect(params.get("to")).toBe("EUR");
    expect(params.get("amount")).toBe("120");
  });

  test("a dictated decimal resolves to the right amount", () => {
    const route = runtime().interpret({ heard: "convert 1.5 miles to kilometers", hypothesis: "convert 1.5 miles to kilometers" });
    expect(new URL(route!.action.href, "http://site.test").searchParams.get("value")).toBe("1.5");
  });

  test("the best hypothesis wins even when it is not first", () => {
    const route = routeHypotheses(
      ["convert 120 you ess dee to you ros", "convert 120 USD to euros"],
      runtime(),
    );
    expect(route.action?.href).toContain("base=USD&to=EUR&amount=120");
    // The visitor can see which reading was acted on.
    expect(route.understood).toBe("convert 120 USD to euros");
    expect(route.heard).toBe("convert 120 you ess dee to you ros");
  });

  test("confidence breaks a tie without overriding a stronger reading", () => {
    const strong = routeHypotheses(
      [
        { text: "5 miles to kilometers", confidence: 0.2 },
        { text: "something unrelated entirely", confidence: 0.99 },
      ],
      runtime(),
    );
    expect(strong.action?.href).toContain("from=mi&to=km&value=5");
  });

  test("speech that matches nothing still produces no destination", () => {
    const route = runtime().interpret({ heard: "tell me a joke please", hypothesis: "tell me a joke please" });
    expect(route).toBeNull();
  });
});

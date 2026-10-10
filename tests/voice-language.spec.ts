import { expect, test } from "@playwright/test";
import { LANGUAGE_PACKS, PACK_IDS, parseAcceptLanguage, recognitionLocale, selectPack, t } from "@/lib/i18n";
import { parseVoiceCommand } from "@/lib/voice/pipeline";
import { decideVoiceProcessing, regionFromLocale, type PolicyInput } from "@/lib/voice/policy";

function params(href: string | undefined) {
  expect(href, "expected a destination").toBeTruthy();
  const url = new URL(href!, "http://local");
  return { path: url.pathname, ...Object.fromEntries(url.searchParams) };
}

test.describe("language packs", () => {
  test("every pack defines every interface string and its own vocabulary", () => {
    const keys = Object.keys(LANGUAGE_PACKS.en.ui);
    for (const id of PACK_IDS) {
      const pack = LANGUAGE_PACKS[id];
      for (const key of keys) expect(pack.ui[key as keyof typeof pack.ui], `${id} ${key}`).toBeTruthy();
      expect(Object.keys(pack.currencies).length, `${id} currencies`).toBeGreaterThanOrEqual(15);
      expect(Object.keys(pack.units).length, `${id} units`).toBeGreaterThanOrEqual(30);
      expect(pack.examples.length).toBeGreaterThan(2);
    }
  });

  test("packs are selected from browser languages and fill placeholders", () => {
    expect(selectPack(parseAcceptLanguage("de-CH,de;q=0.9,en;q=0.7")).id).toBe("de");
    expect(selectPack(["pt-BR", "es-MX"]).id).toBe("es");
    expect(selectPack("ja-JP").id).toBe("en");
    expect(recognitionLocale(LANGUAGE_PACKS.es, ["es-MX"])).toBe("es-MX");
    expect(t(LANGUAGE_PACKS.fr, "voice.heard", { text: "bonjour" })).toContain("bonjour");
  });
});

test.describe("spoken commands", () => {
  test("“Convert 120 USD to Euros” opens the currency converter at 120 USD → EUR", () => {
    expect(params(parseVoiceCommand("Convert 120 USD to Euros")?.href)).toEqual({
      path: "/tools/currency", base: "USD", to: "EUR", amount: "120",
    });
  });

  test("currency phrasing in every supported language", () => {
    const cases: Array<[string, string, string, string]> = [
      ["convert one hundred twenty us dollars to euros", "USD", "EUR", "120"],
      ["Convierte 120 dólares a euros", "USD", "EUR", "120"],
      ["Convertir cent vingt dollars en euros", "USD", "EUR", "120"],
      ["Rechne hundertzwanzig Euro in Dollar um", "EUR", "USD", "120"],
      ["把120美元换成欧元", "USD", "EUR", "120"],
      ["一百二十美元换成欧元", "USD", "EUR", "120"],
      ["$45.50 in british pounds", "USD", "GBP", "45.5"],
      ["100 pounds to dollars", "GBP", "USD", "100"],
      ["1.200,50 euros en dólares", "EUR", "USD", "1200.5"],
    ];
    for (const [speech, base, to, amount] of cases) {
      expect(params(parseVoiceCommand(speech)?.href), speech).toEqual({ path: "/tools/currency", base, to, amount });
    }
  });

  test("unit conversions, including spoken numbers and ambiguous words", () => {
    const cases: Array<[string, string, string, string, string]> = [
      ["five miles to kilometers", "length", "mi", "km", "5"],
      ["70 kilos in pounds", "mass", "kg", "lb", "70"],
      ["20 degrees Celsius to Fahrenheit", "temperature", "C", "F", "20"],
      ["10 in to cm", "length", "in", "cm", "10"],
      ["500 square feet in square meters", "area", "ft2", "m2", "500"],
      ["100 km/h to mph", "speed", "km/h", "mph", "100"],
      ["70公斤是多少磅", "mass", "kg", "lb", "70"],
      ["5 Meilen in Kilometer", "length", "mi", "km", "5"],
      ["veinte litros a galones", "volume", "l", "gal_us", "20"],
    ];
    for (const [speech, category, from, to, value] of cases) {
      expect(params(parseVoiceCommand(speech)?.href), speech).toEqual({ path: "/tools/units", category, from, to, value });
    }
  });

  test("a single amount and unit uses a sensible default target", () => {
    expect(params(parseVoiceCommand("how much is 30 euros")?.href)).toMatchObject({ base: "EUR", to: "USD", amount: "30" });
    expect(params(parseVoiceCommand("12 kilograms")?.href)).toMatchObject({ category: "mass", from: "kg", to: "lb", value: "12" });
  });

  test("topics route to their calculators in each language", () => {
    expect(parseVoiceCommand("split the bill")?.href).toContain("preset=tip-split");
    expect(parseVoiceCommand("calcula la cuota mensual de la hipoteca")?.href).toContain("preset=loan-payment");
    expect(parseVoiceCommand("taux d'inflation")?.href).toContain("indicator=inflation");
    expect(parseVoiceCommand("比特币价格")?.href).toContain("tools/crypto");
  });

  test("unrelated speech is never guessed into a destination", () => {
    expect(parseVoiceCommand("what a lovely day it is")).toBeNull();
    expect(parseVoiceCommand("open https://evil.example")).toBeNull();
    expect(parseVoiceCommand("")).toBeNull();
  });
});

test.describe("automatic processing assignment", () => {
  const base: PolicyInput = {
    speechApi: true, os: "windows", device: "desktop", browser: "chrome",
    browserCloud: true, local: "unknown", region: "US",
  };

  test("desktop uses cloud; mobile uses on-device", () => {
    expect(decideVoiceProcessing(base)).toMatchObject({ available: true, mode: "cloud" });
    expect(decideVoiceProcessing({ ...base, os: "android", device: "phone" })).toMatchObject({ available: true, mode: "local" });
    expect(decideVoiceProcessing({ ...base, os: "ios", device: "phone", browser: "safari", local: "available" })).toMatchObject({ mode: "local" });
  });

  test("a downloadable local model is prepared automatically", () => {
    expect(decideVoiceProcessing({ ...base, os: "android", device: "phone", local: "downloadable" }))
      .toMatchObject({ mode: "local", prepareLocal: true });
  });

  test("browsers without cloud speech use local; devices can use permitted browser speech when local support is absent", () => {
    expect(decideVoiceProcessing({ ...base, browserCloud: false })).toMatchObject({ mode: "local" });
    expect(decideVoiceProcessing({ ...base, browserCloud: false, local: "unavailable" })).toMatchObject({ available: false, reason: "no-cloud" });
    expect(decideVoiceProcessing({ ...base, os: "ios", device: "phone", local: "unavailable" })).toMatchObject({ available: true, mode: "cloud" });
    expect(decideVoiceProcessing({ ...base, speechApi: false })).toMatchObject({ available: false, reason: "no-api" });
  });

  test("regional rules restrict or disable processing", () => {
    expect(decideVoiceProcessing({ ...base, region: "CN" })).toMatchObject({ mode: "local", rule: "local-only" });
    expect(decideVoiceProcessing({ ...base, region: "CN", local: "unavailable" })).toMatchObject({ available: false, reason: "no-local" });
    expect(decideVoiceProcessing({ ...base, region: "IR" })).toMatchObject({ available: false, reason: "region" });
    expect(decideVoiceProcessing({ ...base, os: "android", device: "phone", region: "FR", overrides: { FR: "cloud-only" } }))
      .toMatchObject({ mode: "cloud", rule: "cloud-only" });
    expect(decideVoiceProcessing({ ...base, region: "DE", overrides: { DE: "none" } })).toMatchObject({ available: false, reason: "region" });
    expect(decideVoiceProcessing({ ...base, region: "HK" })).toMatchObject({ available: true, mode: "cloud", rule: "any" });
    expect(regionFromLocale("zh-Hant-HK")).toBe("HK");
    expect(regionFromLocale("zh-Hans-CN")).toBe("CN");
    expect(regionFromLocale("en")).toBeNull();
  });
});

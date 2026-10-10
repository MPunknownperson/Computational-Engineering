import { expect, test } from "@playwright/test";
import { LANGUAGE_PACKS, recognitionLocale } from "@/lib/i18n";
import { segmentWords, withSystemVocabulary } from "@/lib/i18n/system-lexicon";
import { findSiteContent, contentById, allContent } from "@/lib/voice/site-content";
import { parseVoiceCommand } from "@/lib/voice/pipeline";
import { verify } from "@/lib/voice/ir";
import { execute } from "@/lib/voice/vm";

const url = (href: string) => new URL(href, "http://site.test");

test("OS locale survives even when site UI has no translated pack", () => {
  expect(recognitionLocale(LANGUAGE_PACKS.en, ["hi-IN"])).toBe("hi-IN");
  expect(recognitionLocale(LANGUAGE_PACKS.en, ["ar-EG"])).toBe("ar-EG");
  expect(recognitionLocale(LANGUAGE_PACKS.fr, ["fr-CA"])).toBe("fr-CA");
});

test("OS ICU generates currency words without a hand-written language pack", () => {
  const pack = withSystemVocabulary(LANGUAGE_PACKS.en, "pt-BR");
  expect(pack.speechLocales[0]).toBe("pt-BR");
  expect(pack.currencies.EUR).toContain("euro");
  expect(pack.currencies.BRL?.length).toBeGreaterThan(0);
  const action = parseVoiceCommand("120 BRL to EUR", [pack]);
  expect(url(action!.href).searchParams.get("amount")).toBe("120");
  expect(url(action!.href).searchParams.get("base")).toBe("BRL");
});

test("Unicode segmentation and OS numerals accept diverse scripts", () => {
  expect(segmentWords("नमस्ते दुनिया", "hi-IN").length).toBeGreaterThan(0);
  expect(segmentWords("مرحبا بالعالم", "ar-EG").length).toBeGreaterThan(0);
  expect(segmentWords("你好世界", "zh-CN").length).toBeGreaterThan(0);
  const pack = withSystemVocabulary(LANGUAGE_PACKS.en, "ar-EG");
  expect(url(parseVoiceCommand("١٢٠ USD to EUR", [pack])!.href).searchParams.get("amount")).toBe("120");
  expect(url(parseVoiceCommand("१२ किलो to pounds", [withSystemVocabulary(LANGUAGE_PACKS.en, "hi-IN")])!.href).searchParams.get("value")).toBe("12");
});

test("complete indexed site catalog can be navigated only through explicit requests", () => {
  expect(allContent().length).toBeGreaterThan(35);
  const guide = findSiteContent("open the meters to feet guide");
  expect(guide?.path).toBe("/guides/meters-to-feet");
  const reading = parseVoiceCommand("open the meters to feet guide");
  expect(reading?.href).toBe("/guides/meters-to-feet");
  expect(findSiteContent("what a lovely day it is")).toBeNull();
  expect(parseVoiceCommand("open https://malicious.example")).toBeNull();
});

test("opaque content ids are verified and executor allows only catalog routes", () => {
  const guide = findSiteContent("open the meters to feet guide")!;
  expect(contentById(guide.id)?.path).toBe("/guides/meters-to-feet");
  const program = { v: 1, lang: "en", code: [{ op: "OPEN_PAGE", slots: { pageId: guide.id } }] };
  expect(verify(program)).toBeNull();
  const result = execute(program);
  expect(result.ok && result.action.href).toBe("/guides/meters-to-feet");
  expect(execute({ v: 1, lang: "en", code: [{ op: "OPEN_PAGE", slots: { pageId: "not-an-id" } }] })).toMatchObject({ ok: false, error: "unknown-page" });
  expect(verify({ v: 1, lang: "en", code: [{ op: "OPEN_PAGE", slots: { pageId: "https://malicious.example" } }] })).toBe("bad-slot-value");
});

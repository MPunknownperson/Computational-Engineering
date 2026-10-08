import { expect, test } from "@playwright/test";
import { LANGUAGE_PACKS, packOrder } from "@/lib/i18n";
import { decode, encode, fingerprint, verify } from "@/lib/voice/ir";
import { allPacks } from "@/lib/voice/parser";
import { VoiceRuntime, parseVoiceCommand } from "@/lib/voice/pipeline";
import { execute } from "@/lib/voice/vm";
import type { Program } from "@/lib/voice/ir";

const runtime = () => new VoiceRuntime(packOrder(LANGUAGE_PACKS.en));

const params = (href: string | undefined) => {
  expect(href, "expected a destination").toBeTruthy();
  const url = new URL(href!, "http://local");
  return { path: url.pathname, ...Object.fromEntries(url.searchParams) };
};

test.describe("intermediate representation", () => {
  const program: Program = {
    v: 1,
    lang: "en",
    code: [{ op: "CONVERT", slots: { amount: 120, from: "USD", to: "EUR" } }],
  };

  test("serialises deterministically and hashes to a stable fingerprint", () => {
    expect(encode(program)).toBe("v1|en|CONVERT{amount:120,from:USD,to:EUR}");
    expect(encode(program)).toBe(encode(structuredClone(program)));
    expect(fingerprint(program)).toMatch(/^[0-9a-f]{8}$/);
    expect(fingerprint(program)).toBe(fingerprint(structuredClone(program)));
  });

  test("two languages with the same meaning compile to the same program", () => {
    const english = parseVoiceCommand("convert 120 usd to euros", allPacks(LANGUAGE_PACKS.en));
    const spanish = parseVoiceCommand("convierte 120 dólares a euros", allPacks(LANGUAGE_PACKS.es));
    expect(english?.href).toBe(spanish?.href);
  });

  test("decode round-trips a verified program", () => {
    const decoded = decode(encode(program));
    if ("error" in decoded) throw new Error("expected a program");
    expect(decoded.program.v).toBe(program.v);
    expect(decoded.program.code[0]?.slots).toEqual(program.code[0]?.slots);
  });

  test("rejects malformed or hostile programs", () => {
    expect(verify({ ...program, v: 2 })).toBe("bad-version");
    expect(verify({ ...program, lang: "xx" as Program["lang"] })).toBe("bad-language");
    expect(verify({ ...program, code: [{ op: "DELETE" as Program["code"][number]["op"], slots: {} }] })).toBe("unknown-opcode");
    expect(verify({ ...program, code: [{ op: "CONVERT", slots: { url: "x" } }] })).toBe("unknown-slot");
    expect(verify({ ...program, code: [{ op: "CONVERT", slots: { amount: 0, from: "USD", to: "EUR" } }] })).toBe("bad-slot-value");
    expect(verify({ ...program, code: [{ op: "CONVERT", slots: { amount: -5, from: "USD", to: "EUR" } }] })).toBe("bad-slot-value");
    expect(verify({ ...program, code: [{ op: "CONVERT", slots: { to: "java script:alert(1)" } }] })).toBe("bad-slot-value");
    expect(verify({ ...program, code: [{ op: "CONVERT", slots: { to: "https://evil.example" } }] })).toBe("bad-slot-value");
    expect(
      verify({
        ...program,
        code: [
          { op: "CONVERT", slots: { amount: 1, from: "USD", to: "EUR" } },
          { op: "CONVERT", slots: { amount: 1, from: "USD", to: "EUR" } },
          { op: "CONVERT", slots: { amount: 1, from: "USD", to: "EUR" } },
          { op: "CONVERT", slots: { amount: 1, from: "USD", to: "EUR" } },
        ],
      }),
    ).toBe("too-long");
    const broken = decode("v1|en|CONVERT{amount:120|EXTRA");
    if (!("error" in broken)) throw new Error("expected rejection");
    expect(broken.error).toBe("unparseable");
  });
});

test.describe("executor", () => {
  test("derives destinations from the allow-listed builders only", () => {
    expect(
      params(
        execute({
          v: 1,
          lang: "en",
          code: [{ op: "CONVERT", slots: { amount: 120, from: "USD", to: "EUR" } }],
        }).ok
          ? (execute({ v: 1, lang: "en", code: [{ op: "CONVERT", slots: { amount: 120, from: "USD", to: "EUR" } }] }) as { action: { href: string } }).action.href
          : undefined,
      ),
    ).toEqual({ path: "/tools/currency", base: "USD", to: "EUR", amount: "120" });

    const unit = execute({
      v: 1,
      lang: "en",
      code: [{ op: "CONVERT", slots: { amount: 5, category: "length", from: "mi", to: "km" } }],
    });
    expect(unit.ok && unit.action.href).toContain("/tools/units?category=length&from=mi&to=km&value=5");

    const topic = execute({ v: 1, lang: "en", code: [{ op: "OPEN", slots: { topic: "tip" } }] });
    expect(topic.ok && topic.action.href).toContain("preset=tip-split");
  });

  test("rejects mismatched or unknown slots instead of navigating", () => {
    expect(
      execute({ v: 1, lang: "en", code: [{ op: "CONVERT", slots: { amount: 1, from: "kg", to: "EUR" } }] }),
    ).toMatchObject({ ok: false });
    expect(
      execute({ v: 1, lang: "en", code: [{ op: "CONVERT", slots: { from: "USD" } }] }),
    ).toMatchObject({ ok: false, error: "missing-slots" });
    expect(
      execute({ v: 1, lang: "en", code: [{ op: "OPEN", slots: { topic: "self-destruct" } }] }),
    ).toMatchObject({ ok: false, error: "unknown-topic" });
    expect(execute({ v: 1, lang: "en", code: [{ op: "REPEAT" }] })).toMatchObject({
      ok: false,
      error: "nothing-to-repeat",
    });
  });

  test("REPEAT re-executes the previous program after verifying it", () => {
    const previous: Program = {
      v: 1,
      lang: "en",
      code: [{ op: "CONVERT", slots: { amount: 120, from: "USD", to: "EUR" } }],
    };
    const result = execute({ v: 1, lang: "en", code: [{ op: "REPEAT" }] }, previous);
    expect(result.ok && result.action.href).toContain("base=USD&to=EUR&amount=120");
  });
});

test.describe("semantic layer with context", () => {
  test("ellipsis reuses the previous direction with a new amount", () => {
    const session = runtime();
    expect(session.interpret({ heard: "120 usd to euros", hypothesis: "120 usd to euros" })?.action.href).toContain("base=USD&to=EUR&amount=120");
    const second = session.interpret({ heard: "and 80", hypothesis: "and 80" });
    expect(second?.action.href).toContain("base=USD&to=EUR&amount=80");
  });

  test("“again” replays the previous command in five languages", () => {
    const cases: Array<[string, string, string]> = [
      ["70 kg to lb", "again", "kg"],
      ["70 kilos a libras", "otra vez", "kg"],
      ["70 kg en livres", "encore", "kg"],
      ["70 kg in pfund", "nochmal", "kg"],
      ["70公斤是多少磅", "再来一次", "kg"],
    ];
    for (const [first, repeat, from] of cases) {
      const session = runtime();
      session.interpret({ heard: first, hypothesis: first });
      const again = session.interpret({ heard: repeat, hypothesis: repeat });
      expect(again?.action.href, repeat).toContain(`from=${from}&to=lb`);
    }
  });

  test("a single entity picks a sensible default target", () => {
    expect(params(parseVoiceCommand("how much is 30 euros")?.href)).toMatchObject({ base: "EUR", to: "USD", amount: "30" });
    expect(params(parseVoiceCommand("12 kilograms")?.href)).toMatchObject({ category: "mass", from: "kg", to: "lb", value: "12" });
  });

  test("understanding is deterministic across runs", () => {
    const first = runtime().interpret({ heard: "convert 120 usd to euros", hypothesis: "convert 120 usd to euros" });
    const second = runtime().interpret({ heard: "convert 120 usd to euros", hypothesis: "convert 120 usd to euros" });
    expect(first?.program && encode(first.program)).toBe(second?.program && encode(second.program));
    expect(first?.action.href).toBe(second?.action.href);
  });

  test("speech that matches nothing produces no program and no destination", () => {
    const session = runtime();
    expect(session.interpret({ heard: "what a lovely day", hypothesis: "what a lovely day" })).toBeNull();
    expect(session.interpret({ heard: "open https://evil.example", hypothesis: "open https://evil.example" })).toBeNull();
    expect(session.interpret({ heard: "", hypothesis: "" })).toBeNull();
  });
});

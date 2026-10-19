import { expect, test } from "@playwright/test";
import { LANGUAGE_PACKS, packOrder } from "@/lib/i18n";
import { VoiceRuntime } from "@/lib/voice/pipeline";
import {
  canonicaliseSpokenNumbers,
  detectOperationIntent,
  extractNumericMentions,
  OPERATION_ASSOCIATIONS,
} from "@/lib/voice/operation-intent";

const decide = (text: string) =>
  new VoiceRuntime(packOrder(LANGUAGE_PACKS.en)).decide({ heard: text, hypothesis: text });

test.describe("linguistic operation compiler", () => {
  test("composes spoken scales and arithmetic", () => {
    expect(canonicaliseSpokenNumbers("one hundred and twenty divided by three")).toBe("120 divided by 3");
    const decision = decide("what is one hundred and twenty divided by three");
    expect(decision.kind).toBe("action");
    if (decision.kind === "action") {
      expect(decision.domain).toBe("math");
      expect(decision.action.result).toBe("40");
    }
  });

  test("compiles and executes a fully specified bill split", () => {
    const text = "split a 120 dollar bill with 20 percent tip between 4 people";
    const compiled = detectOperationIntent(text);
    expect(compiled).toMatchObject({
      id: "bill-split",
      family: "everyday",
      expression: "(120 * (1 + 20 / 100)) / 4",
      parameters: { bill: 120, people: 4, tipPercent: 20 },
    });
    const decision = decide(text);
    expect(decision.kind).toBe("action");
    if (decision.kind === "action") {
      expect(decision.domain).toBe("finance");
      expect(decision.action.result).toBe("36");
      expect(decision.action.href).toBe("/tools/formula?preset=tip-split");
    }
  });

  test("supports non-English bill associations without a separate UI", () => {
    expect(detectOperationIntent("dividir una cuenta de 90 entre 3 personas")?.id).toBe("bill-split");
    expect(detectOperationIntent("rechnung 80 teilen zwischen 4 personen")?.id).toBe("bill-split");
  });

  test("generates closed math code for percentages and statistics", () => {
    expect(detectOperationIntent("what is 15 percent of 80")?.expression).toBe("80 * 15 / 100");
    expect(detectOperationIntent("find the average of 4 8 and 12")?.expression).toBe("mean([4,8,12])");
    expect(detectOperationIntent("percentage change from 80 to 100")?.expression).toBe("((100 - 80) / abs(80)) * 100");
  });

  test("labels finance slots instead of using number order blindly", () => {
    expect(detectOperationIntent("monthly loan payment on 250000 at 4.8 percent for 30 years"))
      .toMatchObject({ id: "loan-payment", parameters: { principal: 250000, ratePercent: 4.8, years: 30 } });
    expect(detectOperationIntent("fuel cost for 340 kilometers at 7.4 liters per 100 and 1.68 per liter"))
      .toMatchObject({ id: "fuel-cost", parameters: { distance: 340, consumption: 7.4, price: 1.68 } });
  });

  test("does not invent missing required values", () => {
    expect(detectOperationIntent("split the bill")).toBeNull();
    expect(detectOperationIntent("loan payment at five percent")).toBeNull();
    expect(extractNumericMentions("nothing numeric here")).toEqual([]);
  });

  test("registry remains declarative and uniquely keyed", () => {
    const ids = OPERATION_ASSOCIATIONS.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(["bill-split", "percent-of", "average", "loan-payment", "fuel-cost"]));
  });
});

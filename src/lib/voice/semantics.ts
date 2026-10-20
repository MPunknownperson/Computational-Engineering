import type { LanguagePack, TopicId } from "@/lib/i18n";
import {
  analyse,
  compatible,
  economyFor,
  formatAmount,
  pairMentions,
  scoreAnalysis,
  type Analysis,
} from "@/lib/voice/parser";
import { detectMathIntent, hasMonetaryLanguage, type MathIntent } from "@/lib/voice/math-intent";
import { detectOperationIntent, type OperationIntent } from "@/lib/voice/operation-intent";
import { generateCode, type GeneratedProgram } from "@/lib/voice/codegen";
import { associate, associateAsset, associateCountry, associateIndicator, type Association } from "@/lib/voice/association";
import { contentByPath } from "@/lib/voice/site-content";
import type { ConversationContext } from "@/lib/voice/context";
import {
  IR_VERSION,
  MAX_INSTRUCTIONS,
  verify,
  type Instruction,
  type Program,
  type Slots,
  type SlotKey,
  type SlotValue,
} from "@/lib/voice/ir";

/**
 * Stage 3: the semantic layer.
 *
 * Takes a lexical analysis and builds meaning: which conversion, which
 * direction, which topic, how much. Context resolves what the words alone do
 * not — an ellipsis ("120 dollars to euros" then "…and 80"), a request to
 * repeat ("again"), an ambiguous word ("pounds"), and a missing target
 * ("30 euros" → EUR→USD).
 *
 * Output is a `Program` in the site's intermediate representation, never a URL.
 */

/** Where a lone unit goes when the visitor names only one side. */
const DEFAULT_UNIT_TARGET: Record<string, string> = {
  kg: "lb", lb: "kg", g: "oz", oz: "g", t: "lb", mg: "g",
  km: "mi", mi: "km", m: "ft", ft: "m", cm: "in", in: "cm", mm: "in", yd: "m", nmi: "km",
  C: "F", F: "C", K: "C",
  l: "gal_us", gal_us: "l", gal_uk: "l", ml: "cup_us", cup_us: "ml", pt_us: "l", m3: "l",
  m2: "ft2", ft2: "m2", ha: "ac", ac: "ha", km2: "m2", cm2: "in2", in2: "cm2", mm2: "cm2",
  "km/h": "mph", mph: "km/h", "m/s": "km/h", kn: "km/h",
  MB: "MiB", MiB: "MB", GB: "GiB", GiB: "GB", TB: "TiB", TiB: "TB", kB: "KiB", KiB: "kB", B: "b", b: "B",
  s: "min", min: "h", h: "min", d: "h", wk: "d", yr: "d", ms: "s",
};

export interface BuildResult {
  program: Program;
  score: number;
  error?: undefined;
}

export interface BuildFailure {
  program?: undefined;
  score?: undefined;
  error:
    | "nothing-understood"
    | "malformed"
    | "no-previous-command"
    | "ambiguous-domain";
}

/** Extra facts the builder reports so the dispatch guard can validate it. */
export interface BuildEvidence {
  math: MathIntent | null;
  operation: OperationIntent | null;
  /** Program written by the automated code generator, when one applied. */
  generated: GeneratedProgram | null;
  /** Capability the language-association layer mapped the sentence to. */
  association: Association | null;
  inherited: boolean;
  currencyMentions: number;
  unitMentions: number;
}

let lastEvidence: BuildEvidence = { math: null, operation: null, generated: null, association: null, inherited: false, currencyMentions: 0, unitMentions: 0 };

/** Evidence gathered while building the most recent program. */
export function evidenceOfLastBuild(): BuildEvidence {
  return lastEvidence;
}

function program(lang: LanguagePack["id"], code: Instruction[]): Program {
  return { v: IR_VERSION, lang, code };
}

/** Drop absent slots so they are not mistaken for invalid values. */
function clean(slots: Slots): Slots | undefined {
  const kept: Slots = {};
  for (const [key, value] of Object.entries(slots)) {
    if (value !== undefined) kept[key as SlotKey] = value as SlotValue;
  }
  return Object.keys(kept).length ? kept : undefined;
}

function convert(slots: Slots): Instruction {
  return { op: "CONVERT", slots: clean(slots) };
}

function open(slots: Slots): Instruction {
  return { op: "OPEN", slots: clean(slots) };
}

/** Slots of the most recent CONVERT instruction, if any. */
export function previousConvert(program: Program | null | undefined): Slots | null {
  if (!program) return null;
  for (let index = program.code.length - 1; index >= 0; index -= 1) {
    const instruction = program.code[index];
    if (instruction?.op === "CONVERT" && instruction.slots) return instruction.slots;
  }
  return null;
}

/** Build a program from an analysis, using `previous` for ellipsis and repeat. */
export function buildProgram(
  analysis: Analysis,
  previous: Program | null,
  context?: ConversationContext,
): BuildResult | BuildFailure {
  const pack = analysis.pack;
  const amountSlot = analysis.amount ? Number(formatAmount(analysis.amount.value)) : undefined;
  const prior = previousConvert(previous);

  // ---- Evidence -----------------------------------------------------------
  const sourceText = analysis.raw || analysis.text;
  const math = detectMathIntent(sourceText);
  const operation = detectOperationIntent(sourceText);
  const currencyMentions = analysis.mentions.filter((mention) =>
    mention.candidates.some((candidate) => candidate.type === "currency"),
  ).length;
  const unitMentions = analysis.mentions.filter((mention) =>
    mention.candidates.some((candidate) => candidate.type === "unit"),
  ).length;
  const pairCandidate = pairMentions(analysis.mentions);
  // ---- Automated code generation -----------------------------------------
  // A sentence that names a calculation the site can perform is compiled to
  // self-contained code. Conversions with both sides recognised stay with
  // the conversion executor.
  const generatedRaw = generateCode(sourceText);
  const generated = generatedRaw && !(pairCandidate && (generatedRaw.family === "arithmetic" || generatedRaw.family === "function")) && !(generatedRaw.family === "arithmetic" && currencyMentions > 0)
    ? generatedRaw
    : null;
  lastEvidence = { math, operation, generated, association: null, inherited: false, currencyMentions, unitMentions };

  // ---- Mathematics has priority ------------------------------------------
  // A sentence containing an equation, or clearly arithmetic with no money
  // words, is compiled to SOLVE/EVAL before any conversion reading is tried.
  const monetary = hasMonetaryLanguage(analysis.raw || analysis.text);
  const mathWins =
    math !== null &&
    (math.task === "solve-equation" || (!monetary && math.confidence >= 0.45 && currencyMentions === 0));
  // A specialised generated program (finance, geometry, percentages...) is a
  // more complete reading than a bare arithmetic guess at the same words.
  const generatedWins =
    generated !== null &&
    (math === null || math.task !== "solve-equation") &&
    (generated.family !== "arithmetic" || !mathWins);
  if (generatedWins && generated) {
    const instruction: Instruction = {
      op: "RUN",
      slots: clean({
        capability: generated.capability,
        expression: generated.code,
        ...(generated.preset ? { preset: generated.preset } : {}),
        ...(generated.unit ? { unit: generated.unit } : {}),
      }),
    };
    const result = program(pack.id, [instruction]);
    if (!verify(result)) {
      return { program: result, score: Math.max(scoreAnalysis(analysis), 1) + generated.confidence };
    }
  }
  if (mathWins && math) {
    const instruction: Instruction = {
      op: math.task === "solve-equation" ? "SOLVE" : "EVAL",
      slots: clean({
        expression: math.canonical,
        ...(math.variable ? { variable: math.variable } : {}),
      }),
    };
    const result = program(pack.id, [instruction]);
    return verify(result)
      ? { error: "malformed" }
      : { program: result, score: Math.max(scoreAnalysis(analysis), 1) + math.confidence };
  }

  // Natural operations compile to generated maths code and optional existing
  // tool presets. The expression is still constrained by the IR verifier and
  // the mathjs AST allow-list; no recognised phrase becomes executable JS.
  if (operation) {
    const instruction: Instruction = {
      op: "EVAL",
      slots: clean({
        expression: operation.expression,
        operation: operation.id,
        ...(operation.preset ? { preset: operation.preset } : {}),
      }),
    };
    const result = program(pack.id, [instruction]);
    return verify(result)
      ? { error: "malformed" }
      : { program: result, score: Math.max(scoreAnalysis(analysis), 1) + operation.confidence };
  }

  // Explicit content navigation is compiled to an opaque catalog id. The
  // executor, not the speech input, owns the final URL.
  if (analysis.pageId) {
    const result = program(pack.id, [{ op: "OPEN_PAGE", slots: { pageId: analysis.pageId } }]);
    return verify(result) ? { error: "malformed" } : { program: result, score: scoreAnalysis(analysis) };
  }

  // "again" / "otra vez" / "再来一次"
  if (analysis.again && !analysis.paired) {
    if (!prior) return { error: "no-previous-command" };
    const result = program(pack.id, [{ op: "REPEAT" }]);
    return verify(result) ? { error: "malformed" } : { program: result, score: scoreAnalysis(analysis) + 1.1 };
  }

  const pair = pairCandidate;
  if (pair) {
    // "how many pounds is 70 kilos" / "what is 70 kilos in pounds": the side
    // that carries the amount is the source, whichever is spoken first.
    const [a, b] = orientPair(pair, analysis);
    const result =
      a.type === "currency"
        ? program(pack.id, [convert({ amount: amountSlot, from: a.code, to: (b as { code: string }).code })])
        : program(pack.id, [
            convert({
              amount: amountSlot,
              category: a.type === "unit" ? a.category : undefined,
              from: a.id,
              to: (b as { id: string }).id,
            }),
          ]);
    return verify(result) ? { error: "malformed" } : { program: result, score: scoreAnalysis(analysis) };
  }

  // Ellipsis: an amount with no entities repeats the previous direction — but
  // only when the previous turn really was a conversion of the same kind and
  // the current sentence shows no mathematical intent. This is the specific
  // path that used to turn a calculation result into a currency conversion.
  const priorDomain: "currency" | "units" | null = prior
    ? typeof prior.category === "string"
      ? "units"
      : "currency"
    : null;
  const inheritanceAllowed =
    priorDomain !== null &&
    math === null &&
    (context ? context.mayInherit(priorDomain) : true);
  if (analysis.amount && !analysis.mentions.length && prior?.from && prior?.to) {
    if (!inheritanceAllowed) {
      return { error: "nothing-understood" };
    }
    lastEvidence = { ...lastEvidence, inherited: true };
    const slots: Slots = {
      amount: amountSlot,
      from: prior.from,
      to: prior.to,
      ...(typeof prior.category === "string" ? { category: prior.category } : {}),
    };
    const result = program(pack.id, [convert(slots)]);
    return verify(result) ? { error: "malformed" } : { program: result, score: scoreAnalysis(analysis) };
  }

  // One entity plus an amount: fill in the sensible other side.
  if (analysis.amount && analysis.mentions.length) {
    // Previously this preferred a currency reading for *any* mention, which
    // let non-monetary words drift into the money converter. The first
    // candidate now wins unless the sentence actually mentions a currency.
    const mention = analysis.mentions[0];
    const first = (currencyMentions > 0
      ? mention.candidates.find((c) => c.type === "currency")
      : undefined) ?? mention.candidates[0];
    if (!first) return { error: "nothing-understood" };
    if (first.type === "currency") {
      if (currencyMentions === 0) return { error: "nothing-understood" };
      const target =
        first.code === pack.defaultCurrency ? (first.code === "USD" ? "EUR" : "USD") : pack.defaultCurrency;
      const result = program(pack.id, [convert({ amount: amountSlot, from: first.code, to: target })]);
      return verify(result) ? { error: "malformed" } : { program: result, score: scoreAnalysis(analysis) };
    }
    const target = DEFAULT_UNIT_TARGET[first.id];
    if (!target) return { error: "nothing-understood" };
    const result = program(pack.id, [
      convert({ amount: amountSlot, category: first.category, from: first.id, to: target }),
    ]);
    return verify(result) ? { error: "malformed" } : { program: result, score: scoreAnalysis(analysis) };
  }

  if (analysis.topic) {
    const country = analysis.topic === "inflation" || analysis.topic === "gdp" ? associateCountry(sourceText) : null;
    const indicator = analysis.topic === "inflation" || analysis.topic === "gdp" ? associateIndicator(sourceText) : null;
    const asset = analysis.topic === "crypto" || analysis.topic === "bitcoin" ? associateAsset(sourceText) : null;
    // "interest rates in brazil" names a country and a World Bank series, so
    // it is economic data, not the compound-interest preset.
    if (analysis.topic !== "inflation" && analysis.topic !== "gdp" && analysis.topic !== "crypto" && analysis.topic !== "bitcoin") {
      const series = associateIndicator(sourceText);
      const economy = series ? associateCountry(sourceText) : null;
      if (series && economy) return buildTopic(series === "inflation" ? "inflation" : "gdp", analysis, pack.defaultCurrency, economy, series);
    }
    return buildTopic(analysis.topic, analysis, pack.defaultCurrency, country ?? economyFor(pack), indicator, asset);
  }

  // Language association: the sentence names a capability of the site (a
  // tool, a page, a market series) without the parser's keywords.
  const association = associate(sourceText, { locale: pack.id, recentDomain: context?.recent()?.domain ?? null });
  if (association) {
    lastEvidence = { ...lastEvidence, association };
    if (association.kind === "page") {
      const entry = contentByPath(association.path);
      if (entry) {
        const result = program(pack.id, [{ op: "OPEN_PAGE", slots: { pageId: entry.id } }]);
        return verify(result) ? { error: "malformed" } : { program: result, score: Math.max(scoreAnalysis(analysis), 0.5) + association.score };
      }
    } else {
      const slots: Slots = clean({
        topic: association.topic,
        asset: association.slots.asset,
        economy: association.slots.economy ?? (association.topic === "inflation" || association.topic === "gdp" ? economyFor(pack) : undefined),
        indicator: association.slots.indicator ?? (association.topic === "inflation" ? "inflation" : association.topic === "gdp" ? "gdp_per_capita" : undefined),
      }) ?? { topic: association.topic };
      const result = program(pack.id, [open(slots)]);
      return verify(result) ? { error: "malformed" } : { program: result, score: Math.max(scoreAnalysis(analysis), 0.5) + association.score };
    }
  }

  // No amount and no entities: a bare repeat request already handled, so stop.
  return { error: "nothing-understood" };
}

type Pair = NonNullable<ReturnType<typeof pairMentions>>;

/** Put the entity nearest the spoken amount first; it is the source side. */
function orientPair(pair: Pair, analysis: Analysis): Pair {
  const amount = analysis.amount;
  if (!amount) return pair;
  const [a, b] = pair;
  const positions = analysis.mentions
    .map((mention) => ({ mention, a: mention.candidates.includes(a), b: mention.candidates.includes(b) }))
    .filter((item) => item.a || item.b);
  const first = positions.find((item) => item.a)?.mention;
  const second = positions.find((item) => item.b)?.mention;
  if (!first || !second) return pair;
  const gap = (mention: { start: number; end: number }) => Math.min(Math.abs(mention.start - amount.end), Math.abs(amount.start - mention.end));
  // The amount sits directly beside the second mention and far from the first.
  if (gap(second) <= 2 && gap(first) > 2 && second.start > first.end) return [b, a];
  return pair;
}

function buildTopic(
  topic: TopicId,
  analysis: Analysis,
  defaultCurrency: LanguagePack["defaultCurrency"],
  economy: string,
  indicator: string | null = null,
  asset: string | null = null,
): BuildResult | BuildFailure {
  const slots: Slots =
    topic === "bitcoin"
      ? { topic, asset: asset ?? "bitcoin" }
      : topic === "crypto"
        ? (asset ? { topic, asset } : { topic })
        : topic === "inflation"
          ? { topic, economy, indicator: indicator ?? "inflation" }
          : topic === "gdp"
            ? { topic, economy, indicator: indicator ?? "gdp_per_capita" }
            : { topic };
  void defaultCurrency;
  const result = program(analysis.pack.id, [open(slots)]);
  return verify(result) ? { error: "malformed" } : { program: result, score: scoreAnalysis(analysis) + 1 };
}

/** Convenience: analyse + build, for callers that have no context. */
export function understand(transcript: string, pack: LanguagePack, previous: Program | null = null) {
  const analysis = analyse(transcript, pack);
  return { analysis, built: buildProgram(analysis, previous) };
}

export { compatible, formatAmount, MAX_INSTRUCTIONS };

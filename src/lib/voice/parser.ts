import {
  LANGUAGE_PACKS,
  UNIVERSAL_CURRENCIES,
  UNIVERSAL_UNITS,
  type CurrencyCode,
  type LanguagePack,
  type TopicId,
} from "@/lib/i18n";
import { CURRENCIES, COUNTRIES } from "@/lib/catalog";
import { FACTORS, TEMPERATURE_UNITS, type Category } from "@/lib/units";
import { findSiteContent } from "@/lib/voice/site-content";
import { isNearMatch, repairTranscript } from "@/lib/voice/matching";

/**
 * Stage 1–2 of the voice pipeline: the lexer and the dictionary.
 *
 * `analyse()` normalises a transcript, reads its amount with the language
 * pack's number lexicon, locates every currency/unit mention with the pack
 * vocabulary plus universal symbols, and detects a calculation topic and a
 * "again" request. It does not decide what to do — that is the semantic layer
 * (`semantics.ts`) and the executor (`vm.ts`).
 */

export type Entity =
  | { type: "currency"; code: CurrencyCode }
  | { type: "unit"; category: Category; id: string };

export interface Mention {
  start: number;
  end: number;
  candidates: Entity[];
}

export interface AmountMatch {
  value: number;
  start: number;
  end: number;
}

export interface Analysis {
  text: string;
  pack: LanguagePack;
  amount: AmountMatch | null;
  mentions: Mention[];
  topic: TopicId | null;
  /** An explicit request for a public page from the site's own catalog. */
  pageId: string | null;
  /** The visitor asked to run the previous command again. */
  again: boolean;
  /** Both sides of a conversion were recognised. */
  paired: boolean;
  /** The pack's own verbs/connectors appear, so this language fits the sentence. */
  grammar: boolean;
}

/* ------------------------------------------------------------------ */
/* Normalisation (lexer)                                               */
/* ------------------------------------------------------------------ */

/** Lower-case, strip accents and punctuation, collapse whitespace. */
export function normalizeSpeech(input: string): string {
  return input
    .normalize("NFKC")
    .toLocaleLowerCase()
    .normalize("NFD")
    // Fold accents on Latin letters only. Removing all combining marks would
    // destroy Devanagari vowels, Arabic diacritics and many OS scripts.
    .replace(/(\p{Script=Latin})\p{M}+/gu, "$1")
    .normalize("NFC")
    .replace(/[’'`´-]/g, " ")
    // Arabic decimal/group separators are standard OS keyboard characters.
    .replace(/\u066b/g, ".")
    .replace(/\u066c/g, ",")
    .replace(/[^\p{L}\p{M}\p{N}\s.,/°$€£¥₹₩₺]/gu, " ")
    // Recogniser repairs: drop fillers, then turn dictation like "one point
    // five" or "half a kilo" into numeric form. Done here so every later
    // stage — amounts, dictionary, topics — sees the same cleaned text.
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

/**
 * Normalise, then repair the transcription errors recognisers actually make
 * (filler words, dictated decimals, fractions). Everything downstream reads
 * this repaired text, which is why a mis-spelled word can still resolve.
 */
export function normaliseTranscript(input: string): string {
  return repairTranscript(normalizeSpeech(input));
}

const normalizePhrase = (phrase: string) => normalizeSpeech(phrase);
const isWordChar = (char: string | undefined) => !!char && /[\p{L}\p{M}\p{N}]/u.test(char);

/* ------------------------------------------------------------------ */
/* Dictionary                                                          */
/* ------------------------------------------------------------------ */

export function unitEntity(key: string): Entity | null {
  const [category, id] = key.split(":") as [Category, string];
  if (!category || !id) return null;
  if (category === "temperature") return id in TEMPERATURE_UNITS ? { type: "unit", category, id } : null;
  const table = FACTORS[category as Exclude<Category, "temperature">];
  return table && id in table ? { type: "unit", category, id } : null;
}

interface LexiconEntry {
  phrase: string;
  entity: Entity;
  requiresNumber: boolean;
}

// A single UI pack can be augmented with many OS locales. Key by object
// identity, not `pack.id`, or one visitor's ICU dictionary can mask another's.
const lexiconCache = new WeakMap<LanguagePack, LexiconEntry[]>();

function lexicon(pack: LanguagePack): LexiconEntry[] {
  const cached = lexiconCache.get(pack);
  if (cached) return cached;
  const entries: LexiconEntry[] = [];
  for (const [code, phrases] of Object.entries(pack.currencies)) {
    if (!(CURRENCIES as readonly string[]).includes(code)) continue;
    for (const phrase of phrases ?? []) {
      entries.push({ phrase: normalizePhrase(phrase), entity: { type: "currency", code: code as CurrencyCode }, requiresNumber: false });
    }
  }
  for (const [key, phrases] of Object.entries(pack.units)) {
    const entity = unitEntity(key);
    if (!entity) continue;
    for (const phrase of phrases) entries.push({ phrase: normalizePhrase(phrase), entity, requiresNumber: false });
  }
  for (const item of UNIVERSAL_CURRENCIES) {
    entries.push({ phrase: item.phrase, entity: { type: "currency", code: item.code }, requiresNumber: !!item.requiresNumber });
  }
  for (const item of UNIVERSAL_UNITS) {
    const entity = unitEntity(item.key);
    if (entity) entries.push({ phrase: item.phrase, entity, requiresNumber: !!item.requiresNumber });
  }
  // Longest first so "canadian dollars" beats "dollars" and "毫米" beats "米".
  entries.sort((a, b) => b.phrase.length - a.phrase.length);
  lexiconCache.set(pack, entries);
  return entries;
}

/* ------------------------------------------------------------------ */
/* Numbers                                                             */
/* ------------------------------------------------------------------ */

const DIGITS = /\p{Nd}+(?:[.,\s]\p{Nd}{3})*(?:[.,]\p{Nd}+)?|\p{Nd}+/gu;

// Unicode decimal digits live in contiguous blocks of ten. These cover the
// scripts most commonly exposed by OS keyboards, and the Intl-derived mapping
// below adds whichever decimal script the visitor's locale uses.
const DECIMAL_ZEROES = [
  0x0030, 0x0660, 0x06f0, 0x07c0, 0x0966, 0x09e6, 0x0a66, 0x0ae6,
  0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66, 0x0de6, 0x0e50, 0x0ed0,
  0x0f20, 0x1040, 0x1090, 0x17e0, 0x1810, 0x1946, 0x19d0, 0x1a80,
  0x1a90, 0x1b50, 0x1bb0, 0x1c40, 0x1c50, 0xa620, 0xa8d0, 0xa900,
  0xa9d0, 0xaa50, 0xabf0, 0xff10, 0x104a0, 0x11066, 0x110f0,
  0x11136, 0x111d0, 0x112f0, 0x11450, 0x114d0, 0x11650, 0x116c0,
  0x11730, 0x118e0, 0x11950, 0x11c50, 0x11d50, 0x11da0, 0x16a60,
];

function digitToAscii(char: string, locale: string): string {
  if (/^[0-9]$/.test(char)) return char;
  const point = char.codePointAt(0);
  if (point === undefined) return char;
  for (const zero of DECIMAL_ZEROES) {
    if (point >= zero && point < zero + 10) return String(point - zero);
  }
  try {
    for (let n = 0; n < 10; n += 1) {
      if (new Intl.NumberFormat(locale, { useGrouping: false }).format(n) === char) return String(n);
    }
  } catch { /* invalid locale; keep original */ }
  return char;
}

/** Interpret "1,200.50", "1.200,50", "120,5" and "120.5" sensibly for any locale. */
function parseDigitString(raw: string, decimal: "." | ","): number | null {
  let value = raw.replace(/\s/g, "");
  const hasDot = value.includes(".");
  const hasComma = value.includes(",");
  if (hasDot && hasComma) {
    const decimalChar = value.lastIndexOf(".") > value.lastIndexOf(",") ? "." : ",";
    const thousands = decimalChar === "." ? "," : ".";
    value = value.split(thousands).join("").replace(decimalChar, ".");
  } else if (hasDot || hasComma) {
    const sep = hasDot ? "." : ",";
    const parts = value.split(sep);
    const thousandsLike = parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && sep !== decimal);
    value = thousandsLike ? parts.join("") : parts.join(".");
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function splitGermanCompound(token: string): string[] {
  // "einhundertzwanzig" -> ein hundert zwanzig; "funfundzwanzig" -> funf und zwanzig
  return token
    .replace(/(hundert|tausend)/g, " $1 ")
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((piece) =>
      piece === "hundert" || piece === "tausend"
        ? [piece]
        : piece.replace(/([a-z])und([a-z])/g, "$1 und $2").split(/\s+/),
    )
    .filter(Boolean);
}

/** Read the first run of number words in a space-separated language. */
function parseNumberWords(text: string, pack: LanguagePack): AmountMatch | null {
  if (pack.numbers === "cjk") return null;
  const { values, scales, joiners } = pack.numbers;
  let prepared = text;
  if (pack.id === "fr") prepared = prepared.replace(/quatre vingts?/g, "quatrevingt");
  const tokens: Array<{ word: string; start: number; end: number }> = [];
  const pattern = /[\p{L}]+/gu;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(prepared))) {
    const pieces = pack.id === "de" ? splitGermanCompound(match[0]) : [match[0]];
    for (const piece of pieces) tokens.push({ word: piece, start: match.index, end: match.index + match[0].length });
  }

  let total = 0;
  let current = 0;
  let started = false;
  let start = -1;
  let end = -1;
  for (const token of tokens) {
    const { word } = token;
    const isValue = word in values;
    const isScale = word in scales;
    const isJoiner = joiners.includes(word);
    if (!started) {
      if (!isValue && !isScale) continue;
      if ((word === "a" || word === "an") && pack.id === "en") {
        const next = tokens[tokens.indexOf(token) + 1]?.word;
        if (!next || !(next in scales || next === "dozen")) continue;
      }
      started = true;
      start = token.start;
    } else if (!isValue && !isScale && !isJoiner) {
      break;
    }
    if (isValue) current += values[word];
    else if (isScale) {
      const scale = scales[word];
      if (scale === 100) current = (current || 1) * 100;
      else {
        total += (current || 1) * scale;
        current = 0;
      }
    }
    end = token.end;
  }
  if (!started) return null;
  return { value: total + current, start, end };
}

const CJK_DIGITS: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const CJK_UNITS: Record<string, number> = { 十: 10, 百: 100, 千: 1000 };

function parseCjkNumber(run: string): number | null {
  const [integerPart, decimalPart] = run.split("点");
  let total = 0;
  let section = 0;
  let digit = 0;
  let seen = false;
  for (const char of integerPart) {
    if (char in CJK_DIGITS) {
      digit = CJK_DIGITS[char];
      seen = true;
    } else if (char in CJK_UNITS) {
      section += (digit || 1) * CJK_UNITS[char];
      digit = 0;
      seen = true;
    } else if (char === "万" || char === "亿") {
      section += digit;
      total += (section || 1) * (char === "万" ? 10_000 : 100_000_000);
      section = 0;
      digit = 0;
      seen = true;
    }
  }
  if (!seen) return null;
  let value = total + section + digit;
  if (decimalPart) {
    const decimals = [...decimalPart].map((char) => CJK_DIGITS[char]).filter((d) => d !== undefined).join("");
    if (decimals) value = Number(`${value}.${decimals}`);
  }
  return value;
}

function findAmount(text: string, pack: LanguagePack): AmountMatch | null {
  const digit = DIGITS.exec(text);
  DIGITS.lastIndex = 0;
  if (digit) {
    const raw = Array.from(digit[0]).map((char) => digitToAscii(char, pack.speechLocales[0])).join("");
    const value = parseDigitString(raw, pack.decimalSeparator);
    if (value !== null) return { value, start: digit.index, end: digit.index + digit[0].length };
  }
  if (pack.numbers === "cjk") {
    const run = /[零〇一二两三四五六七八九十百千万亿点]+/.exec(text);
    if (run) {
      const value = parseCjkNumber(run[0]);
      if (value !== null) return { value, start: run.index, end: run.index + run[0].length };
    }
    return null;
  }
  return parseNumberWords(text, pack);
}

/** Canonical text for an amount: no trailing zeros, no locale separators. */
export function formatAmount(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(10)));
}

/* ------------------------------------------------------------------ */
/* Mentions and topics                                                 */
/* ------------------------------------------------------------------ */

function precededByNumber(text: string, start: number): boolean {
  return /[\d零〇一二两三四五六七八九十百千万]\s*$/.test(text.slice(Math.max(0, start - 3), start));
}

function dedupe(entities: Entity[]): Entity[] {
  const seen = new Set<string>();
  return entities.filter((entity) => {
    const key = entity.type === "currency" ? `c:${entity.code}` : `u:${entity.category}:${entity.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function findMentions(text: string, pack: LanguagePack, amount: AmountMatch | null): Mention[] {
  const taken: Array<[number, number]> = [];
  const mentions: Mention[] = [];
  const overlaps = (start: number, end: number) => taken.some(([s, e]) => start < e && end > s);
  // Reserve the amount span so digits are never read as units ("a", "un").
  if (amount && !/^\d/.test(text.slice(amount.start))) taken.push([amount.start, amount.end]);

  const byPhrase = new Map<string, LexiconEntry[]>();
  for (const entry of lexicon(pack)) {
    const list = byPhrase.get(entry.phrase) ?? [];
    list.push(entry);
    byPhrase.set(entry.phrase, list);
  }

  for (const [phrase, entries] of byPhrase) {
    if (!phrase) continue;
    let from = 0;
    while (from <= text.length) {
      const index = text.indexOf(phrase, from);
      if (index === -1) break;
      from = index + 1;
      const end = index + phrase.length;
      const checkBoundary = pack.segmentation === "space" || /^[a-z0-9]/.test(phrase);
      if (checkBoundary) {
        if (isWordChar(phrase[0]) && isWordChar(text[index - 1]) && !/\d/.test(text[index - 1] ?? "")) continue;
        if (isWordChar(phrase[phrase.length - 1]) && isWordChar(text[end])) continue;
      }
      if (overlaps(index, end)) continue;
      const usable = entries.filter((entry) => !entry.requiresNumber || precededByNumber(text, index));
      if (!usable.length) continue;
      taken.push([index, end]);
      mentions.push({ start: index, end, candidates: dedupe(usable.map((entry) => entry.entity)) });
    }
  }

  // Second pass for recogniser spelling slips ("kihlograms", "dolars"): the
  // same boundary and overlap rules apply, but a phrase also matches when it
  // is a close edit of what was heard. Only runs where nothing exact matched,
  // so a correct reading is never replaced by a looser one.
  if (!mentions.length) {
    for (const [phrase, entries] of byPhrase) {
      if (phrase.length < 4) continue;
      const index = text.indexOf(phrase) === -1 ? fuzzyIndexOf(text, phrase) : -1;
      if (index === -1) continue;
      const end = index + phrase.length;
      if (overlaps(index, end)) continue;
      const usable = entries.filter((entry) => !entry.requiresNumber || precededByNumber(text, index));
      if (!usable.length) continue;
      taken.push([index, end]);
      mentions.push({ start: index, end, candidates: dedupe(usable.map((entry) => entry.entity)) });
    }
  }

  return mentions.sort((a, b) => a.start - b.start);
}

/** Word-aligned search that tolerates small spelling edits inside a phrase. */
function fuzzyIndexOf(text: string, phrase: string): number {
  const words = text.split(" ");
  const wanted = phrase.split(" ");
  if (wanted.length > words.length) return -1;
  for (let start = 0; start + wanted.length <= words.length; start += 1) {
    const slice = words.slice(start, start + wanted.length);
    if (slice.every((word, i) => isNearMatch(word, wanted[i]))) {
      const before = words.slice(0, start).join(" ");
      return before.length ? before.length + 1 : 0;
    }
  }
  return -1;
}

export function compatible(a: Entity, b: Entity): boolean {
  if (a.type === "currency" && b.type === "currency") return a.code !== b.code;
  if (a.type === "unit" && b.type === "unit") return a.category === b.category && a.id !== b.id;
  return false;
}

/** The first convertible pair of mentions, in spoken order. */
export function pairMentions(mentions: Mention[]): [Entity, Entity] | null {
  for (let i = 0; i < mentions.length; i += 1) {
    for (let j = i + 1; j < mentions.length; j += 1) {
      for (const a of mentions[i].candidates) {
        for (const b of mentions[j].candidates) {
          if (compatible(a, b)) return [a, b];
        }
      }
    }
  }
  return null;
}

const TOPIC_PRIORITY: TopicId[] = [
  "loan", "tip", "compound", "quadratic", "matrix", "bitcoin", "crypto", "inflation", "gdp",
  "scientific", "currency", "units", "formula",
];

function findTopic(text: string, pack: LanguagePack): TopicId | null {
  for (const topic of TOPIC_PRIORITY) {
    for (const raw of pack.topics[topic] ?? []) {
      const phrase = normalizePhrase(raw);
      const index = text.indexOf(phrase);
      if (index === -1) continue;
      if (pack.segmentation === "space") {
        if (isWordChar(text[index - 1]) || isWordChar(text[index + phrase.length])) continue;
      }
      return topic;
    }
  }
  return null;
}

function hasGrammar(text: string, pack: LanguagePack): boolean {
  const words = [...pack.verbs, ...pack.toWords];
  for (const word of words) {
    const phrase = normalizeSpeech(word);
    if (!phrase) continue;
    if (pack.segmentation === "none") {
      if (text.includes(phrase)) return true;
      continue;
    }
    if (new RegExp(`(^|\\s)${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(text)) return true;
  }
  return false;
}

function hasAgain(text: string, pack: LanguagePack): boolean {
  return pack.repeat.some((word) => {
    const phrase = normalizeSpeech(word);
    if (!phrase) return false;
    if (pack.segmentation === "none") return text.includes(phrase);
    return new RegExp(`(^|\\s)${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(text);
  });
}

/* ------------------------------------------------------------------ */
/* Analysis                                                            */
/* ------------------------------------------------------------------ */

/** Run stages 1–2: normalise, read the amount, find entities, topic and intent. */
export function analyse(transcript: string, pack: LanguagePack): Analysis {
  const text = normaliseTranscript(transcript);
  const amount = text.length >= 2 ? findAmount(text, pack) : null;
  const mentions = text.length >= 2 ? findMentions(text, pack, amount) : [];
  return {
    text,
    pack,
    amount,
    mentions,
    topic: text.length >= 2 ? findTopic(text, pack) : null,
    pageId: text.length >= 2 ? findSiteContent(text, pack.speechLocales[0])?.id ?? null : null,
    again: text.length >= 2 ? hasAgain(text, pack) : false,
    paired: pairMentions(mentions) !== null,
    grammar: hasGrammar(text, pack),
  };
}

/**
 * How completely an analysis explains the sentence. Used to choose the best
 * language pack when several could read the same words.
 */
export function scoreAnalysis(analysis: Analysis): number {
  // An amount or a repeat request is meaningful on its own: it either extends
  // the previous command (ellipsis) or replays it, so it still scores above zero.
  const base = analysis.pageId
    ? 4
    : analysis.paired
      ? 3
      : analysis.topic
        ? 1
        : analysis.mentions.length
          ? 2
          : analysis.amount || analysis.again
            ? 0.5
            : 0;
  if (base === 0) return 0;
  return (
    base +
    (analysis.grammar ? 0.5 : 0) +
    (analysis.amount ? 0.25 : 0) +
    analysis.mentions.length * 0.01
  );
}

/** Every language pack, most likely first. */
export function allPacks(active?: LanguagePack): LanguagePack[] {
  if (!active) return Object.values(LANGUAGE_PACKS);
  return [active, ...Object.values(LANGUAGE_PACKS).filter((pack) => pack.id !== active.id)];
}

/** Economy code from a pack, validated against the indicator catalogue. */
export function economyFor(pack: LanguagePack): string {
  return COUNTRIES.some((country) => country.value === pack.defaultEconomy) ? pack.defaultEconomy : "USA";
}

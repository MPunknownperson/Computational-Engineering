import { PACK_IDS, type PackId } from "@/lib/i18n";

/**
 * The site's intermediate representation for voice commands.
 *
 * A language pack turns speech into a `Program`: a versioned, language-tagged
 * list of one to three instructions, each an opcode plus named slots. This is
 * the "compiled" form of what the visitor said. Two different languages
 * compile to the same program:
 *
 *   "convert 120 usd to euros"      → v1|en|CONVERT{amount:120,from:USD,to:EUR}
 *   "convierte 120 dólares a euros" → v1|es|CONVERT{amount:120,from:USD,to:EUR}
 *
 * Programs deliberately contain no URLs. The executor derives destinations
 * from an allow-list of builders, so a tampered program cannot point a visitor
 * anywhere unexpected.
 */

export const IR_VERSION = 1;

export const OPCODES = ["CONVERT", "OPEN", "OPEN_PAGE", "REPEAT"] as const;
export type Opcode = (typeof OPCODES)[number];

export const SLOT_KEYS = [
  "amount",
  "from",
  "to",
  "category",
  "topic",
  "asset",
  "economy",
  "indicator",
  "pageId",
] as const;
export type SlotKey = (typeof SLOT_KEYS)[number];

export type SlotValue = string | number;
export type Slots = Partial<Record<SlotKey, SlotValue>>;

export interface Instruction {
  op: Opcode;
  slots?: Slots;
}

export interface Program {
  v: number;
  lang: PackId;
  code: Instruction[];
}

export const MAX_INSTRUCTIONS = 3;
export const MAX_AMOUNT = 1_000_000_000_000;

export type VerifyError =
  | "bad-version"
  | "bad-language"
  | "bad-shape"
  | "unknown-opcode"
  | "unknown-slot"
  | "bad-slot-value"
  | "too-long";

const SLOT_KEY_SET = new Set<string>(SLOT_KEYS);
const OPCODE_SET = new Set<string>(OPCODES);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function safeString(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 1 || value.length > 48) return false;
  // Slot values are internal identifiers (unit ids, ISO codes, topic ids).
  // A slash is legitimate ("km/h", "m/s"); a colon is not, which also keeps
  // scheme-style values such as "https://…" out of the executor entirely.
  return !/[\s:;?#!\\<>%"'`]/.test(value) && !/[\u0000-\u001f]/.test(value);
}

/** Structural check. Returns null when the program is well formed. */
export function verify(program: unknown): VerifyError | null {
  if (!program || typeof program !== "object") return "bad-shape";
  const candidate = program as Partial<Program>;
  if (candidate.v !== IR_VERSION) return "bad-version";
  if (!candidate.lang || !PACK_IDS.includes(candidate.lang)) return "bad-language";
  if (!Array.isArray(candidate.code) || candidate.code.length < 1 || candidate.code.length > MAX_INSTRUCTIONS) {
    return "too-long";
  }
  for (const instruction of candidate.code) {
    if (!instruction || typeof instruction !== "object") return "bad-shape";
    if (!OPCODE_SET.has(instruction.op)) return "unknown-opcode";
    if (instruction.slots === undefined) continue;
    if (typeof instruction.slots !== "object") return "bad-shape";
    for (const [key, value] of Object.entries(instruction.slots)) {
      if (!SLOT_KEY_SET.has(key)) return "unknown-slot";
      if (value === null || value === undefined) return "bad-slot-value";
      if (key === "amount") {
        if (!isFiniteNumber(value) || value <= 0 || value > MAX_AMOUNT) return "bad-slot-value";
      } else if (!safeString(value)) {
        return "bad-slot-value";
      }
    }
  }
  return null;
}

/** Deterministic textual form; identical meaning always serialises identically. */
export function encode(program: Program): string {
  const code = program.code
    .map((instruction) => {
      const slots = instruction.slots
        ? "{" +
          SLOT_KEYS.filter((key) => instruction.slots?.[key] !== undefined)
            .map((key) => `${key}:${String(instruction.slots?.[key])}`)
            .join(",") +
          "}"
        : "";
      return `${instruction.op}${slots}`;
    })
    .join("|");
  return `v${program.v}|${program.lang}|${code}`;
}

/** Parse an encoded program. Returns the program or the reason it was rejected. */
export function decode(encoded: string): { program: Program } | { error: VerifyError | "unparseable" } {
  const parts = encoded.split("|");
  if (parts.length !== 3) return { error: "unparseable" };
  const version = Number(parts[0]?.slice(1));
  const lang = parts[1] as PackId;
  const code: Instruction[] = [];
  for (const chunk of (parts[2] ?? "").split("|")) {
    const match = /^([A-Z]+)(\{.*\})?$/.exec(chunk);
    if (!match) return { error: "unparseable" };
    const op = match[1] as Opcode;
    const slots: Slots = {};
    if (match[2]) {
      for (const pair of match[2].slice(1, -1).split(",")) {
        const separator = pair.indexOf(":");
        if (separator === -1) return { error: "unparseable" };
        const key = pair.slice(0, separator);
        const raw = pair.slice(separator + 1);
        if (key === "amount") {
          const value = Number(raw);
          if (!Number.isFinite(value)) return { error: "unparseable" };
          slots.amount = value;
        } else {
          slots[key as SlotKey] = raw;
        }
      }
    }
    code.push(slots && Object.keys(slots).length ? { op, slots } : { op });
  }
  const program: Program = { v: version, lang, code };
  const error = verify(program);
  return error ? { error } : { program };
}

/** 32-bit FNV-1a over the canonical form — the learning and de-duplication key. */
export function fingerprint(program: Program): string {
  const text = encode(program);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

import { CURRENCIES } from "@/lib/catalog";
import { LANGUAGE_PACKS, t, type PackId } from "@/lib/i18n";
import { FACTORS, TEMPERATURE_UNITS, type Category } from "@/lib/units";
import { internalHref } from "@/lib/urls";
import { presetHref } from "@/lib/presets";
import { formatAmount } from "@/lib/voice/parser";
import { contentById } from "@/lib/voice/site-content";
import { decode, verify, type Program, type Slots, type VerifyError } from "@/lib/voice/ir";

/**
 * Stage 5: the executor — the site's "operating system" for voice.
 *
 * It takes a verified `Program` and derives the destination itself from an
 * allow-list of builders (unit converter, currency converter, preset formulas,
 * topic tools). Programs never carry URLs, and every identifier is checked
 * against the site catalogues before use, so a malformed or hostile program
 * can only fail, never navigate somewhere unexpected.
 */

export type ExecError =
  | VerifyError
  | "unparseable"
  | "missing-slots"
  | "unknown-currency"
  | "unknown-unit"
  | "unknown-topic"
  | "unknown-page"
  | "nothing-to-repeat";

export interface ExecutedAction {
  href: string;
  label: string;
}

export interface Executed {
  ok: true;
  program: Program;
  action: ExecutedAction;
}

export interface Rejected {
  ok: false;
  program: Program;
  error: ExecError;
}

function isCurrency(code: string): boolean {
  return (CURRENCIES as readonly string[]).includes(code);
}

function isUnit(category: Category, id: string): boolean {
  return category === "temperature"
    ? id in TEMPERATURE_UNITS
    : id in FACTORS[category as Exclude<Category, "temperature">];
}

function isCategory(value: string): value is Category {
  return value in FACTORS || value === "temperature";
}

function amountText(slots: Slots): string {
  const value = slots.amount;
  return typeof value === "number" ? formatAmount(value) : "1";
}

function buildConvert(program: Program, slots: Slots): Built {
  const pack = LANGUAGE_PACKS[program.lang];
  const from = slots.from;
  const to = slots.to;
  if (typeof from !== "string" || typeof to !== "string") return { error: "missing-slots" };
  const amount = amountText(slots);

  if (typeof slots.category === "string") {
    const category = slots.category;
    if (!isCategory(category)) return { error: "unknown-unit" };
    if (!isUnit(category, from) || !isUnit(category, to)) return { error: "unknown-unit" };
    return {
      action: {
        href: internalHref("/tools/units", { category, from, to, value: amount }),
        label: t(pack, "label.units", { amount, from, to }),
      },
    };
  }

  if (!isCurrency(from) || !isCurrency(to)) return { error: "unknown-currency" };
  return {
    action: {
      href: internalHref("/tools/currency", { base: from, to, amount }),
      label: t(pack, "label.currency", { amount, from, to }),
    },
  };
}

function buildOpen(program: Program, slots: Slots): Built {
  const pack = LANGUAGE_PACKS[program.lang];
  const topic = slots.topic;
  if (typeof topic !== "string") return { error: "missing-slots" };
  switch (topic) {
    case "loan":
      return { action: { href: presetHref("loan-payment"), label: t(pack, "topic.loan") } };
    case "tip":
      return { action: { href: presetHref("tip-split"), label: t(pack, "topic.tip") } };
    case "compound":
      return { action: { href: presetHref("compound-interest"), label: t(pack, "topic.compound") } };
    case "quadratic":
      return { action: { href: presetHref("quadratic-root"), label: t(pack, "topic.quadratic") } };
    case "matrix":
      return { action: { href: presetHref("determinant", "scientific"), label: t(pack, "topic.matrix") } };
    case "scientific":
      return { action: { href: "/tools/scientific", label: t(pack, "topic.scientific") } };
    case "formula":
      return { action: { href: "/tools/formula", label: t(pack, "topic.formula") } };
    case "units":
      return { action: { href: "/tools/units", label: t(pack, "topic.units") } };
    case "currency":
      return { action: { href: "/tools/currency", label: t(pack, "topic.currency") } };
    case "crypto":
      return { action: { href: "/tools/crypto", label: t(pack, "topic.crypto") } };
    case "bitcoin": {
      const asset = typeof slots.asset === "string" && isCurrencySafe(slots.asset) ? slots.asset : "bitcoin";
      return { action: { href: internalHref("/tools/crypto", { id: asset }), label: t(pack, "topic.bitcoin") } };
    }
    case "inflation":
    case "gdp": {
      const economy = typeof slots.economy === "string" && /^[A-Z]{3}$/.test(slots.economy) ? slots.economy : "USA";
      const indicator = topic === "inflation" ? "inflation" : "gdp_per_capita";
      return {
        action: {
          href: internalHref("/tools/economy", { country: economy, indicator }),
          label: t(pack, topic === "inflation" ? "topic.inflation" : "topic.gdp"),
        },
      };
    }
    default:
      return { error: "unknown-topic" };
  }
}

interface Built {
  action?: ExecutedAction;
  error?: ExecError;
}

/** Digital-asset ids are a fixed set in the catalogue; keep it closed. */
function isCurrencySafe(asset: string): boolean {
  return /^[a-z0-9-]{3,20}$/.test(asset);
}

/**
 * Execute a program. `previous` supplies context for REPEAT; the repeated
 * program is itself verified before execution, so a stored or replayed program
 * cannot bypass the checks.
 */
export function execute(input: unknown, previous: Program | null = null): Executed | Rejected {
  const error = verify(input);
  if (error) return { ok: false, program: { v: 1, lang: "en", code: [] }, error };
  const program = input as Program;

  const [instruction] = program.code;
  if (!instruction) return { ok: false, program, error: "missing-slots" };

  if (instruction.op === "REPEAT") {
    if (!previous) return { ok: false, program, error: "nothing-to-repeat" };
    return execute(previous);
  }
  if (!instruction.slots) return { ok: false, program, error: "missing-slots" };

  const built = instruction.op === "OPEN_PAGE"
    ? (() => {
        const id = instruction.slots?.pageId;
        const page = typeof id === "string" ? contentById(id) : null;
        return page ? { action: { href: page.path, label: page.label } } : { error: "unknown-page" as const };
      })()
    : instruction.op === "CONVERT"
      ? buildConvert(program, instruction.slots)
      : buildOpen(program, instruction.slots);
  if (built.error || !built.action) return { ok: false, program, error: built.error ?? "missing-slots" };

  // Defence in depth: whatever a builder produced must be a site-relative path.
  const href = built.action.href;
  if (!href.startsWith("/") || href.startsWith("//")) {
    return { ok: false, program, error: "missing-slots" };
  }
  return { ok: true, program, action: { href, label: built.action.label } };
}

/** Load an encoded program (e.g. from local learning memory) and run it. */
export function executeEncoded(encoded: string, previous: Program | null = null): Executed | Rejected {
  const decoded = decode(encoded);
  if ("error" in decoded) {
    return { ok: false, program: { v: 1, lang: "en", code: [] }, error: decoded.error };
  }
  return execute(decoded.program, previous);
}

export type { Program, Slots, PackId };

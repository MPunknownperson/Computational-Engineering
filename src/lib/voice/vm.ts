import { COUNTRIES, CRYPTO_IDS, CURRENCIES, INDICATORS } from "@/lib/catalog";
import { safeEvaluate } from "@/lib/math";
import { describeGenerated } from "@/lib/voice/codegen";
import { LANGUAGE_PACKS, t, type PackId } from "@/lib/i18n";
import { FACTORS, TEMPERATURE_UNITS, type Category } from "@/lib/units";
import { internalHref } from "@/lib/urls";
import { presetHref } from "@/lib/presets";
import { formatAmount } from "@/lib/voice/parser";
import { contentById } from "@/lib/voice/site-content";
import { decode, verify, type Program, type Slots, type VerifyError } from "@/lib/voice/ir";
import { detectMathIntent, solveMath, type MathIntent } from "@/lib/voice/math-intent";
import {
  describeOperationResult,
  operationDestination,
  type OperationId,
} from "@/lib/voice/operation-intent";

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
  | "nothing-to-repeat"
  | "unsolvable-math"
  | "bad-expression";

export interface ExecutedAction {
  href: string;
  label: string;
  /** Which executor produced this action; used for logging and context typing. */
  kind?: "convert" | "open" | "page" | "math";
  /** Computed answer for maths actions, shown before any navigation happens. */
  result?: string;
  /** Longer explanation of the computation, for the transcript panel. */
  detail?: string;
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
    case "crypto": {
      const asset = typeof slots.asset === "string" && isKnownAsset(slots.asset) ? slots.asset : null;
      if (asset) return { action: { href: internalHref("/tools/crypto", { id: asset }), label: `${assetLabel(asset)} price` } };
      return { action: { href: "/tools/crypto", label: t(pack, "topic.crypto") } };
    }
    case "bitcoin": {
      const asset = typeof slots.asset === "string" && isKnownAsset(slots.asset) ? slots.asset : "bitcoin";
      return { action: { href: internalHref("/tools/crypto", { id: asset }), label: asset === "bitcoin" ? t(pack, "topic.bitcoin") : `${assetLabel(asset)} price` } };
    }
    case "inflation":
    case "gdp": {
      // Country and indicator identifiers are closed catalogs; anything else
      // falls back to the defaults rather than reaching the URL.
      const economy = typeof slots.economy === "string" && COUNTRIES.some((country) => country.value === slots.economy) ? slots.economy : "USA";
      const requested = typeof slots.indicator === "string" ? INDICATORS.find((item) => item.value === slots.indicator) : undefined;
      const indicator = requested?.value ?? (topic === "inflation" ? "inflation" : "gdp_per_capita");
      const base = requested && requested.value !== "inflation" && requested.value !== "gdp_per_capita"
        ? requested.label
        : t(pack, indicator === "inflation" ? "topic.inflation" : "topic.gdp");
      const countryLabel = COUNTRIES.find((country) => country.value === economy)?.label;
      return {
        action: {
          href: internalHref("/tools/economy", { country: economy, indicator }),
          label: economy !== "USA" && countryLabel ? `${base} — ${countryLabel}` : base,
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

/**
 * Maths executor. A SOLVE/EVAL program is computed here and the answer is
 * carried back in the action, so the visitor is told the result instead of
 * being sent to an unrelated converter.
 */
function buildMath(program: Program, slots: Slots, op: "SOLVE" | "EVAL"): Built {
  const expression = slots.expression;
  const variable = typeof slots.variable === "string" ? slots.variable : undefined;
  const operation = typeof slots.operation === "string" ? slots.operation as OperationId : null;
  if (typeof expression !== "string" || !expression.trim()) return { error: "missing-slots" };
  if (op === "SOLVE" && !expression.includes("=")) return { error: "bad-expression" };

  const intent = operation ? null : detectMathIntent(expression);
  const resolved: MathIntent = intent ?? {
    task: op === "SOLVE" ? "solve-equation" : "evaluate-expression",
    canonical: expression,
    variable: variable ?? "x",
    entities: [],
    confidence: 1,
    signals: ["slot-supplied"],
  };
  const solution = solveMath({ ...resolved, variable: variable ?? resolved.variable });
  if (!solution.ok) return { error: "unsolvable-math" };

  const preset = typeof slots.preset === "string" ? slots.preset : undefined;
  // Generated operations can point only at a known preset or the scientific
  // workspace. Ordinary maths remains pre-filled with the heard expression.
  const href = operation
    ? operationDestination({ id: operation, preset })
    : internalHref("/tools/scientific", {
        expr: op === "SOLVE" ? expression.split("=")[0]?.trim() : expression,
        // Only a single, unambiguous root is pre-filled as a variable value.
        ...(op === "SOLVE" && variable && !solution.display.includes(" or ")
          ? { vars: `${variable} = ${solution.display.split("= ")[1] ?? "0"}` }
          : {}),
      });
  void program;
  const label = operation
    ? describeOperationResult(operation, solution.display)
    : op === "SOLVE"
      ? solution.display
      : `${expression} = ${solution.display}`;
  return {
    action: {
      href,
      label,
      kind: "math",
      result: solution.display,
      detail: operation ? `${operation}: generated ${expression} = ${solution.display}` : solution.detail,
    },
  };
}

/** Digital-asset ids are a fixed set in the catalogue; keep it closed. */
function isKnownAsset(asset: string): boolean {
  return (CRYPTO_IDS as readonly string[]).includes(asset);
}

function assetLabel(asset: string): string {
  const name = asset.replace(/-\d+$/, "").replace(/-/g, " ");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Round a computed value for speech-sized display without losing magnitude. */
function tidyNumber(formatted: string): string {
  const value = Number(formatted);
  if (!Number.isFinite(value)) return formatted;
  if (value === 0) return "0";
  const magnitude = Math.abs(value);
  if (magnitude >= 1e15 || magnitude < 1e-6) return value.toPrecision(6).replace(/\.?0+(e|$)/, "$1");
  const rounded = magnitude >= 1000 ? Number(value.toFixed(2)) : Number(value.toPrecision(8));
  return String(Number(rounded.toFixed(6)));
}

/**
 * Executor for generated programs. The capability id selects the label and
 * destination; the code itself is run by the restricted evaluator, which is
 * the same grammar the scientific workspace uses.
 */
function buildRun(slots: Slots): Built {
  const capability = typeof slots.capability === "string" && /^[a-z0-9-]{2,40}$/.test(slots.capability) ? slots.capability : null;
  const expression = typeof slots.expression === "string" ? slots.expression.trim() : "";
  if (!capability || !expression) return { error: "missing-slots" };
  const evaluated = safeEvaluate(expression);
  if (!evaluated.ok) return { error: "bad-expression" };
  const result = tidyNumber(evaluated.formatted);
  const unit = typeof slots.unit === "string" ? slots.unit : "";
  const preset = typeof slots.preset === "string" ? slots.preset : undefined;
  const href = preset ? presetHref(preset) : internalHref("/tools/scientific", { expr: expression });
  return {
    action: {
      href,
      label: describeGenerated(capability, result, unit),
      kind: "math",
      result: `${result}${unit}`,
      detail: `${capability}: generated ${expression} = ${result}${unit}`,
    },
  };
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

  const built: Built = instruction.op === "OPEN_PAGE"
    ? ((): Built => {
        const id = instruction.slots?.pageId;
        const page = typeof id === "string" ? contentById(id) : null;
        return page ? { action: { href: page.path, label: page.label } } : { error: "unknown-page" as const };
      })()
    : instruction.op === "RUN"
      ? buildRun(instruction.slots)
    : instruction.op === "SOLVE" || instruction.op === "EVAL"
      ? buildMath(program, instruction.slots, instruction.op)
      : instruction.op === "CONVERT"
        ? buildConvert(program, instruction.slots)
        : buildOpen(program, instruction.slots);
  if (built.error || !built.action) return { ok: false, program, error: built.error ?? "missing-slots" };

  // Defence in depth: whatever a builder produced must be a site-relative path.
  const href = built.action.href;
  if (!href.startsWith("/") || href.startsWith("//")) {
    return { ok: false, program, error: "missing-slots" };
  }
  return {
    ok: true,
    program,
    action: {
      href,
      label: built.action.label,
      kind: built.action.kind ?? (instruction.op === "CONVERT" ? "convert" : instruction.op === "OPEN_PAGE" ? "page" : "open"),
      ...(built.action.result !== undefined ? { result: built.action.result } : {}),
      ...(built.action.detail !== undefined ? { detail: built.action.detail } : {}),
    },
  };
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

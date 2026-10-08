import { CURRENCIES } from "@/lib/catalog";
import { FACTORS, TEMPERATURE_UNITS } from "@/lib/units";
import type { LanguagePack } from "@/lib/i18n/packs";

/**
 * ICU/CLDR vocabulary supplied by the device's Intl implementation. The
 * browser/OS speech recognizer already has unrestricted vocabulary; this
 * module adds native currency and measurement names to the site's *semantic*
 * dictionary for any BCP-47 locale, not just its five hand-translated packs.
 * No locale-specific model or external dictionary download is required.
 */

export function normalizeLocale(locale: string | undefined | null): string | null {
  if (!locale || locale.length > 64 || !/^[A-Za-z]{2,8}(?:[-_][A-Za-z0-9]{2,8})*$/.test(locale)) return null;
  try {
    return Intl.getCanonicalLocales(locale.replaceAll("_", "-"))[0] ?? null;
  } catch {
    return null;
  }
}

/** Unicode-aware word boundaries, including CJK scripts and emoji. */
export function segmentWords(text: string, locale: string): string[] {
  const tag = normalizeLocale(locale) ?? "en";
  if (typeof Intl.Segmenter === "function") {
    try {
      const segmenter = new Intl.Segmenter(tag, { granularity: "word" });
      return Array.from(segmenter.segment(text))
        .filter((part) => part.isWordLike)
        .map((part) => part.segment.toLocaleLowerCase(tag));
    } catch { /* fall back to Unicode expressions */ }
  }
  return text.match(/[\p{L}\p{M}\p{N}]+/gu)?.map((word) => word.toLocaleLowerCase()) ?? [];
}

// ICU supplies formal names. These common colloquial forms are not returned
// by NumberFormat but are frequently produced by mobile dictation.
const COMMON_ALIASES: Record<string, Record<string, string[]>> = {
  hi: { "mass:kg": ["किलो"], "length:km": ["किलोमीटर"] },
  ar: { "mass:kg": ["كيلو"], "length:km": ["كيلومتر"] },
  pt: { "mass:kg": ["quilo"], "length:km": ["quilômetros", "quilometros"] },
};

const UNIT_INTL: Record<string, string> = {
  "length:mm": "millimeter", "length:cm": "centimeter", "length:m": "meter", "length:km": "kilometer",
  "length:in": "inch", "length:ft": "foot", "length:yd": "yard", "length:mi": "mile", "length:nmi": "nautical-mile",
  "mass:mg": "milligram", "mass:g": "gram", "mass:kg": "kilogram", "mass:t": "metric-ton",
  "mass:oz": "ounce", "mass:lb": "pound",
  "time:ms": "millisecond", "time:s": "second", "time:min": "minute", "time:h": "hour",
  "time:d": "day", "time:wk": "week", "time:yr": "year",
  "temperature:C": "celsius", "temperature:F": "fahrenheit", "temperature:K": "kelvin",
  "area:m2": "square-meter", "area:km2": "square-kilometer", "area:ft2": "square-foot",
  "area:ha": "hectare", "area:ac": "acre",
  "volume:ml": "milliliter", "volume:l": "liter", "volume:m3": "cubic-meter", "volume:gal_us": "gallon",
  "speed:km/h": "kilometer-per-hour", "speed:mph": "mile-per-hour", "speed:m/s": "meter-per-second",
  "data:MB": "megabyte", "data:GB": "gigabyte", "data:TB": "terabyte",
};

function numberless(formatted: string): string {
  return formatted
    .replace(/[\p{N}\p{Sc}]+/gu, " ")
    .replace(/[\u00a0\u202f]/g, " ")
    .replace(/^[\s,.:–-]+|[\s,.:–-]+$/g, "")
    .trim();
}

/**
 * Extend a known pack with the OS's currency and measurement vocabulary.
 * The returned object keeps the pack's instructions/UI text; only its
 * dictionary is augmented. Unknown languages use English UI as a transparent
 * fallback while recognition still uses the visitor's native BCP-47 locale.
 */
export function withSystemVocabulary(pack: LanguagePack, locale: string): LanguagePack {
  const tag = normalizeLocale(locale);
  if (!tag) return pack;
  const currencies: LanguagePack["currencies"] = { ...pack.currencies };
  const units: LanguagePack["units"] = { ...pack.units };
  try {
    const display = new Intl.DisplayNames([tag], { type: "currency", fallback: "none" });
    for (const code of CURRENCIES) {
      const name = display.of(code);
      if (name && name.toUpperCase() !== code) {
        currencies[code] = Array.from(new Set([name, ...(currencies[code] ?? [])]));
      }
    }
  } catch { /* host lacks DisplayNames for this locale */ }

  for (const [key, unit] of Object.entries(UNIT_INTL)) {
    const [category, id] = key.split(":");
    if (!category || !id || !(category === "temperature" ? id in TEMPERATURE_UNITS :
      category in FACTORS && id in FACTORS[category as keyof typeof FACTORS])) continue;
    try {
      const formatter = new Intl.NumberFormat(tag, { style: "unit", unit, unitDisplay: "long" });
      const names = [1, 2].map((amount) => numberless(formatter.format(amount))).filter((name) => name.length > 1);
      units[key] = Array.from(new Set([...names, ...(units[key] ?? [])]));
    } catch { /* Some units and locales are not implemented by this runtime. */ }
  }
  const colloquial = COMMON_ALIASES[tag.split("-")[0]] ?? {};
  for (const [key, aliases] of Object.entries(colloquial)) {
    units[key] = Array.from(new Set([...(units[key] ?? []), ...aliases]));
  }
  const separator = new Intl.NumberFormat(tag).formatToParts(1.5).find((part) => part.type === "decimal")?.value;
  return {
    ...pack,
    speechLocales: [tag, ...pack.speechLocales.filter((value) => value !== tag)],
    decimalSeparator: separator === "," ? "," : ".",
    currencies,
    units,
  };
}

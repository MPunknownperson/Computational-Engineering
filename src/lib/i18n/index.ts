import { DEFAULT_PACK, LANGUAGE_PACKS, PACK_IDS, type LanguagePack, type PackId, type UiKey } from "./packs";

export * from "./packs";

/** Choose the best pack for a list of BCP 47 tags (e.g. navigator.languages). */
export function selectPack(languages: readonly string[] | string | null | undefined): LanguagePack {
  const list = typeof languages === "string" ? [languages] : languages ?? [];
  for (const tag of list) {
    const primary = tag.trim().toLowerCase().split(/[-_]/)[0] as PackId;
    if (PACK_IDS.includes(primary)) return LANGUAGE_PACKS[primary];
  }
  return LANGUAGE_PACKS[DEFAULT_PACK];
}

/** Parse an Accept-Language header into tags ordered by quality. */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { tag: tag.trim(), q: q ? Number(q.slice(2)) || 0 : 1 };
    })
    .filter((item) => item.tag && item.tag !== "*")
    .sort((a, b) => b.q - a.q)
    .map((item) => item.tag);
}

/** Look up a UI string and fill `{placeholders}`; falls back to English. */
export function t(pack: LanguagePack, key: UiKey, vars?: Record<string, string | number>): string {
  const template = pack.ui[key] ?? LANGUAGE_PACKS[DEFAULT_PACK].ui[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/** The recogniser locale for a pack, keeping the user's regional variant when the pack covers it. */
export function recognitionLocale(pack: LanguagePack, preferred: readonly string[] | string | null | undefined): string {
  const list = typeof preferred === "string" ? [preferred] : preferred ?? [];
  const exact = list.find((tag) => pack.speechLocales.some((locale) => locale.toLowerCase() === tag.toLowerCase()));
  if (exact) return pack.speechLocales.find((locale) => locale.toLowerCase() === exact.toLowerCase()) ?? exact;
  const sameLanguage = list.find((tag) => tag.toLowerCase() === pack.id || tag.toLowerCase().startsWith(`${pack.id}-`));
  if (sameLanguage) return sameLanguage;
  // For a language without translated site UI, keep the operating system's
  // speech locale instead of forcing English recognition. The interpreter
  // still has English UI as a fallback and adds ICU vocabulary for that locale.
  const system = list.find((tag) => /^[a-z]{2,8}(?:-[a-z0-9]{2,8})*$/i.test(tag));
  return system ?? pack.speechLocales[0];
}

/** Pack order for understanding speech: the active pack first, then every other pack. */
export function packOrder(active: LanguagePack): LanguagePack[] {
  return [active, ...PACK_IDS.filter((id) => id !== active.id).map((id) => LANGUAGE_PACKS[id])];
}

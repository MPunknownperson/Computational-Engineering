import { SEARCH_PAGES } from "@/lib/search-pages";
import { segmentWords } from "@/lib/i18n/system-lexicon";

/**
 * The public site's full content catalog is an extra dictionary for voice.
 * Unlike arbitrary web search, the executor can resolve ONLY ids in this
 * catalog. The catalog covers every guide, converter, calculator, reference
 * and information route listed in the sitemap.
 */

export interface ContentEntry {
  id: string;
  path: string;
  label: string;
  kind: string;
  tokens: string[];
}

const CONTENT = SEARCH_PAGES.map((page, index): ContentEntry => {
  const text = [page.label, page.title, page.path.split("/").at(-1)?.replaceAll("-", " ") ?? ""]
    .join(" ");
  return {
    id: index.toString(36),
    path: page.path,
    label: page.label,
    kind: page.kind,
    tokens: Array.from(new Set(segmentWords(text, "en"))),
  };
});

const CONTENT_BY_ID = new Map(CONTENT.map((entry) => [entry.id, entry]));

export function contentById(id: string): ContentEntry | null {
  return CONTENT_BY_ID.get(id) ?? null;
}

export function allContent(): readonly ContentEntry[] {
  return CONTENT;
}

const NAVIGATION_WORDS = new Set([
  "open", "show", "read", "find", "visit", "browse", "view", "guide", "article", "page", "take",
  "abrir", "mostrar", "leer", "guia", "articulo", "pagina",
  "ouvrir", "montrer", "lire", "guide", "article", "page",
  "offnen", "zeigen", "lesen", "anleitung", "seite",
  "打开", "查看", "阅读", "指南", "页面", "文章",
]);

const STOP_WORDS = new Set([
  "the", "a", "an", "to", "of", "for", "and", "or", "in", "on", "me", "this", "that", "how", "do", "i",
  "el", "la", "los", "las", "de", "del", "en", "un", "una", "que", "como",
  "le", "les", "des", "du", "une", "et", "dans", "comment",
  "der", "die", "das", "den", "dem", "und", "fur", "mit", "wie",
]);

/**
 * Match an explicit navigation request to an indexed page. Minimum two
 * substantive matched words (or an exact label) prevents accidental jumps on
 * arbitrary speech. The reference is an opaque id, not a URL from the user.
 */
export function findSiteContent(input: string, locale = "en"): ContentEntry | null {
  const words = segmentWords(input, locale).map((word) => word.normalize("NFD").replace(/\p{M}/gu, ""));
  if (!words.some((word) => NAVIGATION_WORDS.has(word))) return null;
  const meaningful = Array.from(new Set(words.filter((word) =>
    !NAVIGATION_WORDS.has(word) && !STOP_WORDS.has(word) && word.length > 1,
  )));
  if (!meaningful.length) return null;

  let winner: { entry: ContentEntry; score: number } | null = null;
  for (const entry of CONTENT) {
    if (entry.path === "/") continue;
    const matches = meaningful.filter((word) => entry.tokens.includes(word));
    if (matches.length < 2 && !(meaningful.length === 1 && entry.tokens.includes(meaningful[0]) && entry.tokens.length <= 3)) continue;
    const specific = matches.length / meaningful.length;
    if (specific < 0.55) continue;
    const kindBonus = entry.kind === "article" && words.some((word) => ["guide", "article", "guia", "anleitung", "指南"].includes(word)) ? 1 : 0;
    const slug = entry.path.split("/").at(-1)?.replaceAll("-", " ") ?? "";
    // A spoken exact guide slug outranks a related page sharing its nouns.
    const exactSlugBonus = slug.length > 4 && input.toLocaleLowerCase().includes(slug) ? 5 : 0;
    const score = matches.length * 2 + specific * 2 + kindBonus + exactSlugBonus - Math.max(0, entry.tokens.length - 5) * 0.04;
    if (!winner || score > winner.score) winner = { entry, score };
  }
  return winner?.entry ?? null;
}

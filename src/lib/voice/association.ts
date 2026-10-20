import { COUNTRIES, CRYPTO_IDS, INDICATORS } from "@/lib/catalog";
import type { TopicId } from "@/lib/i18n";
import { segmentWords } from "@/lib/i18n/system-lexicon";
import type { TaskDomain } from "@/lib/voice/context";

/**
 * Stage 2c: language association (context mapping).
 *
 * The parser recognises currencies, units and a short list of topic words. A
 * visitor, however, names *capabilities*: "the calculator", "unemployment in
 * spain", "ethereum", "go back home", "the privacy page". This module keeps a
 * multilingual association lexicon that maps such phrases onto the fixed set
 * of things the site can do, tolerates recogniser noise (one or two wrong
 * letters in a long word), and uses the conversation's recent domain to break
 * ties. Output is always a closed identifier — a catalog path, a topic id, an
 * ISO country code, an indicator id — never free text, so the executor can
 * verify it against the catalogs before anything runs.
 */

export type Association =
  | { kind: "page"; path: string; label: string; score: number; signals: string[] }
  | {
      kind: "tool";
      topic: TopicId;
      label: string;
      score: number;
      signals: string[];
      slots: { asset?: string; economy?: string; indicator?: string };
    };

interface LexiconEntry {
  id: string;
  target: { kind: "page"; path: string; label: string } | { kind: "tool"; topic: TopicId; label: string };
  domain: TaskDomain;
  /** Phrases that name the capability. Each phrase is matched as a token set. */
  phrases: string[];
  /** Single words that are strong enough alone. */
  anchors?: string[];
  weight?: number;
}

const LEXICON: LexiconEntry[] = [
  { id: "calculator", domain: "math", target: { kind: "page", path: "/tools/calculator", label: "Calculator" }, weight: 1,
    phrases: ["calculator", "basic calculator", "simple calculator", "standard calculator", "the calculator", "calculadora", "calculatrice", "taschenrechner", "rechner", "计算器"], anchors: ["calculator", "calculadora", "calculatrice", "taschenrechner", "计算器"] },
  { id: "scientific", domain: "math", target: { kind: "tool", topic: "scientific", label: "Scientific calculator" }, weight: 1.2,
    phrases: ["scientific calculator", "scientific mode", "advanced calculator", "calculadora cientifica", "calculatrice scientifique", "wissenschaftlicher rechner", "科学计算器", "trigonometry", "matrices", "derivative", "integral"], anchors: ["scientific", "cientifica", "scientifique", "wissenschaftlich"] },
  { id: "units", domain: "units", target: { kind: "tool", topic: "units", label: "Unit converter" }, weight: 1.1,
    phrases: ["unit converter", "units converter", "convert units", "measurement converter", "conversor de unidades", "convertisseur d unites", "einheitenumrechner", "单位换算", "length converter", "weight converter", "temperature converter"], anchors: ["units", "unidades", "unites", "einheiten"] },
  { id: "currency", domain: "currency", target: { kind: "tool", topic: "currency", label: "Currency converter" }, weight: 1.1,
    phrases: ["currency converter", "exchange rate", "exchange rates", "money converter", "forex", "fx rates", "conversor de divisas", "tipo de cambio", "convertisseur de devises", "taux de change", "wahrungsrechner", "wechselkurs", "汇率", "货币换算"], anchors: ["currency", "currencies", "divisas", "devises", "wahrung", "forex"] },
  { id: "crypto", domain: "market", target: { kind: "tool", topic: "crypto", label: "Crypto prices" }, weight: 1.1,
    phrases: ["crypto prices", "cryptocurrency", "crypto market", "coin prices", "criptomonedas", "cryptomonnaies", "kryptowahrungen", "加密货币"], anchors: ["crypto", "cryptocurrency", "cripto", "krypto"] },
  { id: "economy", domain: "market", target: { kind: "tool", topic: "gdp", label: "Economic indicators" }, weight: 1,
    phrases: ["economic indicators", "economy tool", "economic data", "world bank data", "macro data", "indicadores economicos", "indicateurs economiques", "wirtschaftsdaten", "经济指标"], anchors: ["economy", "economic", "economia", "wirtschaft"] },
  { id: "formula", domain: "math", target: { kind: "tool", topic: "formula", label: "Formula tool" }, weight: 1,
    phrases: ["formula tool", "formula calculator", "formula workspace", "saved formulas", "my formulas", "herramienta de formulas", "outil de formules", "formelrechner", "公式"], anchors: ["formula", "formulas", "formule", "formel"] },
  { id: "loan", domain: "finance", target: { kind: "tool", topic: "loan", label: "Loan calculator" }, weight: 1,
    phrases: ["loan calculator", "mortgage calculator", "loan payment calculator", "calculadora de prestamos", "calculateur de pret", "kreditrechner", "贷款计算器"], anchors: ["loan", "mortgage", "prestamo", "hipoteca", "kredit"] },
  { id: "tip", domain: "finance", target: { kind: "tool", topic: "tip", label: "Tip calculator" }, weight: 1,
    phrases: ["tip calculator", "bill splitter", "split the bill", "calculadora de propinas", "calculateur de pourboire", "trinkgeldrechner"], anchors: ["tip", "propina", "pourboire", "trinkgeld"] },
  { id: "compound", domain: "finance", target: { kind: "tool", topic: "compound", label: "Compound interest" }, weight: 1,
    phrases: ["compound interest calculator", "interest calculator", "investment calculator", "calculadora de interes compuesto", "zinseszinsrechner"], anchors: ["compound", "zinseszins"] },
  { id: "quadratic", domain: "math", target: { kind: "tool", topic: "quadratic", label: "Quadratic formula" }, weight: 1,
    phrases: ["quadratic formula", "quadratic equation", "quadratic solver", "ecuacion cuadratica", "equation du second degre", "quadratische gleichung"], anchors: ["quadratic", "cuadratica", "quadratische"] },
  { id: "matrix", domain: "math", target: { kind: "tool", topic: "matrix", label: "Matrix operations" }, weight: 1,
    phrases: ["matrix calculator", "determinant", "matrix determinant", "linear system", "system of equations", "calculadora de matrices", "calcul matriciel", "matrizenrechner"], anchors: ["matrix", "matrices", "determinant", "matriz", "matrizen"] },
  { id: "home", domain: "navigation", target: { kind: "page", path: "/", label: "Home" }, weight: 0.9,
    phrases: ["home", "home page", "homepage", "go home", "back home", "main page", "front page", "start page", "inicio", "pagina principal", "accueil", "page d accueil", "startseite", "首页"], anchors: ["home", "homepage", "inicio", "accueil", "startseite", "首页"] },
  { id: "tools", domain: "navigation", target: { kind: "page", path: "/calculators", label: "Tools" }, weight: 0.8,
    phrases: ["all tools", "tools page", "tools list", "list of calculators", "all calculators", "calculators page", "voice page", "todas las herramientas", "tous les outils", "alle werkzeuge", "所有工具"], anchors: ["tools", "herramientas", "outils", "werkzeuge"] },
  { id: "convert", domain: "navigation", target: { kind: "page", path: "/convert", label: "Conversions" }, weight: 0.7,
    phrases: ["conversions page", "all conversions", "conversion guides", "converters", "pagina de conversiones", "conversions", "umrechnungen"], anchors: ["converters", "conversions", "umrechnungen"] },
  { id: "calculate", domain: "navigation", target: { kind: "page", path: "/calculate", label: "Calculations" }, weight: 0.6,
    phrases: ["calculations page", "calculation guides", "how to calculate", "worked examples"], anchors: [] },
  { id: "reference", domain: "navigation", target: { kind: "page", path: "/reference", label: "Reference" }, weight: 0.8,
    phrases: ["reference", "reference page", "reference tables", "formula reference", "cheat sheet", "referencia", "tablas de referencia", "tableaux de reference", "nachschlagewerk", "参考"], anchors: ["reference", "referencia", "nachschlagewerk"] },
  { id: "guides", domain: "navigation", target: { kind: "page", path: "/guides", label: "Guides" }, weight: 0.9,
    phrases: ["guides", "guides page", "the guides", "all guides", "articles", "tutorials", "help articles", "guias", "les guides", "anleitungen", "指南"], anchors: ["guides", "guias", "anleitungen", "tutorials", "指南"] },
  { id: "voice-coach", domain: "navigation", target: { kind: "page", path: "/guides/voice-coach", label: "Voice coach" }, weight: 1,
    phrases: ["voice coach", "voice guide", "voice help", "how to use voice", "voice commands", "what can i say", "voice tips", "comandos de voz", "commandes vocales", "sprachbefehle", "语音命令"], anchors: ["coach"] },
  { id: "about", domain: "navigation", target: { kind: "page", path: "/about", label: "About" }, weight: 0.9,
    phrases: ["about", "about page", "about us", "about the site", "who made this", "acerca de", "sobre nosotros", "a propos", "uber uns", "impressum", "关于"], anchors: ["about", "acerca", "propos", "impressum", "关于"] },
  { id: "contact", domain: "navigation", target: { kind: "page", path: "/contact", label: "Contact" }, weight: 0.9,
    phrases: ["contact", "contact page", "contact us", "get in touch", "send a message", "send feedback", "report a problem", "contacto", "contactez nous", "kontakt", "联系"], anchors: ["contact", "contacto", "kontakt", "feedback", "联系"] },
  { id: "accessibility", domain: "navigation", target: { kind: "page", path: "/accessibility", label: "Accessibility" }, weight: 0.9,
    phrases: ["accessibility", "accessibility statement", "accessibility page", "accesibilidad", "accessibilite", "barrierefreiheit", "无障碍"], anchors: ["accessibility", "accesibilidad", "accessibilite", "barrierefreiheit"] },
  { id: "privacy", domain: "navigation", target: { kind: "page", path: "/privacy", label: "Privacy" }, weight: 0.9,
    phrases: ["privacy", "privacy policy", "privacy page", "privacy notice", "data protection", "cookie policy", "politica de privacidad", "confidentialite", "datenschutz", "隐私"], anchors: ["privacy", "privacidad", "confidentialite", "datenschutz", "隐私"] },
  { id: "do-not-sell", domain: "navigation", target: { kind: "page", path: "/do-not-sell-or-share", label: "Your privacy choices" }, weight: 1,
    phrases: ["do not sell", "do not sell my information", "do not share my data", "privacy choices", "opt out", "opt out of sale", "your privacy choices"], anchors: [] },
  { id: "terms", domain: "navigation", target: { kind: "page", path: "/terms", label: "Terms" }, weight: 0.9,
    phrases: ["terms", "terms of use", "terms of service", "terms and conditions", "legal terms", "terminos", "condiciones de uso", "conditions d utilisation", "nutzungsbedingungen", "条款"], anchors: ["terms", "terminos", "nutzungsbedingungen"] },
  { id: "disclaimer", domain: "navigation", target: { kind: "page", path: "/disclaimer", label: "Disclaimer" }, weight: 0.9,
    phrases: ["disclaimer", "legal disclaimer", "aviso legal", "avertissement", "haftungsausschluss", "免责声明"], anchors: ["disclaimer", "haftungsausschluss"] },
];

/* ------------------------------------------------------------------ */
/* Countries, indicators and assets                                    */
/* ------------------------------------------------------------------ */

const COUNTRY_ALIASES: Record<string, string[]> = {
  USA: ["usa", "us", "united states", "america", "american", "estados unidos", "etats unis", "vereinigte staaten", "美国"],
  GBR: ["uk", "united kingdom", "britain", "great britain", "british", "england", "reino unido", "royaume uni", "grossbritannien", "英国"],
  DEU: ["germany", "german", "alemania", "allemagne", "deutschland", "德国"],
  FRA: ["france", "french", "francia", "frankreich", "法国"],
  JPN: ["japan", "japanese", "japon", "japón", "日本"],
  CHN: ["china", "chinese", "chine", "中国"],
  IND: ["india", "indian", "inde", "indien", "印度"],
  BRA: ["brazil", "brazilian", "brasil", "bresil", "brasilien", "巴西"],
  CAN: ["canada", "canadian", "kanada", "加拿大"],
  AUS: ["australia", "australian", "australie", "australien", "澳大利亚"],
  ITA: ["italy", "italian", "italia", "italie", "italien", "意大利"],
  ESP: ["spain", "spanish", "espana", "españa", "espagne", "spanien", "西班牙"],
  NLD: ["netherlands", "holland", "dutch", "paises bajos", "pays bas", "niederlande", "荷兰"],
  CHE: ["switzerland", "swiss", "suiza", "suisse", "schweiz", "瑞士"],
  SWE: ["sweden", "swedish", "suecia", "suede", "schweden", "瑞典"],
  POL: ["poland", "polish", "polonia", "pologne", "polen", "波兰"],
  TUR: ["turkey", "turkiye", "turkish", "turquia", "turquie", "turkei", "土耳其"],
  KOR: ["korea", "south korea", "korean", "corea", "coree", "sudkorea", "韩国"],
  IDN: ["indonesia", "indonesian", "indonesie", "indonesien", "印度尼西亚"],
  MEX: ["mexico", "mexican", "mejico", "mexique", "mexiko", "墨西哥"],
  ARG: ["argentina", "argentine", "argentinian", "argentinien", "阿根廷"],
  ZAF: ["south africa", "south african", "sudafrica", "afrique du sud", "sudafrika", "南非"],
  NGA: ["nigeria", "nigerian", "尼日利亚"],
  EGY: ["egypt", "egyptian", "egipto", "egypte", "agypten", "埃及"],
  SAU: ["saudi arabia", "saudi", "arabia saudita", "arabie saoudite", "saudi arabien", "沙特"],
  ARE: ["uae", "emirates", "united arab emirates", "dubai", "emiratos", "emirats", "阿联酋"],
  SGP: ["singapore", "singapur", "singapour", "新加坡"],
  VNM: ["vietnam", "viet nam", "vietnamese", "越南"],
  PHL: ["philippines", "philippine", "filipinas", "philippinen", "菲律宾"],
  NZL: ["new zealand", "nueva zelanda", "nouvelle zelande", "neuseeland", "新西兰"],
};

const INDICATOR_ALIASES: Record<string, string[]> = {
  inflation: ["inflation", "inflation rate", "consumer prices", "cpi", "price growth", "cost of living", "inflacion", "precios al consumidor", "inflationsrate", "通胀", "通货膨胀"],
  gdp_per_capita: ["gdp per capita", "gdp per person", "gdp per head", "income per person", "pib per capita", "pib par habitant", "bip pro kopf", "人均gdp", "gdp"],
  gdp_growth: ["gdp growth", "economic growth", "growth rate", "crecimiento economico", "croissance", "wirtschaftswachstum", "经济增长"],
  unemployment: ["unemployment", "unemployment rate", "jobless rate", "joblessness", "desempleo", "paro", "chomage", "arbeitslosigkeit", "arbeitslosenquote", "失业率"],
  population: ["population", "how many people live", "inhabitants", "poblacion", "habitantes", "bevolkerung", "einwohner", "人口"],
  lending_rate: ["lending rate", "interest rates", "bank rate", "borrowing rate", "tasa de interes", "taux d interet", "zinssatz", "利率"],
};

const ASSET_ALIASES: Record<(typeof CRYPTO_IDS)[number], string[]> = {
  bitcoin: ["bitcoin", "btc", "比特币"],
  ethereum: ["ethereum", "ether", "eth", "以太坊"],
  tether: ["tether", "usdt"],
  binancecoin: ["binance coin", "bnb", "binance"],
  solana: ["solana", "sol"],
  ripple: ["ripple", "xrp"],
  "usd-coin": ["usd coin", "usdc"],
  cardano: ["cardano", "ada"],
  dogecoin: ["dogecoin", "doge", "狗狗币"],
  tron: ["tron", "trx"],
  "avalanche-2": ["avalanche", "avax"],
  polkadot: ["polkadot", "dot"],
  chainlink: ["chainlink", "link"],
  "polygon-ecosystem-token": ["polygon", "matic", "pol"],
  litecoin: ["litecoin", "ltc", "莱特币"],
  "bitcoin-cash": ["bitcoin cash", "bch"],
  stellar: ["stellar", "lumens", "xlm"],
  uniswap: ["uniswap", "uni"],
  monero: ["monero", "xmr"],
  cosmos: ["cosmos", "atom"],
};

const PRICE_WORDS = /\b(?:price|prices|rate|quote|value|worth|cost|market|chart|trading at|how much is|cotizacion|precio|prix|cours|kurs|preis|价格|币价)\b/i;
const NAVIGATION_VERBS = new Set(["open", "show", "go", "goto", "take", "visit", "navigate", "launch", "start", "bring", "switch", "load", "use", "back", "display",
  "abre", "abrir", "muestra", "mostrar", "ir", "ve", "lleva", "ouvre", "ouvrir", "montre", "va", "aller", "offne", "offnen", "zeige", "zeigen", "geh", "gehe", "打开", "显示", "去", "进入"]);
const FILLER = new Set(["the", "a", "an", "to", "me", "please", "page", "tool", "section", "my", "up", "on", "of", "for", "in", "it", "i", "want", "need", "would", "like", "can", "you", "could",
  "el", "la", "los", "las", "una", "un", "por", "favor", "pagina", "herramienta", "le", "les", "une", "sil", "vous", "plait", "der", "die", "das", "bitte", "seite", "请", "一下"]);

function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
}

function tokens(text: string, locale: string): string[] {
  return segmentWords(fold(text), locale).map((word) => word.replace(/[^\p{L}\p{N}]/gu, "")).filter(Boolean);
}

/** Damerau–Levenshtein distance capped at `limit` + 1. */
function editDistance(a: string, b: string, limit: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  const previous = new Array<number>(b.length + 1);
  const current = new Array<number>(b.length + 1);
  let beforePrevious: number[] | null = null;
  for (let j = 0; j <= b.length; j += 1) previous[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    let rowMin = current[0];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      if (beforePrevious && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) value = Math.min(value, beforePrevious[j - 2] + 1);
      current[j] = value;
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > limit) return limit + 1;
    beforePrevious = previous.slice();
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }
  return previous[b.length];
}

/** Tolerate recogniser noise proportional to word length. */
function similar(heard: string, wanted: string): boolean {
  if (heard === wanted) return true;
  if (wanted.length < 5 || heard.length < 4) return false;
  const limit = wanted.length >= 9 ? 2 : 1;
  return editDistance(heard, wanted, limit) <= limit;
}

function phraseScore(utterance: string[], phrase: string, locale: string): number {
  const wanted = tokens(phrase, locale);
  if (!wanted.length) return 0;
  let hits = 0;
  for (const word of wanted) if (utterance.some((heard) => similar(heard, word))) hits += 1;
  if (hits < wanted.length) {
    // Allow one filler word to be missing from a long phrase ("terms of use" → "terms use").
    const substantive = wanted.filter((word) => !FILLER.has(word));
    const substantiveHits = substantive.filter((word) => utterance.some((heard) => similar(heard, word))).length;
    if (substantive.length && substantiveHits === substantive.length) return 0.9 + Math.min(0.1, substantive.length * 0.03);
    return 0;
  }
  return 1 + Math.min(0.3, wanted.length * 0.1);
}

/** Does an alias (one or more words) occur in the utterance, in order? */
function containsAlias(utterance: string[], alias: string, locale: string): boolean {
  const wanted = tokens(alias, locale);
  if (!wanted.length) return false;
  for (let start = 0; start + wanted.length <= utterance.length; start += 1) {
    let all = true;
    for (let offset = 0; offset < wanted.length; offset += 1) {
      const heard = utterance[start + offset];
      const want = wanted[offset];
      if (!(heard === want || (want.length >= 5 && similar(heard, want)))) { all = false; break; }
    }
    if (all) return true;
  }
  return false;
}

export function associateCountry(text: string, locale = "en"): string | null {
  const words = tokens(text, locale);
  let best: { code: string; length: number } | null = null;
  for (const [code, aliases] of Object.entries(COUNTRY_ALIASES)) {
    for (const alias of aliases) {
      if (!containsAlias(words, alias, locale)) continue;
      if (!best || alias.length > best.length) best = { code, length: alias.length };
    }
  }
  return best && COUNTRIES.some((country) => country.value === best!.code) ? best.code : null;
}

export function associateIndicator(text: string, locale = "en"): string | null {
  const words = tokens(text, locale);
  let best: { id: string; length: number } | null = null;
  for (const [id, aliases] of Object.entries(INDICATOR_ALIASES)) {
    for (const alias of aliases) {
      if (!containsAlias(words, alias, locale)) continue;
      if (!best || alias.length > best.length) best = { id, length: alias.length };
    }
  }
  return best && INDICATORS.some((indicator) => indicator.value === best!.id) ? best.id : null;
}

export function associateAsset(text: string, locale = "en"): (typeof CRYPTO_IDS)[number] | null {
  const words = tokens(text, locale);
  let best: { id: (typeof CRYPTO_IDS)[number]; length: number } | null = null;
  for (const id of CRYPTO_IDS) {
    for (const alias of ASSET_ALIASES[id]) {
      // Two- and three-letter tickers are only trusted next to a price word.
      if (alias.length <= 4 && !PRICE_WORDS.test(text)) continue;
      if (!containsAlias(words, alias, locale)) continue;
      if (!best || alias.length > best.length) best = { id, length: alias.length };
    }
  }
  return best?.id ?? null;
}

export interface AssociationOptions {
  locale?: string;
  /** Domain of the most recent completed turn, used only to break ties. */
  recentDomain?: TaskDomain | null;
}

/**
 * Map a sentence onto a capability. Returns null when nothing in the lexicon
 * is named clearly enough: a bare "open" or an unrelated sentence must never
 * send the visitor anywhere.
 */
export function associate(text: string, options: AssociationOptions = {}): Association | null {
  const locale = options.locale ?? "en";
  const words = tokens(text, locale);
  if (!words.length || words.length > 24) return null;
  const hasVerb = words.some((word) => NAVIGATION_VERBS.has(word));
  const meaningful = words.filter((word) => !FILLER.has(word) && !NAVIGATION_VERBS.has(word));

  // Market data is resolved before the generic lexicon so "ethereum price"
  // carries its asset and "unemployment in spain" its country + indicator.
  const asset = associateAsset(text, locale);
  if (asset) {
    const score = PRICE_WORDS.test(text) ? 1.6 : 1.2;
    return { kind: "tool", topic: asset === "bitcoin" ? "bitcoin" : "crypto", label: `${asset.replace(/-\d+$/, "").replace(/-/g, " ")} price`, score, signals: [`asset:${asset}`], slots: { asset } };
  }
  const indicator = associateIndicator(text, locale);
  const country = associateCountry(text, locale);
  if (indicator && (country || /\b(?:rate|data|statistics|figures|latest|current)\b/i.test(text) || meaningful.length <= 3)) {
    const topic: TopicId = indicator === "inflation" ? "inflation" : "gdp";
    const label = INDICATORS.find((item) => item.value === indicator)?.label ?? indicator;
    const countryLabel = COUNTRIES.find((item) => item.value === country)?.label;
    return {
      kind: "tool", topic, label: countryLabel ? `${label} — ${countryLabel}` : label,
      score: country ? 1.7 : 1.3, signals: [`indicator:${indicator}`, country ? `country:${country}` : "country:default"],
      slots: { indicator, ...(country ? { economy: country } : {}) },
    };
  }

  let best: { entry: LexiconEntry; score: number; phrase: string } | null = null;
  for (const entry of LEXICON) {
    let entryBest = 0; let entryPhrase = "";
    for (const phrase of entry.phrases) {
      const score = phraseScore(words, phrase, locale);
      if (score > entryBest) { entryBest = score; entryPhrase = phrase; }
    }
    if (!entryBest && entry.anchors?.length) {
      const anchor = entry.anchors.find((word) => words.some((heard) => similar(heard, fold(word))));
      if (anchor) { entryBest = 0.8; entryPhrase = anchor; }
    }
    if (!entryBest) continue;
    // Specificity: the fewer unexplained words remain, the surer the mapping.
    const explained = tokens(entryPhrase, locale);
    const leftover = meaningful.filter((word) => !explained.some((want) => similar(word, want))).length;
    let score = entryBest * (entry.weight ?? 1) - leftover * 0.18 + (hasVerb ? 0.25 : 0);
    if (options.recentDomain && options.recentDomain === entry.domain) score += 0.1;
    if (!best || score > best.score) best = { entry, score, phrase: entryPhrase };
  }
  if (!best) return null;
  // Anchors alone (a single word such as "privacy") must be nearly the whole sentence.
  const anchorsOnly = best.score < 1 && meaningful.length > 2;
  if (anchorsOnly || best.score < 0.6) return null;
  const signals = [`phrase:${best.phrase}`, hasVerb ? "navigation-verb" : "no-verb", `leftover:${meaningful.length}`];
  if (best.entry.target.kind === "page") {
    return { kind: "page", path: best.entry.target.path, label: best.entry.target.label, score: best.score, signals };
  }
  return { kind: "tool", topic: best.entry.target.topic, label: best.entry.target.label, score: best.score, signals, slots: {} };
}

/** The lexicon as a serialisable manifest (capability → phrases), for diagnostics. */
export function describeAssociations(): Array<{ id: string; kind: string; target: string; phrases: number }> {
  return LEXICON.map((entry) => ({
    id: entry.id,
    kind: entry.target.kind,
    target: entry.target.kind === "page" ? entry.target.path : entry.target.topic,
    phrases: entry.phrases.length,
  }));
}

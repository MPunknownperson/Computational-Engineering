/**
 * Normalisation and tolerant matching for spoken text.
 *
 * Recognisers — especially small on-device models — return text that is
 * *phonetically* right but spelled or segmented wrong: "kihlograms", "dolars",
 * "euross", "one point five" written as "1 5". Exact dictionary matching then
 * fails and the visitor sees a transcript that "doesn't match" what they said.
 * These helpers repair the common cases before matching, and score near misses
 * when exact matching still fails.
 */

/** Filler words recognisers prepend or append; they never carry meaning here. */
const FILLER = [
  "ok", "okay", "hey", "please", "could you", "can you", "would you", "i want to", "i would like to",
  "calcula", "por favor", "quiero", "s il vous plait", "je veux", "bitte", "ich mochte",
  "请", "帮我", "麻烦",
];

/** Words a recogniser writes for a decimal point when dictating a number. */
const POINT_WORDS = ["point", "dot", "decimal", "comma", "punto", "virgule", "virgula", "komma", "点"];

/** Spoken fractions that map to a multiplier of the following number. */
const FRACTIONS: Record<string, number> = {
  half: 0.5, quarter: 0.25, third: 1 / 3, "three quarters": 0.75,
  mitad: 0.5, cuarto: 0.25, moitie: 0.5, quart: 0.25, halfte: 0.5, viertel: 0.25, 半: 0.5,
};

export function stripFiller(text: string): string {
  let out = ` ${text} `;
  for (const word of FILLER) {
    const padded = ` ${word} `;
    while (out.includes(padded)) out = out.replace(padded, " ");
  }
  return out.replace(/\s+/g, " ").trim();
}

/** Number words a recogniser may dictate around a decimal point. */
const NUMBER_WORDS: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7",
  eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12", twenty: "20", thirty: "30",
  forty: "40", fifty: "50", sixty: "60", seventy: "70", eighty: "80", ninety: "90", hundred: "100",
  cero: "0", uno: "1", dos: "2", tres: "3", cuatro: "4", cinco: "5", seis: "6", siete: "7",
  ocho: "8", nueve: "9", diez: "10", veinte: "20", cincuenta: "50", cien: "100",
  zero_fr: "0", un: "1", deux: "2", trois: "3", quatre: "4", cinq: "5", six_fr: "6", sept: "7",
  huit: "8", neuf: "9", dix: "10", cinquante: "50", cent: "100",
  eins: "1", zwei: "2", drei: "3", vier: "4", funf: "5", funnf: "5", sechs: "6", sieben: "7",
  acht: "8", neun: "9", zehn: "10", zwanzig: "20", funfzig: "50", hundert_de: "100",
  ling: "0", yi: "1", er: "2", san: "3", si: "4", wu: "5", dian: ".",
};

const toDigit = (word: string): string | null => {
  if (/^\d+$/.test(word)) return word;
  if (word in NUMBER_WORDS) return NUMBER_WORDS[word];
  return null;
};

/**
 * Replace "one point five" or "12 point 5" dictation with "1.5" / "12.5".
 * Only applies when both sides of the point word read as numbers, so ordinary
 * phrases are never mangled.
 */
export function normaliseSpokenDecimals(text: string): string {
  let out = text;
  for (const word of POINT_WORDS) {
    out = out.replace(new RegExp(`(\\d)\\s+${word}\\s+(\\d+)`, "gi"), "$1.$2");
    out = out.replace(
      new RegExp(`([a-z\\u00c0-\\u024f]+)\\s+${word}\\s+([a-z\\u00c0-\\u024f]+)`, "gi"),
      (match, left: string, right: string) => {
        const whole = toDigit(left.toLowerCase());
        const rightLower = right.toLowerCase();
        // Either a single number word ("five") or a run of digit words.
        const fraction = toDigit(rightLower) ?? rightLower.split(" ").map(toDigit).filter(Boolean).join("");
        if (whole === null || !fraction) return match;
        return `${whole}.${fraction}`;
      },
    );
  }
  return out;
}

/** Turn "half a kilo" / "a quarter mile" into a numeric multiplier form. */
export function normaliseFractions(text: string): string {
  let out = text;
  for (const [word, factor] of Object.entries(FRACTIONS)) {
    if (!out.includes(word)) continue;
    const label = factor === 0.5 ? "0.5" : factor === 0.25 ? "0.25" : factor.toFixed(3).replace(/0+$/, "");
    out = out.replace(new RegExp(`\\b${word}\\b\\s*(?:of\\s*)?(?:a|an)?\\s*`, "gi"), `${label} `);
  }
  return out.replace(/\s+/g, " ").trim();
}

/**
 * Apply every cheap text repair in one pass.
 * Order matters: fillers first, then fractions, then decimals.
 */
export function repairTranscript(text: string): string {
  return normaliseSpokenDecimals(normaliseFractions(stripFiller(text)));
}

/** Classic Levenshtein distance, capped so long pairs bail out early. */
export function editDistance(a: string, b: string, cap = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      current[j] = value;
      if (value < best) best = value;
    }
    if (best > cap) return cap + 1;
    previous = current;
  }
  return previous[b.length];
}

/** Tolerated edits for a dictionary phrase of a given length. */
function tolerance(length: number): number {
  if (length >= 9) return 2;
  if (length >= 5) return 1;
  return 0;
}

/**
 * Is a spoken token a near miss for a dictionary phrase?
 * Only length-3+ Latin words are considered; short or non-Latin tokens are
 * matched exactly so unrelated words never merge.
 */
export function isNearMatch(spoken: string, phrase: string): boolean {
  if (spoken === phrase) return true;
  if (!/^[\p{Script=Latin}]{3,24}$/u.test(spoken) || !/^[\p{Script=Latin}]{3,24}$/u.test(phrase)) return false;
  if (phrase.includes(" ") !== spoken.includes(" ")) {
    // Multi-word dictionary phrases still tolerate a single wrong word inside.
    const spokenWords = spoken.split(" ");
    const phraseWords = phrase.split(" ");
    if (spokenWords.length !== phraseWords.length) return false;
    return spokenWords.every((word, i) => editDistance(word, phraseWords[i], 2) <= tolerance(phraseWords[i].length));
  }
  const allowed = tolerance(phrase.length);
  return allowed > 0 && editDistance(spoken, phrase, allowed) <= allowed;
}

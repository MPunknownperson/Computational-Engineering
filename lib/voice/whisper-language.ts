/** BCP-47 language subtags mapped to Whisper's expected English language names. */
const WHISPER_LANGUAGES: Record<string, string> = {
  af: "afrikaans", am: "amharic", ar: "arabic", as: "assamese", az: "azerbaijani",
  ba: "bashkir", be: "belarusian", bg: "bulgarian", bn: "bengali", bo: "tibetan",
  br: "breton", bs: "bosnian", ca: "catalan", cs: "czech", cy: "welsh", da: "danish",
  de: "german", el: "greek", en: "english", es: "spanish", et: "estonian", eu: "basque",
  fa: "persian", fi: "finnish", fo: "faroese", fr: "french", gl: "galician", gu: "gujarati",
  ha: "hausa", haw: "hawaiian", he: "hebrew", hi: "hindi", hr: "croatian", ht: "haitian creole",
  hu: "hungarian", hy: "armenian", id: "indonesian", is: "icelandic", it: "italian", ja: "japanese",
  jw: "javanese", ka: "georgian", kk: "kazakh", km: "khmer", kn: "kannada", ko: "korean",
  la: "latin", lb: "luxembourgish", ln: "lingala", lo: "lao", lt: "lithuanian", lv: "latvian",
  mg: "malagasy", mi: "maori", mk: "macedonian", ml: "malayalam", mn: "mongolian", mr: "marathi",
  ms: "malay", mt: "maltese", my: "myanmar", ne: "nepali", nl: "dutch", nn: "nynorsk", no: "norwegian",
  oc: "occitan", pa: "punjabi", pl: "polish", ps: "pashto", pt: "portuguese", ro: "romanian",
  ru: "russian", sa: "sanskrit", sd: "sindhi", si: "sinhala", sk: "slovak", sl: "slovenian",
  sn: "shona", so: "somali", sq: "albanian", sr: "serbian", su: "sundanese", sv: "swedish",
  sw: "swahili", ta: "tamil", te: "telugu", tg: "tajik", th: "thai", tk: "turkmen", tl: "tagalog",
  tr: "turkish", tt: "tatar", uk: "ukrainian", ur: "urdu", uz: "uzbek", vi: "vietnamese",
  yi: "yiddish", yo: "yoruba", yue: "cantonese", zh: "chinese",
};

/** Whisper expects a supported language name ("french"), not a BCP-47 tag. */
export function whisperLanguage(locale: string | undefined | null): string | undefined {
  if (!locale) return undefined;
  const subtag = locale.toLowerCase().split(/[-_]/)[0];
  return WHISPER_LANGUAGES[subtag];
}

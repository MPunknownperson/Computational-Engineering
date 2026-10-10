/** Conservative audio-language support; text-language support is not ASR support. */
export function supportsGenerativeSpeechLanguage(locale: string): boolean {
  return locale.toLowerCase().split(/[-_]/)[0] === "en";
}

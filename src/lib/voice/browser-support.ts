import type { PlatformProfile } from "@/lib/platform";

export function browserSpeechGuidance(profile: Pick<PlatformProfile, "os" | "browser">): string {
  if (profile.os === "android") {
    return "On Android phones and tablets, use Chrome with Google Mobile Services (GMS) and the device’s Google speech recognition service enabled. Allow microphone access. Service, language, network and regional availability can vary.";
  }
  if (profile.os === "ios" || profile.os === "ipados") {
    return "On iPhone and iPad, voice input on this site is supported only in Safari, using Apple’s system Siri speech-to-text technology. Enable Siri & Dictation and allow microphone access. Availability depends on system settings, language and region.";
  }
  return "Voice input uses your browser’s Web Speech API. Use a supported browser, allow microphone access, and check the speech service’s language and network availability. You can always enter values by typing.";
}

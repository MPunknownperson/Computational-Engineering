import StudioClient from "@/components/studio/StudioClient";

export const dynamic = "force-dynamic";

/**
 * Spoken commands land here with their parameters: "compose a melody" opens
 * /studio?compose=1 and "guitar" opens /studio?instrument=guitar, so the voice
 * engine can drive the music engine directly.
 */
export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (key: string): string | undefined => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };
  const instrument = one("instrument");
  return (
    <StudioClient
      autoCompose={one("compose") === "1"}
      initialInstrument={instrument === "guitar" ? "guitar" : instrument === "piano" ? "piano" : null}
    />
  );
}

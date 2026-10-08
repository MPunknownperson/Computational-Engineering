import ArenaClient from "@/components/arena/ArenaClient";

export const dynamic = "force-dynamic";

/**
 * The arena can be opened from a spoken command: the voice engine routes
 * "play the arena" to /arena?start=1 and "play with motion" to /arena?mode=tilt
 * (see the engine intents in src/lib/intent.ts).
 */
export default async function ArenaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (key: string): string | undefined => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };
  const comp = one("comp");
  const id = comp ? Number.parseInt(comp, 10) : Number.NaN;
  return (
    <ArenaClient
      initialCompId={Number.isFinite(id) ? id : null}
      autoStart={one("start") === "1"}
      initialMode={one("mode") === "tilt" ? "tilt" : "keyboard"}
    />
  );
}

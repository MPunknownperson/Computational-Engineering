/**
 * Runs once when the Node.js server starts: loads persisted runtime patches,
 * makes sure the reliability/crypto tables exist and starts the automated
 * market refresh loop so the first visitor already gets warm data.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  try {
    const [{ loadRuntimePatches }, { ensureReliabilitySchema }, { ensureAutoUpdater }] = await Promise.all([
      import("@/lib/remediation/runtime-config"),
      import("@/lib/remediation/engine"),
      import("@/lib/crypto/service"),
    ]);
    await loadRuntimePatches();
    await ensureReliabilitySchema();
    ensureAutoUpdater();
  } catch (error) {
    console.error("[instrumentation] boot sequence degraded:", error instanceof Error ? error.message : error);
  }
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArenaGame, type ArenaEvent } from "@/engine/game/arena";
import { buildProfile, generateRules } from "@/engine/game/adaptive";
import { bridgeArenaToMusic } from "@/engine/integration";
import { MusicEngine } from "@/engine/music/audio";
import { composePattern } from "@/engine/music/composer";
import { SCALE_LABELS, midiName } from "@/engine/music/theory";
import type {
  BehaviorProfile,
  GameRules,
  InputMode,
  Judgement,
  NoteEvent,
  Pattern,
  RunSummary,
  SessionSummary,
} from "@/engine/types";
import { useMotion } from "@/hooks/useMotion";

const W = 420;
const H = 640;
const AHEAD_BEATS = 4;

const LANE_KEYS: Record<number, string[]> = {
  3: ["f", " ", "j"],
  4: ["d", "f", "j", "k"],
  5: ["d", "f", " ", "j", "k"],
};

/** Site palette (see :root in globals.css) so the canvas matches the paper design. */
const INK = "#0b1020";
const PAPER = "#f7f5ef";
const CARD = "#fffdf5";
const LANE_COLORS = ["#ff6b4a", "#5b8cff", "#ffd23f", "#4ade80", "#a78bfa"];

const JUDGE_STYLE: Record<Judgement, { text: string; color: string }> = {
  perfect: { text: "PERFECT", color: "#c74322" },
  great: { text: "GREAT", color: "#146c3a" },
  good: { text: "GOOD", color: "#2f5fd0" },
  miss: { text: "MISS", color: "#8a2b2b" },
};

interface SessionRow extends SessionSummary {
  id: number;
  mode: string;
  score: number;
}

interface SavedComposition {
  id: number;
  title: string;
  bpm: number;
  instrument: string;
  events: NoteEvent[];
}

interface Hud {
  score: number;
  combo: number;
  maxCombo: number;
  hits: number;
  misses: number;
  accuracy: number;
}

const EMPTY_HUD: Hud = { score: 0, combo: 0, maxCombo: 0, hits: 0, misses: 0, accuracy: 0 };
type Flash = { text: string; color: string; t: number } | null;

const pct = (v: number) => `${Math.round(v * 100)}%`;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.fill();
}

function drawArena(canvas: HTMLCanvasElement, g: ArenaGame, flash: Flash, now: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  if (canvas.width !== Math.round(W * dpr)) {
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const L = g.laneCount;
  const laneW = W / L;
  const hitY = H - 110;
  const pxPerBeat = (hitY - 30) / AHEAD_BEATS;
  const beat = g.currentBeat();

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, CARD);
  bg.addColorStop(1, PAPER);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < L; i++) {
    ctx.fillStyle =
      i === g.playerLane ? "rgba(91,140,255,0.16)" : i % 2 ? "rgba(26,32,64,0.03)" : "rgba(26,32,64,0.06)";
    ctx.fillRect(i * laneW, 0, laneW, H);
    ctx.fillStyle = "rgba(26,32,64,0.10)";
    ctx.fillRect(i * laneW, 0, 1, H);
  }

  for (let b = Math.floor(beat) - 1; b <= beat + AHEAD_BEATS; b++) {
    const y = hitY - (b - beat) * pxPerBeat;
    if (y < 0 || y > H) continue;
    ctx.fillStyle = b % 4 === 0 ? "rgba(26,32,64,0.28)" : "rgba(26,32,64,0.08)";
    ctx.fillRect(0, y, W, b % 4 === 0 ? 2 : 1);
  }

  for (const n of g.visibleNotes(beat, AHEAD_BEATS, 0.8)) {
    const dt = n.hitBeat - beat;
    const y = hitY - dt * pxPerBeat;
    const x = n.lane * laneW + laneW * 0.12;
    const w = laneW * 0.76;
    const h = 20;
    ctx.save();
    if (n.state === "pending") {
      ctx.fillStyle = LANE_COLORS[n.lane % LANE_COLORS.length];
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      roundRect(ctx, x, y - h / 2, w, h, 7);
      ctx.stroke();
    } else if (n.state === "hit") {
      ctx.globalAlpha = Math.max(0, Math.min(1, 1 - Math.max(0, -dt) * 4));
      ctx.fillStyle = "#ffd23f";
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      roundRect(ctx, x - 3, y - h / 2 - 3, w + 6, h + 6, 9);
      ctx.stroke();
    } else {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = "#c9536a";
      roundRect(ctx, x, y - h / 2, w, h, 7);
    }
    ctx.restore();
  }

  ctx.fillStyle = INK;
  ctx.fillRect(0, hitY - 2, W, 4);

  const px = g.playerLane * laneW;
  ctx.fillStyle = "rgba(11,16,32,0.75)";
  roundRect(ctx, px + 8, hitY + 16, laneW - 16, 10, 5);

  if (flash && now - flash.t < 450) {
    ctx.save();
    ctx.globalAlpha = 1 - (now - flash.t) / 450;
    ctx.fillStyle = flash.color;
    ctx.font = "800 26px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(flash.text, W / 2, hitY - 132);
    ctx.restore();
  }

  ctx.fillStyle = "rgba(26,32,64,0.15)";
  ctx.fillRect(0, H - 6, W, 6);
  ctx.fillStyle = "#ff6b4a";
  ctx.fillRect(0, H - 6, W * g.progress(), 6);
}

function Meter({ label, value, display }: { label: string; value: number; display: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span className="mono font-bold text-[color:var(--ink)]">{display}</span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full border-2 border-[color:var(--line)] bg-[color:var(--paper-2)]">
        <div
          className="h-full rounded-full bg-[color:var(--accent)] transition-[width] duration-300"
          style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="sketch-sm text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mono mt-1 text-lg font-extrabold text-[color:var(--ink)]">{value}</p>
    </div>
  );
}

export interface ArenaClientProps {
  initialCompId: number | null;
  /** Set by the voice command "play the arena" (/arena?start=1). */
  autoStart?: boolean;
  /** Set by the voice command "play with motion" (/arena?mode=tilt). */
  initialMode?: InputMode;
}

export default function ArenaClient({ initialCompId, autoStart = false, initialMode = "keyboard" }: ArenaClientProps) {
  const [audio] = useState(() => new MusicEngine());
  const gameRef = useRef<ArenaGame | null>(null);
  const disposeBridgeRef = useRef<(() => void) | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const flashRef = useRef<Flash>(null);
  const autoStartDone = useRef(false);

  const [mode, setMode] = useState<InputMode>(initialMode);
  const [source, setSource] = useState<string>(initialCompId ? String(initialCompId) : "adaptive");
  const [runs, setRuns] = useState<SessionRow[]>([]);
  const [profile, setProfile] = useState<BehaviorProfile>(() => buildProfile([]));
  const [rules, setRules] = useState<GameRules>(() => generateRules(buildProfile([])));
  const [comps, setComps] = useState<SavedComposition[]>([]);
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [hud, setHud] = useState<Hud>(EMPTY_HUD);
  const [lastRun, setLastRun] = useState<RunSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [motionOn, setMotionOn] = useState(false);
  const [tiltView, setTiltView] = useState(0);

  const handleShake = useCallback(() => {
    const g = gameRef.current;
    if (!g || g.finished) return;
    g.hit(g.playerLane, "shake");
  }, []);

  const { reading, permission, request } = useMotion(motionOn && mode === "tilt", handleShake);

  const refreshAdaptive = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions?limit=20", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { sessions: SessionRow[] };
      const summaries: SessionSummary[] = data.sessions.map((s) => ({
        accuracy: s.accuracy,
        meanOffsetMs: s.meanOffsetMs,
        motionRatio: s.motionRatio,
        maxCombo: s.maxCombo,
        bpm: s.bpm,
        laneCount: s.laneCount,
        hits: s.hits,
        misses: s.misses,
      }));
      const p = buildProfile(summaries);
      setRuns(data.sessions);
      setProfile(p);
      setRules(generateRules(p));
    } catch {
      setError("Could not load run history");
    }
  }, []);

  const loadComps = useCallback(async () => {
    try {
      const res = await fetch("/api/compositions?limit=30", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { compositions: SavedComposition[] };
      setComps(data.compositions);
    } catch {
      setError("Could not load compositions");
    }
  }, []);

  useEffect(() => {
    void refreshAdaptive();
    void loadComps();
    return () => {
      disposeBridgeRef.current?.();
      audio.stop();
    };
  }, [audio, refreshAdaptive, loadComps]);

  // Keyboard: lane keys hit, arrows move the cursor, Enter hits the cursor lane.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (!g || g.finished) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        if (!e.repeat) g.moveLane(e.key === "ArrowLeft" ? -1 : 1);
        return;
      }
      if (e.repeat) return;
      const keys = LANE_KEYS[g.laneCount] ?? [];
      const idx = keys.indexOf(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      if (idx >= 0) {
        e.preventDefault();
        g.playerLane = idx;
        g.hit(idx, "keyboard");
      } else if (e.key === "Enter") {
        g.hit(g.playerLane, "keyboard");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!motionOn) return;
    const id = window.setInterval(() => setTiltView(reading.current.tilt), 120);
    return () => window.clearInterval(id);
  }, [motionOn, reading]);

  // Render + update loop, only while a run is live.
  useEffect(() => {
    if (phase !== "playing") return;
    let raf = 0;
    let lastUi = 0;
    const frame = (t: number) => {
      const g = gameRef.current;
      if (!g || g.finished) return;
      if (g.mode === "tilt") g.setLaneFromTilt(reading.current.tilt);
      g.update();
      if (canvasRef.current) drawArena(canvasRef.current, g, flashRef.current, t);
      if (t - lastUi > 100) {
        lastUi = t;
        setHud({
          score: g.score,
          combo: g.combo,
          maxCombo: g.maxCombo,
          hits: g.hits,
          misses: g.misses,
          accuracy: g.notes.length ? g.hits / g.notes.length : 0,
        });
      }
      if (!g.finished) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase, reading]);

  const flash = (judgement: Judgement) => {
    flashRef.current = { ...JUDGE_STYLE[judgement], t: performance.now() };
  };

  const completeRun = async (summary: RunSummary, used: GameRules) => {
    setLastRun(summary);
    setPhase("done");
    disposeBridgeRef.current?.();
    disposeBridgeRef.current = null;
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...summary, rules: used }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await refreshAdaptive();
    } catch {
      setError("Run finished, but it could not be saved");
    }
  };

  const buildRunPattern = (): { pattern: Pattern; runRules: GameRules } => {
    if (source === "adaptive") {
      const pattern = composePattern({
        name: "Arena run",
        seed: Math.floor(Math.random() * 1_000_000_000),
        bpm: rules.bpm,
        root: rules.root,
        scale: rules.scale,
        bars: 8,
        instrument: rules.instrument,
        progression: rules.progression,
        density: rules.density,
        swing: rules.swing,
        drums: true,
      });
      return { pattern, runRules: rules };
    }
    const comp = comps.find((c) => String(c.id) === source);
    if (!comp) throw new Error("Selected composition is no longer available");
    const end = Math.max(...comp.events.map((e) => e.beat + e.dur));
    const pattern: Pattern = {
      name: comp.title,
      bpm: comp.bpm,
      lengthBeats: Math.max(4, Math.ceil(end / 4) * 4),
      events: comp.events,
    };
    return {
      pattern,
      runRules: { ...rules, bpm: comp.bpm, instrument: comp.instrument === "guitar" ? "guitar" : "piano" },
    };
  };

  const start = useCallback(async () => {
    setError(null);
    try {
      const { pattern, runRules } = buildRunPattern();
      const game = new ArenaGame(audio, runRules, pattern, mode);
      game.subscribe((e: ArenaEvent) => {
        if (e.type === "hit") flash(e.judgement);
        else if (e.type === "miss") flash("miss");
        else if (e.type === "finish") void completeRun(e.summary, runRules);
      });
      disposeBridgeRef.current?.();
      disposeBridgeRef.current = bridgeArenaToMusic(game, audio);
      gameRef.current = game;
      flashRef.current = null;
      setHud(EMPTY_HUD);
      setLastRun(null);
      setPhase("playing");
      await game.start();
      // Browsers only start audio from a real gesture. If the context is still
      // suspended (e.g. the run was opened by a voice command), arm a one-shot
      // listener so the first tap or keypress starts the run properly.
      if (audio.context?.state !== "running") {
        setNeedsGesture(true);
        audio.stop();
        setPhase("idle");
        const once = () => {
          setNeedsGesture(false);
          window.removeEventListener("pointerdown", once);
          window.removeEventListener("keydown", once);
          void start();
        };
        window.addEventListener("pointerdown", once, { once: true });
        window.addEventListener("keydown", once, { once: true });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    } catch (err) {
      setPhase("idle");
      setError(err instanceof Error ? err.message : "Could not start the arena");
    }
  }, [audio, comps, mode, rules, source]);

  // A spoken "play the arena" arrives as ?start=1; try it once on load.
  useEffect(() => {
    if (!autoStart || autoStartDone.current) return;
    autoStartDone.current = true;
    void start();
  }, [autoStart, start]);

  const quit = () => gameRef.current?.finish();

  const touchLane = (lane: number) => {
    const g = gameRef.current;
    if (!g || g.finished) return;
    g.playerLane = lane;
    g.hit(lane, "touch");
  };

  const enableMotion = async () => {
    const ok = await request();
    setMotionOn(ok);
  };

  const playing = phase === "playing";
  const lanes = rules.laneCount;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-5">
      <header className="mb-6">
        <span className="chip">Game engine</span>
        <h1 className="h-title mt-3 text-3xl sm:text-4xl">
          <span className="h-underline">Rhythm Arena</span>
        </h1>
        <p className="mt-3 max-w-2xl text-slate-500">
          The chart is the melody the music engine just composed, judged on its own beat clock. Hit notes with keys,
          touch, or by tilting and shaking your phone. Every run rewrites the rules for the next one.
        </p>
      </header>

      {error && (
        <div className="sketch-sm mb-4 border-[color:#8a2b2b] bg-[#fff1ee] text-sm font-semibold text-[#8a2b2b]">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="sketch">
          <div className="relative mx-auto w-full max-w-[420px]">
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="block h-auto w-full rounded-[14px] border-2 border-[color:var(--line)]"
              aria-label="Rhythm arena playfield"
            />
            {phase !== "playing" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[14px] bg-[color:var(--paper)]/92 p-6 text-center">
                <span className="chip">{phase === "done" ? "Run complete" : "Ready"}</span>
                {lastRun ? (
                  <>
                    <p className="mono mt-3 text-4xl font-extrabold text-[color:var(--ink)]">
                      {lastRun.score.toLocaleString()}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {lastRun.hits} hits · {lastRun.misses} misses · max combo {lastRun.maxCombo} · accuracy{" "}
                      {pct(lastRun.accuracy)}
                    </p>
                  </>
                ) : (
                  <p className="mt-3 max-w-xs text-sm text-slate-500">
                    {needsGesture
                      ? "Browsers need one tap before audio can start. Tap Start to begin the run."
                      : mode === "keyboard"
                        ? "Keys D F J K hit the lanes, arrows move the cursor, Space hits the middle lane."
                        : "Tilt your device to move the cursor lane. Shake to strike. On desktop, use the keyboard."}
                  </p>
                )}
                <button type="button" onClick={() => void start()} className="btn btn-primary mt-6">
                  {phase === "done" ? "Play again" : needsGesture ? "Tap to start" : "Start run"}
                </button>
              </div>
            )}
          </div>

          <div
            className="mx-auto mt-4 grid max-w-[420px] gap-2"
            style={{ gridTemplateColumns: `repeat(${lanes}, minmax(0,1fr))` }}
          >
            {Array.from({ length: lanes }, (_, i) => (
              <button
                key={i}
                type="button"
                onPointerDown={() => touchLane(i)}
                disabled={!playing}
                className="btn mono h-14 text-xs"
                style={{ borderColor: LANE_COLORS[i % LANE_COLORS.length] }}
              >
                {LANE_KEYS[lanes]?.[i] === " " ? "SPC" : LANE_KEYS[lanes]?.[i]?.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="mx-auto mt-4 flex max-w-[420px] flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span className="text-slate-500">Score</span>
              <span className="mono font-extrabold">{hud.score.toLocaleString()}</span>
              <span className="text-slate-500">Combo</span>
              <span className="mono font-extrabold">{hud.combo}</span>
            </div>
            <div className="flex gap-2">
              <Link href="/studio" className="btn btn-ghost text-sm">
                Studio
              </Link>
              <button type="button" onClick={quit} disabled={!playing} className="btn btn-ink text-sm">
                End run
              </button>
            </div>
          </div>
        </section>

        <aside className="stagger space-y-5">
          <section className="sketch space-y-4">
            <h2 className="h-title text-sm uppercase tracking-[0.15em]">Controls</h2>
            <div className="segmented w-full">
              {(["keyboard", "tilt"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={playing}
                  onClick={() => setMode(m)}
                  className={`segmented-item btn btn-ghost flex-1 text-sm ${mode === m ? "btn-ink" : ""}`}
                >
                  {m === "tilt" ? "Motion" : "Keyboard"}
                </button>
              ))}
            </div>

            {mode === "tilt" && (
              <div className="sketch-sm space-y-2 text-sm">
                {permission === "unsupported" ? (
                  <p className="text-slate-500">This device has no motion sensors. Use the keyboard instead.</p>
                ) : !motionOn ? (
                  <button type="button" onClick={() => void enableMotion()} className="btn w-full text-sm">
                    Enable motion sensors
                  </button>
                ) : (
                  <>
                    <Meter label="Tilt" value={(tiltView + 1) / 2} display={tiltView.toFixed(2)} />
                    <p className="text-xs text-slate-500">
                      {reading.current.live
                        ? "Sensor live. Shake to strike the cursor lane."
                        : "Waiting for sensor data…"}
                    </p>
                  </>
                )}
              </div>
            )}

            <label className="block text-sm">
              <span className="text-xs uppercase tracking-wider text-slate-500">Chart</span>
              <select
                value={source}
                disabled={playing}
                onChange={(e) => setSource(e.target.value)}
                className="select mt-1.5"
              >
                <option value="adaptive">Adaptive (generated for you)</option>
                {comps.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.title} · {c.bpm} BPM
                  </option>
                ))}
              </select>
            </label>
            <p className="mono text-xs text-slate-500">
              {rules.laneCount} lanes · {rules.bpm} BPM · {midiName(rules.root)} {SCALE_LABELS[rules.scale]}
            </p>
          </section>

          <section className="sketch space-y-4">
            <h2 className="h-title text-sm uppercase tracking-[0.15em]">Live stats</h2>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Hits" value={String(hud.hits)} />
              <Stat label="Misses" value={String(hud.misses)} />
              <Stat label="Combo" value={String(hud.maxCombo)} />
            </div>
            <Meter label="Accuracy" value={hud.accuracy} display={pct(hud.accuracy)} />
          </section>

          <section className="sketch space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="h-title text-sm uppercase tracking-[0.15em]">Player profile</h2>
              <span className="mono text-xs text-slate-500">{profile.sessions} runs</span>
            </div>
            <Meter label="Skill" value={profile.skill} display={pct(profile.skill)} />
            <Meter label="Accuracy" value={profile.accuracy} display={pct(profile.accuracy)} />
            <Meter label="Motion usage" value={profile.motionRatio} display={pct(profile.motionRatio)} />
            <p className="text-xs text-slate-500">
              Average timing offset {profile.meanOffsetMs.toFixed(0)} ms (negative = rushing)
            </p>
          </section>

          <section className="sketch space-y-3">
            <h2 className="h-title text-sm uppercase tracking-[0.15em]">Generated rule program</h2>
            <ul className="mono max-h-64 space-y-1.5 overflow-auto text-[11px] leading-relaxed">
              {rules.source.map((line, i) => (
                <li key={i} className="rounded-lg border-2 border-[color:var(--line)] bg-[color:var(--paper-2)] px-2 py-1">
                  {line}
                </li>
              ))}
            </ul>
          </section>

          {runs.length > 0 && (
            <section className="sketch space-y-3">
              <h2 className="h-title text-sm uppercase tracking-[0.15em]">Recent runs</h2>
              <ul className="mono space-y-1 text-sm">
                {runs.slice(0, 6).map((r) => (
                  <li key={r.id} className="row-hover flex justify-between gap-2">
                    <span className="capitalize">{r.mode}</span>
                    <span className="font-extrabold">{r.score.toLocaleString()}</span>
                    <span className="text-slate-500">{pct(r.accuracy)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { MusicEngine } from "@/engine/music/audio";
import { composePattern, progressionPattern } from "@/engine/music/composer";
import {
  PROGRESSIONS,
  ROOT_OPTIONS,
  SCALE_LABELS,
  chordAt,
  chordName,
  getProgression,
  midiName,
  scaleSize,
} from "@/engine/music/theory";
import type { NoteEvent, Pattern, PitchedInstrument, ScaleName } from "@/engine/types";
import { clamp } from "@/engine/util";
import { useMotion } from "@/hooks/useMotion";

const SCALES: ScaleName[] = ["major", "minor", "dorian", "pentatonic", "blues"];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

/** Chromatic keyboard from C4: computer key → semitone offset. */
const KEYS: { key: string; offset: number }[] = [
  { key: "a", offset: 0 },
  { key: "w", offset: 1 },
  { key: "s", offset: 2 },
  { key: "e", offset: 3 },
  { key: "d", offset: 4 },
  { key: "f", offset: 5 },
  { key: "t", offset: 6 },
  { key: "g", offset: 7 },
  { key: "y", offset: 8 },
  { key: "h", offset: 9 },
  { key: "u", offset: 10 },
  { key: "j", offset: 11 },
  { key: "k", offset: 12 },
];
const WHITE_OFFSETS = [0, 2, 4, 5, 7, 9, 11, 12];
const BLACK_OFFSETS = [1, 3, 6, 8, 10];

interface SavedComposition {
  id: number;
  title: string;
  bpm: number;
  instrument: string;
  events: NoteEvent[];
}

type Playing = "none" | "progression" | "composition";

export interface StudioClientProps {
  /** Set by the voice command "compose a melody" (/studio?compose=1). */
  autoCompose?: boolean;
  /** Set by the voice command "guitar" (/studio?instrument=guitar). */
  initialInstrument?: PitchedInstrument | null;
}

export default function StudioClient({ autoCompose = false, initialInstrument = null }: StudioClientProps) {
  const [audio] = useState(() => new MusicEngine());
  const composedOnce = useRef(false);

  const [instrument, setInstrument] = useState<PitchedInstrument>(initialInstrument ?? "piano");
  const [root, setRoot] = useState(57);
  const [scale, setScale] = useState<ScaleName>("minor");
  const [volume, setVolume] = useState(0.8);
  const [bpm, setBpm] = useState(96);
  const [octave, setOctave] = useState(0);
  const [pressed, setPressed] = useState<number | null>(null);
  const [lastDegree, setLastDegree] = useState(0);

  const [progId, setProgId] = useState("pop");
  const [playing, setPlaying] = useState<Playing>("none");
  const [beat, setBeat] = useState(-1);

  const [bars, setBars] = useState<4 | 8>(4);
  const [density, setDensity] = useState(0.7);
  const [swing, setSwing] = useState(0.1);
  const [drums, setDrums] = useState(true);
  const [seed, setSeed] = useState(1234);
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const [title, setTitle] = useState("My loop");

  const [comps, setComps] = useState<SavedComposition[]>([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [motionOn, setMotionOn] = useState(false);
  const [tiltView, setTiltView] = useState(0);
  const [accelView, setAccelView] = useState(0);

  const size = scaleSize(scale);
  const degrees = Array.from({ length: size }, (_, i) => i);
  const progression = getProgression(progId);

  const handleShake = useCallback(
    (strength: number) => {
      void audio.ensure().then(() => {
        audio.noteOn(instrument, chordAt(root, scale, lastDegree), {
          vel: 0.5 + 0.5 * strength,
          dur: 2,
          strum: 0.03,
        });
      });
    },
    [audio, instrument, root, scale, lastDegree],
  );

  const { reading, permission, request } = useMotion(motionOn, handleShake);

  const loadComps = useCallback(async () => {
    try {
      const res = await fetch("/api/compositions?limit=30", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { compositions: SavedComposition[] };
      setComps(data.compositions);
    } catch {
      setStatus("Could not load saved compositions");
    }
  }, []);

  useEffect(() => {
    void loadComps();
  }, [loadComps]);

  // Transport events drive the beat lamps and reset the play state on stop.
  useEffect(() => {
    return audio.on((e) => {
      if (e.type === "beat") setBeat(((e.beat % 4) + 4) % 4);
      if (e.type === "stop") {
        setBeat(-1);
        setPlaying("none");
      }
    });
  }, [audio]);

  useEffect(() => () => audio.stop(), [audio]);
  useEffect(() => audio.setVolume(volume), [audio, volume]);

  const playKey = useCallback(
    (offset: number) => {
      setPressed(offset);
      const midi = 60 + octave * 12 + offset;
      void audio.ensure().then(() => audio.noteOn(instrument, midi, { vel: 0.9, dur: 1.5 }));
    },
    [audio, instrument, octave],
  );

  // Computer keyboard: a–k play notes, z/x shift octave.
  useEffect(() => {
    const isField = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      return !!t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA");
    };
    const down = (e: KeyboardEvent) => {
      if (e.repeat || isField(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === "z") return setOctave((o) => clamp(o - 1, -2, 2));
      if (k === "x") return setOctave((o) => clamp(o + 1, -2, 2));
      const match = KEYS.find((m) => m.key === k);
      if (match) {
        e.preventDefault();
        playKey(match.offset);
      }
    };
    const up = () => setPressed(null);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [playKey]);

  // Motion: tilt drives the master filter, shake strums the last chord.
  useEffect(() => {
    if (!motionOn) return;
    const id = window.setInterval(() => {
      const r = reading.current;
      setTiltView(r.tilt);
      setAccelView(r.accel);
      audio.setExpression((r.tilt + 1) / 2);
    }, 90);
    return () => window.clearInterval(id);
  }, [motionOn, audio, reading]);

  const enableMotion = async () => {
    const ok = await request();
    setMotionOn(ok);
    if (!ok) audio.setExpression(1);
  };

  const disableMotion = () => {
    setMotionOn(false);
    audio.setExpression(1);
  };

  const playChord = (degree: number) => {
    setLastDegree(degree);
    void audio.ensure().then(() =>
      audio.noteOn(instrument, chordAt(root, scale, degree), { vel: 0.7, dur: 2, strum: 0.03 }),
    );
  };

  const playProgression = async () => {
    await audio.ensure();
    await audio.playPattern(
      progressionPattern({
        name: progression.name,
        root,
        scale,
        degrees: progression.degrees,
        bpm,
        instrument,
        bars: 4,
      }),
      true,
    );
    setPlaying("progression");
  };

  const compose = useCallback((): Pattern => {
    const s = Math.floor(Math.random() * 1_000_000_000);
    setSeed(s);
    const p = composePattern({
      name: `Loop ${s % 10000}`,
      seed: s,
      bpm,
      root,
      scale,
      bars,
      instrument,
      progression: progression.degrees,
      density,
      swing,
      drums,
    });
    setPattern(p);
    setStatus(null);
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm, root, scale, bars, instrument, progId, density, swing, drums]);

  const playComposed = async () => {
    const p = pattern ?? compose();
    await audio.ensure();
    await audio.playPattern(p, true);
    setPlaying("composition");
  };

  // A spoken "compose a melody" arrives as ?compose=1: write the score on load.
  // Playback still waits for a gesture, which the browser requires.
  useEffect(() => {
    if (!autoCompose || composedOnce.current) return;
    composedOnce.current = true;
    compose();
    setStatus("Composed from your voice command — press Play to hear it");
  }, [autoCompose, compose]);

  const playSaved = async (c: SavedComposition) => {
    const end = Math.max(...c.events.map((e) => e.beat + e.dur));
    await audio.ensure();
    await audio.playPattern(
      {
        name: c.title,
        bpm: c.bpm,
        lengthBeats: Math.max(4, Math.ceil(end / 4) * 4),
        events: c.events,
      },
      true,
    );
    setPlaying("composition");
  };

  const save = async () => {
    if (!pattern) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/compositions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, bpm: pattern.bpm, instrument, seed, events: pattern.events }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus("Saved to the library");
      await loadComps();
    } catch {
      setStatus("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const stop = () => {
    audio.stop();
    setPlaying("none");
  };

  const melodyPreview = pattern
    ? pattern.events
        .filter((e) => e.role === "melody")
        .slice(0, 16)
        .map((e) => midiName(e.midi[0]))
        .join("  ")
    : "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-5">
      <header className="mb-6">
        <span className="chip">Music engine</span>
        <h1 className="h-title mt-3 text-3xl sm:text-4xl">
          <span className="h-underline">Melody Studio</span>
        </h1>
        <p className="mt-3 max-w-2xl text-slate-500">
          Play a synthesized piano and guitar, loop chord progressions in any key and scale, and generate original
          melodies. Save a loop and the rhythm arena can chart it as a playable level.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="stagger space-y-5">
          <section className="sketch grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-500">Instrument</span>
              <div className="segmented mt-2 w-full">
                {(["piano", "guitar"] as const).map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setInstrument(i)}
                    className={`segmented-item btn btn-ghost flex-1 text-sm capitalize ${instrument === i ? "btn-ink" : ""}`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <label className="text-sm">
              <span className="text-xs uppercase tracking-wider text-slate-500">Key</span>
              <select value={root} onChange={(e) => setRoot(Number(e.target.value))} className="select mt-2">
                {ROOT_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {midiName(m).replace(/\d+$/, "")}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-xs uppercase tracking-wider text-slate-500">Scale</span>
              <select
                value={scale}
                onChange={(e) => setScale(e.target.value as ScaleName)}
                className="select mt-2"
              >
                {SCALES.map((s) => (
                  <option key={s} value={s}>
                    {SCALE_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3">
              <label className="text-sm">
                <span className="flex justify-between text-xs uppercase tracking-wider text-slate-500">
                  Volume <span className="mono font-bold">{Math.round(volume * 100)}</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="mt-2 w-full accent-[color:var(--accent)]"
                />
              </label>
              <label className="text-sm">
                <span className="flex justify-between text-xs uppercase tracking-wider text-slate-500">
                  Tempo <span className="mono font-bold">{bpm} BPM</span>
                </span>
                <input
                  type="range"
                  min={60}
                  max={180}
                  step={1}
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  className="mt-2 w-full accent-[color:var(--accent)]"
                />
              </label>
            </div>
          </section>

          <section className="sketch space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="h-title text-sm uppercase tracking-[0.15em]">Keyboard</h2>
              <p className="text-xs text-slate-500">
                Keys A–K play · Z / X shift octave ({octave >= 0 ? `+${octave}` : octave})
              </p>
            </div>
            <div className="relative h-44 select-none">
              <div className="flex h-full gap-1">
                {WHITE_OFFSETS.map((offset) => (
                  <button
                    key={offset}
                    type="button"
                    onPointerDown={() => playKey(offset)}
                    onPointerUp={() => setPressed(null)}
                    onPointerLeave={() => setPressed(null)}
                    className={`flex flex-1 flex-col items-center justify-end rounded-b-xl border-2 border-[color:var(--line)] pb-2 text-xs transition ${
                      pressed === offset ? "bg-[color:var(--accent-3)]" : "bg-white"
                    }`}
                  >
                    <span className="mono font-bold">{midiName(60 + octave * 12 + offset).replace(/\d+$/, "")}</span>
                    <span className="mono mt-1 text-[10px] uppercase opacity-60">
                      {KEYS.find((k) => k.offset === offset)?.key}
                    </span>
                  </button>
                ))}
              </div>
              {BLACK_OFFSETS.map((offset) => {
                const idx = WHITE_OFFSETS.indexOf(offset - 1);
                const left = ((idx + 0.66) / WHITE_OFFSETS.length) * 100;
                return (
                  <button
                    key={offset}
                    type="button"
                    onPointerDown={() => playKey(offset)}
                    onPointerUp={() => setPressed(null)}
                    onPointerLeave={() => setPressed(null)}
                    style={{ left: `${left}%`, width: `${(0.6 / WHITE_OFFSETS.length) * 100}%` }}
                    className={`mono absolute top-0 z-10 h-[60%] -translate-x-1/2 rounded-b-lg border-2 border-[color:var(--line)] text-[10px] ${
                      pressed === offset ? "bg-[color:var(--accent)] text-white" : "bg-[color:var(--ink)] text-white"
                    }`}
                  >
                    <span className="block pt-1">{KEYS.find((k) => k.offset === offset)?.key.toUpperCase()}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="sketch space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="h-title text-sm uppercase tracking-[0.15em]">Chord pads</h2>
              <div className="flex flex-wrap items-center gap-2">
                <select value={progId} onChange={(e) => setProgId(e.target.value)} className="select w-auto py-1.5 text-sm">
                  {PROGRESSIONS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {playing === "progression" ? (
                  <button type="button" onClick={stop} className="btn btn-primary text-sm">
                    Stop
                  </button>
                ) : (
                  <button type="button" onClick={() => void playProgression()} className="btn btn-ink text-sm">
                    Loop progression
                  </button>
                )}
              </div>
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(size, 7)}, minmax(0,1fr))` }}>
              {degrees.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => playChord(d)}
                  className={`card-hover sketch-sm text-center active:scale-95 ${
                    lastDegree === d ? "bg-[color:var(--accent-3)]" : ""
                  }`}
                >
                  <span className="block text-[11px] uppercase tracking-wider text-slate-500">
                    {ROMAN[d] ?? d + 1}
                  </span>
                  <span className="mt-1 block text-lg font-extrabold">{chordName(root, scale, d)}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="sketch space-y-4">
            <h2 className="h-title text-sm uppercase tracking-[0.15em]">Composer</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="text-sm">
                <span className="text-xs uppercase tracking-wider text-slate-500">Length</span>
                <select
                  value={bars}
                  onChange={(e) => setBars(Number(e.target.value) === 8 ? 8 : 4)}
                  className="select mt-2"
                >
                  <option value={4}>4 bars</option>
                  <option value={8}>8 bars</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="flex justify-between text-xs uppercase tracking-wider text-slate-500">
                  Density <span className="mono font-bold">{Math.round(density * 100)}%</span>
                </span>
                <input
                  type="range"
                  min={0.2}
                  max={1}
                  step={0.05}
                  value={density}
                  onChange={(e) => setDensity(Number(e.target.value))}
                  className="mt-2 w-full accent-[color:var(--accent)]"
                />
              </label>
              <label className="text-sm">
                <span className="flex justify-between text-xs uppercase tracking-wider text-slate-500">
                  Swing <span className="mono font-bold">{Math.round(swing * 100)}%</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={0.33}
                  step={0.01}
                  value={swing}
                  onChange={(e) => setSwing(Number(e.target.value))}
                  className="mt-2 w-full accent-[color:var(--accent)]"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={drums}
                  onChange={(e) => setDrums(e.target.checked)}
                  className="h-4 w-4 accent-[color:var(--accent)]"
                />
                Drums
              </label>
              <button type="button" onClick={() => compose()} className="btn text-sm">
                Generate
              </button>
              {playing === "composition" ? (
                <button type="button" onClick={stop} className="btn btn-primary text-sm">
                  Stop
                </button>
              ) : (
                <button type="button" onClick={() => void playComposed()} className="btn btn-ink text-sm">
                  {pattern ? "Play loop" : "Generate & play"}
                </button>
              )}
              <Link href="/arena" className="btn btn-ghost ml-auto text-sm">
                Chart in arena
              </Link>
              <div className="flex gap-1.5" aria-label="Beat indicator">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`h-3 w-3 rounded-full border-2 border-[color:var(--line)] transition ${
                      beat === i ? "scale-125 bg-[color:var(--accent)]" : "bg-[color:var(--paper-2)]"
                    }`}
                  />
                ))}
              </div>
            </div>

            {pattern && (
              <div className="result-panel space-y-3">
                <p className="mono text-xs leading-relaxed">
                  {pattern.events.length} events · {pattern.lengthBeats / 4} bars · seed {seed}
                </p>
                <p className="mono text-xs leading-relaxed break-words text-slate-500">{melodyPreview}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={80}
                    className="input min-w-0 flex-1 text-sm"
                    placeholder="Title"
                  />
                  <button type="button" onClick={() => void save()} disabled={saving} className="btn btn-primary text-sm">
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            )}
            {status && <p className="text-xs text-slate-500">{status}</p>}
          </section>
        </div>

        <aside className="stagger space-y-5">
          <section className="sketch space-y-4">
            <h2 className="h-title text-sm uppercase tracking-[0.15em]">Motion</h2>
            {permission === "unsupported" ? (
              <p className="text-sm text-slate-500">No motion sensors on this device. Use the keyboard.</p>
            ) : !motionOn ? (
              <button type="button" onClick={() => void enableMotion()} className="btn w-full text-sm">
                Enable motion
              </button>
            ) : (
              <button type="button" onClick={disableMotion} className="btn btn-ghost w-full text-sm">
                Disable motion
              </button>
            )}
            <div className="space-y-3">
              <Meter label="Tilt → filter" value={(tiltView + 1) / 2} display={tiltView.toFixed(2)} />
              <Meter label="Shake → strum" value={clamp(accelView / 30, 0, 1)} display={`${accelView.toFixed(1)} m/s²`} />
            </div>
            <p className="text-xs text-slate-500">
              Shake strums the last chord you selected. Motion is optional; every control also works with the mouse or
              keyboard.
            </p>
          </section>

          <section className="sketch space-y-3">
            <h2 className="h-title text-sm uppercase tracking-[0.15em]">Library</h2>
            {comps.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing saved yet. Generate a loop and save it.</p>
            ) : (
              <ul className="space-y-2">
                {comps.map((c) => (
                  <li key={c.id} className="sketch-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{c.title}</p>
                        <p className="mono text-xs text-slate-500">
                          {c.bpm} BPM · {c.instrument} · {c.events.length} events
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void playSaved(c)}
                        className="btn btn-ghost px-3 py-1.5 text-xs"
                      >
                        Play
                      </button>
                    </div>
                    <Link href={`/arena?comp=${c.id}`} className="mt-2 inline-block text-xs font-bold underline">
                      Chart in Arena →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
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
          className="h-full rounded-full bg-[color:var(--accent-2)] transition-[width] duration-100"
          style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
        />
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useRive,
  Layout,
  Fit,
  Alignment,
  StateMachineInputType,
  type StateMachineInput,
} from "@rive-app/react-canvas";

/**
 * Real-time reactive Rive scene.
 *
 * The character on the canvas is a Rive state machine. Three live signals are
 * wired straight into its inputs on every frame-worthy change:
 *
 *   • pointer position over the stage  → the "look" number input (0–100)
 *   • characters typed in the field    → focus boolean + look follows the caret,
 *                                         Enter fires the success trigger,
 *                                         a cleared field fires the fail trigger
 *   • device motion (shake intensity)  → number input scaled by the shake force,
 *                                         hands-up / bump triggers past a threshold
 *
 * Inputs are discovered at load time (`rive.stateMachineInputs`) and matched by
 * type and name, so any `.riv` with a number / boolean / trigger input works —
 * not just the bundled file. When the runtime cannot load (offline, blocked
 * WASM) a drawn fallback reacts to the same three signals so the section never
 * goes blank.
 */

type Signals = { x: number; y: number; typed: string; focused: boolean; shake: number };

type InputMap = {
  look?: StateMachineInput;
  numbers: StateMachineInput[];
  focus?: StateMachineInput;
  hands?: StateMachineInput;
  success?: StateMachineInput;
  fail?: StateMachineInput;
  bump?: StateMachineInput;
  all: StateMachineInput[];
};

const SHAKE_TRIGGER = 18; // m/s² of jerk — a deliberate shake, not a walk.
const DEFAULT_SRC = process.env.NEXT_PUBLIC_RIVE_SRC || "/vendor/rive/login-teddy.riv";

function classify(inputs: StateMachineInput[]): InputMap {
  const numbers = inputs.filter((i) => i.type === StateMachineInputType.Number);
  const bools = inputs.filter((i) => i.type === StateMachineInputType.Boolean);
  const triggers = inputs.filter((i) => i.type === StateMachineInputType.Trigger);
  const byName = <T extends StateMachineInput>(list: T[], re: RegExp) => list.find((i) => re.test(i.name));
  return {
    look: byName(numbers, /look|x|pos|hover|mouse|eye|track/i) ?? numbers[0],
    numbers,
    focus: byName(bools, /check|typ|focus|read|listen/i) ?? bools[0],
    hands: byName(bools, /hand|hide|cover|shake|scare|up/i) ?? bools[1],
    success: byName(triggers, /success|happy|yes|win|jump|bump/i) ?? triggers[0],
    fail: byName(triggers, /fail|sad|no|lose|error/i) ?? triggers[1],
    bump: byName(triggers, /bump|shake|hit|jump|knock/i) ?? triggers[0],
    all: inputs,
  };
}

function typeLabel(type: number) {
  if (type === StateMachineInputType.Number) return "number";
  if (type === StateMachineInputType.Boolean) return "boolean";
  return "trigger";
}

export interface RiveReactorProps {
  src?: string;
  stateMachine?: string;
  compact?: boolean;
  className?: string;
}

export function RiveReactor({ src = DEFAULT_SRC, stateMachine, compact = false, className = "" }: RiveReactorProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [signals, setSignals] = useState<Signals>({ x: 50, y: 50, typed: "", focused: false, shake: 0 });
  const [motion, setMotion] = useState<"idle" | "asking" | "on" | "denied" | "unsupported">("idle");
  const [lastEvent, setLastEvent] = useState<string>("Waiting for input…");
  const [inputNames, setInputNames] = useState<Array<{ name: string; type: string }>>([]);
  const mapRef = useRef<InputMap>({ numbers: [], all: [] });
  const stageRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const { rive, RiveComponent } = useRive({
    src,
    stateMachines: stateMachine,
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    onLoad: () => setLoaded(true),
    onLoadError: () => setFailed(true),
  });

  // Discover and classify the state-machine inputs once the file is parsed.
  useEffect(() => {
    if (!rive || !loaded) return;
    try {
      const machine = stateMachine ?? rive.stateMachineNames[0];
      if (!machine) { setFailed(true); return; }
      if (!stateMachine) rive.play(machine);
      const inputs = rive.stateMachineInputs(machine) ?? [];
      mapRef.current = classify(inputs);
      setInputNames(inputs.map((i) => ({ name: i.name, type: typeLabel(i.type) })));
      if (inputs.length === 0) setLastEvent("This file has no state-machine inputs; showing the idle animation.");
    } catch {
      setFailed(true);
    }
  }, [rive, loaded, stateMachine]);

  const setNumber = useCallback((input: StateMachineInput | undefined, value: number) => {
    if (!input) return;
    const v = Math.max(0, Math.min(100, value));
    if (Math.abs((input.value as number) - v) > 0.2) input.value = v;
  }, []);
  const setBool = useCallback((input: StateMachineInput | undefined, value: boolean) => {
    if (input && input.value !== value) input.value = value;
  }, []);
  const fire = useCallback((input: StateMachineInput | undefined) => { input?.fire(); }, []);

  // Pointer → look angle. Works for mouse, pen and touch.
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * 100;
    const y = ((event.clientY - box.top) / box.height) * 100;
    setSignals((s) => ({ ...s, x, y }));
    if (!signals.focused) setNumber(mapRef.current.look, x);
  };

  // Typing → focus boolean, look follows caret, Enter/clear fire triggers.
  const onTyped = (next: string) => {
    const previous = signals.typed;
    setSignals((s) => ({ ...s, typed: next }));
    const look = Math.min(100, 8 + next.length * 4.5);
    setNumber(mapRef.current.look, look);
    setBool(mapRef.current.focus, true);
    if (previous.length > 0 && next.length === 0) { fire(mapRef.current.fail); setLastEvent("Field cleared → fail trigger"); }
    else setLastEvent(`Typed “${next.slice(-1)}” → look ${look.toFixed(0)}`);
  };
  const onEnter = () => {
    fire(mapRef.current.success);
    setLastEvent("Enter → success trigger");
  };
  const onFocus = (focused: boolean) => {
    setSignals((s) => ({ ...s, focused }));
    setBool(mapRef.current.focus, focused);
  };

  // Device motion → shake intensity. iOS 13+ needs an explicit permission tap.
  const lastAccel = useRef<{ x: number; y: number; z: number; t: number } | null>(null);
  const shakeHold = useRef<number | null>(null);
  const onMotion = useCallback((event: DeviceMotionEvent) => {
    const a = event.accelerationIncludingGravity;
    if (!a || a.x === null || a.y === null || a.z === null) return;
    const now = performance.now();
    const prev = lastAccel.current;
    lastAccel.current = { x: a.x, y: a.y, z: a.z, t: now };
    if (!prev || now - prev.t < 40) return;
    const jerk = Math.hypot(a.x - prev.x, a.y - prev.y, a.z - prev.z);
    setSignals((s) => ({ ...s, shake: Math.round(s.shake * 0.6 + jerk * 0.4) }));
    const map = mapRef.current;
    setNumber(map.numbers[1] ?? map.look, (jerk / 30) * 100);
    if (jerk > SHAKE_TRIGGER) {
      setBool(map.hands, true);
      fire(map.bump);
      setLastEvent(`Shake ${jerk.toFixed(0)} m/s² → bump trigger`);
      if (shakeHold.current) window.clearTimeout(shakeHold.current);
      shakeHold.current = window.setTimeout(() => setBool(map.hands, false), 900);
    }
  }, [fire, setBool, setNumber]);

  const enableMotion = async () => {
    if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) { setMotion("unsupported"); return; }
    const ctor = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<"granted" | "denied"> };
    try {
      setMotion("asking");
      if (typeof ctor.requestPermission === "function") {
        const verdict = await ctor.requestPermission();
        if (verdict !== "granted") { setMotion("denied"); return; }
      }
      window.addEventListener("devicemotion", onMotion);
      setMotion("on");
    } catch {
      setMotion("denied");
    }
  };
  useEffect(() => () => { if (typeof window !== "undefined") window.removeEventListener("devicemotion", onMotion); }, [onMotion]);

  // Pointer idle → drift back to centre so the character is not stuck staring.
  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      if (!signals.focused) setNumber(mapRef.current.look, 50 + (signals.x - 50) * 0.9);
    }, 1800);
    return () => window.clearInterval(timer);
  }, [signals.focused, signals.x, setNumber, reduceMotion]);

  return (
    <div className={`rive-reactor ${compact ? "is-compact" : ""} ${className}`}>
      <div
        ref={stageRef}
        className="rive-stage"
        onPointerMove={onPointerMove}
        onPointerLeave={() => setLastEvent("Pointer left the stage")}
        aria-label="Interactive animated character that follows your pointer, reacts to typing and to shaking a phone"
        role="img"
      >
        {!failed ? <RiveComponent className="rive-canvas" /> : <FallbackCharacter signals={signals} />}
        {!loaded && !failed && <span className="rive-loading" aria-live="polite">Loading animation…</span>}
        <span className="rive-pointer" style={{ left: `${signals.x}%`, top: `${signals.y}%` }} aria-hidden />
      </div>

      <div className="rive-controls">
        <label className="block text-sm font-semibold text-slate-700">
          Type here — the character follows what you write
          <input
            className="input mono mt-1.5"
            value={signals.typed}
            onChange={(e) => onTyped(e.target.value)}
            onFocus={() => onFocus(true)}
            onBlur={() => onFocus(false)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onEnter(); } }}
            placeholder="e.g. 3*sin(pi/6) then press Enter"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className="btn !min-h-10" onClick={enableMotion} disabled={motion === "on" || motion === "asking"}>
            {motion === "on" ? "Motion sensing on — shake your phone" : motion === "asking" ? "Asking permission…" : motion === "denied" ? "Motion permission denied — tap to retry" : motion === "unsupported" ? "No motion sensor on this device" : "Enable shake detection"}
          </button>
          <span className="chip">pointer {signals.x.toFixed(0)}, {signals.y.toFixed(0)}</span>
          <span className="chip">typed {signals.typed.length}</span>
          <span className="chip" aria-live="polite">shake {signals.shake}</span>
        </div>
        <div className="rive-meter mt-3" aria-hidden>
          <span style={{ width: `${Math.min(100, (signals.shake / 30) * 100)}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-500" aria-live="polite">{lastEvent}</p>
        {!compact && inputNames.length > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            State-machine inputs wired: {inputNames.map((i) => `${i.name} (${i.type})`).join(", ")}.
          </p>
        )}
        {failed && <p className="mt-2 text-xs font-semibold text-slate-600">The Rive runtime could not load here; a drawn stand-in is reacting to the same signals.</p>}
      </div>
    </div>
  );
}

/** Lightweight SVG stand-in used only when the Rive runtime fails to load. */
function FallbackCharacter({ signals }: { signals: Signals }) {
  const dx = (signals.x - 50) / 50;
  const dy = (signals.y - 50) / 50;
  const mouth = Math.min(18, 4 + signals.typed.length);
  const wobble = Math.min(14, signals.shake / 2);
  return (
    <svg viewBox="0 0 200 160" className="rive-canvas" aria-hidden style={{ transform: `rotate(${wobble * (Math.random() > 0.5 ? 1 : -1) * 0.4}deg)` }}>
      <ellipse cx="100" cy="92" rx="62" ry="54" fill="var(--accent-3)" stroke="var(--line)" strokeWidth="3" />
      <g transform={`translate(${dx * 6} ${dy * 4})`}>
        <circle cx="76" cy="78" r="12" fill="#fff" stroke="var(--line)" strokeWidth="3" />
        <circle cx="124" cy="78" r="12" fill="#fff" stroke="var(--line)" strokeWidth="3" />
        <circle cx={76 + dx * 5} cy={78 + dy * 5} r="5" fill="#0b1020" />
        <circle cx={124 + dx * 5} cy={78 + dy * 5} r="5" fill="#0b1020" />
      </g>
      <path d={`M80 112 q20 ${mouth} 40 0`} fill="none" stroke="var(--line)" strokeWidth="3.5" strokeLinecap="round" />
      {signals.focused && <path d="M62 60 l14 6 M138 60 l-14 6" stroke="var(--line)" strokeWidth="3" strokeLinecap="round" />}
    </svg>
  );
}

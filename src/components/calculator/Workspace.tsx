"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ConfirmBar, ConfirmForm, LockedResult, useConfirmGate } from "@/components/Confirm";
import { ShareCopy, WakeLockToggle } from "@/components/tech/BrowserTools";
import { safeEvaluate } from "@/lib/math";

type Mode = "draw" | "type" | "erase";
type Point = { x: number; y: number };
type Stroke = { id: string; color: string; width: number; points: Point[] };
type Note = { id: string; x: number; y: number; text: string; color: string; size: number };

const STORAGE_KEY = "radixloom.calculator-board.v1";
const MAX_STROKES = 180;
const MAX_NOTES = 36;
const CHALK = [
  { id: "chalk", label: "Chalk", value: "#f6f1e4" },
  { id: "sun", label: "Sun", value: "#ffe08a" },
  { id: "mint", label: "Mint", value: "#9eecc0" },
  { id: "coral", label: "Coral", value: "#ffb4a0" },
  { id: "sky", label: "Sky", value: "#b8ccff" },
] as const;
const WIDTHS = [
  { id: "fine", label: "Fine", value: 2.4 },
  { id: "medium", label: "Medium", value: 5 },
  { id: "bold", label: "Bold", value: 9 },
  { id: "poster", label: "Poster", value: 16 },
] as const;
const NOTE_SIZES = [
  { id: "s", label: "S", value: 14 },
  { id: "m", label: "M", value: 18 },
  { id: "l", label: "L", value: 24 },
] as const;
const KEYS: Array<{ label: string; insert: string; wide?: boolean }> = [
  { label: "7", insert: "7" }, { label: "8", insert: "8" }, { label: "9", insert: "9" }, { label: "÷", insert: "/" },
  { label: "4", insert: "4" }, { label: "5", insert: "5" }, { label: "6", insert: "6" }, { label: "×", insert: "*" },
  { label: "1", insert: "1" }, { label: "2", insert: "2" }, { label: "3", insert: "3" }, { label: "−", insert: "-" },
  { label: "0", insert: "0" }, { label: ".", insert: "." }, { label: "(", insert: "(" }, { label: ")", insert: ")" },
  { label: "+", insert: "+", wide: true }, { label: "^", insert: "^" }, { label: "%", insert: "/100" },
];
const FUNCTIONS: Array<{ label: string; insert: string }> = [
  { label: "sin", insert: "sin(" }, { label: "cos", insert: "cos(" }, { label: "tan", insert: "tan(" },
  { label: "asin", insert: "asin(" }, { label: "acos", insert: "acos(" }, { label: "atan", insert: "atan(" },
  { label: "ln", insert: "log(" }, { label: "log", insert: "log10(" }, { label: "√", insert: "sqrt(" },
  { label: "abs", insert: "abs(" }, { label: "exp", insert: "exp(" }, { label: "n!", insert: "factorial(" },
  { label: "π", insert: "pi" }, { label: "e", insert: "e" }, { label: "round", insert: "round(" },
  { label: "floor", insert: "floor(" }, { label: "ceil", insert: "ceil(" }, { label: "hypot", insert: "hypot(" },
];

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadBoard(): { strokes: Stroke[]; notes: Note[] } {
  if (typeof window === "undefined") return { strokes: [], notes: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { strokes: [], notes: [] };
    const parsed = JSON.parse(raw) as { strokes?: Stroke[]; notes?: Note[] };
    return {
      strokes: Array.isArray(parsed.strokes) ? parsed.strokes.slice(0, MAX_STROKES) : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes.slice(0, MAX_NOTES) : [],
    };
  } catch {
    return { strokes: [], notes: [] };
  }
}

export function CalculatorWorkspace() {
  const [expression, setExpression] = useState("");
  const [mode, setMode] = useState<Mode>("draw");
  const [color, setColor] = useState<string>(CHALK[0].value);
  const [width, setWidth] = useState<number>(WIDTHS[1].value);
  const [noteSize, setNoteSize] = useState<number>(NOTE_SIZES[1].value);
  const [strokes, setStrokes] = useState<Stroke[]>(() => loadBoard().strokes);
  const [notes, setNotes] = useState<Note[]>(() => loadBoard().notes);
  const [ans, setAns] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef<Stroke | null>(null);
  const drag = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const evaluation = safeEvaluate(expression);
  const gate = useConfirmGate(expression, evaluation.ok);
  const state = !expression.trim() ? "needs-input" : !evaluation.ok ? "invalid" : gate.revealed ? "revealed" : "awaiting";

  const redraw = useCallback((preview?: Stroke | null) => {
    const canvas = canvasRef.current;
    const board = boardRef.current;
    if (!canvas || !board) return;
    const ratio = window.devicePixelRatio || 1;
    const widthPx = board.clientWidth;
    const heightPx = board.clientHeight;
    if (canvas.width !== Math.round(widthPx * ratio) || canvas.height !== Math.round(heightPx * ratio)) {
      canvas.width = Math.round(widthPx * ratio);
      canvas.height = Math.round(heightPx * ratio);
      canvas.style.width = `${widthPx}px`;
      canvas.style.height = `${heightPx}px`;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, widthPx, heightPx);
    const all = preview ? [...strokes, preview] : strokes;
    for (const stroke of all) {
      if (stroke.points.length < 2) continue;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = stroke.color;
      ctx.globalAlpha = 0.88;
      ctx.lineWidth = stroke.width;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x * widthPx, stroke.points[0].y * heightPx);
      for (let index = 1; index < stroke.points.length; index += 1) {
        ctx.lineTo(stroke.points[index].x * widthPx, stroke.points[index].y * heightPx);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }, [strokes]);

  useEffect(() => {
    redraw();
    const frame = () => redraw();
    window.addEventListener("resize", frame);
    return () => window.removeEventListener("resize", frame);
  }, [redraw]);

  useEffect(() => {
    const payload = JSON.stringify({ strokes, notes });
    const timer = window.setTimeout(() => {
      try { window.localStorage.setItem(STORAGE_KEY, payload); } catch { /* quota or private mode */ }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [notes, strokes]);

  const toBoardPoint = (event: ReactPointerEvent) => {
    const board = boardRef.current;
    if (!board) return { x: 0, y: 0 };
    const box = board.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)),
    };
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (mode === "type") {
      if (notes.length >= MAX_NOTES) return;
      const point = toBoardPoint(event);
      const id = newId();
      setNotes((current) => [...current, { id, x: point.x, y: point.y, text: "", color, size: noteSize }]);
      window.setTimeout(() => document.getElementById(`note-${id}`)?.focus(), 0);
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const stroke: Stroke = {
      id: newId(),
      color: mode === "erase" ? "#243044" : color,
      width: mode === "erase" ? Math.max(14, width * 2.2) : width,
      points: [toBoardPoint(event)],
    };
    live.current = stroke;
    redraw(stroke);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!live.current) return;
    live.current.points.push(toBoardPoint(event));
    redraw(live.current);
  };

  const onPointerUp = () => {
    const stroke = live.current;
    live.current = null;
    if (!stroke || stroke.points.length < 2) { redraw(); return; }
    setStrokes((current) => [...current, stroke].slice(-MAX_STROKES));
  };

  const insert = (token: string) => {
    const field = inputRef.current;
    const start = field?.selectionStart ?? expression.length;
    const end = field?.selectionEnd ?? start;
    const next = `${expression.slice(0, start)}${token}${expression.slice(end)}`;
    setExpression(next);
    gate.reset();
    requestAnimationFrame(() => {
      field?.focus();
      const caret = start + token.length;
      field?.setSelectionRange(caret, caret);
    });
  };

  const pinResult = (text: string) => {
    setNotes((current) => {
      const nextY = 0.08 + (current.length % 8) * 0.1;
      const nextX = 0.08 + Math.floor(current.length / 8) * 0.28;
      return [...current, { id: newId(), x: Math.min(0.62, nextX), y: Math.min(0.78, nextY), text, color, size: noteSize }].slice(-MAX_NOTES);
    });
  };

  const calculate = () => {
    if (!evaluation.ok) return;
    gate.confirm();
    setAns(evaluation.formatted);
    pinResult(`${expression} = ${evaluation.formatted}`);
  };

  const startNoteDrag = (event: ReactPointerEvent<HTMLButtonElement>, note: Note) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const board = boardRef.current;
    if (!board) return;
    const box = board.getBoundingClientRect();
    drag.current = { id: note.id, dx: event.clientX - box.left - note.x * box.width, dy: event.clientY - box.top - note.y * box.height };
  };

  const moveNote = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag.current || !boardRef.current) return;
    const box = boardRef.current.getBoundingClientRect();
    const x = Math.min(0.82, Math.max(0.02, (event.clientX - box.left - drag.current.dx) / box.width));
    const y = Math.min(0.86, Math.max(0.02, (event.clientY - box.top - drag.current.dy) / box.height));
    const id = drag.current.id;
    setNotes((current) => current.map((note) => note.id === id ? { ...note, x, y } : note));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-5 sm:py-12">
      <h1 className="h-title text-4xl sm:text-5xl">Calculator <span className="h-underline">blackboard</span></h1>
      <p className="mt-3 max-w-3xl text-slate-600">
        A blank board for thinking through a calculation — jot the principle, sketch a diagram, then press
        <strong> Calculate</strong>. It is a notebook, not a replica of a plastic keypad. Check important results independently.
      </p>

      <div className="sketch mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
        <WakeLockToggle />
        <ShareCopy title="Calculator" text={expression ? `Expression: ${expression}` : "Calculator blackboard"} href="/tools/calculator" />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2" role="toolbar" aria-label="Board tools">
            {(["draw", "type", "erase"] as const).map((item) => (
              <button key={item} type="button" className={`chip !min-h-9 !px-3 ${mode === item ? "!bg-[color:var(--accent-3)]" : ""}`} aria-pressed={mode === item} onClick={() => setMode(item)}>
                {item === "draw" ? "Chalk" : item === "type" ? "Type" : "Erase"}
              </button>
            ))}
            <span className="sr-only">Chalk colour</span>
            {CHALK.map((item) => (
              <button key={item.id} type="button" className={`chalk-swatch ${color === item.value ? "is-active" : ""}`} style={{ background: item.value }} aria-label={item.label} aria-pressed={color === item.value} onClick={() => setColor(item.value)} />
            ))}
            {WIDTHS.map((item) => (
              <button key={item.id} type="button" className={`chip !min-h-9 ${width === item.value ? "!bg-[color:var(--accent-3)]" : ""}`} aria-pressed={width === item.value} onClick={() => setWidth(item.value)}>{item.label}</button>
            ))}
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Type size</span>
            {NOTE_SIZES.map((item) => (
              <button key={item.id} type="button" className={`chip !min-h-9 ${noteSize === item.value ? "!bg-[color:var(--accent-3)]" : ""}`} aria-pressed={noteSize === item.value} onClick={() => setNoteSize(item.value)}>{item.label}</button>
            ))}
            <button type="button" className="btn btn-ghost !min-h-10" onClick={() => setStrokes((current) => current.slice(0, -1))} disabled={strokes.length === 0}>Undo stroke</button>
            <button type="button" className="btn btn-ghost !min-h-10" onClick={() => { setStrokes([]); setNotes([]); }}>Clear board</button>
          </div>

          <div ref={boardRef} className="board" data-mode={mode} data-tone="dark">
            <canvas
              ref={canvasRef}
              className="board-canvas"
              aria-label="Chalk drawing surface"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
            {notes.map((note) => (
              <div key={note.id} className="board-note" style={{ left: `${note.x * 100}%`, top: `${note.y * 100}%`, color: note.color, fontSize: note.size }}>
                <textarea
                  id={`note-${note.id}`}
                  value={note.text}
                  aria-label="Board note"
                  placeholder="Write the idea…"
                  className="block h-full min-h-12 w-full resize-none bg-transparent text-inherit outline-none placeholder:text-[rgba(246,241,228,.45)]"
                  onChange={(event) => setNotes((current) => current.map((item) => item.id === note.id ? { ...item, text: event.target.value } : item))}
                />
                <button type="button" className="board-note-handle" aria-label="Move note" onPointerDown={(event) => startNoteDrag(event, note)} onPointerMove={moveNote} onPointerUp={() => { drag.current = null; }}>Move</button>
                <button type="button" className="absolute right-1 top-1 text-xs font-bold" aria-label="Remove note" onClick={() => setNotes((current) => current.filter((item) => item.id !== note.id))}>✕</button>
              </div>
            ))}
            {notes.length === 0 && strokes.length === 0 && (
              <p className="pointer-events-none absolute inset-x-8 top-8 text-sm font-semibold text-[rgba(246,241,228,.55)]">
                Sketch the setup. Type a principle. Then calculate.
              </p>
            )}
          </div>
        </div>

        <aside className="sketch">
          <ConfirmForm onSubmit={calculate} label="Calculator expression">
            <label htmlFor="board-expression" className="mb-1.5 block text-sm font-semibold text-slate-700">Expression</label>
            <input
              ref={inputRef}
              id="board-expression"
              className="input mono !text-base"
              value={expression}
              onChange={(event) => { setExpression(event.target.value); gate.reset(); }}
              placeholder="e.g. 2*pi*r"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
            <div id="board-result" role="status" aria-live="polite" className={`result-panel mt-4 ${gate.revealed ? "is-revealed" : "is-locked"}`}>
              <div className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Result</div>
              {gate.revealed
                ? evaluation.ok
                  ? <div className="mono mt-2 break-all text-2xl font-extrabold">= {evaluation.formatted}</div>
                  : <div className="mt-2 font-semibold text-rose-600">{evaluation.error}</div>
                : <div className="mt-2"><LockedResult label="Result hidden until you press Calculate." /></div>}
            </div>
            <ConfirmBar
              id="board-confirm"
              action="Calculate"
              state={state}
              onConfirm={calculate}
              onReset={gate.reset}
              hint="Write an expression, then press Calculate."
              errorText={evaluation.ok ? "" : evaluation.error}
              shownText="Pinned to the board."
            />
          </ConfirmForm>

          <div className="mt-5 grid grid-cols-4 gap-1.5" aria-label="Digits and operators">
            {KEYS.map((key) => (
              <button key={key.label} type="button" className={`board-key ${key.wide ? "is-wide" : ""}`} onClick={() => insert(key.insert)}>{key.label}</button>
            ))}
            <button type="button" className="board-key" onClick={() => setExpression((current) => current.slice(0, -1))} aria-label="Backspace">⌫</button>
            <button type="button" className="board-key" onClick={() => { setExpression(""); gate.reset(); }}>C</button>
            <button type="button" className="board-key" disabled={!ans} onClick={() => insert(ans ?? "")}>Ans</button>
          </div>

          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">Functions</p>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {FUNCTIONS.map((item) => (
              <button key={item.label} type="button" className="board-key" onClick={() => insert(item.insert)}>{item.label}</button>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Chalk, typed notes and the last expression stay in this browser until you clear the board. Nothing is uploaded.
          </p>
        </aside>
      </div>
    </div>
  );
}

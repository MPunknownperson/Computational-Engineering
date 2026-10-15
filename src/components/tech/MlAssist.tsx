"use client";

import { useEffect, useState } from "react";
import { applySuggestion, suggestExpression, type ExprSuggestion } from "@/lib/ml/completion";
import { guessTopic, suggestWords, type TopicGuess } from "@/lib/ml/contact";
import { predictUse, type PreferencePick, type PreferenceTool } from "@/lib/ml/preferences";

/**
 * Small, in-place helpers backed by on-device TensorFlow.js models. They sit
 * directly under the inputs they assist; they never add a page or section.
 * Models load only after the visitor focuses the input (or enough text is
 * typed), so pages stay light until the help is actually useful.
 */

/** True once the element with this id has been focused (or is focused now). */
function useArmedOnFocus(id: string): boolean {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const element = document.getElementById(id);
    if (!element) return;
    if (document.activeElement === element) { setArmed(true); return; }
    const arm = () => setArmed(true);
    element.addEventListener("focus", arm, { once: true });
    return () => element.removeEventListener("focus", arm);
  }, [id]);
  return armed;
}

const chip = "btn !min-h-9 !px-3 !text-xs";

export function ExpressionAssist({ inputId, expression, variables = [], onApply }: {
  inputId: string;
  expression: string;
  variables?: string[];
  onApply: (next: string) => void;
}) {
  const armed = useArmedOnFocus(inputId);
  const [items, setItems] = useState<ExprSuggestion[]>([]);
  const names = variables.join(",");

  useEffect(() => {
    if (!armed) return;
    let live = true;
    const timer = setTimeout(() => {
      void suggestExpression(expression, names ? names.split(",") : []).then((next) => { if (live) setItems(next); }).catch(() => undefined);
    }, 180);
    return () => { live = false; clearTimeout(timer); };
  }, [armed, expression, names]);

  if (items.length === 0) return null;
  return (
    <div role="group" aria-label="Predicted input, suggested on this device" className="mt-2 flex flex-wrap items-center gap-2" data-ml="expression-assist">
      <span className="text-xs font-semibold text-slate-500">Suggested</span>
      {items.map((item) => (
        <button
          key={`${item.kind}-${item.insert}`}
          type="button"
          className={`${chip} mono`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => { onApply(applySuggestion(expression, item)); document.getElementById(inputId)?.focus(); }}
          aria-label={item.kind === "complete" ? `Complete the expression: ${item.label}` : `Insert ${item.label}`}
          title={item.kind === "complete" ? "Complete the expression" : "Insert"}
        >
          {item.kind === "complete" ? <>… {item.label}</> : item.label}
        </button>
      ))}
    </div>
  );
}

export function WordAssist({ inputId, text, onApply }: { inputId: string; text: string; onApply: (next: string) => void }) {
  const armed = useArmedOnFocus(inputId);
  const [words, setWords] = useState<string[]>([]);

  useEffect(() => {
    if (!armed) return;
    let live = true;
    const timer = setTimeout(() => {
      void suggestWords(text).then((next) => { if (live) setWords(next); }).catch(() => undefined);
    }, 200);
    return () => { live = false; clearTimeout(timer); };
  }, [armed, text]);

  if (words.length === 0) return null;
  const apply = (word: string) => {
    const endsWithSpace = /\s$/.test(text) || text.length === 0;
    onApply(`${endsWithSpace ? text : text.replace(/\p{L}+$/u, "")}${word} `);
    document.getElementById(inputId)?.focus();
  };
  return (
    <div role="group" aria-label="Next-word suggestions, predicted on this device" className="mt-2 flex flex-wrap items-center gap-2" data-ml="word-assist">
      <span className="text-xs font-semibold text-slate-500">Next word</span>
      {words.map((word) => (
        <button key={word} type="button" className={chip} onMouseDown={(event) => event.preventDefault()} onClick={() => apply(word)}>{word}</button>
      ))}
    </div>
  );
}

export function TopicHint({ message, current, onUse }: { message: string; current: string; onUse: (value: string) => void }) {
  const [guess, setGuess] = useState<TopicGuess | null>(null);
  const long = message.trim().length >= 18;

  useEffect(() => {
    if (!long) { setGuess(null); return; }
    let live = true;
    const timer = setTimeout(() => {
      void guessTopic(message).then((next) => { if (live) setGuess(next); }).catch(() => undefined);
    }, 700);
    return () => { live = false; clearTimeout(timer); };
  }, [long, message]);

  if (!guess || guess.value === current) return null;
  return (
    <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600" role="status" data-ml="topic-hint">
      <span>This looks like &ldquo;{guess.label}&rdquo;.</span>
      <button type="button" className={chip} onClick={() => onUse(guess.value)}>Use this topic</button>
    </p>
  );
}

/** Habit-based predictions for a tool; `null` while loading, `[]` when unsure. */
export function usePersonalPicks(tool: PreferenceTool): PreferencePick[] | null {
  const [picks, setPicks] = useState<PreferencePick[] | null>(null);
  useEffect(() => {
    let live = true;
    void predictUse(tool).then((next) => { if (live) setPicks(next); }).catch(() => { if (live) setPicks([]); });
    return () => { live = false; };
  }, [tool]);
  return picks;
}

export function PersonalPicks({ picks, format, onPick }: {
  picks: PreferencePick[];
  format: (label: string) => string;
  onPick: (label: string) => void;
}) {
  if (picks.length === 0) return null;
  return (
    <div role="group" aria-label="Your usual choices, learned on this device" className="mt-4 flex flex-wrap items-center gap-2" data-ml="personal-picks">
      <span className="text-xs font-semibold text-slate-500">Your usual</span>
      {picks.map((pick) => (
        <button key={pick.label} type="button" className={chip} onClick={() => onPick(pick.label)}>{format(pick.label)}</button>
      ))}
    </div>
  );
}

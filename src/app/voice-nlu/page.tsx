"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * NLU diagnostics console.
 *
 * Shows, for any utterance, the intent that was chosen, the entities that were
 * extracted, the confidence, the dispatch validation verdict and the action
 * taken — plus the stored interaction log and a one-click replay of the
 * regression suite.
 */

type TraceStep = { stage: string; pack: string; outcome: string; detail?: string; score?: number };

type Summary = {
  decision: string;
  domain: string | null;
  opcode: string | null;
  confidence: number;
  actionLabel: string | null;
  actionHref: string | null;
  result: string | null;
  blockedCode: string | null;
  blockedReason: string | null;
  entities: Array<{ type: string; value: string }>;
  slots: Record<string, string | number>;
  trace: TraceStep[];
  latencyMs: number;
  normalisedText: string;
};

type LogRow = {
  id: number;
  rawText: string;
  decision: string;
  domain: string | null;
  confidence: number;
  actionLabel: string | null;
  result: string | null;
  blockedCode: string | null;
  latencyMs: number;
  createdAt: string;
};

type ReplayResult = {
  ok: boolean;
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: Array<{
    id: string;
    utterance: string;
    expected: string;
    actual: string;
    result?: string;
    confidence: number;
    pass: boolean;
    problem?: string;
    note: string;
  }>;
};

const EXAMPLES = [
  "solve 3x + 5 = 20",
  "solve three x plus five equals twenty",
  "solve the linear equation 2x - 8 = 0",
  "what is 12 times 7",
  "convert 120 dollars to euros",
  "100 km to miles",
  "eighty",
];

const DOMAIN_COLOUR: Record<string, string> = {
  math: "#2f6f4f",
  currency: "#8a5a1b",
  units: "#1f5f7a",
  market: "#6a3d7a",
  navigation: "#4a4a4a",
};

export default function VoiceNluPage() {
  const [text, setText] = useState("solve 3x + 5 = 20");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [replay, setReplay] = useState<ReplayResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    const response = await fetch("/api/nlu/logs");
    if (response.ok) {
      const data = (await response.json()) as { interactions: LogRow[] };
      setLogs(data.interactions ?? []);
    }
  }, []);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const interpret = useCallback(
    async (value: string) => {
      if (!value.trim()) return;
      setBusy(true);
      setError(null);
      try {
        const response = await fetch("/api/nlu/interpret", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: value, sessionId: "diagnostics" }),
        });
        const data = await response.json();
        if (!response.ok) setError(data.error ?? "interpretation failed");
        else setSummary(data.summary as Summary);
        await loadLogs();
      } catch (cause) {
        setError(String(cause));
      } finally {
        setBusy(false);
      }
    },
    [loadLogs],
  );

  const runReplay = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/nlu/replay", { method: "POST" });
      setReplay((await response.json()) as ReplayResult);
      await loadLogs();
    } finally {
      setBusy(false);
    }
  }, [loadLogs]);

  /** Speech input uses the browser's own recogniser; the text is then sent. */
  const listen = useCallback(() => {
    type RecognitionCtor = new () => {
      lang: string;
      interimResults: boolean;
      continuous: boolean;
      start: () => void;
      stop: () => void;
      onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
    };
    const holder = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
    const Ctor = holder.SpeechRecognition ?? holder.webkitSpeechRecognition;
    if (!Ctor) {
      setError("This browser does not expose the Web Speech API. Type the sentence instead.");
      return;
    }
    const recognition = new Ctor();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) {
        setText(transcript);
        void interpret(transcript);
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  }, [interpret]);

  return (
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: "2rem 1.25rem 4rem", lineHeight: 1.55 }}>
      <h1 style={{ fontSize: "1.9rem", margin: "0 0 .4rem" }}>NLU diagnostics</h1>
      <p style={{ margin: "0 0 1.5rem", opacity: 0.8, maxWidth: "70ch" }}>
        Everything after speech-to-text: intent classification, entity extraction, dispatch
        validation, context typing and confidence. Mathematical input is recognised before any
        conversion reading is attempted, and a conversion cannot run without currency or unit
        evidence in the sentence.
      </p>

      <section style={card}>
        <label htmlFor="utterance" style={labelStyle}>Recognised text</label>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <input
            id="utterance"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") void interpret(text); }}
            style={{ flex: "1 1 320px", padding: ".65rem .8rem", font: "inherit", borderRadius: 8, border: "1px solid #bbb" }}
          />
          <button type="button" onClick={() => void interpret(text)} disabled={busy} style={primaryButton}>
            {busy ? "Working…" : "Interpret"}
          </button>
          <button type="button" onClick={listen} disabled={listening} style={button}>
            {listening ? "Listening…" : "🎤 Speak"}
          </button>
          <button type="button" onClick={() => void runReplay()} disabled={busy} style={button}>
            Run regression suite
          </button>
        </div>
        <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap", marginTop: ".75rem" }}>
          {EXAMPLES.map((example) => (
            <button key={example} type="button" onClick={() => { setText(example); void interpret(example); }} style={chip}>
              {example}
            </button>
          ))}
        </div>
        {error && <p style={{ color: "#a11", marginTop: ".75rem" }}>{error}</p>}
      </section>

      {summary && (
        <section style={card}>
          <h2 style={heading}>Decision</h2>
          <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginBottom: ".9rem" }}>
            <Tag label="decision" value={summary.decision} colour={summary.decision === "action" ? "#2f6f4f" : summary.decision === "clarify" ? "#8a5a1b" : "#a11" } />
            <Tag label="domain" value={summary.domain ?? "—"} colour={DOMAIN_COLOUR[summary.domain ?? ""] ?? "#555"} />
            <Tag label="opcode" value={summary.opcode ?? "—"} colour="#444" />
            <Tag label="confidence" value={summary.confidence.toFixed(3)} colour="#444" />
            <Tag label="latency" value={`${summary.latencyMs} ms`} colour="#444" />
          </div>
          {summary.result && (
            <p style={{ fontSize: "1.25rem", margin: "0 0 .6rem" }}>
              <strong>Answer:</strong> <code>{summary.result}</code>
            </p>
          )}
          {summary.actionLabel && <p style={{ margin: "0 0 .4rem" }}>{summary.actionLabel}</p>}
          {summary.actionHref && (
            <p style={{ margin: "0 0 .6rem" }}>
              <a href={summary.actionHref}>{summary.actionHref}</a>
            </p>
          )}
          {summary.blockedReason && (
            <p style={{ margin: "0 0 .6rem", color: "#8a5a1b" }}>
              <strong>{summary.blockedCode}:</strong> {summary.blockedReason}
            </p>
          )}

          <h3 style={subheading}>Entities</h3>
          {summary.entities.length === 0 ? (
            <p style={{ opacity: 0.7, margin: 0 }}>No typed entities extracted.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
              {summary.entities.map((entity, index) => (
                <li key={`${entity.type}-${index}`}>
                  <code>{entity.type}</code> = <code>{entity.value}</code>
                </li>
              ))}
            </ul>
          )}

          <h3 style={subheading}>Pipeline trace</h3>
          <ol style={{ margin: 0, paddingLeft: "1.2rem" }}>
            {summary.trace.map((step, index) => (
              <li key={index} style={{ marginBottom: ".2rem" }}>
                <code>{step.stage}</code> · {step.pack} · <strong>{step.outcome}</strong>
                {typeof step.score === "number" ? ` (${step.score})` : ""}
                {step.detail ? ` — ${step.detail}` : ""}
              </li>
            ))}
          </ol>
        </section>
      )}

      {replay && (
        <section style={card}>
          <h2 style={heading}>
            Regression replay — {replay.passed}/{replay.total} passed{" "}
            <span style={{ color: replay.failed ? "#a11" : "#2f6f4f" }}>({replay.failed} failed)</span>
          </h2>
          <table style={table}>
            <thead>
              <tr><th style={th}>Case</th><th style={th}>Expected</th><th style={th}>Actual</th><th style={th}>Result</th><th style={th}>Status</th></tr>
            </thead>
            <tbody>
              {replay.results.map((row) => (
                <tr key={row.id}>
                  <td style={td} title={row.note}><code>{row.id}</code><br /><span style={{ opacity: .7, fontSize: ".85em" }}>{row.utterance}</span></td>
                  <td style={td}>{row.expected}</td>
                  <td style={td}>{row.actual}</td>
                  <td style={td}><code>{row.result}</code></td>
                  <td style={{ ...td, color: row.pass ? "#2f6f4f" : "#a11" }}>
                    {row.pass ? "pass" : `fail — ${row.problem}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section style={card}>
        <h2 style={heading}>Interaction log ({logs.length})</h2>
        <p style={{ opacity: .75, marginTop: 0 }}>
          Raw text, intent, confidence, action and block reason are recorded for every turn, which is
          what makes tuning and replay testing possible.
        </p>
        <table style={table}>
          <thead>
            <tr><th style={th}>Text</th><th style={th}>Decision</th><th style={th}>Domain</th><th style={th}>Conf.</th><th style={th}>Outcome</th><th style={th}>ms</th></tr>
          </thead>
          <tbody>
            {logs.map((row) => (
              <tr key={row.id}>
                <td style={td}><code>{row.rawText}</code></td>
                <td style={td}>{row.decision}</td>
                <td style={td}>{row.domain ?? "—"}</td>
                <td style={td}>{row.confidence.toFixed(2)}</td>
                <td style={td}>{row.result ?? row.actionLabel ?? row.blockedCode ?? "—"}</td>
                <td style={td}>{row.latencyMs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function Tag({ label, value, colour }: { label: string; value: string; colour: string }) {
  return (
    <span style={{ border: `1px solid ${colour}`, color: colour, borderRadius: 999, padding: ".15rem .6rem", fontSize: ".82rem" }}>
      {label}: <strong>{value}</strong>
    </span>
  );
}

const card: React.CSSProperties = {
  border: "1px solid rgba(128,128,128,.35)",
  borderRadius: 12,
  padding: "1.1rem 1.2rem",
  marginBottom: "1.25rem",
};
const heading: React.CSSProperties = { fontSize: "1.15rem", margin: "0 0 .7rem" };
const subheading: React.CSSProperties = { fontSize: ".95rem", margin: "1rem 0 .4rem" };
const labelStyle: React.CSSProperties = { display: "block", marginBottom: ".4rem", fontWeight: 600 };
const button: React.CSSProperties = {
  padding: ".65rem 1rem", font: "inherit", borderRadius: 8,
  border: "1px solid rgba(128,128,128,.5)", background: "transparent", cursor: "pointer",
};
const primaryButton: React.CSSProperties = { ...button, background: "#2f6f4f", color: "#fff", borderColor: "#2f6f4f" };
const chip: React.CSSProperties = {
  padding: ".3rem .6rem", font: "inherit", fontSize: ".85rem", borderRadius: 999,
  border: "1px solid rgba(128,128,128,.45)", background: "transparent", cursor: "pointer",
};
const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: ".88rem" };
const th: React.CSSProperties = { textAlign: "left", borderBottom: "2px solid rgba(128,128,128,.4)", padding: ".4rem .3rem" };
const td: React.CSSProperties = { borderBottom: "1px solid rgba(128,128,128,.22)", padding: ".4rem .3rem", verticalAlign: "top" };

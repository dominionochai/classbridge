"use client";

import { useState } from "react";

type CopilotData = { [key: string]: any };
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SAMPLE_CHUNKS = [
  "Today we are looking at photosynthesis.",
  "Plants use light energy to make chemical energy.",
  "Remember to connect the chloroplast to that process.",
];
const SUGGESTED_QUESTIONS = ["What is the main idea?", "Explain the key term simply", "What should I remember?"];

async function post(path: string, body: CopilotData): Promise<CopilotData> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) throw new Error(data.error || "Lecture Copilot request failed");
  return data;
}

export default function LectureCopilotPage() {
  const [draft, setDraft] = useState("");
  const [transcript, setTranscript] = useState("");
  const [caption, setCaption] = useState("Waiting for the next idea…");
  const [notes, setNotes] = useState<CopilotData>({ key_points: [], terms: [], action_items: [] });
  const [question, setQuestion] = useState("");
  const [explanation, setExplanation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sendChunk(value: string) {
    const text = value.trim();
    if (!text) return;
    setBusy(true);
    setError("");
    try {
      const ingested = await post("/api/lecture/ingest", { text_chunk: text, timestamp: new Date().toISOString() });
      const nextTranscript = ingested.data.transcript as string;
      const [captionResult, notesResult] = await Promise.all([
        post("/api/lecture/caption", { transcript: nextTranscript }),
        post("/api/lecture/notes", { transcript: nextTranscript }),
      ]);
      setTranscript(nextTranscript);
      setCaption(captionResult.data.caption);
      setNotes(notesResult.data);
      setDraft("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not reach the local API");
    } finally {
      setBusy(false);
    }
  }

  async function explain(value = question) {
    if (!value.trim() || !transcript) return;
    setBusy(true);
    setError("");
    try {
      const result = await post("/api/lecture/explain", { question: value, lecture_context: transcript });
      setQuestion(value);
      setExplanation(result.data.answer);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not explain that yet");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={styles.shell}>
      <header style={styles.header}>
        <div><div style={styles.brand}><b>C</b> CLASS<span>BRIDGE</span></div><small>LECTURE COPILOT / DEMO</small></div>
        <a href="/" style={styles.back}>← Neuro view</a>
      </header>
      <section style={styles.intro}>
        <div><small style={styles.label}>ACCESSIBLE LECTURE SUPPORT</small><h1>Keep the thread.<br /><em>One clear idea at a time.</em></h1><p style={styles.muted}>Type what the teacher says, or send simulated chunks. Captions, notes, and simple explanations update together.</p></div>
        <div style={styles.status}><i /> LOCAL DEMO<br /><strong>HEURISTIC FALLBACK READY</strong></div>
      </section>
      <section style={styles.grid}>
        <article style={styles.panel}>
          <div style={styles.heading}><div><small style={styles.label}>01 / TEACHER INPUT</small><h2>Speak or simulate</h2></div><span style={styles.pill}>TEXT CHUNKS</span></div>
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="The teacher is explaining…" style={styles.textarea} aria-label="Teacher speaking text" />
          <div style={styles.row}><button onClick={() => void sendChunk(draft)} disabled={busy || !draft.trim()} style={styles.primary}>Send chunk ↗</button><button onClick={() => void sendChunk(SAMPLE_CHUNKS[Math.min(notes.key_points.length, SAMPLE_CHUNKS.length - 1)])} disabled={busy} style={styles.secondary}>Simulate next</button></div>
          <div style={styles.sample}><small style={styles.label}>TRY A SAMPLE</small><p>{SAMPLE_CHUNKS[0]} {SAMPLE_CHUNKS[1]}</p></div>
        </article>
        <article style={styles.panel}>
          <div style={styles.heading}><div><small style={styles.label}>02 / LIVE OUTPUT</small><h2>Smart captions</h2></div><span style={styles.live}><i /> LIVE</span></div>
          <div style={styles.caption}><strong>{caption}</strong><small>Fillers removed · short, engaging sentences</small></div>
          <small style={styles.label}>ACCUMULATED TRANSCRIPT</small><p style={styles.transcript}>{transcript || "Your transcript will appear here."}</p>
        </article>
        <article style={styles.panel}>
          <div style={styles.heading}><div><small style={styles.label}>03 / AUTO-NOTES</small><h2>Study trail</h2></div></div>
          <NoteList title="KEY POINTS" items={notes.key_points} empty="Send a chunk to build key points." />
          <NoteList title="TERMS" items={notes.terms} empty="Important terms will surface here." />
          <NoteList title="ACTION ITEMS" items={notes.action_items} empty="No action items yet." />
        </article>
        <article style={styles.panel}>
          <div style={styles.heading}><div><small style={styles.label}>04 / ASK THE LECTURE</small><h2>Explain a concept</h2></div></div>
          <div style={styles.questions}>{SUGGESTED_QUESTIONS.map((item) => <button key={item} onClick={() => void explain(item)} disabled={!transcript || busy} style={styles.question}>{item} <span>↗</span></button>)}</div>
          <div style={styles.row}><input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void explain(); }} placeholder="Ask your own question" style={styles.input} /><button onClick={() => void explain()} disabled={!question.trim() || !transcript || busy} style={styles.primary}>Ask</button></div>
          {explanation && <div style={styles.answer}><small style={styles.label}>PLAIN-LANGUAGE ANSWER</small><p>{explanation}</p></div>}
        </article>
      </section>
      {error && <p style={styles.error}>{error}</p>}
      <footer style={styles.footer}><span>CLASSBRIDGE / LECTURE COPILOT</span><span>Works without an LLM · deterministic demo fallback</span></footer>
    </main>
  );
}

function NoteList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <div style={styles.noteBlock}><small style={styles.label}>{title}</small>{items.length ? <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul> : <p style={styles.empty}>{empty}</p>}</div>;
}

const styles: { [key: string]: any } = {
  shell: { maxWidth: 1180, margin: "0 auto", padding: "24px 24px 40px", color: "#eff8f7", minHeight: "100vh", fontFamily: "Manrope, system-ui, sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #29423e", paddingBottom: 20 },
  brand: { fontWeight: 800, letterSpacing: ".12em", fontSize: 14 },
  label: { color: "#9df4c0", fontSize: 10, letterSpacing: ".13em" },
  back: { color: "#9df4c0", textDecoration: "none", fontSize: 12 },
  intro: { display: "flex", justifyContent: "space-between", alignItems: "end", gap: 24, padding: "58px 0 34px" },
  introH: {},
  h1: {},
  muted: { maxWidth: 560, color: "#91a59d", lineHeight: 1.6 },
  status: { border: "1px solid #29423e", borderRadius: 10, padding: "12px 14px", color: "#9df4c0", fontSize: 10, letterSpacing: ".12em", lineHeight: 1.8 },
  grid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 },
  panel: { background: "linear-gradient(145deg, #13251f, #0d1915)", border: "1px solid #29423e", borderRadius: 16, padding: 22, minHeight: 240 },
  heading: { display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 18 },
  pill: { border: "1px solid #34554d", borderRadius: 20, padding: "5px 8px", color: "#91a59d", fontSize: 9 },
  live: { color: "#9df4c0", fontSize: 10, letterSpacing: ".1em" },
  textarea: { width: "100%", minHeight: 120, resize: "vertical", background: "#08120f", color: "#eff8f7", border: "1px solid #29423e", borderRadius: 10, padding: 14, font: "inherit", boxSizing: "border-box" },
  row: { display: "flex", gap: 8, marginTop: 12 },
  primary: { background: "#9df4c0", color: "#08120f", border: 0, borderRadius: 7, padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
  secondary: { background: "transparent", color: "#eff8f7", border: "1px solid #426356", borderRadius: 7, padding: "10px 14px", cursor: "pointer" },
  sample: { marginTop: 22, color: "#91a59d", fontSize: 12, lineHeight: 1.5 },
  caption: { background: "#08120f", borderLeft: "3px solid #9df4c0", padding: "22px 18px", borderRadius: 8, marginBottom: 20 },
  transcript: { color: "#91a59d", fontSize: 13, lineHeight: 1.6 },
  noteBlock: { borderTop: "1px solid #29423e", paddingTop: 13, marginTop: 12 },
  empty: { color: "#647b72", fontSize: 12 },
  questions: { display: "grid", gap: 8, marginBottom: 16 },
  question: { textAlign: "left", background: "#172f27", border: "1px solid #355149", borderRadius: 8, color: "#eff8f7", padding: "10px 12px", cursor: "pointer" },
  input: { flex: 1, minWidth: 0, background: "#08120f", color: "#eff8f7", border: "1px solid #29423e", borderRadius: 7, padding: "10px 12px", font: "inherit" },
  answer: { marginTop: 20, borderTop: "1px solid #29423e", paddingTop: 16, lineHeight: 1.6 },
  error: { color: "#ff9b88", border: "1px solid #6a3b32", padding: 12, borderRadius: 8 },
  footer: { display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 28, paddingTop: 18, borderTop: "1px solid #29423e", color: "#91a59d", fontSize: 10, letterSpacing: ".1em" },
};

"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Envelope<T> = {
  ok?: boolean;
  source?: string;
  data?: T;
  error?: string;
  fix?: string;
};

type ModelStatus = { status?: string; version?: string | null; error?: string | null; fix?: string | null };
type LectureSegment = {
  text: string;
  sign_ids?: string[];
  sign_available?: boolean;
  fallback_reason?: string | null;
  captions_only?: boolean;
  coverage_pct?: number;
};
type LectureResult = { segments: LectureSegment[]; overall_coverage_pct?: number; signed_ratio?: number };
type CaptionResult = { transcript?: string; language?: string; segments?: { start: number; end: number; text: string }[] };
type DescribeResult = { caption?: string; descriptions?: string[] };
type OcrResult = { text?: string[]; equations?: string[] };
type SoundResult = { alerts?: { label: string; confidence: number }[] };
type TtsResult = { text?: string; audio_url?: string; url?: string; audio_base64?: string; sample_rate?: number };
type QaData = { question: string; answer: string; matched_fact: string | null };
type SignInData = { chips?: string[]; translation?: string; landmarks?: unknown[]; hands?: number; vocabulary?: string[] };

async function request<T>(path: string, options?: RequestInit): Promise<Envelope<T>> {
  const response = await fetch(`${API}${path}`, options);
  const payload = (await response.json().catch(() => ({}))) as Envelope<T>;
  if (!response.ok || payload.ok === false) {
    const message = payload.error || `Request failed with status ${response.status}`;
    throw new Error(payload.fix ? `${message} (${payload.fix})` : message);
  }
  return payload;
}

function SigningAvatar({ gloss }: { gloss: string }) {
  const pose = gloss.replace(/[^A-Z0-9 ]/gi, " ").replace(/\s+/g, " ").trim().toUpperCase();
  const canonical = pose === "THANK YOU" || pose === "THANK_YOU" ? "THANK_YOU" : pose;
  const arm = {
    HELP: <><path d="M56 100 Q30 86 29 58 Q29 43 42 40" /><path d="M88 100 Q108 86 110 61 Q111 46 99 39" /></>,
    YES: <><path d="M56 100 Q36 89 42 68 L51 54" /><path d="M88 100 Q111 89 102 69 L92 55" /></>,
    NO: <><path d="M56 100 Q31 82 34 62 Q38 50 53 57" /><path d="M88 100 Q113 82 110 62 Q106 50 91 57" /></>,
    REPEAT: <><path d="M56 100 Q29 91 38 65 Q45 50 61 54" /><path d="M88 100 Q115 91 106 65 Q99 50 83 54" /></>,
    QUESTION: <><path d="M56 100 Q35 85 41 62 Q48 46 62 46" /><path d="M88 100 Q105 83 101 61 Q98 48 87 43" /></>,
    THANK_YOU: <><path d="M56 100 Q39 79 51 61 Q61 51 69 63" /><path d="M88 100 Q101 79 89 61 Q79 51 71 63" /></>,
  }[canonical as "HELP" | "YES" | "NO" | "REPEAT" | "QUESTION" | "THANK_YOU"] || <><path d="M56 100 Q35 84 42 61" /><path d="M88 100 Q109 84 102 61" /></>;

  return (
    <div aria-label={`Signing avatar pose ${pose || "waiting"}`} style={{ display: "grid", gap: 8, justifyItems: "center" }}>
      <svg role="img" viewBox="0 0 144 132" width="190" height="170" aria-hidden="true">
        <rect x="4" y="4" width="136" height="124" rx="18" fill="#101c32" stroke="#6be7d8" strokeWidth="2" />
        <circle cx="72" cy="39" r="20" fill="#ffd6b3" />
        <path d="M49 38 Q72 10 95 38 Q90 22 72 20 Q54 22 49 38" fill="#b69cff" />
        <circle cx="65" cy="40" r="2.5" fill="#101c32" /><circle cx="79" cy="40" r="2.5" fill="#101c32" />
        <path d="M65 49 Q72 54 79 49" fill="none" stroke="#101c32" strokeWidth="2" strokeLinecap="round" />
        <path d="M52 72 Q72 60 92 72 L99 112 L45 112 Z" fill="#6be7d8" />
        <g fill="none" stroke="#ffd6b3" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">{arm}</g>
        <text x="72" y="122" textAnchor="middle" fill="#101c32" fontSize="8" fontWeight="700">{pose || "READY"}</text>
      </svg>
      <strong>Avatar signing: {pose || "READY"}</strong>
    </div>
  );
}

const buttonStyle = { border: "1px solid #33405a", borderRadius: 9, background: "#18202d", color: "#eef3f8", padding: "10px 14px", fontWeight: 700, cursor: "pointer" };
const muted = { color: "#8995a6", fontSize: 12 };
const panel = { minWidth: 0, border: "1px solid #202a3a", borderRadius: 12, padding: 16, background: "#0d141e" };

export default function Home() {
  const [health, setHealth] = useState<ModelStatus | null>(null);
  const [healthState, setHealthState] = useState("loading");
  const [healthError, setHealthError] = useState("");
  const [lectureText, setLectureText] = useState("");
  const [lecture, setLecture] = useState<LectureResult | null>(null);
  const [lectureBusy, setLectureBusy] = useState(false);
  const [lectureError, setLectureError] = useState("");
  const [selectedSegment, setSelectedSegment] = useState(0);
  const [caption, setCaption] = useState<CaptionResult | null>(null);
  const [captionBusy, setCaptionBusy] = useState(false);
  const [captionError, setCaptionError] = useState("");
  const [description, setDescription] = useState<DescribeResult | null>(null);
  const [describeBusy, setDescribeBusy] = useState(false);
  const [describeError, setDescribeError] = useState("");
  const [ocr, setOcr] = useState<OcrResult | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const [sound, setSound] = useState<SoundResult | null>(null);
  const [soundBusy, setSoundBusy] = useState(false);
  const [soundError, setSoundError] = useState("");
  const [ttsText, setTtsText] = useState("");
  const [tts, setTts] = useState<TtsResult | null>(null);
  const [ttsBusy, setTtsBusy] = useState(false);
  const [ttsError, setTtsError] = useState("");
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaAudio, setQaAudio] = useState<File | null>(null);
  const [qa, setQa] = useState<QaData | null>(null);
  const [qaBusy, setQaBusy] = useState(false);
  const [qaError, setQaError] = useState("");
  const [signImage, setSignImage] = useState<File | null>(null);
  const [signIn, setSignIn] = useState<SignInData | null>(null);
  const [signBusy, setSignBusy] = useState(false);
  const [signError, setSignError] = useState("");

  const selected = lecture?.segments[selectedSegment];
  const modelEntries = useMemo(() => Object.entries(health?.models || {}), [health]);

  async function loadHealth() {
    setHealthState("loading"); setHealthError("");
    try { const payload = await request<ModelStatus>("/api/health"); setHealth(payload.data || payload); setHealthState("ready"); }
    catch (error) { setHealthState("offline"); setHealthError(error instanceof Error ? error.message : "Unable to reach the backend."); }
  }
  async function loadSoundStatus() {
    setSoundError("");
    try { const payload = await request<SoundResult>("/api/sound-alerts"); setSound(payload.data || {}); }
    catch (error) { setSoundError(error instanceof Error ? error.message : "Sound-alert status failed."); }
  }
  useEffect(() => { void loadHealth(); void loadSoundStatus(); }, []);

  async function submitLecture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!lectureText.trim()) return; setLectureBusy(true); setLectureError("");
    try { const payload = await request<LectureResult>("/api/lecture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: lectureText.trim() }) }); setLecture(payload.data || { segments: [] }); setSelectedSegment(0); }
    catch (error) { setLectureError(error instanceof Error ? error.message : "Lecture processing failed."); }
    finally { setLectureBusy(false); }
  }
  async function uploadCaptions(file: File) {
    setCaptionBusy(true); setCaptionError(""); const form = new FormData(); form.append("audio", file);
    try { const payload = await request<CaptionResult>("/api/captions", { method: "POST", body: form }); setCaption(payload.data || {}); }
    catch (error) { setCaptionError(error instanceof Error ? error.message : "Caption transcription failed."); }
    finally { setCaptionBusy(false); }
  }
  async function uploadDescription(file: File) {
    setDescribeBusy(true); setDescribeError(""); const form = new FormData(); form.append("image", file);
    try { const payload = await request<DescribeResult>("/api/describe", { method: "POST", body: form }); setDescription(payload.data || {}); }
    catch (error) { setDescribeError(error instanceof Error ? error.message : "Image description failed."); }
    finally { setDescribeBusy(false); }
  }
  async function uploadOcr(file: File) {
    setOcrBusy(true); setOcrError(""); const form = new FormData(); form.append("image", file);
    try { const payload = await request<OcrResult>("/api/board-ocr", { method: "POST", body: form }); setOcr(payload.data || {}); }
    catch (error) { setOcrError(error instanceof Error ? error.message : "Board OCR failed."); }
    finally { setOcrBusy(false); }
  }
  async function uploadSound(file: File) {
    setSoundBusy(true); setSoundError(""); const form = new FormData(); form.append("audio", file);
    try { const payload = await request<SoundResult>("/api/sound-alerts", { method: "POST", body: form }); setSound(payload.data || {}); }
    catch (error) { setSoundError(error instanceof Error ? error.message : "Sound-alert detection failed."); }
    finally { setSoundBusy(false); }
  }
  async function submitTts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!ttsText.trim()) return; setTtsBusy(true); setTtsError("");
    try { const payload = await request<TtsResult>("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: ttsText.trim() }) }); setTts(payload.data || {}); }
    catch (error) { setTtsError(error instanceof Error ? error.message : "Text-to-speech failed."); }
    finally { setTtsBusy(false); }
  }
  async function submitQa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!qaQuestion.trim() && !qaAudio) return; setQaBusy(true); setQaError("");
    try {
      const options: RequestInit = { method: "POST" };
      if (qaAudio) { const form = new FormData(); form.append("audio", qaAudio); form.append("question", qaQuestion.trim()); options.body = form; }
      else { options.headers = { "Content-Type": "application/json" }; options.body = JSON.stringify({ question: qaQuestion.trim() }); }
      const payload = await request<QaData>("/api/qa", options); setQa(payload.data || null);
    } catch (error) { setQaError(error instanceof Error ? error.message : "Voice Q&A failed."); }
    finally { setQaBusy(false); }
  }
  async function submitSignIn(file: File) {
    setSignBusy(true); setSignError(""); const form = new FormData(); form.append("image", file);
    try { const payload = await request<SignInData>("/api/sign-in", { method: "POST", body: form }); setSignIn(payload.data || {}); }
    catch (error) { setSignError(error instanceof Error ? error.message : "Sign recognition failed."); }
    finally { setSignBusy(false); }
  }
  function fileHandler(handler: (file: File) => void) { return (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) handler(file); }; }

  const gloss = selected?.sign_ids?.[selected.sign_ids.length - 1] || "";
  const signingPaused = Boolean(selected?.captions_only || !selected?.sign_available);
  const ttsAudio = tts?.audio_url || tts?.url || (tts?.audio_base64 ? `data:audio/wav;base64,${tts.audio_base64}` : "");

  return (
    <main style={{ minHeight: "100vh", background: "#08101b", color: "#eef3f8", padding: "24px max(18px, 4vw)", fontFamily: "system-ui, sans-serif" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 20, borderBottom: "1px solid #202a3a", paddingBottom: 18 }}>
        <strong style={{ letterSpacing: 2 }}>CLASS<span style={{ color: "#6be7d8" }}>BRIDGE</span></strong><span style={muted}>Accessibility workspace</span>
        <span style={{ marginLeft: "auto", ...muted }}>{healthState === "ready" ? "API ONLINE" : healthState === "loading" ? "CHECKING" : "API OFFLINE"} · {API}</span>
      </header>
      {healthState === "offline" && <div role="alert" style={{ margin: "16px 0", padding: 14, border: "1px solid #7d3d44", borderRadius: 10, color: "#ffd6d9" }}>Backend offline: {healthError}<button type="button" onClick={() => void loadHealth()} style={{ ...buttonStyle, marginLeft: 12, padding: "6px 10px" }}>Retry</button></div>}
      <section style={{ padding: "44px 0 26px", maxWidth: 850 }}><p style={{ color: "#6be7d8", letterSpacing: 2 }}>ACCESSIBILITY LAYER / 02</p><h1 style={{ fontSize: "clamp(2rem, 5vw, 4.5rem)", lineHeight: 1.02, margin: "10px 0" }}>Make every lesson visible and audible.</h1><p style={{ color: "#a8b4c4", fontSize: 18 }}>ClassBridge connects live captions, sign vocabulary, board text, image context, sound alerts, speech, and classroom Q&A to the local FastAPI models.</p></section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 14 }} aria-label="ClassBridge tools">
        <article style={panel}>
          <p style={muted}>LECTURE PIPELINE</p><h2>Captions + sign coverage</h2><span style={muted}>POST /api/lecture</span>
          <form onSubmit={submitLecture}><label htmlFor="lecture-text" style={{ ...muted, display: "block", margin: "12px 0 6px" }}>Paste lecture text</label><textarea id="lecture-text" value={lectureText} onChange={(event) => setLectureText(event.target.value)} rows={4} placeholder="Paste a lesson or equation to segment and sign-match." style={{ width: "100%", boxSizing: "border-box", resize: "vertical", border: "1px solid #33405a", borderRadius: 9, background: "#0b1119", color: "#eef3f8", padding: 12 }} /><button type="submit" disabled={lectureBusy || !lectureText.trim()} style={{ ...buttonStyle, marginTop: 10, opacity: lectureBusy || !lectureText.trim() ? .5 : 1 }}>{lectureBusy ? "Analyzing…" : "Analyze lecture"}</button></form>
          {lectureError && <p role="alert" style={{ color: "#ffb8bd" }}>{lectureError}</p>}
          {lecture && <div style={{ marginTop: 16 }}><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><span style={muted}>{lecture.segments.length} segments</span><span style={muted}>{lecture.overall_coverage_pct ?? 0}% coverage</span><span style={muted}>{Math.round((lecture.signed_ratio ?? 0) * 100)}% signed</span></div><div style={{ display: "grid", gap: 8, marginTop: 12 }}>{lecture.segments.map((segment, index) => <button key={`${segment.text}-${index}`} type="button" onClick={() => setSelectedSegment(index)} aria-pressed={selectedSegment === index} style={{ textAlign: "left", border: `1px solid ${selectedSegment === index ? "#6be7d8" : "#202a3a"}`, borderRadius: 9, padding: 11, background: selectedSegment === index ? "#142733" : "#0c131c", color: "#eef3f8" }}><strong>{index + 1}. </strong>{segment.text}<div style={{ ...muted, marginTop: 5 }}>{segment.sign_available ? "SIGN AVAILABLE" : "CAPTIONS ONLY"} · {segment.coverage_pct ?? 0}%</div></button>)}</div></div>}
        </article>

        <article style={panel}><p style={muted}>DEAF SIGNING</p><h2>Inline signing avatar</h2><span style={muted}>Driven by lecture sign_ids</span><div style={{ marginTop: 18, minHeight: 230, display: "grid", placeItems: "center" }}>{selected && !signingPaused ? <SigningAvatar gloss={gloss} /> : selected ? <div style={{ textAlign: "center" }}><SigningAvatar gloss="" /><strong style={{ display: "block", color: "#ffd27a" }}>signing paused — captions only</strong></div> : <p style={muted}>Run a lecture request to see its sign mapping.</p>}</div>{selected && <><p style={{ color: signingPaused ? "#ffd27a" : "#6be7d8", fontWeight: 700 }}>Avatar signing: {gloss || "CAPTIONS ONLY"}</p><p style={muted}>{selected.text}</p><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{selected.sign_ids?.map((sign) => <span key={sign} style={{ border: "1px solid #33405a", borderRadius: 99, padding: "3px 8px", fontSize: 12 }}>{sign}</span>)}</div></>}</article>

        <article style={panel}><p style={muted}>CAPTIONS INPUT</p><h2>Transcribe classroom audio</h2><span style={muted}>POST /api/captions</span><label style={{ ...buttonStyle, display: "inline-block", marginTop: 14, opacity: captionBusy ? .55 : 1 }}><input type="file" accept="audio/*" disabled={captionBusy} onChange={fileHandler(uploadCaptions)} style={{ display: "none" }} />{captionBusy ? "Transcribing…" : "Choose audio file"}</label>{captionError && <p role="alert" style={{ color: "#ffb8bd" }}>{captionError}</p>}{caption && <div style={{ marginTop: 14 }}><p style={{ fontSize: 18 }}>{caption.transcript || "No transcript returned."}</p><p style={muted}>{caption.language || "Language not reported"} · {caption.segments?.length || 0} returned segments</p></div>}</article>

        <article style={panel}><p style={muted}>SCENE CONTEXT</p><h2>Describe an image</h2><span style={muted}>POST /api/describe</span><label style={{ ...buttonStyle, display: "inline-block", marginTop: 14, opacity: describeBusy ? .55 : 1 }}><input type="file" accept="image/*" disabled={describeBusy} onChange={fileHandler(uploadDescription)} style={{ display: "none" }} />{describeBusy ? "Describing…" : "Upload image"}</label>{describeError && <p role="alert" style={{ color: "#ffb8bd" }}>{describeError}</p>}{description && <div style={{ marginTop: 14 }}><p style={{ fontSize: 18 }}>{description.caption || "No caption returned."}</p><p style={muted}>{description.descriptions?.length || 0} descriptions returned</p></div>}</article>

        <article style={panel}><p style={muted}>BOARD READER</p><h2>Extract equations and lines</h2><span style={muted}>POST /api/board-ocr</span><label style={{ ...buttonStyle, display: "inline-block", marginTop: 14, opacity: ocrBusy ? .55 : 1 }}><input type="file" accept="image/*" disabled={ocrBusy} onChange={fileHandler(uploadOcr)} style={{ display: "none" }} />{ocrBusy ? "Reading…" : "Upload board image"}</label>{ocrError && <p role="alert" style={{ color: "#ffb8bd" }}>{ocrError}</p>}{ocr && <div style={{ marginTop: 14 }}><label style={muted}>EXTRACTED LINES</label>{ocr.text?.length ? <div style={{ display: "grid", gap: 5, marginTop: 8 }}>{ocr.text.map((line, index) => <div key={`${line}-${index}`}><span style={muted}>LINE {index + 1} </span><b>{line}</b></div>)}</div> : <p style={muted}>No text lines returned.</p>}{ocr.equations?.map((equation) => <p key={equation} style={{ fontFamily: "monospace", color: "#d3e5e0" }}>{equation}</p>)}</div>}</article>

        <article style={panel}><p style={muted}>SOUND ENVIRONMENT</p><h2>Sound alerts</h2><span style={muted}>GET/POST /api/sound-alerts</span><p style={muted}>Detect classroom sounds for Deaf and hard-of-hearing learners.</p><label style={{ ...buttonStyle, display: "inline-block", marginTop: 4, opacity: soundBusy ? .55 : 1 }}><input type="file" accept="audio/*" disabled={soundBusy} onChange={fileHandler(uploadSound)} style={{ display: "none" }} />{soundBusy ? "Detecting…" : "Upload room audio"}</label>{soundError && <p role="alert" style={{ color: "#ffb8bd" }}>{soundError}</p>}{sound?.alerts?.length ? <div style={{ display: "grid", gap: 8, marginTop: 14 }}>{sound.alerts.map((alert, index) => <div key={`${alert.label}-${index}`} style={{ border: "1px solid #33405a", borderRadius: 9, padding: 10 }}><b>{alert.label}</b><div style={muted}>{Math.round(alert.confidence * 100)}% confidence</div></div>)}</div> : sound && <p style={muted}>No alert labels returned.</p>}</article>

        <article style={{ ...panel, gridColumn: "1 / -1" }}><p style={muted}>BLIND VOICE Q&A</p><h2>Ask the classroom facts service</h2><span style={muted}>POST /api/qa · JSON or multipart audio</span><form onSubmit={submitQa} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}><input aria-label="Voice Q&A question" value={qaQuestion} onChange={(event) => setQaQuestion(event.target.value)} placeholder="Type or transcribe a classroom question" style={{ flex: "1 1 280px", minWidth: 0, border: "1px solid #33405a", borderRadius: 9, background: "#0b1119", color: "#eef3f8", padding: 12 }} /><label style={{ ...buttonStyle, opacity: qaBusy ? .55 : 1 }}><input type="file" accept="audio/*" disabled={qaBusy} onChange={(event) => setQaAudio(event.target.files?.[0] || null)} style={{ display: "none" }} />{qaAudio ? qaAudio.name : "Optional audio"}</label><button type="submit" disabled={qaBusy || (!qaQuestion.trim() && !qaAudio)} style={{ ...buttonStyle, opacity: qaBusy || (!qaQuestion.trim() && !qaAudio) ? .5 : 1 }}>{qaBusy ? "Asking…" : "Ask voice Q&A"}</button></form>{qaError && <p role="alert" style={{ color: "#ffb8bd" }}>{qaError}</p>}{qa && <div style={{ marginTop: 16, borderTop: "1px solid #202a3a", paddingTop: 12 }}><p style={{ margin: 0, color: "#6be7d8" }}>{qa.question}</p><p style={{ fontSize: 20, margin: "8px 0" }}>{qa.answer}</p><small style={muted}>Matched fact: {qa.matched_fact || "none"}</small></div>}</article>

        <article style={panel}><p style={muted}>DEAF SIGN-IN</p><h2>Recognize a signed image</h2><span style={muted}>POST /api/sign-in · FormData image</span><label style={{ ...buttonStyle, display: "inline-block", marginTop: 14, opacity: signBusy ? .55 : 1 }}><input type="file" accept="image/*" disabled={signBusy} onChange={(event) => { const file = event.target.files?.[0]; if (file) { setSignImage(file); void submitSignIn(file); } }} style={{ display: "none" }} />{signBusy ? "Recognizing…" : signImage ? signImage.name : "Upload sign image"}</label>{signError && <p role="alert" style={{ color: "#ffb8bd" }}>{signError}</p>}{signIn && <div style={{ marginTop: 14 }}><p><strong>Recognized sign:</strong> {signIn.chips?.join(", ") || "No sign returned."}</p><p><strong>Translation:</strong> {signIn.translation || signIn.chips?.join(" ") || "No translation returned."}</p></div>}</article>

        <article style={panel}><p style={muted}>VOICE OUTPUT</p><h2>Read it back</h2><span style={muted}>POST /api/tts</span><form onSubmit={submitTts} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}><input aria-label="Text to speak" value={ttsText} onChange={(event) => setTtsText(event.target.value)} placeholder="Enter text for speech synthesis" style={{ flex: "1 1 220px", minWidth: 0, border: "1px solid #33405a", borderRadius: 9, background: "#0b1119", color: "#eef3f8", padding: 12 }} /><button type="submit" disabled={ttsBusy || !ttsText.trim()} style={{ ...buttonStyle, opacity: ttsBusy || !ttsText.trim() ? .5 : 1 }}>{ttsBusy ? "Generating…" : "Generate audio"}</button></form>{ttsError && <p role="alert" style={{ color: "#ffb8bd" }}>{ttsError}</p>}{tts && <div style={{ marginTop: 14 }}>{ttsAudio ? <audio controls src={ttsAudio} style={{ width: "100%" }}>Your browser cannot play this audio.</audio> : <p style={muted}>The backend returned no audio URL or payload.</p>}<p style={muted}>{tts.sample_rate ? `${tts.sample_rate} Hz · ` : ""}{tts.text || "Speech generated."}</p></div>}</article>
      </section>

      <section style={{ ...panel, marginTop: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}><div><p style={muted}>RUNTIME STATUS</p><h2>Backend health and model readiness</h2></div><button type="button" onClick={() => { void loadHealth(); void loadSoundStatus(); }} style={buttonStyle}>Refresh</button></div>{healthState === "loading" && <p style={muted}>Checking {API}/api/health…</p>}{healthState === "ready" && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 9 }}>{modelEntries.map(([name, value]) => <div key={name} style={{ border: "1px solid #202a3a", borderRadius: 9, padding: 11 }}><strong>{name}</strong><p style={{ ...muted, margin: "7px 0 0", color: value.status === "loaded" ? "#a8efb3" : value.status === "error" ? "#ffb8bd" : "#ffd27a" }}>{value.status || "unknown"}{value.version ? ` · ${value.version}` : ""}</p>{value.error && <p style={{ ...muted, color: "#ffb8bd" }}>{value.error}</p>}</div>)}</div>}</section>
      <footer style={{ display: "flex", gap: 18, flexWrap: "wrap", color: "#8995a6", fontSize: 12, padding: "24px 0" }}><span>ClassBridge</span><span>Local API · no classroom media leaves this device</span><span>Keyboard-friendly controls</span></footer>
    </main>
  );
}

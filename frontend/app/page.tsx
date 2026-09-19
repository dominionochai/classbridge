"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type ModelStatus = {
  status?: string;
  version?: string | null;
  error?: string | null;
  fix?: string | null;
};

type Envelope<T> = {
  ok?: boolean;
  source?: string;
  data?: T;
  error?: string;
  fix?: string;
};

type LectureSegment = {
  text: string;
  sign_ids?: string[];
  sign_available?: boolean;
  fallback_reason?: string | null;
  captions_only?: boolean;
  coverage_pct?: number;
};

type LectureResult = {
  segments: LectureSegment[];
  overall_coverage_pct?: number;
  signed_ratio?: number;
};

type CaptionSegment = { start: number; end: number; text: string };
type CaptionResult = { transcript?: string; language?: string; segments?: CaptionSegment[] };
type DescribeResult = { caption?: string; descriptions?: string[] };
type OcrResult = { text?: string[]; equations?: string[] };
type SoundResult = { alerts?: { label: string; confidence: number }[] };
type TtsResult = {
  text?: string;
  audio_url?: string;
  url?: string;
  audio_base64?: string;
  sample_rate?: number;
};

type RequestOptions = RequestInit & { body?: BodyInit | null };

async function request<T>(path: string, options?: RequestOptions): Promise<Envelope<T>> {
  const response = await fetch(`${API}${path}`, options);
  const payload = (await response.json().catch(() => ({}))) as Envelope<T>;
  if (!response.ok || payload.ok === false) {
    const message = payload.error || `Request failed with status ${response.status}`;
    throw new Error(payload.fix ? `${message} (${payload.fix})` : message);
  }
  return payload;
}

const prettyModelName: Record<string, string> = {
  faster_whisper: "Captions · faster-whisper",
  mediapipe: "Sign recognition · MediaPipe",
  paddleocr: "Board OCR · PaddleOCR",
  lavis_blip2: "Image description · BLIP-2",
  sherpa_onnx: "Text to speech · Sherpa ONNX",
  yamnet: "Sound alerts · YAMNet",
};

const buttonStyle = {
  border: "1px solid #33405a",
  borderRadius: 9,
  background: "#18202d",
  color: "#eef3f8",
  padding: "10px 14px",
  fontWeight: 700,
  cursor: "pointer",
};

const mutedStyle = { color: "#8995a6", fontSize: 12 };
const panelStyle = { minWidth: 0 };

export default function Home() {
  const [health, setHealth] = useState<{ models?: Record<string, ModelStatus> } | null>(null);
  const [healthState, setHealthState] = useState<"loading" | "ready" | "offline">("loading");
  const [healthError, setHealthError] = useState("");
  const [lectureText, setLectureText] = useState("");
  const [lecture, setLecture] = useState<LectureResult | null>(null);
  const [lectureBusy, setLectureBusy] = useState(false);
  const [lectureError, setLectureError] = useState("");
  const [selectedSegment, setSelectedSegment] = useState(0);
  const [captionResult, setCaptionResult] = useState<CaptionResult | null>(null);
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

  const selected = lecture?.segments[selectedSegment];
  const ttsAudio = tts?.audio_url || tts?.url || (tts?.audio_base64 ? `data:audio/wav;base64,${tts.audio_base64}` : "");
  const modelEntries = useMemo(() => Object.entries(health?.models || {}), [health]);

  async function loadHealth() {
    setHealthState("loading");
    setHealthError("");
    try {
      const payload = await request<{ models?: Record<string, ModelStatus> }>("/api/health");
      setHealth(payload);
      setHealthState("ready");
    } catch (error) {
      setHealthState("offline");
      setHealthError(error instanceof Error ? error.message : "Unable to reach the backend.");
    }
  }

  async function loadSoundStatus() {
    setSoundError("");
    try {
      const payload = await request<SoundResult>("/api/sound-alerts");
      setSound(payload.data || {});
    } catch (error) {
      setSoundError(error instanceof Error ? error.message : "Sound-alert status request failed.");
    }
  }

  useEffect(() => {
    void loadHealth();
    void loadSoundStatus();
  }, []);

  async function submitLecture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lectureText.trim()) return;
    setLectureBusy(true);
    setLectureError("");
    try {
      const payload = await request<LectureResult>("/api/lecture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: lectureText.trim() }),
      });
      setLecture(payload.data || { segments: [] });
      setSelectedSegment(0);
    } catch (error) {
      setLectureError(error instanceof Error ? error.message : "Lecture processing failed.");
    } finally {
      setLectureBusy(false);
    }
  }

  async function uploadCaptions(file: File) {
    setCaptionBusy(true);
    setCaptionError("");
    const form = new FormData();
    form.append("audio", file);
    try {
      const payload = await request<CaptionResult>("/api/captions", { method: "POST", body: form });
      setCaptionResult(payload.data || {});
    } catch (error) {
      setCaptionError(error instanceof Error ? error.message : "Caption transcription failed.");
    } finally {
      setCaptionBusy(false);
    }
  }

  async function uploadDescription(file: File) {
    setDescribeBusy(true);
    setDescribeError("");
    const form = new FormData();
    form.append("image", file);
    try {
      const payload = await request<DescribeResult>("/api/describe", { method: "POST", body: form });
      setDescription(payload.data || {});
    } catch (error) {
      setDescribeError(error instanceof Error ? error.message : "Image description failed.");
    } finally {
      setDescribeBusy(false);
    }
  }

  async function uploadOcr(file: File) {
    setOcrBusy(true);
    setOcrError("");
    const form = new FormData();
    form.append("image", file);
    try {
      const payload = await request<OcrResult>("/api/board-ocr", { method: "POST", body: form });
      setOcr(payload.data || {});
    } catch (error) {
      setOcrError(error instanceof Error ? error.message : "Board OCR failed.");
    } finally {
      setOcrBusy(false);
    }
  }

  async function uploadSound(file: File) {
    setSoundBusy(true);
    setSoundError("");
    const form = new FormData();
    form.append("audio", file);
    try {
      const payload = await request<SoundResult>("/api/sound-alerts", { method: "POST", body: form });
      setSound(payload.data || {});
    } catch (error) {
      setSoundError(error instanceof Error ? error.message : "Sound-alert detection failed.");
    } finally {
      setSoundBusy(false);
    }
  }

  async function submitTts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ttsText.trim()) return;
    setTtsBusy(true);
    setTtsError("");
    try {
      const payload = await request<TtsResult>("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ttsText.trim() }),
      });
      setTts(payload.data || {});
    } catch (error) {
      setTtsError(error instanceof Error ? error.message : "Text-to-speech failed.");
    } finally {
      setTtsBusy(false);
    }
  }

  function fileHandler(handler: (file: File) => void) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) handler(file);
    };
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="ClassBridge home">
          <span className="brand-mark"><i /><i /><i /></span>
          <span>CLASS<span>BRIDGE</span></span>
        </a>
        <div className="top-meta">
          <span className="status"><span className="live-dot" aria-hidden="true" /> API {healthState === "ready" ? "ONLINE" : healthState === "loading" ? "CHECKING" : "OFFLINE"}</span>
          <span className="session">localhost:8000</span>
          <button className="avatar" type="button" aria-label="ClassBridge workspace">CB</button>
        </div>
      </header>

      <section className="mode-tabs" role="tablist" aria-label="Accessibility workspace">
        <button className="tab active" type="button" role="tab" aria-selected="true"><b>◉</b> Live workspace <kbd>W</kbd></button>
        <span style={{ ...mutedStyle, marginLeft: "auto" }}>REAL FASTAPI PIPELINE · {API}</span>
      </section>

      {healthState === "offline" && (
        <div role="alert" style={{ marginTop: 16, padding: "13px 16px", border: "1px solid #7d3d44", borderRadius: 10, background: "#32191d", color: "#ffd6d9" }}>
          <strong>Backend offline.</strong> The workspace cannot reach {API}. Start the FastAPI server on port 8000, then retry the health check. {healthError}
          <button type="button" onClick={() => void loadHealth()} style={{ ...buttonStyle, marginLeft: 12, padding: "6px 10px" }}>Retry</button>
        </div>
      )}

      <section className="hero" id="top">
        <div>
          <p className="eyebrow"><span className="live-dot" aria-hidden="true" /> ACCESSIBILITY LAYER / 02</p>
          <h1>Make every lesson<br />visible and audible.</h1>
          <p className="hero-copy">A production bridge for captions, sign availability, board text, image context, sound alerts, and speech. Every card below talks to the local FastAPI service.</p>
        </div>
        <div className="stats" aria-label="Workspace summary">
          <span><strong>{lecture?.segments.length ?? 0}</strong> lecture segments</span>
          <span><strong>{lecture?.overall_coverage_pct ?? 0}%</strong> signed coverage</span>
          <span><strong>{modelEntries.filter(([, value]) => value.status === "loaded").length}</strong> models loaded</span>
        </div>
      </section>

      <section className="dashboard" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }} aria-label="ClassBridge tools">
        <article className="panel" style={panelStyle}>
          <div className="heading"><div><p>LECTURE PIPELINE</p><h2>Captions + sign coverage</h2></div><span style={mutedStyle}>POST /api/lecture</span></div>
          <form onSubmit={submitLecture}>
            <label htmlFor="lecture-text" style={{ ...mutedStyle, display: "block", marginBottom: 7 }}>Paste lecture text to segment and sign-match</label>
            <textarea id="lecture-text" value={lectureText} onChange={(event) => setLectureText(event.target.value)} placeholder="The mitochondria make energy. Please repeat the equation." rows={4} style={{ width: "100%", resize: "vertical", border: "1px solid #33405a", borderRadius: 9, background: "#0b1119", color: "#eef3f8", padding: 12 }} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}><button type="submit" disabled={lectureBusy || !lectureText.trim()} style={{ ...buttonStyle, opacity: lectureBusy || !lectureText.trim() ? 0.5 : 1 }}>{lectureBusy ? "Analyzing…" : "Analyze lecture →"}</button></div>
          </form>
          {lectureError && <p role="alert" style={{ color: "#ffb8bd", margin: "12px 0 0" }}>{lectureError}</p>}
          {lecture && (
            <>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
                <span className="status">{lecture.segments.length} segments</span>
                <span className="status">{lecture.overall_coverage_pct ?? 0}% coverage</span>
                <span className="status">{Math.round((lecture.signed_ratio ?? 0) * 100)}% signed</span>
              </div>
              <div style={{ marginTop: 14, display: "grid", gap: 8 }} aria-label="Lecture timeline">
                {lecture.segments.map((segment, index) => (
                  <button key={`${segment.text}-${index}`} type="button" onClick={() => setSelectedSegment(index)} aria-pressed={selectedSegment === index} style={{ textAlign: "left", border: `1px solid ${selectedSegment === index ? "#6be7f7" : "#202a3a"}`, borderRadius: 9, padding: 11, background: selectedSegment === index ? "#142733" : "#0c131c", color: "#eef3f8", cursor: "pointer" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><strong style={{ fontSize: 13 }}>0{index + 1}</strong><span style={{ ...mutedStyle, color: segment.sign_available ? "#a8efb3" : "#ffc66d" }}>{segment.sign_available ? "SIGN AVAILABLE" : "CAPTIONS ONLY"}</span>{segment.captions_only && <span style={{ border: "1px solid #8b6e3c", borderRadius: 5, padding: "2px 5px", color: "#ffd27a", fontSize: 10, fontWeight: 700 }}>VOCAB GAP</span>}<span style={{ ...mutedStyle, marginLeft: "auto" }}>{segment.coverage_pct ?? 0}%</span></div>
                    <p style={{ margin: "7px 0 0", lineHeight: 1.45 }}>{segment.text}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </article>

        <article className="panel" style={panelStyle}>
          <div className="heading"><div><p>SIGN TRANSLATION</p><h2>Vocabulary match</h2></div><span style={{ ...mutedStyle, color: "#b69cff" }}>REAL SIGN IDS</span></div>
          <div className="scene-focus" style={{ minHeight: 170 }}>
            <b style={{ width: 12, height: 12, borderRadius: "50%", background: "#b69cff", display: "block", flex: "none" }} />
            <div style={{ minWidth: 0 }}><label style={mutedStyle}>SELECTED CAPTION</label><h3 style={{ margin: "6px 0 3px" }}>{selected?.text || "Run a lecture request to see its sign mapping."}</h3><small style={mutedStyle}>{selected ? `${selected.coverage_pct ?? 0}% coverage · ${selected.sign_available ? "sign available" : "caption fallback"}` : "No live segment selected"}</small></div>
          </div>
          <div style={{ marginTop: 15 }}>
            <label style={mutedStyle}>SIGN IDS FROM BACKEND</label>
            <div className="chips" style={{ marginTop: 8 }}>
              {selected?.sign_ids?.length ? selected.sign_ids.map((sign) => <span className="chip active" key={sign}>{sign}</span>) : <span style={mutedStyle}>No sign IDs returned yet.</span>}
            </div>
            {selected?.captions_only && <div style={{ marginTop: 14, padding: 12, border: "1px solid #705f36", borderRadius: 8, color: "#ffd27a", background: "#2a2314" }}><strong>Vocabulary gap</strong><br /><span style={mutedStyle}>{selected.fallback_reason || "This segment remains available as captions only."}</span></div>}
          </div>
        </article>

        <article className="panel" style={panelStyle}>
          <div className="heading"><div><p>CAPTIONS INPUT</p><h2>Transcribe classroom audio</h2></div><span style={mutedStyle}>POST /api/captions</span></div>
          <label style={{ ...buttonStyle, display: "inline-block", opacity: captionBusy ? 0.55 : 1 }}><input type="file" accept="audio/*" disabled={captionBusy} onChange={fileHandler(uploadCaptions)} style={{ display: "none" }} />{captionBusy ? "Transcribing…" : "Choose audio file"}</label>
          {captionError && <p role="alert" style={{ color: "#ffb8bd" }}>{captionError}</p>}
          {captionResult && <div style={{ marginTop: 16 }}><p style={{ margin: 0, fontSize: 18 }}>{captionResult.transcript || "No transcript text returned."}</p><p style={{ ...mutedStyle, margin: "7px 0 12px" }}>{captionResult.language || "language not reported"} · {captionResult.segments?.length || 0} returned segments</p><div style={{ display: "grid", gap: 7 }}>{captionResult.segments?.map((segment, index) => <div key={`${segment.start}-${index}`} style={{ display: "flex", gap: 10, borderTop: "1px solid #202a3a", paddingTop: 8 }}><span style={{ ...mutedStyle, width: 75 }}>{segment.start.toFixed(1)}–{segment.end.toFixed(1)}s</span><span>{segment.text}</span></div>)}</div></div>}
        </article>

        <article className="panel" style={panelStyle}>
          <div className="heading"><div><p>SCENE CONTEXT</p><h2>Describe an image</h2></div><span style={{ ...mutedStyle, color: "#b69cff" }}>POST /api/describe</span></div>
          <label style={{ ...buttonStyle, display: "inline-block", opacity: describeBusy ? 0.55 : 1 }}><input type="file" accept="image/*" disabled={describeBusy} onChange={fileHandler(uploadDescription)} style={{ display: "none" }} />{describeBusy ? "Describing…" : "Upload image"}</label>
          {describeError && <p role="alert" style={{ color: "#ffb8bd" }}>{describeError}</p>}
          {description && <div className="scene-focus" style={{ marginTop: 15, minHeight: 130 }}><b style={{ width: 12, height: 12, borderRadius: "50%", background: "#b69cff", display: "block", flex: "none" }} /><div><label style={mutedStyle}>MODEL CAPTION</label><h3 style={{ margin: "6px 0", lineHeight: 1.3 }}>{description.caption || "No caption returned."}</h3><small style={mutedStyle}>{description.descriptions?.length || 0} description returned</small></div></div>}
        </article>

        <article className="panel" style={panelStyle}>
          <div className="heading"><div><p>BOARD READER</p><h2>Extract equations and lines</h2></div><span style={mutedStyle}>POST /api/board-ocr</span></div>
          <label style={{ ...buttonStyle, display: "inline-block", opacity: ocrBusy ? 0.55 : 1 }}><input type="file" accept="image/*" disabled={ocrBusy} onChange={fileHandler(uploadOcr)} style={{ display: "none" }} />{ocrBusy ? "Reading…" : "Upload board image"}</label>
          {ocrError && <p role="alert" style={{ color: "#ffb8bd" }}>{ocrError}</p>}
          {ocr && <div style={{ marginTop: 15 }}><label style={mutedStyle}>EXTRACTED LINES</label>{ocr.text?.length ? <div className="ocr-list" style={{ marginTop: 8 }}>{ocr.text.map((line, index) => <div key={`${line}-${index}`}><span>LINE {index + 1}</span><b>{line}</b></div>)}</div> : <p style={mutedStyle}>No text lines returned.</p>}{ocr.equations?.length ? <div style={{ marginTop: 12 }}><label style={mutedStyle}>EQUATIONS</label>{ocr.equations.map((equation, index) => <p key={`${equation}-${index}`} style={{ margin: "7px 0", fontFamily: "monospace", color: "#d3e5e0" }}>{equation}</p>)}</div> : null}</div>}
        </article>

        <article className="panel" style={panelStyle}>
          <div className="heading"><div><p>SOUND ENVIRONMENT</p><h2>Sound alerts</h2></div><span className="buzz">⌁</span></div>
          <p style={mutedStyle}>GET /api/sound-alerts checks live YAMNet availability. Upload audio to run detection.</p>
          <label style={{ ...buttonStyle, display: "inline-block", opacity: soundBusy ? 0.55 : 1 }}><input type="file" accept="audio/*" disabled={soundBusy} onChange={fileHandler(uploadSound)} style={{ display: "none" }} />{soundBusy ? "Detecting…" : "Upload room audio"}</label>
          {soundError && <p role="alert" style={{ color: "#ffb8bd" }}>{soundError}</p>}
          {sound?.alerts?.length ? <div className="alert-grid" style={{ marginTop: 14 }}>{sound.alerts.map((alert, index) => <div className="alert" key={`${alert.label}-${index}`}><b className="alert-icon cyan">●</b><div><strong>{alert.label}</strong><small>{Math.round(alert.confidence * 100)}% confidence</small></div></div>)}</div> : sound && !soundError ? <p style={{ ...mutedStyle, marginTop: 14 }}>No alert labels returned by the model.</p> : null}
        </article>

        <article className="panel" style={{ ...panelStyle, gridColumn: "1 / -1" }}>
          <div className="heading"><div><p>VOICE OUTPUT</p><h2>Read it back</h2></div><span style={{ ...mutedStyle, color: "#b69cff" }}>POST /api/tts</span></div>
          <form onSubmit={submitTts} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><input aria-label="Text to speak" value={ttsText} onChange={(event) => setTtsText(event.target.value)} placeholder="Enter text for speech synthesis" style={{ flex: "1 1 280px", minWidth: 0, border: "1px solid #33405a", borderRadius: 9, background: "#0b1119", color: "#eef3f8", padding: 12 }} /><button type="submit" disabled={ttsBusy || !ttsText.trim()} style={{ ...buttonStyle, opacity: ttsBusy || !ttsText.trim() ? 0.5 : 1 }}>{ttsBusy ? "Generating…" : "Generate audio"}</button></form>
          {ttsError && <p role="alert" style={{ color: "#ffb8bd" }}>{ttsError}</p>}
          {tts && <div style={{ marginTop: 14 }}>{ttsAudio ? <audio controls src={ttsAudio} style={{ width: "100%" }}>Your browser cannot play this audio.</audio> : <p style={mutedStyle}>The backend returned no audio URL or audio payload.</p>}<p style={{ ...mutedStyle, marginBottom: 0 }}>{tts.sample_rate ? `${tts.sample_rate} Hz · ` : ""}{tts.text || "Speech generated."}</p></div>}
        </article>
      </section>

      <section className="panel" style={{ marginTop: 14 }} aria-labelledby="health-heading">
        <div className="heading"><div><p>RUNTIME STATUS</p><h2 id="health-heading">Backend health and model readiness</h2></div><button type="button" onClick={() => { void loadHealth(); void loadSoundStatus(); }} style={{ ...buttonStyle, padding: "7px 10px" }}>Refresh</button></div>
        {healthState === "loading" && <p style={mutedStyle}>Checking {API}/api/health…</p>}
        {healthState === "ready" && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 9 }}>{modelEntries.map(([name, value]) => { const isLoaded = value.status === "loaded"; const isError = value.status === "error"; return <div key={name} style={{ border: "1px solid #202a3a", borderRadius: 9, padding: 11, background: "#0d141e" }}><div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: isLoaded ? "#a8efb3" : isError ? "#ff8f97" : "#ffc66d" }} /><strong style={{ fontSize: 12 }}>{prettyModelName[name] || name}</strong></div><p style={{ ...mutedStyle, margin: "7px 0 0", color: isLoaded ? "#a8efb3" : isError ? "#ffb8bd" : "#ffc66d" }}>{value.status || "unknown"}{value.version ? ` · ${value.version}` : ""}</p>{value.error && <p style={{ ...mutedStyle, margin: "5px 0 0", color: "#ffb8bd" }}>{value.error}</p>}{value.fix && <p style={{ ...mutedStyle, margin: "5px 0 0" }}>Fix: {value.fix}</p>}</div>; })}</div>}
      </section>

      <footer><span><span className="brand-mark small"><i /><i /><i /></span> ClassBridge</span><span>LOCAL API · no classroom media leaves this device</span><span>⌘ <small>SHORTCUTS</small></span></footer>
    </main>
  );
}

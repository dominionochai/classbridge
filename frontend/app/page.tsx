// FULL MOCK DEMO - no backend calls.
"use client";

import { useEffect, useMemo, useState } from "react";

type Mode = "Deaf mode" | "Blind mode";
type Caption = { speaker: string; text: string; tone: "cyan" | "green" };

const captions: Caption[] = [
  { speaker: "Dr. Malik", text: "Velocity is the rate at which displacement changes over time.", tone: "cyan" },
  { speaker: "Dr. Malik", text: "Notice how the slope of this line tells us the object's velocity.", tone: "green" },
  { speaker: "Student · row 2", text: "So a steeper line means the cart is moving faster?", tone: "cyan" },
  { speaker: "Dr. Malik", text: "Exactly. Now let's connect that idea to acceleration.", tone: "green" },
];
const signs = ["HELP", "YES", "REPEAT", "QUESTION", "THANK YOU"];
const translations: Record<string, string> = { HELP: "I need help", YES: "Yes, I understand", REPEAT: "Please repeat that", QUESTION: "I have a question", "THANK YOU": "Thank you" };
const alerts = [
  ["⚠", "Fire alarm detected", "10:42:08", "danger"],
  ["◉", "Bell rang", "10:41:32", "amber"],
  ["↗", "Name called: Tobi", "10:40:16", "cyan"],
  ["✦", "Applause", "10:39:04", "green"],
];
const scenes = ["Teacher at the whiteboard", "Diagram: triangle with labeled sides", "Someone raised their hand in row 2", "Two students comparing notes"];
const ocr = [["equation", "v = d/t"], ["equation", "a = (v-u)/t"], ["definition", "velocity = displacement / time"]];

function LiveDot() { return <span className="live-dot" aria-hidden="true" />; }

export default function Home() {
  const [mode, setMode] = useState<Mode>("Deaf mode");
  const [captionIndex, setCaptionIndex] = useState(0);
  const [captionText, setCaptionText] = useState("");
  const [signIndex, setSignIndex] = useState(0);
  const [lastSign, setLastSign] = useState("HELP");
  const [sceneIndex, setSceneIndex] = useState(0);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [listening, setListening] = useState(false);
  const caption = captions[captionIndex];
  const activeScene = scenes[sceneIndex];
  const signChips = useMemo(() => signs.map((sign, index) => ({ sign, active: index === signIndex })), [signIndex]);

  useEffect(() => { const id = window.setInterval(() => setCaptionIndex((n) => (n + 1) % captions.length), 2400); return () => window.clearInterval(id); }, []);
  useEffect(() => {
    setCaptionText(""); let n = 0;
    const id = window.setInterval(() => { n += 1; setCaptionText(caption.text.slice(0, n)); if (n >= caption.text.length) window.clearInterval(id); }, 25);
    return () => window.clearInterval(id);
  }, [caption]);
  useEffect(() => { const id = window.setInterval(() => setSignIndex((n) => (n + 1) % signs.length), 2200); return () => window.clearInterval(id); }, []);
  useEffect(() => { const id = window.setInterval(() => setSceneIndex((n) => (n + 1) % scenes.length), 2800); return () => window.clearInterval(id); }, []);
  useEffect(() => { setLastSign(signs[signIndex]); }, [signIndex]);

  function ask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!question.trim() || listening) return;
    setListening(true); setAnswer("");
    window.setTimeout(() => { setAnswer(question.toLowerCase().includes("red beaker") ? "On the front lab bench, 2 meters to your left." : "I can see the teacher, the motion diagram, and the front lab bench. Try asking where an object is."); setListening(false); }, 1100);
  }

  return <main className={`app-shell ${mode === "Deaf mode" ? "theme-deaf" : "theme-blind"}`}>
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark"><i /><i /><i /></span><span>CLASS<span>BRIDGE</span></span></a><div className="top-meta"><span className="status"><LiveDot /> LIVE <small>· mock</small></span><span className="session">Physics · Room 204</span><button className="avatar" aria-label="Open profile">TO</button></div></header>
    <nav className="mode-tabs" role="tablist" aria-label="Accessibility mode"><button className={mode === "Deaf mode" ? "tab active" : "tab"} onClick={() => setMode("Deaf mode")} role="tab" aria-selected={mode === "Deaf mode"}><b>◌</b> Deaf mode <kbd>D</kbd></button><button className={mode === "Blind mode" ? "tab active" : "tab"} onClick={() => setMode("Blind mode")} role="tab" aria-selected={mode === "Blind mode"}><b>◉</b> Blind mode <kbd>B</kbd></button></nav>
    <section className="hero" id="top"><div><p className="eyebrow"><LiveDot /> ACCESSIBILITY LAYER / 02</p><h1>{mode === "Deaf mode" ? "See the lesson as it happens." : "Hear and understand your surroundings."}</h1><p className="hero-copy">{mode === "Deaf mode" ? "Live captions, sign recognition, and sound alerts keep every moment in view." : "Scene descriptions, board OCR, and voice answers turn the classroom into a clear audio map."}</p></div><div className="stats"><span><strong>98.4%</strong>signal clarity</span><span><strong>04</strong>active streams</span></div></section>

    {mode === "Deaf mode" ? <section className="dashboard deaf" aria-label="Deaf mode dashboard">
      <article className="panel captions"><Heading kicker={<><LiveDot /> LIVE CAPTIONS</>} title="Classroom transcript" right="10:42:18 AM" /><div className="caption-box"><div className="speaker"><span className={`speaker-dot ${caption.tone}`} /><strong>{caption.speaker}</strong><em>PHYSICS</em></div><p className="caption-text">{captionText}<i className="caret" /></p><div className="wave">{Array.from({ length: 30 }, (_, i) => <i key={i} style={{ height: `${12 + (i * 17) % 32}%` }} />)}</div></div><div className="panel-foot"><span><b /> Streaming · English</span><span>Latency <strong>0.4s</strong></span></div></article>
      <article className="panel signs"><Heading kicker={<>VISION MODEL <small>98.2%</small></>} title="Sign recognition" right="FRAME 0048" /><div className="sign-stage"><span className="stage-label">CAM 02 / FRONT</span><span className="scan" /><div className="avatar-art"><div className="head"><i /><i /><b /></div><div className="neck" /><div className="torso" /><span className="arm left" /><span className="arm right" /><span className="hand left" /><span className="hand right" /></div><span className="tracking" /><span className="track-label">hands tracked · 2</span></div><div className="chips">{signChips.map(({ sign, active }) => <button key={sign} className={active ? "chip active" : "chip"} onClick={() => setLastSign(sign)}>{sign}</button>)}</div><div className="translation"><b>↳</b><div><label>TRANSLATION OUTPUT</label><strong>“{translations[lastSign]}”</strong></div></div></article>
      <article className="panel alerts"><Heading kicker="SOUND ENVIRONMENT" title="Alerts & moments" right={<span className="buzz">⌁</span>} /><div className="alert-grid">{alerts.map(([icon, title, time, kind]) => <div className="alert" key={title}><b className={`alert-icon ${kind}`}>{icon}</b><div><strong>{title}</strong><small>Detected by room microphone</small></div><time>{time}</time></div>)}</div><div className="vibration"><span>)))</span><div><b>Buzz enabled</b><small>Device vibration mirrors high-priority alerts</small></div><i /></div></article>
    </section> : <section className="dashboard blind" aria-label="Blind mode dashboard">
      <article className="panel scene"><Heading kicker={<><LiveDot /> COMPUTER VISION</>} title="What I see now" right="just now" /><div className="scene-focus"><b /><div><label>SCENE DESCRIPTION</label><h3>{activeScene}</h3><small>Updated automatically · high confidence</small></div><em>96%</em></div><div className="scene-list">{scenes.slice(0, 3).map((item, i) => <div className={i === sceneIndex % 3 ? "scene-row selected" : "scene-row"} key={item}><span>0{i + 1}</span><p>{item}</p><i>›</i></div>)}</div></article>
      <article className="panel board"><Heading kicker={<>BOARD READER <small className="violet">OCR</small></>} title="Whiteboard text" right="10:41:56 AM" /><div className="board-art"><span>KINEMATICS</span><b>v = d/t</b><strong>a = (v-u)/t</strong><i /></div><div className="ocr-list">{ocr.map(([label, text]) => <div key={text}><span>{label}</span><b>{text}</b><i>✓</i></div>)}</div></article>
      <article className="panel voice"><Heading kicker="ASK THE ROOM" title="Voice Q&A" right={<span className="voice-icon">◎</span>} /><form onSubmit={ask}><label htmlFor="question">Ask about anything in your surroundings</label><div className="input"><input id="question" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Where is the red beaker?" disabled={listening} /><button aria-label="Ask question">↗</button></div></form><div className={listening ? "answer listening" : "answer"}><b>{listening ? "◌" : "✦"}</b><div>{listening ? <><label>LISTENING...</label><p>Scanning the classroom for an answer</p></> : answer ? <><label>ANSWER</label><p>{answer}</p></> : <><label>READY WHEN YOU ARE</label><p>Ask a question to get a visual answer.</p></>}</div></div><button className="repeat" onClick={() => setAnswer("v = d/t — velocity equals displacement divided by time.")}><b>↻</b> Repeat last equation</button></article>
    </section>}
    <footer><span><span className="brand-mark small"><i /><i /><i /></span> ClassBridge</span><span>Local mock session · no data leaves this device</span><span>⌘ K <small>shortcuts</small></span></footer>
  </main>;
}

function Heading({ kicker, title, right }: { kicker: React.ReactNode; title: string; right: React.ReactNode }) { return <div className="heading"><div><p>{kicker}</p><h2>{title}</h2></div><span>{right}</span></div>; }

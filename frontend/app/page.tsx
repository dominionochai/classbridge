"use client";
import { useState } from "react";
const features = ["Live captions", "Sign language", "Board OCR", "Descriptions", "Text to speech", "Sound alerts"];
export default function Home() {
  const [mode, setMode] = useState<"Deaf mode" | "Blind mode">("Deaf mode");
  return <main className="shell"><header><div><p className="eyebrow">CLASSBRIDGE</p><h1>Make every classroom audible, visible, and understandable.</h1><p className="lede">A calm workspace for accessible learning support.</p></div><span className="status">● Mock services online</span></header><nav className="tabs" aria-label="Accessibility mode"><button className={mode === "Deaf mode" ? "active" : ""} onClick={() => setMode("Deaf mode")}>Deaf mode</button><button className={mode === "Blind mode" ? "active" : ""} onClick={() => setMode("Blind mode")}>Blind mode</button></nav><section className="hero"><p className="eyebrow">{mode.toUpperCase()}</p><h2>{mode === "Deaf mode" ? "See the lesson as it happens." : "Hear and understand your surroundings."}</h2><p>Placeholder controls are ready for model-backed integrations.</p><div className="grid">{features.map((feature) => <article key={feature}><span className="dot" /><h3>{feature}</h3><p>Awaiting model connection</p></article>)}</div></section></main>;
}

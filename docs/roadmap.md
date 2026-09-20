# Roadmap

## Built

- FastAPI route adapters for captions, sign vocabulary, board OCR, descriptions, alerts, lecture copilot, and voice-bank enrollment.
- Next.js lecture view with ten realistic lesson chunks, important-moment beats, captions, notes, and click-to-explain.
- Voice-bank page and API with durable enrollment metadata, status, and an explicit text-only fallback.
- Graceful degradation and regression tests; CI runs backend pytest plus frontend TypeScript and Next build.

## Next

- **Whisper/Vosk STT:** switch live microphone input between hosted-quality Whisper and an offline Vosk adapter.
- **Voice-clone model plug-in:** connect Coqui XTTS at the documented speak seam after consent, model safety, and audio QA are in place; never fake an audio response.
- **BrainFlow EEG switch:** add an opt-in BrainFlow input adapter for attention or fatigue signals, with local-only defaults.
- **Gaze heatmap learning:** turn gaze/blink events into a private heatmap of where the learner pauses, then suggest a re-explanation without grading attention.

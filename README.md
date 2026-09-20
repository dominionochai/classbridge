# ClassBridge

ClassBridge is one accessibility copilot for the classroom: it keeps the lesson understandable when a student cannot access the room in the usual way.

> we don't translate the classroom, we re-explain it

## One copilot, three journeys

- **Deaf or hard of hearing:** smart captions, sign-aware vocabulary, and sound alerts.
- **Blind or low vision:** scene descriptions and board text read aloud.
- **Neurodegenerative conditions:** lecture copilot, personal voice bank, and future gaze/blink/EEG input.

## Features

Live captioning with graceful heuristic fallback, board OCR, scene description, sound-event alerts, lecture chunks with auto-notes and click-to-explain, and an honest voice-bank enrollment seam. The voice-bank demo returns text only; it never fabricates audio.

## Architecture

FastAPI backend + Next.js frontend. Routes are small adapters around optional local models; when a model is missing, the API reports its fallback instead of blocking the classroom. The frontend is a browser-first demo with a consistent accessible dark interface.

## Quickstart

```bash
cd backend
python -m pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

In a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:3000/lecture` or `http://localhost:3000/voicebank`.

## Tests and build

```bash
cd backend && python -m pytest -q
cd frontend && npx tsc --noEmit && npx next build
```

## Endpoint table

| Capability | Method | Endpoint |
|---|---:|---|
| Health | GET | `/api/health` |
| Lecture ingest/caption/notes/explain | POST | `/api/lecture/ingest`, `/api/lecture/caption`, `/api/lecture/notes`, `/api/lecture/explain` |
| Voice enrollment | POST | `/api/voicebank/enroll` |
| Voice fallback speech | POST | `/api/voicebank/speak` |
| Voice enrollment status | GET | `/api/voicebank/{enrollment_id}` |
| Captions, board OCR, descriptions, alerts, Q&A, TTS, sign-in | GET/POST | See each route module under `backend/routes/` |

## Demo paths

- `/lecture` — ten-beat “How neurons fire” lesson with important-moment beats.
- `/voicebank` — enroll a base64 sample or sample name, then see the labeled text-only fallback.
- `docs/pitch.md` — product story and mocked-demo progression.
- `docs/roadmap.md` — built versus next.

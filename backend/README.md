# Backend

The backend is a FastAPI service. Model-backed routes load optional local assets when available and return explicit status envelopes when an asset is unavailable.

## Setup

From the repository root, create a virtual environment and install `backend/requirements.txt`. Start the API with `uvicorn main:app --app-dir backend --reload` when local development is ready.

## API endpoints

All routes use the `/api` prefix. Existing routes cover health, captions, lecture segmentation, sign input, board OCR, scene description, text-to-speech, and sound alerts.

### Classroom Q&A

`POST /api/qa` accepts JSON with a required `question` string and an optional `context` string. Matching is deterministic and uses `backend/data/classroom_facts.json`. Unknown questions return the exact clarification message in a successful response with `matched_fact: null`.

```bash
curl -X POST http://127.0.0.1:8000/api/qa \
  -H 'Content-Type: application/json' \
  -d '{"question":"Where is the red beaker?"}'
```

The endpoint also accepts multipart audio. The upload field may be `audio` or `file`; the optional `context` field is supported.

```bash
curl -X POST http://127.0.0.1:8000/api/qa \
  -F 'audio=@question.wav' \
  -F 'context=We are in science class'
```

`GET /api/qa/facts` returns the built-in classroom knowledge base in the same success envelope.

```bash
curl http://127.0.0.1:8000/api/qa/facts
```

The audio path imports and invokes `faster-whisper` inside a guarded error boundary. It does not fabricate a transcript when decoding or transcription fails.

# ClassBridge backend

The backend is a FastAPI service. Heavy model imports and downloads are not performed by normal imports. Run the setup in this order from the repository root in PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\setup.ps1
.\.venv\Scripts\python.exe -m pip install -r .\backend\requirements.txt
.\backend\setup_models.ps1
Set-Location .\backend
..\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

`setup_models.ps1` is safe to rerun. It downloads the configured speech and language model assets and prints a status for every asset. Plan for the model downloads before running it on a bandwidth-constrained machine.

## API endpoints

All endpoints are prefixed with `/api`.

- `GET /api/health` — service and per-model load status.
- `GET /api/captions` and `POST /api/captions` — captions; POST accepts multipart `audio` or `file` upload.
- `POST /api/lecture` — accepts JSON `{ "text": "..." }` or multipart `audio=@lecture.wav` / `file=@lecture.wav`; transcribes audio, splits sentences, and returns sign IDs plus coverage.
- `GET /api/lecture/vocab` — checked-in vocabulary JSON.
- `POST /api/sign-in` — multipart `image` or `frame` sign input.
- `POST /api/board-ocr` — multipart `image` board input.
- `POST /api/describe` — multipart `image` scene input.
- `POST /api/tts` — JSON `{ "text": "..." }` speech synthesis.
- `POST /api/sound-alerts` — multipart `audio` input.

Examples after starting the server:

```bash
curl http://127.0.0.1:8000/api/health
curl http://127.0.0.1:8000/api/lecture/vocab
curl -H 'Content-Type: application/json' \
  -d '{"text":"The mitochondria make energy. Please repeat the equation."}' \
  http://127.0.0.1:8000/api/lecture
```

## Lecture sign-vs-captions tiers

`backend/signing/vocab.json` is the deterministic first tier: each recognized word or phrase yields a sign ID. `translate_segment` returns `coverage_pct`; a segment with an unknown word has `fallback_reason: "vocab_gap"` and `captions_only: true`, so the complete original sentence remains available as captions. The lecture response keeps every sentence, its `sign_ids`, `sign_available`, `fallback_reason`, and `captions_only` fields, together with `overall_coverage_pct` and `signed_ratio`.

This is deliberately a sign-availability tier, not a claim that the vocabulary is a complete sign-language recognizer.

Audio lecture input is model-only: missing Whisper assets, audio decoding failures, or inference errors return an error response and never fabricate transcript text. Other model endpoints likewise expose their runtime asset status through health and must be fixed with `backend/setup_models.ps1` when unavailable.

## Lightweight verification

From `backend/`, use only lightweight checks while iterating:

```powershell
..\.venv\Scripts\python.exe -m compileall main.py routers signing
```

No model download is required for syntax checks.

## Linux sandbox

From the repository root, run:

```bash
./setup.sh
./sandbox_verify.sh
```

The verification script pulls the latest `main`, reuses existing dependencies when available, starts uvicorn, checks `/api/health`, exercises both lecture text paths (including the `vocab_gap` fallback), reports Python/pip and torch status, and cleans up the server. All output is written to `/workspace/outputs/sandbox_verify.log`.

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

`setup_models.ps1` is safe to rerun. It uses `huggingface_hub.snapshot_download` for faster-whisper tiny/base, Silero VAD, and the sherpa-onnx Piper voice, and a TensorFlow Hub direct archive URL for YAMNet. It prints a status for every asset. The exact sherpa voice source is [csukuangfj/sherpa-onnx-vits-piper-en_US-lessac-medium](https://huggingface.co/csukuangfj/sherpa-onnx-vits-piper-en_US-lessac-medium). Do not run it on a bandwidth-constrained machine without planning for model downloads.

## API endpoints

All endpoints are prefixed with `/api`.

- `GET /api/health` — service and per-model load status.
- `GET /api/captions` and `POST /api/captions` — captions; POST accepts a multipart `audio` or `file` upload.
- `POST /api/lecture` — accepts JSON `{ "text": "..." }`, or multipart `audio=@lecture.wav` / `file=@lecture.wav`; transcribes audio with faster-whisper, splits sentences, and returns sign IDs plus coverage.
- `GET /api/lecture/vocab` — the checked-in sign vocabulary JSON.
- `POST /api/sign-in` — multipart `image` or `frame` hand-sign input.
- `POST /api/board-ocr` — multipart `image` board input.
- `POST /api/describe` — multipart `image` scene input.
- `POST /api/tts` — JSON `{ "text": "..." }` speech synthesis.
- `POST /api/sound-alerts` — multipart `audio` input.

Examples after starting the server:

```powershell
curl http://127.0.0.1:8000/api/health
curl http://127.0.0.1:8000/api/lecture/vocab
curl -H "Content-Type: application/json" -d '{"text":"The mitochondria make energy. Please repeat the equation."}' http://127.0.0.1:8000/api/lecture
curl -F "audio=@.\lecture.wav" http://127.0.0.1:8000/api/lecture
curl -F "audio=@.\lecture.wav" http://127.0.0.1:8000/api/captions
curl -F "image=@.\hand.jpg" http://127.0.0.1:8000/api/sign-in
curl -F "image=@.\board.jpg" http://127.0.0.1:8000/api/board-ocr
curl -F "image=@.\scene.jpg" http://127.0.0.1:8000/api/describe
curl -H "Content-Type: application/json" -d '{"text":"Please repeat the question."}' http://127.0.0.1:8000/api/tts
curl -F "audio=@.\classroom.wav" http://127.0.0.1:8000/api/sound-alerts
```

## Lecture sign-vs-captions tiers

`backend/signing/vocab.json` is the deterministic first tier: each recognized word or phrase yields a sign ID. `translate_segment` returns `coverage_pct`; a segment with an unknown word has `fallback_reason: "vocab_gap"` and `captions_only: true`, so the complete original sentence remains available as captions. Empty/non-token input reports `unknown_word`. The lecture response keeps every sentence, its `sign_ids`, `sign_available`, `fallback_reason`, and `captions_only`, plus `overall_coverage_pct` and `signed_ratio`. This is deliberately a sign-availability tier, not a claim that the vocabulary is a complete sign-language recognizer.

Audio lecture input is a model-only path: a missing faster-whisper asset, audio decoding failure, or inference error returns an error response and never fabricated transcript text. Other model endpoints likewise surface their runtime asset status through health and, when unavailable, must be fixed with `backend/setup_models.ps1`.

## Lightweight verification

From `backend/`, use only lightweight checks when iterating:

```powershell
..\.venv\Scripts\python.exe -m compileall main.py routes signing
```

No model download is required for syntax checks.

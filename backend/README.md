# ClassBridge backend

The FastAPI service keeps heavyweight model imports and downloads lazy. Every request returns the stable envelope `{ "ok": true, "source": "model" | "mock", "data": ... }`; the `source` field is logged and makes degraded operation visible to clients.

Run from the repository root (with the pinned backend environment installed):

```bash
cd backend
uvicorn main:app --reload --port 8000
```

## Endpoints

Health and mock-friendly reads:

```bash
curl http://localhost:8000/api/health
curl http://localhost:8000/api/captions
curl http://localhost:8000/api/sound-alerts
```

Upload audio for Whisper captions:

```bash
curl -F "audio=@lecture.wav" http://localhost:8000/api/captions
```

Upload a camera frame for MediaPipe Hands sign chips:

```bash
curl -F "image=@hand.jpg" http://localhost:8000/api/sign-in
```

Upload a board image for PaddleOCR:

```bash
curl -F "image=@board.jpg" http://localhost:8000/api/board-ocr
```

Upload a scene image for LAVIS BLIP2:

```bash
curl -F "image=@classroom.jpg" http://localhost:8000/api/describe
```

Synthesize speech from JSON:

```bash
curl -H "Content-Type: application/json" -d '{"text":"Please repeat the question."}' http://localhost:8000/api/tts
```

Upload a WAV/PCM audio chunk for YAMNet alerts:

```bash
curl -F "audio=@classroom-audio.wav" http://localhost:8000/api/sound-alerts
```

## Model behavior and caveats

- `faster-whisper` loads `WhisperModel("tiny")` on the first caption upload. The model download and runtime are required for `source=model`; missing packages, failed downloads, invalid audio, or inference errors return a mock transcript.
- MediaPipe Hands is loaded on the first sign frame. The built-in vocabulary is `HELP`, `YES`, `NO`, `REPEAT`, `QUESTION`, and `THANK YOU`; the chip classifier is intentionally a small landmark heuristic, not a complete sign-language recognizer. Failed image/model operations return mock chips.
- PaddleOCR is lazy and extracts recognized text/equations when PaddlePaddle and its model are usable. PaddlePaddle wheel availability can be difficult on Windows/Python combinations.
- LAVIS BLIP2 is optional and lazy. `torch`/`torchvision` version mismatches or unavailable model downloads are caught and fall back to mock scene descriptions; this is the main reason the pinned file deliberately does not force a torch pair.
- sherpa-onnx TTS additionally needs local model files. Set `SHERPA_TTS_MODEL`, `SHERPA_TTS_TOKENS`, and optionally `SHERPA_TTS_LEXICON` before the first request. Without them, the response returns the input text with `mock: true`.
- YAMNet lazily downloads from TensorFlow Hub (`YAMNET_URL` can override the URL). It accepts WAV or raw PCM chunks, maps the YAMNet class map to fire/smoke alarm, bell, siren, and clap, and falls back when TensorFlow, TensorFlow Hub, the download, or decoding is unavailable.
- `python-multipart`, Pillow, OpenCV, and NumPy are runtime concerns for multipart/image paths. The route modules still import without them; an unavailable optional decoder is handled as a mock response.

The health endpoint reports each adapter as `not-loaded`, `loaded`, or `mock`, plus a package version when it can be discovered. `not-loaded` is expected before the first request because all heavyweight models are intentionally lazy.

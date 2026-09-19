# ClassBridge

ClassBridge is an accessibility workspace for classroom media. It presents live captions, vocabulary-backed signing, board text, image descriptions, sound alerts, text-to-speech, and classroom questions through one browser interface.

## Architecture

The application uses a FastAPI service layer and a Next.js + TypeScript frontend.

```text
Browser / Next.js dashboard
          |
          | JSON and multipart HTTP
          v
FastAPI routes and local model adapters
          |
          +-- captions, signing, OCR, image description
          +-- sound alerts, Q&A, TTS, health
```

The frontend is under `frontend/`. The FastAPI application and route modules are under `backend/`. Signing vocabulary is kept in `backend/signing/vocab.json`, with matching logic in `backend/signing/sign_engine.py`. The API returns explicit fallback or error information when a model asset is unavailable.

## Endpoint coverage

| Capability | Method and endpoint | Frontend control |
| --- | --- | --- |
| Runtime health | `GET /api/health` | Runtime status |
| Lecture segmentation and sign matching | `POST /api/lecture` | Lecture pipeline |
| Captions | `POST /api/captions` | Captions input |
| Scene description | `POST /api/describe` | Scene context |
| Board OCR | `POST /api/board-ocr` | Board reader |
| Sound alerts | `GET` or `POST /api/sound-alerts` | Sound environment |
| Voice Q&A | `POST /api/qa` | Blind voice Q&A |
| Sign-in recognition | `POST /api/sign-in` | Deaf sign-in |
| Text-to-speech | `POST /api/tts` | Voice output and OCR repeat |

A detailed mapping of visible controls is in [docs/demo-coverage.md](docs/demo-coverage.md). The static demo pointer is [`demo/index.html`](demo/index.html).

## Setup notes

Prerequisites are Python 3.11 or newer, Node.js 20 or newer, and npm.

1. Create and activate a Python virtual environment.
2. Install API dependencies with `python -m pip install -r backend/requirements.txt`.
3. Copy `backend/.env.example` to `backend/.env` and supply any local model settings required by the selected adapters.
4. Install frontend dependencies with `cd frontend` followed by `npm install`.
5. Start the FastAPI service and Next.js development server using the included platform-specific scripts, or start each application with its normal development command.
6. Set `NEXT_PUBLIC_API_URL` when the frontend should call an API address other than its local default.

The API can return explicit fallback responses when model assets or credentials are absent. Review the applicable model and runtime licenses before distribution. The original scaffold is MIT licensed; model and runtime assets remain subject to their respective licenses.

## Documentation

- [Demo coverage](docs/demo-coverage.md)
- [Backend notes](backend/README.md)

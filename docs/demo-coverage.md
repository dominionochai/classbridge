# Demo coverage

This table maps the visible workspace controls to the corresponding service or implementation.

| Visible demo element | Coverage mapping |
| --- | --- |
| Captions | `POST /api/captions` |
| Signing avatar | `sign_ids` + `backend/signing/sign_engine.py` + `backend/signing/vocab.json` (150 signs) + inline SVG poses in `frontend/app/page.tsx` |
| Board OCR | `POST /api/board-ocr` |
| Scene description | `POST /api/describe` |
| TTS | `POST /api/tts` |
| Sound alerts | `POST /api/sound-alerts` |
| Voice Q&A | `POST /api/qa` |
| Repeat equation | TTS of the last OCR line via `POST /api/tts` |
| Lecture pipeline and sign coverage | `POST /api/lecture`; segments expose `sign_ids`, coverage, and captions-only status |
| Runtime health and model readiness | `GET /api/health` |
| Sign-in card | `POST /api/sign-in` with an image in `FormData`; displays the recognized sign and translation |
| Captions-only state | Displays the exact status `signing paused — captions only` when a lecture segment is marked `captions_only` |

The browser workspace is in `frontend/app/page.tsx`. The static browser walkthrough remains at `demo/index.html`. The frontend keeps API errors visible and does not insert placeholder service results.

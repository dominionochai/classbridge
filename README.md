# ClassBridge

ClassBridge is an accessibility-first classroom bridge: live captions for Deaf and hard-of-hearing learners, sign-language translation, board OCR, scene descriptions, text-to-speech, and sound alerts for blind and low-vision learners.

> This commit is a deliberately small, Windows-friendly scaffold. Model integrations are mocked until local model assets and service credentials are supplied.

## Architecture

```text
+----------------------+       JSON/HTTP       +------------------------+
| Next.js dashboard    | <--------------------> | FastAPI API            |
| Deaf mode / Blind     |                        | route stubs + mocks    |
+----------------------+                        +------------------------+
             |                                               |
             v                                               v
     Camera / mic / browser                         Local model assets
     permissions and uploads                         (license notices)
```

## Repository layout

- `backend/` FastAPI application and route stubs
- `frontend/` Next.js + TypeScript placeholder dashboard

## Windows / PowerShell setup

Prerequisites: Python 3.11+, Node.js 20+, and npm.

1. Create and activate a virtual environment: `py -m venv .venv; .\\.venv\\Scripts\\Activate.ps1`
2. Install API dependencies: `py -m pip install -r backend\\requirements.txt`
3. Copy environment defaults: `Copy-Item backend\\.env.example backend\\.env`
4. Install frontend dependencies: `cd frontend; npm install`

The API returns explicit mock JSON when model assets or credentials are absent.

## License

ClassBridge's original scaffold is MIT licensed. Model and runtime assets remain subject to their respective licenses; review the applicable notices before distribution.

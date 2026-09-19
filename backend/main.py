from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import captions, sign_in, board_ocr, describe, tts, sound_alerts

app = FastAPI(title="ClassBridge API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(captions.router, prefix="/api")
app.include_router(sign_in.router, prefix="/api")
app.include_router(board_ocr.router, prefix="/api")
app.include_router(describe.router, prefix="/api")
app.include_router(tts.router, prefix="/api")
app.include_router(sound_alerts.router, prefix="/api")

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": "mock", "service": "classbridge"}

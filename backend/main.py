from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import board_ocr, captions, describe, lecture, sign_in, sound_alerts, tts

logging.basicConfig(level=logging.INFO)
app = FastAPI(title="ClassBridge API", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (captions, sign_in, board_ocr, describe, tts, sound_alerts, lecture):
    app.include_router(module.router, prefix="/api")


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "classbridge",
        "models": {
            "faster_whisper": captions.model_status_info(),
            "mediapipe": sign_in.model_status_info(),
            "paddleocr": board_ocr.model_status_info(),
            "lavis_blip2": describe.model_status_info(),
            "sherpa_onnx": tts.model_status_info(),
            "yamnet": sound_alerts.model_status_info(),
        },
    }

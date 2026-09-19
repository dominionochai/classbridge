from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any, Callable

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import board_ocr, captions, describe, lecture, qa, sign_in, sound_alerts, tts

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI):
    loaders: tuple[tuple[str, Callable[[], Any]], ...] = (("faster-whisper", captions._load_whisper), ("MediaPipe Hands", sign_in._load_hands), ("PaddleOCR", board_ocr._load_ocr), ("LAVIS BLIP2", describe._load_model), ("sherpa-onnx", tts._load_tts), ("YAMNet", sound_alerts._load_yamnet))
    for name, loader in loaders:
        try:
            loader()
        except Exception as exc:
            logging.getLogger("classbridge.models").warning("%s startup initialization failed: %s", name, exc)
    yield


app = FastAPI(title="ClassBridge API", version="0.2.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
for module in (captions, sign_in, board_ocr, describe, tts, sound_alerts, lecture, qa):
    app.include_router(module.router, prefix="/api")


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "service": "classbridge", "models": {"faster_whisper": captions.model_status_info(), "mediapipe": sign_in.model_status_info(), "paddleocr": board_ocr.model_status_info(), "lavis_blip2": describe.model_status_info(), "sherpa_onnx": tts.model_status_info(), "yamnet": sound_alerts.model_status_info()}}

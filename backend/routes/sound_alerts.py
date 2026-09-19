from __future__ import annotations

import csv
import io
import logging
import os
import wave
from typing import Any

from fastapi import APIRouter, Request

from .utils import mark_loaded, model_response, model_status, mock_status, package_version, request_bytes

logger = logging.getLogger("classbridge.models")
router = APIRouter(tags=["sound-alerts"])
_YAMNET: Any = None
_LABELS: list[str] = []
_STATUS = model_status("yamnet")
TARGETS = {"fire alarm", "smoke alarm", "bell", "siren", "clap", "clapping"}


def _load_yamnet() -> Any:
    global _YAMNET, _LABELS
    if _YAMNET is not None:
        return _YAMNET
    if _STATUS["status"] == "mock":
        return None
    try:
        import tensorflow as tf
        import tensorflow_hub as hub
        import tensorflow_hub

        _YAMNET = hub.load(os.getenv("YAMNET_URL", "https://tfhub.dev/google/yamnet/1"))
        class_map = _YAMNET.class_map_path().numpy().decode("utf-8") if hasattr(_YAMNET.class_map_path(), "numpy") else str(_YAMNET.class_map_path())
        with tf.io.gfile.GFile(class_map) as handle:
            _LABELS = [row["display_name"].lower() for row in csv.DictReader(handle)]
        mark_loaded(_STATUS, package_version(tensorflow_hub))
        return _YAMNET
    except Exception as exc:
        mock_status(_STATUS, exc)
        logger.warning("YAMNet unavailable; using mock alert feed: %s", exc)
        return None


def model_status_info() -> dict[str, Any]:
    return dict(_STATUS)


def _mock_data() -> dict[str, Any]:
    return {"alerts": [{"label": "bell", "confidence": 0.91}, {"label": "clap", "confidence": 0.84}], "mock": True}


def _samples(audio: bytes):
    import numpy as np
    try:
        with wave.open(io.BytesIO(audio), "rb") as wav:
            channels = wav.getnchannels()
            rate = wav.getframerate()
            values = np.frombuffer(wav.readframes(wav.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
            if channels > 1:
                values = values.reshape(-1, channels).mean(axis=1)
            if rate != 16000 and len(values):
                positions = np.linspace(0, len(values) - 1, max(1, int(len(values) * 16000 / rate)))
                values = np.interp(positions, np.arange(len(values)), values).astype(np.float32)
            return values
    except Exception:
        return np.frombuffer(audio, dtype=np.int16).astype(np.float32) / 32768.0


@router.get("/sound-alerts")
async def get_sound_alerts() -> dict[str, Any]:
    return model_response("mock", _mock_data(), "GET /api/sound-alerts")


@router.post("/sound-alerts")
async def sound_alerts(request: Request) -> dict[str, Any]:
    audio = await request_bytes(request, ("audio", "file"))
    model = _load_yamnet() if audio else None
    if model is not None and audio:
        try:
            scores, _, _ = model(_samples(audio))
            means = scores.numpy().mean(axis=0)
            alerts = [{"label": _LABELS[index], "confidence": round(float(score), 4)} for index, score in enumerate(means) if index < len(_LABELS) and _LABELS[index] in TARGETS and float(score) >= 0.15]
            alerts.sort(key=lambda item: item["confidence"], reverse=True)
            return model_response("model", {"alerts": alerts[:10], "mock": False}, "POST /api/sound-alerts")
        except Exception as exc:
            logger.warning("YAMNet inference failed; using mock: %s", exc)
    return model_response("mock", _mock_data(), "POST /api/sound-alerts")

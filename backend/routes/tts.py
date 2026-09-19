from __future__ import annotations

import base64
import io
import logging
import os
import wave
from typing import Any

from fastapi import APIRouter, Request

from .utils import mark_loaded, model_response, model_status, mock_status, package_version, request_json

logger = logging.getLogger("classbridge.models")
router = APIRouter(tags=["tts"])
_TTS: Any = None
_STATUS = model_status("sherpa_onnx")


def _load_tts() -> Any:
    global _TTS
    if _TTS is not None:
        return _TTS
    if _STATUS["status"] == "mock":
        return None
    try:
        import sherpa_onnx

        model_path = os.getenv("SHERPA_TTS_MODEL")
        tokens = os.getenv("SHERPA_TTS_TOKENS")
        lexicon = os.getenv("SHERPA_TTS_LEXICON", "")
        if not model_path or not tokens:
            raise RuntimeError("SHERPA_TTS_MODEL and SHERPA_TTS_TOKENS are required")
        config = sherpa_onnx.OfflineTtsConfig(
            model=sherpa_onnx.OfflineTtsModelConfig(
                vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=model_path, tokens=tokens, lexicon=lexicon),
                num_threads=int(os.getenv("SHERPA_TTS_THREADS", "1")),
                debug=False,
                provider="cpu",
            )
        )
        _TTS = sherpa_onnx.OfflineTts(config)
        mark_loaded(_STATUS, package_version(sherpa_onnx))
        return _TTS
    except Exception as exc:
        mock_status(_STATUS, exc)
        logger.warning("sherpa-onnx TTS unavailable; returning text mock: %s", exc)
        return None


def model_status_info() -> dict[str, Any]:
    return dict(_STATUS)


@router.post("/tts")
async def tts(request: Request) -> dict[str, Any]:
    payload = await request_json(request)
    text = str(payload.get("text", "")).strip()
    if not text:
        raw = await request.body()
        text = raw.decode("utf-8", errors="ignore").strip() if raw else ""
    engine = _load_tts() if text else None
    if engine is not None and text:
        try:
            audio = engine.generate(text=text, sid=0, speed=1.0)
            samples = audio.samples
            sample_rate = int(audio.sample_rate)
            import numpy as np
            pcm = np.clip(np.asarray(samples) * 32767, -32768, 32767).astype(np.int16).tobytes()
            buffer = io.BytesIO()
            with wave.open(buffer, "wb") as wav:
                wav.setnchannels(1)
                wav.setsampwidth(2)
                wav.setframerate(sample_rate)
                wav.writeframes(pcm)
            return model_response("model", {"text": text, "audio_base64": base64.b64encode(buffer.getvalue()).decode("ascii"), "sample_rate": sample_rate, "mock": False}, "POST /api/tts")
        except Exception as exc:
            logger.warning("TTS inference failed; using text mock: %s", exc)
    return model_response("mock", {"text": text, "audio_base64": None, "sample_rate": None, "mock": True}, "POST /api/tts")

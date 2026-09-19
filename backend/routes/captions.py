from __future__ import annotations

import logging
import os
import tempfile
from typing import Any

from fastapi import APIRouter, Request

from .utils import mark_loaded, model_response, model_status, mock_status, package_version, request_bytes

logger = logging.getLogger("classbridge.models")
router = APIRouter(tags=["captions"])

_WHISPER: Any = None
_STATUS = model_status("faster_whisper")


def _load_whisper() -> Any:
    global _WHISPER
    if _WHISPER is not None:
        return _WHISPER
    if _STATUS["status"] == "mock":
        return None
    try:
        from faster_whisper import WhisperModel
        import faster_whisper

        _WHISPER = WhisperModel(os.getenv("WHISPER_MODEL", "tiny"))
        mark_loaded(_STATUS, package_version(faster_whisper))
        return _WHISPER
    except Exception as exc:
        mock_status(_STATUS, exc)
        logger.warning("faster-whisper unavailable; using mock captions: %s", exc)
        return None


def model_status_info() -> dict[str, Any]:
    return dict(_STATUS)


def _mock_data() -> dict[str, Any]:
    return {"transcript": "Welcome to ClassBridge. Captions are ready.", "language": "en", "segments": []}


@router.get("/captions")
async def get_captions() -> dict[str, Any]:
    return model_response("mock", _mock_data(), "GET /api/captions")


@router.post("/captions")
async def captions(request: Request) -> dict[str, Any]:
    audio = await request_bytes(request, ("audio", "file"))
    model = _load_whisper() if audio else None
    if model is not None and audio:
        suffix = ".wav"
        try:
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as handle:
                handle.write(audio)
                path = handle.name
            try:
                segments, info = model.transcribe(path)
                segment_data = []
                text_parts = []
                for segment in segments:
                    text = str(getattr(segment, "text", "")).strip()
                    text_parts.append(text)
                    segment_data.append({"start": float(getattr(segment, "start", 0.0)), "end": float(getattr(segment, "end", 0.0)), "text": text})
                data = {"transcript": " ".join(part for part in text_parts if part).strip(), "language": getattr(info, "language", None), "segments": segment_data}
                return model_response("model", data, "POST /api/captions")
            finally:
                try:
                    os.unlink(path)
                except OSError:
                    pass
        except Exception as exc:
            logger.warning("caption inference failed; using mock: %s", exc)
    return model_response("mock", _mock_data(), "POST /api/captions")

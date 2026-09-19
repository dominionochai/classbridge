"""Lecture transcription and vocabulary-backed sign segmentation."""
from __future__ import annotations

import os
import re
import tempfile
from typing import Any

from fastapi import APIRouter, Request

from signing.sign_engine import get_vocabulary, translate_segment
from .utils import model_error_response, model_response

router = APIRouter(tags=["lecture"])
_WHISPER: Any = None
_WHISPER_ERROR: str | None = None


def _load_whisper() -> Any:
    global _WHISPER, _WHISPER_ERROR
    if _WHISPER is not None:
        return _WHISPER
    if _WHISPER_ERROR is not None:
        raise RuntimeError(_WHISPER_ERROR)
    try:
        from faster_whisper import WhisperModel

        _WHISPER = WhisperModel(os.getenv("WHISPER_MODEL", "tiny"))
        return _WHISPER
    except Exception as exc:  # pragma: no cover - depends on optional runtime assets
        _WHISPER_ERROR = f"faster-whisper unavailable: {exc}"
        raise RuntimeError(_WHISPER_ERROR) from exc


async def _transcribe_upload(request: Request) -> str:
    try:
        form = await request.form()
    except Exception as exc:
        raise RuntimeError(f"audio multipart decoding failed: {exc}") from exc
    upload = form.get("audio") or form.get("file")
    if upload is None or not hasattr(upload, "read"):
        raise RuntimeError("audio upload is missing; use multipart field 'audio'")

    suffix = os.path.splitext(getattr(upload, "filename", "") or "")[1] or ".wav"
    path = ""
    try:
        data = await upload.read()
        if not data:
            raise RuntimeError("audio upload is empty")
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as handle:
            handle.write(data)
            path = handle.name
        model = _load_whisper()
        segments, _info = model.transcribe(path)
        transcript = " ".join(str(getattr(segment, "text", "")).strip() for segment in segments).strip()
        if not transcript:
            raise RuntimeError("faster-whisper produced no transcript")
        return transcript
    except RuntimeError:
        raise
    except Exception as exc:
        raise RuntimeError(f"faster-whisper transcription failed: {exc}") from exc
    finally:
        if path:
            try:
                os.unlink(path)
            except OSError:
                pass


def _sentence_parts(text: str) -> list[str]:
    return [part.strip() for part in re.split(r"(?<=[.!?])\s+|\n+", text.strip()) if part.strip()]


def _lecture_response(text: str) -> dict[str, Any]:
    parts = _sentence_parts(text)
    segments: list[dict[str, Any]] = []
    for part in parts:
        translation = translate_segment(part)
        segments.append({
            "text": part,
            "sign_ids": translation["sign_ids"],
            "sign_available": bool(translation["sign_ids"]),
            "fallback_reason": translation["fallback_reason"],
            "captions_only": translation["captions_only"],
            "coverage_pct": translation["coverage_pct"],
        })
    overall = round(sum(item["coverage_pct"] for item in segments) / len(segments), 2) if segments else 0.0
    signed = sum(1 for item in segments if item["sign_available"])
    return model_response(
        "model",
        {
            "segments": segments,
            "overall_coverage_pct": overall,
            "signed_ratio": round(signed / len(segments), 2) if segments else 0.0,
        },
        "POST /api/lecture",
    )


@router.get("/lecture/vocab")
async def lecture_vocab() -> list[dict[str, Any]]:
    return get_vocabulary()


@router.post("/lecture")
async def lecture(request: Request) -> dict[str, Any]:
    content_type = request.headers.get("content-type", "").lower()
    if "multipart/form-data" in content_type:
        try:
            text = await _transcribe_upload(request)
        except Exception as exc:
            return model_error_response(str(exc), "POST /api/lecture")
    else:
        try:
            payload = await request.json()
        except Exception as exc:
            return model_error_response(f"invalid JSON: {exc}", "POST /api/lecture")
        text = payload.get("text") if isinstance(payload, dict) else None
        if not isinstance(text, str) or not text.strip():
            return model_error_response("JSON body must contain non-empty string 'text'", "POST /api/lecture")
    return _lecture_response(text)

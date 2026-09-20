"""Lecture transcription plus the Lecture Copilot demo APIs.

The existing transcription and vocabulary endpoints remain model-backed. The
copilot endpoints intentionally use small, deterministic helpers so the demo
still works when no hosted LLM or optional model is available.
"""
from __future__ import annotations

import os
import re
import tempfile
from collections import Counter
from typing import Any

from fastapi import APIRouter, Request

from signing.sign_engine import get_vocabulary, translate_segment
from .utils import model_error_response, model_response

router = APIRouter(tags=["lecture"])
_WHISPER: Any = None
_WHISPER_ERROR: str | None = None
_INGESTED_CHUNKS: list[dict[str, Any]] = []


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

    suffix = os.path.splitext(getattr(upload, "filename", ""))[1] or ".wav"
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


def _clean_transcript(text: str) -> str:
    cleaned = re.sub(r"\b(?:um+|uh+|erm|you know|like)\b[,.]?", "", text, flags=re.I)
    return re.sub(r"\s+", " ", cleaned).strip(" ,")


def _terms(text: str) -> list[str]:
    stop_words = {"about", "after", "again", "could", "first", "from", "have", "into", "just", "more", "most", "other", "should", "that", "their", "there", "these", "they", "this", "those", "using", "what", "when", "where", "which", "with", "would", "your"}
    words = re.findall(r"[A-Za-z][A-Za-z-]{4,}", text.lower())
    counts = Counter(word for word in words if word not in stop_words)
    return [word for word, _count in counts.most_common(6)]


def _key_points(text: str) -> list[str]:
    sentences = _sentence_parts(_clean_transcript(text))
    if not sentences:
        return []
    markers = ("because", "important", "remember", "means", "therefore", "key", "we", "is ")
    ranked = sorted(enumerate(sentences), key=lambda item: (-sum(item[1].lower().count(marker) for marker in markers), item[0]))
    selected = sorted(ranked[:3], key=lambda item: item[0])
    return [sentence for _index, sentence in selected]


def _action_items(text: str) -> list[str]:
    return [sentence for sentence in _sentence_parts(_clean_transcript(text)) if re.search(r"\b(?:should|must|need to|remember to|next|try to|action)\b", sentence, re.I)][:5]


def _copilot_data(text: str) -> dict[str, Any]:
    cleaned = _clean_transcript(text)
    return {"transcript": cleaned, "key_points": _key_points(cleaned), "terms": _terms(cleaned), "action_items": _action_items(cleaned)}


def _lecture_response(text: str) -> dict[str, Any]:
    parts = _sentence_parts(_clean_transcript(text))
    if not parts:
        return {"caption": "Waiting for the next idea…", "highlights": [], "removed_fillers": True}
    caption = " ".join(parts[-2:])
    return {"caption": caption, "highlights": _terms(caption)[:4], "removed_fillers": True}


def _simple_explanation(question: str, context: str) -> dict[str, Any]:
    points = _key_points(context)
    focus = _terms(question)
    if points:
        answer = f"In simple terms: {points[0]}"
        if focus:
            answer += f" The idea to focus on is {focus[0]}: connect it to that main point."
    else:
        answer = "I do not have enough lecture context yet. Add another lecture chunk, then ask again."
    return {"question": question, "answer": answer, "related_key_points": points[:2]}


def _json_payload_error(message: str) -> dict[str, Any]:
    return {"ok": False, "source": "heuristic", "error": message}


def _read_string(payload: Any, *names: str) -> str:
    if not isinstance(payload, dict):
        return ""
    for name in names:
        value = payload.get(name)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def _lecture_response_for_transcript(text: str) -> dict[str, Any]:
    return model_response("model", {"segments": _lecture_segments(text)}, "POST /api/lecture")


def _lecture_segments(text: str) -> list[dict[str, Any]]:
    segments: list[dict[str, Any]] = []
    for part in _sentence_parts(text):
        translation = translate_segment(part)
        segments.append({"text": part, "sign_ids": translation["sign_ids"], "sign_available": bool(translation["sign_ids"]), "fallback_reason": translation["fallback_reason"], "captions_only": translation["captions_only"], "coverage_pct": translation["coverage_pct"]})
    return segments


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
    return _lecture_response_for_transcript(text)


@router.post("/lecture/ingest")
async def lecture_ingest(request: Request) -> dict[str, Any]:
    try:
        payload = await request.json()
    except Exception as exc:
        return _json_payload_error(f"invalid JSON: {exc}")
    text_chunk = _read_string(payload, "text_chunk")
    if not text_chunk:
        return _json_payload_error("text_chunk must be a non-empty string")
    timestamp = payload.get("timestamp") if isinstance(payload, dict) else None
    _INGESTED_CHUNKS.append({"text": text_chunk, "timestamp": timestamp})
    del _INGESTED_CHUNKS[:-100]
    transcript = " ".join(item["text"] for item in _INGESTED_CHUNKS)
    return {"ok": True, "source": "heuristic", "data": {"text_chunk": text_chunk, "timestamp": timestamp, "transcript": transcript, "chunk_count": len(_INGESTED_CHUNKS)}}


@router.post("/lecture/caption")
async def lecture_caption(request: Request) -> dict[str, Any]:
    try:
        payload = await request.json()
    except Exception as exc:
        return _json_payload_error(f"invalid JSON: {exc}")
    transcript = _read_string(payload, "transcript", "accumulated_transcript")
    if not transcript:
        return _json_payload_error("transcript must be a non-empty string")
    return {"ok": True, "source": "heuristic", "data": _lecture_response(transcript)}


@router.post("/lecture/notes")
async def lecture_notes(request: Request) -> dict[str, Any]:
    try:
        payload = await request.json()
    except Exception as exc:
        return _json_payload_error(f"invalid JSON: {exc}")
    transcript = _read_string(payload, "transcript", "accumulated_transcript")
    if not transcript:
        return _json_payload_error("transcript must be a non-empty string")
    data = _copilot_data(transcript)
    return {"ok": True, "source": "heuristic", "data": {"summary": " ".join(data["key_points"][:2]), "key_points": data["key_points"], "terms": data["terms"], "action_items": data["action_items"]}}


@router.post("/lecture/explain")
async def lecture_explain(request: Request) -> dict[str, Any]:
    try:
        payload = await request.json()
    except Exception as exc:
        return _json_payload_error(f"invalid JSON: {exc}")
    question = _read_string(payload, "question", "concept")
    context = _read_string(payload, "lecture_context", "context", "transcript")
    if not question:
        return _json_payload_error("question or concept must be a non-empty string")
    return {"ok": True, "source": "heuristic", "data": _simple_explanation(question, context)}

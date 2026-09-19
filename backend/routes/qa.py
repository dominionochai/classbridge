from __future__ import annotations

import json
import os
import re
import tempfile
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Request, UploadFile
from fastapi.responses import JSONResponse

router = APIRouter(tags=["qa"])
_FACTS_PATH = Path(__file__).resolve().parents[1] / "data" / "classroom_facts.json"
_FALLBACK = "I'm not sure — I'll ask the teacher to clarify."


def _facts() -> list[dict[str, Any]]:
    with _FACTS_PATH.open("r", encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, list):
        raise ValueError("classroom_facts.json must contain a list")
    return value


def _normalise(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def _stem(word: str) -> str:
    if len(word) > 3 and word.endswith("ies"):
        return word[:-3] + "y"
    if len(word) > 3 and word.endswith("es"):
        return word[:-2]
    if len(word) > 3 and word.endswith("s"):
        return word[:-1]
    return word


def _tokens(value: str) -> list[str]:
    return [_stem(token) for token in _normalise(value).split()]


def _has_phrase(haystack: list[str], needle: list[str]) -> bool:
    width = len(needle)
    return width > 0 and any(haystack[i:i + width] == needle for i in range(len(haystack) - width + 1))


def _answer(question: str, context: str = "") -> dict[str, Any]:
    # Match on whole-word phrases only, so "meaning" never matches "mean".
    # The longest matching keyword wins, so "red beaker" outranks "beaker".
    haystack = _tokens(f"{question} {context}")
    best: tuple[int, dict[str, Any]] | None = None
    for fact in _facts():
        for keyword in fact.get("keywords", []):
            needle = _tokens(str(keyword))
            if _has_phrase(haystack, needle) and (best is None or len(needle) > best[0]):
                best = (len(needle), fact)
    if best is None:
        return {"question": question, "answer": _FALLBACK, "matched_fact": None}
    fact = best[1]
    return {"question": question, "answer": str(fact.get("answer", "")), "matched_fact": str(fact.get("id")) if fact.get("id") else None}


def _success(data: dict[str, Any]) -> dict[str, Any]:
    return {"ok": True, "source": "model", "data": data}


def _error(message: str, fix: str) -> JSONResponse:
    return JSONResponse(status_code=400, content={"ok": False, "source": "error", "error": message, "fix": fix})


async def _transcribe(audio: UploadFile) -> str:
    """Transcribe one upload without allowing model or file errors to escape."""
    suffix = Path(audio.filename or "audio.wav").suffix or ".wav"
    temporary_path = ""
    try:
        payload = await audio.read()
        if not payload:
            raise ValueError("audio upload is empty")
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as handle:
            handle.write(payload)
            temporary_path = handle.name

        from faster_whisper import WhisperModel

        model = WhisperModel(
            os.getenv("WHISPER_MODEL", "tiny"),
            device=os.getenv("WHISPER_DEVICE", "cpu"),
            compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "int8"),
        )
        segments, _ = model.transcribe(temporary_path)
        transcript = " ".join(str(getattr(segment, "text", "")).strip() for segment in segments if str(getattr(segment, "text", "")).strip()).strip()
        if not transcript:
            raise ValueError("audio transcription returned no text")
        return transcript
    finally:
        if temporary_path:
            try:
                Path(temporary_path).unlink(missing_ok=True)
            except OSError:
                pass


@router.get("/qa/facts")
async def get_facts() -> dict[str, Any]:
    return _success({"facts": _facts()})


@router.post("/qa", response_model=None)
async def qa(request: Request) -> dict[str, Any] | JSONResponse:
    content_type = request.headers.get("content-type", "").lower()
    try:
        context = ""
        if "multipart/form-data" in content_type:
            form = await request.form()
            question_value = form.get("question") or form.get("text")
            context_value = form.get("context")
            context = context_value.strip() if isinstance(context_value, str) else ""
            question = question_value.strip() if isinstance(question_value, str) else ""
            upload = form.get("audio") or form.get("file")
            if isinstance(upload, UploadFile):
                question = await _transcribe(upload)
        else:
            payload = await request.json()
            if not isinstance(payload, dict):
                return _error("JSON body must be an object", "Send {\"question\": \"...\"}.")
            question_value = payload.get("question")
            context_value = payload.get("context", "")
            if not isinstance(question_value, str):
                return _error("question must be a string", "Send a non-empty string in the question field.")
            if context_value is not None and not isinstance(context_value, str):
                return _error("context must be a string", "Omit context or send it as a string.")
            question = question_value.strip()
            context = context_value.strip() if isinstance(context_value, str) else ""
    except Exception as exc:
        return _error(f"Unable to process the QA request: {exc}", "Send JSON with a question string or multipart form data with an audio file.")

    if not question:
        return _error("question must be a non-empty string", "Provide a question or an audio recording.")
    try:
        return _success(_answer(question, context))
    except Exception as exc:
        return _error(f"Unable to read the classroom facts: {exc}", "Check that backend/data/classroom_facts.json is valid JSON.")
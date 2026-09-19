from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter(tags=["qa"])
_FACTS_PATH = Path(__file__).resolve().parents[1] / "data" / "classroom_facts.json"


def _facts() -> list[dict[str, Any]]:
    with _FACTS_PATH.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _normalise(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def _success(data: dict[str, Any]) -> dict[str, Any]:
    return {"ok": True, "source": "model", "data": data}


def _error(message: str, fix: str) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"ok": False, "source": "error", "error": message, "fix": fix},
    )


def _answer(question: str) -> dict[str, Any]:
    normalised = _normalise(question)
    for fact in _facts():
        keywords = fact.get("keywords", [])
        if any(_normalise(str(keyword)) in normalised for keyword in keywords):
            matched = fact.get("id") or fact.get("answer")
            return {
                "question": question,
                "answer": str(fact.get("answer", "")),
                "matched_fact": str(matched),
            }
    return {
        "question": question,
        "answer": "I do not have that classroom fact yet. Please ask your teacher for the most accurate answer.",
        "matched_fact": None,
    }


@router.get("/qa/facts")
async def get_facts() -> dict[str, Any]:
    return _success({"facts": _facts()})


@router.post("/qa")
async def qa(request: Request) -> dict[str, Any] | JSONResponse:
    content_type = request.headers.get("content-type", "").lower()
    try:
        if "multipart/form-data" in content_type:
            form = await request.form()
            question = form.get("question") or form.get("text")
            audio = form.get("audio") or form.get("file")
            if audio is None:
                return _error(
                    "audio upload is required",
                    "Send multipart/form-data with an 'audio' field, or send JSON with a 'question' field.",
                )
            if hasattr(audio, "read"):
                payload = await audio.read()
                if not payload:
                    return _error("audio upload is empty", "Send a non-empty audio file.")
            if not isinstance(question, str) or not question.strip():
                return _error(
                    "audio was received but no transcript was provided",
                    "Include a transcribed 'question' or 'text' field with the audio upload.",
                )
        else:
            payload = await request.json()
            if not isinstance(payload, dict):
                return _error("JSON body must be an object", "Send {\"question\": \"...\"}.")
            question = payload.get("question") or payload.get("text")
    except Exception as exc:
        return _error(
            f"invalid request: {exc}",
            "Send JSON with a string 'question' or multipart form data with audio and question fields.",
        )

    if not isinstance(question, str) or not question.strip():
        return _error(
            "question must be a string",
            "Send a text question in the 'question' field.",
        )
    return _success(_answer(question.strip()))

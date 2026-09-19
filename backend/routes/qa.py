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
    return {"ok": True, "source": "classroom_facts", "data": data}


def _error(message: str, fix: str) -> JSONResponse:
    return JSONResponse(status_code=400, content={"ok": False, "error": message, "fix": fix})


def _answer(question: str) -> dict[str, Any]:
    normalised = _normalise(question)
    for fact in _facts():
        if any(_normalise(keyword) in normalised for keyword in fact["keywords"]):
            return {"question": question, "answer": fact["answer"], "fact_id": fact["id"], "matched": True}
    return {
        "question": question,
        "answer": "I do not have that classroom fact yet. Please ask your teacher for the most accurate answer.",
        "fact_id": None,
        "matched": False,
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
            question = form.get("question") or form.get("text") or ""
            audio = form.get("audio") or form.get("file")
            if audio is None:
                return _error("audio upload is required", "Send multipart/form-data with an 'audio' field.")
            if hasattr(audio, "read"):
                payload = await audio.read()
                if not payload:
                    return _error("audio upload is empty", "Send a non-empty audio file.")
        else:
            payload = await request.json()
            if not isinstance(payload, dict):
                return _error("JSON body must be an object", "Send {\"question\": \"...\"}.")
            question = payload.get("question") or payload.get("text") or ""
    except Exception as exc:
        return _error(f"invalid request: {exc}", "Send JSON or multipart form data.")

    if not isinstance(question, str):
        return _error("question must be a string", "Send a text question in the 'question' field.")
    return _success(_answer(question.strip()))

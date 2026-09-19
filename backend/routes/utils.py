"""Shared request, response, and model-status helpers."""
from __future__ import annotations
import logging
from typing import Any, Iterable
from fastapi import Request
logger = logging.getLogger("classbridge.models")
FIX_HINT = "run backend/setup_models.ps1"
def model_status(name: str, status: str = "not-loaded", version: str | None = None, error: str | None = None) -> dict[str, Any]:
    result: dict[str, Any] = {"status": status, "version": version}
    if error:
        result.update(error=error, fix=FIX_HINT)
    return result
def package_version(module: Any) -> str | None:
    return getattr(module, "__version__", None)
def model_response(source: str, data: Any, endpoint: str, **extra: Any) -> dict[str, Any]:
    logger.info("endpoint=%s source=%s", endpoint, source)
    result: dict[str, Any] = {"ok": True, "source": source, "data": data}
    result.update(extra)
    return result
def model_error_response(error: str | BaseException, endpoint: str) -> dict[str, Any]:
    message = str(error) or error.__class__.__name__
    logger.error("endpoint=%s source=error error=%s", endpoint, message)
    return {"ok": False, "source": "error", "error": message, "fix": FIX_HINT}
def mark_model_error(status: dict[str, Any], error: str | BaseException) -> None:
    message = str(error) or error.__class__.__name__
    status.update(status="error", error=message, fix=FIX_HINT)
def mark_loaded(status: dict[str, Any], version: str | None = None) -> None:
    status["status"] = "loaded"
    if version:
        status["version"] = version
    status.pop("error", None)
    status.pop("fix", None)
async def request_bytes(request: Request, fields: Iterable[str] = ("file", "audio", "image", "frame")) -> bytes | None:
    if "multipart/form-data" in request.headers.get("content-type", "").lower():
        try:
            form = await request.form()
            for field in fields:
                value = form.get(field)
                if value is not None and hasattr(value, "read"):
                    return await value.read()
            for value in form.values():
                if hasattr(value, "read"):
                    return await value.read()
        except Exception as exc:
            logger.warning("multipart upload unavailable: %s", exc)
            return None
    body = await request.body()
    return body or None
async def request_json(request: Request) -> dict[str, Any]:
    try:
        value = await request.json()
        return value if isinstance(value, dict) else {}
    except Exception:
        return {}
def decode_image(image_bytes: bytes):
    import cv2
    import numpy as np
    image = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("uploaded bytes are not a decodable image")
    return image
def pil_image(image_bytes: bytes):
    from io import BytesIO
    from PIL import Image
    return Image.open(BytesIO(image_bytes)).convert("RGB")

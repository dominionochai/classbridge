from __future__ import annotations
import logging
from typing import Any
from fastapi import APIRouter, Request
from .utils import decode_image, mark_loaded, mark_model_error, model_error_response, model_response, model_status, package_version, request_bytes
logger = logging.getLogger("classbridge.models")
router = APIRouter(tags=["board-ocr"])
_OCR: Any = None
_STATUS = model_status("paddleocr")
def _text(exc: BaseException) -> str: return str(exc) or exc.__class__.__name__
def _load_ocr() -> Any:
    global _OCR
    if _OCR is not None: return _OCR
    if _STATUS["status"] == "error": return None
    try:
        from paddleocr import PaddleOCR
        import paddleocr
        _OCR = PaddleOCR(use_angle_cls=True, lang="en", show_log=False); mark_loaded(_STATUS, package_version(paddleocr)); return _OCR
    except Exception as exc:
        mark_model_error(_STATUS, _text(exc)); logger.warning("PaddleOCR unavailable: %s", exc); return None
def model_status_info() -> dict[str, Any]: return dict(_STATUS)
def _error(error: str | BaseException) -> dict[str, Any]: return model_error_response(error, "board-ocr")
@router.post("/board-ocr")
async def board_ocr(request: Request) -> dict[str, Any]:
    try: image_bytes = await request_bytes(request, ("image", "file", "frame"))
    except Exception as exc: return _error(_text(exc))
    if not image_bytes: return _error("image upload is required")
    ocr = _load_ocr()
    if ocr is None: return _error(_STATUS.get("error", "PaddleOCR is unavailable"))
    try:
        result = ocr.ocr(decode_image(image_bytes), cls=True); texts = []
        for group in result or []:
            for line in group or []:
                if isinstance(line, (list, tuple)) and len(line) > 1 and isinstance(line[1], (list, tuple)):
                    text = str(line[1][0]).strip()
                    if text: texts.append(text)
        return model_response("model", {"text": texts, "equations": texts}, "POST /api/board-ocr")
    except Exception as exc: return _error(f"PaddleOCR inference failed: {_text(exc)}")

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Request

from .utils import decode_image, mark_loaded, model_response, model_status, mock_status, package_version, request_bytes

logger = logging.getLogger("classbridge.models")
router = APIRouter(tags=["board-ocr"])
_OCR: Any = None
_STATUS = model_status("paddleocr")


def _load_ocr() -> Any:
    global _OCR
    if _OCR is not None:
        return _OCR
    if _STATUS["status"] == "mock":
        return None
    try:
        from paddleocr import PaddleOCR
        import paddleocr

        _OCR = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
        mark_loaded(_STATUS, package_version(paddleocr))
        return _OCR
    except Exception as exc:
        mock_status(_STATUS, exc)
        logger.warning("PaddleOCR unavailable; using mock equations: %s", exc)
        return None


def model_status_info() -> dict[str, Any]:
    return dict(_STATUS)


def _mock_data() -> dict[str, Any]:
    equations = ["2x + 3 = 7", "x = 2"]
    return {"text": equations, "equations": equations}


@router.post("/board-ocr")
async def board_ocr(request: Request) -> dict[str, Any]:
    image_bytes = await request_bytes(request, ("image", "file", "frame"))
    ocr = _load_ocr() if image_bytes else None
    if ocr is not None and image_bytes:
        try:
            result = ocr.ocr(decode_image(image_bytes), cls=True)
            texts: list[str] = []
            for line_group in result or []:
                for line in line_group or []:
                    if isinstance(line, (list, tuple)) and len(line) > 1 and isinstance(line[1], (list, tuple)):
                        text = str(line[1][0]).strip()
                        if text:
                            texts.append(text)
            return model_response("model", {"text": texts, "equations": texts}, "POST /api/board-ocr")
        except Exception as exc:
            logger.warning("OCR inference failed; using mock: %s", exc)
    return model_response("mock", _mock_data(), "POST /api/board-ocr")

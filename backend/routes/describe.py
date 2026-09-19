from __future__ import annotations

import logging
import os
from typing import Any

from fastapi import APIRouter, Request

from .utils import mark_loaded, model_response, model_status, mock_status, package_version, pil_image, request_bytes

logger = logging.getLogger("classbridge.models")
router = APIRouter(tags=["describe"])
_MODEL: Any = None
_PROCESSOR: Any = None
_STATUS = model_status("lavis_blip2")


def _load_model() -> tuple[Any, Any]:
    global _MODEL, _PROCESSOR
    if _MODEL is not None:
        return _MODEL, _PROCESSOR
    if _STATUS["status"] == "mock":
        return None, None
    try:
        import torch
        import lavis
        from lavis.models import load_model_and_preprocess

        device = "cuda" if torch.cuda.is_available() else "cpu"
        _MODEL, _PROCESSOR = load_model_and_preprocess(name="blip2_t5", model_type=os.getenv("LAVIS_MODEL_TYPE", "pretrain_flant5xl"), is_eval=True, device=device)
        mark_loaded(_STATUS, package_version(lavis))
        return _MODEL, _PROCESSOR
    except Exception as exc:
        # In particular, torch/torchvision incompatibility must never prevent API startup.
        mock_status(_STATUS, exc)
        logger.warning("LAVIS BLIP2 unavailable; using mock descriptions: %s", exc)
        return None, None


def model_status_info() -> dict[str, Any]:
    return dict(_STATUS)


def _mock_data() -> dict[str, Any]:
    descriptions = ["A classroom scene is visible.", "The board and learning materials are in view."]
    return {"caption": descriptions[0], "descriptions": descriptions}


@router.post("/describe")
async def describe(request: Request) -> dict[str, Any]:
    image_bytes = await request_bytes(request, ("image", "file", "frame"))
    model, processor = _load_model() if image_bytes else (None, None)
    if model is not None and processor is not None and image_bytes:
        try:
            image = pil_image(image_bytes)
            image_tensor = processor["eval"](image).unsqueeze(0).to(model.device)
            output = model.generate({"image": image_tensor})
            caption = str(output[0] if isinstance(output, (list, tuple)) else output).strip()
            return model_response("model", {"caption": caption, "descriptions": [caption]}, "POST /api/describe")
        except Exception as exc:
            logger.warning("LAVIS inference failed; using mock: %s", exc)
    return model_response("mock", _mock_data(), "POST /api/describe")

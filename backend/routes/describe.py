from __future__ import annotations
import logging, os
from typing import Any
from fastapi import APIRouter, Request
from .utils import mark_loaded, mark_model_error, model_error_response, model_response, model_status, package_version, pil_image, request_bytes
logger = logging.getLogger("classbridge.models")
router = APIRouter(tags=["describe"])
_MODEL: Any = None
_PROCESSOR: Any = None
_STATUS = model_status("lavis_blip2")
def _text(exc: BaseException) -> str: return str(exc) or exc.__class__.__name__
def _load_model() -> tuple[Any, Any]:
    global _MODEL, _PROCESSOR
    if _MODEL is not None and _PROCESSOR is not None: return _MODEL, _PROCESSOR
    if _STATUS["status"] == "error": return None, None
    try:
        import torch, lavis
        from lavis.models import load_model_and_preprocess
        device = "cuda" if torch.cuda.is_available() else "cpu"
        _MODEL, _PROCESSOR = load_model_and_preprocess(name="blip2_t5", model_type=os.getenv("LAVIS_MODEL_TYPE", "pretrain_flant5xl"), is_eval=True, device=device)
        mark_loaded(_STATUS, package_version(lavis)); return _MODEL, _PROCESSOR
    except Exception as exc:
        mark_model_error(_STATUS, _text(exc)); logger.warning("LAVIS BLIP2 unavailable: %s", exc); return None, None
def model_status_info() -> dict[str, Any]: return dict(_STATUS)
def _error(error: str | BaseException) -> dict[str, Any]: return model_error_response(error, "describe")
@router.post("/describe")
async def describe(request: Request) -> dict[str, Any]:
    try: image_bytes = await request_bytes(request, ("image", "file", "frame"))
    except Exception as exc: return _error(_text(exc))
    if not image_bytes: return _error("image upload is required")
    model, processor = _load_model()
    if model is None or processor is None: return _error(_STATUS.get("error", "LAVIS BLIP2 is unavailable"))
    try:
        image = pil_image(image_bytes); tensor = processor["eval"](image).unsqueeze(0).to(model.device)
        output = model.generate({"image": tensor}); caption = str(output[0] if isinstance(output, (list, tuple)) else output).strip()
        return model_response("model", {"caption": caption, "descriptions": [caption]}, "POST /api/describe")
    except Exception as exc: return _error(f"LAVIS BLIP2 inference failed: {_text(exc)}")

from __future__ import annotations
import base64, io, logging, os, wave
from pathlib import Path
from typing import Any
from fastapi import APIRouter, Request
from .utils import mark_loaded, mark_model_error, model_error_response, model_response, model_status, package_version, request_json
logger = logging.getLogger("classbridge.models")
router = APIRouter(tags=["tts"])
_TTS: Any = None
_STATUS = model_status("sherpa_onnx")
def _text(exc: BaseException) -> str: return str(exc) or exc.__class__.__name__
def _first(root: Path, pattern: str) -> Path | None:
    found = sorted(root.rglob(pattern)) if root.exists() else []
    return found[0] if found else None
def _load_tts() -> Any:
    global _TTS
    if _TTS is not None: return _TTS
    if _STATUS["status"] == "error": return None
    try:
        import sherpa_onnx
        root = Path(__file__).resolve().parents[1] / "models" / "sherpa-tts-lessac"
        model = Path(os.environ["SHERPA_TTS_MODEL"]) if os.getenv("SHERPA_TTS_MODEL") else _first(root, "*.onnx")
        tokens = Path(os.environ["SHERPA_TTS_TOKENS"]) if os.getenv("SHERPA_TTS_TOKENS") else _first(root, "tokens.txt")
        lexicon = Path(os.environ["SHERPA_TTS_LEXICON"]) if os.getenv("SHERPA_TTS_LEXICON") else _first(root, "lexicon.txt")
        if model is None or not model.exists(): raise FileNotFoundError(f"sherpa TTS model asset not found: set SHERPA_TTS_MODEL or install {root}")
        if tokens is None or not tokens.exists(): raise FileNotFoundError(f"sherpa TTS tokens asset not found: set SHERPA_TTS_TOKENS or install {root}")
        config = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=str(model), tokens=str(tokens), lexicon=str(lexicon or "")), num_threads=int(os.getenv("SHERPA_TTS_THREADS", "1")), debug=False, provider="cpu"))
        _TTS = sherpa_onnx.OfflineTts(config); mark_loaded(_STATUS, package_version(sherpa_onnx)); return _TTS
    except Exception as exc:
        mark_model_error(_STATUS, _text(exc)); logger.warning("sherpa-onnx TTS unavailable: %s", exc); return None
def model_status_info() -> dict[str, Any]: return dict(_STATUS)
def _error(error: str | BaseException) -> dict[str, Any]: return model_error_response(error, "tts")
@router.post("/tts")
async def tts(request: Request) -> dict[str, Any]:
    payload = await request_json(request); text = str(payload.get("text", "")).strip()
    if not text:
        raw = await request.body(); text = raw.decode("utf-8", errors="ignore").strip() if raw else ""
    if not text: return _error("text is required")
    engine = _load_tts()
    if engine is None: return _error(_STATUS.get("error", "sherpa-onnx TTS is unavailable"))
    try:
        audio = engine.generate(text=text, sid=0, speed=1.0); samples, rate = audio.samples, int(audio.sample_rate)
        import numpy as np
        pcm = np.clip(np.asarray(samples) * 32767, -32768, 32767).astype(np.int16).tobytes(); buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav:
            wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(rate); wav.writeframes(pcm)
        return model_response("model", {"text": text, "audio_base64": base64.b64encode(buffer.getvalue()).decode("ascii"), "sample_rate": rate}, "POST /api/tts")
    except Exception as exc: return _error(f"sherpa-onnx TTS inference failed: {_text(exc)}")

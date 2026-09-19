from __future__ import annotations
import csv, io, logging, os, wave
from pathlib import Path
from typing import Any
from fastapi import APIRouter, Request
from .utils import mark_loaded, mark_model_error, model_error_response, model_response, model_status, package_version, request_bytes
logger = logging.getLogger("classbridge.models")
router = APIRouter(tags=["sound-alerts"])
_YAMNET: Any = None
_LABELS: list[str] = []
_STATUS = model_status("yamnet")
TARGETS = {"fire alarm", "smoke alarm", "bell", "siren", "clap", "clapping"}
def _text(exc: BaseException) -> str: return str(exc) or exc.__class__.__name__
def _load_yamnet() -> Any:
    global _YAMNET, _LABELS
    if _YAMNET is not None: return _YAMNET
    if _STATUS["status"] == "error": return None
    try:
        import tensorflow as tf, tensorflow_hub as hub
        import tensorflow_hub
        root = Path(__file__).resolve().parents[1] / "models" / "yamnet"; asset = Path(os.environ["YAMNET_MODEL"]) if os.getenv("YAMNET_MODEL") else root / "yamnet.tar.gz"
        if not asset.exists(): raise FileNotFoundError(f"YAMNet model asset not found: {asset}")
        _YAMNET = hub.load(str(asset)); path = _YAMNET.class_map_path(); path = Path(path.numpy().decode("utf-8") if hasattr(path, "numpy") else str(path))
        with tf.io.gfile.GFile(str(path)) as handle: _LABELS = [row["display_name"].lower() for row in csv.DictReader(handle)]
        mark_loaded(_STATUS, package_version(tensorflow_hub)); return _YAMNET
    except Exception as exc:
        mark_model_error(_STATUS, _text(exc)); logger.warning("YAMNet unavailable: %s", exc); return None
def model_status_info() -> dict[str, Any]: return dict(_STATUS)
def _error(error: str | BaseException) -> dict[str, Any]: return model_error_response(error, "sound-alerts")
def _samples(audio: bytes):
    import numpy as np
    try:
        with wave.open(io.BytesIO(audio), "rb") as wav:
            channels, rate = wav.getnchannels(), wav.getframerate(); values = np.frombuffer(wav.readframes(wav.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
            if channels > 1: values = values.reshape(-1, channels).mean(axis=1)
            if rate != 16000 and len(values):
                positions = np.linspace(0, len(values) - 1, max(1, int(len(values) * 16000 / rate))); values = np.interp(positions, np.arange(len(values)), values).astype(np.float32)
            return values
    except Exception: return np.frombuffer(audio, dtype=np.int16).astype(np.float32) / 32768.0
@router.get("/sound-alerts")
async def get_sound_alerts() -> dict[str, Any]:
    if _load_yamnet() is None: return _error(_STATUS.get("error", "YAMNet is unavailable"))
    return _error("audio upload is required")
@router.post("/sound-alerts")
async def sound_alerts(request: Request) -> dict[str, Any]:
    try: audio = await request_bytes(request, ("audio", "file"))
    except Exception as exc: return _error(_text(exc))
    if not audio: return _error("audio upload is required")
    model = _load_yamnet()
    if model is None: return _error(_STATUS.get("error", "YAMNet is unavailable"))
    try:
        scores, _, _ = model(_samples(audio)); means = scores.numpy().mean(axis=0)
        alerts = [{"label": _LABELS[i], "confidence": round(float(score), 4)} for i, score in enumerate(means) if i < len(_LABELS) and _LABELS[i] in TARGETS and float(score) >= 0.15]
        alerts.sort(key=lambda item: item["confidence"], reverse=True)
        return model_response("model", {"alerts": alerts[:10]}, "POST /api/sound-alerts")
    except Exception as exc: return _error(f"YAMNet inference failed: {_text(exc)}")

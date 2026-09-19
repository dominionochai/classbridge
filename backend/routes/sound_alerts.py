from fastapi import APIRouter

try:
    import sherpa_onnx
except Exception:
    sherpa_onnx = None

try:
    import tensorflow_hub as hub
except Exception:
    hub = None

router = APIRouter(tags=["sound-alerts"])


@router.post("/sound-alerts")
def sound_alerts() -> dict:
    available = {
        "sherpa_onnx": sherpa_onnx is not None,
        "tensorflow_hub": hub is not None,
    }
    return {
        "feature": "sound-alerts",
        "status": "mock",
        "message": "Audio classifier not configured.",
        "dependencies": available,
    }

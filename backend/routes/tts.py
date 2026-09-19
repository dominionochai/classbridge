from fastapi import APIRouter

try:
    import sherpa_onnx
except Exception:
    sherpa_onnx = None

router = APIRouter(tags=["tts"])


@router.post("/tts")
def tts() -> dict:
    return {
        "feature": "tts",
        "status": "mock",
        "message": "TTS provider not configured.",
        "dependencies": {"sherpa_onnx": sherpa_onnx is not None},
    }

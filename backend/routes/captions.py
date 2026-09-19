from fastapi import APIRouter

try:
    from faster_whisper import WhisperModel
except Exception:
    WhisperModel = None

try:
    from silero_vad import load_silero_vad
except Exception:
    load_silero_vad = None

try:
    import sign_language_translator
except Exception:
    sign_language_translator = None

router = APIRouter(tags=["captions"])


@router.post("/captions")
def captions() -> dict:
    available = {
        "faster_whisper": WhisperModel is not None,
        "silero_vad": load_silero_vad is not None,
        "sign_language_translator": sign_language_translator is not None,
    }
    return {
        "feature": "captions",
        "status": "mock",
        "message": "Speech model not configured.",
        "dependencies": available,
    }

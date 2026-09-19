from fastapi import APIRouter
router = APIRouter(tags=["tts"])
@router.post("/tts")
def tts() -> dict:
    return {"feature": "tts", "status": "mock", "message": "TTS provider not configured."}

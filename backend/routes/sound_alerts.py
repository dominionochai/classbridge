from fastapi import APIRouter
router = APIRouter(tags=["sound-alerts"])
@router.post("/sound-alerts")
def sound_alerts() -> dict:
    return {"feature": "sound-alerts", "status": "mock", "message": "Audio classifier not configured."}

from fastapi import APIRouter
router = APIRouter(tags=["captions"])
@router.post("/captions")
def captions() -> dict:
    return {"feature": "captions", "status": "mock", "message": "Speech model not configured."}

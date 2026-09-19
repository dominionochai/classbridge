from fastapi import APIRouter
router = APIRouter(tags=["describe"])
@router.post("/describe")
def describe() -> dict:
    return {"feature": "describe", "status": "mock", "message": "Vision description model not configured."}

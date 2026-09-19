from fastapi import APIRouter
router = APIRouter(tags=["board-ocr"])
@router.post("/board-ocr")
def board_ocr() -> dict:
    return {"feature": "board-ocr", "status": "mock", "message": "OCR model not configured."}

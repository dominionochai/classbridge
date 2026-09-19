from fastapi import APIRouter

try:
    from paddleocr import PaddleOCR
except Exception:
    PaddleOCR = None

try:
    import mediapipe as mp
except Exception:
    mp = None

router = APIRouter(tags=["board-ocr"])


@router.post("/board-ocr")
def board_ocr() -> dict:
    available = {
        "paddleocr": PaddleOCR is not None,
        "mediapipe": mp is not None,
    }
    return {
        "feature": "board-ocr",
        "status": "mock",
        "message": "OCR model not configured.",
        "dependencies": available,
    }

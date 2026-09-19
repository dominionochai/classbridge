from fastapi import APIRouter

try:
    from lavis.models import load_model_and_preprocess
except Exception:
    load_model_and_preprocess = None

try:
    import tensorflow_hub as hub
except Exception:
    hub = None

router = APIRouter(tags=["describe"])


@router.post("/describe")
def describe() -> dict:
    available = {
        "lavis": load_model_and_preprocess is not None,
        "tensorflow_hub": hub is not None,
    }
    return {
        "feature": "describe",
        "status": "mock",
        "message": "Vision description model not configured.",
        "dependencies": available,
    }

from fastapi import APIRouter

router = APIRouter(tags=["sign-in"])


@router.post("/sign-in")
def sign_in() -> dict:
    return {
        "feature": "sign-in",
        "status": "mock",
        "message": "Sign-in provider not configured.",
    }

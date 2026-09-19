from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Request

from .utils import (
    decode_image,
    mark_loaded,
    mark_model_error,
    model_error_response,
    model_response,
    model_status,
    package_version,
    request_bytes,
)

logger = logging.getLogger("classbridge.models")
router = APIRouter(tags=["sign-in"])
VOCABULARY = ("HELP", "YES", "NO", "REPEAT", "QUESTION", "THANK YOU")
_HANDS: Any = None
_STATUS = model_status("mediapipe")


def _text(exc: BaseException) -> str:
    return str(exc) or exc.__class__.__name__


def _load_hands() -> Any:
    global _HANDS
    if _HANDS is not None:
        return _HANDS
    if _STATUS["status"] == "error":
        return None
    try:
        import mediapipe as mp

        _HANDS = mp.solutions.hands.Hands(
            static_image_mode=True,
            max_num_hands=2,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        mark_loaded(_STATUS, package_version(mp))
        return _HANDS
    except Exception as exc:
        mark_model_error(_STATUS, _text(exc))
        logger.warning("MediaPipe Hands unavailable: %s", exc)
        return None


def model_status_info() -> dict[str, Any]:
    return dict(_STATUS)


def _error(error: str | BaseException) -> dict[str, Any]:
    return model_error_response(error, "sign-in")


def _finger_count(points: list[Any]) -> int:
    return sum(
        1
        for tip, joint in zip((8, 12, 16, 20), (6, 10, 14, 18))
        if points[tip].y < points[joint].y
    ) + (1 if points[4].x > points[3].x else 0)


def _chips(points: list[list[Any]]) -> list[str]:
    # No hand detected means no sign: never invent one (a false HELP is worse than silence).
    if not points:
        return []
    if len(points) >= 2:
        return ["THANK YOU"]
    return {
        0: ["HELP"],
        1: ["QUESTION"],
        2: ["NO"],
        3: ["REPEAT"],
        4: ["YES"],
        5: ["THANK YOU"],
    }.get(_finger_count(points[0]), ["HELP"])


@router.post("/sign-in")
async def sign_in(request: Request) -> dict[str, Any]:
    try:
        image_bytes = await request_bytes(request, ("image", "frame", "file"))
    except Exception as exc:
        return _error(_text(exc))
    if not image_bytes:
        return _error("image upload is required")
    hands = _load_hands()
    if hands is None:
        return _error(_STATUS.get("error", "MediaPipe Hands is unavailable"))
    try:
        result = hands.process(decode_image(image_bytes)[:, :, ::-1])
        landmarks, points = [], []
        for hand in result.multi_hand_landmarks or []:
            current = list(hand.landmark)
            points.append(current)
            landmarks.append(
                [
                    {"x": round(float(p.x), 6), "y": round(float(p.y), 6), "z": round(float(p.z), 6)}
                    for p in current
                ]
            )
        return model_response(
            "model",
            {
                "chips": _chips(points),
                "landmarks": landmarks,
                "hands": len(points),
                "vocabulary": list(VOCABULARY),
            },
            "POST /api/sign-in",
        )
    except Exception as exc:
        return _error(f"MediaPipe Hands inference failed: {_text(exc)}")

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Request

from .utils import decode_image, mark_loaded, model_response, model_status, mock_status, package_version, request_bytes

logger = logging.getLogger("classbridge.models")
router = APIRouter(tags=["sign-in"])
VOCABULARY = ("HELP", "YES", "NO", "REPEAT", "QUESTION", "THANK YOU")
_HANDS: Any = None
_STATUS = model_status("mediapipe")


def _load_hands() -> Any:
    global _HANDS
    if _HANDS is not None:
        return _HANDS
    if _STATUS["status"] == "mock":
        return None
    try:
        import mediapipe as mp
        _HANDS = mp.solutions.hands.Hands(static_image_mode=True, max_num_hands=2, min_detection_confidence=0.5, min_tracking_confidence=0.5)
        mark_loaded(_STATUS, package_version(mp))
        return _HANDS
    except Exception as exc:
        mock_status(_STATUS, exc)
        logger.warning("MediaPipe Hands unavailable; using mock sign chips: %s", exc)
        return None


def model_status_info() -> dict[str, Any]:
    return dict(_STATUS)


def _mock_data() -> dict[str, Any]:
    return {"chips": ["HELP", "QUESTION"], "landmarks": [], "hands": 0, "vocabulary": list(VOCABULARY)}


def _finger_count(points: list[Any]) -> int:
    # A deliberately conservative orientation-independent-ish heuristic for demo vocabulary.
    tips = (8, 12, 16, 20)
    joints = (6, 10, 14, 18)
    count = sum(1 for tip, joint in zip(tips, joints) if points[tip].y < points[joint].y)
    if points[4].x > points[3].x:
        count += 1
    return count


def _chips_from_hands(hand_points: list[list[Any]]) -> list[str]:
    if len(hand_points) >= 2:
        return ["THANK YOU"]
    count = _finger_count(hand_points[0]) if hand_points else 0
    return {0: ["HELP"], 1: ["QUESTION"], 2: ["NO"], 3: ["REPEAT"], 4: ["YES"], 5: ["THANK YOU"]}.get(count, ["HELP"])


@router.post("/sign-in")
async def sign_in(request: Request) -> dict[str, Any]:
    image_bytes = await request_bytes(request, ("image", "frame", "file"))
    hands = _load_hands() if image_bytes else None
    if hands is not None and image_bytes:
        try:
            result = hands.process(decode_image(image_bytes)[:, :, ::-1])
            all_landmarks = []
            point_lists = []
            for hand in result.multi_hand_landmarks or []:
                points = list(hand.landmark)
                point_lists.append(points)
                all_landmarks.append([{"x": round(float(p.x), 6), "y": round(float(p.y), 6), "z": round(float(p.z), 6)} for p in points])
            data = {"chips": _chips_from_hands(point_lists), "landmarks": all_landmarks, "hands": len(point_lists), "vocabulary": list(VOCABULARY)}
            return model_response("model", data, "POST /api/sign-in")
        except Exception as exc:
            logger.warning("sign inference failed; using mock: %s", exc)
    return model_response("mock", _mock_data(), "POST /api/sign-in")

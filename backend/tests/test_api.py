"""Regression and Lecture Copilot endpoint tests.
Run: cd backend && python -m pytest -q
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
import main
from routes.sign_in import _chips
from signing.sign_engine import translate_segment

client = TestClient(main.app)


def test_app_boots_and_health_ok():
    assert client.get("/api/health").json()["status"] == "ok"


def test_all_routes_registered():
    assert len(main.app.openapi()["paths"]) == 15


def test_qa_exact_match():
    data = client.post("/api/qa", json={"question": "Where is the red beaker?"}).json()["data"]
    assert data["matched_fact"] == "red_beaker"


def test_qa_no_substring_false_positives():
    for question in ("What is the meaning of life?", "The alarming news", "belligerent"):
        assert client.post("/api/qa", json={"question": question}).json()["data"]["matched_fact"] is None


def test_qa_plural_and_longest_match():
    assert client.post("/api/qa", json={"question": "Show me the beakers"}).json()["data"]["matched_fact"] == "red_beaker"


def test_qa_empty_is_400():
    assert client.post("/api/qa", json={"question": ""}).status_code == 400


def test_sign_ids_follow_sentence_order():
    assert translate_segment("Good morning class")["sign_ids"] == ["GOOD", "MORNING", "CLASS"]
    assert translate_segment("DNA mitochondria")["sign_ids"] == ["DNA", "MITOCHONDRIA"]


def test_multiword_sign_beats_parts():
    assert "NATURAL_SELECTION" in translate_segment("natural selection")["sign_ids"]


def test_vocab_gap_reports_captions_only():
    result = translate_segment("quantum entanglement phenomenon")
    assert result["captions_only"] and result["fallback_reason"] == "vocab_gap"


def test_empty_text_is_safe():
    assert translate_segment("")["sign_ids"] == []


def test_no_hand_returns_no_sign():
    assert _chips([]) == []


def test_lecture_rejects_blank_text():
    assert client.post("/api/lecture", json={"text": " "}).json()["ok"] is False


def test_vocab_is_150_unique():
    ids = [entry["id"] for entry in client.get("/api/lecture/vocab").json()]
    assert len(ids) == 150 and len(set(ids)) == 150


def test_lecture_ingest_caption_and_notes_use_fallback():
    ingest = client.post("/api/lecture/ingest", json={"text_chunk": "Um, photosynthesis turns light into chemical energy.", "timestamp": 1.5})
    assert ingest.status_code == 200
    transcript = ingest.json()["data"]["transcript"]
    caption = client.post("/api/lecture/caption", json={"transcript": transcript}).json()
    notes = client.post("/api/lecture/notes", json={"transcript": transcript}).json()
    assert caption["source"] == "heuristic"
    assert "photosynthesis" in notes["data"]["terms"]
    assert "Um" not in caption["data"]["caption"]


def test_lecture_explain_accepts_question_and_context():
    result = client.post("/api/lecture/explain", json={"question": "What is photosynthesis?", "lecture_context": "Photosynthesis turns light into chemical energy."}).json()
    assert result["ok"] is True
    assert result["source"] == "heuristic"
    assert "simple terms" in result["data"]["answer"]

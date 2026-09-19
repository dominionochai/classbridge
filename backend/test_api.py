"""Regression tests for ClassBridge backend. Run: cd backend && python -m pytest -q"""
import sys
from pathlib import Path
from types import SimpleNamespace as P

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
import main
from routes.sign_in import _chips
from signing.sign_engine import translate_segment

client = TestClient(main.app)


def test_app_boots_and_health_ok():
    assert client.get("/api/health").json()["status"] == "ok"


def test_all_eleven_routes_registered():
    assert len(main.app.openapi()["paths"]) == 11


def test_qa_exact_match():
    d = client.post("/api/qa", json={"question": "Where is the red beaker?"}).json()["data"]
    assert d["matched_fact"] == "red_beaker"


def test_qa_no_substring_false_positives():
    for q in ("What is the meaning of life?", "The alarming news", "belligerent"):
        assert client.post("/api/qa", json={"question": q}).json()["data"]["matched_fact"] is None


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
    r = translate_segment("quantum entanglement phenomenon")
    assert r["captions_only"] and r["fallback_reason"] == "vocab_gap"


def test_empty_text_is_safe():
    assert translate_segment("")["sign_ids"] == []


def test_no_hand_returns_no_sign():
    assert _chips([]) == []


def test_lecture_rejects_blank_text():
    assert client.post("/api/lecture", json={"text": " "}).json()["ok"] is False


def test_vocab_is_150_unique():
    ids = [e["id"] for e in client.get("/api/lecture/vocab").json()]
    assert len(ids) == 150 and len(set(ids)) == 150
